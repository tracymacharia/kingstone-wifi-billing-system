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
  Settings,
  LogOut,
  DollarSign,
  Activity,
  CreditCard,
  Copy
} from "lucide-react";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { OwnerCharts } from "@/components/owner/OwnerCharts";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminManagement from "@/components/owner/AdminManagement";
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
  subscription_status?: string;
  subscription_type?: string;
  subscription_expires_at?: string;
  earnings_total?: number;
  business_name?: string;
  is_trial?: boolean;
  trial_expires_at?: string;
  trial_activated_at?: string;
}

const OwnerDashboard = () => {
  const { user, logout, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
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
  const [numericOwnerId, setNumericOwnerId] = useState<number | null>(() => {
    // Try to get numericOwnerId from localStorage first
    const savedNumericOwnerId = localStorage.getItem('numericOwnerId');
    return savedNumericOwnerId ? parseInt(savedNumericOwnerId, 10) : null;
  });

  useEffect(() => {
    // Wait for auth to be initialized before checking user role
    if (authIsLoading) {
      return; // Still loading, don't do anything yet
    }

    if (!user || user.role !== 'owner') {
      navigate('/owner');
      return;
    }

    // Fetch owner name and ID using session-based RPC to bypass RLS
    const fetchOwnerNameAndId = async () => {
      try {
        // Get session token
        const sessionToken = sessionStorage.getItem('kingstone_session_token');

        if (!sessionToken) {
          console.error('No session token found');
          return;
        }

        // Use RPC to get owner profile (bypasses RLS)
        const { data, error } = await supabase.rpc('get_owner_profile_by_session', {
          p_session_token: sessionToken
        });

        if (error) {
          console.error('Error fetching owner profile via RPC:', error);
          // Fallback to cached data
          const fallbackName = localStorage.getItem('ownerName') || 'Owner';
          setOwnerName(fallbackName);
          return;
        }

        if (data && data.length > 0) {
          const profile = data[0];
          const displayName = profile.full_name?.split(' ')[0] || 'Owner';

          setOwnerName(displayName);
          // Use owner_id from owners table instead of profile_id
          setOwnerId(profile.owner_id || profile.profile_id);
          setNumericOwnerId(profile.numeric_owner_id);

          // Cache in localStorage - use owner_id for consistency with registration_codes
          localStorage.setItem('ownerId', profile.owner_id || profile.profile_id);
          localStorage.setItem('ownerName', displayName);
          if (profile.numeric_owner_id) {
            localStorage.setItem('numericOwnerId', profile.numeric_owner_id.toString());
          }
        } else {
          // Fallback to cached data
          const fallbackName = localStorage.getItem('ownerName') || 'Owner';
          setOwnerName(fallbackName);
        }
      } catch (error: any) {
        console.error('Error in fetchOwnerNameAndId:', error);
        // Fallback to cached data
        const fallbackName = localStorage.getItem('ownerName') || 'Owner';
        setOwnerName(fallbackName);
      }
    };

    fetchOwnerNameAndId();

    // Listen for tab changes from sidebar navigation
    const handlePopState = () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        setActiveTab(searchParams.get('tab'));
        setFilter(searchParams.get('filter'));
      } catch (error) {
        console.error('Error handling popstate:', error);
      }
    };

    // Set initial tab from URL
    try {
      const searchParams = new URLSearchParams(window.location.search);
      setActiveTab(searchParams.get('tab'));
      setFilter(searchParams.get('filter'));
    } catch (error) {
      console.error('Error parsing URL search params:', error);
    }

    window.addEventListener('popstate', handlePopState);

    // Load real data from database
    loadOwnerData();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, navigate, authIsLoading, ownerId]);

  // Additional effect to handle updates to user data
  useEffect(() => {
    if (user && user.role === 'owner' && !authIsLoading) {
      // Update owner name if it's still the default 'Owner', if it's the user ID, or if it appears to be a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerName);
      if (ownerName === 'Owner' || ownerName === user.id || isUUID) {
        const fetchUpdatedOwnerName = async () => {
          try {
            // Get session token
            const sessionToken = sessionStorage.getItem('kingstone_session_token');

            if (!sessionToken) {
              return;
            }

            // Use RPC to get owner profile (bypasses RLS)
            const { data, error } = await supabase.rpc('get_owner_profile_by_session', {
              p_session_token: sessionToken
            });

            if (!error && data && data.length > 0 && data[0].full_name) {
              const displayName = data[0].full_name.split(' ')[0];
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

  const loadOwnerData = async () => {
    try {
      setLoading(true);

      // Get session token
      const sessionToken = sessionStorage.getItem('kingstone_session_token');

      if (!sessionToken) {
        toast.error('No session found. Please log in again.');
        setLoading(false);
        return;
      }

      // Get owner ID - try state first, then localStorage, then database
      let currentOwnerId = ownerId;
      if (!currentOwnerId) {
        currentOwnerId = localStorage.getItem('ownerId');
      }
      if (!currentOwnerId) {
        // Try to get owner ID from session
        const { data: profileData } = await supabase.rpc('get_owner_profile_by_session', {
          p_session_token: sessionToken
        });
        if (profileData && profileData.length > 0) {
          currentOwnerId = profileData[0].owner_id || profileData[0].profile_id;
          localStorage.setItem('ownerId', currentOwnerId);
        }
      }

      // Load admin data using RPC (bypasses RLS)
      const { data: adminsData, error: adminsError } = await supabase.rpc('get_owner_admins', {
        p_session_token: sessionToken
      });

      if (adminsError) {
        console.error('Admin RPC error details:', {
          message: adminsError.message,
          details: adminsError.details,
          hint: adminsError.hint,
          code: adminsError.code
        });
        toast.error('Failed to load admins: ' + adminsError.message);
      }

      // Handle the case where RPC returns error or no data
      if (adminsError || !adminsData) {
        // Load basic admin data directly from table as fallback
        // Note: business_name is not in admins table, it's in owners table
        const { data: basicAdmins, error: basicError } = await supabase
          .from('admins')
          .select(`
            id, 
            username, 
            email, 
            phone, 
            created_at, 
            owner_id, 
            must_change_password, 
            is_trial, 
            trial_expires_at, 
            trial_activated_at,
            owners!inner(business_name)
          `)
          .eq('owner_id', currentOwnerId);

        if (basicError) {
          console.error('Fallback query failed:', basicError);
        } else if (basicAdmins && basicAdmins.length > 0) {
          setAdmins(basicAdmins.map(admin => ({
            id: admin.id,
            name: admin.username,
            email: admin.email || 'Not set',
            phone: admin.phone || 'Not set',
            business_name: admin.owners?.business_name || 'Not set',
            loginUrl: `${window.location.origin}/admin-login`,
            status: 'active' as const,
            createdAt: admin.created_at || new Date().toISOString(),
            mustChangePassword: admin.must_change_password || false,
            lastReset: '',
            resetBy: '',
            subscription_status: 'pending',
            subscription_type: 'hotspot',
            subscription_expires_at: null,
            earnings_total: 0,
            is_trial: admin.is_trial || false,
            trial_expires_at: admin.trial_expires_at,
            trial_activated_at: admin.trial_activated_at
          })));
        } else {
          setAdmins([]);
        }
      } else if (adminsData.length === 0) {
        setAdmins([]);
      } else {
        // Admins found, load them
        setAdmins(adminsData.map(admin => ({
          id: admin.id,
          name: admin.username,
          email: admin.email || 'Not set',
          phone: admin.phone || 'Not set',
          business_name: admin.business_name,
          loginUrl: `${window.location.origin}/admin-login`,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          mustChangePassword: admin.must_change_password,
          lastReset: '',
          resetBy: '',
          subscription_status: admin.subscription_status || 'pending',
          subscription_type: admin.subscription_type || 'hotspot',
          subscription_expires_at: admin.subscription_expires_at,
          earnings_total: admin.earnings_total || 0,
          is_trial: admin.is_trial || false,
          trial_expires_at: admin.trial_expires_at,
          trial_activated_at: admin.trial_activated_at
        })));
      }

    } catch (error: any) {
      console.error('Error loading owner data:', error);
      toast.error('Failed to load dashboard data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

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
    loadOwnerData();
  };

  const handleAdminUpdate = async (updatedAdmin: Admin) => {
    try {
      // Get session token
      const sessionToken = sessionStorage.getItem('kingstone_session_token');
      
      if (!sessionToken) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      // Use RPC to update admin (handles both admins and system_credentials tables)
      const { data, error } = await supabase.rpc('owner_update_admin', {
        p_session_token: sessionToken,
        p_admin_id: updatedAdmin.id,
        p_username: updatedAdmin.name,
        p_email: updatedAdmin.email,
        p_phone: updatedAdmin.phone,
        p_business_name: updatedAdmin.business_name
      });

      if (error) {
        console.error('Error updating admin via RPC:', error);
        toast.error('Failed to update admin: ' + error.message);
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Failed to update admin');
        return;
      }

      setAdmins(prev => prev.map(admin => admin.id === updatedAdmin.id ? updatedAdmin : admin));
      toast.success('Admin updated successfully');

      // Refresh the data to ensure consistency
      await loadOwnerData();
    } catch (error: any) {
      console.error('Error updating admin:', error);
      toast.error('Failed to update admin: ' + (error.message || 'Unknown error'));
    }
  };

  const handleAdminDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin? This will also delete all associated data.')) {
      return;
    }

    try {
      // Get session token
      const sessionToken = sessionStorage.getItem('kingstone_session_token');
      
      if (!sessionToken) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      // Use RPC to delete admin (handles cascade deletes)
      const { data, error } = await supabase.rpc('owner_delete_admin', {
        p_session_token: sessionToken,
        p_admin_id: id
      });

      if (error) {
        console.error('Error deleting admin via RPC:', error);
        toast.error('Failed to delete admin: ' + error.message);
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Failed to delete admin');
        return;
      }

      setAdmins(prev => prev.filter(admin => admin.id !== id));
      toast.success('Admin deleted successfully');

      // Refresh the data to ensure consistency
      await loadOwnerData();
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      toast.error('Failed to delete admin: ' + (error.message || 'Unknown error'));
    }
  };

  const handleAdminReset = async (id: string) => {
    try {
      // Get session token
      const sessionToken = sessionStorage.getItem('kingstone_session_token');
      
      if (!sessionToken) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      // Use RPC to reset admin password
      const { data, error } = await supabase.rpc('owner_reset_admin_password', {
        p_session_token: sessionToken,
        p_admin_id: id,
        p_new_password: 'changeme123' // Default temporary password
      });

      if (error) {
        console.error('Error resetting admin password via RPC:', error);
        toast.error('Failed to reset admin: ' + error.message);
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Failed to reset admin');
        return;
      }

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

      toast.success('Admin reset successfully. Temporary password: changeme123');

      // Refresh the data to ensure consistency
      await loadOwnerData();
    } catch (error: any) {
      console.error('Error resetting admin:', error);
      toast.error('Failed to reset admin: ' + (error.message || 'Unknown error'));
    }
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
        toast.success('Copied successfully!');
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
        toast.success('Copied successfully!');
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
        toast.success('Copied successfully!');
      })
      .catch(err => {
        console.error('Failed to copy numeric owner ID:', err);
        toast.error('Failed to copy numeric owner ID');
      });
  };

  const navigateToTab = (tab: string, filterValue?: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    if (filterValue) {
      params.set('filter', filterValue);
    } else {
      params.delete('filter');
    }
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    setActiveTab(tab);
    setFilter(filterValue || null);
  };

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
            <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-4 sm:p-6 text-white">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome back, {ownerName}!</h2>
                  <p className="text-primary-foreground/90 text-sm sm:text-base">Here's what's happening with your Kingstone system today.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white w-full sm:w-auto whitespace-nowrap"
                    onClick={() => navigateToTab('admins')}
                  >
                    Quick Actions
                  </Button>
                  <Button
                    variant="default"
                    className="bg-accent hover:bg-accent/90 text-white w-full sm:w-auto whitespace-nowrap"
                    onClick={() => navigateToTab('analytics')}
                  >
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

          {/* Stats Cards - 3 columns instead of 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card
              className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              onClick={() => navigateToTab('admins', 'all')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Admins</p>
                    <h3 className="text-2xl font-bold">{admins.length}</h3>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-green-600">
                    <span>+2.5%</span>
                    <span className="ml-1">from last week</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              onClick={() => navigateToTab('analytics')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">System Health</p>
                    <h3 className="text-2xl font-bold">98.5%</h3>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/10 text-green-600">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-green-600">
                    <span>+1.2%</span>
                    <span className="ml-1">from last week</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              onClick={() => navigateToTab('payment-settings')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <h3 className="text-2xl font-bold">KSh 45,200</h3>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10 text-blue-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-green-600">
                    <span>+12.3%</span>
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
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg">Performance Overview</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToTab('analytics')}
                    className="hover:scale-105 transition-transform w-full sm:w-auto whitespace-nowrap"
                  >
                    View Details
                  </Button>
                </CardHeader>
                <CardContent>
                  <OwnerCharts
                    ownerId={ownerId}
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
                    <div
                      className="flex items-start space-x-3 cursor-pointer hover:bg-accent/10 p-2 rounded-lg transition-colors"
                      onClick={() => navigateToTab('admins', 'all')}
                    >
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <LogOut className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">New admin registered</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>

                    <div
                      className="flex items-start space-x-3 cursor-pointer hover:bg-accent/10 p-2 rounded-lg transition-colors"
                      onClick={() => navigateToTab('payment-settings')}
                    >
                      <div className="p-2 rounded-full bg-green-500/10 text-green-600">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Payment received</p>
                        <p className="text-xs text-muted-foreground">4 hours ago</p>
                      </div>
                    </div>

                    <div
                      className="flex items-start space-x-3 cursor-pointer hover:bg-accent/10 p-2 rounded-lg transition-colors"
                      onClick={() => navigateToTab('settings')}
                    >
                      <div className="p-2 rounded-full bg-blue-500/10 text-blue-600">
                        <Settings className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">System updated</p>
                        <p className="text-xs text-muted-foreground">Yesterday</p>
                      </div>
                    </div>

                    <div
                      className="flex items-start space-x-3 cursor-pointer hover:bg-accent/10 p-2 rounded-lg transition-colors"
                      onClick={() => navigateToTab('analytics')}
                    >
                      <div className="p-2 rounded-full bg-orange-500/10 text-orange-600">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">High traffic alert</p>
                        <p className="text-xs text-muted-foreground">2 days ago</p>
                      </div>
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
            onLoadData={loadOwnerData}
            filter={filter}
            onClearFilter={() => navigateToTab('admins')}
            ownerId={ownerId}
            numericOwnerId={numericOwnerId}
          />
        );
      case 'subscriptions':
        return <SubscriptionManagement admins={admins} ownerId={ownerId} />;
      case 'payment-settings':
        return <AdminPaymentSettings />;
      case 'notification-templates':
        return <NotificationTemplateManager />;
      case 'analytics':
        return <SystemAnalytics admins={admins} />;
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
                You are logged in as <span className="font-medium text-foreground">{ownerName}</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default OwnerDashboard;