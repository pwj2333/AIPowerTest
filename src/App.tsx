import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./pages/AdminLayout";
import AssessmentPage from "./pages/AssessmentPage";
import HomePage from "./pages/HomePage";
import ResultPage from "./pages/ResultPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/assessment/:token" element={<AssessmentPage />} />
      <Route path="/result/:token" element={<ResultPage />} />
      <Route path="/admin/*" element={<AdminLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
