package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ProductionMaterialRequestService {

    private final ProdReqMaterialRepository requests;
    private final ProdReqMaterialLineRepository requestLines;
    private final JobCardRepository jobCards;
    private final DocNumberService numbers;
    private final WorkflowStateMachine stateMachine;
    private final DocumentFacade documents;

    @PersistenceContext
    private EntityManager em;

    /**
     * Creates or updates a Material Request draft. Only DRAFT requests can be edited.
     * The document number is assigned authoritatively on first save (BR-NUM-001);
     * later edits preserve the same number. Material lines are replaced wholesale.
     */
    @Transactional
    public ProdReqMaterial save(ProdReqMaterial draft, String user) {
        if (user == null || user.isBlank()) user = "system";
        if (draft.getLines() == null || draft.getLines().isEmpty()) {
            throw new IllegalArgumentException("Material Request requires at least one line");
        }
        if (draft.getId() == null) {
            validateNew(draft);
            buildNumber(draft, user);
        } else {
            ProdReqMaterial existing = requests.findById(draft.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Material Request not found"));
            if (!"DRAFT".equals(existing.getStatus())) {
                throw new IllegalStateException("Only DRAFT material requests can be edited (current: " + existing.getStatus() + ")");
            }
            draft.setReqNo(existing.getReqNo());
            draft.setCreatedBy(existing.getCreatedBy());
            draft.setCreatedAt(existing.getCreatedAt());
        }
        if (draft.getReqDate() == null) draft.setReqDate(LocalDate.now());
        draft.setUpdatedBy(user);
        draft.setUpdatedAt(Instant.now());
        if (draft.getStatus() == null) draft.setStatus("DRAFT");

        for (ProdReqMaterialLine line : draft.getLines()) {
            line.setRequest(draft);
            if (line.getIssuedQty() == null) line.setIssuedQty(BigDecimal.ZERO);
            if (line.getRequiredQty() == null) line.setRequiredQty(BigDecimal.ZERO);
            if (line.getRequiredQty().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Required quantity must be > 0 for item " + nullSafe(line.getItemCode()));
            }
        }
        return requests.save(draft);
    }

    private void validateNew(ProdReqMaterial draft) {
        if (draft.getJobCardId() == null) {
            throw new IllegalArgumentException("Material Request requires a Job Card (production reference)");
        }
        JobCard jc = jobCards.findById(draft.getJobCardId())
                .orElseThrow(() -> new IllegalArgumentException("Job Card not found: " + draft.getJobCardId()));
        if (!"RELEASED".equals(jc.getStatus()) && !"IN_PROGRESS".equals(jc.getStatus())) {
            throw new IllegalStateException("Material Request requires a released/in-progress Job Card (current: " + nullSafe(jc.getStatus()) + ")");
        }
        draft.setJobCardNumber(jc.getJobCardNumber());
        draft.setWorkOrderNumber(jc.getWorkOrderNumber());
        if (draft.getReqDate() == null) draft.setReqDate(LocalDate.now());
    }

    private void buildNumber(ProdReqMaterial draft, String user) {
        String reqNo = numbers.next("material-request");
        draft.setReqNo(reqNo);
        draft.setCreatedBy(user);
        draft.setCreatedAt(Instant.now());
    }

    @Transactional
    public String nextNumber() {
        return numbers.peek("material-request");
    }

    @Transactional(readOnly = true)
    public List<ProdReqMaterial> list() {
        return requests.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    @Transactional(readOnly = true)
    public ProdReqMaterial get(Long id) {
        return requests.findById(id).orElseThrow(() -> new IllegalArgumentException("Material Request not found"));
    }

    @Transactional
    public void delete(Long id) {
        ProdReqMaterial r = requests.findById(id).orElseThrow(() -> new IllegalArgumentException("Material Request not found"));
        if (!"DRAFT".equals(r.getStatus())) {
            throw new IllegalStateException("Only DRAFT material requests can be deleted");
        }
        requests.delete(r);
    }

    /**
     * Lifecycle action. APPROVED → ISSUE creates an APPROVED {@code stock-allotment}
     * reservation (Effect.NONE) via the Inventory-owned DocumentFacade — no physical
     * stock deduction (ADR-001 P6.2, Model B-a). The single authoritative OUT happens
     * at Production Consumption POST.
     *
     * <p>P6.4 (D2): CANCEL and CLOSE release any remaining APPROVED reservation so
     * that cancel/close of an issued request does not leak a perpetual reservation.
     * The release posts the {@code stock-allotment} ({@code Effect.NONE} — no physical
     * OUT, no Stock IN reversal), reusing the exact mechanism of Production Consumption
     * POST. It runs in the same transaction as the status transition, so a release
     * failure rolls back the whole lifecycle change. If the reservation was already
     * released (consumed), no APPROVED allotment remains and release is a no-op.</p>
     */
    @Transactional
    public ProdReqMaterial action(Long id, String action, String user) {
        ProdReqMaterial r = requests.findById(id).orElseThrow(() -> new IllegalArgumentException("Material Request not found"));
        if (user == null || user.isBlank()) user = "system";
        stateMachine.validateTransition("material-request", r.getStatus(), action);
        String a = action.toUpperCase();
        switch (a) {
            case "SUBMIT" -> r.setStatus("SUBMITTED");
            case "REJECT" -> r.setStatus("REJECTED");
            case "REOPEN" -> r.setStatus("DRAFT");
            case "APPROVE" -> {
                r.setStatus("APPROVED");
                r.setUpdatedBy(user);
                r.setUpdatedAt(Instant.now());
                requests.save(r);
            }
            case "ISSUE" -> {
                if (!"APPROVED".equals(r.getStatus())) {
                    throw new IllegalStateException("Only APPROVED material requests can be issued");
                }
                issue(r, user);
                r.setStatus("ISSUED");
                r.setIssuedAt(Instant.now());
            }
            case "CLOSE" -> {
                releaseReservationIfAny(r.getReqNo(), user);
                r.setStatus("CLOSED");
                r.setClosedAt(Instant.now());
            }
            case "CANCEL" -> {
                releaseReservationIfAny(r.getReqNo(), user);
                r.setStatus("CANCELLED");
            }
            default -> throw new IllegalArgumentException("Unknown action: " + action);
        }
        r.setUpdatedBy(user);
        r.setUpdatedAt(Instant.now());
        return requests.save(r);
    }

    /**
     * Issue = RESERVATION / ALLOTMENT ONLY (Model B-a, ADR-001 P6.2).
     *
     * <p>Material Request ISSUE delegates to the authoritative Inventory reservation
     * mechanism ({@code stock-allotment} via {@link DocumentFacade}). An APPROVED
     * allotment increases the reserved quantity and reduces available stock, but
     * performs <b>NO physical stock deduction</b>: no {@code StockLedger} OUT and no
     * {@code StockBalance} FREE decrement. The single authoritative physical deduction
     * happens later at Production Consumption {@code POST}.</p>
     *
     * <p>Idempotency: the workflow state machine allows ISSUE only once per request
     * (APPROVED → ISSUED); re-ISSUE is rejected. A belt-and-suspenders guard skips
     * creating a second reservation when an APPROVED allotment already references this
     * request, so duplicate/concurrent ISSUE can never duplicate the reservation.</p>
     */
    private void issue(ProdReqMaterial r, String user) {
        if (reservationExists(r.getReqNo())) {
            // Already reserved for this request — idempotent no-op.
            return;
        }
        boolean hasIssuableQty = r.getLines().stream()
                .anyMatch(line -> line.getIssuedQty() != null && line.getIssuedQty().signum() > 0);
        if (!hasIssuableQty) {
            throw new IllegalArgumentException("Issued quantity must be greater than zero for at least one line");
        }
        List<Map<String, Object>> lines = new ArrayList<>();
        for (ProdReqMaterialLine line : r.getLines()) {
            BigDecimal qty = line.getIssuedQty() != null ? line.getIssuedQty() : BigDecimal.ZERO;
            if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;
            if (qty.compareTo(line.getRequiredQty()) > 0) {
                throw new IllegalArgumentException("Issued quantity exceeds required quantity for item " + nullSafe(line.getItemCode()));
            }
            Map<String, Object> l = new HashMap<>();
            l.put("itemCode", line.getItemCode());
            l.put("allottedQty", qty);
            l.put("location", line.getStoreCode() != null ? line.getStoreCode() : "MAIN");
            l.put("batchNo", line.getBatchNumber());
            l.put("lotNo", line.getLot());
            l.put("heatNo", null);
            if (line.getRack() != null) l.put("remarks", line.getRack());
            lines.add(l);
        }
        Map<String, Object> body = new HashMap<>();
        body.put("date", LocalDate.now());
        body.put("allotmentType", "MATERIAL_REQUEST");
        body.put("referenceNo", r.getReqNo());
        body.put("remarks", "Reserved via Material Request " + r.getReqNo());
        body.put("lines", lines);

        DocEntity allotment = documents.create("stock-allotment", body, user);
        documents.action("stock-allotment", allotment.getId(), "approve", "Material Request " + r.getReqNo(), user);
    }

    /**
     * P6.4 (D2): posts the APPROVED {@code stock-allotment} reservation referencing
     * this request's {@code referenceNo}, if any remains. Posting is {@code Effect.NONE}:
     * it clears the reservation in {@link StockService#reservations()} (which counts
     * only APPROVED allotments) without any physical movement — no {@code StockLedger}
     * OUT and no {@code StockBalance} change. Reuses the exact mechanism of
     * Production Consumption POST. Runs inside the caller's transaction, so any
     * duplication that violates {@code stock-allotment} {@code requireStatus(APPROVED)}
     * rolls the whole lifecycle transition back.
     *
     * <p>Idempotent by construction: only APPROVED allotments are matched, and posting
     * is a one-time APPROVED → POSTED transition. If the reservation was already
     * released by consumption (or a prior cancel/close), nothing here matches and the
     * call is a no-op.</p>
     */
    private void releaseReservationIfAny(String reqNo, String user) {
        for (DocEntity allotment : documents.findAll("stock-allotment")) {
            if (allotment instanceof StockAllotment sa
                    && "APPROVED".equals(allotment.getStatus())
                    && reqNo.equals(sa.getReferenceNo())) {
                documents.action("stock-allotment", allotment.getId(), "post",
                        "Reservation released via Material Request " + reqNo + " lifecycle", user);
                return;
            }
        }
    }

    /** True if an APPROVED reservation allotment already references this request. */
    private boolean reservationExists(String reqNo) {
        // Fail-closed guard: a database failure must NEVER be interpreted as
        // "no reservation exists". Returning false on error would let ISSUE create a
        // duplicate reservation. The surrounding @Transactional action rolls the
        // transaction back on any error, so no reservation is created and the
        // Material Request status does not advance when this fails.
        Long count = em.createQuery(
                        "select count(a) from StockAllotment a where a.referenceNo = :reqNo and a.status = 'APPROVED' and a.deleted = false",
                        Long.class)
                .setParameter("reqNo", reqNo)
                .getSingleResult();
        return count != null && count > 0;
    }

    private static String nullSafe(Object o) {
        return o == null ? "(blank)" : String.valueOf(o);
    }
}