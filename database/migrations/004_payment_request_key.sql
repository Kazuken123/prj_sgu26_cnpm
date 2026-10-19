-- Existing payments retain NULL; only hashes of new request keys are stored.
ALTER TABLE PAYMENTS
    ADD COLUMN request_key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD UNIQUE KEY uq_payments_request_key_hash (request_key_hash);
