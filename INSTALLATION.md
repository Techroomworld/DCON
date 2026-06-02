# Installation & Setup Guide

Complete step-by-step guide to set up DCONS Academy on your machine.

## Prerequisites

Before starting, ensure you have:

- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: For version control
- **LiveKit Account**: [Sign up here](https://livekit.io)

## Step 1: Get LiveKit Credentials

1. Go to [LiveKit Cloud Console](https://cloud.livekit.io)
2. Create a new room
3. Copy your credentials:
   - **WebSocket URL**: Format: `wss://your-project.livekit.cloud`
   - **API Key**: Your project's API key
   - **API Secret**: Your project's API secret

## Step 2: Clone/Download Project

```bash
# Navigate to your projects directory
cd ~/Documents/web

# Clone the DCONS repository (or extract if downloaded)
git clone <repository-url>
cd DCONS
```

## Step 3: Install Dependencies

```bash
# Install all npm packages
npm install

# This will install:
# - LiveKit client and components
# - Next.js and React
# - Tailwind CSS
# - TypeScript and dev tools
# - All other dependencies
```

## Step 4: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# .env.local
NEXT_PUBLIC_LIVEKIT_URL=wss://dcons-9d0tismg.livekit.cloud
LIVEKIT_API_KEY=APIbJjyS3RLULr9
LIVEKIT_API_SECRET=your_api_secret_here

NEXT_PUBLIC_APP_NAME=DCONS Academy
NEXT_PUBLIC_APP_DESCRIPTION=Real-time Teaching & Learning Platform
```

**Important**: Never commit `.env.local` to version control!

## Step 5: Verify Installation

```bash
# Check Node version
node --version  # Should be v18+

# Check npm version
npm --version   # Should be v9+

# List installed packages
npm list --depth=0
```

## Step 6: Run Development Server

```bash
# Start the development server
npm run dev

# Output should show:
# > ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

## Step 7: Access the Application

1. Open your browser
2. Navigate to `http://localhost:3000`
3. You should see the login page

## Step 8: Test Login

Use these test credentials to verify everything works:

**Teacher Account:**

- ID: `TEACH-001`
- Name: Prof. Anderson

**Student Accounts:**

- ID: `STUD-101` - Alice Smith
- ID: `STUD-102` - Bob Johnson
- ID: `STUD-103` - Charlie Davis

## Step 9: Join a Classroom

1. Enter one of the test IDs above
2. Click "Join Classroom"
3. Allow camera/microphone access when prompted
4. You should see the classroom interface

## Troubleshooting Installation Issues

### Port 3000 Already in Use

```bash
# Find the process using port 3000
lsof -i :3000

# Or use a different port
npm run dev -- -p 3001
```

### npm Install Fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Missing Environment Variables

```bash
# Verify .env.local exists in project root
ls -la | grep env.local

# Check file contents
cat .env.local

# Restart dev server if added
# Kill current process (Ctrl+C) and run npm run dev again
```

### Permission Denied on macOS/Linux

```bash
# Add execute permission to scripts
chmod +x scripts/setup.sh

# Or use sudo with npm
sudo npm install
```

## Production Build

To create an optimized production build:

```bash
# Build the project
npm run build

# Start production server
npm start

# Project will run on http://localhost:3000
```

## Project Structure After Installation

```
DCONS/
├── node_modules/          # All installed packages
├── .env.local             # Your environment variables (created)
├── .next/                 # Next.js build cache (auto-created)
├── app/                   # Application code
├── components/            # React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and config
├── types/                 # TypeScript types
├── public/                # Static files
├── package.json           # Dependencies list
├── tsconfig.json          # TypeScript config
└── tailwind.config.ts     # Tailwind CSS config
```

## Verify Everything is Working

1. **Check server is running**: Open http://localhost:3000
2. **Verify login page loads**: Should see DCONS Academy form
3. **Test login**: Enter a test ID and join classroom
4. **Check console**: Press F12 to open dev tools, check for errors
5. **Test video**: Allow camera/microphone permissions

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting-installation-issues) section
2. Review console errors (F12 → Console tab)
3. Check `.env.local` has correct credentials
4. Verify Node.js version is v18+
5. Try clearing `node_modules` and reinstalling

## Next Steps

After successful installation:

1. Read [README.md](./README.md) for feature overview
2. Review component documentation
3. Customize the application for your needs
4. Deploy to production (see Deployment section in README)

## Commands Reference

| Command              | Purpose                  |
| -------------------- | ------------------------ |
| `npm run dev`        | Start development server |
| `npm run build`      | Create production build  |
| `npm start`          | Run production server    |
| `npm run lint`       | Check code quality       |
| `npm run type-check` | TypeScript type checking |

---

**Last Updated**: June 2026  
**Version**: 1.0.0
