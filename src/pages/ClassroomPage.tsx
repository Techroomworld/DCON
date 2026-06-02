import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MediaClassroom from '@/components/classroom/MediaClassroom';

type UserRole = 'admin' | 'teacher' | 'student';

type ClassroomRecord = {
  id: string;
  room_name: string;
  title: string;
  description: string;
  teacher_id: string;
  status: string;
};

export default function ClassroomPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [classroom, setClassroom] = useState<ClassroomRecord | null>(null);
  const [sessionRole, setSessionRole] = useState<'teacher' | 'student'>('student');
  const [userName, setUserName] = useState('Guest');
  const [instructor, setInstructor] = useState<string>('Teacher');
  const [classTopic, setClassTopic] = useState<string>('Live session');

  useEffect(() => {
    const init = async () => {
      const roomName = params.get('room');
      if (!roomName) {
        navigate('/student');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        navigate('/login');
        return;
      }

      setUserName(session.user.email || session.user.id || 'Student');

      const { data: userRecord } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

      const role = userRecord?.role === 'teacher' || userRecord?.role === 'admin' ? 'teacher' : 'student';
      setSessionRole(role);

      const { data: classroomData, error } = await supabase
        .from('classroom_sessions')
        .select('id, room_name, title, description, teacher_id, status')
        .eq('room_name', roomName)
        .single();

      if (error || !classroomData) {
        setSessionError('Room not found.');
        setLoading(false);
        return;
      }

      setClassroom(classroomData);
      setClassTopic(classroomData.description || classroomData.title || 'Live session');

      const { data: teacherData } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', classroomData.teacher_id)
        .single();

      if (teacherData) {
        setInstructor(teacherData.full_name || teacherData.email || 'Instructor');
      }

      setLoading(false);
    };

    init();
  }, [navigate, params]);

  useEffect(() => {
    const checkAccess = async () => {
      if (!classroom) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      // Only check for student role; teachers/admins are allowed
      if (sessionRole === 'student') {
        try {
          const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/session/${classroom.room_name}/access`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const json = await resp.json();
          if (!json.allowed) {
            setSessionError(json.reason || 'Access denied: enrollment or payment required');
          }
        } catch (err) {
          console.error('Access check failed', err);
        }
      }
    };

    checkAccess();
  }, [classroom, sessionRole]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading classroom…</div>;
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100 p-8">
        <p className="text-xl font-semibold">{sessionError}</p>
        <button
          type="button"
          onClick={() => navigate('/student')}
          className="rounded-3xl bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500"
        >
          Return to dashboard
        </button>
      </div>
    );
  }

  return (
    <MediaClassroom
      session={{
        roomName: classroom?.room_name ?? '',
        name: userName,
        role: sessionRole,
        title: classroom?.title ?? 'Classroom',
        classTopic,
        instructor,
        classTitle: classroom?.title ?? 'Live Classroom',
      }}
    />
  );
}
