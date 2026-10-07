-- Nâng cấp database đã có; không xóa dữ liệu người dùng.
CREATE TABLE IF NOT EXISTS REFRESH_TOKENS (
    token_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id CHAR(36) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    token_hash CHAR(64) UNIQUE NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    INDEX idx_refresh_tokens_expiry (expires_at),
    INDEX idx_refresh_tokens_user (user_id)
);
