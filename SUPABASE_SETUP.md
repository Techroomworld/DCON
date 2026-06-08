# Supabase Auth Configuration Checklist

## Overview
This document lists all the settings needed in your Supabase project dashboard to ensure authentication redirects work correctly across all environments.

---

## 1. Redirect URLs

**Location:** Supabase Console → Your Project → Authentication → Settings → Redirect URLs

Add **all** of the following URLs (one per line):

```
https://dcons.netlify.app
https://dcons.netlify.app/
http://localhost:5173
http://localhost:5173/
http://127.0.0.1:5173
http://127.0.0.1:5173/
```

**Note:** 
- Replace `dcons.netlify.app` if your Netlify domain is different.
- Include both versions (with and without trailing slash) for maximum compatibility.
- Add any Netlify preview deploy URLs you use: `https://deploy-preview-XXX--dcons.netlify.app`

---

## 2. Site URL

**Location:** Supabase Console → Your Project → Authentication → Settings → Site URL

Set to your production domain:
```
https://dcons.netlify.app
```

Or for local development:
```
http://localhost:5173
```

---

## 3. CORS / API Settings (if using Supabase API directly)

**Location:** Supabase Console → Your Project → Settings → API

**Allowed CORS Origins** (if configured):
- `https://dcons.netlify.app`
- `http://localhost:5173`
- `http://127.0.0.1:5173`

---

## 4. Netlify Environment Variables

**Location:** Netlify Site → Site Settings → Build & Deploy → Environment

Add the following environment variables:
```
VITE_SUPABASE_URL=https://kkpkrrhqkzukurmoxrdq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SL0dwF6XwKOrGCpvlqevQQ_8YbReH3h
```

(Or use `VITE_SUPABASE_PUBLISHABLE_KEY` instead of `VITE_SUPABASE_ANON_KEY`)

---

## Troubleshooting

### Sign-in redirects to Supabase error page
- Check browser DevTools → Network tab → filter for "authorize"
- Inspect the request URL and look for the `redirect_uri` parameter
- Copy that exact URL and add it to Redirect URLs in Supabase
- Refresh and retry

### "Invalid redirect_uri" error
- This means the redirect URL in Supabase doesn't match what your app is sending
- Check the exact URL in the error or network tab and add it to Redirect URLs

### Infinite redirect loop
- Ensure `Login.tsx` waits for `supabase.auth.onAuthStateChange` before redirecting
- Clear browser localStorage and session storage
- Verify the session was actually created in Supabase (use Supabase Auth → Users in console)

---

## Environment Details

- **Frontend:** React + Vite + React Router + Supabase JS client
- **Backend:** Node.js + Express + Supabase Admin SDK
- **Production Deployment:** Netlify (frontend) + Render (backend)
- **Local Dev Port:** `http://localhost:5173` (Vite dev server)
