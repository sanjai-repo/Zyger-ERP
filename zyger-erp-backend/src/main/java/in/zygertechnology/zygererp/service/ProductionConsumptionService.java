package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductionConsumptionService {

    private final ProductionConsumptionRepository consumptions;
    private final ProductionConsumptionLineRepository consumptionLines;
    private final JobCardRepository jobCards;
    private final DocNumberService numbers;
    private final StockService stockService;
    private final WorkflowStateMachine stateMachine;
    private final DocumentFacade documents;

    @Transactional
    public ProductionConsumption save(ProductionConsumption draft, String user) {
        if (user == null || user.isBlank()) user = "system";
        if (draft.getLines() == null || draft.getLines().isEmpty()) {
            throw new IllegalArgumentException("Consumption requires at least one line");
        }
        if (draft.getId() == null) {
            validateNew(draft);
            buildNumber(draft, user);
        } else {
            ProductionConsumption existing = consumptions.findById(draft.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Consumption not found"));
            if (!"DRAFT".equals(existing.getStatus())) {
                throw new IllegalStateException("Only DRAFT consumption can be edited (current: " + existing.getStatus() + ")");
            }
            draft.setConsumptionNo(existing.getConsumptionNo());
            draft.setCreatedBy(existing.getCreatedBy());
            draft.setCreatedAt(existing.getCreatedAt());
        }
        draft.setUpdatedBy(user);
        draft.setUpdatedAt(Instant.now());
        if (draft.getStatus() == null) draft.setStatus("DRAFT");
        if (draft.getConsumptionDate() == null) draft.setConsumptionDate(LocalDate.now());

        for (ProductionConsumptionLine line : draft.getLines()) {
            line.setConsumption(draft);
            if (line.getConsumedQty() == null) line.setConsumedQty(BigDecimal.ZERO);
            if (line.getIssuedQty() == null) line.setIssuedQty(BigDecimal.ZERO);
            if (line.getConsumedQty().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Consumed quantity must be > 0 for item " + nullSafe(line.getItemCode()));
            }
            if (line.getConsumedQty().compareTo(line.getIssuedQty().add(line.getReturnQty() == null ? BigDecimal.ZERO : line.getReturnQty())) > 0) {
                throw new IllegalArgumentException("Consumed quantity exceeds issued quantity for item " + nullSafe(line.getItemCode()));
            }
        }
        return consumptions.save(draft);
    }

    private void validateNew(ProductionConsumption draft) {
        if (draft.getJobCardId() == null) {
            throw new IllegalArgumentException("Consumption requires a Job Card (production reference)");
        }
        JobCard jc = jobCards.findById(draft.getJobCardId())
                .orElseThrow(() -> new IllegalArgumentException("Job Card not found: " + draft.getJobCardId()));
        if (!"RELEASED".equals(jc.getStatus()) && !"IN_PROGRESS".equals(jc.getStatus())) {
            throw new IllegalStateException("Consumption requires a released/in-progress Job Card (current: " + nullSafe(jc.getStatus()) + ")");
        }
        if (draft.getJobCardNumber() == null) draft.setJobCardNumber(jc.getJobCardNumber());
        if (draft.getWorkOrderNumber() == null) draft.setWorkOrderNumber(jc.getWorkOrderNumber());
    }

    private void buildNumber(ProductionConsumption draft, String user) {
        draft.setConsumptionNo(numbers.next("production-consumption"));
        draft.setCreatedBy(user);
        draft.setCreatedAt(Instant.now());
    }

    @Transactional
    public String nextNumber() {
        return numbers.peek("production-consumption");
    }

    @Transactional(readOnly = true)
    public List<ProductionConsumption> list() {
        return consumptions.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    @Transactional(readOnly = true)
    public ProductionConsumption get(Long id) {
        return consumptions.findById(id).orElseThrow(() -> new IllegalArgumentException("Consumption not found"));
    }

    @Transactional
    public void delete(Long id) {
        ProductionConsumption c = consumptions.findById(id).orElseThrow(() -> new IllegalArgumentException("Consumption not found"));
        if (!"DRAFT".equals(c.getStatus())) {
            throw new IllegalStateException("Only DRAFT consumption can be deleted");
        }
        consumptions.delete(c);
    }

    @Transactional
    public ProductionConsumption action(Long id, String action, String user) {
        ProductionConsumption c = consumptions.findById(id).orElseThrow(() -> new IllegalArgumentException("Consumption not found"));
        if (user == null || user.isBlank()) user = "system";
        stateMachine.validateTransition("production-consumption", c.getStatus(), action);
        String a = action.toUpperCase();
        switch (a) {
            case "SUBMIT" -> c.setStatus("SUBMITTED");
            case "POST" -> {
                if (!"SUBMITTED".equals(c.getStatus())) {
                    throw new IllegalStateException("Only SUBMITTED consumption can be posted");
                }
                post(c, user);
                c.setStatus("POSTED");
                c.setPostedAt(Instant.now());
            }
            case "CANCEL" -> c.setStatus("CANCELLED");
            default -> throw new IllegalArgumentException("Unknown action: " + action);
        }
        c.setUpdatedBy(user);
        c.setUpdatedAt(Instant.now());
        return consumptions.save(c);
    }

    /**
     * Authorized consumption posting (ADR-001 P6.2, Model B-a).
     *
     * <p>Two ordered, same-transaction steps:
     * <ol>
     *   <li><b>Release the reservation.</b> If this consumption references a Material
     *       Request, its APPROVED {@code stock-allotment} reservation is <b>posted</b>
     *       ({@code Effect.NONE} — no physical movement). {@link StockService#reservations()}
     *       counts only APPROVED allotments, so posting atomically clears the reservation
     *       and restores {@code available()}. The allotment remains a fully auditable
     *       record; its {@code referenceNo} keeps the link to the request.</li>
     *   <li><b>Single physical OUT.</b> Each line consumes once via Inventory-owned
     *       {@code StockService} within the same transaction. Because the reservation was
     *       cleared in step 1, {@code verifyStockAvailability} (which checks
     *       {@code available() = onHand − reserved − qcHold}) no longer sees the reserved
     *       quantity and the OUT is not double-counted against itself.</li>
     * </ol>
     *
     * <p>Idempotency: StockService skips duplicate (consumptionNo, "production-consumption")
     * ledger rows; the workflow state machine allows POST only once (SUBMITTED → POSTED).
     * Posting the allotment is itself a one-time transition (APPROVED → POSTED); a re-post
     * of an already-released allocation would fail {@code requireStatus}.</p>
     */
    private void post(ProductionConsumption c, String user) {
        releaseReservation(c, user);
        int index = 0;
        for (ProductionConsumptionLine line : c.getLines()) {
            BigDecimal qty = line.getConsumedQty() != null ? line.getConsumedQty() : BigDecimal.ZERO;
            if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;
            // Per-line idempotency key: StockService dedupes on (docNo, docType), so a
            // shared consumption number would silently drop every line after the first.
            // The line id is stable for a persisted line; the loop index is a safe
            // fallback for transient lines without an id yet.
            String lineKey = line.getId() != null
                    ? c.getConsumptionNo() + "-" + line.getId()
                    : c.getConsumptionNo() + "-L" + (++index);
            stockService.recordStockOut(
                    lineKey, "production-consumption", "PRODUCTION_CONSUMPTION",
                    line.getItemCode(),
                    line.getLocation() != null ? line.getLocation() : "MAIN",
                    line.getBatchNumber(), null,
                    qty, LocalDate.now(), user,
                    false);
        }
    }

    /**
     * Posts the APPROVED {@code stock-allotment} reservation attached to the
     * consumption's Material Request (if any). {@code Effect.NONE} means no physical
     * movement occurs — only the reservation is cleared so the subsequent physical OUT
     * is not blocked by, or double-counted against, its own reservation.
     */
    private void releaseReservation(ProductionConsumption c, String user) {
        String reqNo = c.getMaterialRequestNo();
        if (reqNo == null || reqNo.isBlank()) return;
        for (DocEntity allotment : documents.findAll("stock-allotment")) {
            if (allotment instanceof StockAllotment sa
                    && "APPROVED".equals(allotment.getStatus())
                    && reqNo.equals(sa.getReferenceNo())) {
                documents.action("stock-allotment", allotment.getId(), "post",
                        "Reservation released via " + c.getConsumptionNo(), user);
                return;
            }
        }
    }

    private static String nullSafe(Object o) {
        return o == null ? "(blank)" : String.valueOf(o);
    }
}