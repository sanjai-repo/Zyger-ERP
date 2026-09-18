ALTER TABLE public.engineering_change ADD COLUMN IF NOT EXISTS gap_analysis_run_id bigint;

CREATE TABLE IF NOT EXISTS public.ecr_risk_line (
    id bigserial PRIMARY KEY,
    engineering_change_id bigint NOT NULL REFERENCES public.engineering_change(id),
    identified_risk varchar(500),
    risk_level varchar(20),
    remarks varchar(500),
    created_at timestamp
);
