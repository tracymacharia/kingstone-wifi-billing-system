import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KingstoneIcon } from "@/components/ui/Kingstone-icon";
import {
  Users,
  DollarSign,
  Activity,
  LogOut,
  Router,
  Eye,
  EyeOff,
  Lock,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { useDashboardVisibility } from "@/hooks/useDashboardVisibility";
import { VisibilityCard } from "@/components/ui/visibility-card";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AccountSettings from "@/components/admin/AccountSettings";
import AssignedMikrotiks from "@/components/admin/AssignedMikrotiks";
import MikrotikManagement from "@/components/admin/MikrotikManagement";
import SMSSettings from "@/components/admin/SMSSettings";
import GraphDashboard from "@/components/admin/GraphDashboard";
import RealTimeMonitor from "@/components/admin/RealTimeMonitor";
import PaymentHistory from "@/components/admin/PaymentHistory";
import EnhancedPackageManager from "@/components/admin/EnhancedPackageManager";
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
import { Package, Payment, Mikrotik } from "@/types/models";
import { logger } from "@/lib/logger";

interface ConnectedUser {
  id: string;
  username: string;
  package: string;
  ipAddress: string;
  connectedAt: string;
  dataUsed: string;
  timeRemaining: string;
}

interface AdminData {
  email: string;
  businessName: string;
  profilePicture?: string;
}

const AdminDashboard = () => {
  const { user, logout, changePassword } = useAuth();
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
  const [showForceChange, setShowForceChange] = useState(!!user?.isFirstLogin);
  const [forceNewPassword, setForceNewPassword] = useState('');
  const [forceConfirmPassword, setForceConfirmPassword] = useState('');
  const [forceChanging, setForceChanging] = useState(false);
  const [showForceNewPw, setShowForceNewPw] = useState(false);

  useEffect(() => {
    
    // Since this component is protected by ProtectedAdminRoute, the user should always be an admin
    // If for some reason they're not, redirect to admin login
    if (!user || user.role !== 'admin') {
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

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, navigate]);

  const loadDashboardData = useCallback(async () => {
    
    // Set loading to true initially
    setLoading(true);
    
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) {
        logger.error('No admin ID available');
        toast.error('No admin ID available');
        // Still need to set loading to false even if adminId is not available
        setLoading(false);
        return;
      }


      // Load packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('admin_id', adminId);

      if (packagesError) {
        logger.error('Error loading packages:', packagesError);
        toast.error('Failed to load packages');
      } else if (packagesData) {
        setPackages(packagesData.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          package_type: pkg.package_type,
          duration_type: pkg.duration_type,
          duration_value: pkg.duration_value,
          price: pkg.price,
          is_active: pkg.is_active,
          admin_id: pkg.admin_id,
          created_at: pkg.created_at,
          duration: `${pkg.duration_value} ${pkg.duration_type}`,
          bandwidth: `${pkg.bandwidth_limit_mb || 0} MB`,
          type: pkg.package_type as 'hotspot' | 'pppoe' | 'static',
          packageType: pkg.duration_type === 'hours' ? 'hourly' : pkg.duration_type === 'days' ? 'daily' : 'monthly' as 'hourly' | 'daily' | 'monthly',
          status: pkg.is_active ? 'active' : 'inactive' as 'active' | 'inactive'
        } as any)));
      }

      // Load payments (last 20)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, admin_id, amount, user_phone, created_at, status')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (paymentsError) {
        logger.error('Error loading payments:', paymentsError);
      } else if (paymentsData) {
        setPayments(paymentsData.map(p => ({
          id: p.id,
          admin_id: p.admin_id,
          amount: p.amount,
          phone: p.user_phone || '',
          created_at: p.created_at,
          status: p.status as 'completed' | 'pending' | 'failed'
        })));
      }

      // Load active wifi users
      const { data: connectedData, error: connectedError } = await supabase
        .from('wifi_users')
        .select('id, username, package:package_id(name), package_expires_at')
        .eq('admin_id', adminId)
        .eq('is_active', true)
        .limit(50);

      if (connectedError) {
        logger.error('Error loading users:', connectedError);
      } else if (connectedData) {
        setConnectedUsers(connectedData.map((u: any) => ({
          id: u.id,
          username: u.username,
          package: (u.package as any)?.name || 'Basic',
          timeRemaining: u.package_expires_at
            ? getTimeRemaining(u.package_expires_at)
            : 'Active'
        })));
      }

      // Load assigned Mikrotiks with full details for management
      // Note: Using direct query - ensure RLS policy allows admin access
      const { data: mikrotiksData, error: mikrotiksError } = await supabase
        .from('mikrotiks')
        .select('*')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });

      if (mikrotiksError) {
        logger.error('Error loading Mikrotiks:', mikrotiksError);
        toast.error('Failed to load Mikrotik devices');
      } else if (mikrotiksData) {
        setAssignedMikrotiks(mikrotiksData.map(mk => ({
          id: mk.id,
          name: mk.name,
          routerId: mk.router_id,
          ipAddress: mk.ip_address,
          apiPort: mk.api_port || 8728,
          username: mk.username,
          password: mk.password_encrypted,
          adminId: mk.admin_id,
          status: mk.status as 'online' | 'offline',
          mpesaType: mk.mpesa_type as 'till' | 'paybill',
          mpesaNumber: mk.mpesa_number,
          location: mk.location,
          totalEarnings: mk.total_earnings || 0,
          activeUsers: mk.active_users || 0
        })));
      }

      // Load admin business name from admins table
      const { data: adminRecord, error: adminError } = await supabase
        .from('admins')
        .select('business_name, email')
        .eq('id', adminId)
        .maybeSingle();

      if (adminError) {
        logger.error('Error loading admin data:', adminError);
      }

      setAdminData({
        email: adminRecord?.email || user.email,
        businessName: adminRecord?.business_name || user.username || 'Admin Dashboard',
        profilePicture: ''
      });

    } catch (error) {
      logger.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      // Ensure loading is set to false even if there are errors
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
    if (!user?.username) return false;
    const success = await changePassword(user.username, newPassword);
    if (success) toast.success('Password changed successfully');
    else toast.error('Failed to change password');
    return success;
  };

  const handleForcePasswordChange = async () => {
    if (!user?.username) return;
    if (forceNewPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (forceNewPassword !== forceConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setForceChanging(true);
    try {
      const success = await changePassword(user.username, forceNewPassword);
      if (success) {
        toast.success('Password changed successfully. Welcome!');
        setShowForceChange(false);
        const stored = sessionStorage.getItem('kingstone_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.isFirstLogin = false;
          sessionStorage.setItem('kingstone_user', JSON.stringify(parsed));
        }
      } else {
        toast.error('Failed to change password. Please try again.');
      }
    } catch {
      toast.error('Failed to change password. Please try again.');
    } finally {
      setForceChanging(false);
    }
  };

  const handleManageMikrotik = (mikrotikId: string) => {
    // This is now handled by the MikrotikManagement component
  };

  const handleMikrotikAdd = async (newMikrotik: Omit<Mikrotik, 'id'>) => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) {
        toast.error('No admin ID available');
        return;
      }

      // Create Mikrotik directly
      const { data, error } = await supabase
        .from('mikrotiks')
        .insert({
          name: newMikrotik.name,
          router_id: newMikrotik.routerId,
          ip_address: newMikrotik.ipAddress || null,
          api_port: newMikrotik.apiPort,
          username: newMikrotik.username,
          password_encrypted: newMikrotik.password,
          admin_id: adminId,
          status: newMikrotik.status,
          mpesa_type: newMikrotik.mpesaType,
          mpesa_number: newMikrotik.mpesaNumber || null,
          location: newMikrotik.location || null,
          owner_id: null,
          total_earnings: 0,
          active_users: 0
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating Mikrotik:', error);
        toast.error('Failed to create Mikrotik: ' + error.message);
        return;
      }

      const mikrotik = { ...newMikrotik, id: data.id };
      setAssignedMikrotiks([...assignedMikrotiks, mikrotik]);
      toast.success('Mikrotik router added successfully!');

      // Refresh the data to ensure consistency
      await loadDashboardData();
    } catch (error: any) {
      logger.error('Error creating Mikrotik:', error);
      toast.error('Failed to create Mikrotik: ' + (error.message || 'Unknown error'));
    }
  };

  const handleMikrotikUpdate = async (updatedMikrotik: Mikrotik) => {
    try {
      // Update Mikrotik directly
      const { error } = await supabase
        .from('mikrotiks')
        .update({
          name: updatedMikrotik.name,
          router_id: updatedMikrotik.routerId,
          ip_address: updatedMikrotik.ipAddress,
          api_port: updatedMikrotik.apiPort,
          username: updatedMikrotik.username,
          password_encrypted: updatedMikrotik.password,
          status: updatedMikrotik.status,
          mpesa_type: updatedMikrotik.mpesaType,
          mpesa_number: updatedMikrotik.mpesaNumber,
          location: updatedMikrotik.location || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedMikrotik.id);

      if (error) {
        logger.error('Error updating Mikrotik:', error);
        toast.error('Failed to update Mikrotik: ' + error.message);
        return;
      }

      setAssignedMikrotiks(assignedMikrotiks.map(mikrotik => mikrotik.id === updatedMikrotik.id ? updatedMikrotik : mikrotik));
      toast.success('Mikrotik updated successfully!');

      // Refresh the data to ensure consistency
      await loadDashboardData();
    } catch (error: any) {
      logger.error('Error updating Mikrotik:', error);
      toast.error('Failed to update Mikrotik: ' + (error.message || 'Unknown error'));
    }
  };

  const handleMikrotikDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Mikrotik? This will remove the router configuration.')) {
      return;
    }

    try {
      // Use RPC to delete Mikrotik
      const sessionToken = sessionStorage.getItem('kingstone_session_token');
      const { data, error } = await supabase.rpc('admin_delete_mikrotik', {
        p_session_token: sessionToken,
        p_mikrotik_id: id
      });

      if (error) {
        logger.error('Error deleting Mikrotik via RPC:', error);
        toast.error('Failed to delete Mikrotik: ' + error.message);
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Failed to delete Mikrotik');
        return;
      }

      setAssignedMikrotiks(assignedMikrotiks.filter(mikrotik => mikrotik.id !== id));
      toast.success('Mikrotik deleted successfully');

      // Refresh the data to ensure consistency
      await loadDashboardData();
    } catch (error: any) {
      logger.error('Error deleting Mikrotik:', error);
      toast.error('Failed to delete Mikrotik: ' + (error.message || 'Unknown error'));
    }
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

  const getTimeRemaining = (expiresAt: string) => {
    const end = new Date(expiresAt).getTime();
    const now = Date.now();
    const diff = end - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    }
    return `${hours}h ${minutes}m left`;
  };

  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const activeUsers = connectedUsers.length;
  const totalPackages = packages.filter(p => p.status === 'active').length;
  const totalMikrotiks = assignedMikrotiks.length;

  // Note: Authentication is handled by ProtectedAdminRoute, so we assume user is authenticated as admin
  // If we reach this point, the user should be authenticated as an admin

  const renderContent = () => {
    
    // Check if all data arrays are empty
    if (packages.length === 0 && payments.length === 0 && connectedUsers.length === 0 && assignedMikrotiks.length === 0) {
    }
    
    try {
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

      // Tab content rendering
      switch (activeTab) {
        case 'packages':
          return <EnhancedPackageManager />;
        case 'reconnections':
          return <ReconnectionManager />;
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
                <CardTitle>Payments</CardTitle>
                <CardDescription>Recent payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No payments yet</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: payment.status === 'completed' ? '#dcfce7' : '#fef3c7' }}>
                            <CreditCard className={`w-5 h-5 ${payment.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium">KES {payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{payment.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {payment.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(payment.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        case 'users':
          return (
            <Card>
              <CardHeader>
                <CardTitle>Connected Users</CardTitle>
                <CardDescription>Currently active users</CardDescription>
              </CardHeader>
              <CardContent>
                {connectedUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No active users</p>
                ) : (
                  <div className="space-y-2">
                    {connectedUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100">
                            <Activity className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-xs text-muted-foreground">{user.package}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="default" className="text-xs">Active</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{user.timeRemaining}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        case 'mikrotiks':
          return (
            <MikrotikManagement
              admins={[]}
              mikrotiks={assignedMikrotiks}
              onMikrotikAdd={handleMikrotikAdd}
              onMikrotikUpdate={handleMikrotikUpdate}
              onMikrotikDelete={handleMikrotikDelete}
              onLoadData={loadDashboardData}
              filter={null}
              onClearFilter={() => {}}
            />
          );
        case 'sms':
          return <SMSSettings businessName={adminData.businessName} />;
        case 'password-management':
          return <AdminPasswordManager />;
        case 'business-contact':
          return <BusinessContactInfo />;
        case 'settings':
          return (
            <AccountSettings
              adminData={adminData}
              onUpdateProfile={handleUpdateProfile}
              onChangePassword={handleChangePassword}
            />
          );
        case 'analytics':
          return <GraphDashboard adminId={user?.adminId || user?.id || ''} />;
        case 'monitor':
          return <RealTimeMonitor />;
        case 'payment-history':
          return <PaymentHistory />;
        case 'audit-logs':
          return <SystemAuditLogs userRole="admin" userId={user?.id} />;
        default:
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
      logger.error('Error rendering dashboard content:', error);
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

  return (
    <SidebarProvider>
      {/* Force password change overlay for first login */}
      {showForceChange && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-xl">Set Your Password</CardTitle>
              <CardDescription>
                This is your first login. Please create a new password to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <Input
                    type={showForceNewPw ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={forceNewPassword}
                    onChange={(e) => setForceNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleForcePasswordChange()}
                    disabled={forceChanging}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShowForceNewPw(!showForceNewPw)}
                  >
                    {showForceNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Repeat your new password"
                  value={forceConfirmPassword}
                  onChange={(e) => setForceConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleForcePasswordChange()}
                  disabled={forceChanging}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleForcePasswordChange}
                disabled={forceChanging || !forceNewPassword || !forceConfirmPassword}
              >
                {forceChanging ? 'Saving...' : 'Set Password & Continue'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

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