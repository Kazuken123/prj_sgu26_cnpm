-- Existing jobs retain NULL. Run before using claim-aware workers/retry.
-- A claim identifies one processing attempt; it is not a visitor access token.
ALTER TABLE CONTENT_JOBS
    ADD COLUMN claim_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL;
