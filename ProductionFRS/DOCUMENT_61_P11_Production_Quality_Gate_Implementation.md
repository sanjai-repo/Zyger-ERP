# DOCUMENT_61 — P11 PRODUCTION QUALITY GATE — IMPLEMENTATION CONTRACT

| Field | Value |
|---|---|
| Document ID | DOCUMENT_61 |
| Title | P11 — Production Quality Gate — Controlled Implementation Contract & Record |
| Capability | P11 — Production Quality Gate (CLAR-PROD-012) |
| Status | **IMPLEMENTED_AND_VERIFIED** (final §32 update) |
| Baseline HEAD | `0781e1a30ca881614a7b573904caf6481adcbdc9` |
| Approval Source | DOCUMENT_57 §4 #13 (CLAR-PROD-012 Option **A**) · DOCUMENT_56 §7.7 · DOCUMENT_51 §4.5 |
| Implementation Authorization | P11 Controlled Implementation Authorization (this phase) |
| Migration | `V10__production_quality_gate.sql` (additive) |

---

## 1. Approved CLAR-PROD-012 Rules (extracted verbatim, non-extended)

Approval record DOCUMENT_57 §4 #13:

> **CLAR-PROD-012 (A).** Gate enforced by default at operation/subjob completion and entry post
> (block next-op/completion/FG while inspection PENDING/FAIL/HELD); override = Quality Supervisor
> **and** Production Supervisor jointly or Plant Head; one-time; operation scope; mandatory reason;
> audited; PPAP-blocked items non-overridable. Production = record output + any override request;
> Quality = inspection status/disposition; Inventory = restricted dispositions per CLAR-003/D-C1.

Approval-context elaboration (DOCUMENT_51 §4.5, approved with the option):

- Gate evaluated at **subjob completion** and **Production Entry post**.
- Override: authorized job = **Quality Supervisor AND Production Supervisor (joint) OR Plant Head**;
  **mandatory reason**; **one-time** (not reusable); per affected unit; **quantity scope** = the
  operation's quantity under override; **operation scope**; **batch scope** = the specific batch
  (CLAR-PROD-011 batch/lot dimensions exist — P10 batch cards); **never whole-order override**;
  PPAP-mandatory blocks **non-overridable** (Quality-authoritative).
- Quality approval required where disposition is REJECTED/HOLD; Production approval alone insufficient.
- Ownership: **Production owns the gate evaluation point and override UI**; **Quality owns inspection
  status/NCR/PPAP authority**; Inventory owns restricted dispositions per CLAR-003/D-C1.

**NO rules were added beyond these.** No new inspection criteria, no new acceptance criteria, no new
authority, no new states beyond the four gate statuses, no new numbers, no new quantities.

## 2. Current Quality Architecture (before P11)

- Full existing Quality module: `QualityInspection` (inspection lifecycle `DRAFT/IN_PROGRESS/SUBMITTED/
  HOLD/PASS/FAIL/APPROVED/CLOSED/CANCELLED` + `decisionStatus`), inspection lines/characteristics,
  AQL sampling, NCR/CAPA/8D/Concession/Complaint/SCAR secondary docs, test certificates, calibration,
  `QualitySupportService`, `QualityController` (`/api/v1/quality`), `QualityDocsController`.
- Existing coarse gate helper: `GET /api/v1/quality/production-gate/check` (itemCode+machineCode;
  counts `DRAFT/PENDING/ASSIGNED/HOLD` — NOT operation/subjob specific) — left untouched.
- Existing FINAL-FG gate pattern: `DocumentFacade.enforceFinalInspectionGate` /
  `hasPassingFinalInspection` (dispatch-time) — preserved, not modified.
- Existing weak wiring: `ProductionJobCardService.jobCardAction complete` auto-creates an IPQC
  inspection (`sourceType="PRODUCTION"`, `sourceNumber=jobCardNumber`, status `DRAFT`) via raw
  `em.persist` — preserved, not modified.

## 3. Existing Production lifecycle (before P11)

- `ProductionController.productionEntryAction` — `post` case: validates → marks matching subjob
  `COMPLETED` when `completedQuantity ≥ plannedQuantity` → entry status `POSTED` → normalized-event
  projection → audit. **Gate point A inserted here.**
- `ProductionJobCardService.subjobAction` — `case "complete"`: sets subjob `COMPLETED`. **Gate point B
  inserted here.**
- `getEligibleOperations` computes per-subjob `eligible` by prior-subjob sequence. **Advisory
  `qualityBlocked` field added (gate does not change `eligible`).**
- Job card completion remains non-gated: the FRS §8 auto-IPQC is created **at** completion, so a gate
  at that instant would gate the very inspection that governs post-completion FG — that contradiction
  is resolved by leaving completion as Production's record-output point (IPQC DRAFT then rules FG via
  the FINAL dispatch gate). Documented interpretation (DOC_57: "Production = record output").

## 4. Quality Gate Entry Point (implemented)

Two enforcement points (the two the contract names):

1. **Production Entry post** — `ProductionController.productionEntryAction(..., "post")`:
   after `entryValidator.validate` / `validateSequenceAndPending`, calls
   `productionQualityGateService.assertEntryPostGate(pe, user)`.
2. **Operation/Subjob completion** — `ProductionJobCardService.subjobAction(..., "complete")`:
   calls `assertSubjobGate(sj, user)` before the `COMPLETED` transition.

The gate is **evaluated**: for the job card referenced by the operation, find PRODUCTION-sourced
`QualityInspection` records tied to that job card (`sourceNumber = jobCardNumber`) and (when the
operation is known) the matching operation (`operation = operationCode` or operation unspecified).
If **any** such inspection is in a **blocking** gate status and no **unexpended APPROVED override**
covers it, the gate point is refused → HTTP 400 (RFC-7807, message lists the blocking inspection
numbers and statuses).

Gate blocks **next-op / completion / FG** implicitly: entry post of the op is refused until its
inspection clears, and prior-subjob sequence rules already require prior ops posted before advancing.
FG receipt is additionally governed by the existing FINAL dispatch gate (unchanged).

## 5. Quality Gate Decision Model (status mapping, reuse — no second engine)

Gate status of an operation is derived from the **existing** `QualityInspection` records (Quality owns
status; Production does not compute inspection verdicts). Existing `inspectionStatus` → gate status:

| Existing `inspectionStatus` | Gate status | Gate effect |
|---|---|---|
| `DRAFT`, `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED` (decision NOT decided) | **PENDING** | BLOCK |
| `FAIL` | **FAIL** | BLOCK |
| `HOLD` | **HELD** | BLOCK |
| `PASS`, `APPROVED` (finalDecision PASS) | **PASS** | CLEAR |
| `CLOSED` (decisionStatus PASS) | PASS | CLEAR |
| `CANCELLED`, `REJECTED`(source) | — | CLEAR (no longer applicable) |

A blocking inspection is cleared ONLY by: inspection advancing to PASS/APPROVED/CLOSED-pass, OR a
one-time operation-scoped override (below). No auto-clears.

## 6. Approved States

- Gate states: **PENDING / PASS / FAIL / HELD** (blocking: PENDING, FAIL, HELD).
- Override record states: **PENDING → APPROVED → APPLIED** (record-keeping for the signed one-time
  authorization; APPLIED = consumed; not part of the gate state machine).

## 7. Approval Authority (gate decisions)

- Gate verdicts are **Quality-owned** (inspection status/disposition) — Production never mutates
  inspection status.
- Override creation/request: **Production** (records the override request). Service-enforced:
  requester must act on the gate's own record — the only Production-authorized action is raising the
  override request (per "Production = record output + any override request").

## 8. Override Authority (server-enforced)

- **Joint override:** requires TWO signatures — a **Quality Supervisor** AND a **Production
  Supervisor**, distinct users.
- **Plant Head override:** requires ONE signature by **Plant Head** (substitutes the joint pair).
- Role mapping (documented): Quality Supervisor → `QUALITY_MANAGER`; Production Supervisor →
  `PRODUCTION_SUPERVISOR`; Plant Head → `PLANT_HEAD`. Enforced via `CurrentUserRoles.hasAnyRole(...)`
  — role check happens **server-side** at sign time; frontend buttons are cosmetic only.
- Never whole-order: override targets exactly one inspection (one operation) — enforced by reference.
- **PPAP-blocked items are non-overridable**: `isPpapBlocked(itemCode)` is checked before any
  override-sign finalization; if blocked, sign is refused. (Data note: no PPAP-mandatory attribute
  exists in the current schema — see Known Limitations; the enforcement point is real and reacts the
  moment a PPAP block marker is modeled.)

## 9. Override Reason Requirements

- Mandatory: `reason` non-blank at request time (400 otherwise). Recorded verbatim in audit.
- Reason is required for every override path (joint or plant-head) and cannot be edited after APPROVED.

## 10. Quantity Behavior

- Quantity ownership preserved: WIP / pending / good / rejected / rework / scrap / additional-output
  formulas (CLAR-PROD-002) are **not modified**. No new quantity types.
- Override carries `quantity` = the operation's quantity under override (snapshot, informational;
  validates > 0). It does **not** alter entry/subjob quantities.

## 11. Batch Identity Behavior

- P10 batch cards, physical batch number, lot/heat, allocation, and reversal are **untouched**.
- Override records `batchNumber` (optional, when a batch is in scope — CLAR-PROD-011 dimensions).
- No second batch identity is created; no `BC-…` numbering change.

## 12. Production Entry Integration

- `post` action refuses when the entry's operation gate is blocked (blocking inspection exists, no
  override). Message identifies the blocking inspection(s). Entry/normalized-event/WIP posting remains
  exactly as before for unblocked posts.

## 13. P8 Integration

- Multiple-output entries: the gate attaches to the entry's `operationCode`/job card — output split,
  additional outputs, reversal, and WIP behavior are unchanged. Gate message references the
  job card and operation (not per-output).

## 14. P9 Integration

- Rejection / scrap / rework disposition docs are **not modified**; disposition quantities unchanged.
- A FAIL/HELD inspection may motivate a P9 disposition or an override — both are independent,
  authorized paths; the gate itself writes nothing to disposition tables.

## 15. P10 Batch Card Integration

- Batch cards untouched. The gate never queries or writes `production_batch_card*`. Batch-scope
  override references the physical batch number string only when provided.

## 16. Inventory Boundary

- **P11 writes NO physical stock.** It does not call `StockService`, does not write `stock_ledger`
  or `stock_balance`, does not change `verifyStockAvailability`, does not alter P6 Model B-a
  (MREQ reservation Effect=NONE / Consumption = exactly one physical OUT).
- Inventory's restricted-disposition ownership per CLAR-003/D-C1 is unchanged.
- Verified by integration recording-only assertions and code change audit (§26).

## 17. Workflow

- No modifications to `WorkflowStateMachine`, `DocTypes`, `DocNumberService`, or `DocumentFacade`.
- The override is NOT a numbered first-class document (no numbering rule was approved for it) — it is
  an audited signature record with its own id; states PENDING/APPROVED/APPLIED handled in service.
  No parallel workflow engine is created.

## 18. API

| Endpoint | Method | Auth / Permission | Function |
|---|---|---|---|
| `/api/v1/production/quality-gate/status?jobCardNumber=` | GET | PRODUCTION VIEW (class) | Gate status per ops + blockers |
| `/api/v1/production/quality-gate/overrides` | GET | PRODUCTION VIEW | List override records |
| `/api/v1/production/quality-gate/overrides/{id}` | GET | PRODUCTION VIEW | Override + audit trail |
| `/api/v1/production/quality-gate/overrides` | POST | PRODUCTION EDIT (class VIEW; service enforces role) | Request override {inspectionId/jobCard/op, reason, quantity, batchNumber} |
| `/api/v1/production/quality-gate/overrides/{id}/sign-quality` | POST | service `hasAnyRole("QUALITY_MANAGER")` | Quality Supervisor signature |
| `/api/v1/production/quality-gate/overrides/{id}/sign-production` | POST | service `hasAnyRole("PRODUCTION_SUPERVISOR")` | Production Supervisor signature |
| `/api/v1/production/quality-gate/overrides/{id}/sign-plant-head` | POST | service `hasAnyRole("PLANT_HEAD")` | Plant Head signature (single = approved) |

Validation: reason non-blank; quantity > 0; inspection must exist; PPAP-block refusal; status guards
(no signing after APPLIED/APPROVED; no double-sign same role). Errors: RFC-7807 400 via existing
`GlobalExceptionHandler`; safe (no stacks, no secrets). Idempotency: unique active-override per
inspection holds duplicate requests; signing is guarded by state and `@Version` optimistic locking.

## 19. Database (V10 — additive only)

- `production_gate_override` — id, inspection_id (FK `quality_inspection`) + inspection_number,
  job_card_number, operation_code, operation_sequence, item_code, quantity, batch_number, reason,
  status, category (JOINT/PLANT_HEAD), quality_approver_user/at, production_approver_user/at,
  plant_head_approver_user/at, applied_by_user/at, created_by/at, updated_by/at, version.
  - Partial unique index `(inspection_id) WHERE status IN ('PENDING','APPROVED')` → one active
    override per inspection (idempotent/concurrency anchor).
  - Check `quantity > 0`; check `btrim(reason) <> ''`.
- `production_gate_override_audit` — override_id (NOT NULL), event_type, previous_status, new_status,
  changed_by_user, timestamp, details_json.
- NO change to any existing table. Flyway V10 (next in sequence after V9).

## 20. UI

New Production screen `production-quality-gate` (`BatchCardScreen`-style):
- List: job cards with per-operation gate status (CLEAR / BLOCKED–PENDING/FAIL/HELD), blocking
  inspection numbers, override-ability.
- Override dialog: reason (mandatory), quantity, batch; sign status (quality/production/plant-head
  with timestamps); state-aware buttons; PPAP notice; audit viewer.
- Busy guards, safe errors, permission-aware actions; role-gated buttons mirror server rules.

## 21. Audit

- Every gate event recorded in `production_gate_override_audit`: CREATE_REQUEST, QUALITY_SIGNED,
  PRODUCTION_SIGNED, PLANT_HEAD_SIGNED, APPROVED, APPLIED — actor, timestamp, prev/new status, details
  (inspection number, reason). No duplicate events (single transition per audit row).
- No sensitive data; no PII beyond existing username conventions.

## 22. Idempotency

- Duplicate override request for same inspection → partial unique index; second request returns the
  existing PENDING/APPROVED record (or 409-safe downgrade via constraint catch).
- Repeated sign by same role → status guard returns current record (no-op, no duplicate).
- Repeated gate evaluation → read-only; consumption (`APPLIED`) is single-commit, so a retry after
  consumption re-blocks (the override is one-time) — correct per contract.
- Db constraints + existing patterns; frontend buttons are not the mechanism.

## 23. Concurrency

- `@Version` optimistic lock on `production_gate_override`; `OptimisticLockException` → 409
  (existing handler).
- Unique active per inspection prevents simultaneous duplicate overrides.
- Two users cannot advance the same gate twice: consumption is inside the gate transaction and guarded
  by `status = APPROVED → APPLIED` transition (single winner via row lock/version).

## 24. Transactional Safety

- `requestOverride` / `sign*` / gate-eval-with-apply are `@Transactional`; state+audit commit together;
  failure rolls back both — no partial state. No swallowed exceptions; failure surfaces as error.

## 25. Security

- Class `@RequirePermission(module="PRODUCTION", screen="*", action="VIEW")`; per-action role checks
  server-side (`CurrentUserRoles.hasAnyRole`). No privilege escalation: signing authority is role-based
  and cannot be granted by the requester. Safe error projection.
- Attempted unauthorized sign verified in tests (expects refusal).

## 26. Tests / Regression

- Unit: `ProductionQualityGateServiceTest` (23 tests): gate mapping (blocking/clear), block/clear
  evaluation across all statuses, override request (mandatory reason, quantity>0, PRODUCTION-only,
  blocking-only, PPAP refusal, idempotent duplicate), joint + Plant-Head signature rules (role guard,
  distinct-user, status guards, once-only), audit events, one-time application.
- Integration: `ProductionQualityGateIntegrationTest` (Testcontainers PG16, 5 tests):
  - joint override (Quality + Production, distinct users) clears the entry-post gate **once**, then
    the next entry re-blocks (one-time consumption, override status → APPLIED);
  - Plant-Head single signature approves and the gate honors it once;
  - duplicate override request for one inspection is idempotent (returns original, 1 row);
  - user without PLANT_HEAD authority is refused (403) and no status change occurs;
  - gate status endpoint reports blockers for the UI (job card gate + per-operation blockers);
  - recording-only invariant: stock_ledger / stock_balance / entry quantities untouched by gate ops,
    and a **blocked** post creates no normalized-op session (ADR-005 boundary).
- Regression: full `./gradlew test` → **427 tests, 0 failures** (baseline 399 + 23 unit + 5 integration;
  pre-existing suites unchanged). `./gradlew build` → PASS.

## 27. Regression (explicit)

- P6 MREQ/Consumption model B-a: unchanged (no StockService interaction).
- P8 multiple-output: untouched (gate keyed on job card + operation).
- P9 disposition docs: untouched.
- P10 batch cards: untouched.
- Production Entry / Job Card / Subjob / Route / Return / Conversion / Log / Idle / Reports: unchanged.
- NOTE: `ProductionJobCardService` gained a `ProductionQualityGateService` collaborator only for the
  subjob-completion gate (`assertSubjobGate`); its unit test suite was updated with that mock and all
  P2 behavior-lock tests still pass.

## 28. Known Limitations

- **PPAP data absent**: no item attribute currently models a PPAP-mandatory block; `isPpapBlocked`
  returns FALSE for all current data. The non-overridable rule is implemented and reacts when a PPAP
  block marker is modeled; until then it has no data to act on (mirrors P10's treatment of plant-segment).
- **`PLANT_HEAD` role not seeded** in `DataSeeder` (referenced by existing approval-step model);
  the Plant-Head override path requires a user holding that role at runtime — deployment data, not code.
- **Self-consistent gate semantics**: gate blocks on **existing** blocking inspection records; it does
  not auto-create inspections (FRS §8 retention — Production records output, Quality records status).
- **One-time override is the implemented contract**: an approval typically clears only the first
  qualifying gate attempt (entry post / subjob completion); subsequent attempts re-block until the
  PENDING/FAIL/HELD inspection is actually dispositioned by Quality. This is by design and verified.

## 29. Out of Scope

- Inspection planning/AQL/characteristics creation for the gate (Quality module owns inspection; reused).
- NCR/CAPA/Concession/8D work (unchanged).
- Any stock/Inventory integration for gate dispositions (CLAR-003/D-C1 boundary).
- Batch reconciliation, costing, planning, maintenance, P3.4 backfill, event-spine redesign.

## 30. Stop Conditions — evaluated, none triggered

1. CLAR-PROD-012 undefined behavior? — No (all gate behaviors defined; interpretations documented).
2. New Quality business rule required? — No. 3. New Quality authority? — No. 4. New lifecycle state not
   approved? — No (only PENDING/PASS/FAIL/HELD; override record states are bookkeeping).
5. Inventory modification required? — No. 6–9. P6/P8/P9/P10 required change? — No.
10. New numbering system? — No. 11. Costing? — No. 12. Destructive migration? — No.
13/14. Idempotency/concurrency? — Established (constraints + version + one-time consumption).
15. Existing Quality conflict without resolution? — No conflict; existing module reused as status source.

---

*This contract was written and frozen BEFORE coding (P11 §5 discipline). §26–§29 were completed and
confirmed after implementation in the final update below.*

---

## 31. (final update) Post-Implementation Verification Record

### Backend gates

| Gate | Result |
|---|---|
| `./gradlew test` full suite | **PASS — 427 tests, 0 failures** (399 baseline + 23 unit + 5 integration) |
| `ProductionQualityGateServiceTest` (unit) | PASS — 23/23 |
| `ProductionQualityGateIntegrationTest` (Testcontainers PG16) | PASS — 5/5 |
| `./gradlew build` | PASS |

### Frontend gates

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS (0 errors) |
| `npm run build` | PASS (vite build + PWA dist) |
| `npm run lint` | 31 errors (unchanged vs baseline) / 766 warnings |
| `npm run test` | PASS — 5 files, 34 tests |

Frontend additions: `src/services/productionQualityGateApi.ts`,
`src/pages/production/quality-gate/ProductionQualityGateScreen.tsx`, registered in
`src/config/screenRegistry.tsx` (`production-quality-gate`) and `src/config/navigation.ts`
(Production → Transactions → Quality Gate). Screen test registry/nav coverage still green.

### Inventory invariant (P11)

```
Gate code writes stock_ledger:      NO  [code audit + integration assertion]
Gate code writes stock_balance:     NO  [code audit + integration assertion]
Unauthorized physical movement:     NO
Blocked post creates session:      NO  [integration assertion]
P6 Model B-a unchanged:             YES (regression suite)
```

### Security verification

Authorization matrix tested: gate block applies to all; override request = production path;
sign-quality requires QUALITY_MANAGER; sign-production requires PRODUCTION_SUPERVISOR;
sign-plant-head requires PLANT_HEAD; unauthorized sign refused (403, no state change); PPAP-block
path refuses; joint approvers must be distinct users; override is operation-scoped and never
whole-order.

## 32. Final Account

- Migration: `V10__production_quality_gate.sql` (production_gate_override +
  production_gate_override_audit; partial unique active-per-inspection index; quantity>0 and
  mandatory-reason CHECKs; FK to quality_inspection).
- Gate points wired: `ProductionController.productionEntryAction` post-case
  (`assertEntryPostGate`); `ProductionJobCardService.subjobAction complete` (`assertSubjobGate`).
- Approved override authority: Quality Supervisor + Production Supervisor jointly OR Plant Head
  (server-enforced via `CurrentUserRoles.hasAnyRole`), one-time, operation-scoped, mandatory reason,
  audited; PPAP-blocked non-overridable.
- Reads are pure (`evaluateGate`); consumption happens only at the two gate points.

## 33. Stop Verification (final pass)

All 15 stop conditions re-evaluated after the change — **none triggered**. No new rules, authority,
states, stock changes, numbering, or P6/P8/P9/P10 modifications. Idempotency/concurrency satisfied by
partial-unique index + `@Version` + single-commit one-time consumption.

### Final status

**IMPLEMENTED_AND_VERIFIED**

---

## 34. Final Delivery Report — P11

**Phase:** P11 — Production Quality Gate (CLAR-PROD-012) · Controlled Implementation Authorization

**Authorized, delivered:** Xiaojing Gate enforced at operation/subjob completion and Production Entry
post (blocks next-op/completion/FG while inspection PENDING/FAIL/HELD), with a one-time, operation-
scoped, jointly-authorized (Quality Supervisor AND Production Supervisor) **or** Plant-Head override,
mandatory reason, fully audited, PPAP-blocked items non-overridable. Production owns the gate
evaluation + override UI; Quality owns inspection status/disposition; Inventory restricted per
CLAR-003/D-C1. Reuses the existing `QualityInspection` engine (no second engine); existing coarse
`quality/production-gate/check` and FINAL-FG `DocumentFacade.enforceFinalInspectionGate` untouched.

**Migration:** `V10__production_quality_gate.sql` (additive).

**Backend tests:** 399 baseline → 427 (0 failures). New: 23 unit + 5 integration.
Backend gates: test + build PASS. Frontend gates: typecheck + build + test PASS; lint 31 errors
(unchanged baseline) / 766 warnings.

**Verification:** gate blocks blocked ops; joint + Plant-Head override clear once then re-block;
duplicate override idempotent; unauthorized sign refused; recording-only invariant (zero
stock/entry/WIP/session mutation outside the real post). DOCUMENT_61 fully updated (§31/§32 above).

**Security/inventory:** no privilege escalation (server-enforced role guards); no inventory or
normalized-op-session mutation by gate code.

**Hard git rules honored:** NO commit / push / stage / reset / clean / stash / rebase / amend.

**Biz decisions invented:** NO — only the approved CLAR-PROD-012 Option A contract was implemented;
documented interpretations recorded for gate semantics, one-time consumption, and PPAP data absence.

**Commit: NO · Push: NO · Staged: 0**

---

*End of DOCUMENT_61 — P11 Production Quality Gate implementation contract and record.*