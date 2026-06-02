import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

type Role = "admin" | "teacher" | "student";

type SessionPayload = {
  role: Role;
  name: string;
  title?: string;
  subject?: string;
  classTitle?: string;
  classTopic?: string;
  instructor?: string;
  roomName?: string;
};

const TEACHER_DEFAULTS = {
  role: "teacher" as const,
  title: "Lead Instructor",
  subject: "Economics",
  classTitle: "Business Strategy 401",
  classTopic: "Market Forecasts",
  roomName: "dcons-live-classroom",
};

const STUDENT_DEFAULTS = {
  role: "student" as const,
  instructor: "Dr. Sarah Smith",
  subject: "Economics",
  classTitle: "Business Strategy 401",
  classTopic: "Market Forecasts",
  roomName: "dcons-live-classroom",
};

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState(STUDENT_DEFAULTS.roomName);
  const [subject, setSubject] = useState(STUDENT_DEFAULTS.subject);
  const [classTitle, setClassTitle] = useState(STUDENT_DEFAULTS.classTitle);
  const [classTopic, setClassTopic] = useState(STUDENT_DEFAULTS.classTopic);
  const [instructor, setInstructor] = useState(STUDENT_DEFAULTS.instructor);
  const [title, setTitle] = useState(TEACHER_DEFAULTS.title);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("dconsSession") || "null");

    if (session?.role) {
      if (session.role === "admin") navigate("/admin");
      if (session.role === "teacher") navigate("/teacher");
      if (session.role === "student") navigate("/student");
    }
  }, [navigate]);

  useEffect(() => {
    if (role === "teacher") {
      setSubject(TEACHER_DEFAULTS.subject);
      setClassTitle(TEACHER_DEFAULTS.classTitle);
      setClassTopic(TEACHER_DEFAULTS.classTopic);
      setRoomName(TEACHER_DEFAULTS.roomName);
      setInstructor("Dr. Sarah Smith");
      setTitle(TEACHER_DEFAULTS.title);
    }

    if (role === "student") {
      setSubject(STUDENT_DEFAULTS.subject);
      setClassTitle(STUDENT_DEFAULTS.classTitle);
      setClassTopic(STUDENT_DEFAULTS.classTopic);
      setRoomName(STUDENT_DEFAULTS.roomName);
      setInstructor(STUDENT_DEFAULTS.instructor);
      setTitle(TEACHER_DEFAULTS.title);
    }
  }, [role]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: SessionPayload = {
      role,
      name:
        name.trim() ||
        (role === "admin"
          ? "Admin User"
          : role === "teacher"
          ? "Dr. Sarah Smith"
          : "Student User"),
      roomName,
      subject,
      classTitle,
      classTopic,
      instructor: role === "student" ? instructor : undefined,
      title: role === "teacher" ? title : undefined,
    };

    localStorage.setItem("dconsSession", JSON.stringify(payload));

    if (role === "admin") {
      navigate("/admin");
    } else if (role === "teacher") {
      navigate("/teacher");
    } else {
      navigate("/student");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6 py-10">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-800 bg-slate-950">
          <h1 className="text-4xl font-black text-white">DCONS Portal Login</h1>
          <p className="text-slate-400 mt-2">Choose your role and join the classroom or admin dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 px-10 py-8">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-300">Role</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-300">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
            />
          </div>

          {role !== "admin" && (
            <>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-300">Room</label>
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder="Room name"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-300">Subject</label>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-300">Class title</label>
                  <input
                    value={classTitle}
                    onChange={(event) => setClassTitle(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-300">Topic</label>
                  <input
                    value={classTopic}
                    onChange={(event) => setClassTopic(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                  />
                </div>

                {role === "student" ? (
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-300">Instructor</label>
                    <input
                      value={instructor}
                      onChange={(event) => setInstructor(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-300">Title</label>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-cyan-600 px-6 py-4 text-lg font-semibold text-white hover:bg-cyan-500 transition"
          >
            Continue to {role === "admin" ? "Dashboard" : "Classroom"}
          </button>
        </form>
      </div>
    </div>
  );
}
