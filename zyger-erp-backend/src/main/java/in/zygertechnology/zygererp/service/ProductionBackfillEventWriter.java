package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.dto.resolution.InputResolutionResult;
import in.zygertechnology.zygererp.entity.ProdExecutionSession;
import in.zygertechnology.zygererp.entity.ProdOperationEvent;
import in.zygertechnology.zygererp.entity.ProdOutputEvent;
import in.zygertechnology.zygererp.entity.ProductionEntry;
import in.zygertechnology.zygererp.repo.ProdExecutionSessionRepository;
import in.zygertechnology.zygererp.repo.ProdOperationEventRepository;
import in.zygertechnology.zygererp.repo.ProdOutputEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * P3.3 — Natural-key additive projection writer for controlled backfill.
 *
 * <p>This is the ONLY component that derives {@code prod_execution_session} /
 * {@code prod_operation_event} / {@code prod_output_event} rows for a backfilled
 * {@code production_entry}. It is deliberately decoupled from the ONLINE projection flag
 * ({@code production.normalized-ops.enabled}) per DOCUMENT_34 §16: backfill is gated
 * separately by {@code production.backfill.enabled} in the orchestrator.
 *
 * <p>Invariants (DOCUMENT_34):
 * <ul>
 *   <li>Input quantity comes ONLY from the resolver's {@code EffectiveInputQuantity} —
 *       never raw {@code process_qty}, never a silent produced-fallback, never zero for an
 *       ambiguous record. Non-resolvable records are guarded by the caller.</li>
 *   <li>Zero inventory coupling — never imports or calls any inventory service and never
 *       reads or writes inventory (stock) ledger/balance tables.</li>
 *   <li>Deterministic natural keys (session: entry_number; op: session-id, subjob, op-code,
 *       seq; output: session-id, op-event-id, output-type, item-code, location). Duplicate
 *       emission is an idempotent no-op; a {@link DataIntegrityViolationException} from a
 *       concurrent duplicate is absorbed as a final backstop — it is never the PRIMARY
 *       idempotency mechanism (the caller checks existence first).</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class ProductionBackfillEventWriter {

    public static final String SESSION_COMPLETED = "COMPLETED";
    public static final String SESSION_OPEN = "OPEN";
    public static final String SESSION_CANCELLED = "CANCELLED";
    public static final String OP_COMPLETED = "COMPLETED";
    public static final String OP_IN_PROGRESS = "IN_PROGRESS";
    public static final String OP_REVERSED = "REVERSED";
    public static final String OUT_ACCEPTED = "ACCEPTED";
    public static final String OUT_REJECTED = "REJECTED";
    public static final String OUT_REWORK = "REWORK";
    public static final String OUT_SCRAP = "SCRAP";
    public static final String LOCATION_STORE = "STORE";

    private static final String[] FINALIZED = {"POSTED", "COMPLETED", "APPROVED", "SUBMITTED"};

    private final ProdExecutionSessionRepository sessionRepo;
    private final ProdOperationEventRepository operationRepo;
    private final ProdOutputEventRepository outputRepo;

    /**
     * Derive and persist the additive normalized projection for an ELIGIBLE record.
     * The caller has already resolved it and guaranteed resolvability; the resolver's
     * effective input is used verbatim for {@code available_input} / WIP.
     *
     * @return the created (or pre-existing) session, or {@code null} if not resolvable.
     */
    public ProdExecutionSession projectEntry(ProductionEntry entry, InputResolutionResult resolution) {
        if (entry == null || resolution == null || !resolution.isResolvable()) {
            // Never fabricate an input: caller must guard on resolvability.
            return sessionRepo.findByEntryNumber(entry == null ? "" : entry.getEntryNumber()).orElse(null);
        }
        boolean reversal = Boolean.TRUE.equals(entry.getIsReversal());
        String sessionStatus = reversal ? SESSION_CANCELLED : finalized(entry.getStatus()) ? SESSION_COMPLETED : SESSION_OPEN;
        String opStatus = reversal ? OP_REVERSED : finalized(entry.getStatus()) ? OP_COMPLETED : OP_IN_PROGRESS;

        ProdExecutionSession session = upsertSession(entry, resolution, sessionStatus);
        if (session == null) {
            return null;
        }
        upsertOperation(session, entry, opStatus);
        if (!SESSION_OPEN.equals(sessionStatus)) {
            // Finalized / CANCELLED records carry their output outcomes (mirror of projectPost/reverse).
            putOutput(session, entry, OUT_ACCEPTED, entry.getGoodQuantity(), firstRejectionReason(entry));
            putOutput(session, entry, OUT_REJECTED, entry.getRejectedQuantity(), firstRejectionReason(entry));
            putOutput(session, entry, OUT_REWORK, entry.getReworkQuantity(), firstReworkReason(entry));
            putOutput(session, entry, OUT_SCRAP, entry.getScrapQuantity(), null);
        }
        return session;
    }

    // --- session (UNIQUE natural key: entry_number) ---------------------------

    private ProdExecutionSession upsertSession(ProductionEntry entry, InputResolutionResult resolution, String status) {
        ProdExecutionSession existing = sessionRepo.findByEntryNumber(entry.getEntryNumber()).orElse(null);
        if (existing != null && existing.getId() != null) {
            applySnapshot(existing, entry, resolution, status);
            return sessionRepo.save(existing);
        }
        BigDecimal input = resolution.getEffectiveInputQuantity();
        BigDecimal accepted = orZero(entry.getGoodQuantity());
        BigDecimal rejected = orZero(entry.getRejectedQuantity());
        BigDecimal rework = orZero(entry.getReworkQuantity());
        BigDecimal scrap = orZero(entry.getScrapQuantity());
        ProdExecutionSession.ProdExecutionSessionBuilder b = ProdExecutionSession.builder()
                .entryNumber(entry.getEntryNumber())
                .jobCardNumber(entry.getJobCardNumber())
                .workOrderNumber(entry.getWorkOrderNumber())
                .subjobNumber(entry.getSubjobNumber())
                .partCode(entry.getPartCode())
                .partDescription(entry.getPartDescription())
                .sessionStatus(status)
                .availableInput(input)
                .acceptedOutput(accepted)
                .rejected(rejected)
                .rework(rework)
                .scrap(scrap)
                .wip(deriveWip(input, accepted, rejected, rework, scrap))
                .createdBy("backfill")
                .createdAt(Instant.now());
        if (entry.getStartTime() != null) {
            b.startedAt(entry.getStartTime());
        } else if (entry.getCreatedAt() != null) {
            b.startedAt(entry.getCreatedAt());
        }
        if (SESSION_COMPLETED.equals(status) || SESSION_CANCELLED.equals(status)) {
            b.completedAt(Instant.now());
        }
        ProdExecutionSession built = b.build();
        try {
            return sessionRepo.saveAndFlush(built);
        } catch (DataIntegrityViolationException e) {
            // Concurrent duplicate natural key — final backstop; re-find the winner.
            return sessionRepo.findByEntryNumber(entry.getEntryNumber()).orElse(null);
        }
    }

    private void applySnapshot(ProdExecutionSession s, ProductionEntry entry, InputResolutionResult resolution, String status) {
        s.setEntryNumber(entry.getEntryNumber());
        s.setJobCardNumber(entry.getJobCardNumber());
        s.setWorkOrderNumber(entry.getWorkOrderNumber());
        s.setSubjobNumber(entry.getSubjobNumber());
        s.setPartCode(entry.getPartCode());
        s.setPartDescription(entry.getPartDescription());
        s.setSessionStatus(status);
        s.setAvailableInput(orZero(resolution.getEffectiveInputQuantity()));
        s.setAcceptedOutput(orZero(entry.getGoodQuantity()));
        s.setRejected(orZero(entry.getRejectedQuantity()));
        s.setRework(orZero(entry.getReworkQuantity()));
        s.setScrap(orZero(entry.getScrapQuantity()));
        s.setWip(deriveWip(s.getAvailableInput(), s.getAcceptedOutput(), s.getRejected(), s.getRework(), s.getScrap()));
        if (s.getStartedAt() == null) {
            s.setStartedAt(entry.getStartTime() != null ? entry.getStartTime() : entry.getCreatedAt());
        }
        if (SESSION_COMPLETED.equals(status) || SESSION_CANCELLED.equals(status)) {
            s.setCompletedAt(Instant.now());
        }
    }

    // --- operation (UNIQUE natural key: session_id, subjob_number, operation_code, seq)

    private void upsertOperation(ProdExecutionSession session, ProductionEntry entry, String status) {
        String subjob = entry.getSubjobNumber();
        String opCode = entry.getOperationCode();
        Integer seq = entry.getOperationSequence() != null ? entry.getOperationSequence() : 0;
        ProdOperationEvent existing =
                operationRepo.findBySessionIdAndSubjobNumberAndOperationCodeAndSeq(session.getId(), subjob, opCode, seq)
                        .orElse(null);
        if (existing != null) {
            existing.setOperationStatus(status);
            existing.setEndTime(Instant.now());
            operationRepo.save(existing);
            return;
        }
        ProdOperationEvent op = ProdOperationEvent.builder()
                .session(session)
                .subjobNumber(subjob)
                .operationCode(opCode)
                .seq(seq)
                .machineCode(entry.getMachineCode())
                .operatorCode(entry.getOperatorCode())
                .operationStatus(status)
                .startTime(entry.getStartTime() != null ? entry.getStartTime() : entry.getCreatedAt())
                .endTime(Instant.now())
                .createdAt(Instant.now())
                .build();
        try {
            operationRepo.saveAndFlush(op);
        } catch (DataIntegrityViolationException e) {
            // concurrent duplicate natural key — idempotent
        }
    }

    // --- output (UNIQUE natural key: session_id, operation_event_id, output_type, item_code, location)

    private void putOutput(ProdExecutionSession session, ProductionEntry entry, String outputType,
                           BigDecimal quantity, String reasonCode) {
        if (session.getId() == null || quantity == null || quantity.signum() == 0) {
            return; // zero-quantity outputs are not projected
        }
        String itemCode = entry.getPartCode();
        ProdOperationEvent op = latestOperation(session, entry);
        if (op == null || op.getId() == null) {
            return;
        }
        ProdOutputEvent existing =
                outputRepo.findBySessionIdAndOperationEventIdAndOutputTypeAndItemCodeAndLocation(
                        session.getId(), op.getId(), outputType, itemCode, LOCATION_STORE).orElse(null);
        if (existing != null) {
            return;
        }
        ProdOutputEvent out = ProdOutputEvent.builder()
                .session(session)
                .operationEvent(op)
                .outputType(outputType)
                .itemCode(itemCode)
                .location(LOCATION_STORE)
                .quantity(quantity)
                .reasonCode(reasonCode)
                .createdAt(Instant.now())
                .build();
        try {
            outputRepo.saveAndFlush(out);
        } catch (DataIntegrityViolationException e) {
            // concurrent duplicate natural key — idempotent
        }
    }

    private ProdOperationEvent latestOperation(ProdExecutionSession session, ProductionEntry entry) {
        String subjob = entry.getSubjobNumber();
        String opCode = entry.getOperationCode();
        Integer seq = entry.getOperationSequence() != null ? entry.getOperationSequence() : 0;
        return operationRepo.findBySessionIdAndSubjobNumberAndOperationCodeAndSeq(session.getId(), subjob, opCode, seq)
                .orElseGet(() -> operationRepo.findBySessionId(session.getId()).stream()
                        .findFirst().orElse(null));
    }

    // --- helpers --------------------------------------------------------------

    private boolean finalized(String status) {
        if (status == null) {
            return false;
        }
        for (String f : FINALIZED) {
            if (f.equalsIgnoreCase(status)) {
                return true;
            }
        }
        return false;
    }

    private BigDecimal deriveWip(BigDecimal input, BigDecimal accepted, BigDecimal rejected, BigDecimal rework, BigDecimal scrap) {
        BigDecimal totalOutput = orZero(accepted).add(orZero(rejected)).add(orZero(rework)).add(orZero(scrap));
        BigDecimal wip = orZero(input).subtract(totalOutput);
        return wip.signum() < 0 ? BigDecimal.ZERO : wip;
    }

    private BigDecimal orZero(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private String firstRejectionReason(ProductionEntry entry) {
        if (entry.getRejectionReasons() != null && !entry.getRejectionReasons().isEmpty()) {
            in.zygertechnology.zygererp.entity.ProductionEntryRejection r = entry.getRejectionReasons().get(0);
            return r.getReasonCode() != null ? r.getReasonCode() : r.getReasonDescription();
        }
        return null;
    }

    private String firstReworkReason(ProductionEntry entry) {
        if (entry.getReworkReasons() != null && !entry.getReworkReasons().isEmpty()) {
            in.zygertechnology.zygererp.entity.ProductionEntryRework r = entry.getReworkReasons().get(0);
            return r.getReasonCode() != null ? r.getReasonCode() : r.getReasonDescription();
        }
        return null;
    }
}