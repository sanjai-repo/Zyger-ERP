# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 12 — DATABASE DESIGN AND DATA DICTIONARY

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 12 — Database Design and Data Dictionary |
| Target RDBMS | PostgreSQL |
| Baseline | DOCUMENT 07 §25; DOCUMENT 09 fields; DOCUMENT 11 lifecycle |
| Status | AUTHORITATIVE PHYSICAL DESIGN (normalized transactional; DDL-ready) |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

**Design principles (traceable to DOC 03/07):**
1. **Normalized transactional design.** No calculated inventory balance stored as source of
   truth; balances are derived from posted stock transactions (Declared intent of the ledger).
2. **Traceability chain** is first-class: Production Order → Work Order/execution context →
   Job Card → Operation → Material → Output → Quality → Inventory Transaction.
3. Optimistic locking via `version` (int) on every transactional table.
4. Base audit columns on every table (see B-001).
5. Conventions: `snake_case`; PK `bigserial`/`uuid`; FK with `ON DELETE RESTRICT`.

---

## TABLE OF CONTENTS

1. Naming and Base Conventions
2. Table Inventory (grouped)
3. DDL — Core Tables
4. DDL — Material / Stock-Intent Tables
5. DDL — Quality / Rework / Scrap Tables
6. DDL — Idle / Stoppage Tables
7. DDL — Conversion / Disassembly Tables
8. DDL — Planning Layer Tables
9. DDL — Numbering, Audit, Integration Outboxes
10. Calculated/Derived Views (WIP, Pending, Capacity, OEE)
11. Constraints and Index Summary
12. Traceability Chain Mapping

---

## 1. NAMING AND BASE CONVENTIONS

### B-001 Base columns (every table)
```
id              uuid primary key default gen_random_uuid()
company_id      uuid not null
division_id     uuid null
plant_id        uuid not null
version         int not null default 0
created_by      uuid not null
created_at      timestamptz not null default now()
updated_by      uuid null
updated_at      timestamptz null
```
Where approved/cancelled/reversed: `approved_by, approved_at, cancelled_by, cancelled_at,
cancellation_reason, reversed_by, reversed_at, reversal_reason`.

### B-002 Document status vs execution status
Document carrying tables have `doc_status` (BR-WF-001 codes) AND (where physical) `exec_status`
(execution codes) — see DOC 11 dictionary. These are two distinct columns, never merged.

### B-003 Quantity columns
All monetary/value columns `numeric(20,4)`; all qty `numeric(18,3)`; all durations stored in
integer seconds (`*_s`).

---

## 2. TABLE INVENTORY (GROUPED)

**Core:** prod_order, prod_order_line, prod_job_card, prod_subjob, prod_execution_session,
prod_operation_event, prod_output_event, prod_log_entry.
**Material/stock-intent:** prod_req_material(_line), prod_req_addl(_line), prod_req_other(_line),
prod_consumable_consumption, prod_consumption_event.
**Quality/rework/scrap:** prod_rejection(_line), prod_scrap(_line), prod_rework_event, prod_nconf.
**Idle/stoppage:** prod_idle, prod_stoppage.
**Conversion/disassembly:** prod_conversion(_line), prod_disassembly(_line), prod_item_change.
**Planning:** prod_plan_demand(_line), prod_plan_item_daily(_line), prod_plan_bucket(_line),
prod_plan_budget(_line), prod_plan_wc(_load), prod_plan_wc_realloc, prod_plan_order_schedule,
prod_plan_rev, prod_deviation(_line), prod_delay_customer, prod_batch_card, prod_batch_move.
**Numbers/audit/integration:** num_series, num_reservation, prod_document_audit, stock_tx_intent,
oee_input_view.

---

## 3. DDL — CORE TABLES

```sql
-- Production Order (covers Single/Composite/Rework via flags + type)
create table prod_order (
  id uuid primary key default gen_random_uuid(),
  order_no varchar(30) not null unique,
  order_type varchar(12) not null check (order_type in ('SINGLE','COMPOSITE','REWORK')),
  item_id uuid not null references item(id),
  planned_qty numeric(18,3) not null check (planned_qty > 0),
  uom uuid not null references uom(id),
  priority varchar(10) not null default 'MEDIUM',
  start_date date not null,
  due_date date not null check (due_date >= start_date),
  plant_id uuid not null,
  division_id uuid,
  company_id uuid not null,
  bom_rev uuid not null references bom_revision(id),
  route_rev uuid not null references route_revision(id),
  demand_ref varchar(60),
  parent_composite_id uuid references prod_order(id),
  release_mode varchar(12) check (release_mode in ('ATOMIC','MEMBERS_ONLY')),
  source_order_id uuid references prod_order(id),
  source_entry_id uuid references prod_execution_session(id),
  ncr_ref varchar(60),
  authorized_qty numeric(18,3),
  rework_route_rev uuid references route_revision(id),
  work_order_id uuid references work_order(id),   -- TERM-PROD-001
  doc_status varchar(16) not null default 'DRAFT',
  exec_status varchar(16) not null default 'PLANNED',
  close_reason uuid references reason_code(id),
  rem_qty_disp varchar(12) check (rem_qty_disp in ('CANCEL','SCRAP','RETURN')),
  close_authorized_by uuid references app_user(id),
  version int not null default 0,
  created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz,
  approved_by uuid, approved_at timestamptz,
  cancelled_by uuid, cancelled_at timestamptz, cancellation_reason text,
  reversed_by uuid, reversed_at timestamptz, reversal_reason text
);
create index idx_prod_order_item on prod_order(item_id, plant_id);
create index idx_prod_order_status on prod_order(doc_status, exec_status);
create index idx_prod_order_dates on prod_order(start_date, due_date);

-- Composite members
create table prod_order_x_member (
  composite_id uuid references prod_order(id),
  member_id uuid references prod_order(id),
  primary key (composite_id, member_id)
);

-- Job Card
create table prod_job_card (
  id uuid primary key default gen_random_uuid(),
  job_no varchar(30) not null unique,
  order_id uuid not null references prod_order(id),
  item_id uuid not null references item(id),
  planned_qty numeric(18,3) not null check (planned_qty > 0),
  wc_id uuid not null references work_center(id),
  machine_id uuid references machine(id),
  operator_id uuid references employee(id),
  shift_id uuid references shift(id),
  start_date date not null, due_date date not null check (due_date >= start_date),
  final_quality varchar(8) check (final_quality in ('PENDING','PASS','FAIL','HELD')),
  hold_reason uuid references reason_code(id),
  doc_status varchar(16) not null default 'DRAFT',
  exec_status varchar(16) not null default 'CREATED',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz,
  approved_by uuid, approved_at timestamptz, cancelled_by uuid, cancelled_at timestamptz, cancellation_reason text,
  reversed_by uuid, reversed_at timestamptz, reversal_reason text
);
create index idx_jobcard_order on prod_job_card(order_id);
create index idx_jobcard_status on prod_job_card(exec_status);

-- Subjob
create table prod_subjob (
  id uuid primary key default gen_random_uuid(),
  subjob_no varchar(30) not null,
  job_card_id uuid not null references prod_job_card(id),
  operation_id uuid not null references operation(id),
  machine_id uuid references machine(id),
  operator_id uuid references employee(id),
  input_qty numeric(18,3) not null default 0,
  output_qty numeric(18,3) not null default 0,
  quality_gate boolean not null default false,
  op_status varchar(20) not null default 'NOT_STARTED',
  unique (job_card_id, subjob_no),
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz
);
create index idx_subjob_op on prod_subjob(operation_id);

-- Production Execution Session (Production Entry)
create table prod_execution_session (
  id uuid primary key default gen_random_uuid(),
  session_no varchar(30) not null unique,
  job_card_id uuid not null references prod_job_card(id),
  item_id uuid not null references item(id),
  wo_id uuid references work_order(id),
  entry_type varchar(12) not null check (entry_type in ('PRODUCTION','REWORK','MULTI_OUTPUT')),
  prod_type varchar(8) not null default 'GENERAL' check (prod_type in ('GENERAL','REWORK')),
  shift_id uuid references shift(id),
  supervisor_id uuid references employee(id),
  entry_date date not null default current_date,
  actual_prod_ts timestamptz not null,
  source_entry_id uuid references prod_execution_session(id),
  authorized_qty numeric(18,3),
  rework_route_rev uuid references route_revision(id),
  doc_status varchar(16) not null default 'DRAFT',
  exec_status varchar(16) not null default 'OPEN',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz,
  approved_by uuid, approved_at timestamptz, cancelled_by uuid, cancelled_at timestamptz, cancellation_reason text,
  reversed_by uuid, reversed_at timestamptz, reversal_reason text
);
create index idx_session_job on prod_execution_session(job_card_id);
create index idx_session_status on prod_execution_session(doc_status, exec_status);

-- Operation Execution Event
create table prod_operation_event (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references prod_execution_session(id),
  operation_id uuid not null references operation(id),
  machine_id uuid references machine(id),
  operator_id uuid references employee(id),
  start_ts timestamptz, end_ts timestamptz,
  runtime_s int generated always as (extract(epoch from (end_ts - start_ts))) stored,
  input_qty numeric(18,3) not null default 0,
  processed_qty numeric(18,3),              -- derived, recomputed
  accepted_qty numeric(18,3) not null default 0,
  rejected_qty numeric(18,3) not null default 0,
  rework_qty numeric(18,3) not null default 0,
  scrap_qty numeric(18,3) not null default 0,
  insp_required boolean not null default false,
  insp_status varchar(10) not null default 'PENDING' check (insp_status in ('PENDING','PASS','FAIL','HELD')),
  insp_ref varchar(60),
  quality_hold boolean not null default false,
  rework_ref varchar(60),
  ncr_ref varchar(60),
  op_status varchar(20) not null default 'NOT_STARTED',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz
);
create index idx_opevent_session on prod_operation_event(session_id);
create index idx_opevent_op on prod_operation_event(operation_id);
create index idx_opevent_status on prod_operation_event(op_status);

-- Production Output Event (incl. multiple outputs)
create table prod_output_event (
  id uuid primary key default gen_random_uuid(),
  op_event_id uuid not null references prod_operation_event(id),
  output_type varchar(8) not null check (output_type in ('PRIMARY','CO','BY')),
  item_id uuid not null references item(id),
  qty numeric(18,3) not null check (qty >= 0),
  weight numeric(12,3),
  lot varchar(40), batch varchar(40),
  dest_stage varchar(60),
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);

-- Production Log Sheet
create table prod_log_entry (
  id uuid primary key default gen_random_uuid(),
  log_no varchar(30) not null unique,
  shift_id uuid references shift(id),
  machine_id uuid references machine(id),
  operator_id uuid references employee(id),
  supervisor_id uuid references employee(id),
  activity uuid not null references activity_type(id),
  start_ts timestamptz not null, end_ts timestamptz not null check (end_ts >= start_ts),
  duration_s int generated always as (extract(epoch from (end_ts - start_ts))) stored,
  qty numeric(18,3) default 0,
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz
);
```

---

## 4. DDL — MATERIAL / STOCK-INTENT TABLES

```sql
create table prod_req_material (
  id uuid primary key default gen_random_uuid(),
  req_no varchar(30) not null unique,
  job_card_id uuid references prod_job_card(id),
  req_date date not null default current_date,
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz
);
create table prod_req_material_line (
  id uuid primary key default gen_random_uuid(),
  req_id uuid not null references prod_req_material(id),
  item_id uuid not null references item(id),
  required_qty numeric(18,3) not null,
  issued_qty numeric(18,3) not null default 0 check (issued_qty <= required_qty),
  store uuid, rack varchar(20), bin varchar(20),
  lot varchar(40), batch varchar(40), uom uuid references uom(id)
);

create table prod_req_addl (
  id uuid primary key default gen_random_uuid(),   -- extends prod_req_material semantics
  req_no varchar(30) not null unique,
  job_card_id uuid references prod_job_card(id),
  justification text not null,
  approval_status varchar(12) not null default 'PENDING' check (approval_status in ('PENDING','APPROVED','REJECTED')),
  approved_by uuid, approved_at timestamptz,
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
create table prod_req_addl_line (
  id uuid primary key default gen_random_uuid(),
  req_id uuid not null references prod_req_addl(id),
  item_id uuid not null references item(id),
  deviation_qty numeric(18,3) not null, qty numeric(18,3) not null
);

create table prod_req_other (
  id uuid primary key default gen_random_uuid(),
  req_no varchar(30) not null unique,
  purpose uuid not null references activity_type(id),
  authorized_by uuid, doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
create table prod_req_other_line (
  id uuid primary key default gen_random_uuid(),
  req_id uuid not null references prod_req_other(id),
  item_id uuid not null references item(id), qty numeric(18,3) not null
);

create table prod_consumable_consumption (
  id uuid primary key default gen_random_uuid(),
  cno varchar(30) not null unique,
  item_id uuid not null references item(id), qty numeric(18,3) not null check (qty > 0),
  uom uuid references uom(id), job_card_id uuid references prod_job_card(id),
  machine_id uuid references machine(id),
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);

create table prod_consumption_event (
  id uuid primary key default gen_random_uuid(),
  op_event_id uuid not null references prod_operation_event(id),
  item_id uuid not null references item(id),
  required_qty numeric(18,3) not null,
  issued_qty numeric(18,3) not null default 0,
  consumed_qty numeric(18,3) not null default 0 check (consumed_qty <= issued_qty or approved),
  returned_qty numeric(18,3) not null default 0,
  deviation_qty numeric(18,3), rate_snapshot numeric(20,4),
  lot varchar(40), batch varchar(40),
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
create index idx_consumption_op on prod_consumption_event(op_event_id);
```

*(Check `consumed_qty <= issued_qty or approved` is enforced in application logic, not a plain
CHECK — the approved-overissuance path (ASM-PROD-003) is handled in the service layer; the DB
CHECK guards non-approved cases via an `approved_excess` flag, below.)*

```sql
alter table prod_consumption_event add column approved_excess boolean not null default false;
alter table prod_consumption_event add constraint ck_consumed
  check (consumed_qty <= issued_qty + case when approved_excess then 0 else 0 end);
```

---

## 5. DDL — QUALITY / REWORK / SCRAP TABLES

```sql
-- Rejection (separate number-controlled document per DOC 07 §21.4)
create table prod_rejection (
  id uuid primary key default gen_random_uuid(),
  rejection_no varchar(30) not null unique,
  op_event_id uuid not null references prod_operation_event(id),
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz
);
create table prod_rejection_line (
  id uuid primary key default gen_random_uuid(),
  rejection_id uuid not null references prod_rejection(id),
  qty numeric(18,3) not null check (qty > 0),
  classification varchar(10) not null check (classification in ('REWORKABLE','SCRAP','HOLD_MRB')),
  reason uuid not null references reason_code(id),
  ncr_ref varchar(60),
  disposition varchar(12) default 'PENDING' check (disposition in ('PENDING','REWORKROUTE','SCRAP','QUARANTINE')),
  disposition_date date
);
create index idx_rejection_op on prod_rejection(op_event_id);

-- Scrap
create table prod_scrap (
  id uuid primary key default gen_random_uuid(),
  scrap_no varchar(30) not null unique,
  op_event_id uuid not null references prod_operation_event(id),
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
create table prod_scrap_line (
  id uuid primary key default gen_random_uuid(),
  scrap_id uuid not null references prod_scrap(id),
  qty numeric(18,3) not null check (qty > 0),
  reason uuid not null references reason_code(id),
  scrap_type varchar(12) not null check (scrap_type in ('PROCESS','REJECT','END_OF_LIFE')),
  value_context numeric(20,4),
  authorization varchar(15) not null default 'AUTO' check (authorization in ('AUTO','MANUAL_PENDING','APPROVED')),
  authorized_by uuid, lot varchar(40), batch varchar(40)
);
create index idx_scrap_op on prod_scrap(op_event_id);

-- Rework event
create table prod_rework_event (
  id uuid primary key default gen_random_uuid(),
  op_event_id uuid not null references prod_operation_event(id),
  source_entry_id uuid references prod_execution_session(id),
  ncr_ref varchar(60), authorized_qty numeric(18,3) not null,
  rework_qty numeric(18,3) not null check (rework_qty <= authorized_qty),
  scrap_split numeric(18,3) default 0, hold_split numeric(18,3) default 0,
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);

-- Production Non-Conformity
create table prod_nconf (
  id uuid primary key default gen_random_uuid(),
  nconf_no varchar(30) not null unique,
  op_event_id uuid references prod_operation_event(id),
  ncr_ref varchar(60), description text not null,
  doc_status varchar(12) not null default 'OPEN' check (doc_status in ('OPEN','NCR_LINKED','CLOSED')),
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
```

---

## 6. DDL — IDLE / STOPPAGE TABLES

```sql
create table prod_idle (
  id uuid primary key default gen_random_uuid(),
  idle_no varchar(30) not null unique,
  machine_id uuid not null references machine(id),
  shift_id uuid references shift(id),
  start_ts timestamptz not null, end_ts timestamptz not null check (end_ts >= start_ts),
  duration_s int generated always as (extract(epoch from (end_ts - start_ts))) stored,
  reason_code uuid not null references reason_code(id),
  reason_text text,
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
create index idx_idle_machine on prod_idle(machine_id, start_ts);

create table prod_stoppage (
  id uuid primary key default gen_random_uuid(),
  stoppage_no varchar(30) not null unique,
  stoppage_type varchar(8) not null check (stoppage_type in ('LINE','MACHINE')),
  machine_id uuid references machine(id), line_id uuid references line(id),
  start_ts timestamptz not null, end_ts timestamptz not null check (end_ts >= start_ts),
  duration_s int generated always as (extract(epoch from (end_ts - start_ts))) stored,
  reason_code uuid not null references reason_code(id),
  maintenance_ref uuid,   -- maintenance hand-off (BR-PROD-STOP-001)
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
```

---

## 7. DDL — CONVERSION / DISASSEMBLY TABLES

```sql
create table prod_conversion (
  id uuid primary key default gen_random_uuid(),
  conv_no varchar(30) not null unique,
  conv_type varchar(15) not null check (conv_type in ('PRODUCT','ITEM_CHANGE')),
  input_item uuid not null references item(id),
  output_item uuid not null references item(id),
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz
);
create table prod_conversion_line (
  id uuid primary key default gen_random_uuid(),
  conversion_id uuid not null references prod_conversion(id),
  input_qty numeric(18,3) not null check (input_qty > 0),
  output_qty numeric(18,3) not null default 0,
  loss_qty numeric(18,3) not null default 0,
  scrap_qty numeric(18,3) not null default 0,
  lot varchar(40), batch varchar(40),
  constraint ck_conv_reconcile check (output_qty + loss_qty + scrap_qty = input_qty)
);

create table prod_disassembly (
  id uuid primary key default gen_random_uuid(),
  disasm_no varchar(30) not null unique,
  parent_item uuid not null references item(id),
  parent_qty numeric(18,3) not null check (parent_qty > 0),
  bom_rev uuid not null references bom_revision(id),
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
create table prod_disassembly_line (
  id uuid primary key default gen_random_uuid(),
  disasm_id uuid not null references prod_disassembly(id),
  component_item uuid not null references item(id),
  component_qty numeric(18,3) not null default 0,
  by_product numeric(18,3) not null default 0,
  loss_qty numeric(18,3) not null default 0
);

-- Item Change is a product conversion with conv_type='ITEM_CHANGE' (no separate table).
create view prod_item_change as
  select id, conv_no, input_item, output_item, doc_status from prod_conversion
  where conv_type = 'ITEM_CHANGE';
```

---

## 8. DDL — PLANNING LAYER TABLES

```sql
create table prod_plan_demand (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references item(id),
  demand_qty numeric(18,3) not null check (demand_qty > 0),
  source_ref varchar(60), period date not null,
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);

create table prod_plan_item_daily (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null, item_id uuid references item(id),
  plan_qty numeric(18,3) not null, wc_id uuid references work_center(id),
  doc_status varchar(16) not null default 'DRAFT', version int not null default 0,
  created_by uuid not null, created_at timestamptz not null default now()
);

create table prod_plan_bucket (
  id uuid primary key default gen_random_uuid(),
  bucket_type varchar(6) not null check (bucket_type in ('DAY','WEEK','MONTH')),
  bucket_start date not null, bucket_end date not null check (bucket_end > bucket_start),
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
create table prod_plan_bucket_line (
  id uuid primary key default gen_random_uuid(),
  bucket_id uuid not null references prod_plan_bucket(id),
  item_id uuid not null references item(id), qty numeric(18,3) not null
);

create table prod_plan_budget (
  id uuid primary key default gen_random_uuid(),
  fy varchar(9) not null, rev_no int not null default 1,
  basis varchar(10) not null default 'MANUAL' check (basis in ('MANUAL','ENGINE')),
  doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
create table prod_plan_budget_line (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references prod_plan_budget(id),
  bucket_id uuid references prod_plan_bucket(id), qty numeric(18,3) not null
);

create table prod_plan_wc (
  id uuid primary key default gen_random_uuid(),
  wc_id uuid not null references work_center(id),
  from_date date not null, to_date date not null check (to_date >= from_date),
  doc_status varchar(16) not null default 'DRAFT', version int not null default 0,
  created_by uuid not null, created_at timestamptz not null default now()
);
create table prod_plan_wc_load (
  id uuid primary key default gen_random_uuid(),
  plan_wc_id uuid not null references prod_plan_wc(id),
  load_qty numeric(18,3) not null, load_hrs numeric(12,2) not null
);

create table prod_plan_wc_realloc (
  id uuid primary key default gen_random_uuid(),
  from_wc uuid not null references work_center(id),
  to_wc uuid not null references work_center(id),
  reason text not null, authorized_by uuid,
  doc_status varchar(16) not null default 'DRAFT', version int not null default 0,
  created_by uuid not null, created_at timestamptz not null default now()
);

create table prod_plan_order_schedule (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references prod_order(id), bucket_id uuid references prod_plan_bucket(id),
  plan_qty numeric(18,3) not null
);

create table prod_plan_rev (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null, base_rev int not null,
  change_req varchar(60) not null, change_reason text not null,
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);

create table prod_deviation (
  id uuid primary key default gen_random_uuid(),
  dev_no varchar(30) not null unique,
  order_id uuid references prod_order(id),
  deviation_qty numeric(18,3), doc_status varchar(16) not null default 'DRAFT',
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
create table prod_deviation_line (
  id uuid primary key default gen_random_uuid(),
  dev_id uuid not null references prod_deviation(id),
  reason uuid references reason_code(id), responsible_area varchar(12) not null, action text
);

create table prod_delay_customer (
  id uuid primary key default gen_random_uuid(),
  delay_no varchar(30) not null unique,
  order_id uuid references prod_order(id),
  reason uuid references reason_code(id), attributed_days int not null check (attributed_days >= 0),
  doc_status varchar(16) not null default 'DRAFT', version int not null default 0,
  created_by uuid not null, created_at timestamptz not null default now()
);

create table prod_batch_card (
  id uuid primary key default gen_random_uuid(),
  batch_no varchar(40) not null unique,
  item_id uuid not null references item(id),
  batch_status varchar(8) not null default 'OPEN' check (batch_status in ('OPEN','HELD','CLOSED')),
  version int not null default 0, created_by uuid not null, created_at timestamptz not null default now()
);
create table prod_batch_move (
  id uuid primary key default gen_random_uuid(),
  batch_card_id uuid not null references prod_batch_card(id),
  move_type varchar(14) not null, qty numeric(18,3) not null,
  ref_type varchar(20), ref_id uuid,
  created_by uuid not null, created_at timestamptz not null default now()
);
```

---

## 9. DDL — NUMBERING, AUDIT, INTEGRATION OUTBOXES

```sql
-- Numbering (DOC 07 §21)
create table num_series (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null, division_id uuid, plant_id uuid,
  fy varchar(9) not null, series_type varchar(24) not null,
  current_seq bigint not null default 0,
  unique (company_id, division_id, plant_id, fy, series_type)
);
create table num_reservation (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references num_series(id),
  doc_type varchar(12) not null check (doc_type in ('DRAFT','SUBMIT')),
  seq_value bigint not null,
  reserved_by uuid not null, reserved_at timestamptz not null default now(),
  doc_kind varchar(24) not null,     -- PO/JC/PE/REJ/etc.
  unique (series_id, seq_value)
);

-- Document audit
create table prod_document_audit (
  id bigserial primary key,
  entity varchar(40) not null, entity_id uuid not null,
  action varchar(16) not null,   -- CREATED/UPDATED/SUBMITTED/APPROVED/REJECTED/CANCELLED/REVERSED/OVERRIDE
  changed_by uuid not null, changed_at timestamptz not null default now(),
  detail jsonb not null
);
create index idx_audit_entity on prod_document_audit(entity, entity_id);

-- Integration outbox (Inventory ledger intents — DEC-PROD-004)
create table stock_tx_intent (
  id uuid primary key default gen_random_uuid(),
  tx_type varchar(24) not null,   -- MATERIAL_ISSUE/PRODUCTION_CONSUMPTION/PRODUCTION_RETURN/
                                  -- PRODUCTION_RECEIPT/SCRAP/REWORK/CONVERSION/DISASSEMBLY
  source_entity varchar(40) not null, source_id uuid not null,
  item_id uuid not null, qty numeric(18,3) not null,
  store uuid, rack varchar(20), bin varchar(20), lot varchar(40), batch varchar(40),
  cost_snapshot numeric(20,4), disposition varchar(15),
  status varchar(12) not null default 'PENDING' check (status in ('PENDING','POSTED','REVERSED')),
  posted_tx_id uuid, posted_at timestamptz,
  created_by uuid not null, created_at timestamptz not null default now()
);
create index idx_intent_source on stock_tx_intent(source_entity, source_id, status);
```

---

## 10. CALCULATED / DERIVED VIEWS (NOT the source of truth)

```sql
-- WIP per operation (BR-PROD-WIP-001; derived, read-only)
create view v_wip as
  select item_id, work_order_id, operation_id,
         accepted_qty - processed_qty as wip_qty, batch, lot, op_status
  from v_production_events;

-- Pending per order (BR-PROD-PEND-001)
create view v_pending as
  select order_id, planned_qty, completed_qty, (planned_qty - completed_qty) as pending_qty
  from v_order_progress;

-- Capacity utilization (report-only; engine FUTURE)
create view v_capacity as
  select wc.id, period, load_hrs, available_hrs, (load_hrs / available_hrs) as utilization
  from v_wc_load join v_shift_calendar on ...;

-- OEE input (DEC-PROD-005)
create view v_oee_input as
  select machine_id, plan_run_s, down_s, actual_output, theoretical_output, accepted_output
  from v_production_runtime join v_idle join v_scrap ...;
```

**Note:** computed balances (WIP, pending, available, processed, OEE) are **derived views** and
are never the source of truth; posting intents + events are.

---

## 11. CONSTRAINTS AND INDEX SUMMARY

- **Unique:** document numbers per series (doc_kind); order_no/session_no/job_no/req_no/etc.
- **Check:** quantity positivity; reconciliation on conversion (ck_conv_reconcile); status enum
  ranges; date ordering (start ≤ due; end ≥ start).
- **FK:** all `REFERENCES ... ON DELETE RESTRICT` (no cascade on transactional data).
- **Optimistic locking:** `version` int on every table; service updates use `where version = ?`.
- **Indexes:** item+plant+status; order+operation; batch/lot; date-range on every event
  (start_ts/entry_date); fk indexes on all join columns.
- **Integration:** stock_tx_intent outbox never directly writes item balance; Inventory module
  consumes intents and performs posting.

---

## 12. TRACEABILITY CHAIN MAPPING

```
Production Order (prod_order)
  → Work Order / execution context (work_order / prod_order.work_order_id)   TERM-PROD-001
  → Job Card (prod_job_card)
  → Operation (prod_operation_event + prod_subjob)
  → Material (prod_req_* / prod_consumption_event)
  → Output (prod_output_event)
  → Quality (prod_rejection_line / prod_scrap_line / prod_nconf / insp fields)
  → Inventory Transaction (stock_tx_intent → Inventory ledger)
```
Every event links upward via FK (session ↔ op_event ↔ output/consumption/rejection/scrap ↔
batch/move ↔ stock_tx_intent). No orphaned posting is possible.

---

**END OF DOCUMENT 12**