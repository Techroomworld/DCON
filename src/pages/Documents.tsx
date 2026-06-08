import { useNavigate } from "react-router-dom";
import { BookOpen, FileText, Download, Sparkles, GraduationCap } from "lucide-react";

const DOCUMENTS = [
  {
    title: "Digital Marketing Guide",
    description: "Practical strategies, campaign layouts, and downloadable worksheets for modern marketers.",
    file: "/docs/digital-marketing-guide.pdf",
    tag: "Marketing",
  },
  {
    title: "Past Question Bank",
    description: "Collection of past exam questions and answers across science, management and technology courses.",
    file: "/docs/past-question-bank.pdf",
    tag: "Exam Prep",
  },
  {
    title: "Teacher Resource Pack",
    description: "Downloadable lesson notes, class slides, and teaching templates for instructors.",
    file: "/docs/teacher-resource-pack.pdf",
    tag: "Teacher Tools",
  },
];

export default function Documents() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-violet-900 py-24 px-4">
        <div className="absolute left-0 top-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-48 w-48 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8">
          <div className="w-full rounded-[2rem] border border-white/10 bg-slate-900/90 p-10 shadow-2xl shadow-slate-950/50 backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
                  <Sparkles className="h-4 w-4" /> Resource Center
                </div>
                <h1 className="mt-6 text-4xl font-bold text-white">Download study guides, PDFs, and teacher notes</h1>
                <p className="mt-4 max-w-2xl text-slate-300">
                  Access curated educational files for digital marketing, science, finance, technology, and more. Use these resources to prepare for class, exams, or independent study.
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <GraduationCap className="h-5 w-5" /> Back to home
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {DOCUMENTS.map((doc) => (
              <div key={doc.title} className="rounded-[2rem] border border-white/10 bg-slate-900/95 p-6 shadow-xl shadow-slate-950/30 transition hover:-translate-y-1 hover:border-cyan-400/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">{doc.tag}</p>
                    <h2 className="mt-3 text-2xl font-bold text-white">{doc.title}</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-300">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
                <p className="mt-5 text-slate-300">{doc.description}</p>
                <a
                  href={doc.file}
                  download
                  className="mt-8 inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01]"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </a>
              </div>
            ))}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-8 text-slate-300">
            <h2 className="text-2xl font-bold text-white">What you’ll get</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-950/80 p-5">
                <p className="font-semibold text-white">E-Books & Guides</p>
                <p className="mt-2 text-sm">Download structured course notes for quick study and review.</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-5">
                <p className="font-semibold text-white">Past Questions</p>
                <p className="mt-2 text-sm">Practice real exam questions and learn the best approach to answer them.</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-5">
                <p className="font-semibold text-white">Teacher Support</p>
                <p className="mt-2 text-sm">Resources designed for teachers to share directly with learners.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
