import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SessionTimeoutModal from "./components/SessionTimeoutModal";
import AppLayout from "./components/AppLayout";

import Login from "./pages/Login";
import OtpLogin from "./pages/OtpLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import MyProfile from "./pages/MyProfile";
import StudentList from "./pages/StudentList";
import ManageStudent from "./pages/ManageStudent";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSecuritySettings from "./pages/admin/AdminSecuritySettings";
import ChangePassword from "./pages/ChangePassword";
import MyAttendance from "./pages/MyAttendance";
import AttendanceMark from "./pages/AttendanceMark";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SessionTimeoutModal />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/login-otp" element={<OtpLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/my-profile" element={
                <ProtectedRoute roles={["student"]}><MyProfile /></ProtectedRoute>
              } />
              <Route path="/my-attendance" element={
                <ProtectedRoute roles={["student"]}><MyAttendance /></ProtectedRoute>
              } />
              <Route path="/attendance/mark" element={
                <ProtectedRoute roles={["admin", "faculty"]}><AttendanceMark /></ProtectedRoute>
              } />
              <Route path="/students" element={
                <ProtectedRoute roles={["admin", "faculty"]}><StudentList /></ProtectedRoute>
              } />
              <Route path="/students/:studentId" element={
                <ProtectedRoute roles={["admin", "faculty"]}><ManageStudent /></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute roles={["admin"]}><AdminUsers /></ProtectedRoute>
              } />
              <Route path="/admin/security-settings" element={
                <ProtectedRoute roles={["admin"]}><AdminSecuritySettings /></ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
