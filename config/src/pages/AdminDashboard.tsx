import { useEffect, useState, useCallback } from "react";
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
import { AdminCharts } from "@/components/admin/AdminCharts";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AccountSettings from "@/components/admin/AccountSettings";
import AssignedMikrotiks from "@/components/admin/AssignedMikrotiks";
import SMSSettings from "@/components/admin/SMSSettings";
import SubscriptionStatus from "@/components/admin/SubscriptionStatus";
import GraphDashboard from "@/components/admin/GraphDashboard";
import RealTimeMonitor from "@/components/admin/RealTimeMonitor";
import PaymentHistory from "@/components/admin/PaymentHistory";
import EnhancedPackageManager from "@/components/admin/EnhancedPackageManager";
import VoucherManager from "@/components/admin/VoucherManager";
import ReconnectionManager from "@/components/admin/ReconnectionManager";
import WiFiUserManager from "@/components/admin/WiFiUserManager";
import BroadbandUserManager from "@/components/admin/BroadbandUserManager";
import WiFiSettings from "@/components/admin/WiFiSettings";
import BusinessContactInfo from "@/components/admin/BusinessContactInfo";
import RecycleBin from "@/components/admin/RecycleBin";
import UserStatsCards from "@/components/admin/UserStatsCards";
import BulkActions from "@/components/admin/BulkActions";
import FilteredUsersList from "@/components/admin/FilteredUsersList";
import AdminPasswordManager from "@/components/admin/AdminPasswordManager";
import { formatKESSimple } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getAdminIdFromUser } from "@/hooks/useAdminId";
import SystemAuditLogs from "@/components/shared/SystemAuditLogs";

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

const AdminDashboard = () => {
  console.log('AdminDashboard component mounted');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    settings: visibilitySettings,
    toggleVisibility,
    resetToDefaults,
    hideAll,
    showAll,
  } = useDashboardVisibility(user?.adminId || 'admin');
  
  const [packages, setPackages] = useState<Package[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [assignedMikrotiks, setAssignedMikrotiks] = useState<Mikrotik[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminData>({
    email: user?.email || '',
    businessName: '',
    profilePicture: ''
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<string | null>(null);

  useEffect(() => {
    console.log('AdminDashboard useEffect triggered');
    console.log('User object:', user);
    console.log('User role:', user?.role);
    
    // Since this component is protected by ProtectedAdminRoute, the user should always be an admin
    // If for some reason they're not, redirect to admin login
    if (!user || user.role !== 'admin') {
      console.log('User not authenticated as admin, redirecting to /admin');
      navigate('/admin');
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
    console.log('Initial active tab from URL:', searchParams.get('tab'));

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, navigate]);

  const loadDashboardData = useCallback(async () => {
    console.log('Starting to load dashboard data...');
    console.log('User object in loadDashboardData:', user);
    
    // Set loading to true initially
    setLoading(true);
    
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) {
        console.error('No admin ID available');
        toast.error('No admin ID available');
        // Still need to set loading to false even if adminId is not available
        setLoading(false);
        return;
      }

      console.log('Admin ID:', adminId);

      // Load packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('admin_id', adminId);

      if (packagesError) {
        console.error('Error loading packages:', packagesError);
        toast.error('Failed to load packages');
      } else if (packagesData) {
        console.log('Loaded packages:', packagesData.length);
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

      if (paymentsError) {
        console.error('Error loading payments:', paymentsError);
        toast.error('Failed to load payments');
      } else if (paymentsData) {
        console.log('Loaded payments:', paymentsData.length);
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

      if (connectedError) {
        console.error('Error loading connected users:', connectedError);
        toast.error('Failed to load connected users');
      } else if (connectedData) {
        console.log('Loaded connected users:', connectedData.length);
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

      if (mikrotiksError) {
        console.error('Error loading Mikrotiks:', mikrotiksError);
        toast.error('Failed to load Mikrotik devices');
      } else if (mikrotiksData) {
        console.log('Loaded Mikrotiks:', mikrotiksData.length);
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
      // Ensure loading is set to false even if there are errors
      console.log('Setting loading to false in finally block');
      setLoading(false);
    }
  }, [user, setPackages, setPayments, setConnectedUsers, setAssignedMikrotiks, setAdminData, setLoading, toast]);

  // Load dashboard data when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

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

  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const activeUsers = connectedUsers.length;
  const totalPackages = packages.filter(p => p.status === 'active').length;
  const totalMikrotiks = assignedMikrotiks.length;

  // Note: Authentication is handled by ProtectedAdminRoute, so we assume user is authenticated as admin
  // If we reach this point, the user should be authenticated as an admin

  const renderContent = () => {
    console.log('renderContent called');
    console.log('Active tab:', activeTab);
    console.log('Loading state:', loading);
    console.log('User filter:', userFilter);
    console.log('Number of packages:', packages.length);
    console.log('Number of payments:', payments.length);
    console.log('Number of connected users:', connectedUsers.length);
    console.log('Number of assigned Mikrotiks:', assignedMikrotiks.length);
    
    // Check if all data arrays are empty
    if (packages.length === 0 && payments.length === 0 && connectedUsers.length === 0 && assignedMikrotiks.length === 0) {
      console.log('All data arrays are empty, but should still render default dashboard');
    }
    
    try {
      // Show filtered users list if a filter is active
      if (userFilter) {
        console.log('Rendering filtered users list');
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
        console.log('Rendering default dashboard view');
        return (
          <>
            {/* New User Stats Cards */}
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

            {/* Original Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 mt-6 sm:mt-8">
              <VisibilityCard
                title="Total Revenue"
                value={formatKESSimple(totalRevenue)}
                subtitle="+12% from last month"
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

            {/* Charts */}
            <AdminCharts
              visibilitySettings={visibilitySettings}
              onToggleVisibility={toggleVisibility}
            />
          </>
        );
      }

      console.log('Switching to tab:', activeTab);
      // Tab content rendering
      switch (activeTab) {
        case 'packages':
          console.log('Rendering packages tab');
          return <EnhancedPackageManager />;
        case 'vouchers':
          console.log('Rendering vouchers tab');
          return <VoucherManager />;
        case 'reconnections':
          console.log('Rendering reconnections tab');
          return <ReconnectionManager />;
        case 'wifi-users':
          console.log('Rendering wifi-users tab');
          return <WiFiUserManager />;
        case 'broadband-users':
          console.log('Rendering broadband-users tab');
          return <BroadbandUserManager />;
        case 'wifi-settings':
          console.log('Rendering wifi-settings tab');
          return <WiFiSettings />;
        case 'recycle-bin':
          console.log('Rendering recycle-bin tab');
          return <RecycleBin />;
        case 'payments':
          console.log('Rendering payments tab');
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
                </div>
              </CardContent>
            </Card>
          );
        case 'users':
          console.log('Rendering users tab');
          return (
            <Card>
              <CardHeader>
                <CardTitle>Connected Users</CardTitle>
                <CardDescription>Currently active Wi-Fi sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {connectedUsers.map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-2 sm:gap-0">
                          <div>
                            <h3 className="font-medium">{user.username}</h3>
                            <p className="text-sm text-muted-foreground">
                              {user.ipAddress} • {user.package}
                            </p>
                          </div>
                          <Badge variant="default" className="w-fit">
                            <Activity className="w-3 h-3 mr-1" />
                            Online
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right w-full sm:w-auto">
                        <div className="text-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-1 sm:gap-0">
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
                </div>
              </CardContent>
            </Card>
          );
        case 'mikrotiks':
          console.log('Rendering mikrotiks tab');
          return (
            <AssignedMikrotiks
              mikrotiks={assignedMikrotiks}
              onManageMikrotik={handleManageMikrotik}
            />
          );
        case 'sms':
          console.log('Rendering sms tab');
          return <SMSSettings businessName={adminData.businessName} />;
        case 'subscription':
          console.log('Rendering subscription tab');
          return <SubscriptionStatus businessName={adminData.businessName} />;
        case 'password-management':
          console.log('Rendering password-management tab');
          return <AdminPasswordManager />;
        case 'business-contact':
          console.log('Rendering business-contact tab');
          return <BusinessContactInfo />;
        case 'settings':
          console.log('Rendering settings tab');
          return (
            <AccountSettings
              adminData={adminData}
              onUpdateProfile={handleUpdateProfile}
              onChangePassword={handleChangePassword}
            />
          );
        case 'analytics':
          console.log('Rendering analytics tab');
          return <GraphDashboard adminId={user?.adminId || user?.id || ''} />;
        case 'monitor':
          console.log('Rendering monitor tab');
          return <RealTimeMonitor />;
        case 'payment-history':
          console.log('Rendering payment-history tab');
          return <PaymentHistory />;
        case 'audit-logs':
          console.log('Rendering audit-logs tab');
          return <SystemAuditLogs userRole="admin" userId={user?.id} />;
        default:
          console.log('Rendering default view for unknown tab');
          // Default to showing dashboard overview if tab is unknown
          return (
            <>
              {/* New User Stats Cards */}
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

              {/* Original Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 mt-6 sm:mt-8">
                <VisibilityCard
                  title="Total Revenue"
                  value={formatKESSimple(totalRevenue)}
                  subtitle="+12% from last month"
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

              {/* Charts */}
              <AdminCharts
                visibilitySettings={visibilitySettings}
                onToggleVisibility={toggleVisibility}
              />
            </>
          );
      }
    } catch (error) {
      console.error('Error rendering dashboard content:', error);
      return (
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Error Loading Dashboard</CardTitle>
              <CardDescription>Please refresh the page or contact support if the problem persists.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  };

  console.log('About to render AdminDashboard JSX');
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30 relative">
        {/* 3D Background - fixed position, doesn't affect layout */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(120,119,198,0.1)_0%,_transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(120,119,198,0.1)_0%,_transparent_70%)]"></div>
        </div>

        {/* Floating Elements - fixed position, doesn't affect layout */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20 animate-pulse"
              style={{
                width: `${Math.min(window.innerWidth * 0.1, 100) + 20}px`,
                height: `${Math.min(window.innerWidth * 0.1, 100) + 20}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                background: `radial-gradient(circle, ${i % 3 === 0 ? 'rgba(99, 102, 241, 0.3)' : i % 3 === 1 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(8, 145, 178, 0.3)'}, transparent)`,
                animationDuration: `${Math.random() * 10 + 10}s`,
                animationDelay: `${Math.random() * 5}s`
              }}
            ></div>
          ))}
        </div>

        <div className="relative z-10 flex w-full min-w-0">
          <AdminSidebar onLogout={handleLogout} businessName={adminData.businessName || 'Admin Dashboard'} />

          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 gap-4">
                <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                  <SidebarTrigger className="shrink-0 hover:bg-accent" />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-xl font-bold truncate">
                      {adminData.businessName || 'Admin Dashboard'}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      <span className="hidden sm:inline">{user.email}</span>
                      <span className="sm:hidden">{user.email?.split('@')[0]}</span>
                      {' • '}
                      <span className="hidden xs:inline">ID: {user.adminId}</span>
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

            {/* Content - scrollable area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
              <div className="w-full">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  </div>
                ) : (
                  renderContent()
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;