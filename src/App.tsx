import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherPage from "./pages/TeacherPage";
import StudentPage from "./pages/StudentPage";
import ClassroomPage from "./pages/ClassroomPage";
import Documents from "./pages/Documents";
import "./styles/index.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/teacher" element={<TeacherPage />} />
      <Route path="/student" element={<StudentPage />} />
      <Route path="/classroom" element={<ClassroomPage />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}