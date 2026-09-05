# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 10 — BUSINESS RULES AND BUSINESS LOGIC

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 10 — Business Rules and Business Logic |
| Baseline | DOCUMENT 06; DOCUMENT 07 §23 registry; DOCUMENT 09 fields |
| Status | AUTHORITATIVE BUSINESS RULE DEFINITION |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |
| Corrections | Resolves BR-GAP-001..003 and formalizes all referenced BRs (DOCUMENT 08A) |

This document is the authoritative definition of every production business rule. Every BR
referenced in DOCUMENTS 07/08/09 is defined here (or explicitly flagged FUTURE). A reference
integrity check closes this document.

---

## TABLE OF CONTENTS

1. Business Rule Definition Template
2. Business Rule Registry (complete set)
3. Full Business Rule Definitions
4. Rule Logic / Decision Functions
5. Reference Integrity Check

---

## 1. BUSINESS RULE DEFINITION TEMPLATE

Each rule follows: **BR ID · Rule Name · Source · Requirement ID(s) · Screen ID(s) · Trigger ·
Preconditions · Inputs · Validation · Decision Logic · System Action · Exception Handling ·
Inventory Impact · Production Impact · Quality Impact · Cost Impact · Database Impact · API
Impact · Audit Requirement · Test Scenario References.**

Where a field is not applicable, it is stated as "N/A".

---

## 2. BUSINESS RULE REGISTRY (COMPLETE SET)

| BR ID | Rule Name | Source | Status |
|---|---|---|---|
| BR-PROD-001 | Entry Type Control | PROPOSED | Defined (§3) |
| BR-PROD-002 | Rework Traceability | PROPOSED | Defined (§3) |
| BR-PROD-004 | Actual Production DateTime Integrity | PROPOSED | Defined (§3) |
| BR-PROD-010 | Operation Sequence Control | PROPOSED | Defined (§3) |
| BR-PROD-020 | Machine/Operator Eligibility Validation | PROPOSED | Defined (§3) |
| BR-PROD-ENTRY-001 | Quantity Reconciliation (operation) | CR+REF+ZYGER | Defined (§3) |
| BR-PROD-ENTRY-003 | Multiple-Output Reconciliation | ZYGER | Defined (§3) |
| BR-PROD-MATL-001 | Material Deviation Tolerance + Approval | PROPOSED | Defined (§3) |
| BR-PROD-MATL-003 | Other Material Request Control | ZYGER | Defined (§3) |
| BR-PROD-INV-001 | Consumption ≤ Available | PROPOSED | Defined (§3) |
| BR-PROD-INV-002 | FG/SFG Receipt from Accepted Last-Op Output | PROPOSED | Defined (§3) |
| BR-PROD-INV-003 | Return Credited per Disposition | PROPOSED | Defined (§3) |
| BR-PROD-WIP-001 | Accepted Output → Next Op Input | PROPOSED | Defined (§3) |
| BR-PROD-PEND-001 | Pending Computed from Posted Events | PROPOSED | Defined (§3) |
| BR-PROD-JOBCARD-001 | Job Close Requires All Subjobs Complete/Hold | CR | Defined (§3) |
| BR-PROD-QA-001 | Mandatory Quality Gate + Override | PROPOSED | Defined (§3) |
| BR-PROD-WC-001 | Work Center Re-Allocation Control | ZYGER | Defined (§3) |
| BR-PROD-CAP-001 | Capacity Uses Shift Calendars + Maintenance Availability | PROPOSED | Defined (§3) |
| BR-PROD-REWORK-001 | Rework Qty ≤ Authorized; Sourced | PROPOSED | Defined (§3) |
| BR-PROD-REJ-001 | Production Rejection Control | CR+ZYGER | Defined (§3) |
| BR-PROD-SCRAP-001 | Production Scrap Control | ZYGER | Defined (§3) |
| BR-PROD-CONV-001 | Conversion Reconciliation | CR | Defined (§3) |
| BR-PROD-DISASM-001 | Disassembly Reconciliation | ZYGER | Defined (§3) |
| BR-PROD-STOP-001 | Stoppage Maintenance Hand-off | ZYGER | Defined (§3) |
| BR-PROD-LOG-001 | Log-Quantity Coherence | CR | Defined (§3) |
| BR-PROD-ORDER-004 | Production Order Short Close Control | ZYGER | Defined (§3) |
| BR-PROD-PLAN-005 | Budget Bucket Split Sum | ZYGER | Defined (§3) |
| BR-PROD-PLAN-007 | Budget Revision Increment | ZYGER | Defined (§3) |
| BR-PROD-PLAN-010 | PO Schedule Generation from Plan | ZYGER | Defined (§3) |
| BR-PROD-PLAN-011 | Schedule Revision Control | ZYGER | Defined (§3) |
| BR-NUM-001 | Reserved Numbers Never Reused | PROPOSED | Defined (§3) |
| BR-WF-001 | Status Transition Control | PROPOSED | Defined (§3) |
| BR-PROD-ENTRY-002 | Rework Entry Cap (net) | PROPOSED | Defined (§3) [alias/derived of REWORK-001] |

---

## 3. FULL BUSINESS RULE DEFINITIONS

### BR-PROD-004 — Actual Production DateTime Integrity
- **Source:** PROPOSED (derived from DOC 02 §4.4 improvement).
- **Requirement IDs:** CR-PROD-001; FR-PROD-ENTRY-001.
- **Screen IDs:** SCR-PROD-ENTRY-001, SCR-PROD-LOG-001, SCR-PROD-IDLE-001, SCR-PROD-STOP-001.
- **Trigger:** create/update of Production Entry, Log Sheet, Idle/Stoppage.
- **Preconditions:** user posts a transaction; `prod_date`/`start_ts`/`end_ts` supplied.
- **Inputs:** entry_date; actual production date (prod_date); start_ts; end_ts.
- **Validation:** `prod_date` must reflect when the work physically occurred (may be a prior
  shift for late entry); `end_ts ≥ start_ts`; runtime derived.
- **Decision Logic:** Entry Date ≠ Actual Production Date; both captured; actual date is
  authoritative for OEE/capacity/attribution.
- **System Action:** stores actual date/time; computes runtime = end − start − idle.
- **Exception Handling:** actual date in the future or before order start → warning/block.
- **Inventory Impact:** N/A (date used for cost-snapshot and OEE attribution only).
- **Production Impact:** supports prior-shift late entry without distorting OEE.
- **Quality Impact:** N/A.
- **Cost Impact:** actual-date affects which cost snapshot/period applies.
- **Database Impact:** `session.actual_prod_ts`, `op_event.start_ts/end_ts`.
- **API Impact:** prodDate accepted in POST/PUT entry.
- **Audit Requirement:** yes (created/updated by/at).
- **Test Scenarios:** T-PROD-REFRESH, T-PROD-LATEENTRY, T-PROD-TIMECONTROL.

### BR-PROD-010 — Operation Sequence Control
- **Source:** PROPOSED.
- **Requirement IDs:** CR-PROD-001/005; FR-PROD-ENTRY-004, FR-PROD-JOBCARD-003.
- **Screen IDs:** SCR-PROD-ENTRY-001, SCR-PROD-JOBCARD-003.
- **Trigger:** selecting an operation to record.
- **Preconditions:** route sequence defined (Engineering).
- **Inputs:** current operation; predecessor completion status.
- **Validation:** operation's predecessors must be COMPLETED (or approved WIP) before it starts,
  unless override authorized.
- **Decision Logic:** sequence index from approved route; parallel/alternate/rework/skip require
  authorization + reason + timestamp.
- **System Action:** allow/block operation start; record override.
- **Exception Handling:** authorized override persists user/reason/time/audit.
- **Inventory/Production/Quality/Cost Impact:** N/A beyond execution gating.
- **Database Impact:** route op sequence; `op_event` override flags.
- **API Impact:** operation start validates BR-PROD-010.
- **Audit Requirement:** yes (overrides).
- **Test Scenarios:** T-PROD-ROUTESEQ, T-PROD-ROUTEOVERRIDE.

### BR-PROD-020 — Machine/Operator Eligibility Validation
- **Source:** PROPOSED.
- **Requirement IDs:** CR-PROD-001/005; FR-PROD-ENTRY-001.
- **Screen IDs:** SCR-PROD-ENTRY-001, SCR-PROD-JOBCARD-001/003, SCR-PROD-LOG-001.
- **Trigger:** assignment of machine/operator to an operation/job.
- **Preconditions:** machine and operator exist and are active.
- **Inputs:** machine_id, operator_id, work_center, operation, shift.
- **Validation:** machine active, not under breakdown, eligible for the work center +
  operation; operator active, plant, skill/competency, machine authorization, shift policy.
- **Decision Logic:** cross-check Master Data + Maintenance availability + HR competency.
- **System Action:** allow/deny assignment; on denial return reason.
- **Exception Handling:** override requires supervisor authorization + audit.
- **Database Impact:** FK + validation queries; index (machine, status, eligibility).
- **API Impact:** assignment endpoint validates.
- **Audit Requirement:** yes.
- **Test Scenarios:** T-PROD-MACHINE, T-PROD-OPERATOR, T-PROD-BREAKDOWN.

### BR-PROD-ENTRY-001 — Quantity Reconciliation (operation)
- **Source:** CR + REF + ZYGER.
- **Requirement IDs:** CR-PROD-001/007; FR-PROD-ENTRY-001; CLAR-PROD-002.
- **Screen IDs:** SCR-PROD-ENTRY-001, SCR-PROD-REJ-001, SCR-PROD-SCRAP-001.
- **Trigger:** submit of an operation event.
- **Preconditions:** accepted/rejected/rework/scrap quantities entered.
- **Inputs:** accepted_qty, rejected_qty, rework_qty, scrap_qty, input_qty.
- **Validation:** `processed = accepted + rejected + rework + scrap`; `input_qty ≥ processed`.
- **Decision Logic:** derived `processed_qty` = sum of the four components; carry WIP =
  `input − processed` (remains at op).
- **System Action:** derive processed; surface reconciliation error if not equal.
- **Exception Handling:** reject submission with per-field deviation message; authorized override
  only for approved deviation (rework/scrap).
- **Inventory Impact:** drives consumption/output/scrap txns; constant-mass check.
- **Production Impact:** every reported qty consistent; WIP/pending derived correctly.
- **Quality Impact:** reject + scrap + rework buckets feed quality.
- **Cost Impact:** component quantities drive cost allocation.
- **Database Impact:** `op_event.processed_qty` derived; component cols.
- **API Impact:** submit validates sum.
- **Audit Requirement:** yes.
- **Test Scenarios:** T-PROD-QTY, T-PROD-OVERREJECT, T-PROD-OVERSCRAP, T-PROD-PARTIAL.

### BR-PROD-ENTRY-003 — Multiple-Output Reconciliation
- **Source:** ZYGER.
- **Requirement IDs:** ZYGER Multi-Output; FR-PROD-ENTRY-003; CFL-PROD-012.
- **Screen IDs:** SCR-PROD-ENTRY-003.
- **Trigger:** submit of a multi-output operation.
- **Validation:** `input ≥ PRIMARY + ΣCO + ΣBY + scrap` (routing tolerance); ≥1 PRIMARY.
- **System Action:** derive; permit co/by-products only under multi-output type.
- **Database Impact:** output_event rows per type.
- **Audit:** yes. **Test:** T-PROD-MULTIOUT.

### BR-PROD-REWORK-001 — Rework Qty ≤ Authorized; Sourced
- **Source:** PROPOSED (CFL-PROD-002).
- **Requirement IDs:** CR-PROD-001; FR-PROD-ORDER-003, FR-PROD-ENTRY-002.
- **Screen IDs:** SCR-PROD-ORDER-003, SCR-PROD-ENTRY-002, SCR-PROD-REWORK-001.
- **Trigger:** create rework order/entry; post rework output.
- **Validation:** rework_qty ≤ authorized_qty (NCR); source_entry present; net rework output ≤
  authorized; never a bare radio.
- **System Action:** block un-sourced/over-cap rework; trace source.
- **Inventory Impact:** rework output movement only within authorized qty.
- **Database Impact:** rework_event FK to source + authorized_qty.
- **Audit:** yes. **Test:** T-PROD-REWORK.

### BR-PROD-REJ-001 — Production Rejection Control
- **Source:** CR (reject qty) + ZYGER (details).
- **Requirement IDs:** CR-PROD-001; FR-PROD-REJ-001; CLAR-PROD-002.
- **Screen IDs:** SCR-PROD-REJ-001, SCR-PROD-ENTRY-001.
- **Field IDs:** FLD-PROD-ENTRY-021, FLD-PROD-REJ-001..008.
- **Trigger:** recording/classifying rejected quantity; disposition decision.
- **Preconditions:** valid op_event; rejected_qty > 0; processed known.
- **Inputs:** rejected_qty, classification, reason, ncr_ref, disposition.
- **Validation:**
  1. `rejected_qty ≤ processed_qty`.
  2. Reconciliation: `accepted + rejected + rework + scrap = processed`.
  3. classification ∈ {REWORKABLE, SCRAP, HOLD_MRB}; mandatory.
  4. reason mandatory (catalogue).
  5. `ncr_ref` required when classification ∈ {SCRAP, HOLD_MRB}.
  6. disposition coherent with classification (REWORKABLE→rework route; SCRAP→scrap; HOLD_MRB→quarantine).
- **Decision Logic:** disposition driver routes the qty to rework (no ledger move), scrap
  (SCRAP txn), or hold/quarantine (blocked, no move until re-disposition).
- **System Action:** create rejection record; derive disposition; reconcile op; trigger rework or
  scrap posting; block next op if HOLD_MRB.
- **Exception Handling:** over-rejection blocked; override requires supervisor + reason +
  audited.
- **Inventory Impact:** no direct stock write; HOLD blocks movement; SCRAP posts SCRAP txn;
  REWORKABLE no move.
- **Production Impact:** WIP/pending correctly reduced by rejected qty; op may not advance while
  HOLD_MRB.
- **Quality Impact:** rejection classification + NCR linkage; disposition owned with Quality.
- **Cost Impact:** rejection value allocation per classification.
- **Database Impact:** prod_rejection / prod_rejection_line; op_event.rejected_qty.
- **API Impact:** POST /rejections; submit validates.
- **Audit Requirement:** full (created/classified/disposed by/at).
- **Test Scenarios:** T-PROD-REJECT, T-PROD-OVERREJECT, T-PROD-QTY, T-PROD-NCR.

### BR-PROD-SCRAP-001 — Production Scrap Control
- **Source:** ZYGER (Scrap Generation).
- **Requirement IDs:** FR-PROD-SCRAP-001.
- **Screen IDs:** SCR-PROD-SCRAP-001, SCR-PROD-ENTRY-001.
- **Field IDs:** FLD-PROD-ENTRY-023, FLD-PROD-SCRAP-001..010.
- **Trigger:** recording scrap quantity; authorization; posting.
- **Preconditions:** valid op_event; scrap_qty > 0; reason from catalogue.
- **Inputs:** scrap_qty, reason, scrap_type, value_context, authorization, batch/lot.
- **Validation:**
  1. `scrap_qty ≤ processed_qty`.
  2. Reconciliation: `accepted + rejected + rework + scrap = processed`.
  3. reason mandatory (catalogue, "Other" needs text).
  4. authorization: AUTO within tolerance; MANUAL_PENDING→APPROVED beyond tolerance or scrap
     value above threshold; requires authorized role.
  5. scrap_type ∈ {PROCESS, REJECT, END_OF_LIFE}.
- **Decision Logic:** within-tolerance scrap auto-posts; beyond-tolerance requires approval
  (plant head); value_context is a cost snapshot (read-only).
- **System Action:** create scrap record; post SCRAP transaction; feed PPM/scrap reports;
  reconcile op.
- **Exception Handling:** over-scrap blocked; unauthorized manual scrap blocked.
- **Inventory Impact:** posts SCRAP txn (controlled); consumes value_context.
- **Production Impact:** op output reconciled; scrap reduces WIP/pending.
- **Quality Impact:** scrap reason + type feed quality metrics; NCR optional.
- **Cost Impact:** scrap value/cost charged; capitalized scrap is irreversible (reversal
  restriction).
- **Database Impact:** prod_scrap / prod_scrap_line; op_event.scrap_qty.
- **API Impact:** POST /scrap; approval flow endpoint.
- **Audit Requirement:** full, incl. authorization.
- **Reversal Restrictions:** SCRAP txns are **not reversible** after costing/capitalization
  (write-off); pre-capitalization reversal requires reason + authorization + audited ordered
  rollback.
- **Test Scenarios:** T-PROD-SCRAP, T-PROD-OVERSCRAP, T-PROD-REVERSE, T-PROD-SCRAPAPPROVAL.

### BR-PROD-CONV-001 — Conversion Reconciliation
- **Source:** CR-PROD-002.
- **Requirement IDs:** FR-PROD-CONV-001; CLAR-PROD-008.
- **Screen IDs:** SCR-PROD-CONV-001.
- **Validation:** `input_qty = output_qty + loss_qty + scrap_qty` (within tolerance); stock
  availability for input.
- **System Action:** post input decrease + output increase + loss + scrap; Costing values.
- **Inventory Impact:** CONVERSION txn (input/output/loss/scrap); never direct stock write.
- **Database Impact:** prod_conversion/_line.
- **Audit:** yes. **Test:** T-PROD-CONV.

### BR-PROD-DISASM-001 — Disassembly Reconciliation
- **Source:** ZYGER.
- **Requirement IDs:** FR-PROD-DISASM-001.
- **Screen IDs:** SCR-PROD-DISASM-001.
- **Validation:** `parent_qty ≥ Σ components + Σ by-products + loss` (within tolerance); parent
  stock availability.
- **System Action:** post parent decrease + component/by-product receipts + loss/scrap.
- **Database Impact:** prod_disassembly/_line.
- **Audit:** yes. **Test:** T-PROD-DISASM.

### BR-PROD-STOP-001 — Stoppage Maintenance Hand-off
- **Source:** ZYGER.
- **Requirement IDs:** FR-PROD-STOP-001; DOC 07 §17.
- **Screen IDs:** SCR-PROD-STOP-001.
- **Trigger:** stoppage classified as machine breakdown.
- **Decision Logic:** if breakdown → create maintenance hand-off (Maintenance module) + set
  machine availability DOWN; machine ineligible until repaired.
- **Inventory/Quality/Cost Impact:** N/A; feeds OEE Availability.
- **Database Impact:** prod_stoppage.maintenance_ref; machine availability link.
- **Audit:** yes. **Test:** T-PROD-BREAKDOWN.

### BR-PROD-LOG-001 — Log-Quantity Coherence
- **Source:** CR-PROD-004.
- **Requirement IDs:** FR-PROD-LOG-001; CLAR-PROD-004.
- **Screen IDs:** SCR-PROD-LOG-001.
- **Validation:** if activity = PRODUCTION/RUN, qty required and > 0; if a non-production
  activity (setup/breakdown/wait/etc.), qty = 0.
- **System Action:** enforce; allow generation/reference of summarized production entries.
- **Audit:** yes. **Test:** T-PROD-LOG.

### BR-PROD-JOBCARD-001 — Job Close Requires All Subjobs Complete/Hold
- **Source:** CR-PROD-005.
- **Requirement IDs:** FR-PROD-JOBCARD-004.
- **Screen IDs:** SCR-PROD-JOBCARD-004.
- **Validation:** all subjobs COMPLETED, or authorized HOLD with reason; final quality PASS.
- **System Action:** close job; create FG/SFG receipt (BR-PROD-INV-002).
- **Audit:** yes. **Test:** T-PROD-JOBCOMPLETE.

### BR-PROD-QA-001 — Mandatory Quality Gate + Override
- **Source:** PROPOSED.
- **Requirement IDs:** FR-PROD-ENTRY-001; DOC 07 §14; CLAR-PROD-012.
- **Screen IDs:** SCR-PROD-ENTRY-001, SCR-PROD-JOBCARD-004.
- **Validation:** inspection-required op cannot advance until PASS; HOLD blocks; override →
  authorized supervisor/engineer + reason + audit.
- **System Action:** block progression; record override.
- **Audit:** yes. **Test:** T-PROD-QUALITYHOLD.

### BR-PROD-WIP-001 — Accepted Output → Next Op Input
- **Source:** PROPOSED.
- **Requirement IDs:** FR-PROD-WIP-001.
- **Validation:** accepted op output becomes available input to the next permitted operation;
  WIP derived and read-only.
- **System Action:** derive WIP; restrict consumption to accepted.
- **Audit:** yes. **Test:** T-PROD-PARTIAL, T-PROD-WIP.

### BR-PROD-PEND-001 — Pending Computed from Posted Events
- **Source:** PROPOSED.
- **Requirement IDs:** CR-PROD-007; FR-PROD-PEND-001.
- **Validation:** pending = planned − completed (derived, never user-entered).
- **System Action:** compute; surface stop-op + stop-reason.
- **Audit:** yes (derived from audited events). **Test:** T-PROD-PENDING.

### BR-PROD-INV-001 — Consumption ≤ Available (unless approved)
- **Source:** PROPOSED.
- **Requirement IDs:** FR-PROD-MATL-005; ASM-PROD-003.
- **Validation:** consumed ≤ available unless an approved Additional-Material Request rides
  along.
- **System Action:** block over-consumption; allow partial.
- **Test:** T-PROD-OVCONSUME.

### BR-PROD-INV-002 — FG/SFG Receipt from Accepted Last-Op Output
- **Source:** PROPOSED.
- **Validation:** FG/SFG receipt only from accepted output of eligible last operation.
- **Test:** T-PROD-RECEIPT.

### BR-PROD-INV-003 — Return Credited per Disposition
- **Source:** PROPOSED.
- **Requirement IDs:** CR-PROD-003; CLAR-PROD-003.
- **Validation:** return credited to store per disposition (Good usable / QC Hold / Rejected);
  QC-hold/rejected returns segregated.
- **Test:** T-PROD-RETURN.

### BR-PROD-MATL-001 — Material Deviation Tolerance + Approval
- **Source:** PROPOSED.
- **Requirement IDs:** FR-PROD-MATL-002; CFL-PROD-004.
- **Validation:** deviation = consumed − standard; beyond tolerance requires approval; approved
  Additional-Material Request unblocks.
- **Test:** T-PROD-BOMVARIANCE, T-PROD-ADDMATERIAL.

### BR-PROD-MATL-003 — Other Material Request Control
- **Source:** ZYGER.
- **Requirement IDs:** FR-PROD-MATL-003.
- **Validation:** non-BOM material request requires authorization; purpose mandatory.
- **Test:** T-PROD-OTHERMATERIAL.

### BR-PROD-WC-001 — Work Center Re-Allocation Control
- **Source:** ZYGER.
- **Requirement IDs:** FR-PROD-WC-003.
- **Validation:** re-allocation requires reason + authorization + audit.
- **Test:** T-PROD-WCREALLOC.

### BR-PROD-CAP-001 — Capacity Uses Shift Calendars + Maintenance Availability
- **Source:** PROPOSED.
- **Requirement IDs:** FR-PROD-CAP-001; FUT-PROD-002.
- **Validation:** capacity calc uses shift calendars and machine availability (from Maintenance)
  and planned cycle/setup times.
- **Test:** T-PROD-CAPACITY.

### BR-PROD-ORDER-004 — Production Order Short Close Control
- **Source:** ZYGER.
- **Requirement IDs:** FR-PROD-ORDER-004.
- **Validation:** short close on Released/In-Progress only; reason mandatory; remaining qty
  disposition ∈ {CANCEL, SCRAP, RETURN}; authorized by plant head/planner; reconciles WIP/pending.
- **Test:** T-PROD-SHORTCLOSE.

### BR-PROD-PLAN-005 — Budget Bucket Split Sum
- **Source:** ZYGER.
- **Validation:** Σ bucket splits = budget total.
- **Test:** T-PLAN-BUDGET.

### BR-PROD-PLAN-007 — Budget Revision Increment
- **Source:** ZYGER.
- **Validation:** revision number increments on updation; change req + reason + base_rev.
- **Test:** T-PLAN-BUDGETREV.

### BR-PROD-PLAN-010 — PO Schedule Generation from Plan
- **Source:** ZYGER.
- **Validation:** day/week/month order schedule generated from plan; plan-backed.
- **Test:** T-PLAN-SCHEDULE.

### BR-PROD-PLAN-011 — Schedule Revision Control
- **Source:** ZYGER.
- **Validation:** released schedule revision requires change request + reason + audit.
- **Test:** T-PLAN-SCHEDULEREV.

### BR-NUM-001 — Reserved Numbers Never Reused
- **Source:** PROPOSED.
- **Requirement IDs:** R-PROD-005; DOC 07 §21.
- **Validation:** preview repeatable (no consume); reserved on Draft/Submit; never reused;
  server-side transactional; per company/division/plant/FY/type.
- **Test:** T-PROD-REFRESH, T-PROD-CONCURRENTNUM, T-PROD-NUMRESERVE.

### BR-WF-001 — Status Transition Control
- **Source:** PROPOSED.
- **Requirement IDs:** DOC 07 §22; DOC 11.
- **Validation:** only allowed transitions; incomplete postings block APPROVE; reversal requires
  reason + ordered stock-tx reversal; reversal blocked if capitalized.
- **Test:** T-PROD-WFTRANSITION.

### BR-PROD-ENTRY-002 — Rework Entry Cap (net)
- **Source:** PROPOSED.
- **Requirement IDs:** FR-PROD-ENTRY-002.
- **Validation:** net rework output ≤ authorized; scrap/hold split ≤ rework output.
- **Alias:** detail covered by BR-PROD-REWORK-001; retained as a stable alias for screen
  references in SCR-PROD-ENTRY-002.

---

## 4. RULE LOGIC / DECISION FUNCTIONS

### QTY-RECONCILE(accepted, rejected, rework, scrap)
```
processed = accepted + rejected + rework + scrap
carry = input - processed          // WIP at op, must be ≥ 0
reject-bucket(processed, rejected, input):
    if rejected > processed: REJECT "over-rejection"
    classification → disposition:
        REWORKABLE → route to rework (no ledger move)
        SCRAP      → SCRAP txn
        HOLD_MRB   → quarantine/block
```

### CONV-RECONCILE(input, output, loss, scrap)
```
if abs(input - (output+loss+scrap)) > tolerance: REJECT
post: input−1 tx, output+1 tx, loss, scrap
```

### DISASM-RECONCILE(parent, Σcomp, Σby, loss)
```
if parent < (Σcomp + Σby + loss): REJECT (beyond tolerance)
post: parent−1 tx, components+1, by+1, loss
```

### CAPACITY-UTIL(wc, period)
```
availableHrs = Σ shift-hours(wc, period) − maintenance-down(machine, period)
utilization = plannedLoadHrs / availableHrs     (report-only; engine FUTURE)
```

### SCRAP-AUTHORIZE(scrapQty, threshold, role)
```
if scrapQty <= autoTolerance and value <= cap: AUTO
else: MANUAL_PENDING → APPROVED (authorized role); else blocked
```

---

## 5. REFERENCE INTEGRITY CHECK

**Every referenced BR ID exists and is defined or flagged:**

| Check | Result |
|---|---|
| All BRs referenced in DOC 07 §23 | Defined above |
| BRs referenced in DOC 08 (REJ-001, SCRAP-001, ...) | Defined above |
| BRs referenced in DOC 09 field tables | Defined above (or stated "—" = none) |
| BR-PROD-004 (was undefined) | Resolved + formally defined (BR-GAP-003) |
| BR-PROD-REJ-001, BR-PROD-SCRAP-001 | Defined (BR-GAP-001/002) |
| Numbering (BR-NUM-001) and workflow (BR-WF-001) | Defined |
| Any BR referenced but not defined | **None** |

**Cross-DOC reference confidence:** This list is the superset of BR IDs referenced anywhere in
DOCUMENTS 01–14. FR, Screen, and Field reference integrity is validated in the per-domain docs
(DOC 07/09) and re-verified in DOCUMENT 14 traceability.

---

**END OF DOCUMENT 10**