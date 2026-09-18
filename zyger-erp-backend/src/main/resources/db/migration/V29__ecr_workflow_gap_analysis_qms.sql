-- Planning Module Phase 2: ECR workflow hardening + Gap Analysis QMS clause-mode (FRS §9.1/§9.2/§21)

-- ECR: workflow milestone stamps + ECO revision-cascade targets
ALTER TABLE engineering_change ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE engineering_change ADD COLUMN implemented_at TIMESTAMP;
ALTER TABLE engineering_change ADD COLUMN new_bom_id BIGINT;
ALTER TABLE engineering_change ADD COLUMN new_route_id BIGINT;

-- Gap Analysis: QMS clause-mode discriminator
ALTER TABLE gap_analysis_run ADD COLUMN run_mode VARCHAR(20);
ALTER TABLE gap_analysis_run ADD COLUMN standard_ref VARCHAR(100);

-- Gap Analysis: clause-level compliance fields (drives the QMS run)
ALTER TABLE gap_analysis_result ADD COLUMN clause_no VARCHAR(20);
ALTER TABLE gap_analysis_result ADD COLUMN clause_text VARCHAR(1000);
ALTER TABLE gap_analysis_result ADD COLUMN compliance_status VARCHAR(20);
ALTER TABLE gap_analysis_result ADD COLUMN reference_doc VARCHAR(200);
ALTER TABLE gap_analysis_result ADD COLUMN procedure_ref VARCHAR(200);
ALTER TABLE gap_analysis_result ADD COLUMN change_category VARCHAR(60);
ALTER TABLE gap_analysis_result ADD COLUMN gap_description VARCHAR(500);