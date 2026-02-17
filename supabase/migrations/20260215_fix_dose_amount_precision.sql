-- Increase dose precision headroom to prevent overflow on common mg values.
-- Previous DECIMAL(6,4) capped values at 99.9999, which breaks 100mg+ entries.

ALTER TABLE dose_logs
  ALTER COLUMN amount TYPE DECIMAL(8,4);

ALTER TABLE dose_logs
  ALTER COLUMN effective_dose TYPE DECIMAL(8,4);
