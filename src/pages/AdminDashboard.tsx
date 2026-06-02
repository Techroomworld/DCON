import { useEffect, useState } from "react";
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Server,
  CreditCard,
  LogOut,
  TrendingUp,
  BookOpen,
  UserCheck,
  Pencil,
} from "lucide-react";

/* ================= TYPES ================= */

type Role = "teacher" | "student" | "admin";

type ApprovalUser = {
  username: string;
  name: string;
  role: Exclude<Role, "admin">;
  subject: string;
  category?: string;
};

type AdminWarning = {
  target: string;
  message: string;
} | null;

type AdminActions = {
  teacherMicDisabled: boolean;
  studentMicDisabled: boolean;
  warning: AdminWarning;
};

type SessionUser = {
  role: Role;
  username: string;
};

/* ================= COMPONENT ================= */

export default function AdminDashboard() {
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [warningTarget, setWarningTarget] = useState<string>("teacher");
  const [warningMessage, setWarningMessage] = useState<string>("");

  const [adminActions, setAdminActions] = useState<AdminActions>({
    teacherMicDisabled: false,
    studentMicDisabled: false,
    warning: null,
  });

  const pendingTeachers: ApprovalUser[] = [
    {
      username: "jordan",
      name: "Jordan Rae",
      role: "teacher",
      subject: "Economics",
    },
  ];

  const pendingStudents: ApprovalUser[] = [
    {
      username: "samira",
      name: "Samira Khan",
      role: "student",
      subject: "Economics",
      category: "Regular",
    },
  ];

  /* ================= AUTH CHECK ================= */

  useEffect(() => {
    const session = JSON.parse(
      localStorage.getItem("dconsSession") || "null"
    ) as SessionUser | null;

    if (!session || session.role !== "admin") {
      localStorage.removeItem("dconsSession");
      window.location.href = "/";
      return;
    }

    const storedApprovals = JSON.parse(
      localStorage.getItem("dconsApprovals") || "{}"
    ) as Record<string, boolean>;

    const storedActions = JSON.parse(
      localStorage.getItem("dconsAdminActions") ||
        '{"teacherMicDisabled":false,"studentMicDisabled":false,"warning":null}'
    ) as AdminActions;

    setApprovals(storedApprovals);
    setAdminActions(storedActions);
  }, []);

  /* ================= STORAGE HELPERS ================= */

  const saveApprovals = (data: Record<string, boolean>) => {
    setApprovals(data);
    localStorage.setItem("dconsApprovals", JSON.stringify(data));
  };

  const saveAdminActions = (data: AdminActions) => {
    setAdminActions(data);
    localStorage.setItem("dconsAdminActions", JSON.stringify(data));
  };

  /* ================= ACTIONS ================= */

  const approveUser = (username: string) => {
    saveApprovals({
      ...approvals,
      [username]: true,
    });
  };

  const sendWarning = () => {
    if (!warningMessage.trim()) return;

    saveAdminActions({
      ...adminActions,
      warning: {
        target: warningTarget,
        message: warningMessage,
      },
    });

    setWarningMessage("");
  };

  const logout = () => {
    localStorage.removeItem("dconsSession");
    window.location.href = "/";
  };

  const pending: ApprovalUser[] = [...pendingTeachers, ...pendingStudents].filter(
    (u) => !approvals[u.username]
  );

  /* ================= UI ================= */

  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen flex">

      {/* SIDEBAR */}
      <aside className="w-72 border-r border-white/5 bg-slate-900/50 p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>

          <div>
            <h1 className="font-black text-2xl text-white">DCONS</h1>
            <p className="text-indigo-400 text-xs uppercase">System Admin</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5">
            <LayoutDashboard size={20} />
            Overview
          </button>

          <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl">
            <Users size={20} />
            User Management
          </button>

          <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl">
            <Server size={20} />
            Server Nodes
          </button>

          <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl">
            <CreditCard size={20} />
            Revenue & Billing
          </button>
        </nav>

        <button onClick={logout} className="flex items-center gap-4 text-red-400">
          <LogOut size={20} />
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-10 overflow-y-auto">

        <h1 className="text-4xl font-black text-white mb-10">
          Admin Dashboard
        </h1>

        {/* STATS */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">

          <div className="bg-slate-900 rounded-3xl p-6">
            <Users className="text-blue-400 mb-4" />
            <p>Enrolled Students</p>
            <h2 className="text-3xl font-black">42</h2>
            <div className="flex items-center gap-2 mt-2 text-emerald-400">
              <TrendingUp size={14} />
              +8%
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6">
            <BookOpen className="text-emerald-400 mb-4" />
            <h2 className="font-black">Business Strategy 401</h2>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6">
            <UserCheck className="text-indigo-400 mb-4" />
            <h2 className="text-3xl font-black">38</h2>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6">
            <Pencil className="text-purple-400 mb-4" />
            <h2 className="font-black">Dr. Sarah Smith</h2>
          </div>

        </div>

        {/* CONTENT */}
        <section className="grid lg:grid-cols-2 gap-8">

          {/* APPROVALS */}
          <div className="bg-slate-900 rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-6">
              Pending Approvals
            </h2>

            {pending.length === 0 ? (
              <p>No pending approvals.</p>
            ) : (
              pending.map((user) => (
                <div
                  key={user.username}
                  className="bg-slate-950 rounded-2xl p-4 mb-4"
                >
                  <h3 className="font-bold">{user.name}</h3>
                  <p>{user.subject}</p>

                  <button
                    onClick={() => approveUser(user.username)}
                    className="mt-4 bg-emerald-500 px-4 py-2 rounded-xl"
                  >
                    Approve
                  </button>
                </div>
              ))
            )}
          </div>

          {/* ADMIN CONTROLS */}
          <div className="bg-slate-900 rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-6">
              Admin Controls
            </h2>

            <select
              value={warningTarget}
              onChange={(e) => setWarningTarget(e.target.value)}
              className="w-full mb-4 p-4 rounded-xl bg-slate-950"
            >
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>

            <textarea
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              rows={4}
              className="w-full p-4 rounded-xl bg-slate-950"
            />

            <button
              onClick={sendWarning}
              className="w-full mt-4 bg-indigo-600 p-4 rounded-xl"
            >
              Save Message
            </button>
          </div>

        </section>
      </main>
    </div>
  );
}