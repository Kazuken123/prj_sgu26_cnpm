-- MySQL 8.0.16+; target schema described in Chapter 4.
-- Run against an EMPTY database selected by the operator.
-- No DROP TABLE, CREATE DATABASE, or migration of the legacy schema.
-- Application connections must also use UTC and utf8mb4.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE LANGUAGES (
    code VARCHAR(10) NOT NULL,
    name VARCHAR(50) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (code),
    CONSTRAINT chk_languages_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE USERS (
    user_id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NULL,
    phone_number VARCHAR(20) NULL,
    role ENUM('STAFF', 'ADMIN') NOT NULL,
    preferred_language VARCHAR(10) NULL DEFAULT 'vi',
    failed_login_count INT NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    status ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email),
    CONSTRAINT chk_users_failed_login_count CHECK (failed_login_count >= 0),
    CONSTRAINT fk_users_language FOREIGN KEY (preferred_language)
        REFERENCES LANGUAGES(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE REFRESH_TOKENS (
    token_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id CHAR(36) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (token_id),
    UNIQUE KEY uq_refresh_tokens_session (session_id),
    UNIQUE KEY uq_refresh_tokens_hash (token_hash),
    KEY idx_refresh_tokens_user (user_id),
    KEY idx_refresh_tokens_expiry (expires_at),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id)
        REFERENCES USERS(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE AUDIT_LOGS (
    log_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NULL,
    resource_id VARCHAR(50) NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id),
    KEY idx_audit_logs_user (user_id),
    KEY idx_audit_logs_created_at (created_at),
    KEY idx_audit_logs_action (action),
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id)
        REFERENCES USERS(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE VISIT_SESSIONS (
    session_id CHAR(36) NOT NULL,
    created_by INT NULL,
    status ENUM('PENDING', 'ACTIVE', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    token_hash CHAR(64) NULL,
    activated_at DATETIME NULL,
    expires_at DATETIME NULL,
    reissue_count INT NOT NULL DEFAULT 0 COMMENT 'Used only for the Could Have token reissue feature',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id),
    UNIQUE KEY uq_visit_sessions_token_hash (token_hash),
    KEY idx_visit_sessions_created_by (created_by),
    KEY idx_visit_sessions_status (status),
    KEY idx_visit_sessions_expiry (expires_at),
    CONSTRAINT chk_visit_sessions_reissue_count CHECK (reissue_count >= 0),
    CONSTRAINT fk_visit_sessions_creator FOREIGN KEY (created_by)
        REFERENCES USERS(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE PAYMENTS (
    payment_id BIGINT NOT NULL AUTO_INCREMENT,
    session_id CHAR(36) NOT NULL,
    payment_ref VARCHAR(100) NOT NULL,
    confirmed_by INT NULL,
    payment_method ENUM('ONLINE', 'CASH') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    status ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
    paid_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    UNIQUE KEY uq_payments_session (session_id),
    UNIQUE KEY uq_payments_reference (payment_ref),
    KEY idx_payments_confirmed_by (confirmed_by),
    KEY idx_payments_status (status),
    KEY idx_payments_paid_at (paid_at),
    CONSTRAINT chk_payments_amount CHECK (amount > 0),
    CONSTRAINT fk_payments_session FOREIGN KEY (session_id)
        REFERENCES VISIT_SESSIONS(session_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_confirmer FOREIGN KEY (confirmed_by)
        REFERENCES USERS(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE POIS (
    poi_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    trigger_radius INT NOT NULL DEFAULT 50,
    avatar_url VARCHAR(500) NULL,
    display_order INT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'INACTIVE',
    content_version INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (poi_id),
    CONSTRAINT chk_pois_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_pois_longitude CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT chk_pois_radius CHECK (trigger_radius > 0),
    CONSTRAINT chk_pois_display_order CHECK (display_order >= 0),
    CONSTRAINT chk_pois_version CHECK (content_version > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE POI_TRANSLATIONS (
    translation_id INT NOT NULL AUTO_INCREMENT,
    poi_id INT NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    name VARCHAR(255) NULL,
    description TEXT NULL,
    audio_script TEXT NULL,
    source_version INT NOT NULL,
    status ENUM('PENDING', 'READY', 'FAILED') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (translation_id),
    UNIQUE KEY uq_poi_translations_language (poi_id, language_code),
    KEY idx_poi_translations_language (language_code),
    CONSTRAINT chk_poi_translations_version CHECK (source_version > 0),
    CONSTRAINT fk_poi_translations_poi FOREIGN KEY (poi_id)
        REFERENCES POIS(poi_id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_translations_language FOREIGN KEY (language_code)
        REFERENCES LANGUAGES(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE AUDIOS (
    audio_id INT NOT NULL AUTO_INCREMENT,
    translation_id INT NOT NULL,
    file_url VARCHAR(500) NULL,
    duration INT NULL,
    file_size BIGINT NULL,
    source_version INT NOT NULL,
    status ENUM('PENDING', 'AVAILABLE', 'FAILED') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (audio_id),
    UNIQUE KEY uq_audios_translation (translation_id),
    CONSTRAINT chk_audios_duration CHECK (duration >= 0),
    CONSTRAINT chk_audios_file_size CHECK (file_size >= 0),
    CONSTRAINT chk_audios_version CHECK (source_version > 0),
    CONSTRAINT fk_audios_translation FOREIGN KEY (translation_id)
        REFERENCES POI_TRANSLATIONS(translation_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE CONTENT_JOBS (
    job_id BIGINT NOT NULL AUTO_INCREMENT,
    poi_id INT NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    source_version INT NOT NULL,
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    error_message TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (job_id),
    UNIQUE KEY uq_content_jobs_source (poi_id, language_code, source_version),
    KEY idx_content_jobs_language (language_code),
    KEY idx_content_jobs_status_updated (status, updated_at),
    CONSTRAINT chk_content_jobs_version CHECK (source_version > 0),
    CONSTRAINT fk_content_jobs_poi FOREIGN KEY (poi_id)
        REFERENCES POIS(poi_id) ON DELETE CASCADE,
    CONSTRAINT fk_content_jobs_language FOREIGN KEY (language_code)
        REFERENCES LANGUAGES(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE TOURS (
    tour_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (tour_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE TOUR_POIS (
    tour_id INT NOT NULL,
    poi_id INT NOT NULL,
    sequence_no INT NOT NULL,
    PRIMARY KEY (tour_id, poi_id),
    UNIQUE KEY uq_tour_pois_sequence (tour_id, sequence_no),
    KEY idx_tour_pois_poi (poi_id),
    CONSTRAINT chk_tour_pois_sequence CHECK (sequence_no > 0),
    CONSTRAINT fk_tour_pois_tour FOREIGN KEY (tour_id)
        REFERENCES TOURS(tour_id) ON DELETE CASCADE,
    CONSTRAINT fk_tour_pois_poi FOREIGN KEY (poi_id)
        REFERENCES POIS(poi_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE KNOWLEDGE_DOCUMENTS (
    document_id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    source TEXT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'INACTIVE',
    content_version INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id),
    CONSTRAINT chk_knowledge_documents_version CHECK (content_version > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE KNOWLEDGE_CHUNKS (
    chunk_id BIGINT NOT NULL AUTO_INCREMENT,
    document_id INT NOT NULL,
    chunk_text TEXT NOT NULL,
    source_version INT NOT NULL,
    embedding JSON NOT NULL,
    embedding_model VARCHAR(100) NOT NULL,
    PRIMARY KEY (chunk_id),
    KEY idx_knowledge_chunks_document_version (document_id, source_version),
    CONSTRAINT chk_knowledge_chunks_version CHECK (source_version > 0),
    CONSTRAINT chk_knowledge_chunks_embedding CHECK (JSON_TYPE(embedding) = 'ARRAY'),
    CONSTRAINT fk_knowledge_chunks_document FOREIGN KEY (document_id)
        REFERENCES KNOWLEDGE_DOCUMENTS(document_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE CHAT_LOGS (
    chat_log_id BIGINT NOT NULL AUTO_INCREMENT,
    session_id CHAR(36) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NULL,
    sources JSON NULL,
    status ENUM('SUCCESS', 'NO_CONTEXT', 'FAILED') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_log_id),
    KEY idx_chat_logs_session_created (session_id, created_at),
    KEY idx_chat_logs_created_at (created_at),
    CONSTRAINT fk_chat_logs_session FOREIGN KEY (session_id)
        REFERENCES VISIT_SESSIONS(session_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE BUNDLE_ACCESS_LOGS (
    access_id BIGINT NOT NULL AUTO_INCREMENT,
    session_id CHAR(36) NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (access_id),
    KEY idx_bundle_access_session_created (session_id, created_at),
    KEY idx_bundle_access_language_created (language_code, created_at),
    CONSTRAINT fk_bundle_access_session FOREIGN KEY (session_id)
        REFERENCES VISIT_SESSIONS(session_id) ON DELETE RESTRICT,
    CONSTRAINT fk_bundle_access_language FOREIGN KEY (language_code)
        REFERENCES LANGUAGES(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Minimal reference data only; this is not the complete multilingual acceptance dataset.
INSERT INTO LANGUAGES (code, name, is_active) VALUES
    ('vi', 'Tiếng Việt', 1),
    ('en', 'English', 1);

-- Service-layer responsibilities (not implemented by this DDL):
-- 1. Normalize email, hash passwords/tokens, and enforce role permissions.
-- 2. Verify payment callbacks; atomically mark PAID and activate the visit session.
-- 3. Enforce session lifetime, token exchange/reissue, and Redis rate limits.
-- 4. Validate READY text, AVAILABLE media, and current source versions.
-- 5. Claim/retry jobs atomically; prevent stale workers from overwriting newer data.
-- 6. Update Vietnamese names consistently and tour order transactionally.
-- 7. Publish complete current knowledge chunks with compatible numeric embeddings.
-- 8. Write audit logs without secrets and aggregate usage with defined semantics.
