-- BARANGAY MANAGEMENT SYSTEM DATABASE (PostgreSQL)

-- ENUM types
CREATE TYPE user_role AS ENUM ('resident', 'official', 'admin');
CREATE TYPE request_status AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED');
CREATE TYPE document_status AS ENUM ('PROCESSING', 'ISSUED', 'REFUSED');

-- HOUSEHOLDS
CREATE TABLE IF NOT EXISTS households (
  household_id SERIAL PRIMARY KEY,
  household_number VARCHAR(50),
  address VARCHAR(255)
);

-- RESIDENTS
CREATE TABLE IF NOT EXISTS residents (
  resident_id SERIAL PRIMARY KEY,
  household_id INT REFERENCES households(household_id) ON DELETE CASCADE,
  first_name VARCHAR(255),
  middle_name VARCHAR(255),
  last_name VARCHAR(255),
  birthdate DATE,
  gender VARCHAR(10),
  address VARCHAR(255),
  contact_number VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);

-- BARANGAY OFFICIALS
CREATE TABLE IF NOT EXISTS officials (
  official_id SERIAL PRIMARY KEY,
  first_name VARCHAR(255),
  middle_name VARCHAR(255),
  last_name VARCHAR(255),
  position VARCHAR(255),
  contact_number VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);

-- USERS (for authentication)
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  resident_id INT REFERENCES residents(resident_id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'resident',
  created_at TIMESTAMP DEFAULT now()
);

-- REQUESTS (connected to residents and barangay officials)
CREATE TABLE IF NOT EXISTS requests (
  request_id SERIAL PRIMARY KEY,
  resident_id INT REFERENCES residents(resident_id) ON DELETE CASCADE,
  official_id INT REFERENCES officials(official_id) ON DELETE SET NULL,
  request_type VARCHAR(50),
  request_category VARCHAR(50),
  request_date DATE,
  status request_status DEFAULT 'PENDING',
  details TEXT,
  reference_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT now()
);

-- ANNOUNCEMENTS (posted by officials)
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id SERIAL PRIMARY KEY,
  official_id INT REFERENCES officials(official_id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  announcement_date DATE,
  created_at TIMESTAMP DEFAULT now()
);

-- DOCUMENTS (uploaded or requested by residents)
CREATE TABLE IF NOT EXISTS documents (
  document_id SERIAL PRIMARY KEY,
  type VARCHAR(255),
  resident_id INT REFERENCES residents(resident_id) ON DELETE CASCADE,
  approved_by INT REFERENCES users(user_id) ON DELETE SET NULL,
  date DATE,
  status document_status DEFAULT 'PROCESSING',
  approval_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- EVENTS (created by officials)
CREATE TABLE IF NOT EXISTS events (
  event_id SERIAL PRIMARY KEY,
  official_id INT REFERENCES officials(official_id) ON DELETE CASCADE,
  title VARCHAR(255),
  date DATE,
  time TIME,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);

-- COMPLAINTS (filed by residents)
CREATE TABLE IF NOT EXISTS complaints (
  complaint_id SERIAL PRIMARY KEY,
  resident_id INT REFERENCES residents(resident_id) ON DELETE CASCADE,
  title VARCHAR(255),
  details TEXT,
  date DATE DEFAULT current_date,
  created_at TIMESTAMP DEFAULT now()
);
