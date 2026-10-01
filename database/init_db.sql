-- =====================================================================
-- DATABASE: He Thong Du Lich Am Thuc Co Thuyet Minh Da Ngon Ngu
-- =====================================================================
-- Đảm bảo hỗ trợ Tiếng Việt
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0; -- Tạm tắt kiểm tra khóa ngoại để xóa bảng cho nhanh

-- Xóa các bảng cũ nếu đã tồn tại (Xóa theo thứ tự: Con -> Cha)
DROP TABLE IF EXISTS DISH_TRANSLATIONS;
DROP TABLE IF EXISTS DISHES;
DROP TABLE IF EXISTS AUDIOS;
DROP TABLE IF EXISTS POI_TRANSLATIONS;
DROP TABLE IF EXISTS REVIEWS;
DROP TABLE IF EXISTS POI_EDIT_REQUESTS;
DROP TABLE IF EXISTS POI_IMAGES;
DROP TABLE IF EXISTS POI_CATEGORIES;
DROP TABLE IF EXISTS POIS;
DROP TABLE IF EXISTS CATEGORIES;
DROP TABLE IF EXISTS AUDIT_LOGS;
DROP TABLE IF EXISTS OWNER_REQUESTS;
DROP TABLE IF EXISTS USERS;
DROP TABLE IF EXISTS LANGUAGES;

SET FOREIGN_KEY_CHECKS = 1; -- Bật lại kiểm tra khóa ngoại


-- 1. Bảng Ngôn ngữ 
CREATE TABLE LANGUAGES (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    is_active TINYINT(1) DEFAULT 1
);

-- 2. Bảng Người dùng
CREATE TABLE USERS (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone_number VARCHAR(20),
    role ENUM('TOURIST', 'OWNER', 'ADMIN') NOT NULL DEFAULT 'TOURIST',
    preferred_language VARCHAR(10) DEFAULT 'vi',
    failed_login_count INT DEFAULT 0,
    locked_until DATETIME,
    status ENUM('ACTIVE', 'PENDING', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (preferred_language) REFERENCES LANGUAGES(code)
);

-- 3. Bảng Yêu cầu trở thành Chủ quán
CREATE TABLE OWNER_REQUESTS (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    restaurant_name VARCHAR(255) NOT NULL,
    restaurant_address VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    reviewed_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES USERS(user_id) ON DELETE SET NULL
);

-- 4. Bảng Nhật ký hệ thống
CREATE TABLE AUDIT_LOGS (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE SET NULL
);
CREATE INDEX idx_audit_logs_created_at ON AUDIT_LOGS(created_at);

-- 5. Bảng Danh mục
CREATE TABLE CATEGORIES (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng Địa điểm (Points of Interest)

CREATE TABLE POIS (
    poi_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    trigger_radius INT DEFAULT 50,
    opening_hours VARCHAR(100),
    avatar_url VARCHAR(500),
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES USERS(user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_pois_lat_lng ON POIS(latitude, longitude);

-- 7. Bảng Liên kết Địa điểm & Danh mục (N-N)
CREATE TABLE POI_CATEGORIES (
    poi_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (poi_id, category_id),
    FOREIGN KEY (poi_id) REFERENCES POIS(poi_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES CATEGORIES(category_id) ON DELETE CASCADE
);

-- 8. Bảng Hình ảnh Địa điểm
CREATE TABLE POI_IMAGES (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    caption VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poi_id) REFERENCES POIS(poi_id) ON DELETE CASCADE
);

-- 9. [MOI] Bảng Yêu cầu chỉnh sửa Địa điểm
CREATE TABLE POI_EDIT_REQUESTS (
    edit_id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT NOT NULL,
    name VARCHAR(255),
    address VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    trigger_radius INT,
    opening_hours VARCHAR(100),
    avatar_url VARCHAR(500),
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    reviewed_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (poi_id) REFERENCES POIS(poi_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES USERS(user_id) ON DELETE SET NULL
);

-- 10. Bảng Đánh giá
CREATE TABLE REVIEWS (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    poi_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (poi_id) REFERENCES POIS(poi_id) ON DELETE CASCADE,
    UNIQUE (user_id, poi_id)
);

-- 11. Bảng Bản dịch Địa điểm
CREATE TABLE POI_TRANSLATIONS (
    translation_id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    audio_script TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (poi_id) REFERENCES POIS(poi_id) ON DELETE CASCADE,
    FOREIGN KEY (language_code) REFERENCES LANGUAGES(code) ON DELETE CASCADE,
    UNIQUE (poi_id, language_code)
);

-- 12. Bảng Audio

CREATE TABLE AUDIOS (
    audio_id INT AUTO_INCREMENT PRIMARY KEY,
    translation_id INT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    duration INT,
    file_size INT,
    status ENUM('PENDING', 'AVAILABLE', 'FAILED') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (translation_id) REFERENCES POI_TRANSLATIONS(translation_id) ON DELETE CASCADE,
    UNIQUE (translation_id)
);

-- 13. Bảng Món ăn
CREATE TABLE DISHES (
    dish_id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12,2),
    image_url VARCHAR(500),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poi_id) REFERENCES POIS(poi_id) ON DELETE CASCADE
);

-- 14. Bảng Bản dịch Món ăn
CREATE TABLE DISH_TRANSLATIONS (
    translation_id INT AUTO_INCREMENT PRIMARY KEY,
    dish_id INT NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    FOREIGN KEY (dish_id) REFERENCES DISHES(dish_id) ON DELETE CASCADE,
    FOREIGN KEY (language_code) REFERENCES LANGUAGES(code) ON DELETE CASCADE,
    UNIQUE (dish_id, language_code)
);

-- =====================================================================
-- DU LIEU MAU (seed) - de nhom co san du lieu chay demo ngay, khong
-- phai tu tay nhap moi lan cai lai database.
-- =====================================================================

INSERT INTO LANGUAGES (code, name, is_active) VALUES
    ('vi', 'Tiếng Việt', 1),
    ('en', 'English', 1);

INSERT INTO USERS (email, password_hash, full_name, role, preferred_language, status) VALUES
    ('admin@foodtour.com', '$2b$12$replace_with_real_bcrypt_hash', 'Admin Hệ Thống', 'ADMIN', 'vi', 'ACTIVE');

INSERT INTO CATEGORIES (name, description) VALUES
    ('Món nước', 'Phở, bún, hủ tiếu...'),
    ('Đồ nướng', 'Các món nướng, BBQ'),
    ('Đồ uống', 'Cà phê, trà, nước ép');