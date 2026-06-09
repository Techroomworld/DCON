# ⚡ Quick Start: Admin Login (5 Minutes)

## 🎯 Goal: Get Admin Logged In

---

## Step 1: Verify Supabase Config (1 min)

Check your `.env` file has:
```env
VITE_SUPABASE_URL=https://kkpkrrhqkzukurmoxrdq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SL0dwF6XwKOrGCpvlqevQQ_8YbReH3h
```

✅ If yes, continue  
❌ If no, update from Supabase dashboard

---

## Step 2: Seed Admin User (1 min)

```bash
npm run seed:admin
```

**Look for this output:**
```
✅ Admin user created successfully!

=== Master Admin Credentials ===
Email: dcon@admin.com
Password: admindcon1232
================================
```

---

## Step 3: Start Dev Server (1 min)

```bash
npm run dev
```

---

## Step 4: Login (1 min)

1. Go to `http://localhost:5173/login`
2. Enter:
   - **Email:** `dcon@admin.com`
   - **Password:** `admindcon1232`
3. Click "Sign In with Email"

---

## Step 5: Verify Success (1 min)

✅ **Success:** You're redirected to `/admin` page  
❌ **Error:** See troubleshooting below

---

## 🚨 Quick Troubleshooting

### "Sign-in failed"
```bash
# Reseed the admin user
npm run seed:admin
```

### "Redirect URI mismatch"
1. Supabase Dashboard → Authentication → Settings
2. Add to "Redirect URLs": `http://localhost:5173`
3. Save and wait 30 seconds

### "Environment variables missing"
```bash
# Create .env from example
cp .env.example .env

# Update with YOUR Supabase details from dashboard
```

### "Database error"
```bash
# Verify schema is deployed in Supabase SQL Editor
# Run: backend/db/schema.sql
```

---

## ✅ Admin Features Once Logged In

- 👥 User management
- 📝 Create classroom sessions
- ✍️ Grade assignments
- 📊 View attendance
- 🎓 Issue certificates
- 📢 Send announcements

---

## 📚 Full Documentation

- Complete guide: `ADMIN_LOGIN_SETUP.md`
- Schema info: `SUPABASE_SCHEMA_VALIDATION.md`
- Features: `ADVANCED_CLASSROOM_FEATURES.md`
- Deployment: `DEPLOYMENT_READY_SUMMARY.md`

---

**You're ready! 🚀**
