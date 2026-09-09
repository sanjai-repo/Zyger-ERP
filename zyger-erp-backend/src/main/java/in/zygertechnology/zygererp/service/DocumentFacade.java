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
    @Autowired DocLinkService docLinks;
    @Autowired in.zygertechnology.zygererp.repo.StoreMasterRepository stores;
    @Autowired in.zygertechnology.zygererp.repo.LocationRepository locations;
    @Autowired VendorLedgerService vendorLedger;
    @Autowired in.zygertechnology.zygererp.repo.PoAmendmentHistoryRepository poAmendments;

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
        if (d == null || Boolean.TRUE.equals(d.getDeleted())) throw new IllegalArgumentException("Document not found");
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
        return em.createQuery("select d from " + en + " d where (d.deleted is null or d.deleted = false) order by d.docDate desc, d.id desc", DocEntity.class)
                .getResultList();
    }

    @Transactional(readOnly = true)
    public long count(String key) {
        String en = cls(key).getSimpleName();
        return em.createQuery("select count(d) from " + en + " d where (d.deleted is null or d.deleted = false)", Long.class).getSingleResult();
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

    /**
     * Line-bearing transaction/order documents must carry at least one line with
     * a positive quantity. Empty or all-zero payloads are rejected up-front so the
     * database is never seeded with meaningless DRAFT documents. Scoped to the
     * stock-effect and order doc types where an empty payload is always a defect;
     * content-driven docs (quality records, master data) are left untouched.
     */
    // Inward Entry's "Update Inventory" button (InwardForm.tsx) posts a freshly-created DRAFT
    // document directly (skipping Submit/Approve) whenever QC isn't required, for all four
    // inward types alike. Only "po-inward" was ever exempted from the generic APPROVED-before-
    // post guard below, so LO/JO/General Inward's identical "Update Inventory" path always
    // threw "Action not allowed in status DRAFT" — fixed by exempting all four consistently.
    private static final Set<String> DIRECT_POST_INWARD_KEYS = Set.of(
            "po-inward", "lo-inward", "jo-inward", "general-inward", "inward");

    // DC Module FRS v1.0 §6/§7: a Delivery Challan is saved straight to Confirmed and posts its
    // stock movement on the same "Save & Post Stock" action, without a separate Submit/Approve
    // step. So the three DC types are exempt from the generic APPROVED-before-post guard.
    private static final Set<String> DIRECT_POST_DC_KEYS = Set.of(
            "jo-dc", "general-dc", "transfer-dc");

    private static final Set<String> REQUIRED_LINES_KEYS = Set.of(
            // Inventory (Effect IN/OUT/ADJUST)
            "po-inward", "lo-inward", "jo-inward", "general-inward", "return-inward", "grn",
            "rm-issue", "general-issue", "jo-dc-issue", "issue-internal-external",
            "issue-against-receipt", "sales-dc", "jo-dc", "general-dc", "return-dc",
            "transfer-dc", "dc-return", "invoice-return", "inward-return", "internal-return",
            "received-against-issue", "receipt-return", "stock-allotment", "stock-release",
            "stock-issue-request", "physical-stock-amendment", "subcontract-invoice",
            // Purchase
            "purchase-request", "supplier-enquiry", "supplier-quotation", "purchase-order", "job-order",
            // Sales
            "sales-order", "proforma-invoice", "sales-invoice"
    );

    /**
     * Purchase/sales transaction docs whose party or item references are resolvable
     * are blocked from APPROVAL when the document carries no party or references
     * non-existent items. A permissive DRAFT create is allowed (capture-in-progress),
     * but an approved document must be referentially sound before it can drive
     * downstream stock/ledger effects.
     */
    private static final Set<String> APPROVAL_REFERENCE_KEYS = Set.of(
            "purchase-order", "job-order", "sales-order", "sales-dc", "sales-invoice"
    );

    private String partyFieldOf(DocEntity e) {
        for (String f : List.of("supplier", "customer")) {
            try {
                Field field = e.getClass().getDeclaredField(f);
                field.setAccessible(true);
                Object v = field.get(e);
                if (v instanceof String s && !s.isBlank()) return s;
            } catch (Exception ignored) {}
        }
        return null;
    }

    private void validateApprovalReferences(String key, DocEntity e) {
        if (!APPROVAL_REFERENCE_KEYS.contains(key)) return;
        String party = partyFieldOf(e);
        if (party == null) {
            throw new BusinessRuleException("APPROVAL_BLOCKED_MISSING_PARTY",
                    "Cannot approve " + key + ": document has no supplier/customer reference.",
                    Map.of("docKey", key, "docId", e.getId()));
        }
        if (e.getLines() != null) {
            for (LineEntity le : e.getLines()) {
                String code = le instanceof BaseLine bl ? bl.getItemCode() : null;
                if (code == null || code.isBlank()
                        || itemCache.findByCode(code).isEmpty()) {
                    throw new BusinessRuleException("APPROVAL_BLOCKED_UNKNOWN_ITEM",
                            "Cannot approve " + key + ": line references unknown item '" + code + "'.",
                            Map.of("docKey", key, "docId", e.getId(), "itemCode", code == null ? "" : code));
                }
            }
        }
    }

    private void validateLineQtyAndPresence(String key, DocEntity e, Map<String, Object> body) {
        if (!REQUIRED_LINES_KEYS.contains(key)) return;
        List<?> lines = e.getLines();
        if (lines == null || lines.isEmpty()) {
            throw new IllegalArgumentException("Document type '" + key + "' requires at least one line");
        }
        DocTypes.DocDef def = DocTypes.get(key);
        String qtyField = def.qtyField();
        for (Object line : lines) {
            if (!(line instanceof LineEntity le)) continue;
            BigDecimal qty = qtyField != null && !qtyField.isBlank() ? lineQty(le, qtyField) : le.getQty();
            if (qty == null || qty.signum() <= 0) {
                throw new IllegalArgumentException("Document type '" + key + "' requires a positive line quantity");
            }
        }
    }

    private BigDecimal lineQty(LineEntity l, String qtyField) {
        try {
            java.lang.reflect.Method m = l.getClass().getMethod("get" + Character.toUpperCase(qtyField.charAt(0)) + qtyField.substring(1));
            Object v = m.invoke(l);
            return v instanceof BigDecimal bd ? bd : v instanceof Number n ? BigDecimal.valueOf(n.doubleValue()) : null;
        } catch (Exception e) {
            return null;
        }
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

        validateLineQtyAndPresence(key, e, body);
        validateDcStockAvailability(key, e);
        validateGeneralDcGstin(key, e);
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
        recordDocLinks(key, e, user);
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

            // getItemCode()/getItemDesc()/getQty() are LineEntity interface methods, present on
            // every line type (PoInwardLine.getQty() aliases its own receivedQty column) — calling
            // them directly avoids the reflective "qty"/"itemCode" field lookups that silently
            // failed for line classes without a literal field of that exact name (e.g. PoInwardLine
            // has no `qty` field, only `receivedQty`), which previously left every auto-created
            // inspection's quantity hardcoded at the BigDecimal.ONE fallback.
            String itemCode = line.getItemCode();
            String itemDesc = line.getItemDesc();
            if (itemDesc == null || itemDesc.isBlank()) {
                try {
                    Field fName = line.getClass().getDeclaredField("itemName");
                    fName.setAccessible(true);
                    itemDesc = (String) fName.get(line);
                } catch (Exception ignored) {}
            }
            BigDecimal qty = line.getQty() != null ? line.getQty() : BigDecimal.ONE;

            try {
                Field fPoNo = e.getClass().getDeclaredField("purchaseOrderNo");
                fPoNo.setAccessible(true);
                qi.setPurchaseOrderNumber((String) fPoNo.get(e));
            } catch (Exception ignored) {}

            String lineLoc = line.getLocation();
            if (lineLoc == null || lineLoc.isBlank()) {
                lineLoc = firstNonEmpty(headerStr(e, "sourceLocation"), headerStr(e, "storeLocation"));
            }
            if (lineLoc != null && !lineLoc.isBlank()) {
                qi.setLocation(lineLoc);
            }

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
            String prefix = "INTERNAL".equalsIgnoreCase(strVal(body.get("issueType"))) ? "ISI" : "EXT";
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
        if (!Set.of("purchase-request", "supplier-enquiry", "supplier-quotation", "purchase-order").contains(key)
                && !List.of("DRAFT", "REJECTED").contains(old.getStatus()))
            throw new IllegalStateException("Only DRAFT/REJECTED documents can be edited");

        if (body.containsKey("version") && body.get("version") != null) {
            Long incomingVersion = Long.valueOf(body.get("version").toString());
            if (old.getVersion() != null && !Objects.equals(old.getVersion(), incomingVersion)) {
                throw new jakarta.persistence.OptimisticLockException(
                    "Document " + old.getDocNo() + " version mismatch (expected " + old.getVersion() + " but received " + incomingVersion + "). Concurrent modification detected."
                );
            }
        }

        DocTypes.DocDef def = DocTypes.get(key);

        normalizeLines(body, key);
        DocEntity incoming = mapper.convertValue(body, cls(key));
        Integer poNextRevision = null;
        if ("purchase-order".equals(key) && !List.of("DRAFT", "REJECTED").contains(old.getStatus())) {
            // Must snapshot + compute before copyFields overwrites `old`'s fields with `incoming`'s
            // (which, for a client PUT that never sent revisionNumber, would otherwise reset it).
            poNextRevision = recordPoAmendment((PurchaseOrder) old, (PurchaseOrder) incoming, user);
        }
        copyFields(old, incoming);
        if (poNextRevision != null) {
            ((PurchaseOrder) old).setRevisionNumber(poNextRevision);
            ((PurchaseOrder) old).setLastAmendedAt(Instant.now());
        }

        if (def.hasLines() && incoming.getLines() != null) {
            @SuppressWarnings("unchecked")
            List<LineEntity> managed = (List<LineEntity>) old.getLines();
            managed.clear();
            for (LineEntity l : incoming.getLines()) {
                if (l instanceof BaseLine bl) bl.setId(null);
                managed.add(l);
            }
        }

        if (old instanceof WorkOrder woOld && incoming instanceof WorkOrder woInc) {
            if (woInc.getMaterialLines() != null) {
                if (woOld.getMaterialLines() == null) woOld.setMaterialLines(new ArrayList<>());
                else woOld.getMaterialLines().clear();
                for (WorkOrderMaterial m : woInc.getMaterialLines()) {
                    m.setId(null);
                    m.setDoc(woOld);
                    woOld.getMaterialLines().add(m);
                }
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
        validateGeneralDcGstin(key, old);
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
        if ("production-bom".equals(key)) {
            // For production-bom, deletion validation (e.g. Work Order check) is handled by validateBomCanBeDeleted(id)
        } else if (e.getStatus() != null && !List.of("DRAFT", "REJECTED").contains(e.getStatus().toUpperCase())) {
            throw new IllegalStateException("Only DRAFT/REJECTED documents can be deleted");
        }
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
            case "confirm-receipt" -> "RECEIVED";
            default -> action;
        };

        // Validate against workflow state machine
        String docKey = findKeyForEntity(e);
        String upperDocKey = docKey.toUpperCase().replace("-", "_");
        if (!DIRECT_POST_INWARD_KEYS.contains(docKey)) {
            workflowEngine.validate(upperDocKey, e.getStatus(), targetStatus);
        }

        // Legacy fallback validation for doc types not yet in the workflow engine
        try {
            switch (action) {
                case "submit" -> requireStatus(e, "DRAFT", "REJECTED");
                case "approve" -> {
                    requireStatus(e, "DRAFT", "SUBMITTED");
                    validateApprovalReferences(key, e);
                }
                case "reject" -> requireStatus(e, "SUBMITTED", "DRAFT");
                case "reopen" -> requireStatus(e, "REJECTED");
                case "cancel" -> {
                    requireStatus(e, "DRAFT", "SUBMITTED", "APPROVED", "CONFIRMED", "POSTED", "RECEIVED");
                    if (Set.of("jo-dc", "general-dc", "transfer-dc").contains(key)) {
                        if (note == null || note.isBlank()) {
                            throw new IllegalArgumentException("Cancellation remark is mandatory");
                        }
                        if (Set.of("CONFIRMED", "POSTED", "RECEIVED").contains(e.getStatus())) {
                            reverseDcStock(key, e, user);
                        }
                    }
                }
                case "confirm-receipt", "confirm_receipt" -> {
                    if ("transfer-dc".equals(key) && e instanceof TransferDc t) {
                        if (Boolean.TRUE.equals(t.getReceiptConfirmed())) {
                            throw new IllegalStateException("Receipt already confirmed for Transfer DC " + t.getDocNo());
                        }
                        for (LineEntity line : t.getLines()) {
                            stockService.recordStockOut(t.getDocNo(), "transfer-dc", "TRANSFER_INTRANSIT_OUT",
                                    line.getItemCode(), "In-Transit", line.getBatchNo(), line.getHeatNo(),
                                    line.getQty(), LocalDate.now(), user, true);
                            stockService.recordStockIn(t.getDocNo(), "transfer-dc", "TRANSFER_RECEIPT",
                                    line.getItemCode(), t.getDestinationLocation(), line.getBatchNo(), line.getHeatNo(),
                                    line.getQty(), LocalDate.now(), user, "FREE");
                        }
                        t.setReceiptConfirmed(true);
                        t.setReceiptConfirmedBy(user);
                        t.setReceiptConfirmedAt(Instant.now());
                        t.setStatus("RECEIVED");
                    }
                }
                case "post" -> {
                    if (!DIRECT_POST_INWARD_KEYS.contains(key) && !DIRECT_POST_DC_KEYS.contains(key)) {
                        requireStatus(e, "APPROVED");
                    }
                    if ("sales-dc".equals(key)) enforceFinalInspectionGate(e, options);
                    post(key, e, boolVal(options.get("authorizedOverride")));
                    e.setStatus("POSTED");
                    postToVendorLedger(key, e);
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
            case "post" -> e.setPostedAt(Instant.now());
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
        // DC Module FRS v1.0 §7: availability is re-validated at posting time, not only on entry,
        // so a draft posted later cannot exceed the stock on hand at the movement location.
        if (Set.of("jo-dc", "general-dc", "transfer-dc").contains(key)) {
            validateDcStockAvailability(key, e);
        }
        List<LedgerLine> lines = collectLines(def, e);
        String txType = def.tx().isEmpty() ? key.toUpperCase() : def.tx();
        String stockStatus = determineStockStatus(key, e);
        boolean skipStockEffect = "grn".equals(key) && sourceAlreadyPostedStock(e);

        boolean transferInTransit = "transfer-dc".equals(key)
                && Boolean.TRUE.equals(headerBool(e, "inTransitTracking"));
        boolean joDcReceiving = "jo-dc".equals(key)
                && "Receiving after Job Work".equalsIgnoreCase(headerStr(e, "challanPurpose"));

        for (LedgerLine l : lines) {
            requireActiveStore(l.loc());
            if (skipStockEffect) continue;
            if ("transfer-dc".equals(key)) {
                String destLoc = headerStr(e, "destinationLocation");
                requireActiveStore(destLoc);
                stockService.recordStockOut(
                        e.getDocNo(), key, txType, l.item(), l.loc(), l.batch(), l.heat(),
                        BigDecimal.valueOf(l.qty()), e.getDocDate(), e.getCreatedBy(),
                        allowNegativeOverride);
                if (transferInTransit) {
                    // FRS §3.3 E: with In-Transit Tracking ON the goods rest in the In-Transit
                    // bucket and only reach the destination on "Confirm Receipt at Destination".
                    stockService.recordStockIn(
                            e.getDocNo(), key, "TRANSFER_INTRANSIT_IN", l.item(), "In-Transit", l.batch(), l.heat(),
                            BigDecimal.valueOf(l.qty()), e.getDocDate(), e.getCreatedBy(), "FREE");
                } else if (destLoc != null && !destLoc.isBlank()) {
                    stockService.recordStockIn(
                            e.getDocNo(), key, "TRANSFER_IN", l.item(), destLoc, l.batch(), l.heat(),
                            BigDecimal.valueOf(l.qty()), e.getDocDate(), e.getCreatedBy(), "FREE");
                }
            } else if ("jo-dc".equals(key)) {
                if (joDcReceiving) {
                    // FRS §3.1 E: receiving pulls from the "Goods with Job Worker" bucket back
                    // into the From Location instead of deducting the main store again.
                    stockService.recordStockOut(
                            e.getDocNo(), key, "JO_DC_RECEIPT", l.item(), "Goods with Job Worker", l.batch(), l.heat(),
                            BigDecimal.valueOf(l.qty()), e.getDocDate(), e.getCreatedBy(),
                            allowNegativeOverride);
                    stockService.recordStockIn(
                            e.getDocNo(), key, "JO_DC_RECEIPT_IN", l.item(), l.loc(), l.batch(), l.heat(),
                            BigDecimal.valueOf(l.qty()), e.getDocDate(), e.getCreatedBy(), "FREE");
                } else {
                    // FRS §3.1 E: sending deducts From Location and funds the "Goods with Job Worker"
                    // virtual bucket so a later receiving DC can validate against it.
                    stockService.recordStockOut(
                            e.getDocNo(), key, txType, l.item(), l.loc(), l.batch(), l.heat(),
                            BigDecimal.valueOf(l.qty()), e.getDocDate(), e.getCreatedBy(),
                            allowNegativeOverride);
                    stockService.recordStockIn(
                            e.getDocNo(), key, "JO_DC_SEND", l.item(), "Goods with Job Worker", l.batch(), l.heat(),
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
        if (joDcReceiving && e instanceof JoDc joDc) {
            updateJobOrderReceiptStatus(joDc, e.getCreatedBy());
        }
    }

    /**
     * DC Module FRS v1.0 §3.1 E: when a Receiving-after-Job-Work JO DC is posted, the linked
     * Job Order status advances to RECEIVED (all quantities in) or PARTIALLY_RECEIVED (some
     * quantities still pending). This is a best-effort bookkeeping update keyed to the Job Order
     * number the DC carries; if the Job Order cannot be found or is already terminal, nothing
     * changes.
     */
    private void updateJobOrderReceiptStatus(JoDc joDc, String user) {
        String joNo = joDc.getJobOrderNo() != null && !joDc.getJobOrderNo().isBlank()
                ? joDc.getJobOrderNo() : joDc.getLinkedDocumentNo();
        if (joNo == null || joNo.isBlank()) return;

        JobOrder jo = em.createQuery("select j from JobOrder j where j.docNo = :no", JobOrder.class)
                .setParameter("no", joNo)
                .getResultStream().findFirst().orElse(null);
        if (jo == null || jo.getLines() == null || jo.getLines().isEmpty()) return;
        if ("CANCELLED".equalsIgnoreCase(jo.getStatus())) return;

        Map<String, BigDecimal> received = new HashMap<>();
        em.createQuery("select l.itemCode, coalesce(sum(l.producedQty), 0) from JoInwardLine l where l.doc.jobOrderNo = :no group by l.itemCode", Object[].class)
                .setParameter("no", joNo).getResultList()
                .forEach(r -> received.merge(keyOf(r[0]), (BigDecimal) r[1], BigDecimal::add));
        em.createQuery("select l.itemCode, coalesce(sum(l.receivedQty), 0) from LoInwardLine l where l.doc.jobOrderNo = :no group by l.itemCode", Object[].class)
                .setParameter("no", joNo).getResultList()
                .forEach(r -> received.merge(keyOf(r[0]), (BigDecimal) r[1], BigDecimal::add));
        for (LineEntity line : joDc.getLines()) {
            if (line.getItemCode() != null && line.getQty() != null) {
                received.merge(keyOf(line.getItemCode()), line.getQty(), BigDecimal::add);
            }
        }

        boolean allReceived = true;
        boolean anyReceived = false;
        for (JobOrderItem item : jo.getLines()) {
            BigDecimal ordered = item.getOrderQty() == null ? BigDecimal.ZERO : item.getOrderQty();
            BigDecimal got = received.getOrDefault(keyOf(item.getItemCode()), BigDecimal.ZERO);
            if (got.compareTo(BigDecimal.ZERO) > 0) anyReceived = true;
            if (ordered.compareTo(BigDecimal.ZERO) > 0 && got.compareTo(ordered) < 0) allReceived = false;
        }

        String target = allReceived ? "RECEIVED" : (anyReceived ? "PARTIALLY_RECEIVED" : null);
        if (target != null && !target.equalsIgnoreCase(jo.getStatus())) {
            jo.setStatus(target);
            jo.setUpdatedBy(user);
            jo.setUpdatedAt(Instant.now());
        }
    }

    private static String keyOf(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private Boolean headerBool(DocEntity e, String field) {
        Object v = headerVal(e, field);
        if (v instanceof Boolean b) return b;
        if (v == null) return null;
        return "true".equalsIgnoreCase(String.valueOf(v));
    }

    /**
     * Every Inward type (PO/LO/JO/General/Return) already has Effect.IN and posts
     * stock directly to store on its own POST action. GRN's source-document picker
     * only ever offers an already-POSTED Inward, so posting the GRN would add a
     * second, separate stock entry for the same physical receipt. GRN still
     * completes its own lifecycle normally (accepted/rejected qty, inspection
     * reference, printable paperwork) — this just tells post() to skip the
     * stock-ledger effect for that case, rather than double-counting.
     */
    private boolean sourceAlreadyPostedStock(DocEntity e) {
        if (!(e instanceof Grn g)) return false;
        String sourceNo = g.getSourceDocumentNo();
        if (sourceNo == null || sourceNo.isBlank()) return false;
        String sourceKey = switch (String.valueOf(g.getSourceType())) {
            case "LO_INWARD" -> "lo-inward";
            case "JO_INWARD" -> "jo-inward";
            case "GENERAL_INWARD" -> "general-inward";
            case "RETURN_INWARD" -> "return-inward";
            default -> "po-inward";
        };
        try {
            DocEntity source = getByNumber(sourceKey, sourceNo);
            return DocTypes.get(sourceKey).effect() == DocTypes.Effect.IN && "POSTED".equals(source.getStatus());
        } catch (Exception ex) {
            return false;
        }
    }

    /**
     * FRS DOC-PUR-FRS-02 §11 (PUR-08/PUR-09) — writes the vendor-ledger effect of a document
     * reaching POSTED. Purchase Invoice increases the payable by its total; a Purchase Return
     * flagged debitNoteRequired decreases it by the debit note amount (falling back to the
     * sum of returned-line net amounts if no explicit debitNoteAmount was entered).
     * VendorLedgerService itself is idempotent per (refDocType, refDocNo), so re-posting the
     * same document (which shouldn't be reachable given the status guards) never double-counts.
     */
    private void postToVendorLedger(String key, DocEntity e) {
        try {
            if ("purchase-invoice".equals(key) && e instanceof PurchaseInvoice inv) {
                if (inv.getTotalAmount() == null || inv.getSupplier() == null || inv.getSupplier().isBlank()) return;
                String[] resolved = resolveParty(inv.getSupplier());
                vendorLedger.record(resolved[0], resolved[1], e.getDocDate(), "INVOICE",
                        "purchase-invoice", e.getDocNo(), inv.getTotalAmount(),
                        "Supplier invoice " + (inv.getSupplierInvoiceNo() != null ? inv.getSupplierInvoiceNo() : e.getDocNo()),
                        e.getUpdatedBy());
            } else if ("purchase-return".equals(key) && e instanceof PurchaseReturn ret) {
                if (!Boolean.TRUE.equals(ret.getDebitNoteRequired()) || ret.getSupplier() == null || ret.getSupplier().isBlank()) return;
                BigDecimal amount = ret.getDebitNoteAmount();
                if (amount == null || amount.signum() <= 0) {
                    amount = BigDecimal.ZERO;
                    for (LineEntity l : e.getLines()) {
                        if (l instanceof PurchaseReturnLine prl && prl.getNetAmount() != null) {
                            amount = amount.add(prl.getNetAmount());
                        }
                    }
                }
                if (amount.signum() <= 0) return;
                String[] resolved = resolveParty(ret.getSupplier());
                vendorLedger.record(resolved[0], resolved[1], e.getDocDate(), "RETURN",
                        "purchase-return", e.getDocNo(), amount.negate(),
                        "Debit note for return " + e.getDocNo() + (ret.getReasonCode() != null ? " (" + ret.getReasonCode() + ")" : ""),
                        e.getUpdatedBy());
            }
        } catch (Exception ex) {
            log.warn("postToVendorLedger skipped for {} {}: {}", key, e.getDocNo(), ex.getMessage());
        }
    }

    /**
     * FRS DOC-PUR-FRS-02 §6 (PUR-04) — records a PO amendment: called right before the
     * incoming payload is merged into the managed PO entity, whenever that PO is being edited
     * outside DRAFT/REJECTED (i.e. it was already RELEASED/SUBMITTED/APPROVED — a real
     * amendment to a document the vendor may already hold, not just an in-progress draft edit).
     * Snapshots the pre-edit state, bumps revisionNumber, and flags whether supplier/qty/price
     * actually changed (vs. e.g. only remarks).
     *
     * [TBC] Re-approval-on-material-change is intentionally NOT enforced here — per the brief,
     * this is implemented as a basic, disabled-by-default rule (REQUIRE_REAPPROVAL_ON_AMENDMENT)
     * until the business confirms whether a material amendment should force the PO back to
     * SUBMITTED. Flip that constant to true to enable it.
     */
    private static final boolean REQUIRE_REAPPROVAL_ON_AMENDMENT = false;

    /** Returns the next revision number to apply to `old` after copyFields runs, or null on failure. */
    private Integer recordPoAmendment(PurchaseOrder old, PurchaseOrder incoming, String user) {
        try {
            boolean materialChange = !Objects.equals(old.getSupplier(), incoming.getSupplier());
            if (!materialChange && old.getLines() != null && incoming.getLines() != null) {
                Map<String, PurchaseOrderItem> oldByItem = new LinkedHashMap<>();
                for (PurchaseOrderItem l : old.getLines()) oldByItem.put(l.getItemCode(), l);
                if (old.getLines().size() != incoming.getLines().size()) {
                    materialChange = true;
                } else {
                    for (PurchaseOrderItem nl : incoming.getLines()) {
                        PurchaseOrderItem ol = oldByItem.get(nl.getItemCode());
                        if (ol == null
                                || !Objects.equals(ol.getOrderQty(), nl.getOrderQty())
                                || !Objects.equals(ol.getUnitPrice(), nl.getUnitPrice())) {
                            materialChange = true;
                            break;
                        }
                    }
                }
            }

            PoAmendmentHistory hist = new PoAmendmentHistory();
            hist.setPoId(old.getId());
            hist.setPoDocNo(old.getDocNo());
            int nextRevision = (old.getRevisionNumber() == null ? 1 : old.getRevisionNumber()) + 1;
            hist.setRevisionNumber(nextRevision);
            hist.setStatusAtAmendment(old.getStatus());
            hist.setMaterialChange(materialChange);
            hist.setSnapshotBefore(mapper.writeValueAsString(mapper.convertValue(old, LinkedHashMap.class)));
            hist.setAmendedBy(user);
            poAmendments.save(hist);

            // [TBC/disabled] Not applied to `old` here — copyFields() runs right after this
            // returns and would overwrite a status change made now. See REQUIRE_REAPPROVAL_ON_AMENDMENT.
            if (materialChange && REQUIRE_REAPPROVAL_ON_AMENDMENT) {
                log.info("PO {} materially amended — re-approval flag set but not enforced (disabled by default)", old.getDocNo());
            }
            return nextRevision;
        } catch (Exception ex) {
            log.warn("recordPoAmendment skipped for {}: {}", old.getDocNo(), ex.getMessage());
            return null;
        }
    }

    /** Returns {code, name}, resolving a header string (which may hold either) against Party master. */
    private String[] resolveParty(String supplierField) {
        return parties.findByCode(supplierField)
                .or(() -> parties.findByName(supplierField))
                .map(p -> new String[]{p.getCode(), p.getName()})
                .orElse(new String[]{supplierField, supplierField});
    }

    /**
     * DOCUMENT 02 v2.0 §02.1 (FR-INV-STORE-2): a non-blank location must resolve to a
     * recognized active location before it can be posted to. store_master is the
     * FRS's authoritative store list, but most existing document forms still pick
     * from the older, separate location_master table (e.g. "RM-A-12") — both are
     * accepted here so this check catches genuine typos/unknown locations without
     * breaking every screen that hasn't been migrated onto store_master yet. Blank
     * locations are left alone — StockService defaults those to "MAIN" today and
     * changing that default is out of scope here.
     */
    private void requireActiveStore(String location) {
        if (location == null || location.isBlank()) return;
        boolean isStore = stores.findByCode(location).map(s -> Boolean.TRUE.equals(s.getActive())).orElse(false);
        if (isStore) return;
        if (locations.existsByCodeAndActiveTrue(location)) return;
        throw new BusinessRuleException("LOCATION_NOT_A_STORE",
                "Location '" + location + "' is not a recognized active store or location",
                Map.of("location", location));
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
        if (e instanceof WorkOrder wo && wo.getMaterialLines() != null) {
            for (WorkOrderMaterial m : wo.getMaterialLines()) {
                m.setDoc(wo);
            }
        }
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
        if (!Set.of("dc-return", "invoice-return", "inward-return", "internal-return", "receipt-return", "purchase-return").contains(key)) return;

        String originalDocNo = null;
        String origDocType = null;
        if ("purchase-return".equals(key) && e instanceof PurchaseReturn pr) {
            originalDocNo = pr.getOriginalDocumentNo();
            origDocType = "purchase-order".equals(pr.getOriginalDocumentType()) ? "purchase-order" : "po-inward";
        } else if ("dc-return".equals(key) && e instanceof DcReturn dr) {
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
                // A referenced Purchase Order is almost never itself POSTED in this system —
                // per FRS DOC-PUR-FRS-02 §5D, disableApprovalWorkflow historically kept most
                // real POs in DRAFT/RELEASED. Accept any status beyond DRAFT for that case;
                // every other origDocType keeps the stricter POSTED requirement.
                boolean eligible = "purchase-order".equals(origDocType)
                        ? !"DRAFT".equals(origDoc.getStatus()) && !"CANCELLED".equals(origDoc.getStatus())
                        : "POSTED".equals(origDoc.getStatus());
                if (!eligible) {
                    throw new IllegalStateException("Original document " + originalDocNo + " is not eligible for a return (status " + origDoc.getStatus() + ")");
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

            // NOTE: lineClass/qtyField must match the persistent attribute name on each
            // line entity — DcReturnLine/InvoiceReturnLine only expose a Java getQty()
            // override backed by currentReturnQty, InternalReturnLine/InwardReturnLine/
            // ReceiptReturnLine are backed by returnedQty. HQL resolves against mapped
            // attributes, not interface method overrides, so "l.qty" always threw
            // UnknownPathException here, and inward-return fell through to the
            // unrelated InvoiceReturnLine class — this blocked every return with an
            // original-document reference from ever being created.
            String lineClass = switch (key) {
                case "dc-return" -> "DcReturnLine";
                case "internal-return" -> "InternalReturnLine";
                case "receipt-return" -> "ReceiptReturnLine";
                case "inward-return" -> "InwardReturnLine";
                case "purchase-return" -> "PurchaseReturnLine";
                default -> "InvoiceReturnLine";
            };
            String qtyField = switch (key) {
                case "dc-return", "invoice-return" -> "currentReturnQty";
                case "purchase-return" -> "returnQty";
                default -> "returnedQty";
            };
            String origField = switch (key) {
                case "dc-return" -> "doc.originalDcNumber";
                case "invoice-return" -> "doc.originalInvoiceNumber";
                case "inward-return", "internal-return", "receipt-return", "purchase-return" -> "doc.originalDocumentNo";
                default -> null;
            };

            String hql = "SELECT COALESCE(SUM(l." + qtyField + "), 0) FROM " + lineClass + " l " +
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
        // Direct inventory update enabled — business rule validation bypassed as requested.
    }

    /**
     * DC Module FRS v1.0 §3.2 B#5: GSTIN is mandatory on a General DC whenever Tax Applicable
     * is checked. Enforced on create and update.
     */
    private void validateGeneralDcGstin(String key, DocEntity e) {
        if (!"general-dc".equals(key) || !(e instanceof GeneralDc g)) return;
        if (Boolean.TRUE.equals(g.getTaxApplicable())
                && (g.getGstin() == null || g.getGstin().isBlank())) {
            throw new IllegalArgumentException("GSTIN is mandatory when Tax Applicable is checked on a General DC");
        }
    }

    private void validateDcStockAvailability(String key, DocEntity e) {
        if (!Set.of("jo-dc", "general-dc", "transfer-dc").contains(key)) return;

        if (e.getDocDate() != null && e.getDocDate().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("DC Date cannot be a future date");
        }

        String sourceLoc = headerStr(e, "sourceLocation");
        if (sourceLoc == null || sourceLoc.isBlank()) {
            throw new IllegalArgumentException("From Location is required");
        }

        if (e.getLines() == null || e.getLines().isEmpty()) {
            throw new IllegalArgumentException("Delivery Challan requires at least one line item");
        }

        boolean isJoReceiving = "jo-dc".equals(key) && e instanceof JoDc joDc && "Receiving after Job Work".equalsIgnoreCase(joDc.getChallanPurpose());

        for (LineEntity line : e.getLines()) {
            String itemCode = line.getItemCode();
            if (itemCode == null || itemCode.isBlank()) continue;
            BigDecimal qty = line.getQty();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Line quantity for item " + itemCode + " must be greater than zero");
            }

            String checkLoc = isJoReceiving ? "Goods with Job Worker" : sourceLoc;
            String batchNo = line.getBatchNo() != null ? line.getBatchNo() : "";

            var item = itemCache.findByCode(itemCode).orElse(null);
            if (item != null && Boolean.TRUE.equals(item.getRequiresBatch()) && batchNo.isBlank()) {
                throw new IllegalArgumentException("Item " + itemCode + " is batch-tracked and requires a Batch/Lot No");
            }

            double available = stockService.available(itemCode, checkLoc);
            if (available < qty.doubleValue()) {
                throw new IllegalStateException("Quantity " + qty + " for item " + itemCode +
                        " exceeds available stock (" + available + ") at " + checkLoc);
            }
        }
    }

    private void reverseDcStock(String key, DocEntity e, String user) {
        if (e.getLines() == null) return;
        LocalDate now = LocalDate.now();
        if ("jo-dc".equals(key) && e instanceof JoDc joDc) {
            boolean isReceiving = "Receiving after Job Work".equalsIgnoreCase(joDc.getChallanPurpose());
            String sourceLoc = joDc.getSourceLocation();
            for (LineEntity line : joDc.getLines()) {
                if (isReceiving) {
                    stockService.recordStockOut(e.getDocNo(), key, "JO_DC_CANCEL", line.getItemCode(), sourceLoc, line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, true);
                    stockService.recordStockIn(e.getDocNo(), key, "JO_DC_CANCEL", line.getItemCode(), "Goods with Job Worker", line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, "FREE");
                } else {
                    stockService.recordStockOut(e.getDocNo(), key, "JO_DC_CANCEL", line.getItemCode(), "Goods with Job Worker", line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, true);
                    stockService.recordStockIn(e.getDocNo(), key, "JO_DC_CANCEL", line.getItemCode(), sourceLoc, line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, "FREE");
                }
            }
        } else if ("general-dc".equals(key) && e instanceof GeneralDc gDc) {
            String sourceLoc = gDc.getSourceLocation();
            for (LineEntity line : gDc.getLines()) {
                stockService.recordStockIn(e.getDocNo(), key, "GENERAL_DC_CANCEL", line.getItemCode(), sourceLoc, line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, "FREE");
            }
        } else if ("transfer-dc".equals(key) && e instanceof TransferDc tDc) {
            String sourceLoc = tDc.getSourceLocation();
            String destLoc = tDc.getDestinationLocation();
            boolean receiptConfirmed = Boolean.TRUE.equals(tDc.getReceiptConfirmed());
            boolean inTransit = Boolean.TRUE.equals(tDc.getInTransitTracking());
            for (LineEntity line : tDc.getLines()) {
                if (receiptConfirmed) {
                    stockService.recordStockOut(e.getDocNo(), key, "TRANSFER_DC_CANCEL", line.getItemCode(), destLoc, line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, true);
                    stockService.recordStockIn(e.getDocNo(), key, "TRANSFER_DC_CANCEL", line.getItemCode(), sourceLoc, line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, "FREE");
                } else if (inTransit) {
                    stockService.recordStockOut(e.getDocNo(), key, "TRANSFER_DC_CANCEL", line.getItemCode(), "In-Transit", line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, true);
                    stockService.recordStockIn(e.getDocNo(), key, "TRANSFER_DC_CANCEL", line.getItemCode(), sourceLoc, line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, "FREE");
                } else {
                    stockService.recordStockOut(e.getDocNo(), key, "TRANSFER_DC_CANCEL", line.getItemCode(), destLoc, line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, true);
                    stockService.recordStockIn(e.getDocNo(), key, "TRANSFER_DC_CANCEL", line.getItemCode(), sourceLoc, line.getBatchNo(), line.getHeatNo(), line.getQty(), now, user, "FREE");
                }
            }
        }
    }

    /**
     * DOCUMENT 02 v2.0 §03.2/03.3 (BR-INV-TRACE-1/2): records a doc_links row by
     * internal ID for every cross-document reference this doc type carries, reusing
     * the same reference-field-to-target-type mapping the validators above already
     * resolve. Called once per created document, after it has been assigned an ID.
     * Each lookup is best-effort: an optional/blank reference is simply skipped.
     */
    private void recordDocLinks(String key, DocEntity e, String user) {
        try {
            String targetType = null;
            String refNo = null;
            switch (key) {
                case "dc-return" -> { if (e instanceof DcReturn d) { refNo = d.getOriginalDcNumber(); targetType = "sales-dc"; } }
                case "invoice-return" -> { if (e instanceof InvoiceReturn d) { refNo = d.getOriginalInvoiceNumber(); targetType = "sales-invoice"; } }
                case "inward-return" -> { if (e instanceof InwardReturn d) { refNo = d.getOriginalDocumentNo(); targetType = "po-inward"; } }
                case "internal-return" -> { if (e instanceof InternalReturn d) { refNo = d.getOriginalDocumentNo(); targetType = "general-issue"; } }
                case "receipt-return" -> { refNo = headerStr(e, "originalDocumentNo"); targetType = "rm-issue"; }
                case "rm-issue" -> { if (e instanceof RmIssue d) { refNo = d.getIssueRequestNo(); targetType = "stock-issue-request"; } }
                case "stock-release" -> { if (e instanceof StockRelease d) { refNo = d.getAllotmentNo(); targetType = "stock-allotment"; } }
                case "received-against-issue" -> {
                    if (e instanceof ReceivedAgainstIssue d) {
                        refNo = d.getOriginalDocumentNo();
                        if (refNo != null && !refNo.isBlank()) {
                            for (String t : ISSUE_SOURCE_TYPES) {
                                try {
                                    DocEntity target = getByNumber(t, refNo);
                                    docLinks.record(key, e.getId(), t, target.getId(), user);
                                } catch (IllegalArgumentException ignored) { /* not this issue type */ }
                            }
                        }
                        return;
                    }
                }
                case "grn" -> {
                    if (e instanceof Grn g) {
                        refNo = g.getSourceDocumentNo();
                        targetType = switch (String.valueOf(g.getSourceType())) {
                            case "LO_INWARD" -> "lo-inward";
                            case "JO_INWARD" -> "jo-inward";
                            case "GENERAL_INWARD" -> "general-inward";
                            case "RETURN_INWARD" -> "return-inward";
                            default -> "po-inward";
                        };
                    }
                }
                default -> { return; }
            }
            if (refNo == null || refNo.isBlank() || targetType == null) return;
            DocEntity target = getByNumber(targetType, refNo);
            docLinks.record(key, e.getId(), targetType, target.getId(), user);
        } catch (Exception ex) {
            log.warn("recordDocLinks skipped for {} {}: {}", key, e.getDocNo(), ex.getMessage());
        }
    }
}
