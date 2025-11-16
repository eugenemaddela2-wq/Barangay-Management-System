-- ============================
--  BARANGAY MANAGEMENT SYSTEM DATABASE (PostgreSQL)
-- ============================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- then run the init SQL which uses crypt(gen_salt('bf'), 'password') as appropriate

DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('resident','official','admin');
    END IF;
END $$;

-- Basic tables needed for core functionality
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'resident',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS residents (
    resident_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    address VARCHAR(255),
    contact VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS officials (
    official_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    contact VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Define ENUM type for document types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type_enum') THEN
        CREATE TYPE document_type_enum AS ENUM ('Certificate', 'Clearance', 'Permit', 'ID', 'Other');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS documents (
    document_id SERIAL PRIMARY KEY,
    type document_type_enum,
    resident INTEGER REFERENCES residents(resident_id),
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN documents.type IS 'Type of document: Certificate, Clearance, Permit, ID, Other';

CREATE TABLE IF NOT EXISTS events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    date DATE,
    time TIME,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
    complaint_id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    details TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_residents_name ON residents(name);
CREATE INDEX IF NOT EXISTS idx_documents_resident ON documents(resident);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- Insert default admin if not exists, with hashed password
INSERT INTO users (username, password, role)
VALUES ('admin', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT (username) DO NOTHING;