import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Lightweight .env parser
function loadEnv(filePath) {
  const envVars = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      envVars[key] = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    });
  }
  return envVars;
}

const rootEnv = loadEnv(path.resolve(process.cwd(), '.env'));
const backendEnv = loadEnv(path.resolve(process.cwd(), 'backend', '.env'));

console.log('='.repeat(80));
console.log('DCONS SUPABASE DIAGNOSTIC');
console.log('='.repeat(80));

// 1. Check environment variables
console.log('\n1️⃣  ENVIRONMENT VARIABLES CHECK');
console.log('-'.repeat(80));

const supabaseUrl = rootEnv.VITE_SUPABASE_URL;
const supabaseKey = rootEnv.VITE_SUPABASE_PUBLISHABLE_KEY || rootEnv.VITE_SUPABASE_ANON_KEY;
const backendUrl = backendEnv.FRONTEND_URL;
const supabaseServiceKey = backendEnv.SUPABASE_SERVICE_ROLE_KEY;

console.log(`✓ VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
if (supabaseUrl) console.log(`  └─ ${supabaseUrl}`);

console.log(`✓ VITE_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
if (supabaseKey) console.log(`  └─ ${supabaseKey.substring(0, 20)}...`);

console.log(`✓ FRONTEND_URL (backend): ${backendUrl ? '✅ Set' : '❌ Missing'}`);
if (backendUrl) console.log(`  └─ ${backendUrl}`);

console.log(`✓ SUPABASE_SERVICE_ROLE_KEY (backend): ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ FATAL: Missing Supabase credentials. Cannot proceed.');
  process.exit(1);
}

// 2. Test Supabase connection
console.log('\n2️⃣  SUPABASE CONNECTION TEST');
console.log('-'.repeat(80));

const supabase = createClient(supabaseUrl, supabaseKey);

try {
  console.log('Testing Supabase client initialization...');
  // Try to fetch auth settings (public endpoint)
  const { data: { publicUrl } } = await supabase.storage.listBuckets().catch(() => ({ data: {} }));
  console.log('✅ Supabase client initialized successfully');
} catch (err) {
  console.log('⚠️  Warning during Supabase init (this may be normal):', err.message);
}

// 3. Test sign-in with known credentials
console.log('\n3️⃣  SIGN-IN TEST (Admin User)');
console.log('-'.repeat(80));

const testEmail = 'dcon@admin.com';
const testPassword = 'admindcon1232';

try {
  console.log(`Attempting sign-in as ${testEmail}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (error) {
    console.log(`❌ Sign-in failed: ${error.message}`);
    if (error.code) console.log(`   Error code: ${error.code}`);
  } else if (data?.session) {
    console.log(`✅ Sign-in successful!`);
    console.log(`   User ID: ${data.session.user.id}`);
    console.log(`   Email: ${data.session.user.email}`);
    if (data.session.expires_at) {
      console.log(`   Session expires: ${new Date(data.session.expires_at * 1000).toISOString()}`);
    } else {
      console.log('   Session expires: unknown');
    }
  } else {
    console.log(`⚠️  No session returned (may be normal for some auth flows)`);
  }
} catch (err) {
  console.log(`❌ Unexpected error: ${err.message}`);
}

// 4. Check users table
console.log('\n4️⃣  USERS TABLE CHECK');
console.log('-'.repeat(80));

try {
  console.log('Fetching admin user from users table...');
  const { data, error, status } = await supabase
    .from('users')
    .select('id, email, role, can_login, approved')
    .eq('email', testEmail)
    .single();

  if (error) {
    if (status === 406) {
      console.log(`❌ Table or permissions issue: ${error.message}`);
      console.log(`   → Check if "users" table exists and RLS policies allow reading`);
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  } else if (data) {
    console.log(`✅ Admin user found in users table:`);
    console.log(`   ID: ${data.id}`);
    console.log(`   Email: ${data.email}`);
    console.log(`   Role: ${data.role}`);
    console.log(`   Can Login: ${data.can_login}`);
    console.log(`   Approved: ${data.approved}`);
  }
} catch (err) {
  console.log(`❌ Unexpected error: ${err.message}`);
}

// 5. Check expected Redirect URLs
console.log('\n5️⃣  SUPABASE REDIRECT URLS (Expected)');
console.log('-'.repeat(80));
console.log('Expected Redirect URLs in Supabase console:');
const expectedUrls = [
  'https://dcons.netlify.app',
  'https://dcons.netlify.app/',
  'http://localhost:5173',
  'http://localhost:5173/',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5173/',
];

expectedUrls.forEach((url) => {
  console.log(`  • ${url}`);
});

console.log('\n⚠️  MANUAL CHECK REQUIRED:');
console.log('Visit Supabase Console → Your Project → Authentication → Settings');
console.log('and verify all above URLs are in the "Redirect URLs" list.');

// 6. Check Site URL
console.log('\n6️⃣  SUPABASE SITE URL (Expected)');
console.log('-'.repeat(80));
console.log('Site URL should be:');
console.log('  → https://dcons.netlify.app (production)');
console.log('  → OR http://localhost:5173 (local dev)');

// 7. Summary
console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

const checks = {
  'Supabase URL configured': !!supabaseUrl,
  'Supabase Key configured': !!supabaseKey,
  'Frontend URL configured': !!backendUrl,
};

const allPassed = Object.values(checks).every(v => v === true);

Object.entries(checks).forEach(([check, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${check}`);
});

console.log('\n📋 NEXT STEPS:');
if (!allPassed) {
  console.log('1. Fix missing environment variables in .env files');
  console.log('2. Re-run this diagnostic');
} else {
  console.log('1. Verify Redirect URLs in Supabase console (step 5 above)');
  console.log('2. Verify Site URL is set to https://dcons.netlify.app');
  console.log('3. If you see sign-in errors on the web app:');
  console.log('   - Open browser DevTools (F12) → Network tab');
  console.log('   - Search for "authorize" request');
  console.log('   - Check the "redirect_uri" parameter in the URL');
  console.log('   - Add that exact URL to Supabase Redirect URLs');
}

console.log('\n' + '='.repeat(80));
process.exit(allPassed ? 0 : 1);
