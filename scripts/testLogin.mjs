import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Lightweight .env parser so this script doesn't need extra deps
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    // remove optional surrounding quotes
    process.env[key] = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key not found in environment. Please ensure .env has VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const email = 'dcon@admin.com';
const password = 'admindcon1232';

console.log('Attempting sign-in for', email);

try {
  const res = await supabase.auth.signInWithPassword({ email, password });
  if (res.error) {
    console.error('Sign-in error:', res.error);
    process.exit(2);
  }

  console.log('Sign-in response:', JSON.stringify(res, null, 2));
  if (res.data?.session) {
    console.log('✅ Successfully signed in. Session user id:', res.data.session.user.id);
    process.exit(0);
  } else {
    console.warn('No session returned. Response data:', JSON.stringify(res.data, null, 2));
    process.exit(3);
  }
} catch (err) {
  console.error('Unexpected error during sign-in:', err);
  process.exit(4);
}
