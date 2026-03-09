import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Router,
  Save,
  Loader2,
  AlertCircle,
  Network
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const AdminAddMikrotik = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    router_name: '',
    ip_address: '',
    api_port: '8728',
    username: 'admin',
    password: '',
    mpesa_paybill: '',
    mpesa_till_number: '',
    mpesa_number: ''
  });
  
  const [mpesaType, setMpesaType] = useState<'paybill' | 'till'>('paybill');

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!formData.name.trim()) {
        toast.error('Router name is required');
        return;
      }

      // Validate IP address is provided for manual registration
      if (!formData.ip_address.trim()) {
        toast.error('IP address is required for manual registration');
        return;
      }

      // Validate IP address format (basic validation)
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(formData.ip_address)) {
        toast.error('Invalid IP address format');
        return;
      }

      // Get owner_id from admin record
      const { data: admin } = await supabase
        .from('admins')
        .select('owner_id')
        .eq('id', user?.id)
        .single();

      // Generate a unique router_id for manual registration
      const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
      const routerId = `MANUAL${randomChars}`;

      // Build insert object dynamically
      const insertData: any = {
        admin_id: user?.id,
        // owner_id will be auto-set by trigger from admin_id
        name: formData.name.trim(),
        router_name: formData.router_name.trim() || formData.name.trim(),
        router_id: routerId,
        ip: formData.ip_address || null, // Use 'ip' column name (INET type)
        public_ip: formData.ip_address || null, // Also set public_ip for newer schema
        api_port: parseInt(formData.api_port) || 8728,
        username: formData.username.trim() || 'admin',
        password_encrypted: formData.password || 'admin123', // Use 'password_encrypted' column name
        status: 'offline', // Valid values: 'online' or 'offline'
        self_install_mode: false,
        mpesa_paybill: formData.mpesa_paybill || null,
        mpesa_till_number: formData.mpesa_till_number || null,
        mpesa_number: formData.mpesa_number || null
      };

      const { data, error } = await supabase
        .from('mikrotiks')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('Router added successfully!');
      navigate('/admin/mikrotiks/list');
    } catch (error: any) {
      console.error('Add router error:', error);
      toast.error('Failed to add router: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/mikrotiks/list');
  };

  return (
    <SidebarProvider>
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
                <h1 className="text-lg font-semibold truncate">Add Router</h1>
                <p className="text-xs text-muted-foreground truncate">Manually register a MikroTik router</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Router className="w-5 h-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Enter the router details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Router Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Main Router, Office Router"
                  />
                  <p className="text-xs text-muted-foreground">
                    A descriptive name for this router
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="router_name">Router ID Name</Label>
                  <Input
                    id="router_name"
                    name="router_name"
                    value={formData.router_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Kingstone_main"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Will be auto-generated if not provided
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Network Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Network Configuration
                </CardTitle>
                <CardDescription>
                  Router network settings (optional for manual registration)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ip_address">IP Address *</Label>
                    <Input
                      id="ip_address"
                      name="ip_address"
                      value={formData.ip_address}
                      onChange={handleInputChange}
                      placeholder="e.g., 196.204.123.45"
                    />
                    <p className="text-xs text-muted-foreground">
                      Router IP address (required for manual registration)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api_port">API Port</Label>
                    <Input
                      id="api_port"
                      name="api_port"
                      type="number"
                      value={formData.api_port}
                      onChange={handleInputChange}
                      placeholder="8728"
                    />
                    <p className="text-xs text-muted-foreground">
                      MikroTik API port (default: 8728)
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="admin"
                    />
                    <p className="text-xs text-muted-foreground">
                      Router admin username
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Router password (optional)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Router admin password (stored encrypted)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MPESA Payment Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">M</span>
                  </div>
                  MPESA Payment Configuration
                </CardTitle>
                <CardDescription>
                  Configure MPESA payment options for this router
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={mpesaType === 'paybill' ? 'default' : 'outline'}
                      onClick={() => setMpesaType('paybill')}
                      className="flex-1"
                    >
                      Paybill
                    </Button>
                    <Button
                      type="button"
                      variant={mpesaType === 'till' ? 'default' : 'outline'}
                      onClick={() => setMpesaType('till')}
                      className="flex-1"
                    >
                      Till Number
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mpesa_paybill">Paybill Number</Label>
                    <Input
                      id="mpesa_paybill"
                      name="mpesa_paybill"
                      type="text"
                      value={formData.mpesa_paybill}
                      onChange={handleInputChange}
                      placeholder="e.g., 522522"
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground">
                      MPESA Paybill number (optional, max 12 characters)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mpesa_till_number">Till Number</Label>
                    <Input
                      id="mpesa_till_number"
                      name="mpesa_till_number"
                      type="text"
                      value={formData.mpesa_till_number}
                      onChange={handleInputChange}
                      placeholder="e.g., 123456"
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground">
                      MPESA Buy Goods Till number (optional, max 12 characters)
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mpesa_number">MPESA Phone Number</Label>
                  <Input
                    id="mpesa_number"
                    name="mpesa_number"
                    type="tel"
                    value={formData.mpesa_number}
                    onChange={handleInputChange}
                    placeholder="e.g., 0712345678"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Phone number for MPESA payments (5-10 digits, required for non-self-install)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Important Notice */}
            <Card>
              <CardContent className="pt-6">
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Important Note</p>
                      <p className="text-xs text-amber-700 mt-1">
                        For automatic configuration with scripts, use the <strong>Self Install</strong> option instead.
                        Manual registration is for routers that are already configured or will be configured later.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Router
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminAddMikrotik;
