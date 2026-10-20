-- Preserve legacy PROCESSING rows for operator reconciliation; do not invent a lease.
ALTER TABLE CONTENT_JOBS ADD COLUMN lease_expires_at DATETIME(3) NULL;
