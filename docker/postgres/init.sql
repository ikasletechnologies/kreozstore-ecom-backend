-- Enables gen_random_uuid() used as the default for every table's UUID primary key.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
