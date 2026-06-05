import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://kkpkrrhqkzukurmoxrdq.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
export const supabaseAnonClient = createClient(supabaseUrl, supabaseAnonKey);

export async function verifySupabaseToken(token: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('Token verification error:', err);
    return null;
  }
}

export async function getUserRole(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return 'student';
    }
    return data.role;
  } catch (err) {
    console.error('Error fetching user role:', err);
    return 'student';
  }
}

export async function getUserApproval(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('approved')
      .eq('id', userId)
      .single();
    if (error || !data) {
      return false;
    }
    return data.approved === true;
  } catch (err) {
    console.error('Error fetching user approval:', err);
    return false;
  }
}
