import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users,
  Router,
  Settings,
  LogOut,
  DollarSign,
  Activity,
  CreditCard,
  Copy
} from "lucide-react";
import { useDashboardVisibility } from "@/hooks/useDashboardVisibility";
import { DashboardSettings } from "@/components/ui/dashboard-settings";
import { VisibilityCard } from "@/components/ui/visibility-card";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { OwnerChartsZeroed } from "@/components/owner/OwnerCharts_Zeroed"; // Use zeroed charts
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminManagement from "@/components/owner/AdminManagement";
import MikrotikManagement from "@/components/owner/MikrotikManagement";
import SystemAnalytics from "@/components/owner/SystemAnalytics";
import PasswordManager from "@/components/owner/PasswordManager";
import SubscriptionManagement from "@/components/owner/SubscriptionManagement";
import { AdminPaymentSettings } from "@/components/owner/AdminPaymentSettings";
import NotificationTemplateManager from "@/components/owner/NotificationTemplateManager";
import SystemAuditLogs from "@/components/shared/SystemAuditLogs";

interface Admin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  loginUrl: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastReset?: string;
  resetBy?: string;
  mustChangePassword?: boolean;
}

interface Mikrotik {
  id: string;
  name: string;
  routerId: string;
  ipAddress: string;
  apiPort: number;
  username: string;
  password: string;
  adminId: string;
  status: 'online' | 'offline';
  mpesaType: 'till' | 'paybill';
  mpesaNumber: string;
  location?: string;
}

const OwnerDashboardZeroed = () => {
  const { user, logout, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const {
    settings: visibilitySettings,
    toggleVisibility,
    resetToDefaults,
    hideAll,
    showAll,
  } = useDashboardVisibility(user?.id || 'owner');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [mikrotiks, setMikrotiks] = useState<Mikrotik[]>([]);
  const [loading, setLoading] = useState(false); // Set to false to skip loading
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string>(() => {
    // Try to get cached owner name from localStorage first
    const savedOwnerName = localStorage.getItem('ownerName');
    return savedOwnerName || 'Owner';
  });
  const [ownerId, setOwnerId] = useState<string | null>(() => {
    // Try to get ownerId from localStorage first
    const savedOwnerId = localStorage.getItem('ownerId');
    return savedOwnerId || null;
  });
  const [numericOwnerId, setNumericOwnerId] = useState<number | null>(null);

  useEffect(() => {
    // Wait for auth to be initialized before checking user role
    if (authIsLoading) {
      return; // Still loading, don't do anything yet
    }

    if (!user || user.role !== 'owner') {
      navigate('/owner');
      return;
    }

    // Don't load real data - keep everything zeroed
    // fetchOwnerNameAndId();

    // Listen for tab changes from sidebar navigation
    const handlePopState = () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        setActiveTab(searchParams.get('tab'));
      } catch (error) {
        console.error('Error handling popstate:', error);
      }
    };

    // Set initial tab from URL
    try {
      const searchParams = new URLSearchParams(window.location.search);
      setActiveTab(searchParams.get('tab'));
    } catch (error) {
      console.error('Error parsing URL search params:', error);
    }

    window.addEventListener('popstate', handlePopState);

    // Don't load real data from database - keep everything zeroed
    // loadOwnerData();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, navigate, authIsLoading, ownerId]);

  // Additional effect to handle updates to user data
  useEffect(() => {
    if (user && user.role === 'owner' && !authIsLoading && user.email) {
      // Update owner name if it's still the default 'Owner', if it's the user ID, or if it appears to be a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerName);
      if (ownerName === 'Owner' || ownerName === user.id || isUUID) {
        const fetchUpdatedOwnerName = async () => {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('email', user.email)
              .eq('role', 'owner')
              .single();

            if (!profileError && profileData && profileData.full_name) {
              const displayName = profileData.full_name.split(' ')[0]; // Use first name
              setOwnerName(displayName);
              localStorage.setItem('ownerName', displayName);
            } else if (user.user_metadata?.full_name) {
              const displayName = user.user_metadata.full_name.split(' ')[0];
              setOwnerName(displayName);
              localStorage.setItem('ownerName', displayName);
            } else if (user.user_metadata?.first_name) {
              setOwnerName(user.user_metadata.first_name);
              localStorage.setItem('ownerName', user.user_metadata.first_name);
            } else {
              const nameFromEmail = user.email.split('@')[0];
              const displayName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1); // Capitalize first letter
              setOwnerName(displayName);
              localStorage.setItem('ownerName', displayName);
            }
          } catch (error: any) {
            console.error('Error fetching updated owner name:', error);
          }
        };

        fetchUpdatedOwnerName();
      }
    }
  }, [user, authIsLoading, ownerName]);

  /*
  const loadOwnerData = async () => {
    try {
      setLoading(true);

      // Load admin data from the admins table (which includes business info, subscription status, etc.)
      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select(`
          id,
          username,
          email,
          phone,
          business_name,
          subscription_status,
          subscription_type,
          subscription_expires_at,
          earnings_total
        `)
        .order('created_at', { ascending: false });

      if (adminsError) {
        console.error('Error loading admin data:', adminsError);
        toast.error('Failed to load admin data: ' + adminsError.message);
      } else if (adminsData) {
        // Also get the credential info for must_change_password status
        const { data: credentialsData, error: credentialsError } = await supabase
          .from('system_credentials')
          .select('id, must_change_password')
          .eq('role', 'admin');

        const credentialsMap: Record<string, { must_change_password: boolean }> = {};
        if (!credentialsError && credentialsData) {
          credentialsData.forEach(cred => {
            credentialsMap[cred.id] = { must_change_password: cred.must_change_password };
          });
        }

        setAdmins(adminsData.map(admin => ({
          id: admin.id,
          name: admin.username,
          email: admin.email || 'Not set',
          phone: admin.phone || 'Not set',
          business_name: admin.business_name,
          loginUrl: `${window.location.origin}/admin-login`,
          status: 'active' as const,
          createdAt: new Date().toISOString(), // Using current date as we don't have it in the admins table
          mustChangePassword: credentialsMap[admin.id]?.must_change_password ?? false,
          lastReset: '', // This would need to be tracked separately if needed
          resetBy: '',   // This would need to be tracked separately if needed
          subscription_status: admin.subscription_status,
          subscription_type: admin.subscription_type,
          subscription_expires_at: admin.subscription_expires_at,
          earnings_total: admin.earnings_total
        })));
      }

      // Load Mikrotiks
      const { data: mikrotiksData, error: mikrotiksError } = await supabase
        .from('mikrotiks')
        .select('*')
        .order('created_at', { ascending: false });

      if (mikrotiksError) {
        console.error('Error loading Mikrotik devices:', mikrotiksError);
        toast.error('Failed to load Mikrotik devices: ' + mikrotiksError.message);
      } else if (mikrotiksData) {
        setMikrotiks(mikrotiksData.map(mk => ({
          id: mk.id,
          name: mk.name,
          routerId: mk.router_id,
          ipAddress: mk.ip_address,
          apiPort: mk.api_port,
          username: mk.username,
          password: mk.password, // This is encrypted in DB
          adminId: mk.admin_id,
          status: mk.status as 'online' | 'offline',
          mpesaType: mk.mpesa_type as 'till' | 'paybill',
          mpesaNumber: mk.mpesa_number,
          location: mk.location || undefined
        })));
      }

    } catch (error: any) {
      console.error('Error loading owner data:', error);
      toast.error('Failed to load dashboard data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  */

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Error during logout:', error);
      toast.error('Error during logout: ' + (error.message || 'Unknown error'));
      navigate('/');
    }
  };

  const handleAdminAdd = (newAdmin: Admin) => {
    // Add the new admin to the local state
    setAdmins(prev => [...prev, newAdmin]);
    toast.success('Admin added successfully');

    // Refresh the data to ensure consistency
    // loadOwnerData();
  };

  const handleAdminUpdate = async (updatedAdmin: Admin) => {
    try {
      setAdmins(prev => prev.map(admin => admin.id === updatedAdmin.id ? updatedAdmin : admin));
      toast.success('Admin updated successfully');

      // Don't update the database - keep everything zeroed
      // await loadOwnerData();
    } catch (error: any) {
      console.error('Error updating admin:', error);
      toast.error('Failed to update admin: ' + (error.message || 'Unknown error'));
    }
  };

  const handleAdminDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin? This will also delete all associated data.')) {
      return;
    }

    setAdmins(prev => prev.filter(admin => admin.id !== id));
    toast.success('Admin deleted successfully');

    // Don't update the database - keep everything zeroed
    // await loadOwnerData();
  };

  const handleAdminReset = async (id: string) => {
    setAdmins(prev => prev.map(admin =>
      admin.id === id
        ? {
            ...admin,
            mustChangePassword: true,
            lastReset: new Date().toISOString().split('T')[0],
            resetBy: 'System Owner'
          }
        : admin
    ));

    toast.success('Admin reset successfully');

    // Don't update the database - keep everything zeroed
    // await loadOwnerData();
  };

  const handleMikrotikAdd = async (newMikrotik: Omit<Mikrotik, 'id'>) => {
    try {
      const mikrotik = { ...newMikrotik, id: 'temp-id' };
      setMikrotiks([...mikrotiks, mikrotik]);
      toast.success('Mikrotik created successfully');

      // Don't update the database - keep everything zeroed
      // await loadOwnerData();
    } catch (error: any) {
      console.error('Error creating Mikrotik:', error);
      toast.error('Failed to create Mikrotik: ' + (error.message || 'Unknown error'));
    }
  };

  const handleMikrotikUpdate = async (updatedMikrotik: Mikrotik) => {
    try {
      setMikrotiks(mikrotiks.map(mikrotik => mikrotik.id === updatedMikrotik.id ? updatedMikrotik : mikrotik));
      toast.success('Mikrotik updated successfully');

      // Don't update the database - keep everything zeroed
      // await loadOwnerData();
    } catch (error: any) {
      console.error('Error updating Mikrotik:', error);
      toast.error('Failed to update Mikrotik: ' + (error.message || 'Unknown error'));
    }
  };

  const handleMikrotikDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Mikrotik?')) {
      return;
    }

    setMikrotiks(mikrotiks.filter(mikrotik => mikrotik.id !== id));
    toast.success('Mikrotik deleted successfully');

    // Don't update the database - keep everything zeroed
    // await loadOwnerData();
  };

  const copyRegistrationLink = (useNumericId: boolean = false) => {
    if (!ownerId && !numericOwnerId) {
      toast.error('Owner ID not available');
      return;
    }

    const registrationLink = useNumericId && numericOwnerId
      ? `${window.location.origin}/admin/register?numericOwnerId=${numericOwnerId}`
      : `${window.location.origin}/admin/register?ownerId=${ownerId}`;

    navigator.clipboard.writeText(registrationLink)
      .then(() => {
        toast.success('Registration link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy registration link:', err);
        toast.error('Failed to copy registration link');
      });
  };

  const copyOwnerId = () => {
    if (!ownerId) {
      toast.error('Owner ID not available');
      return;
    }

    navigator.clipboard.writeText(ownerId)
      .then(() => {
        toast.success('Owner ID copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy owner ID:', err);
        toast.error('Failed to copy owner ID');
      });
  };

  const copyNumericOwnerId = () => {
    if (!numericOwnerId) {
      toast.error('Numeric Owner ID not available');
      return;
    }

    navigator.clipboard.writeText(numericOwnerId.toString())
      .then(() => {
        toast.success('Numeric Owner ID copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy numeric owner ID:', err);
        toast.error('Failed to copy numeric owner ID');
      });
  };

  // Calculate zeroed totals
  const totalAdmins = 0; // Since we're not loading real data
  const totalMikrotiks = 0; // Since we're not loading real data
  const totalRevenue = 0; // Zeroed revenue
  const systemHealth = 0; // Zeroed system health percentage

  // Show loading state while auth is being initialized
  if (authIsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30 relative overflow-hidden">
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

        <div className="flex flex-col items-center space-y-4 relative z-10">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return null;
  }

  const renderContent = () => {
    if (!activeTab) {
      return (
        <>
          {/* Welcome Banner */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 text-white">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome back, {ownerName}!</h2>
                  <p className="text-primary-foreground/90">Here's what's happening with your Kingstone system today.</p>
                </div>
                <div className="flex space-x-2 mt-4 md:mt-0">
                  <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white">
                    Quick Actions
                  </Button>
                  <Button variant="default" className="bg-accent hover:bg-accent/90 text-white">
                    View Reports
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Owner ID */}
          <div className="mb-8">
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Owner Information</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Share your Owner ID with potential admins so they can register under your business
                    </p>

                    <div className="space-y-4">
                      {/* UUID-based owner ID */}
                      {ownerId && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Owner ID (UUID)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 font-mono text-sm bg-white p-2 rounded border">
                              {ownerId}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={copyOwnerId}
                              className="flex items-center whitespace-nowrap"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy ID
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Numeric owner ID */}
                      {numericOwnerId && (
                        <div className="space-y-2 pt-2 border-t border-muted">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Numeric Owner ID (Recommended)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 font-mono text-sm bg-white p-2 rounded border">
                              {numericOwnerId}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={copyNumericOwnerId}
                              className="flex items-center whitespace-nowrap"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy ID
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                        <p className="font-medium text-blue-800 mb-1">How to use:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                          <li>Share your Owner ID with potential admins</li>
                          <li>They'll use this ID when registering their admin account</li>
                          <li>Numeric IDs are easier to communicate verbally</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards - ALL ZEROED */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card
              className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              onClick={() => setActiveTab('admins')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Admins</p>
                    <h3 className="text-2xl font-bold">{totalAdmins}</h3>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>+0%</span>
                    <span className="ml-1">from last week</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              onClick={() => setActiveTab('mikrotiks')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mikrotik Devices</p>
                    <h3 className="text-2xl font-bold">{totalMikrotiks}</h3>
                  </div>
                  <div className="p-3 rounded-full bg-secondary/10 text-secondary">
                    <Router className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>+0%</span>
                    <span className="ml-1">from last week</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              onClick={() => setActiveTab('analytics')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">System Health</p>
                    <h3 className="text-2xl font-bold">{systemHealth}%</h3>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/10 text-green-600">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>+0%</span>
                    <span className="ml-1">from last week</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              onClick={() => setActiveTab('payment-settings')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <h3 className="text-2xl font-bold">KSh {totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10 text-blue-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>+0%</span>
                    <span className="ml-1">from last week</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <Card className="glass-card border-0 shadow-lg h-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Performance Overview</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('analytics')}
                    className="hover:scale-105 transition-transform"
                  >
                    View Details
                  </Button>
                </CardHeader>
                <CardContent>
                  <OwnerChartsZeroed
                    visibilitySettings={visibilitySettings}
                    onToggleVisibility={toggleVisibility}
                  />
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="glass-card border-0 shadow-lg h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activity (dashboard zeroed)
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      );
    }

    // Tab content rendering
    switch (activeTab) {
      case 'admins':
        return (
          <AdminManagement
            admins={admins}
            onAdminAdd={handleAdminAdd}
            onAdminUpdate={handleAdminUpdate}
            onAdminDelete={handleAdminDelete}
            onAdminReset={handleAdminReset}
            onLoadData={() => {}} // No-op since we're not loading real data
          />
        );
      case 'mikrotiks':
        return (
          <MikrotikManagement
            admins={admins}
            mikrotiks={mikrotiks}
            onMikrotikAdd={handleMikrotikAdd}
            onMikrotikUpdate={handleMikrotikUpdate}
            onMikrotikDelete={handleMikrotikDelete}
            onLoadData={() => {}} // No-op since we're not loading real data
          />
        );
      case 'subscriptions':
        return <SubscriptionManagement admins={admins} ownerId={ownerId} />;
      case 'payment-settings':
        return <AdminPaymentSettings />;
      case 'notification-templates':
        return <NotificationTemplateManager />;
      case 'analytics':
        return <SystemAnalytics admins={admins} mikrotiks={mikrotiks} />;
      case 'password-management':
        return <PasswordManager />;
      case 'audit-logs':
        return <SystemAuditLogs userRole="owner" />;
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
          <OwnerSidebar onLogout={handleLogout} />

          <main className="flex-1 overflow-auto">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex flex-col xxs:flex-row items-start xxs:items-center justify-between px-3 py-2 min-h-[44px]">
                <div className="flex items-center space-x-2 w-full xxs:w-auto mb-2 xxs:mb-0">
                  <SidebarTrigger className="hover:bg-accent/50 transition-colors rounded-md p-1.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-base font-semibold truncate">Owner Dashboard</h1>
                    <p className="text-xs text-muted-foreground hidden sm:block">Kingstone wifi billing system</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 w-full xxs:w-auto justify-between xxs:justify-end">
                  <div className="flex items-center space-x-2">
                    <DashboardSettings
                      settings={visibilitySettings}
                      onToggle={toggleVisibility}
                      onResetDefaults={resetToDefaults}
                      onHideAll={hideAll}
                      onShowAll={showAll}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="hover:bg-destructive hover:text-destructive-foreground transition-colors h-8 px-3 whitespace-nowrap ml-auto xxs:ml-0"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline-block">Logout</span>
                    <span className="sm:hidden inline-block">Exit</span>
                  </Button>
                </div>
              </div>
            </header>

            {/* Content */}
            <div className="p-6">
              {renderContent()}
            </div>

            {/* Logged in as message */}
            <div className="px-6 py-4 border-t bg-muted/20">
              <div className="text-center text-sm text-muted-foreground">
                You are logged in as <span className="font-medium text-foreground">{user.email}</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default OwnerDashboardZeroed;