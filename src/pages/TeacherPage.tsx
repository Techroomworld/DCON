import { useEffect, useState } from 'react';
import MediaClassroom from '@/components/classroom/MediaClassroom';

type Session = {
  name: string;
  role: 'teacher' | 'student';
  subject?: string;
  title?: string;
  classTitle?: string;
  classTopic?: string;
  instructor?: string;
  roomName: string;
};

export default function TeacherPage() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('dconsSession') || 'null');

    if (!stored || stored.role !== 'teacher') {
      localStorage.removeItem('dconsSession');
      window.location.href = '/?error=unauthorized';
      return;
    }

    setSession(stored);
  }, []);

  if (!session) return null;

  return <MediaClassroom session={session} />;
}
