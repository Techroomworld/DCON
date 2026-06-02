-- DCONS Database Schema for Supabase
-- Run these SQL statements in Supabase SQL Editor

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student',
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Classroom Sessions
CREATE TABLE IF NOT EXISTS classroom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT UNIQUE NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('active', 'ended', 'scheduled')) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  message TEXT NOT NULL,
  flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT CHECK (user_role IN ('teacher', 'student')) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE
);

-- Questions from Students
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  question TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  answer TEXT,
  answered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  answered_at TIMESTAMP WITH TIME ZONE
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Assignment Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  feedback TEXT,
  grade NUMERIC(3, 2)
);

-- Articles / Study Materials
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES classroom_sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Whiteboard Snapshots
CREATE TABLE IF NOT EXISTS whiteboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  data_url TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Producers (WebRTC media tracks)
CREATE TABLE IF NOT EXISTS producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT CHECK (kind IN ('audio', 'video')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS (Row Level Security) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile or if admin
CREATE POLICY users_read ON users
  FOR SELECT USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Everyone can read active classroom sessions
CREATE POLICY sessions_read ON classroom_sessions
  FOR SELECT USING (true);

-- Teachers can create sessions
CREATE POLICY sessions_create ON classroom_sessions
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

-- Teachers can update their own sessions
CREATE POLICY sessions_update ON classroom_sessions
  FOR UPDATE USING (teacher_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Everyone can read chat in their active session
CREATE POLICY chat_read ON chat_messages
  FOR SELECT USING (true);

-- Users in a session can insert chat
CREATE POLICY chat_insert ON chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Everyone can read attendance
CREATE POLICY attendance_read ON attendance
  FOR SELECT USING (true);

-- System (backend) can insert attendance
CREATE POLICY attendance_insert ON attendance
  FOR INSERT WITH CHECK (true);

-- Students can read/create questions
CREATE POLICY questions_read ON questions
  FOR SELECT USING (true);

CREATE POLICY questions_create ON questions
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Teachers can update answers
CREATE POLICY questions_update ON questions
  FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

-- Teachers can create assignments
CREATE POLICY assignments_create ON assignments
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

-- Everyone can read assignments
CREATE POLICY assignments_read ON assignments
  FOR SELECT USING (true);

-- Students can create their own submissions
CREATE POLICY submissions_create ON submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Everyone can read submissions (for feedback)
CREATE POLICY submissions_read ON submissions
  FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id ON classroom_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON classroom_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_room_id ON attendance(room_id);
CREATE INDEX IF NOT EXISTS idx_questions_room_id ON questions(room_id);
CREATE INDEX IF NOT EXISTS idx_questions_answered ON questions(is_answered);
CREATE INDEX IF NOT EXISTS idx_assignments_room_id ON assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_articles_created_by ON articles(created_by);

-- Session Access: which users are allowed to enter a classroom (e.g., paid students)
CREATE TABLE IF NOT EXISTS session_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  has_access BOOLEAN DEFAULT FALSE,
  paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE session_access ENABLE ROW LEVEL SECURITY;

-- Admins can manage session access
CREATE POLICY session_access_manage ON session_access
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
