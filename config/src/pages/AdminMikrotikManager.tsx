import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Router,
  DollarSign,
  MapPin,
  Save,
  Wifi,
  Users,
  Activity,
  Settings,
  CreditCard,
  Trash2,
  Loader2
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

interface Mikrotik {
  id: string;
  name: string;
  routerId: string;
  ipAddress: string;
  apiPort: number;
  username: string;
  status: 'online' | 'offline';
  mpesaType: 'till' | 'paybill';
  mpesaNumber: string;
  location?: string;
  totalEarnings?: number;
  activeUsers?: number;
}

const AdminMikrotikManager = () => {
  const { mikrotikId } = useParams<{ mikrotikId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mikrotik, setMikrotik] = useState<Mikrotik | null>(null);

  // Form state
  const [mpesaType, setMpesaType] = useState<'till' | 'paybill'>('till');
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [location, setLocation] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [apiPort, setApiPort] = useState(8728);

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  useEffect(() => {
    if (mikrotikId) {
      loadMikrotik(mikrotikId);
    }
  }, [mikrotikId]);

  const loadMikrotik = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mikrotiks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading MikroTik:', error);
        toast.error('Failed to load MikroTik details');
        return;
      }

      if (data) {
        setMikrotik(data);
        setMpesaType(data.mpesa_type);
        setMpesaNumber(data.mpesa_number);
        setLocation(data.location || '');
        setIpAddress(data.ip_address);
        setApiPort(data.api_port || 8728);
      }
    } catch (error) {
      console.error('Error loading MikroTik:', error);
      toast.error('Failed to load MikroTik details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!mikrotikId) {
      toast.error('No MikroTik selected');
      return;
    }

    // Validate inputs
    if (!mpesaNumber.trim()) {
      toast.error('MPESA number is required');
      return;
    }

    // Validate MPESA number format (basic validation)
    const mpesaNumberRegex = /^[0-9]{6,12}$/;
    if (!mpesaNumberRegex.test(mpesaNumber.replace(/[^0-9]/g, ''))) {
      toast.error('Please enter a valid MPESA number (6-12 digits)');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('mikrotiks')
        .update({
          mpesa_type: mpesaType,
          mpesa_number: mpesaNumber,
          location: location || null,
          ip_address: ipAddress,
          api_port: apiPort,
          updated_at: new Date().toISOString()
        })
        .eq('id', mikrotikId);

      if (error) {
        console.error('Error updating MikroTik:', error);
        toast.error('Failed to update MikroTik: ' + error.message);
        return;
      }

      toast.success('MikroTik settings updated successfully!');
      
      // Reload to get updated data
      await loadMikrotik(mikrotikId);
    } catch (error) {
      console.error('Error saving MikroTik:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/dashboard?tab=mikrotiks');
  };

  const handleDelete = async () => {
    if (!mikrotikId) {
      toast.error('No MikroTik selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${mikrotik.name}"? This will also delete all associated vouchers, packages, and users. This action cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);

      // Get session token
      const sessionToken = sessionStorage.getItem('kingstone_session_token');
      if (!sessionToken) {
        toast.error('Session expired. Please login again.');
        navigate('/admin');
        return;
      }

      // Call the RPC function to delete
      const { data, error } = await supabase.rpc('admin_delete_mikrotik', {
        p_mikrotik_id: mikrotikId,
        p_session_token: sessionToken
      });

      if (error) {
        throw error;
      }

      const result = data as any;
      if (result.success) {
        toast.success('MikroTik deleted successfully');
        navigate('/admin/dashboard?tab=mikrotiks');
      } else {
        throw new Error(result.error || 'Failed to delete MikroTik');
      }
    } catch (error: any) {
      console.error('Error deleting MikroTik:', error);
      toast.error(error.message || 'Failed to delete MikroTik');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading MikroTik details...</p>
        </div>
      </div>
    );
  }

  if (!mikrotik) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>MikroTik Not Found</CardTitle>
            <CardDescription>
              The MikroTik device you're looking for doesn't exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen flex-col w-full">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 gap-2">
            <SidebarTrigger className="shrink-0" />
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Router className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold truncate">{mikrotik.name}</h1>
                <p className="text-xs text-muted-foreground truncate">{mikrotik.routerId}</p>
              </div>
            </div>
          </div>
        </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Router className="w-5 h-5" />
                Device Overview
              </CardTitle>
              <CardDescription>
                Current status and basic information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`w-3 h-3 rounded-full ${mikrotik.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-xs text-muted-foreground capitalize">{mikrotik.status}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Wifi className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">IP Address</p>
                    <p className="text-xs text-muted-foreground font-mono">{mikrotik.ipAddress}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Total Earnings</p>
                    <p className="text-xs font-medium">KSh {(mikrotik.totalEarnings || 0).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Active Users</p>
                    <p className="text-xs font-medium">{mikrotik.activeUsers || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Configure MPESA payment destination for this router
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mpesaType">MPESA Type *</Label>
                  <select
                    id="mpesaType"
                    value={mpesaType}
                    onChange={(e) => setMpesaType(e.target.value as 'till' | 'paybill')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="till">Till Number</option>
                    <option value="paybill">Paybill Number</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mpesaNumber">MPESA Number *</Label>
                  <Input
                    id="mpesaNumber"
                    value={mpesaNumber}
                    onChange={(e) => setMpesaNumber(e.target.value)}
                    placeholder={mpesaType === 'till' ? 'e.g., 123456' : 'e.g., 123456'}
                    type="tel"
                  />
                  <p className="text-xs text-muted-foreground">
                    {mpesaType === 'till' 
                      ? 'Enter your MPESA Till Number' 
                      : 'Enter your MPESA Paybill Number'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Nairobi CBD, Moi Avenue"
                />
                <p className="text-xs text-muted-foreground">
                  Physical location of this router
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Router connection and technical configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ipAddress">Router IP Address</Label>
                  <Input
                    id="ipAddress"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="192.168.1.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Local network IP of your MikroTik router
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiPort">API Port</Label>
                  <Input
                    id="apiPort"
                    value={apiPort.toString()}
                    onChange={(e) => setApiPort(parseInt(e.target.value) || 8728)}
                    type="number"
                  />
                  <p className="text-xs text-muted-foreground">
                    MikroTik API port (default: 8728)
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <Activity className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Important Note</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Changes to IP address and API port require the router to be accessible at the new address. 
                      Make sure you have network connectivity before saving these changes.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save and Delete Buttons */}
          <div className="flex justify-between gap-3">
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Router
                </>
              )}
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminMikrotikManager;
