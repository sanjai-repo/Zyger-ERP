--
-- V21__inventory_dashboard_reorder_fields.sql
-- Inventory Dashboard & Report redesign — supplementary replenishment fields.
--
--   item_master.reorder_qty          quantities that drive the Low Stock Alert
--                                    panel's "Suggested Order" (reorderQty ?? max
--                                    - reorderPoint fallback used at runtime)
--   store_master.reorder_buffer_pct  per-store yellow band above reorder point
--                                    (default 20% when NULL)
--
-- SAFETY:
--   - Idempotent (IF NOT EXISTS / guarded UPDATE) — safe for the dev profile,
--     which also runs Hibernate ddl-auto=update on the same tables.
--   - No table drop, no data rewrites.
--
ALTER TABLE public.item_master ADD COLUMN IF NOT EXISTS reorder_qty numeric(12,4);
ALTER TABLE public.store_master ADD COLUMN IF NOT EXISTS reorder_buffer_pct numeric(5,2);
UPDATE public.store_master SET reorder_buffer_pct = 0.20 WHERE reorder_buffer_pct IS NULL;