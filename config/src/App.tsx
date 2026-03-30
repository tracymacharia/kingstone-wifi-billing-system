
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRegister from "./pages/AdminRegister";
import PaymentPortal from "./pages/PaymentPortal";
import ClientPortal from "./pages/ClientPortal";
import WiFiUserLogin from "./pages/WiFiUserLogin";
import NotFound from "./pages/NotFound";
import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";
import AdminMikrotikManager from "./pages/AdminMikrotikManager";
import AdminMikrotikList from "./pages/admin/MikrotikList";
import AdminSelfInstall from "./pages/admin/SelfInstall";
import AdminAddMikrotik from "./pages/admin/AddMikrotik";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admins/:adminId" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/mikrotik/:mikrotikId"
            element={
              <ProtectedAdminRoute>
                <AdminMikrotikManager />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/mikrotiks"
            element={
              <ProtectedAdminRoute>
                <AdminMikrotikList />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/mikrotiks/list"
            element={
              <ProtectedAdminRoute>
                <AdminMikrotikList />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/mikrotiks/add"
            element={
              <ProtectedAdminRoute>
                <AdminAddMikrotik />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/mikrotiks/self-install"
            element={
              <ProtectedAdminRoute>
                <AdminSelfInstall />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/mikrotiks/self-install/:routerId"
            element={
              <ProtectedAdminRoute>
                <AdminSelfInstall />
              </ProtectedAdminRoute>
            }
          />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route path="/portal/:mikrotikId" element={<PaymentPortal />} />
          <Route path="/client-login" element={<WiFiUserLogin />} />
          <Route path="/client/:token" element={<ClientPortal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster richColors position="top-right" closeButton />
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
