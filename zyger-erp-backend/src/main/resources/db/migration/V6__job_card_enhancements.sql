-- V6__job_card_enhancements.sql

-- Add new columns to job_card for completion tracking
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS completion_status VARCHAR(30);
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS release_remarks VARCHAR(500);
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS complete_remarks VARCHAR(500);
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS hold_reason VARCHAR(255);
