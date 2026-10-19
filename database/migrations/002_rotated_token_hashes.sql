-- Only hashes are retained, and only for revoking the same session.
-- db:migrate checks for this column before running this statement.
ALTER TABLE REFRESH_TOKENS ADD COLUMN rotated_token_hashes JSON NULL;
