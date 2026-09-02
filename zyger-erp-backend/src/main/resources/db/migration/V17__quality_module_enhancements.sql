-- Migration for Quality Module Enhancements (CNC Precision Manufacturing)

ALTER TABLE quality_inspection_line ADD COLUMN IF NOT EXISTS balloon_no VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_qil_balloon ON quality_inspection_line(balloon_no);
CREATE INDEX IF NOT EXISTS idx_qci_due_date ON quality_calibration_instrument(next_due_date, status);
