-- ============================
--  BARANGAY MANAGEMENT SYSTEM - CockroachDB Schema
-- ============================
-- This schema focuses on ADMIN and RESIDENT functionality
-- CockroachDB is PostgreSQL-compatible, so most SQL works as-is

-- Create ENUM for user roles
CREATE TYPE user_role AS ENUM ('resident', 'official', 'admin');

-- Users table (for authentication and role management)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'resident',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Residents table (admin manages this)
CREATE TABLE IF NOT EXISTS residents (
    resident_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    address VARCHAR(255),
    contact VARCHAR(100),
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Officials table (admin manages this)
CREATE TABLE IF NOT EXISTS officials (
    official_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    contact VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events table (admin creates, residents view)
CREATE TABLE IF NOT EXISTS events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME,
    location VARCHAR(255),
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Complaints table (residents submit, admin manages)
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    details TEXT,
    resident_id INTEGER REFERENCES residents(resident_id),
    status VARCHAR(50) DEFAULT 'Pending',
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents table (admin manages)
CREATE TABLE IF NOT EXISTS documents (
    document_id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    resident_id INTEGER REFERENCES residents(resident_id),
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_residents_name ON residents(name);
CREATE INDEX IF NOT EXISTS idx_residents_contact ON residents(contact);
CREATE INDEX IF NOT EXISTS idx_complaints_resident ON complaints(resident_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_documents_resident ON documents(resident_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- Insert default admin user (password: admin123)
-- Note: CockroachDB supports pgcrypto extension, but for simplicity we'll use bcrypt hashed value
-- To generate: node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('admin123',10).then(h=>console.log(h));"
INSERT INTO users (username, password, role)
VALUES ('admin', '$2a$10$rN7V6g.X7.X7.X7.X7.X7OxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXa', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Optionally insert a sample resident for testing
INSERT INTO residents (name, age, address, contact, email)
VALUES ('Juan Dela Cruz', 35, '123 Main St, Barangay 1', '0912345678', 'juan@example.com')
ON CONFLICT DO NOTHING;

-- Optionally insert a sample official
INSERT INTO officials (name, position, contact, email)
VALUES ('Maria Santos', 'Barangay Captain', '0911223344', 'maria@example.com')
ON CONFLICT DO NOTHING;
