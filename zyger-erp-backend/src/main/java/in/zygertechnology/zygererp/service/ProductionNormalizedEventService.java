package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.config.ProductionNormalizedOpsProperties;
import in.zygertechnology.zygererp.dto.resolution.InputResolutionResult;
import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.ProdExecutionSessionRepository;
import in.zygertechnology.zygererp.repo.ProdOperationEventRepository;
import in.zygertechnology.zygererp.repo.ProdOutputEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * P3 — Derived normalized-operation projection service.
 *
 * <p>This component derives {@code prod_execution_session} /
 * {@code prod_operation_event} / {@code prod_output_event} rows from the
 * AUTHORITATIVE {@code ProductionEntry} in-memory state, and persists them in
 * the SAME transaction as the legacy write (P3-02). It is gated by the
 * {@code production.normalized-ops.enabled} flag (P3-07).
 *
 * <p>Architectural invariants (P3-01/03/05):
 * <ul>
 *   <li>DERIVED PROJECTION ONLY — never an independent transaction authority.</li>
 *   <li>NEVER depends on {@code StockService}/stock_balance — zero inventory
 *       postings are ever produced by event creation.</li>
 *   <li>Deterministic natural keys + DB UNIQUE constraints make replay idempotent;
 *       a {@link DataIntegrityViolationException} from a duplicate natural key is
 *       absorbed so the authoritative write is never rolled back by a concurrent
 *       duplicate emission (real projection errors still propagate and roll back,
 *       preserving P3-02 atomicity).</li>
 *   <li>Quantity semantics follow the live codebase (P3-04): input authority is
 *       {@code process_qty} (a.k.a. {@code produced_quantity}), outputs are
 *       good/rejected/rework/scrap, WIP = max(input - outputs, 0).</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class ProductionNormalizedEventService {

    public static final String SESSION_OPEN = "OPEN";
    public static final String SESSION_COMPLETED = "COMPLETED";
    public static final String SESSION_CANCELLED = "CANCELLED";

    public static final String OP_IN_PROGRESS = "IN_PROGRESS";
    public static final String OP_COMPLETED = "COMPLETED";
    public static final String OP_REVERSED = "REVERSED";

    public static final String OUT_ACCEPTED = "ACCEPTED";
    public static final String OUT_REJECTED = "REJECTED";
    public static final String OUT_REWORK = "REWORK";
    public static final String OUT_SCRAP = "SCRAP";

    public static final String LOCATION_STORE = "STORE";

    private final ProductionNormalizedOpsProperties properties;
    private final ProdExecutionSessionRepository sessionRepo;
    private final ProdOperationEventRepository operationRepo;
    private final ProdOutputEventRepository outputRepo;
    private final ProductionInputAuthorityResolver inputAuthorityResolver;

    /** Lifecycle action that triggered the projection. */
    public enum EventKind { CREATE, POST, REVERSE }

    /**
     * Derive and persist the normalized projection for the given authoritative
     * entry. No-op unless the feature flag is ON. Safe to call on every validated
     * write; deterministic natural keys guard against duplicate emission.
     *
     * <p>P3 correction (RC-1): effective input is sourced from the single
     * {@link ProductionInputAuthorityResolver}. Entries whose authority cannot be
     * resolved (ambiguous / quarantined / blocked) are NOT projected — the projection
     * never fabricates {@code available_input} from zero or from produced_quantity.
     */
    public void project(ProductionEntry entry, EventKind kind, String actor) {
        if (!properties.isEnabled() || entry == null) {
            return;
        }
        InputResolutionResult resolution = inputAuthorityResolver.resolve(entry);
        if (!resolution.isResolvable()) {
            // Ambiguous / quarantined / blocked record — do not silently project an input.
            return;
        }
        if (kind == EventKind.CREATE) {
            projectCreate(entry, actor);
        } else if (kind == EventKind.POST) {
            projectPost(entry, actor);
        } else if (kind == EventKind.REVERSE) {
            projectReverse(entry, actor);
        }
    }

    /** Read-only projection lookup by authoritative entry_number (flag-gated). */
    public Optional<ProdExecutionSession> findSessionByEntryNumber(String entryNumber) {
        if (!properties.isEnabled() || entryNumber == null) {
            return Optional.empty();
        }
        return sessionRepo.findByEntryNumber(entryNumber);
    }

    /** Read-only projection lookup for all derived sessions of a job card (flag-gated). */
    public List<ProdExecutionSession> findSessionsByJobCard(String jobCardNumber) {
        if (!properties.isEnabled() || jobCardNumber == null) {
            return List.of();
        }
        return sessionRepo.findByJobCardNumber(jobCardNumber);
    }

    private void projectCreate(ProductionEntry entry, String actor) {
        ProdExecutionSession session = upsertSession(entry, SESSION_OPEN, actor);
        ProdOperationEvent op = upsertOperation(session, entry, OP_IN_PROGRESS);
        // Outputs are finalized authoritatively at POST; a DRAFT carries no
        // premature output projection.
    }

    private void projectPost(ProductionEntry entry, String actor) {
        ProdExecutionSession session = upsertSession(entry, SESSION_COMPLETED, actor);
        ProdOperationEvent op = upsertOperation(session, entry, OP_COMPLETED);
        putOutput(session, op, entry, OUT_ACCEPTED, entry.getGoodQuantity(), null, true);
        putOutput(session, op, entry, OUT_REJECTED, entry.getRejectedQuantity(), firstRejectionReason(entry), true);
        putOutput(session, op, entry, OUT_REWORK, entry.getReworkQuantity(), firstReworkReason(entry), true);
        putOutput(session, op, entry, OUT_SCRAP, entry.getScrapQuantity(), null, true);
    }

    private void projectReverse(ProductionEntry reversal, String actor) {
        // The reversal entry is a negated POSTED mirror. Create a compensating
        // projection keyed to the reversal's own entry_number; the original
        // historical projection is preserved untouched (P3-06).
        ProdExecutionSession session = upsertSession(reversal, SESSION_CANCELLED, actor);
        ProdOperationEvent op = upsertOperation(session, reversal, OP_REVERSED);
        putOutput(session, op, reversal, OUT_ACCEPTED, reversal.getGoodQuantity(), null, true);
        putOutput(session, op, reversal, OUT_REJECTED, reversal.getRejectedQuantity(), firstRejectionReason(reversal), true);
        putOutput(session, op, reversal, OUT_REWORK, reversal.getReworkQuantity(), firstReworkReason(reversal), true);
        putOutput(session, op, reversal, OUT_SCRAP, reversal.getScrapQuantity(), null, true);
    }

    // --- session (UNIQUE natural key: entry_number) ----------------------------

    private ProdExecutionSession upsertSession(ProductionEntry entry, String status, String actor) {
        Optional<ProdExecutionSession> existing = sessionRepo.findByEntryNumber(entry.getEntryNumber());
        if (existing.isPresent()) {
            ProdExecutionSession s = existing.get();
            applySessionSnapshot(s, entry, status);
            sessionRepo.save(s);
            return s;
        }
        ProdExecutionSession s = buildSession(entry, status, actor);
        try {
            return sessionRepo.saveAndFlush(s);
        } catch (DataIntegrityViolationException e) {
            return reFindSession(entry.getEntryNumber());
        }
    }

    private void applySessionSnapshot(ProdExecutionSession s, ProductionEntry entry, String status) {
        s.setEntryNumber(entry.getEntryNumber());
        s.setJobCardNumber(entry.getJobCardNumber());
        s.setWorkOrderNumber(entry.getWorkOrderNumber());
        s.setSubjobNumber(entry.getSubjobNumber());
        s.setPartCode(entry.getPartCode());
        s.setPartDescription(entry.getPartDescription());
        s.setSessionStatus(status);
        s.setAvailableInput(resolvedInput(entry));
        s.setAcceptedOutput(orZero(entry.getGoodQuantity()));
        s.setRejected(orZero(entry.getRejectedQuantity()));
        s.setRework(orZero(entry.getReworkQuantity()));
        s.setScrap(orZero(entry.getScrapQuantity()));
        s.setWip(deriveWip(s.getAvailableInput(),
                s.getAcceptedOutput(), s.getRejected(), s.getRework(), s.getScrap()));
        if (s.getStartedAt() == null) {
            s.setStartedAt(entry.getStartTime() != null ? entry.getStartTime() : entry.getCreatedAt());
        }
        if (SESSION_COMPLETED.equals(status) || SESSION_CANCELLED.equals(status)) {
            s.setCompletedAt(Instant.now());
        }
    }

    private ProdExecutionSession buildSession(ProductionEntry entry, String status, String actor) {
        BigDecimal input = resolvedInput(entry);
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
                .createdBy(actor)
                .createdAt(Instant.now());
        b.startedAt(entry.getStartTime() != null ? entry.getStartTime() : entry.getCreatedAt());
        if (SESSION_COMPLETED.equals(status) || SESSION_CANCELLED.equals(status)) {
            b.completedAt(Instant.now());
        }
        return b.build();
    }

    private ProdExecutionSession reFindSession(String entryNumber) {
        return sessionRepo.findByEntryNumber(entryNumber).orElse(null);
    }

    // --- operation (UNIQUE natural key: session_id, subjob_number, operation_code, seq) --

    private ProdOperationEvent upsertOperation(ProdExecutionSession session, ProductionEntry entry, String status) {
        if (session == null) {
            return null;
        }
        String subjob = entry.getSubjobNumber();
        String opCode = entry.getOperationCode();
        Integer seq = entry.getOperationSequence() != null ? entry.getOperationSequence() : 0;
        Optional<ProdOperationEvent> existing =
                operationRepo.findBySessionIdAndSubjobNumberAndOperationCodeAndSeq(session.getId(), subjob, opCode, seq);
        if (existing.isPresent()) {
            ProdOperationEvent op = existing.get();
            op.setOperationStatus(status);
            op.setEndTime(Instant.now());
            operationRepo.save(op);
            return op;
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
            return operationRepo.saveAndFlush(op);
        } catch (DataIntegrityViolationException e) {
            return operationRepo
                    .findBySessionIdAndSubjobNumberAndOperationCodeAndSeq(session.getId(), subjob, opCode, seq)
                    .orElse(null);
        }
    }

    // --- output (UNIQUE natural key: session_id, operation_event_id, output_type, item_code, location)

    private void putOutput(ProdExecutionSession session, ProdOperationEvent op, ProductionEntry entry,
                           String outputType, BigDecimal quantity, String reasonCode, boolean idempotent) {
        if (session == null || op == null || quantity == null || quantity.signum() == 0) {
            return; // zero-quantity outputs are not projected
        }
        String itemCode = entry.getPartCode();
        Optional<ProdOutputEvent> existing =
                outputRepo.findBySessionIdAndOperationEventIdAndOutputTypeAndItemCodeAndLocation(
                        session.getId(), op.getId(), outputType, itemCode, LOCATION_STORE);
        if (existing.isPresent()) {
            return; // already projected for this natural key
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
            // duplicate natural key from a concurrent emission — idempotent skip
        }
    }

    // --- helpers ---------------------------------------------------------------

    private static BigDecimal deriveWip(BigDecimal input, BigDecimal accepted, BigDecimal rejected, BigDecimal rework, BigDecimal scrap) {
        BigDecimal totalOutput = orZero(accepted).add(orZero(rejected)).add(orZero(rework)).add(orZero(scrap));
        BigDecimal wip = orZero(input).subtract(totalOutput);
        return wip.signum() < 0 ? BigDecimal.ZERO : wip;
    }

    /**
     * P3 correction (RC-1): effective input sourced ONLY from the resolver.
     * Never raw {@code process_qty}, never a silent produced-fallback. Entries that
     * are not resolvable are guarded at {@link #project(ProductionEntry, EventKind, String)}
     * so this is only reached for resolvable input.
     */
    private BigDecimal resolvedInput(ProductionEntry entry) {
        InputResolutionResult resolution = inputAuthorityResolver.resolve(entry);
        return resolution.isResolvable() ? resolution.getEffectiveInputQuantity() : BigDecimal.ZERO;
    }

    private static BigDecimal orZero(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private String firstRejectionReason(ProductionEntry entry) {
        if (entry.getRejectionReasons() != null && !entry.getRejectionReasons().isEmpty()) {
            ProductionEntryRejection r = entry.getRejectionReasons().get(0);
            return r.getReasonCode() != null ? r.getReasonCode() : r.getReasonDescription();
        }
        return null;
    }

    private String firstReworkReason(ProductionEntry entry) {
        if (entry.getReworkReasons() != null && !entry.getReworkReasons().isEmpty()) {
            ProductionEntryRework r = entry.getReworkReasons().get(0);
            return r.getReasonCode() != null ? r.getReasonCode() : r.getReasonDescription();
        }
        return null;
    }
}