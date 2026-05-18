ALTER TABLE Assignment
  ADD COLUMN attachmentPath VARCHAR(512) NULL,
  ADD COLUMN attachmentOriginalName VARCHAR(255) NULL,
  ADD COLUMN attachmentMimeType VARCHAR(120) NULL,
  ADD COLUMN attachmentSize INT NULL;
