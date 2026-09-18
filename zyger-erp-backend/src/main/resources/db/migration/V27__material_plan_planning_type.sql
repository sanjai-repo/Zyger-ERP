ALTER TABLE public.material_plan ADD COLUMN IF NOT EXISTS planning_type varchar(40) DEFAULT 'ALL';
ALTER TABLE public.material_plan ADD COLUMN IF NOT EXISTS run_mode varchar(20) DEFAULT 'RUN';
