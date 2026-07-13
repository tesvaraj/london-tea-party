-- Run this entire file in your Supabase SQL Editor
-- (supabase.com → your project → SQL Editor → New query)

-- =============================================
-- TABLE
-- =============================================
CREATE TABLE participants (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL UNIQUE,
  shirt_size   TEXT        NOT NULL,
  token        UUID        DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  assigned_name TEXT       DEFAULT NULL,
  assigned_size TEXT       DEFAULT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Anyone can sign up (INSERT)
CREATE POLICY "allow_insert" ON participants
  FOR INSERT TO anon WITH CHECK (true);

-- Anyone can read (needed for participant list + reveal page)
-- Assignments are NULL until the draw runs so there's nothing to spoil
CREATE POLICY "allow_select" ON participants
  FOR SELECT TO anon USING (true);
