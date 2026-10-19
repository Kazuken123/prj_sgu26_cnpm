-- Run via db:migrate: checks each column, then executes statements separately.
-- Existing rows stay unclassified (NULL), rather than being labelled ANIMAL.
ALTER TABLE POIS ADD COLUMN category ENUM('ANIMAL', 'PLANT', 'HERITAGE', 'AMENITY') NULL DEFAULT NULL;
ALTER TABLE POIS ADD COLUMN conservation_status VARCHAR(100) NULL;
ALTER TABLE POIS ADD COLUMN activity_hours VARCHAR(100) NULL;
ALTER TABLE POIS ALTER COLUMN category SET DEFAULT 'ANIMAL';
-- Change the default only: configured radii on existing POIs are preserved.
ALTER TABLE POIS ALTER COLUMN trigger_radius SET DEFAULT 30;
