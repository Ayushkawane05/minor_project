import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Register from "./pages/Register";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function PrivateRoute({ children, requiredRole }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;

  if (requiredRole) {
    let user = {};
    try {
      user = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return <Navigate to="/" replace />;
    }

    if (requiredRole === "Admin" && user.role !== "Admin") {
      return <Navigate to="/" replace />;
    }
    if (requiredRole === "Employee" && user.role === "Admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Employee routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute requiredRole="Employee">
              <EmployeeDashboard />
            </PrivateRoute>
          }
        />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute requiredRole="Admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
