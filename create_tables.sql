-- ============================
--  BARANGAY MANAGEMENT SYSTEM DATABASE
-- ============================

-- HOUSEHOLDS
CREATE TABLE IF NOT EXISTS 'households' (
  'house_id' INT PRIMARY KEY AUTO_INCREMENT,
  'household_number' VARCHAR(50),
  'address' VARCHAR(255)
);

-- RESIDENTS
CREATE TABLE IF NOT EXISTS 'residents' (
  'resident_id' INT PRIMARY KEY AUTO_INCREMENT,
  'household_id' INT,
  'first_name' VARCHAR(255),
  'middle_name' VARCHAR(255),
  'last_name' VARCHAR(255),
  'birthdate' DATE,
  'gender' VARCHAR(10),
  'address' VARCHAR(255),
  'contact_number' VARCHAR(20),
  'email' VARCHAR(255),
  'created_at' TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ('household_id') REFERENCES 'households' ('house_id') ON DELETE CASCADE
);

-- BARANGAY OFFICIALS
CREATE TABLE IF NOT EXISTS 'barangay_officials' (
  'barangayofficial_id' INT PRIMARY KEY AUTO_INCREMENT,
  'first_name' VARCHAR(255),
  'middle_name' VARCHAR(255),
  'last_name' VARCHAR(255),
  'position' VARCHAR(255),
  'contact_number' VARCHAR(20),
  'email' VARCHAR(255),
  'created_at' TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USERS (for authentication)
-- Moved foreign key here to avoid circular reference
CREATE TABLE IF NOT EXISTS 'users' (
  'id' INT PRIMARY KEY AUTO_INCREMENT,
  'resident_id' INT,
  'username' VARCHAR(255) UNIQUE NOT NULL,
  'password' VARCHAR(255) NOT NULL,
  'role' ENUM('resident', 'official', 'admin') DEFAULT 'resident',
  'created_at' TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ('resident_id') REFERENCES 'residents' ('resident_id') ON DELETE CASCADE
);

-- REQUESTS (connected to residents and barangay officials)
CREATE TABLE IF NOT EXISTS 'requests' (
  'request_id' INT PRIMARY KEY AUTO_INCREMENT,
  'resident_id' INT,
  'barangayofficial_id' INT COMMENT 'Official who processed the request',
  'request_type' VARCHAR(50),
  'request_category' VARCHAR(50),
  'request_date' DATE,
  'status' ENUM('PENDING', 'ACCEPTED', 'CANCELLED') DEFAULT 'PENDING',
  'details' TEXT,
  'reference_number' VARCHAR(50),
  'created_at' TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ('resident_id') REFERENCES 'residents' ('resident_id') ON DELETE CASCADE,
  FOREIGN KEY ('barangayofficial_id') REFERENCES 'barangay_officials' ('barangayofficial_id') ON DELETE SET NULL
);

-- ANNOUNCEMENTS (posted by officials)
CREATE TABLE IF NOT EXISTS 'announcements' (
  'announcement_id' INT PRIMARY KEY AUTO_INCREMENT,
  'barangayofficial_id' INT,
  'title' VARCHAR(255),
  'content' TEXT,
  'announcement_date' DATE,
  'created_at' TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ('barangayofficial_id') REFERENCES 'barangay_officials' ('barangayofficial_id') ON DELETE CASCADE
);

-- DOCUMENTS (uploaded or requested by residents)
CREATE TABLE IF NOT EXISTS 'documents' (
  'id' INT PRIMARY KEY AUTO_INCREMENT,
  'type' VARCHAR(255),
  'resident_id' INT,
  'approved_by' INT NULL COMMENT 'User ID of the approver (official or admin)',
  'date' DATE,
  'status' ENUM('Processing', 'Issued', 'Refused') DEFAULT 'Processing',
  'approval_date' DATETIME NULL,
  'created_at' TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ('resident_id') REFERENCES 'residents' ('resident_id') ON DELETE CASCADE,
  FOREIGN KEY ('approved_by') REFERENCES 'users' ('id') ON DELETE SET NULL
);


-- EVENTS (created by officials)
CREATE TABLE IF NOT EXISTS 'events' (
  'id' INT PRIMARY KEY AUTO_INCREMENT,
  'barangayofficial_id' INT,
  'title' VARCHAR(255),
  'date' DATE,
  'time' VARCHAR(50),
  'location' VARCHAR(255),
  'created_at' TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ('barangayofficial_id') REFERENCES 'barangay_officials' ('barangayofficial_id') ON DELETE CASCADE
);

-- COMPLAINTS (filed by residents)
CREATE TABLE IF NOT EXISTS 'complaints' (
  'id' INT PRIMARY KEY AUTO_INCREMENT,
  'resident_id' INT,
  'title' VARCHAR(255),
  'details' TEXT,
  'date' DATE DEFAULT CURRENT_DATE,
  'created_at' TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ('resident_id') REFERENCES 'residents' ('resident_id') ON DELETE CASCADE
);
