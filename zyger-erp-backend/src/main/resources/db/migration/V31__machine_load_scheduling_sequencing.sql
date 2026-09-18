-- Planning Module Phase 4: Machine Load per-operation scheduling, sequencing and capacity (FRS §8/§19)

ALTER TABLE machine_load_line ADD COLUMN item_code VARCHAR(60);
ALTER TABLE machine_load_line ADD COLUMN item_name VARCHAR(200);
ALTER TABLE machine_load_line ADD COLUMN process_name VARCHAR(200);
ALTER TABLE machine_load_line ADD COLUMN process_qty NUMERIC(38,6);
ALTER TABLE machine_load_line ADD COLUMN process_time_hrs NUMERIC(12,4);
ALTER TABLE machine_load_line ADD COLUMN previous_process_end TIMESTAMP;
ALTER TABLE machine_load_line ADD COLUMN start_time TIMESTAMP;
ALTER TABLE machine_load_line ADD COLUMN end_time TIMESTAMP;
ALTER TABLE machine_load_line ADD COLUMN total_time_sec BIGINT;
ALTER TABLE machine_load_line ADD COLUMN operator_code VARCHAR(60);
ALTER TABLE machine_load_line ADD COLUMN tool_code VARCHAR(60);