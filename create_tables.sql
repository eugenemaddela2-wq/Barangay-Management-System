-- SQL migration to create tables for Barangay Management System

CREATE TABLE IF NOT EXISTS residents (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  age integer,
  address text,
  contact text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id bigserial PRIMARY KEY,
  type text,
  resident text,
  date date,
  status text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS officials (
  id bigserial PRIMARY KEY,
  name text,
  position text,
  contact text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id bigserial PRIMARY KEY,
  title text,
  date date,
  time text,
  location text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaints (
  id bigserial PRIMARY KEY,
  title text,
  details text,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
