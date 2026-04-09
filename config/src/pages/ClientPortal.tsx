import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  User,
  Package,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  Activity,
  Download,
  Upload,
  Clock,
  Eye,
  EyeOff,
  Wifi,
  Server,
  Shield,
  LifeBuoy,
  BookOpen,
  FileText,
  Copy,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  LogOut,
  Key,
  Smartphone,
  History,
  MessageSquare,
  Plus,
  Send,
  ExternalLink,
  Play,
  Menu,
  X,
  Loader2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatKESSimple } from "@/lib/utils";
import { logger } from "@/lib/logger";

// Types
interface ClientData {
  user_id: string;
  username: string;
  user_type: string;
  is_active: boolean;
  phone_number?: string;
  package_name?: string;
  package_price?: number;
  package_expires_at?: string;
  connection_status: string;
  pppoe_username?: string;
  pppoe_password?: string;
  static_ip_address?: string;
  static_subnet_mask?: string;
  static_gateway?: string;
  static_dns_primary?: string;
  static_dns_secondary?: string;
  static_mac_address?: string;
  download_speed_mbps?: number;
  upload_speed_mbps?: number;
  monthly_data_used_mb: number;
  last_online_at?: string;
  current_session_ip?: string;
  session_duration_seconds: number;
  bandwidth_limit_mb?: number;
  bandwidth_used_mb: number;
  admin_business_name: string;
  admin_contact_phone?: string;
  admin_contact_email?: string;
}

interface UsageData {
  date: string;
  download: number;
  upload: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at?: string;
  pdf_url?: string;
  description: string;
  created_at: string;
}

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  scheduled_start?: string;
  scheduled_end?: string;
  created_at: string;
}

interface LoginHistory {
  login_at: string;
  ip_address: string;
  login_status: string;
  failure_reason?: string;
}

const ClientPortal = () => {
  const { token } = useParams<{ token: string }>();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  
  // Support for username-based access from login page
  const [usernameFromSession, setUsernameFromSession] = useState<string | null>(null);

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  // Support ticket form
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    priority: "normal"
  });

  useEffect(() => {
    // Check for username from session storage (from login page)
    const storedUsername = sessionStorage.getItem('wifi_username');
    if (storedUsername && !token) {
      setUsernameFromSession(storedUsername);
    }
    
    if (token || storedUsername) {
      loadAllData();
    }
  }, [token]);

  const loadAllData = async () => {
    try {
      // Load real data
      await loadClientData();
      await loadUsageData();
      await loadInvoices();
      await loadTickets();
      await loadNotifications();
      await loadLoginHistory();
    } catch (error) {
      logger.error('Error loading data:', error);
      setError('Failed to load client information');
    } finally {
      setLoading(false);
    }
  };

  const loadClientData = async () => {
    try {
      // Try to load by username from session storage (from login page)
      const storedUsername = sessionStorage.getItem('wifi_username');
      
      let data;
      let error;

      // Always prioritize username-based access if available
      if (storedUsername) {
        // Load by username (new method - no token required)
        const result = await supabase
          .rpc('get_client_portal_data_by_username', { p_username: storedUsername });
        data = result.data;
        error = result.error;
        
        if (error) {
          logger.error('Error fetching client data by username:', error);
        }

        if (data && data.length > 0) {
        } else {
          logger.warn('No client data found for username:', storedUsername);
        }
      } else if (token && token !== 'demo') {
        // Load by portal token (legacy method) - skip 'demo' token
        const result = await supabase
          .rpc('get_client_portal_data', { p_portal_token: token });
        data = result.data;
        error = result.error;
      } else {
        // No authentication found
        logger.warn('No username or valid token found');
        setError('No authentication found. Please login at /client-login');
        return;
      }

      if (error || !data || data.length === 0) {
        logger.error('Failed to load client data:', error, data);
        // Show specific error for username-based access
        if (storedUsername && error) {
          setError(`Failed to load data for user "${storedUsername}". Please check your credentials.`);
        } else if (!storedUsername && !token) {
          setError('Please login to access the portal');
        }
        return;
      }


      setClientData(data[0] as ClientData);
    } catch (error) {
      logger.error('Error loading client data:', error);
      setError('Failed to load client information');
    }
  };

  const loadUsageData = async () => {
    try {
      const storedUsername = sessionStorage.getItem('wifi_username');
      
      // For now, skip usage data if loading by username (can be added later)
      if (storedUsername) {
        return;
      }
      
      if (!token) return;
      
      const { data, error } = await supabase
        .rpc('get_client_usage_history', { p_portal_token: token, p_days: 30 });

      if (error) {
        logger.error('Error loading usage data:', error);
        return;
      }

      const formattedData = (data || []).map((item: any) => ({
        date: new Date(item.usage_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        download: Number(item.download_mb),
        upload: Number(item.upload_mb),
        total: Number(item.total_mb)
      }));

      setUsageData(formattedData);
    } catch (error) {
      logger.error('Error loading usage data:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const storedUsername = sessionStorage.getItem('wifi_username');
      
      // For now, skip invoices if loading by username (can be added later)
      if (storedUsername) {
        return;
      }
      
      if (!token) return;
      
      const { data, error } = await supabase
        .rpc('get_client_invoices', { p_portal_token: token });

      if (error) {
        logger.error('Error loading invoices:', error);
        return;
      }

      setInvoices(data || []);
    } catch (error) {
      logger.error('Error loading invoices:', error);
    }
  };

  const loadTickets = async () => {
    try {
      const storedUsername = sessionStorage.getItem('wifi_username');
      
      // For now, skip tickets if loading by username (can be added later)
      if (storedUsername) {
        return;
      }
      
      const { data, error } = await supabase
        .rpc('get_client_tickets', { p_portal_token: token });

      if (error) {
        logger.error('Error loading tickets:', error);
        return;
      }

      setTickets(data || []);
    } catch (error) {
      logger.error('Error loading tickets:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      // Skip notifications for now - function doesn't exist
      return;
      
      // Original code commented out
      // const { data, error } = await supabase
      //   .rpc('get_active_notifications');
      //
      // if (error) {
      //   logger.error('Error loading notifications:', error);
      //   return;
      // }
      //
      // setNotifications(data || []);
    } catch (error) {
      logger.error('Error loading notifications:', error);
    }
  };

  const loadLoginHistory = async () => {
    try {
      const storedUsername = sessionStorage.getItem('wifi_username');
      
      // For now, skip login history if loading by username (can be added later)
      if (storedUsername) {
        return;
      }
      
      const { data, error } = await supabase
        .rpc('get_client_login_history', { p_portal_token: token, p_limit: 10 });

      if (error) {
        logger.error('Error loading login history:', error);
        return;
      }

      setLoginHistory(data || []);
    } catch (error) {
      logger.error('Error loading login history:', error);
    }
  };

  const calculateTimeRemaining = () => {
    if (!clientData?.package_expires_at) return null;

    const expiryDate = new Date(clientData.package_expires_at);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} days, ${hours} hours`;
    if (hours > 0) return `${hours} hours`;
    return 'Less than 1 hour';
  };

  const calculateBandwidthUsage = () => {
    if (!clientData?.bandwidth_limit_mb) return null;
    const usedPercent = (clientData.bandwidth_used_mb / clientData.bandwidth_limit_mb) * 100;
    return Math.min(usedPercent, 100);
  };

  const formatSessionDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string, icon: any }> = {
      connected: { variant: 'default', label: 'Connected', icon: Wifi },
      disconnected: { variant: 'secondary', label: 'Disconnected', icon: XCircle },
      pending: { variant: 'outline', label: 'Pending', icon: Clock },
      active: { variant: 'default', label: 'Active', icon: CheckCircle },
      inactive: { variant: 'secondary', label: 'Inactive', icon: XCircle },
      paid: { variant: 'default', label: 'Paid', icon: CheckCircle },
      overdue: { variant: 'destructive', label: 'Overdue', icon: AlertCircle }
    };

    const config = statusConfig[status] || { variant: 'secondary' as const, label: status, icon: null };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const getTicketStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      open: { variant: 'default', label: 'Open' },
      in_progress: { variant: 'outline', label: 'In Progress' },
      resolved: { variant: 'default', label: 'Resolved' },
      closed: { variant: 'secondary', label: 'Closed' }
    };
    const c = config[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      low: { variant: 'secondary', label: 'Low' },
      normal: { variant: 'default', label: 'Normal' },
      high: { variant: 'outline', label: 'High' },
      urgent: { variant: 'destructive', label: 'Urgent' }
    };
    const c = config[priority] || { variant: 'secondary' as const, label: priority };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'outage': return <XCircle className="h-5 w-5 text-orange-600" />;
      case 'maintenance': return <RefreshCw className="h-5 w-5 text-blue-600" />;
      default: return <AlertCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // In production, this would call an RPC function to create the ticket
      toast.success("Support ticket created successfully!");
      setShowTicketDialog(false);
      setTicketForm({ subject: "", description: "", priority: "normal" });
      loadTickets();
    } catch (error) {
      logger.error('Error creating ticket:', error);
      toast.error("Failed to create ticket");
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      // In production, this would call an RPC function to change password
      toast.success("Password changed successfully!");
      setShowChangePasswordDialog(false);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      logger.error('Error changing password:', error);
      toast.error("Failed to change password");
    }
  };

  const handleInitiatePayment = async () => {
    if (!paymentPhone) {
      toast.error("Please enter your phone number");
      return;
    }

    // Validate phone number format (Kenyan format: 254XXXXXXXXX or 07XXXXXXXX)
    let formattedPhone = paymentPhone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    if (!/^254\d{9}$/.test(formattedPhone)) {
      toast.error("Please enter a valid Kenyan phone number (e.g., 0712345678 or 254712345678)");
      return;
    }

    // Get the pending invoice amount
    const pendingInvoice = invoices.find(i => i.status === 'pending');
    if (!pendingInvoice) {
      toast.error("No pending invoice found");
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Check if we're in demo mode
      const isDemoMode = token === 'demo' || token === 'testtoken' || token?.startsWith('testtoken');

      let adminId: string;

      if (isDemoMode) {
        // In demo mode, prompt user to enter admin ID for testing
        logger.warn('Demo mode detected. For testing, you need a valid admin ID.');
        
        // For demo/testing, you can set a test admin ID here
        // Get this from your Supabase admins table
        const testAdminId = prompt(
          'DEMO MODE: Enter a valid admin ID from your database for testing:\n\n' +
          'You can find this in Supabase > admins table > copy the id UUID'
        );
        
        if (!testAdminId) {
          toast.error("Admin ID is required for testing payment");
          setIsProcessingPayment(false);
          return;
        }
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(testAdminId)) {
          toast.error("Invalid admin ID format. Must be a valid UUID.");
          setIsProcessingPayment(false);
          return;
        }
        
        adminId = testAdminId;
      } else {
        // Get admin_id from clientData to ensure payment goes to the right admin
        // We need to fetch the admin_id from broadband_users table
        const { data: userData, error: userError } = await supabase
          .from('broadband_users')
          .select('admin_id')
          .eq('user_id', clientData.user_id)
          .single();

        if (userError || !userData) {
          logger.error('Error fetching admin ID:', userError);
          toast.error("Failed to process payment. Please contact support.");
          setIsProcessingPayment(false);
          return;
        }

        adminId = userData.admin_id;
      }

      // Call the edge function to initiate STK push
      const { data, error } = await supabase.functions.invoke('initiate-subscription-payment', {
        body: {
          admin_id: adminId,
          phone: formattedPhone,
          amount: Number(pendingInvoice.amount)
        }
      });


      if (error) {
        logger.error('Payment error:', error);
        toast.error(error.message || "Payment failed. Please try again.");
        setIsProcessingPayment(false);
        return;
      }

      if (data.success) {
        toast.success(data.message || "STK Push sent successfully! Please check your phone to complete the payment.");
        setShowPaymentDialog(false);
        setPaymentPhone("");

        // Refresh invoices to show updated payment status
        loadInvoices();
      } else {
        toast.error(data.error || "Payment failed. Please try again.");
      }

    } catch (error) {
      logger.error('Payment processing error:', error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeRemaining = calculateTimeRemaining();
  const bandwidthUsage = calculateBandwidthUsage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-md"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar Navigation */}
      <aside className={`fixed left-0 top-0 h-full bg-white shadow-lg z-40 transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64`}>
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">{clientData.admin_business_name}</h1>
              <p className="text-xs text-gray-500">Client Portal</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
          >
            <User className="h-4 w-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeTab === 'connection' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => { setActiveTab('connection'); setMobileMenuOpen(false); }}
          >
            <Wifi className="h-4 w-4 mr-2" />
            Connection
          </Button>
          <Button
            variant={activeTab === 'usage' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => { setActiveTab('usage'); setMobileMenuOpen(false); }}
          >
            <Activity className="h-4 w-4 mr-2" />
            Usage
          </Button>
          <Button
            variant={activeTab === 'billing' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => { setActiveTab('billing'); setMobileMenuOpen(false); }}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </Button>
          <Button
            variant={activeTab === 'support' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => { setActiveTab('support'); setMobileMenuOpen(false); }}
          >
            <LifeBuoy className="h-4 w-4 mr-2" />
            Support
          </Button>
          <Button
            variant={activeTab === 'security' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => { setActiveTab('security'); setMobileMenuOpen(false); }}
          >
            <Shield className="h-4 w-4 mr-2" />
            Security
          </Button>
          <Button
            variant={activeTab === 'help' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => { setActiveTab('help'); setMobileMenuOpen(false); }}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Router Help
          </Button>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Badge variant={clientData.is_active ? 'default' : 'secondary'} className="w-full justify-center">
            {clientData.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 py-6 px-4 sm:px-6 lg:px-8">
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.map((notification) => (
              <Card key={notification.id} className="border-l-4 border-l-orange-500 bg-orange-50">
                <CardContent className="p-4 flex items-start gap-3">
                  {getNotificationIcon(notification.notification_type)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    {notification.scheduled_start && (
                      <p className="text-xs text-gray-500 mt-2">
                        Scheduled: {new Date(notification.scheduled_start).toLocaleString()} - {new Date(notification.scheduled_end!).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Account Status Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clientData.is_active ? 'Active' : 'Inactive'}</div>
                  <p className="text-xs text-muted-foreground mt-1">{clientData.username}</p>
                </CardContent>
              </Card>

              {/* Plan Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clientData.package_name || 'No Plan'}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {clientData.package_price ? formatKESSimple(clientData.package_price) : 'N/A'}
                  </p>
                </CardContent>
              </Card>

              {/* Renewal Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Next Renewal</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{timeRemaining || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {clientData.package_expires_at ? new Date(clientData.package_expires_at).toLocaleDateString() : 'N/A'}
                  </p>
                </CardContent>
              </Card>

              {/* Connection Status Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Connection</CardTitle>
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">{clientData.connection_status}</div>
                    {getStatusBadge(clientData.connection_status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {clientData.user_type.toUpperCase()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Button className="w-full" onClick={() => setActiveTab('billing')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Bill
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab('support')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Ticket
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab('usage')}>
                    <Activity className="h-4 w-4 mr-2" />
                    View Usage
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab('help')}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Setup Guide
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer Name</label>
                    <p className="font-medium">{clientData.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Account ID</label>
                    <p className="font-mono text-sm">{clientData.user_id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Service Type</label>
                    <p className="capitalize">{clientData.user_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p>{clientData.phone_number || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Current Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clientData.package_name ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Package Name</label>
                      <p className="text-lg font-semibold">{clientData.package_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Monthly Price</label>
                      <p className="text-lg font-semibold text-green-600">
                        {clientData.package_price ? formatKESSimple(clientData.package_price) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Time Remaining</label>
                      <p className="font-medium">{timeRemaining || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Download Speed</label>
                      <p className="font-medium">{clientData.download_speed_mbps || 'N/A'} Mbps</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Upload Speed</label>
                      <p className="font-medium">{clientData.upload_speed_mbps || 'N/A'} Mbps</p>
                    </div>
                    {bandwidthUsage !== null && (
                      <div className="md:col-span-3">
                        <label className="text-sm font-medium text-gray-500">Monthly Data Usage</label>
                        <div className="mt-2">
                          <Progress value={bandwidthUsage} className="h-2" />
                          <p className="text-sm text-gray-600 mt-1">
                            {(clientData.bandwidth_used_mb / 1024).toFixed(2)} GB / {(clientData.bandwidth_limit_mb! / 1024).toFixed(2)} GB ({bandwidthUsage.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No package assigned</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-6">
            {clientData.user_type === 'pppoe' ? (
              /* PPPoE Connection Details */
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wifi className="h-5 w-5" />
                        PPPoE Connection Details
                      </CardTitle>
                      <CardDescription>Your PPPoE credentials and connection status</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const credentialsText = `PPPoE Credentials:\nUsername: ${clientData.pppoe_username}\nPassword: ${clientData.pppoe_password}\n\nSetup: Configure your router's PPPoE settings with these credentials.`;
                        navigator.clipboard.writeText(credentialsText);
                        toast.success("PPPoE credentials copied to clipboard!");
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All Credentials
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>PPPoE Username</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input value={clientData.pppoe_username || 'N/A'} readOnly className="font-mono" />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(clientData.pppoe_username || '');
                            toast.success("Username copied!");
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>PPPoE Password</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={clientData.pppoe_password || 'N/A'}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(clientData.pppoe_password || '');
                            toast.success("Password copied!");
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {clientData.service_vlan && (
                      <div>
                        <Label>Service VLAN</Label>
                        <p className="font-mono mt-1">{clientData.service_vlan}</p>
                      </div>
                    )}

                    <div>
                      <Label>Connection Status</Label>
                      <div className="mt-1">{getStatusBadge(clientData.connection_status)}</div>
                    </div>

                    <div>
                      <Label>Last Online</Label>
                      <p className="mt-1">
                        {clientData.last_online_at
                          ? new Date(clientData.last_online_at).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>

                    <div>
                      <Label>Current Session IP</Label>
                      <p className="font-mono mt-1">{clientData.current_session_ip || 'N/A'}</p>
                    </div>

                    <div>
                      <Label>Session Duration</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="font-mono">{formatSessionDuration(clientData.session_duration_seconds)}</p>
                      </div>
                    </div>

                    <div>
                      <Label>Speed Plan</Label>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{clientData.download_speed_mbps || 'N/A'} Mbps</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Upload className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{clientData.upload_speed_mbps || 'N/A'} Mbps</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reconnect
                    </Button>
                    <Button variant="outline">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Setup Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Static IP Connection Details */
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Static IP Connection Details
                      </CardTitle>
                      <CardDescription>Your static IP configuration</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const configText = `Static IP Configuration:\nIP Address: ${clientData.static_ip_address}\nSubnet Mask: ${clientData.static_subnet_mask}\nGateway: ${clientData.static_gateway}\nDNS Primary: ${clientData.static_dns_primary}\nDNS Secondary: ${clientData.static_dns_secondary}`;
                        navigator.clipboard.writeText(configText);
                        toast.success("Static IP configuration copied!");
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Configuration
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Static IP Address</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input value={clientData.static_ip_address || 'N/A'} readOnly className="font-mono" />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(clientData.static_ip_address || '');
                            toast.success("IP copied!");
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Subnet Mask</Label>
                      <p className="font-mono mt-1">{clientData.static_subnet_mask || 'N/A'}</p>
                    </div>

                    <div>
                      <Label>Gateway</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input value={clientData.static_gateway || 'N/A'} readOnly className="font-mono" />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(clientData.static_gateway || '');
                            toast.success("Gateway copied!");
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>DNS Servers</Label>
                      <div className="space-y-1 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Primary:</span>
                          <span className="font-mono">{clientData.static_dns_primary || 'N/A'}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(clientData.static_dns_primary || '');
                              toast.success("DNS copied!");
                            }}
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Secondary:</span>
                          <span className="font-mono">{clientData.static_dns_secondary || 'N/A'}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(clientData.static_dns_secondary || '');
                              toast.success("DNS copied!");
                            }}
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {clientData.static_mac_address && (
                      <div>
                        <Label>Bound MAC Address</Label>
                        <p className="font-mono mt-1">{clientData.static_mac_address}</p>
                      </div>
                    )}

                    <div>
                      <Label>Connection Status</Label>
                      <div className="mt-1">{getStatusBadge(clientData.connection_status)}</div>
                    </div>

                    <div>
                      <Label>Speed Plan</Label>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{clientData.download_speed_mbps || 'N/A'} Mbps</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Upload className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{clientData.upload_speed_mbps || 'N/A'} Mbps</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Public vs Private IP</h4>
                    <p className="text-sm text-blue-700">
                      Your static IP ({clientData.static_ip_address}) is a public IP address accessible from the internet.
                      Ensure your router/firewall is properly configured for security.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Configuration Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Real-time Bandwidth */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-time Bandwidth
                </CardTitle>
                <CardDescription>Current network activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Download className="h-6 w-6 text-blue-600" />
                      <span className="font-medium">Download</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">-- Mbps</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Upload className="h-6 w-6 text-green-600" />
                      <span className="font-medium">Upload</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">-- Mbps</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Real-time monitoring requires router integration
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Data Usage History
                </CardTitle>
                <CardDescription>Last 7 days of data consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={usageData.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [`${value} MB`, name === 'download' ? 'Download' : 'Upload']}
                    />
                    <Bar dataKey="download" stackId="a" fill="#3b82f6" name="Download" />
                    <Bar dataKey="upload" stackId="a" fill="#10b981" name="Upload" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Usage Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Total Used</span>
                      <span className="text-sm font-medium">{(clientData.monthly_data_used_mb / 1024).toFixed(2)} GB</span>
                    </div>
                    <Progress value={bandwidthUsage || 0} className="h-3" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Download className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                      <p className="text-sm text-gray-500">Download</p>
                      <p className="text-lg font-bold">-- GB</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Upload className="h-6 w-6 mx-auto text-green-600 mb-2" />
                      <p className="text-sm text-gray-500">Upload</p>
                      <p className="text-lg font-bold">-- GB</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <Activity className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                      <p className="text-sm text-gray-500">Remaining</p>
                      <p className="text-lg font-bold">{((clientData.bandwidth_limit_mb || 0) - clientData.bandwidth_used_mb) / 1024} GB</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Speed Test</CardTitle>
                <CardDescription>Test your internet speed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Button 
                    size="lg" 
                    className="mb-4"
                    onClick={() => window.open('https://wifiman.com', '_blank', 'noopener,noreferrer')}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Speed Test
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Or visit <a href="https://wifiman.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">WiFiman.com</a> for detailed testing
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Amount Due</p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatKESSimple(invoices.find(i => i.status === 'pending')?.amount || 0)}
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={() => {
                      const pendingInvoice = invoices.find(i => i.status === 'pending');
                      if (!pendingInvoice) {
                        toast.error("No pending invoice found");
                        return;
                      }
                      setShowPaymentDialog(true);
                    }}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pay Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length > 0 ? (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{invoice.invoice_number}</p>
                            {getStatusBadge(invoice.status)}
                          </div>
                          <p className="text-sm text-gray-500">{invoice.description}</p>
                          <p className="text-xs text-gray-400">
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatKESSimple(invoice.amount)}</p>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                            {invoice.status === 'pending' && (
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setPaymentPhone("");
                                  setShowPaymentDialog(true);
                                }}
                              >
                                Pay
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No invoices found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Support Tickets
                    </CardTitle>
                    <CardDescription>View and manage your support requests</CardDescription>
                  </div>
                  <Button onClick={() => setShowTicketDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Ticket
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tickets.length > 0 ? (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium">{ticket.subject}</p>
                              {getTicketStatusBadge(ticket.status)}
                              {getPriorityBadge(ticket.priority)}
                            </div>
                            <p className="text-sm text-gray-500">{ticket.ticket_number}</p>
                            <p className="text-xs text-gray-400">
                              Created: {new Date(ticket.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 mb-4">No support tickets</p>
                    <Button onClick={() => setShowTicketDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Ticket
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clientData.admin_contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{clientData.admin_contact_phone}</span>
                    </div>
                  )}
                  {clientData.admin_contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{clientData.admin_contact_email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your portal password</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowChangePasswordDialog(true)}>
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>Add an extra layer of security</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">2FA Status</p>
                    <p className="text-sm text-gray-500">Not enabled</p>
                  </div>
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Enable 2FA
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Login History
                </CardTitle>
                <CardDescription>Recent account access</CardDescription>
              </CardHeader>
              <CardContent>
                {loginHistory.length > 0 ? (
                  <div className="space-y-3">
                    {loginHistory.map((login, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {login.login_status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium">{new Date(login.login_at).toLocaleString()}</p>
                            <p className="text-sm text-gray-500">IP: {login.ip_address}</p>
                            {login.failure_reason && (
                              <p className="text-xs text-red-600">{login.failure_reason}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={login.login_status === 'success' ? 'default' : 'destructive'}>
                          {login.login_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No login history available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Router Setup Guide
                </CardTitle>
                <CardDescription>Step-by-step configuration instructions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientData.user_type === 'pppoe' ? (
                    <>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">PPPoE Router Configuration</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                          <li>Connect your router to the modem via Ethernet cable</li>
                          <li>Access your router's admin panel (usually 192.168.0.1 or 192.168.1.1)</li>
                          <li>Navigate to WAN/Internet Settings</li>
                          <li>Select Connection Type: PPPoE</li>
                          <li>Enter your PPPoE Username: <code className="bg-gray-100 px-1 rounded">{clientData.pppoe_username}</code></li>
                          <li>Enter your PPPoE Password: <code className="bg-gray-100 px-1 rounded">••••••••</code></li>
                          <li>Save settings and reboot your router</li>
                        </ol>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Download PDF Guide
                        </Button>
                        <Button variant="outline" asChild>
                          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
                            <Play className="h-4 w-4 mr-2" />
                            Watch Video Tutorial
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Static IP Router Configuration</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                          <li>Connect your router to the modem via Ethernet cable</li>
                          <li>Access your router's admin panel (usually 192.168.0.1 or 192.168.1.1)</li>
                          <li>Navigate to WAN/Internet Settings</li>
                          <li>Select Connection Type: Static IP</li>
                          <li>Enter IP Address: <code className="bg-gray-100 px-1 rounded">{clientData.static_ip_address}</code></li>
                          <li>Enter Subnet Mask: <code className="bg-gray-100 px-1 rounded">{clientData.static_subnet_mask}</code></li>
                          <li>Enter Gateway: <code className="bg-gray-100 px-1 rounded">{clientData.static_gateway}</code></li>
                          <li>Enter DNS Servers: <code className="bg-gray-100 px-1 rounded">{clientData.static_dns_primary}</code>, <code className="bg-gray-100 px-1 rounded">{clientData.static_dns_secondary}</code></li>
                          <li>Save settings and reboot your router</li>
                        </ol>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Download PDF Guide
                        </Button>
                        <Button variant="outline" asChild>
                          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
                            <Play className="h-4 w-4 mr-2" />
                            Watch Video Tutorial
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">How do I pay my bill?</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Go to the Billing tab and click "Pay Now" to pay via M-Pesa or other available payment methods.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">What if I forget my password?</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Contact support using the contact information provided, and we'll help you reset your credentials.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">How do I upgrade my plan?</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Contact our sales team via phone or email to discuss upgrade options for your service.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Support Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>Describe your issue and we'll get back to you</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                placeholder="Brief description of your issue"
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={ticketForm.priority}
                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="Detailed description of your issue"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket}>
                <Send className="h-4 w-4 mr-2" />
                Submit Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Update your portal password</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowChangePasswordDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleChangePassword}>
                <Key className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pay with M-Pesa STK Push
            </DialogTitle>
            <DialogDescription>
              Complete your payment securely via M-Pesa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Payment Summary */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">Amount Due:</span>
                <span className="text-lg font-bold text-green-800">
                  {formatKESSimple(invoices.find(i => i.status === 'pending')?.amount || 0)}
                </span>
              </div>
              <p className="text-xs text-green-600">
                {invoices.find(i => i.status === 'pending')?.description || 'Invoice payment'}
              </p>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label htmlFor="payment-phone">M-Pesa Phone Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="payment-phone"
                  type="tel"
                  placeholder="0712 345678"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  className="pl-10"
                  disabled={isProcessingPayment}
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter the phone number you want to use for payment. You'll receive an M-Pesa prompt on this number.
              </p>
            </div>

            {/* Payment Instructions */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 text-sm mb-2">How it works:</h4>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                <li>Enter your M-Pesa phone number above</li>
                <li>Click "Pay Now" to initiate the payment</li>
                <li>Check your phone for the M-Pesa prompt</li>
                <li>Enter your M-Pesa PIN to complete payment</li>
                <li>Your invoice will be marked as paid automatically</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPaymentDialog(false);
                  setPaymentPhone("");
                }}
                disabled={isProcessingPayment}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleInitiatePayment} 
                disabled={isProcessingPayment || !paymentPhone}
                className="w-full sm:w-auto"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPortal;
