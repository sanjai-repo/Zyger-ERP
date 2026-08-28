package in.zygertechnology.zygererp.service;

import tools.jackson.databind.ObjectMapper;
import in.zygertechnology.zygererp.doc.DocTypes;
import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.LedgerRepository;
import in.zygertechnology.zygererp.repo.PartyRepository;
import in.zygertechnology.zygererp.repo.SupplierInvoiceAttachmentRepository;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.metamodel.EntityType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import in.zygertechnology.zygererp.common.Idempotent;
import in.zygertechnology.zygererp.config.BusinessRuleException;
import in.zygertechnology.zygererp.security.CurrentUserRoles;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DocumentFacade {

    private static final Logger log = LoggerFactory.getLogger(DocumentFacade.class);

    @Autowired EntityManager em;
    @Autowired ObjectMapper mapper;
    @Autowired LedgerRepository ledger;
    @Lazy @Autowired StockService stockService;
    @Autowired ItemCacheService itemCache;
    @Autowired DocNumberService numbers;
    @Autowired SupplierInvoiceAttachmentRepository attachments;
    @Autowired PartyRepository parties;
    @Autowired DocumentWorkflowEngine workflowEngine;
    @Autowired BackdatedEntryGuardService backdatedEntryGuard;
    @Lazy @Autowired AttachmentService attachmentService;

    private final Map<String, Class<? extends DocEntity>> reg = new HashMap<>();

    @PostConstruct @SuppressWarnings("unchecked")
    void init() {
        for (EntityType<?> et : em.getMetamodel().getEntities()) {
            Class<?> c = et.getJavaType();
            DocKey k = c.getAnnotation(DocKey.class);
            if (k != null) reg.put(k.value(), (Class<? extends DocEntity>) c);
        }
    }

    private Class<? extends DocEntity> cls(String key) {
        Class<? extends DocEntity> c = reg.get(key);
        if (c == null) throw new IllegalArgumentException("Unknown document type: " + key);
        return c;
    }

    public boolean isRegistered(String key) { return reg.containsKey(key); }

    public Set<String> keys() { return reg.keySet(); }

    public DocEntity get(String key, Long id) {
        DocEntity d = em.find(cls(key), id);
        if (d == null) throw new IllegalArgumentException("Document not found");
        return d;
    }

    @Transactional(readOnly = true)
    public DocEntity getByNumber(String key, String docNo) {
        String en = cls(key).getSimpleName();
        List<?> found = em.createQuery("select d from " + en + " d where d.docNo = :docNo", cls(key))
                .setParameter("docNo", docNo)
                .setMaxResults(1)
                .getResultList();
        if (found.isEmpty()) throw new IllegalArgumentException("Document not found: " + docNo);
        return (DocEntity) found.get(0);
    }

    @Transactional(readOnly = true)
    public List<DocEntity> findAll(String key) {
        String en = cls(key).getSimpleName();
        return em.createQuery("select d from " + en + " d order by d.docDate desc", DocEntity.class)
                .getResultList();
    }

    @Transactional(readOnly = true)
    public long count(String key) {
        String en = cls(key).getSimpleName();
        return em.createQuery("select count(d) from " + en + " d", Long.class).getSingleResult();
    }

    @Transactional(readOnly = true)
    public long countAll() {
        long total = 0;
        for (String k : reg.keySet()) total += count(k);
        return total;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> toRow(DocEntity e) {
        Map<String, Object> converted = mapper.convertValue(e, LinkedHashMap.class);
        final Map<String, Object> r = converted != null ? converted : new LinkedHashMap<>();
        String dStr = e.getDocDate() == null ? "" : e.getDocDate().toString();
        r.put("date", dStr);
        r.put("docDate", dStr);
        r.putIfAbsent("orderDate", dStr);
        r.putIfAbsent("piDate", dStr);
        r.putIfAbsent("dcDate", dStr);
        r.putIfAbsent("invoiceDate", dStr);
        r.putIfAbsent("returnDate", dStr);
        if (r.get("notes") != null && r.get("remarks") == null) r.put("remarks", r.get("notes"));
        if (r.get("remarks") != null && r.get("notes") == null) r.put("notes", r.get("remarks"));
        r.put("id", e.getId());
        List<? extends LineEntity> L = e.getLines();
        r.put("qty", L.stream().mapToDouble(l -> l.getQty().doubleValue()).sum());
        r.put("totalAmount", L.stream()
                .mapToDouble(l -> (l.getRate() == null ? 0 : l.getRate().doubleValue()) * l.getQty().doubleValue()).sum());

        List<Map<String, Object>> lineRows = new ArrayList<>();
        for (LineEntity l : L) {
            Map<String, Object> lm = mapper.convertValue(l, LinkedHashMap.class);
            if (lm == null) lm = new LinkedHashMap<>();
            lm.remove("doc");
            lm.put("itemDesc", itemCache.findByCode(l.getItemCode())
                    .map(ItemMaster::getDescription).orElse(""));
            lineRows.add(lm);
        }
        r.put("lines", lineRows);
        if (!L.isEmpty()) {
            LineEntity first = L.get(0);
            r.putIfAbsent("firstItemCode", first.getItemCode());
            itemCache.findByCode(first.getItemCode())
                    .ifPresent(i -> r.putIfAbsent("firstItemName", i.getDescription()));
        }
        r.putIfAbsent("itemCode", r.get("firstItemCode"));
        r.putIfAbsent("itemName", r.get("firstItemName"));
        r.putIfAbsent("reference", firstOf(r,
                "purchaseOrderNo", "jobOrderNo", "labourOrderNo", "issueRequestNo",
                "allotmentNo", "originalDocumentNo", "linkedDocumentNo", "challanNo",
                "supplierInvoiceNo", "referenceNo", "originalReceiptNo"));
        r.putIfAbsent("party", firstOf(r,
                "supplier", "vendor", "customer", "party", "toParty",
                "supplierName", "vendorName", "customerName", "partyName"));
        if (e instanceof SupplierEnquiry se) {
            String supp = se.getSupplier();
            String code = se.getSupplierCode();
            String cp = se.getContactPerson();
            String ph = se.getPhone();
            String emStr = se.getEmail();

            if (se.getSuppliers() != null && !se.getSuppliers().isEmpty()) {
                SupplierEnquirySupplier first = se.getSuppliers().get(0);
                if (supp == null || supp.isBlank()) supp = first.getSupplierName();
                if (code == null || code.isBlank()) code = first.getSupplierCode();
                if (cp == null || cp.isBlank()) cp = first.getContactPerson();
                if (ph == null || ph.isBlank()) ph = first.getPhone();
                if (emStr == null || emStr.isBlank()) emStr = first.getEmail();
            }

            if ((cp == null || cp.isBlank() || ph == null || ph.isBlank() || emStr == null || emStr.isBlank()) && supp != null && !supp.isBlank()) {
                Optional<Party> pOpt = parties.findByName(supp);
                if (pOpt.isPresent()) {
                    Party p = pOpt.get();
                    if (code == null || code.isBlank()) code = p.getCode();
                    if (cp == null || cp.isBlank()) cp = p.getContactPerson();
                    if (ph == null || ph.isBlank()) ph = p.getPhone() != null ? p.getPhone() : p.getMobile();
                    if (emStr == null || emStr.isBlank()) emStr = p.getEmail();
                }
            }

            if (supp != null) r.put("supplier", supp);
            if (code != null) r.put("supplierCode", code);
            if (cp != null) r.put("contactPerson", cp);
            if (ph != null) r.put("phone", ph);
            if (emStr != null) r.put("email", emStr);
        }
        if (e instanceof PurchaseOrder po) {
            String supp = po.getSupplier();
            String code = po.getSupplierCode();
            String cp = po.getContactPerson();
            String ph = po.getPhone();
            String emStr = po.getEmail();

            if ((cp == null || cp.isBlank() || ph == null || ph.isBlank() || emStr == null || emStr.isBlank()) && supp != null && !supp.isBlank()) {
                Optional<Party> pOpt = parties.findByName(supp);
                if (pOpt.isPresent()) {
                    Party p = pOpt.get();
                    if (code == null || code.isBlank()) code = p.getCode();
                    if (cp == null || cp.isBlank()) cp = p.getContactPerson();
                    if (ph == null || ph.isBlank()) ph = p.getPhone() != null ? p.getPhone() : p.getMobile();
                    if (emStr == null || emStr.isBlank()) emStr = p.getEmail();
                }
            }

            if (supp != null) r.put("supplier", supp);
            if (code != null) r.put("supplierCode", code);
            if (cp != null) r.put("contactPerson", cp);
            if (ph != null) r.put("phone", ph);
            if (emStr != null) r.put("email", emStr);
        }
        denormalizeLines(r, findKeyForEntity(e));

        // Enrich with workflow allowed transitions
        if (e.getStatus() != null) {
            String docKey = findKeyForEntity(e);
            String upperDocKey = docKey.toUpperCase().replace("-", "_");
            workflowEngine.enrich(upperDocKey, e.getStatus(), r);
        }

        return r;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRow(String key, Long id) {
        Map<String, Object> row = toRow(get(key, id));
        if ("purchase-invoice".equals(key) || "subcontract-invoice".equals(key)) {
            row.put("attachments", attachmentsMeta(key, id));
        }
        return row;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(String key, Map<String, String> q) {
        List<Map<String, Object>> rows = findAll(key).stream()
                .map(this::toRow).collect(Collectors.toList());
        return paginate(rows, q);
    }

    // ---------- Attachments (supplier invoices, max 3) ----------

    public static final int MAX_ATTACHMENTS = 3;

    public record AttachmentInfo(Long id, String name, byte[] data) {}

    private void supportsAttachments(String key) {
        if (!"purchase-invoice".equals(key) && !"subcontract-invoice".equals(key))
            throw new IllegalArgumentException("Attachments not supported for " + key);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> attachmentsMeta(String key, Long id) {
        supportsAttachments(key);
        return attachments.findByDocTypeAndDocIdOrderByIdAsc(key, id).stream()
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", a.getId());
                    m.put("fileName", a.getFileName());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AttachmentInfo attachment(String key, Long docId, Long attachmentId) {
        supportsAttachments(key);
        SupplierInvoiceAttachment a = attachments
                .findByIdAndDocTypeAndDocId(attachmentId, key, docId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        return new AttachmentInfo(a.getId(), a.getFileName(), a.getData());
    }

    @Transactional
    public void addAttachment(String key, Long docId, String name, byte[] data) {
        supportsAttachments(key);
        get(key, docId);
        long count = attachments.countByDocTypeAndDocId(key, docId);
        if (count >= MAX_ATTACHMENTS)
            throw new IllegalArgumentException("Maximum " + MAX_ATTACHMENTS + " attachments allowed");
        SupplierInvoiceAttachment a = new SupplierInvoiceAttachment();
        a.setDocType(key);
        a.setDocId(docId);
        a.setFileName(name);
        a.setData(data);
        a.setUploadedAt(Instant.now());
        attachments.save(a);
        get(key, docId).setUpdatedAt(Instant.now());
    }

    @Transactional
    public void removeAttachment(String key, Long docId, Long attachmentId) {
        supportsAttachments(key);
        SupplierInvoiceAttachment a = attachments
                .findByIdAndDocTypeAndDocId(attachmentId, key, docId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        attachments.delete(a);
        get(key, docId).setUpdatedAt(Instant.now());
    }

    public Map<String, Object> paginate(List<Map<String, Object>> rows, Map<String, String> q) {
        String st = q.get("status");
        if (st != null && !st.isEmpty())
            rows = rows.stream().filter(r -> st.equals(r.get("status")) || st.equals(r.get("inspectionStatus")) || st.equals(r.get("capaStatus")) || st.equals(r.get("reportStatus")) || st.equals(r.get("complaintStatus"))).collect(Collectors.toList());
        String it = q.get("inspectionType");
        if (it == null || it.isEmpty()) it = q.get("type");
        if (it != null && !it.isEmpty()) {
            final String targetType = it;
            rows = rows.stream().filter(r -> targetType.equalsIgnoreCase(String.valueOf(r.get("inspectionType"))) || targetType.equalsIgnoreCase(String.valueOf(r.get("type"))) || targetType.equalsIgnoreCase(String.valueOf(r.get("certificateType")))).collect(Collectors.toList());
        }
        String item = q.get("itemCode");
        if (item != null && !item.isEmpty()) {
            final String targetItem = item;
            rows = rows.stream().filter(r -> targetItem.equalsIgnoreCase(String.valueOf(r.get("itemCode")))).collect(Collectors.toList());
        }
        String s = q.get("search");
        if (s != null && !s.isEmpty()) {
            String lo = s.toLowerCase();
            rows = rows.stream().filter(r -> String.valueOf(r).toLowerCase().contains(lo)).collect(Collectors.toList());
        }
        int size = q.get("size") == null ? 8 : Integer.parseInt(q.get("size"));
        int pg   = q.get("page") == null ? 0 : Integer.parseInt(q.get("page"));
        int total = rows.size();
        int pages = Math.max(1, (int) Math.ceil((double) total / size));
        int from = Math.min(pg * size, total), to = Math.min(from + size, total);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("content", rows.subList(from, to));
        out.put("totalElements", total);
        out.put("totalPages", pages);
        out.put("number", pg);
        out.put("size", size);
        return out;
    }

    public String nextNumber(String key) { return numbers.next(key); }

    public String nextNumber(String key, String prefix) { return numbers.next(key, prefix); }

    /** Read-only preview of the next number — does NOT consume the sequence. */
    public String peekNumber(String key) { return numbers.peek(key); }

    /** Read-only preview of the next number — does NOT consume the sequence. */
    public String peekNumber(String key, String prefix) { return numbers.peek(key, prefix); }

    /** Allocates the next number (advances the sequence) — use on Save/Draft. */
    public String allocateNumber(String key) { return numbers.allocate(key); }

    /** FY-format preview (PREFIX/FY/00001). Does NOT consume the sequence. */
    public String peekNumberFy(String prefix) { return numbers.peekFy(prefix); }

    /** FY-format allocation (PREFIX/FY/00001). Consumes the sequence. */
    public String nextNumberFy(String prefix) { return numbers.nextFy(prefix); }

    // --- Line field normalization: frontend key → backend entity field ---
    private static final Map<String, Map<String, String>> LINE_RENAME = Map.of(
        "sales-order", Map.of(
            "qty", "orderQty",
            "taxCode", "tax",
            "revisionLevel", "drawingRevision",
            "targetDeliveryDate", "requiredDeliveryDate"
        ),
        "proforma-invoice", Map.of(
            "taxCode", "tax",
            "lineRemark", "remarks"
        ),
        "sales-dc", Map.of(
            "dispatchQty", "currentDispatchQty",
            "heatNumber", "heatNo",
            "lineRemark", "remarks"
        ),
        "sales-invoice", Map.of(
            "billedQty", "qty",
            "taxCode", "tax"
        ),
        "po-inward", Map.of("qty", "receivedQty"),
        "lo-inward", Map.of("qty", "receivedQty"),
        "jo-inward", Map.of("qty", "producedQty"),
        "general-inward", Map.of("qty", "receivedQty"),
        "dc-return", Map.of(
            "batchNumber", "batchNo",
            "heatNumber", "heatNo",
            "lineRemark", "remarks",
            "disposition", "materialCondition"
        ),
        "invoice-return", Map.of(
            "batchNumber", "batchNo",
            "heatNumber", "heatNo",
            "lineRemark", "remarks",
            "disposition", "materialCondition"
        )
    );

    @SuppressWarnings("unchecked")
    private void normalizeLines(Map<String, Object> body, String key) {
        Object linesObj = body.get("lines");
        if (!(linesObj instanceof List)) return;
        List<Map<String, Object>> lines = (List<Map<String, Object>>) linesObj;
        Map<String, String> renames = LINE_RENAME.getOrDefault(key, Map.of());
        for (Map<String, Object> line : lines) {
            if ("sales-invoice".equals(key) && line.containsKey("batchHeatNumber")) {
                Object bhn = line.remove("batchHeatNumber");
                if (bhn != null && !String.valueOf(bhn).isEmpty()) {
                    String[] parts = String.valueOf(bhn).split("/", 2);
                    line.put("batchNo", parts[0].trim());
                    if (parts.length > 1 && !parts[1].trim().isEmpty())
                        line.put("heatNo", parts[1].trim());
                }
            }
            for (Map.Entry<String, String> e : renames.entrySet()) {
                if (line.containsKey(e.getKey())) {
                    Object val = line.remove(e.getKey());
                    if ("tax".equals(e.getValue()) && val instanceof String s) {
                        val = parseTaxRate(s);
                    }
                    line.put(e.getValue(), val);
                }
            }
        }
    }

    private BigDecimal parseTaxRate(String taxCode) {
        if (taxCode == null || taxCode.isEmpty() || "Exempt".equalsIgnoreCase(taxCode))
            return BigDecimal.ZERO;
        String num = taxCode.replaceAll("[^0-9.]", "");
        if (num.isEmpty()) return BigDecimal.ZERO;
        try { return new BigDecimal(num); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    @SuppressWarnings("unchecked")
    private void denormalizeLines(Map<String, Object> row, String key) {
        Object linesObj = row.get("lines");
        if (!(linesObj instanceof List)) return;
        List<Map<String, Object>> lines = (List<Map<String, Object>>) linesObj;
        Map<String, String> renames = LINE_RENAME.getOrDefault(key, Map.of());
        for (Map.Entry<String, String> e : renames.entrySet()) {
            for (Map<String, Object> line : lines) {
                if (line.containsKey(e.getValue())) {
                    Object val = line.remove(e.getValue());
                    if ("tax".equals(e.getValue()) && val != null) {
                        try {
                            double rate = Double.parseDouble(String.valueOf(val));
                            val = rate == 0 ? "Exempt" : "GST " + (int) rate + "%";
                        } catch (Exception ignored) {}
                    }
                    line.put(e.getKey(), val);
                }
            }
        }
        if ("sales-invoice".equals(key)) {
            for (Map<String, Object> line : lines) {
                String batchNo = line.containsKey("batchNo") ? String.valueOf(line.get("batchNo")) : "";
                String heatNo = line.containsKey("heatNo") ? String.valueOf(line.get("heatNo")) : "";
                line.remove("batchNo");
                line.remove("heatNo");
                String combined = "";
                if (!batchNo.isEmpty() && !"null".equals(batchNo)) combined = batchNo;
                if (!heatNo.isEmpty() && !"null".equals(heatNo)) {
                    combined = combined.isEmpty() ? heatNo : combined + "/" + heatNo;
                }
                line.put("batchHeatNumber", combined);
            }
        }
    }

    @Transactional
    @Idempotent
    public DocEntity create(String key, Map<String, Object> body, String user) {
        normalizeLines(body, key);
        DocEntity e = mapper.convertValue(body, cls(key));
        if (e.getLines() != null) {
            for (LineEntity l : e.getLines()) {
                if (l instanceof BaseLine bl) bl.setId(null);
            }
        }
        e.setStatus("DRAFT");
        e.setDocDate(parse(body.get("date")));
        e.setCreatedBy(user);
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        attach(e);

        validateReturnEligibility(key, e);
        validateReceivedAgainstIssue(key, e);
        validateBatchHeat(key, e);
        validatePoInward(key, e);
        validateAmendmentReason(key, e);
        validateReleaseBalance(key, e);
        validateGeneralInwardReason(key, e);
        validateRmIssueSir(key, e);
        validateGrn(key, e);

        // §9.3: Backdated-entry authorization guard
        String docDateStr = body.get("date") != null ? String.valueOf(body.get("date")) : null;
        backdatedEntryGuard.enforce(docDateStr, user);

        String docNo = nextUnusedNumber(key, body);
        e.setDocNo(docNo);
        em.persist(e);
        em.flush();
        createQualityInspectionIfRequired(e, body, user);
        return e;
    }

    private String nextUnusedNumber(String key, Map<String, Object> body) {
        String docNo = nextNumberFor(key, body);
        int maxAttempts = 100;
        while (existsByDocNo(key, docNo) && maxAttempts-- > 0) {
            docNo = nextNumberFor(key, body);
        }
        return docNo;
    }

    private boolean existsByDocNo(String key, String docNo) {
        if (docNo == null || docNo.isBlank()) return false;
        try {
            String en = cls(key).getSimpleName();
            Long count = em.createQuery("select count(d) from " + en + " d where d.docNo = :docNo", Long.class)
                    .setParameter("docNo", docNo)
                    .getSingleResult();
            return count > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private void createQualityInspectionIfRequired(DocEntity e, Map<String, Object> body, String user) {
        String key = findKeyForEntity(e);
        if (!Set.of("po-inward", "lo-inward", "jo-inward", "general-inward", "grn").contains(key)) {
            return;
        }

        Object qcReq = body.get("qcRequired");
        if (qcReq == null && e != null) {
            try {
                Field f = e.getClass().getDeclaredField("qcRequired");
                f.setAccessible(true);
                qcReq = f.get(e);
            } catch (Exception ignored) {}
        }

        boolean isQcRequired = qcReq != null && (
            "Yes".equalsIgnoreCase(String.valueOf(qcReq)) ||
            "true".equalsIgnoreCase(String.valueOf(qcReq)) ||
            "1".equals(String.valueOf(qcReq))
        );

        if (!isQcRequired) {
            return;
        }

        List<? extends LineEntity> lines = e.getLines();
        if (lines == null || lines.isEmpty()) {
            return;
        }

        for (LineEntity line : lines) {
            QualityInspection qi = new QualityInspection();
            QualityInspectionType inspectionType = resolveInspectionType(key);
            String prefix = QualityInspectionService.prefixForType(inspectionType);
            qi.setDocNo(numbers.next(QualityInspectionService.KEY, prefix));
            qi.setInspectionType(inspectionType);
            qi.setSourceType("INWARD");
            if (e.getId() != null) qi.setSourceId(e.getId().toString());
            qi.setSourceNumber(e.getDocNo());
            qi.setDocDate(e.getDocDate() != null ? e.getDocDate() : LocalDate.now());
            qi.setInspectionDate(e.getDocDate() != null ? e.getDocDate() : LocalDate.now());
            qi.setInspectionStatus("DRAFT");
            qi.setDecisionStatus("PENDING");
            qi.setCreatedBy(user);
            qi.setCreatedAt(Instant.now());
            qi.setUpdatedAt(Instant.now());

            String itemCode = null;
            String itemDesc = null;
            BigDecimal qty = BigDecimal.ONE;

            try {
                Field fCode = line.getClass().getDeclaredField("itemCode");
                fCode.setAccessible(true);
                itemCode = (String) fCode.get(line);
            } catch (Exception ignored) {}

            try {
                Field fDesc = line.getClass().getDeclaredField("itemDesc");
                fDesc.setAccessible(true);
                itemDesc = (String) fDesc.get(line);
            } catch (Exception ignored) {}

            if (itemDesc == null || itemDesc.isBlank()) {
                try {
                    Field fName = line.getClass().getDeclaredField("itemName");
                    fName.setAccessible(true);
                    itemDesc = (String) fName.get(line);
                } catch (Exception ignored) {}
            }

            try {
                Field fQty = line.getClass().getDeclaredField("qty");
                fQty.setAccessible(true);
                Object val = fQty.get(line);
                if (val instanceof BigDecimal bd) qty = bd;
                else if (val != null) qty = new BigDecimal(val.toString());
            } catch (Exception ignored) {}

            try {
                Field fPoNo = e.getClass().getDeclaredField("purchaseOrderNo");
                fPoNo.setAccessible(true);
                qi.setPurchaseOrderNumber((String) fPoNo.get(e));
            } catch (Exception ignored) {}

            qi.setItemCode(itemCode != null && !itemCode.isBlank() ? itemCode : "ITEM-001");
            qi.setItemDescription(itemDesc != null ? itemDesc : "");
            qi.setReceivedQuantity(qty);
            qi.setInspectionQuantity(qty);

            em.persist(qi);
        }
    }

    private QualityInspectionType resolveInspectionType(String sourceKey) {
        return switch (sourceKey) {
            case "po-inward", "grn" -> QualityInspectionType.IQC;
            case "lo-inward" -> QualityInspectionType.LO;
            case "jo-inward" -> QualityInspectionType.FAI;
            case "general-inward" -> QualityInspectionType.LINE;
            default -> QualityInspectionType.IQC;
        };
    }

    private static String rootMessage(Throwable t) {
        Throwable root = t;
        while (root.getCause() != null && root.getCause() != root) root = root.getCause();
        return root.getMessage() == null ? "" : root.getMessage();
    }

    private String nextNumberFor(String key, Map<String, Object> body) {
        if ("issue-internal-external".equals(key)) {
            String prefix = "INTERNAL".equalsIgnoreCase(strVal(body.get("issueType"))) ? "INT" : "EXT";
            return numbers.next(key, prefix);
        }
        return numbers.next(key);
    }

    private String strVal(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private boolean boolVal(Object v) {
        return v != null && ("true".equalsIgnoreCase(String.valueOf(v))
                || "1".equals(String.valueOf(v)) || "yes".equalsIgnoreCase(String.valueOf(v)));
    }

    @Transactional
    public DocEntity update(String key, Long id, Map<String, Object> body, String user) {
        DocEntity old = get(key, id);
        if (!List.of("DRAFT", "REJECTED").contains(old.getStatus()))
            throw new IllegalStateException("Only DRAFT/REJECTED documents can be edited");

        DocTypes.DocDef def = DocTypes.get(key);

        normalizeLines(body, key);
        DocEntity incoming = mapper.convertValue(body, cls(key));
        copyFields(old, incoming);

        if (def.hasLines() && incoming.getLines() != null) {
            @SuppressWarnings("unchecked")
            List<LineEntity> managed = (List<LineEntity>) old.getLines();
            managed.clear();
            for (LineEntity l : incoming.getLines()) {
                if (l instanceof BaseLine bl) bl.setId(null);
                managed.add(l);
            }
        }

        if (old instanceof SupplierEnquiry se) {
            if (se.getSupplier() != null && !se.getSupplier().isBlank()) {
                if (se.getSuppliers() == null) se.setSuppliers(new ArrayList<>());
                if (se.getSuppliers().isEmpty()) {
                    SupplierEnquirySupplier ses = new SupplierEnquirySupplier();
                    ses.setDoc(se);
                    se.getSuppliers().add(ses);
                }
                SupplierEnquirySupplier ses = se.getSuppliers().get(0);
                ses.setSupplierName(se.getSupplier());
                ses.setSupplierCode(se.getSupplierCode());
                ses.setContactPerson(se.getContactPerson());
                ses.setPhone(se.getPhone());
                ses.setEmail(se.getEmail());
                ses.setStatus("PENDING");
                ses.setEnquiryStatus("PENDING");
            }
        }

        old.setDocDate(parse(body.get("date")));
        old.setUpdatedAt(Instant.now());
        old.setUpdatedBy(user);
        attach(old);
        return old;
    }

    private void copyFields(DocEntity target, DocEntity source) {
        for (Class<?> c = target.getClass(); c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                try {
                    f.setAccessible(true);
                    if (List.of("id", "docNo", "status", "createdBy", "createdAt", "updatedBy",
                            "deleted", "deletedAt", "deletedBy", "lines", "version").contains(f.getName()))
                        continue;
                    if (java.util.Collection.class.isAssignableFrom(f.getType())) continue;
                    Object v = f.get(source);
                    if (v != null) f.set(target, v);
                } catch (Exception ignored) { }
            }
        }
    }

    @Transactional
    public void remove(String key, Long id, String user) {
        DocEntity e = get(key, id);
        if (!List.of("DRAFT", "REJECTED").contains(e.getStatus()))
            throw new IllegalStateException("Only DRAFT/REJECTED documents can be deleted");
        e.setDeleted(true);
        e.setDeletedAt(Instant.now());
        e.setDeletedBy(user);
        e.setUpdatedAt(Instant.now());
        e.setUpdatedBy(user);
    }

    @Transactional
    public DocEntity approveWithLines(String key, Long id, String note,
                                      List<Map<String, Object>> lines, String user) {
        DocEntity e = get(key, id);
        requireStatus(e, "SUBMITTED");

        if (lines != null && !lines.isEmpty()) {
            Map<String, Double> approvedByCode = new HashMap<>();
            for (Map<String, Object> l : lines) {
                Object qty = l.get("approvedQty");
                if (qty == null) continue;
                try {
                    approvedByCode.put(strVal(l.get("itemCode")),
                            Double.parseDouble(String.valueOf(qty)));
                } catch (NumberFormatException ignored) { }
            }
            if (e instanceof StockIssueRequest sir) {
                for (StockIssueRequestLine line : sir.getLines()) {
                    Double approved = approvedByCode.get(line.getItemCode());
                    if (approved != null) line.setApprovedQty(BigDecimal.valueOf(approved));
                }
            }
        }

        e.setStatus("APPROVED");
        e.setUpdatedAt(Instant.now());
        e.setUpdatedBy(user);
        return e;
    }

    @Idempotent
    @Transactional
    public DocEntity action(String key, Long id, String action, String note, String user) {
        return action(key, id, action, note, user, Map.of());
    }

    @Idempotent
    @Transactional
    public DocEntity action(String key, Long id, String action, String note, String user,
                            Map<String, Object> opts) {
        Map<String, Object> options = opts == null ? Map.of() : opts;
        DocEntity e = get(key, id);

        // Map generic action names to status targets for workflow engine
        String targetStatus = switch (action) {
            case "submit" -> "SUBMITTED";
            case "approve" -> "APPROVED";
            case "reject" -> "REJECTED";
            case "reopen" -> "DRAFT";
            case "cancel" -> "CANCELLED";
            case "post" -> "POSTED";
            case "close" -> "CLOSED";
            default -> action;
        };

        // Validate against workflow state machine
        String docKey = findKeyForEntity(e);
        String upperDocKey = docKey.toUpperCase().replace("-", "_");
        workflowEngine.validate(upperDocKey, e.getStatus(), targetStatus);

        // Legacy fallback validation for doc types not yet in the workflow engine
        try {
            switch (action) {
                case "submit" -> requireStatus(e, "DRAFT", "REJECTED");
                case "approve" -> requireStatus(e, "SUBMITTED");
                case "reject" -> requireStatus(e, "SUBMITTED", "DRAFT");
                case "reopen" -> requireStatus(e, "REJECTED");
                case "cancel" -> requireStatus(e, "DRAFT", "SUBMITTED", "APPROVED");
                case "post" -> {
                    requireStatus(e, "APPROVED");
                    if ("sales-dc".equals(key)) enforceFinalInspectionGate(e, options);
                    post(key, e, boolVal(options.get("authorizedOverride")));
                    e.setStatus("POSTED");
                }
                default -> { }
            }
        } catch (IllegalStateException ex) {
            // If the legacy validation throws but the workflow engine allowed it,
            // log it and rethrow the workflow error
            throw ex;
        }

        if (!"post".equals(action)) {
            e.setStatus(targetStatus);
        }
        e.setUpdatedAt(Instant.now());
        e.setUpdatedBy(user);

        // Populate lifecycle fields based on action
        switch (action) {
            case "submit" -> { e.setSubmittedBy(user); e.setSubmittedAt(Instant.now()); }
            case "approve" -> { e.setApprovedByUserId(resolveUserId(user)); e.setApprovedAt(Instant.now()); }
            case "close" -> { e.setClosedBy(user); e.setClosedAt(Instant.now()); }
            case "cancel" -> { e.setCancelledBy(user); e.setCancelledAt(Instant.now()); }
            case "reopen" -> { e.setReopenedBy(user); e.setReopenedAt(Instant.now()); }
        }

        // FRS §6.3: Mandatory-attachment enforcement on close
        if ("close".equals(action)) {
            String attachmentOwnerType = docKey.replace("/", "-");
            if (!attachmentService.validateMandatoryAttachments(attachmentOwnerType, id)) {
                throw new BusinessRuleException("MANDATORY_ATTACHMENT_MISSING",
                        "Cannot close: required attachments are missing for " + docKey,
                        Map.of("docKey", docKey, "docId", id));
            }
        }

        // FRS §8: NCR REWORK disposition → auto-create rework work order stub
        if ("approve".equals(action) && "quality-ncr".equals(docKey) && e instanceof QualityNcr ncr) {
            String disp = ncr.getDisposition();
            if ("REWORK".equalsIgnoreCase(disp) || "REWORK".equalsIgnoreCase(ncr.getDispositionType())) {
                try {
                    WorkOrder reworkWO = new WorkOrder();
                    String woNo = numbers.next("WORK_ORDER", "WO");
                    reworkWO.setWoNumber(woNo);
                    reworkWO.setItemCode(ncr.getItemCode());
                    reworkWO.setOrderQuantity(ncr.getQuantityAffected());
                    reworkWO.setWoType("REWORK");
                    reworkWO.setSourceType("quality-ncr");
                    reworkWO.setSourceDocNo(ncr.getDocNo());
                    reworkWO.setStatus("DRAFT");
                    reworkWO.setCreatedBy(user);
                    reworkWO.setCreatedAt(Instant.now());
                    reworkWO.setUpdatedAt(Instant.now());
                    em.persist(reworkWO);
                } catch (Exception ex) {
                    log.error("Failed to create rework WO for NCR {}: {}", ncr.getDocNo(), ex.getMessage());
                }
            }
        }

        return e;
    }

    private Long resolveUserId(String username) {
        if (username == null || username.isBlank()) return null;
        try {
            Object result = em.createQuery("SELECT u.id FROM AppUser u WHERE u.username = :uname")
                    .setParameter("uname", username)
                    .setMaxResults(1)
                    .getSingleResult();
            return result instanceof Long l ? l : null;
        } catch (Exception e) {
            return null;
        }
    }

    private void requireStatus(DocEntity e, String... allowed) {
        for (String s : allowed) if (s.equals(e.getStatus())) return;
        throw new IllegalStateException("Action not allowed in status " + e.getStatus());
    }

    private String statusFor(String action, DocEntity e) {
        return switch (action) {
            case "submit" -> "SUBMITTED";
            case "approve" -> "APPROVED";
            case "reject" -> "REJECTED";
            case "reopen" -> "DRAFT";
            case "cancel" -> "CANCELLED";
            case "post" -> "POSTED";
            default -> e.getStatus();
        };
    }

    private void post(String key, DocEntity e, boolean allowNegativeOverride) {
        DocTypes.DocDef def = DocTypes.get(key);
        List<LedgerLine> lines = collectLines(def, e);
        String txType = def.tx().isEmpty() ? key.toUpperCase() : def.tx();
        String stockStatus = determineStockStatus(key, e);

        for (LedgerLine l : lines) {
            if ("transfer-dc".equals(key)) {
                String destLoc = headerStr(e, "destinationLocation");
                stockService.recordStockOut(
                        e.getDocNo(), key, txType, l.item(), l.loc(), l.batch(), l.heat(),
                        BigDecimal.valueOf(l.qty()), e.getDocDate(), e.getCreatedBy(),
                        allowNegativeOverride);
                if (destLoc != null && !destLoc.isBlank()) {
                    stockService.recordStockIn(
                            e.getDocNo(), key, "TRANSFER_IN", l.item(), destLoc, l.batch(), l.heat(),
                            BigDecimal.valueOf(l.qty()), e.getDocDate(), e.getCreatedBy(), "FREE");
                }
            } else switch (def.effect()) {
                case IN -> stockService.recordStockIn(
                        e.getDocNo(), key, txType, l.item(), l.loc(), l.batch(), l.heat(),
                        BigDecimal.valueOf(l.qty()), e.getDocDate(), e.getCreatedBy(), stockStatus);
                case OUT -> stockService.recordStockOut(
                        e.getDocNo(), key, txType, l.item(), l.loc(), l.batch(), l.heat(),
                        BigDecimal.valueOf(l.qty()), e.getDocDate(), e.getCreatedBy(),
                        allowNegativeOverride);
                case ADJUST -> {
                    double cur = currentOnHand(l.item(), l.loc(), l.batch());
                    double diff = l.qty() - cur;
                    if (diff != 0) {
                        stockService.recordStockAdjustment(
                                e.getDocNo(), key, txType, l.item(), l.loc(), l.batch(), l.heat(),
                                BigDecimal.valueOf(diff), e.getDocDate(), e.getCreatedBy(),
                                allowNegativeOverride);
                    }
                }
                default -> { }
            }
        }
    }

    /** FRS §6.2: blocks dispatch of any batch/lot that has not cleared Final Inspection when the item requires QC. */
    private void enforceFinalInspectionGate(DocEntity e, Map<String, Object> opts) {
        if (e.getLines() == null || e.getLines().isEmpty()) return;
        boolean forced = boolVal(opts.get("forceDispatch"));
        if (forced && !CurrentUserRoles.hasAnyRole("ADMIN", "MANAGEMENT", "SALES_MANAGER")) {
            throw new IllegalArgumentException(
                    "forceDispatch requires a supervisor role (ADMIN / MANAGEMENT / SALES_MANAGER)");
        }
        for (LineEntity line : e.getLines()) {
            String itemCode = line.getItemCode();
            if (itemCode == null || itemCode.isBlank()) continue;
            var item = itemCache.findByCode(itemCode).orElse(null);
            if (item == null || !Boolean.TRUE.equals(item.getInspectionRequired())) continue;
            String batchNo = line.getBatchNo() == null ? "" : line.getBatchNo();
            String heatNo = line.getHeatNo() == null ? "" : line.getHeatNo();
            if (hasPassingFinalInspection(itemCode, batchNo, heatNo)) continue;
            if (forced) {
                log.warn("FORCED DISPATCH override: item {} batch {} has not cleared Final Inspection (doc {})",
                        itemCode, batchNo, e.getDocNo());
                continue;
            }
            throw new IllegalStateException("Dispatch blocked: item " + itemCode + " batch " +
                    (batchNo.isEmpty() ? "-" : batchNo) + " has not cleared Final Inspection");
        }
    }

    private boolean hasPassingFinalInspection(String itemCode, String batchNo, String heatNo) {
        Long count = em.createQuery(
                "select count(qi) from QualityInspection qi " +
                "where qi.itemCode = :itemCode " +
                "and qi.inspectionType = :type " +
                "and (:batchNo = '' or qi.batchNumber = :batchNo) " +
                "and (:heatNo = '' or qi.heatNumber = :heatNo) " +
                "and (qi.finalDecision = 'PASS' or qi.inspectionStatus in ('PASS', 'APPROVED'))", Long.class)
                .setParameter("itemCode", itemCode)
                .setParameter("type", QualityInspectionType.FINAL)
                .setParameter("batchNo", batchNo)
                .setParameter("heatNo", heatNo)
                .getSingleResult();
        return count != null && count > 0;
    }

    private String determineStockStatus(String key, DocEntity e) {
        if ("grn".equals(key)) {
            if (e.getLines() != null) {
                for (LineEntity line : e.getLines()) {
                    String itemCode = line.getItemCode();
                    if (itemCode == null || itemCode.isBlank()) continue;
                    var item = itemCache.findByCode(itemCode).orElse(null);
                    if (item != null && Boolean.TRUE.equals(item.getInspectionRequired())) {
                        return "QC_HOLD";
                    }
                }
            }
            return "FREE";
        }
        boolean isQcInward = Set.of("po-inward", "lo-inward", "jo-inward", "general-inward").contains(key);
        if (isQcInward) {
            Object qcReq = null;
            try {
                Field f = e.getClass().getDeclaredField("qcRequired");
                f.setAccessible(true);
                qcReq = f.get(e);
            } catch (Exception ignored) {}
            if (qcReq != null && ("true".equalsIgnoreCase(String.valueOf(qcReq)) || "Yes".equalsIgnoreCase(String.valueOf(qcReq)))) {
                return "QC_HOLD";
            }
            return "FREE";
        }
        boolean isReturn = Set.of("dc-return", "invoice-return").contains(key);
        if (isReturn) {
            String disposition = headerStr(e, "disposition");
            if ("PENDING_INSPECTION".equalsIgnoreCase(disposition) || "REWORK".equalsIgnoreCase(disposition)) {
                return "QC_HOLD";
            }
            if ("SCRAP".equalsIgnoreCase(disposition)) {
                return "SCRAP";
            }
            return "FREE";
        }
        return "FREE";
    }

    private record LedgerLine(String item, String loc, String batch, String heat, double qty) {}

    private double currentOnHand(String item, String loc, String batch) {
        return stockService.onHand(item, loc, batch);
    }

    private List<LedgerLine> collectLines(DocTypes.DocDef def, DocEntity e) {
        List<LedgerLine> out = new ArrayList<>();
        if (def.hasLines()) {
            for (LineEntity l : e.getLines()) {
                String loc = firstNonEmpty(l.getLocation(), headerStr(e, "sourceLocation"), headerStr(e, "storeLocation"));
                out.add(new LedgerLine(l.getItemCode(), loc, l.getBatchNo(), l.getHeatNo(), l.getQty().doubleValue()));
            }
            return out;
        }
        if (def.effect() == DocTypes.Effect.ADJUST) {
            out.add(new LedgerLine(headerStr(e, "itemCode"), headerStr(e, "location"),
                    headerStr(e, "batchNo"), "", numOrZero(headerVal(e, "correctedQty"))));
        }
        return out;
    }

    private String headerStr(DocEntity e, String field) {
        Object v = headerVal(e, field);
        return v == null ? "" : String.valueOf(v);
    }

    private double numOrZero(Object v) {
        if (v == null) return 0;
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(String.valueOf(v)); } catch (Exception ex) { return 0; }
    }

    private Object headerVal(DocEntity e, String field) {
        try {
            Field f = e.getClass().getDeclaredField(field);
            f.setAccessible(true);
            return f.get(e);
        } catch (Exception ex) { return null; }
    }

    @SuppressWarnings("unchecked")
    private void attach(DocEntity e) {
        if (e.getLines() == null) return;
        for (LineEntity l : e.getLines()) {
            Class<?> clazz = l.getClass();
            while (clazz != null && clazz != Object.class) {
                try {
                    Field f = clazz.getDeclaredField("doc");
                    f.setAccessible(true);
                    f.set(l, e);
                    break;
                } catch (Exception ignored) {
                    clazz = clazz.getSuperclass();
                }
            }
        }
    }

    private String findKeyForEntity(DocEntity e) {
        for (var entry : reg.entrySet()) {
            if (entry.getValue() == e.getClass()) return entry.getKey();
        }
        return "";
    }

    private LocalDate parse(Object o) {
        if (o == null) return LocalDate.now();
        try { return LocalDate.parse(String.valueOf(o)); } catch (Exception ex) { return LocalDate.now(); }
    }

    private String firstNonEmpty(String... v) {
        for (String s : v) if (s != null && !s.isEmpty()) return s;
        return "";
    }

    private String firstOf(Map<String, Object> r, String... keys) {
        for (String k : keys) {
            Object v = r.get(k);
            if (v != null && !String.valueOf(v).isEmpty()) return String.valueOf(v);
        }
        return "";
    }

    private void validateReturnEligibility(String key, DocEntity e) {
        if (!Set.of("dc-return", "invoice-return", "inward-return", "internal-return", "receipt-return").contains(key)) return;

        String originalDocNo = null;
        String origDocType = null;
        if ("dc-return".equals(key) && e instanceof DcReturn dr) {
            originalDocNo = dr.getOriginalDcNumber();
            origDocType = "sales-dc";
        } else if ("invoice-return".equals(key) && e instanceof InvoiceReturn ir) {
            originalDocNo = ir.getOriginalInvoiceNumber();
            origDocType = "sales-invoice";
        } else if ("inward-return".equals(key) && e instanceof InwardReturn ir) {
            originalDocNo = ir.getOriginalDocumentNo();
            origDocType = "po-inward";
        } else if ("internal-return".equals(key) && e instanceof InternalReturn ir) {
            originalDocNo = ir.getOriginalDocumentNo();
            origDocType = "general-issue";
        } else if ("receipt-return".equals(key) && e instanceof ReceiptReturn rr) {
            originalDocNo = headerStr(e, "originalDocumentNo");
            origDocType = "rm-issue";
        }

        if (originalDocNo != null && !originalDocNo.isBlank()) {
            try {
                DocEntity origDoc = getByNumber(origDocType, originalDocNo);
                if (!"POSTED".equals(origDoc.getStatus())) {
                    throw new IllegalStateException("Original document " + originalDocNo + " must be POSTED to allow returns");
                }
            } catch (IllegalArgumentException ex) {
                throw new IllegalStateException("Original document " + originalDocNo + " not found");
            }
        }

        for (LineEntity line : e.getLines()) {
            String itemCode = line.getItemCode();
            if (itemCode == null || itemCode.isBlank()) continue;
            String batchNo = line.getBatchNo() != null ? line.getBatchNo() : "";

            BigDecimal currentReturnQty = line.getQty();
            if (currentReturnQty == null || currentReturnQty.compareTo(BigDecimal.ZERO) <= 0) continue;

            String lineClass = switch (key) {
                case "dc-return" -> "DcReturnLine";
                case "internal-return" -> "InternalReturnLine";
                case "receipt-return" -> "ReceiptReturnLine";
                default -> "InvoiceReturnLine";
            };
            String origField = switch (key) {
                case "dc-return" -> "doc.originalDcNumber";
                case "invoice-return" -> "doc.originalInvoiceNumber";
                case "inward-return", "internal-return", "receipt-return" -> "doc.originalDocumentNo";
                default -> null;
            };

            String hql = "SELECT COALESCE(SUM(l.qty), 0) FROM " + lineClass + " l " +
                "WHERE l.doc.docNo != :docNo AND l.doc.status = 'POSTED' " +
                "AND l.itemCode = :itemCode " +
                "AND (:batchNo = '' OR l.batchNo = :batchNo)";

            if (originalDocNo != null && !originalDocNo.isBlank() && origField != null) {
                hql += " AND " + origField + " = :origDocNo";
            }

            var query = em.createQuery(hql)
                .setParameter("docNo", e.getDocNo() != null ? e.getDocNo() : "")
                .setParameter("itemCode", itemCode)
                .setParameter("batchNo", batchNo);
            if (originalDocNo != null && !originalDocNo.isBlank() && origField != null) {
                query = query.setParameter("origDocNo", originalDocNo);
            }

            BigDecimal previouslyReturned = (BigDecimal) query.getSingleResult();
            if (previouslyReturned == null) previouslyReturned = BigDecimal.ZERO;

            BigDecimal totalReturnQty = previouslyReturned.add(currentReturnQty);

            BigDecimal originalQty = BigDecimal.ZERO;
            if (originalDocNo != null && !originalDocNo.isBlank() && origDocType != null) {
                try {
                    DocEntity origDoc = getByNumber(origDocType, originalDocNo);
                    for (LineEntity origLine : origDoc.getLines()) {
                        if (itemCode.equals(origLine.getItemCode()) &&
                            (batchNo.isEmpty() || batchNo.equals(origLine.getBatchNo()))) {
                            originalQty = originalQty.add(origLine.getQty());
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (originalQty.compareTo(BigDecimal.ZERO) > 0 && totalReturnQty.compareTo(originalQty) > 0) {
                throw new IllegalStateException(
                    "Return qty " + currentReturnQty + " exceeds eligible balance for item " + itemCode +
                    " (original: " + originalQty + ", already returned: " + previouslyReturned + ")");
            }
        }
    }

    private static final List<String> ISSUE_SOURCE_TYPES = List.of(
            "general-issue", "rm-issue", "jo-dc-issue", "issue-internal-external", "issue-against-receipt");

    /** FRS §7.2: a return against an issue cannot exceed originalIssueQty - previouslyReturnedQty. */
    private void validateReceivedAgainstIssue(String key, DocEntity e) {
        if (!"received-against-issue".equals(key)) return;
        String issueNo = headerStr(e, "originalDocumentNo");
        if (issueNo == null || issueNo.isBlank()) return;

        DocEntity issueDoc = null;
        for (String t : ISSUE_SOURCE_TYPES) {
            try {
                issueDoc = getByNumber(t, issueNo);
                break;
            } catch (IllegalArgumentException ignored) {}
        }

        for (LineEntity line : e.getLines()) {
            String itemCode = line.getItemCode();
            if (itemCode == null || itemCode.isBlank()) continue;
            BigDecimal returnQty = line.getQty();
            if (returnQty == null || returnQty.compareTo(BigDecimal.ZERO) <= 0) continue;

            String batchNo = line.getBatchNo() == null ? "" : line.getBatchNo();

            BigDecimal previouslyReturned = BigDecimal.ZERO;
            try {
                var result = em.createQuery(
                        "SELECT COALESCE(SUM(l.returnedQty), 0) FROM ReceivedAgainstIssueLine l " +
                        "WHERE l.doc.originalDocumentNo = :issueNo " +
                        "AND l.doc.status IN ('SUBMITTED', 'APPROVED', 'POSTED') " +
                        "AND l.doc.docNo != :docNo " +
                        "AND l.itemCode = :itemCode " +
                        "AND (:batchNo = '' OR l.batchNo = :batchNo)",
                        java.math.BigDecimal.class)
                        .setParameter("issueNo", issueNo)
                        .setParameter("docNo", e.getDocNo() != null ? e.getDocNo() : "")
                        .setParameter("itemCode", itemCode)
                        .setParameter("batchNo", batchNo)
                        .getSingleResult();
                if (result != null) previouslyReturned = result;
            } catch (Exception ignored) {}

            BigDecimal originalQty = BigDecimal.ZERO;
            if (issueDoc != null && issueDoc.getLines() != null) {
                for (LineEntity il : issueDoc.getLines()) {
                    if (!itemCode.equals(il.getItemCode())) continue;
                    if (!batchNo.isEmpty() && !batchNo.equals(il.getBatchNo())) continue;
                    originalQty = originalQty.add(il.getQty() == null ? BigDecimal.ZERO : il.getQty());
                }
            }

            if (originalQty.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal returnableBalance = originalQty.subtract(previouslyReturned);
            if (returnQty.compareTo(returnableBalance) > 0) {
                throw new IllegalStateException("Return quantity (" + returnQty +
                        ") exceeds returnable balance (" + returnableBalance + ") for issue " + issueNo);
            }
        }
    }

    private void validateBatchHeat(String key, DocEntity e) {
        if (e.getLines() == null) return;
        for (LineEntity line : e.getLines()) {
            String itemCode = line.getItemCode();
            if (itemCode == null || itemCode.isBlank()) continue;
            var item = itemCache.findByCode(itemCode).orElse(null);
            if (item == null) continue;
            if (Boolean.TRUE.equals(item.getRequiresBatch()) && (line.getBatchNo() == null || line.getBatchNo().isBlank())) {
                throw new IllegalStateException("Item " + itemCode + " requires batch number");
            }
            if (Boolean.TRUE.equals(item.getRequiresHeat()) && (line.getHeatNo() == null || line.getHeatNo().isBlank())) {
                throw new IllegalStateException("Item " + itemCode + " requires heat number");
            }
        }
    }

    private void validateAmendmentReason(String key, DocEntity e) {
        if (Set.of("stock-amendment", "physical-stock-amendment").contains(key)) {
            String reasonCode = headerStr(e, "reasonCode");
            if (reasonCode == null || reasonCode.isBlank()) {
                throw new IllegalStateException("Amendment reason code is required (INV-ADJ-01)");
            }
        }
    }

    private void validateReleaseBalance(String key, DocEntity e) {
        if (!"stock-release".equals(key)) return;
        String allotmentNo = headerStr(e, "allotmentNo");
        if (allotmentNo == null || allotmentNo.isBlank()) {
            throw new IllegalStateException("Stock Release must reference an Allotment number");
        }
        DocEntity allotmentDoc = getByNumber("stock-allotment", allotmentNo);
        if (!"POSTED".equals(allotmentDoc.getStatus())) {
            throw new IllegalStateException("Referenced allotment " + allotmentNo + " must be POSTED");
        }
        for (LineEntity line : e.getLines()) {
            String itemCode = line.getItemCode();
            double releaseQty = line.getQty() != null ? line.getQty().doubleValue() : 0;
            double allotQty = 0;
            for (LineEntity aLine : allotmentDoc.getLines()) {
                if (itemCode.equals(aLine.getItemCode())) {
                    allotQty += aLine.getQty() != null ? aLine.getQty().doubleValue() : 0;
                }
            }
            double alreadyReleased = 0;
            try {
                var result = em.createQuery(
                    "SELECT COALESCE(SUM(l.qty), 0) FROM StockReleaseLine l WHERE l.doc.allotmentNo = :allotmentNo AND l.doc.status = 'POSTED' AND l.itemCode = :itemCode AND l.doc.docNo != :docNo", java.math.BigDecimal.class)
                    .setParameter("allotmentNo", allotmentNo)
                    .setParameter("itemCode", itemCode)
                    .setParameter("docNo", e.getDocNo() != null ? e.getDocNo() : "")
                    .getSingleResult();
                alreadyReleased = result != null ? result.doubleValue() : 0;
            } catch (Exception ignored) {}
            if (allotQty > 0 && (alreadyReleased + releaseQty) > allotQty) {
                throw new IllegalStateException(
                    "Release qty " + releaseQty + " for item " + itemCode + " exceeds allotment balance. Allotted: " + allotQty + ", already released: " + alreadyReleased);
            }
        }
    }

    private void validateGeneralInwardReason(String key, DocEntity e) {
        if (!"general-inward".equals(key)) return;
        String reasonCode = headerStr(e, "reasonCode");
        if (reasonCode == null || reasonCode.isBlank()) {
            throw new IllegalStateException("General Inward reason code is required (INV-GNI-01)");
        }
    }

    private void validateRmIssueSir(String key, DocEntity e) {
        if (!"rm-issue".equals(key)) return;
        String issueRequestNo = headerStr(e, "issueRequestNo");
        if (issueRequestNo == null || issueRequestNo.isBlank()) return;
        DocEntity sirDoc = getByNumber("stock-issue-request", issueRequestNo);
        if (!"POSTED".equals(sirDoc.getStatus()) && !"APPROVED".equals(sirDoc.getStatus())) {
            throw new IllegalStateException("Referenced Stock Issue Request " + issueRequestNo + " must be APPROVED or POSTED");
        }
        for (LineEntity line : e.getLines()) {
            String itemCode = line.getItemCode();
            double issueQty = line.getQty() != null ? line.getQty().doubleValue() : 0;
            double sirQty = 0;
            for (LineEntity sirLine : sirDoc.getLines()) {
                if (itemCode.equals(sirLine.getItemCode())) {
                    sirQty += sirLine.getQty() != null ? sirLine.getQty().doubleValue() : 0;
                }
            }
            double alreadyIssued = 0;
            try {
                var result = em.createQuery(
                    "SELECT COALESCE(SUM(l.issueQty), 0) FROM RmIssueLine l WHERE l.doc.issueRequestNo = :sirNo AND l.doc.status = 'POSTED' AND l.itemCode = :itemCode AND l.doc.docNo != :docNo", java.math.BigDecimal.class)
                    .setParameter("sirNo", issueRequestNo)
                    .setParameter("itemCode", itemCode)
                    .setParameter("docNo", e.getDocNo() != null ? e.getDocNo() : "")
                    .getSingleResult();
                alreadyIssued = result != null ? result.doubleValue() : 0;
            } catch (Exception ignored) {}
            if (sirQty > 0 && (alreadyIssued + issueQty) > sirQty) {
                throw new IllegalStateException(
                    "Issue qty " + issueQty + " for item " + itemCode + " exceeds SIR balance. Requested: " + sirQty + ", already issued: " + alreadyIssued);
            }
        }
    }

    private void validateGrn(String key, DocEntity e) {
        if (!"grn".equals(key)) return;
        for (LineEntity line : e.getLines()) {
            if (line instanceof GrnLine gl) {
                BigDecimal accepted = gl.getAcceptedQty() != null ? gl.getAcceptedQty() : BigDecimal.ZERO;
                BigDecimal rejected = gl.getRejectedQty() != null ? gl.getRejectedQty() : BigDecimal.ZERO;
                BigDecimal inspected = gl.getInspectedQty() != null ? gl.getInspectedQty() : null;
                if (inspected != null && inspected.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal total = accepted.add(rejected);
                    if (total.compareTo(inspected) > 0) {
                        throw new IllegalStateException(
                            "GRN line item " + gl.getItemCode() + ": accepted (" + accepted + ") + rejected (" + rejected +
                            ") = " + total + " exceeds inspected qty (" + inspected + ")");
                    }
                }
            }
        }
    }

    private void validatePoInward(String key, DocEntity e) {
        if (!"po-inward".equals(key)) return;
        String poNo = headerStr(e, "purchaseOrderNo");
        if (poNo == null || poNo.isBlank()) {
            throw new IllegalStateException("PO Inward must reference a Purchase Order number");
        }
        DocEntity poDoc = getByNumber("purchase-order", poNo);
        if (!"POSTED".equals(poDoc.getStatus()) && !"APPROVED".equals(poDoc.getStatus())) {
            throw new IllegalStateException("Referenced PO " + poNo + " must be APPROVED or POSTED (current: " + poDoc.getStatus() + ")");
        }
        for (LineEntity line : e.getLines()) {
            String itemCode = line.getItemCode();
            double receivedQty = line.getQty() != null ? line.getQty().doubleValue() : 0;
            double poQty = 0;
            double alreadyReceived = 0;
            for (LineEntity poLine : poDoc.getLines()) {
                if (itemCode.equals(poLine.getItemCode())) {
                    poQty += poLine.getQty() != null ? poLine.getQty().doubleValue() : 0;
                }
            }
            var receivedResult = em.createQuery(
                "SELECT COALESCE(SUM(l.receivedQty), 0) FROM PoInwardLine l WHERE l.doc.purchaseOrderNo = :poNo AND l.doc.status = 'POSTED' AND l.itemCode = :itemCode AND l.doc.docNo != :docNo", java.math.BigDecimal.class)
                .setParameter("poNo", poNo)
                .setParameter("itemCode", itemCode)
                .setParameter("docNo", e.getDocNo() != null ? e.getDocNo() : "")
                .getSingleResult();
            alreadyReceived = receivedResult != null ? receivedResult.doubleValue() : 0;
            if (poQty > 0 && (alreadyReceived + receivedQty) > poQty) {
                throw new IllegalStateException(
                    "Received qty " + receivedQty + " for item " + itemCode + " exceeds PO balance. PO qty: " + poQty + ", already received: " + alreadyReceived);
            }
        }
    }
}
