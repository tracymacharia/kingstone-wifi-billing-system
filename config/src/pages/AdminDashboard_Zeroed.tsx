import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KingstoneIcon } from "@/components/ui/Kingstone-icon";
import {
  Users,
  DollarSign,
  Activity,
  LogOut,
  Router
} from "lucide-react";
import { toast } from "sonner";
import { useDashboardVisibility } from "@/hooks/useDashboardVisibility";
import { DashboardSettings } from "@/components/ui/dashboard-settings";
import { VisibilityCard } from "@/components/ui/visibility-card";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AccountSettings from "@/components/admin/AccountSettings";
import AssignedMikrotiks from "@/components/admin/AssignedMikrotiks";
import SMSSettings from "@/components/admin/SMSSettings";
import SubscriptionStatus from "@/components/admin/SubscriptionStatus";
import RealTimeMonitor from "@/components/admin/RealTimeMonitor";
import PaymentHistory from "@/components/admin/PaymentHistory";
import EnhancedPackageManager from "@/components/admin/EnhancedPackageManager";
import VoucherManager from "@/components/admin/VoucherManager";
import WiFiUserManager from "@/components/admin/WiFiUserManager";
import BroadbandUserManager from "@/components/admin/BroadbandUserManager";
import WiFiSettings from "@/components/admin/WiFiSettings";
import RecycleBin from "@/components/admin/RecycleBin";
import BulkActions from "@/components/admin/BulkActions";
import FilteredUsersList from "@/components/admin/FilteredUsersList";
import AdminPasswordManager from "@/components/admin/AdminPasswordManager";
import { formatKESSimple } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getAdminIdFromUser } from "@/hooks/useAdminId";
import SystemAuditLogs from "@/components/shared/SystemAuditLogs";

// Zeroed components
import UserStatsCards from "@/components/admin/UserStatsCards_Zeroed";
import { AdminCharts } from "@/components/admin/AdminCharts_Zeroed";

interface Package {
  id: string;
  name: string;
  duration: string;
  price: number;
  bandwidth: string;
  type: 'hotspot' | 'pppoe' | 'static';
  packageType: 'hourly' | 'daily' | 'monthly';
  status: 'active' | 'inactive';
}

interface Payment {
  id: string;
  amount: number;
  phone: string;
  package: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

interface ConnectedUser {
  id: string;
  username: string;
  package: string;
  ipAddress: string;
  connectedAt: string;
  dataUsed: string;
  timeRemaining: string;
}

interface Mikrotik {
  id: string;
  name: string;
  routerId: string;
  ipAddress: string;
  status: 'online' | 'offline';
  mpesaType: 'till' | 'paybill';
  mpesaNumber: string;
  location?: string;
  totalEarnings?: number;
  activeUsers?: number;
}

interface AdminData {
  email: string;
  businessName: string;
  profilePicture?: string;
}

const AdminDashboardZeroed = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    settings: visibilitySettings,
    toggleVisibility,
    resetToDefaults,
    hideAll,
    showAll,
  } = useDashboardVisibility(user?.adminId || 'admin');

  // All data structures are initialized with empty arrays to show zeros
  const [packages, setPackages] = useState<Package[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [assignedMikrotiks, setAssignedMikrotiks] = useState<Mikrotik[]>([]);
  const [loading, setLoading] = useState(false); // Set to false to skip loading
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminData>({
    email: user?.email || '',
    businessName: '',
    profilePicture: ''
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate(`/admins/${user?.adminId || 'admin001'}`);
      return;
    }

    // Listen for tab changes from sidebar navigation
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      setActiveTab(searchParams.get('tab'));
    };

    // Set initial tab from URL
    const searchParams = new URLSearchParams(window.location.search);
    setActiveTab(searchParams.get('tab'));

    window.addEventListener('popstate', handlePopState);

    // Don't load real data - keep everything zeroed
    // loadDashboardData();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, navigate]);

  /*
  const loadDashboardData = async () => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) {
        console.error('No admin ID available');
        return;
      }

      setLoading(true);

      // Load packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('admin_id', adminId);

      if (!packagesError && packagesData) {
        setPackages(packagesData.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          duration: `${pkg.duration_value} ${pkg.duration_type}`,
          price: pkg.price,
          bandwidth: `${pkg.download_speed_mbps} Mbps`,
          type: pkg.package_type as 'hotspot' | 'pppoe' | 'static',
          packageType: pkg.duration_type === 'hours' ? 'hourly' : pkg.duration_type === 'days' ? 'daily' : 'monthly' as 'hourly' | 'daily' | 'monthly',
          status: pkg.is_active ? 'active' : 'inactive' as 'active' | 'inactive'
        })));
      }

      // Load payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('admin_id', adminId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!paymentsError && paymentsData) {
        setPayments(paymentsData.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          phone: payment.user_phone,
          package: payment.package_name,
          timestamp: new Date(payment.created_at).toLocaleString(),
          status: payment.status as 'completed' | 'pending' | 'failed'
        })));
      }

      // Load connected users
      const { data: connectedData, error: connectedError } = await supabase
        .from('connected_users')
        .select('*')
        .eq('admin_id', adminId)
        .eq('status', 'active')
        .order('session_start', { ascending: false });

      if (!connectedError && connectedData) {
        setConnectedUsers(connectedData.map(conn => ({
          id: conn.id,
          username: conn.username,
          package: conn.package_name || 'Unknown',
          ipAddress: conn.ip_address,
          connectedAt: new Date(conn.session_start).toLocaleString(),
          dataUsed: `${((conn.bytes_in + conn.bytes_out) / 1024 / 1024).toFixed(1)} MB`,
          timeRemaining: conn.expires_at ? `${Math.max(0, Math.floor((new Date(conn.expires_at).getTime() - Date.now()) / 60000))} min` : 'Unlimited'
        })));
      }

      // Load assigned Mikrotiks
      // Note: Using direct query - ensure RLS policy allows admin access
      const { data: mikrotiksData, error: mikrotiksError } = await supabase
        .from('mikrotiks')
        .select('*')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });

      if (!mikrotiksError && mikrotiksData) {
        setAssignedMikrotiks(mikrotiksData.map(mk => ({
          id: mk.id,
          name: mk.name,
          routerId: mk.router_id,
          ipAddress: mk.ip_address,
          status: mk.status as 'online' | 'offline',
          mpesaType: mk.mpesa_type as 'till' | 'paybill',
          mpesaNumber: mk.mpesa_number,
          location: mk.location,
          totalEarnings: mk.total_earnings || 0,
          activeUsers: mk.active_users || 0
        })));
      }

      setAdminData({
        email: user.email,
        businessName: 'Admin Dashboard',
        profilePicture: ''
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  */

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleUpdateProfile = (data: { businessName: string; profilePicture?: string }) => {
    setAdminData(prev => ({ ...prev, ...data }));
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (oldPassword === 'admin123') {
      return true;
    }
    return false;
  };

  const handleManageMikrotik = (mikrotikId: string) => {
    toast.info(`Managing Mikrotik: ${mikrotikId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'inactive':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // All values are zero since we're not loading real data
  const totalRevenue = 0;
  const activeUsers = 0;
  const totalPackages = 0;
  const totalMikrotiks = 0;

  if (!user || user.role !== 'admin') {
    return null;
  }

  const renderContent = () => {
    // Show filtered users list if a filter is active
    if (userFilter) {
      return (
        <FilteredUsersList
          filter={userFilter}
          onBack={() => setUserFilter(null)}
          selectedUsers={selectedUsers}
          onSelectionChange={setSelectedUsers}
        />
      );
    }

    if (!activeTab) {
      return (
        <>
          {/* New User Stats Cards - showing zeros */}
          <UserStatsCards onCardClick={setUserFilter} />

          {/* Bulk Actions */}
          <BulkActions
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
            onRefresh={() => {
              // Refresh user data
              setUserFilter(null);
              setSelectedUsers([]);
            }}
          />

          {/* Original Stats Cards - all zeros */}
          <div className="grid md:grid-cols-4 gap-6 mb-8 mt-8">
            <VisibilityCard
              title="Total Revenue"
              value={formatKESSimple(totalRevenue)}
              subtitle="+0% from last month"
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              isVisible={visibilitySettings.revenue}
              onToggleVisibility={() => toggleVisibility('revenue')}
            />

            <VisibilityCard
              title="Active Users"
              value={activeUsers}
              subtitle="Currently connected"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              isVisible={visibilitySettings.activeUsers}
              onToggleVisibility={() => toggleVisibility('activeUsers')}
            />

            <VisibilityCard
              title="Active Packages"
              value={totalPackages}
              subtitle="Available plans"
              icon={<KingstoneIcon className="h-4 w-4" />}
              isVisible={visibilitySettings.activePackages}
              onToggleVisibility={() => toggleVisibility('activePackages')}
            />

            <VisibilityCard
              title="My Mikrotiks"
              value={totalMikrotiks}
              subtitle="Assigned routers"
              icon={<Router className="h-4 w-4 text-muted-foreground" />}
              isVisible={visibilitySettings.mikrotiks}
              onToggleVisibility={() => toggleVisibility('mikrotiks')}
            />
          </div>

          {/* Charts - all showing zeros */}
          <AdminCharts
            visibilitySettings={visibilitySettings}
            onToggleVisibility={toggleVisibility}
          />
        </>
      );
    }

    // Tab content rendering
    switch (activeTab) {
      case 'packages':
        return <EnhancedPackageManager />;
      case 'vouchers':
        return <VoucherManager />;
      case 'wifi-users':
        return <WiFiUserManager />;
      case 'broadband-users':
        return <BroadbandUserManager />;
      case 'wifi-settings':
        return <WiFiSettings />;
      case 'recycle-bin':
        return <RecycleBin />;
      case 'payments':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Recent MPESA transactions and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="font-medium">{formatKESSimple(payment.amount)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {payment.phone} • {payment.package}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {payment.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment records found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      case 'users':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Connected Users</CardTitle>
              <CardDescription>Currently active Wi-Fi sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="font-medium">{user.username}</h3>
                          <p className="text-sm text-muted-foreground">
                            {user.ipAddress} • {user.package}
                          </p>
                        </div>
                        <Badge variant="default">
                          <Activity className="w-3 h-3 mr-1" />
                          Online
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        <div className="flex items-center space-x-4">
                          <div>
                            <span className="text-muted-foreground">Data: </span>
                            <span className="font-medium">{user.dataUsed}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Time: </span>
                            <span className="font-medium">{user.timeRemaining}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Connected: {user.connectedAt}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {connectedUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No connected users
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      case 'mikrotiks':
        return (
          <AssignedMikrotiks
            mikrotiks={assignedMikrotiks}
            onManageMikrotik={handleManageMikrotik}
          />
        );
      case 'sms':
        return <SMSSettings businessName={adminData.businessName} />;
      case 'subscription':
        return <SubscriptionStatus businessName={adminData.businessName} />;
      case 'password-management':
        return <AdminPasswordManager />;
      case 'settings':
        return (
          <AccountSettings
            adminData={adminData}
            onUpdateProfile={handleUpdateProfile}
            onChangePassword={handleChangePassword}
          />
        );
      case 'analytics':
        return <div className="text-center py-12 text-muted-foreground">Analytics data is not available (zeroed dashboard)</div>;
      case 'monitor':
        return <RealTimeMonitor />;
      case 'payment-history':
        return <PaymentHistory />;
      case 'audit-logs':
        return <SystemAuditLogs userRole="admin" userId={user?.id} />;
      default:
        return renderContent();
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30 relative overflow-hidden">
        {/* 3D Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(120,119,198,0.1)_0%,_transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(120,119,198,0.1)_0%,_transparent_70%)]"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20 animate-pulse"
              style={{
                width: `${Math.random() * 100 + 20}px`,
                height: `${Math.random() * 100 + 20}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                background: `radial-gradient(circle, ${i % 3 === 0 ? 'rgba(99, 102, 241, 0.3)' : i % 3 === 1 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(8, 145, 178, 0.3)'}, transparent)`,
                animationDuration: `${Math.random() * 10 + 10}s`,
                animationDelay: `${Math.random() * 5}s`
              }}
            ></div>
          ))}
        </div>

        <div className="relative z-10 flex w-full">
          <AdminSidebar onLogout={handleLogout} businessName={adminData.businessName || 'Admin Dashboard'} />

          <main className="flex-1 overflow-auto">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger className="shrink-0 hover:bg-accent" />
                  <div>
                    <h1 className="text-xl font-bold">
                      {adminData.businessName || 'Admin Dashboard'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {user.email} • ID: {user.adminId}
                    </p>
                  </div>
                </div>
                <DashboardSettings
                  settings={visibilitySettings}
                  onToggle={toggleVisibility}
                  onResetDefaults={resetToDefaults}
                  onHideAll={hideAll}
                  onShowAll={showAll}
                />
              </div>
            </header>

            {/* Content */}
            <div className="p-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboardZeroed;