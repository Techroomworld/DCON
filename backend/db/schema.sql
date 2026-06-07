-- DCONS Database Schema for Supabase
-- Run these SQL statements in Supabase SQL Editor

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student',
  admin_type TEXT CHECK (admin_type IN ('main', 'section')) DEFAULT 'section',
  can_login BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT FALSE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  subject_interest TEXT,
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

-- Drop policies first so the schema file can be rerun safely
DROP POLICY IF EXISTS users_read ON public.users;
DROP POLICY IF EXISTS users_insert ON public.users;
DROP POLICY IF EXISTS users_update ON public.users;
DROP POLICY IF EXISTS users_public_teacher_read ON public.users;

DROP POLICY IF EXISTS sessions_read ON public.classroom_sessions;
DROP POLICY IF EXISTS sessions_create ON public.classroom_sessions;
DROP POLICY IF EXISTS sessions_update ON public.classroom_sessions;

DROP POLICY IF EXISTS chat_read ON public.chat_messages;
DROP POLICY IF EXISTS chat_insert ON public.chat_messages;

DROP POLICY IF EXISTS attendance_read ON public.attendance;
DROP POLICY IF EXISTS attendance_insert ON public.attendance;

DROP POLICY IF EXISTS questions_read ON public.questions;
DROP POLICY IF EXISTS questions_create ON public.questions;
DROP POLICY IF EXISTS questions_update ON public.questions;

DROP POLICY IF EXISTS assignments_create ON public.assignments;
DROP POLICY IF EXISTS assignments_read ON public.assignments;

DROP POLICY IF EXISTS submissions_create ON public.submissions;
DROP POLICY IF EXISTS submissions_read ON public.submissions;

DROP POLICY IF EXISTS session_access_manage ON public.session_access;

DROP POLICY IF EXISTS join_requests_insert ON public.join_requests;
DROP POLICY IF EXISTS join_requests_admin_read ON public.join_requests;
DROP POLICY IF EXISTS join_requests_admin_update ON public.join_requests;

DROP POLICY IF EXISTS teacher_bookings_insert ON public.teacher_bookings;
DROP POLICY IF EXISTS teacher_bookings_select ON public.teacher_bookings;
DROP POLICY IF EXISTS teacher_bookings_update ON public.teacher_bookings;

DROP POLICY IF EXISTS reminders_insert ON public.reminders;
DROP POLICY IF EXISTS reminders_read ON public.reminders;
DROP POLICY IF EXISTS reminders_update ON public.reminders;

DROP POLICY IF EXISTS email_notifications_insert ON public.email_notifications;
DROP POLICY IF EXISTS email_notifications_read ON public.email_notifications;

DROP POLICY IF EXISTS direct_messages_insert ON public.direct_messages;
DROP POLICY IF EXISTS direct_messages_read ON public.direct_messages;

DROP POLICY IF EXISTS grades_insert ON public.grades;
DROP POLICY IF EXISTS grades_read ON public.grades;

DROP POLICY IF EXISTS certificates_insert ON public.certificates;
DROP POLICY IF EXISTS certificates_read ON public.certificates;

DROP POLICY IF EXISTS session_recordings_insert ON public.session_recordings;
DROP POLICY IF EXISTS session_recordings_read ON public.session_recordings;

DROP POLICY IF EXISTS scheduled_events_insert ON public.scheduled_events;
DROP POLICY IF EXISTS scheduled_events_read ON public.scheduled_events;

DROP POLICY IF EXISTS parent_students_insert ON public.parent_students;
DROP POLICY IF EXISTS parent_students_read ON public.parent_students;

DROP POLICY IF EXISTS announcements_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_read ON public.announcements;
DROP POLICY IF EXISTS announcements_update ON public.announcements;

DROP POLICY IF EXISTS teacher_reviews_insert ON public.teacher_reviews;
DROP POLICY IF EXISTS teacher_reviews_read ON public.teacher_reviews;

DROP POLICY IF EXISTS two_factor_codes_insert ON public.two_factor_codes;
DROP POLICY IF EXISTS two_factor_codes_read ON public.two_factor_codes;

-- Users can read their own profile or if admin
CREATE POLICY users_read ON users
  FOR SELECT USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY users_insert ON users
  FOR INSERT WITH CHECK (id = auth.uid() AND email = auth.email());

CREATE POLICY users_update ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY users_public_teacher_read ON users
  FOR SELECT USING (role = 'teacher' OR role = 'admin');

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

-- Join requests from teachers/admins for students to join the platform
CREATE TABLE IF NOT EXISTS join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  student_name TEXT,
  requested_role TEXT CHECK (requested_role IN ('student', 'teacher')) DEFAULT 'student',
  status TEXT CHECK (status IN ('pending', 'approved', 'declined')) DEFAULT 'pending',
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY join_requests_insert ON join_requests
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY join_requests_admin_read ON join_requests
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY join_requests_admin_update ON join_requests
  FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Teacher bookings for scheduled lessons
CREATE TABLE IF NOT EXISTS teacher_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE teacher_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_bookings_insert ON teacher_bookings
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY teacher_bookings_select ON teacher_bookings
  FOR SELECT USING (
    student_id = auth.uid() OR
    teacher_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY teacher_bookings_update ON teacher_bookings
  FOR UPDATE USING (
    teacher_id = auth.uid() OR
    student_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Reminders for students and teachers
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY reminders_insert ON reminders
  FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY reminders_read ON reminders
  FOR SELECT USING (target_user_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY reminders_update ON reminders
  FOR UPDATE USING (creator_id = auth.uid());

-- Email Notifications (for approval, grade, assignment, etc.)
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_notifications_insert ON email_notifications
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY email_notifications_read ON email_notifications
  FOR SELECT USING (user_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Direct Messages (1-on-1 chat)
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY direct_messages_insert ON direct_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY direct_messages_read ON direct_messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Student Grades / Performance Records
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  room_id UUID REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  grade NUMERIC(5, 2) NOT NULL,
  feedback TEXT,
  graded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY grades_insert ON grades
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY grades_read ON grades
  FOR SELECT USING (student_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

-- Certificates of Completion
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  issued_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  certificate_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY certificates_insert ON certificates
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY certificates_read ON certificates
  FOR SELECT USING (student_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

-- Session Recordings
CREATE TABLE IF NOT EXISTS session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_recordings_insert ON session_recordings
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY session_recordings_read ON session_recordings
  FOR SELECT USING (true);

-- Scheduled Events / Calendar
CREATE TABLE IF NOT EXISTS scheduled_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT CHECK (event_type IN ('class', 'meeting', 'deadline', 'exam', 'other')),
  room_id UUID REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  recurrence TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE scheduled_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduled_events_insert ON scheduled_events
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY scheduled_events_read ON scheduled_events
  FOR SELECT USING (true);

-- Parent-Student Relationships (Parent Portal)
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY parent_students_insert ON parent_students
  FOR INSERT WITH CHECK (parent_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY parent_students_read ON parent_students
  FOR SELECT USING (parent_id = auth.uid() OR student_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Announcement Board
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audience TEXT CHECK (audience IN ('all', 'students', 'teachers', 'admins')) DEFAULT 'all',
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcements_insert ON announcements
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY announcements_read ON announcements
  FOR SELECT USING (true);

CREATE POLICY announcements_update ON announcements
  FOR UPDATE USING (created_by = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Teacher Reviews and Ratings
CREATE TABLE IF NOT EXISTS teacher_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE teacher_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_reviews_insert ON teacher_reviews
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY teacher_reviews_read ON teacher_reviews
  FOR SELECT USING (teacher_id = auth.uid() OR student_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Two-factor authentication codes
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE two_factor_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY two_factor_codes_insert ON two_factor_codes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY two_factor_codes_read ON two_factor_codes
  FOR SELECT USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_assignment_id ON grades(assignment_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_session_recordings_room_id ON session_recordings(room_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_creator_id ON scheduled_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_event_date ON scheduled_events(event_date);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student_id ON parent_students(student_id);

