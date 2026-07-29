import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { assessmentRepository } from "./domain/store";
import AdminLayout from "./pages/AdminLayout";
import AssessmentPage from "./pages/AssessmentPage";
import HomePage from "./pages/HomePage";
import ResultPage from "./pages/ResultPage";

export default function App() {
  useEffect(() => {
    assessmentRepository.seedDemoData();
  }, []);

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
