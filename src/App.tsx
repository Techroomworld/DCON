import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AuthDisabled from "./pages/AuthDisabled";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherPage from "./pages/TeacherPage";
import StudentPage from "./pages/StudentPage";
import ClassroomPage from "./pages/ClassroomPage";
import Documents from "./pages/Documents";
import LoginDetails from "./pages/LoginDetails";
import "./styles/index.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthDisabled />} />
      <Route path="/signup" element={<AuthDisabled />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/login-details" element={<LoginDetails />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/teacher" element={<TeacherPage />} />
      <Route path="/student" element={<StudentPage />} />
      <Route path="/classroom" element={<ClassroomPage />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}