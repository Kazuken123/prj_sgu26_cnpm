CREATE TABLE IF NOT EXISTS ANALYTICS_META (
  singleton TINYINT PRIMARY KEY,
  started_at DATETIME(3) NOT NULL
);
INSERT IGNORE INTO ANALYTICS_META(singleton, started_at) VALUES (1, UTC_TIMESTAMP(3));
CREATE TABLE IF NOT EXISTS ANALYTICS_SESSIONS (
  session_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  created_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  last_received_at DATETIME(3) NULL,
  presence_id BIGINT NULL,
  poi_visit_id BIGINT NULL
);
CREATE TABLE IF NOT EXISTS ANALYTICS_PRESENCE (
  presence_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT NOT NULL,
  started_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  INDEX idx_presence_start(started_at),
  INDEX idx_presence_end(ends_at),
  FOREIGN KEY(session_id) REFERENCES ANALYTICS_SESSIONS(session_id)
);
CREATE TABLE IF NOT EXISTS ANALYTICS_POI_VISITS (
  visit_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT NOT NULL,
  poi_id INT NOT NULL,
  entered_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  confirmed_at DATETIME(3) NULL,
  INDEX idx_poi_visit_confirmed(confirmed_at, poi_id, session_id),
  FOREIGN KEY(session_id) REFERENCES ANALYTICS_SESSIONS(session_id),
  FOREIGN KEY(poi_id) REFERENCES POIS(poi_id)
);
