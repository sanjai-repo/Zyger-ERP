package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import in.zygertechnology.zygererp.repository.SparePartMasterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * §8 Spare Request/Issue bridge. A maintenance activity (breakdown, PM, tooling)
 * requests spares; on approval, quantities are issued and posted to stock_ledger and
 * the maintenance cost ledger.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SpareRequestService {

    private final MaintenanceSpareRequestRepository requests;
    private final MaintenanceSpareRequestLineRepository lines;
    private final SparePartMasterRepository spareParts;
    private final ItemRepository items;
    private final StockBalanceRepository stockBalances;
    private final StockLedgerRepository ledger;
    private final MaintenanceCostTransactionRepository costTransactions;
    private final DocNumberService numbers;
    private final NotificationService notificationService;
    private final NotificationLogRepository notificationLogs;

    private static final String STOCK_LOG_TYPE = "MAINT_SPARE_ISSUE";

    private void notify(String event, String entityType, Long entityId, String sev, String msg, String ref) {
        try {
            NotificationLog nl = new NotificationLog();
            nl.setRecipient("maintenance-supervisor");
            nl.setSourceType("SPARE_REQUEST");
            nl.setSourceId(entityId);
            nl.setSubject(msg);
            nl.setBody(msg);
            nl.setStatus("SENT");
            nl.setSentAt(Instant.now());
            notificationLogs.save(nl);
            notificationService.notify(event, "MAINTENANCE", entityType, entityId, sev, msg, ref);
        } catch (Exception ex) {
            log.error("notification failed for spare request id={}", entityId, ex);
        }
    }

    // ---- read ----

    public List<Map<String, Object>> list(String status) {
        List<MaintenanceSpareRequest> all = (status == null || status.isBlank())
                ? requests.findAll()
                : requests.findByStatus(status);
        all.sort(Comparator.comparing(MaintenanceSpareRequest::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        List<Map<String, Object>> out = new ArrayList<>();
        for (MaintenanceSpareRequest r : all) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("requestNumber", r.getRequestNumber());
            m.put("sourceType", r.getSourceType());
            m.put("sourceId", r.getSourceId());
            m.put("referenceNumber", r.getReferenceNumber());
            m.put("machineCode", r.getMachineCode());
            m.put("requestedBy", r.getRequestedBy());
            m.put("requestedDate", r.getRequestedDate());
            m.put("status", r.getStatus());
            m.put("approvedBy", r.getApprovedBy());
            m.put("approvedAt", r.getApprovedAt());
            m.put("rejectedReason", r.getRejectedReason());
            m.put("remarks", r.getRemarks());
            m.put("createdAt", r.getCreatedAt());
            List<MaintenanceSpareRequestLine> ls = lines.findByRequestId(r.getId());
            m.put("lines", ls);
            m.put("lineCount", ls.size());
            m.put("totalRequestedQty", ls.stream().map(l -> l.getRequestedQty() == null ? BigDecimal.ZERO : l.getRequestedQty())
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
            m.put("totalIssuedQty", ls.stream().map(l -> l.getIssuedQty() == null ? BigDecimal.ZERO : l.getIssuedQty())
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
            out.add(m);
        }
        return out;
    }

    public Map<String, Object> get(Long id) {
        MaintenanceSpareRequest r = requests.findById(id).orElseThrow(() -> new IllegalStateException("Spare request not found"));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("requestNumber", r.getRequestNumber());
        m.put("sourceType", r.getSourceType());
        m.put("sourceId", r.getSourceId());
        m.put("referenceNumber", r.getReferenceNumber());
        m.put("machineCode", r.getMachineCode());
        m.put("requestedBy", r.getRequestedBy());
        m.put("requestedDate", r.getRequestedDate());
        m.put("status", r.getStatus());
        m.put("approvedBy", r.getApprovedBy());
        m.put("approvedAt", r.getApprovedAt());
        m.put("rejectedReason", r.getRejectedReason());
        m.put("remarks", r.getRemarks());
        m.put("lines", lines.findByRequestId(id));
        return m;
    }

    // ---- create ----

    @Transactional
    public Map<String, Object> create(Map<String, Object> body, String principal) {
        MaintenanceSpareRequest r = new MaintenanceSpareRequest();
        r.setRequestNumber(numbers.next("maintenance-spare-request", "MSR"));
        r.setSourceType(str(body.get("sourceType")));
        r.setSourceId(longOrNull(body.get("sourceId")));
        r.setReferenceNumber(str(body.get("referenceNumber")));
        r.setMachineCode(str(body.get("machineCode")));
        r.setRequestedBy(principal);
        r.setRequestedDate(LocalDate.now());
        r.setStatus("PENDING");
        r.setRemarks(str(body.get("remarks")));
        r.setCreatedBy(principal);
        r.setCreatedAt(Instant.now());
        MaintenanceSpareRequest saved = requests.save(r);

        List<?> lineList = body.get("lines") instanceof List ? (List<?>) body.get("lines") : List.of();
        for (Object o : lineList) {
            if (!(o instanceof Map<?, ?> lm)) continue;
            Map<String, Object> line = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : lm.entrySet()) {
                if (e.getKey() != null) line.put(e.getKey().toString(), e.getValue());
            }
            String itemCode = str(line.get("itemCode"));
            if (itemCode == null || itemCode.isBlank()) continue;
            BigDecimal qty = new BigDecimal(line.get("requestedQty") == null ? "0" : line.get("requestedQty").toString());
            MaintenanceSpareRequestLine l = new MaintenanceSpareRequestLine();
            l.setRequestId(saved.getId());
            l.setItemCode(itemCode);
            String itemName = str(line.get("itemName"));
            BigDecimal unitCost = BigDecimal.ZERO;
            Optional<SparePartMaster> sp = itemCode != null ? spareParts.findByCode(itemCode) : Optional.empty();
            if (sp.isPresent()) {
                if (itemName == null) itemName = sp.get().getName();
                l.setSparePartId(sp.get().getId());
                unitCost = sp.get().getUnitCost() == null ? BigDecimal.ZERO : sp.get().getUnitCost();
            } else {
                Optional<ItemMaster> item = itemCode != null ? items.findByCode(itemCode) : Optional.empty();
                if (item.isPresent()) {
                    if (itemName == null) itemName = item.get().getName();
                    unitCost = item.get().getDefaultRate() == null ? BigDecimal.ZERO : item.get().getDefaultRate();
                }
            }
            l.setItemName(itemName);
            l.setUom(str(line.get("uom")) != null ? str(line.get("uom")) : "NOS");
            l.setRequestedQty(qty);
            l.setUnitCost(unitCost);
            l.setLineStatus("PENDING");
            BigDecimal available = stockBalances.sumAvailableByItem(itemCode, null);
            l.setAvailableQty(available == null ? BigDecimal.ZERO : available);
            lines.save(l);
        }
        return get(saved.getId());
    }

    // ---- approve / reject / cancel ----

    @Transactional
    public Map<String, Object> approve(Long id, String principal) {
        MaintenanceSpareRequest r = requests.findById(id).orElseThrow(() -> new IllegalStateException("Spare request not found"));
        if (!"PENDING".equals(r.getStatus())) throw new IllegalStateException("Only a PENDING request can be approved");
        List<MaintenanceSpareRequestLine> ls = lines.findByRequestId(id);
        List<MaintenanceSpareRequestLine> issuedLines = new ArrayList<>();
        for (MaintenanceSpareRequestLine l : ls) {
            BigDecimal available = stockBalances.sumAvailableByItem(l.getItemCode(), null);
            BigDecimal av = available == null ? BigDecimal.ZERO : available;
            BigDecimal toIssue = l.getRequestedQty().min(av);
            if (toIssue.compareTo(BigDecimal.ZERO) > 0) {
                issueToLedger(l, toIssue);
                l.setIssuedQty(toIssue);
                l.setLineStatus("ISSUED");
                lines.save(l);
                issuedLines.add(l);
                // cost ledger
                postCost(r, l, toIssue, principal);
            } else {
                l.setLineStatus(av.compareTo(BigDecimal.ZERO) > 0 ? "PARTIAL" : "OUT_OF_STOCK");
                lines.save(l);
            }
        }
        boolean anyIssued = !issuedLines.isEmpty();
        boolean allIssued = !ls.isEmpty() && ls.stream().allMatch(l -> "ISSUED".equals(l.getLineStatus()));
        r.setStatus(allIssued ? "ISSUED" : (anyIssued ? "PARTIALLY_ISSUED" : "REJECTED"));
        r.setApprovedBy(principal);
        r.setApprovedAt(Instant.now());
        r.setUpdatedAt(Instant.now());
        r.setUpdatedBy(principal);
        requests.save(r);
        notify("SPARE_APPROVED", "SPARE_REQUEST", id, "INFO",
                "Spare request " + r.getRequestNumber() + " processed (issued " + issuedLines.size() + " lines)", r.getMachineCode());
        return get(id);
    }

    @Transactional
    public Map<String, Object> reject(Long id, String reason, String principal) {
        MaintenanceSpareRequest r = requests.findById(id).orElseThrow(() -> new IllegalStateException("Spare request not found"));
        if (!"PENDING".equals(r.getStatus())) throw new IllegalStateException("Only a PENDING request can be rejected");
        r.setStatus("REJECTED");
        r.setRejectedReason(reason);
        r.setApprovedBy(principal);
        r.setApprovedAt(Instant.now());
        r.setUpdatedAt(Instant.now());
        r.setUpdatedBy(principal);
        requests.save(r);
        notify("SPARE_REJECTED", "SPARE_REQUEST", id, "WARNING",
                "Spare request " + r.getRequestNumber() + " was rejected", r.getMachineCode());
        return get(id);
    }

    @Transactional
    public Map<String, Object> cancel(Long id, String principal) {
        MaintenanceSpareRequest r = requests.findById(id).orElseThrow(() -> new IllegalStateException("Spare request not found"));
        if ("ISSUED".equals(r.getStatus()) || "PARTIALLY_ISSUED".equals(r.getStatus()))
            throw new IllegalStateException("Cannot cancel a request that has been issued");
        r.setStatus("CANCELLED");
        r.setUpdatedAt(Instant.now());
        r.setUpdatedBy(principal);
        requests.save(r);
        return get(id);
    }

    // ---- helpers ----

    private void issueToLedger(MaintenanceSpareRequestLine l, BigDecimal qty) {
        StockLedger txn = StockLedger.builder()
                .txDate(LocalDate.now())
                .docNo("MSR-" + l.getRequestId())
                .docType("MAINT_SPARE")
                .txType("ISSUE")
                .itemCode(l.getItemCode())
                .location("MAINT-STOCK")
                .stockStatus("FREE")
                .outQty(qty)
                .createdBy("system")
                .build();
        StockLedger saved = ledger.save(txn);
        l.setInventoryTxnId(saved.getId());
    }

    private void postCost(MaintenanceSpareRequest r, MaintenanceSpareRequestLine l, BigDecimal qty, String principal) {
        try {
            MaintenanceCostTransaction c = MaintenanceCostTransaction.builder()
                    .costReference(numbers.next("maintenance-cost", "MCT"))
                    .parentType(r.getSourceType() != null ? r.getSourceType() : "SPARE")
                    .parentId(r.getSourceId())
                    .parentNumber(r.getRequestNumber())
                    .machineCode(r.getMachineCode())
                    .costCategory("SPARE")
                    .costType("SPARE_ISSUE")
                    .description("Spare issue " + l.getItemCode() + " x " + qty)
                    .amount(l.getUnitCost().multiply(qty))
                    .qty(qty)
                    .rate(l.getUnitCost())
                    .incurredDate(LocalDate.now())
                    .postedBy(principal)
                    .createdBy(principal)
                    .createdAt(Instant.now())
                    .build();
            costTransactions.save(c);
        } catch (Exception ex) {
            log.error("cost post failed for spare line requestId={}", r.getId(), ex);
        }
    }

    private String str(Object o) { return o == null ? null : o.toString(); }
    private Long longOrNull(Object o) { return o == null ? null : Long.valueOf(o.toString()); }
}
