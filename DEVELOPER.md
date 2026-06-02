# Developer Quick Reference

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Key Credentials

```
LiveKit URL: wss://dcons-9d0tismg.livekit.cloud
API Key: APIbJjyS3RLULr9
API Secret: (in .env.local)
```

## Test Accounts

| ID        | Name           | Role    |
| --------- | -------------- | ------- |
| TEACH-001 | Prof. Anderson | Teacher |
| STUD-101  | Alice Smith    | Student |
| STUD-102  | Bob Johnson    | Student |
| STUD-103  | Charlie Davis  | Student |

## File Locations

### Core Files

- `app/classroom/page.tsx` - Main classroom component
- `app/api/token/route.ts` - Token generation
- `lib/livekit.config.ts` - Config

### Components

- `components/classroom/VideoGrid.tsx` - Video display
- `components/classroom/ChatSidebar.tsx` - Chat UI
- `components/classroom/ControlsBar.tsx` - Controls
- `components/classroom/ParticipantList.tsx` - Participants

### Hooks

- `hooks/useRoom.ts` - Room management
- `hooks/useChat.ts` - Chat handling
- `hooks/useMediaStream.ts` - Media devices

### Types

- `types/index.ts` - All TypeScript interfaces

## Component Props

### VideoGrid

```typescript
interface VideoGridProps {
  participants: Participant[];
  currentUser: Participant | null;
}
```

### ChatSidebar

```typescript
interface ChatSidebarProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUserName: string;
  isTeacher: boolean;
}
```

### ControlsBar

```typescript
interface ControlsBarProps {
  onLeaveRoom?: () => void;
}
```

## LiveKit Integration

### Room Connection

```typescript
import { LiveKitRoom, useToken } from '@livekit/components-react';

const token = useToken(roomName, userName);

<LiveKitRoom
  token={token}
  serverUrl={getLiveKitURL()}
  video={true}
  audio={true}
>
  {/* Components */}
</LiveKitRoom>
```

### Getting Participants

```typescript
import { useParticipants } from "@livekit/components-react";

const participants = useParticipants();
```

### Controls

```typescript
import { ControlBar } from '@livekit/components-react';

<ControlBar controls={{
  camera: true,
  microphone: true,
  screenShare: true,
  chat: false,
  settings: true,
  leave: true,
}} />
```

## Environment Variables

```env
NEXT_PUBLIC_LIVEKIT_URL=wss://dcons-9d0tismg.livekit.cloud
LIVEKIT_API_KEY=APIbJjyS3RLULr9
LIVEKIT_API_SECRET=your_secret
```

## Styling

- **Primary Color**: Cyan (`cyan-400`, `cyan-500`)
- **Secondary**: Blue (`blue-500`)
- **Background**: Slate (`slate-900`, `slate-950`)
- **Tailwind Config**: `tailwind.config.ts`

## API Endpoints

### Generate Token

```bash
POST /api/token
Content-Type: application/json

{
  "roomName": "classroom_123",
  "userName": "John Doe",
  "userRole": "teacher"
}

Response:
{
  "token": "jwt_token_here"
}
```

## Common Tasks

### Add a New Component

1. Create file in `components/`
2. Make it a client component (`'use client'`)
3. Export default function
4. Import and use in pages

### Add a New Hook

1. Create file in `hooks/useXxx.ts`
2. Export named function
3. Return object with state/methods
4. Import and use in components

### Add Tailwind Classes

- Classes work out of the box
- Custom colors in `tailwind.config.ts`
- Dark mode already configured

### Debug Issues

1. Open DevTools (F12)
2. Check Console for errors
3. Check Network tab for API calls
4. Check Application → LocalStorage for user data

## Performance Tips

- Use `useParticipants()` for reactive updates
- Memoize expensive components
- Lazy load heavy features
- Use LiveKit's built-in components
- Minimize re-renders with proper dependency arrays

## Security Checklist

- ✅ Never expose API secret in client code
- ✅ Token generation on server only
- ✅ Validate all API inputs
- ✅ Use .env.local for secrets
- ✅ Role-based permissions enforced

## Resources

- [LiveKit Docs](https://docs.livekit.io)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [React Docs](https://react.dev)

## Support Files

- `README.md` - Full documentation
- `INSTALLATION.md` - Setup guide
- `CHANGES.md` - What was changed
- This file - Quick reference

---

Last Updated: June 2026
