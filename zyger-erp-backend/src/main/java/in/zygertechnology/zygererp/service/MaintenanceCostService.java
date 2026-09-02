package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.MaintenanceCostTransaction;
import in.zygertechnology.zygererp.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * §10.4 Maintenance cost ledger. Cost lines are persisted for each maintenance activity;
 * once the parent document is CLOSED the lines become immutable (no edit, only reversal).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenanceCostService {

    private final MaintenanceCostTransactionRepository costTransactions;
    private final BreakdownRectificationRepository rectifications;
    private final ToolServiceRectificationRepository toolRectifications;
    private final CalibrationEntryRepository calEntries;
    private final DocNumberService numbers;

    private void audit(Object e, String user) {
        try {
            e.getClass().getMethod("setUpdatedAt", Instant.class).invoke(e, Instant.now());
            e.getClass().getMethod("setUpdatedBy", String.class).invoke(e, user);
        } catch (Exception ignored) {}
    }

    // ---- read ----

    public List<Map<String, Object>> list(String machineCode, String category, String from, String to) {
        List<MaintenanceCostTransaction> all = costTransactions.findAll();
        LocalDate fromD = from == null ? null : LocalDate.parse(from);
        LocalDate toD = to == null ? null : LocalDate.parse(to);
        return all.stream()
            .filter(c -> machineCode == null || machineCode.isBlank() || machineCode.equals(c.getMachineCode()))
            .filter(c -> category == null || category.isBlank() || category.equals(c.getCostCategory()))
            .filter(c -> fromD == null || (c.getIncurredDate() != null && !c.getIncurredDate().isBefore(fromD)))
            .filter(c -> toD == null || (c.getIncurredDate() != null && !c.getIncurredDate().isAfter(toD)))
            .sorted(Comparator.comparing(MaintenanceCostTransaction::getIncurredDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .map(c -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", c.getId());
                m.put("costReference", c.getCostReference());
                m.put("parentType", c.getParentType());
                m.put("parentId", c.getParentId());
                m.put("parentNumber", c.getParentNumber());
                m.put("machineCode", c.getMachineCode());
                m.put("costCategory", c.getCostCategory());
                m.put("costType", c.getCostType());
                m.put("description", c.getDescription());
                m.put("amount", c.getAmount());
                m.put("qty", c.getQty());
                m.put("rate", c.getRate());
                m.put("currency", c.getCurrency());
                m.put("incurredDate", c.getIncurredDate());
                m.put("postedBy", c.getPostedBy());
                m.put("immutable", c.getImmutable());
                m.put("reversalId", c.getReversalId());
                m.put("createdAt", c.getCreatedAt());
                return m;
            }).toList();
    }

    public Map<String, Object> summary(String machineCode) {
        List<Map<String, Object>> rows = list(machineCode, null, null, null);
        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        BigDecimal total = BigDecimal.ZERO;
        for (Map<String, Object> r : rows) {
            if (r.get("reversalId") != null) continue;
            String cat = (String) r.get("costCategory");
            BigDecimal amt = (BigDecimal) r.get("amount");
            byCategory.merge(cat, amt, BigDecimal::add);
            total = total.add(amt);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("byCategory", byCategory);
        out.put("total", total);
        out.put("count", rows.size());
        return out;
    }

    // ---- auto-sync from parent ----

    @Transactional
    public int syncParentCost(String parentType, Long parentId, String principal) {
        int posted = 0;
        switch (parentType.toUpperCase()) {
            case "BREAKDOWN", "BREAKDOWN_RECTIFICATION" -> {
                var rect = rectifications.findById(parentId).orElse(null);
                if (rect == null || rect.getServiceCost() == null) return 0;
                if (!hasCost("BREAKDOWN", parentId, "SERVICE_COST")) {
                    saveManual(MaintenanceCostTransaction.builder()
                            .parentType("BREAKDOWN").parentId(parentId)
                            .parentNumber(rect.getRectificationNumber())
                            .machineCode(rect.getMachineCode())
                            .costCategory("BREAKDOWN").costType("SERVICE_COST")
                            .description("Breakdown rectification service cost")
                            .amount(rect.getServiceCost())
                            .incurredDate(LocalDate.now())
                            .postedBy(principal)
                            .build(), principal);
                    posted++;
                }
            }
            case "TOOLING", "TOOL" -> {
                var rect = toolRectifications.findById(parentId).orElse(null);
                if (rect == null || rect.getServiceCost() == null) return 0;
                if (!hasCost("TOOLING", parentId, "SERVICE_COST")) {
                    saveManual(MaintenanceCostTransaction.builder()
                            .parentType("TOOLING").parentId(parentId)
                            .parentNumber(rect.getRectificationNumber() != null ? rect.getRectificationNumber() : rect.getServiceNumber())
                            .machineCode(null)
                            .costCategory("TOOLING").costType("SERVICE_COST")
                            .description("Tool service rectification cost (tool " + rect.getToolId() + ")")
                            .amount(rect.getServiceCost())
                            .incurredDate(LocalDate.now())
                            .postedBy(principal)
                            .build(), principal);
                    posted++;
                }
            }
            case "CALIBRATION", "CALIBRATION_ENTRY" -> {
                var entry = calEntries.findById(parentId).orElse(null);
                if (entry == null || entry.getCalibrationCost() == null) return 0;
                if (!hasCost("CALIBRATION", parentId, "SERVICE_COST")) {
                    saveManual(MaintenanceCostTransaction.builder()
                            .parentType("CALIBRATION").parentId(parentId)
                            .parentNumber(entry.getCalibrationNumber() != null ? entry.getCalibrationNumber() : String.valueOf(entry.getId()))
                            .machineCode(null)
                            .costCategory("CALIBRATION").costType("SERVICE_COST")
                            .description("Calibration service cost (instrument " + entry.getInstrumentName() + ")")
                            .amount(entry.getCalibrationCost())
                            .incurredDate(LocalDate.now())
                            .postedBy(principal)
                            .build(), principal);
                    posted++;
                }
            }
            default -> { return 0; }
        }
        return posted;
    }

    private boolean hasCost(String parentType, Long parentId, String costType) {
        return costTransactions.findByParentTypeAndParentId(parentType, parentId).stream()
                .anyMatch(c -> costType.equals(c.getCostType()));
    }

    // ---- manual / adjustment / reversal ----

    private void setFields(MaintenanceCostTransaction c, String principal) {
        if (c.getCreatedBy() == null) c.setCreatedBy(principal);
        if (c.getCreatedAt() == null) c.setCreatedAt(Instant.now());
        if (c.getCurrency() == null) c.setCurrency("INR");
        if (c.getAmount() == null) c.setAmount(BigDecimal.ZERO);
        if (c.getImmutable() == null) c.setImmutable(false);
        if (c.getDeleted() == null) c.setDeleted(false);
        if (c.getIncurredDate() == null) c.setIncurredDate(LocalDate.now());
    }

    @Transactional
    public MaintenanceCostTransaction saveManual(MaintenanceCostTransaction c, String principal) {
        if (c.getId() != null) {
            MaintenanceCostTransaction existing = costTransactions.findById(c.getId())
                    .orElseThrow(() -> new IllegalStateException("Cost transaction not found"));
            if (Boolean.TRUE.equals(existing.getImmutable()))
                throw new IllegalStateException("Cost transaction is immutable (parent document is CLOSED)");
            c.setCostReference(existing.getCostReference());
            c.setCreatedAt(existing.getCreatedAt());
            c.setCreatedBy(existing.getCreatedBy());
        } else {
            c.setId(null);
            c.setCostReference(c.getCostReference() != null ? c.getCostReference() : numbers.next("maintenance-cost", "MCT"));
        }
        setFields(c, principal);
        audit(c, principal);
        return costTransactions.save(c);
    }

    @Transactional
    public Map<String, Object> reverse(Long id, String reason, String principal) {
        MaintenanceCostTransaction orig = costTransactions.findById(id)
                .orElseThrow(() -> new IllegalStateException("Cost transaction not found"));
        if (Boolean.TRUE.equals(orig.getImmutable()))
            throw new IllegalStateException("Cannot reverse an immutable (parent CLOSED) cost transaction");
        if (orig.getReversalId() != null)
            throw new IllegalStateException("Cost transaction already reversed");
        MaintenanceCostTransaction rev = MaintenanceCostTransaction.builder()
                .costReference(numbers.next("maintenance-cost", "MCT"))
                .parentType(orig.getParentType())
                .parentId(orig.getParentId())
                .parentNumber(orig.getParentNumber())
                .machineCode(orig.getMachineCode())
                .costCategory(orig.getCostCategory())
                .costType(orig.getCostType())
                .description(reason != null && !reason.isBlank() ? reason : ("Reversal of " + orig.getCostReference()))
                .amount(orig.getAmount().negate())
                .qty(orig.getQty())
                .rate(orig.getRate())
                .incurredDate(LocalDate.now())
                .postedBy(principal)
                .reversalId(orig.getId())
                .build();
        setFields(rev, principal);
        costTransactions.save(rev);
        orig.setReversalId(rev.getId());
        audit(orig, principal);
        costTransactions.save(orig);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("success", true);
        out.put("reversalId", rev.getId());
        return out;
    }
}
