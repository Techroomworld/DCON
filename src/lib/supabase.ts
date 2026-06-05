import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kkpkrrhqkzukurmoxrdq.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_SL0dwF6XwKOrGCpvlqevQQ_8YbReH3h';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  full_name?: string;
  avatar_url?: string;
  approved?: boolean;
  created_at: string;
};

export type ClassroomSession = {
  id: string;
  room_name: string;
  teacher_id: string;
  title: string;
  description?: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'ended' | 'scheduled';
  created_at: string;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  flagged: boolean;
  created_at: string;
};

export type Attendance = {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_role: 'teacher' | 'student';
  joined_at: string;
  left_at?: string;
};

export type Question = {
  id: string;
  room_id: string;
  student_id: string;
  student_name: string;
  question: string;
  is_answered: boolean;
  created_at: string;
};

export type Assignment = {
  id: string;
  room_id: string;
  title: string;
  description?: string;
  file_url?: string;
  due_date?: string;
  created_at: string;
};

export type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  file_url: string;
  submitted_at: string;
  feedback?: string;
};

export type Article = {
  id: string;
  title: string;
  content?: string;
  file_url?: string;
  created_by: string;
  created_at: string;
};
