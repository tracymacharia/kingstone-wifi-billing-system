import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Router,
  Plus,
  Terminal,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Network,
  Shield
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Admin {
  id: string;
  name: string;
  email: string;
  business_name?: string;
}

interface OwnerMikrotikSelfInstallProps {
  admins: Admin[];
  onMikrotikAdded?: () => void;
}

export function OwnerMikrotikSelfInstall({ admins, onMikrotikAdded }: OwnerMikrotikSelfInstallProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedRouterId, setGeneratedRouterId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    adminId: "",
    name: "",
    routerId: "",
    ipAddress: "",
    apiPort: "8728",
    username: "admin",
    password: "",
    mpesaPaybill: "",
    mpesaTillNumber: "",
    mpesaNumber: ""
  });

  const resetForm = () => {
    setFormData({
      adminId: "",
      name: "",
      routerId: "",
      ipAddress: "",
      apiPort: "8728",
      username: "admin",
      password: "",
      mpesaPaybill: "",
      mpesaTillNumber: "",
      mpesaNumber: ""
    });
    setGeneratedRouterId(null);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAdminSelect = (value: string) => {
    setFormData(prev => ({ ...prev, adminId: value }));
  };

  const generateRouterId = () => {
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    const routerId = `OWNER${randomChars}`;
    setFormData(prev => ({ ...prev, routerId }));
    setGeneratedRouterId(routerId);
    toast.success("Router ID generated");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!formData.adminId) {
        toast.error("Please select an admin");
        return;
      }

      if (!formData.name.trim()) {
        toast.error("Router name is required");
        return;
      }

      if (!formData.routerId.trim()) {
        toast.error("Router ID is required");
        return;
      }

      // Get session token
      const sessionToken = sessionStorage.getItem("kingstone_session_token");
      if (!sessionToken) {
        toast.error("Session expired. Please refresh the page.");
        return;
      }

      // Call the RPC function
      const { data, error } = await supabase.rpc("owner_create_mikrotik_for_admin", {
        p_session_token: sessionToken,
        p_admin_id: formData.adminId,
        p_name: formData.name.trim(),
        p_router_id: formData.routerId.trim(),
        p_ip_address: formData.ipAddress.trim() || null,
        p_api_port: parseInt(formData.apiPort),
        p_username: formData.username.trim(),
        p_password: formData.password || "admin123",
        p_mpesa_paybill: formData.mpesaPaybill || null,
        p_mpesa_till_number: formData.mpesaTillNumber || null,
        p_mpesa_number: formData.mpesaNumber || null
      });

      if (error) {
        throw error;
      }

      const result = data as any;
      if (result.success) {
        toast.success("MikroTik created successfully!");
        
        // Generate setup script
        const setupScript = generateSetupScript(result.mikrotik_id);
        
        // Show success dialog with script
        showSetupInstructions(setupScript);
        
        // Notify parent component
        if (onMikrotikAdded) {
          onMikrotikAdded();
        }
        
        resetForm();
      } else {
        throw new Error(result.error || "Failed to create MikroTik");
      }
    } catch (error: any) {
      console.error("Create MikroTik error:", error);
      toast.error(error.message || "Failed to create MikroTik");
    } finally {
      setLoading(false);
    }
  };

  const generateSetupScript = (mikrotikId: string) => {
    const billingHost = window.location.origin.replace("https://", "").replace("http://", "");
    
    return `/tool fetch url="https://${billingHost}/api/mikrotik/setup/${mikrotikId}" dst-path=Kingstone-setup.rsc mode=https
/system script add name=Kingstone-setup source=[/file get [find name="Kingstone-setup.rsc"] contents]
/system script run Kingstone-setup`;
  };

  const showSetupInstructions = (script: string) => {
    const content = (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-800">MikroTik Created Successfully!</h4>
              <p className="text-sm text-green-700 mt-1">
                The router has been assigned to the selected admin and is ready for configuration.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Setup Script for MikroTik
          </Label>
          <div className="relative">
            <pre className="p-4 bg-slate-950 text-green-400 rounded-lg text-sm overflow-x-auto font-mono">
              <code>{script}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(script)}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Run this script in the MikroTik terminal to complete the setup
          </p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800">Next Steps</h4>
              <ol className="text-sm text-amber-700 mt-1 list-decimal list-inside space-y-1">
                <li>Share the setup script with the admin</li>
                <li>Admin should run it on the MikroTik device</li>
                <li>The router will appear online once connected</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );

    toast.custom((t) => (
      <div className="bg-white rounded-lg shadow-lg border p-4 max-w-2xl">
        {content}
        <Button className="mt-4" onClick={() => toast.dismiss(t)}>
          Close
        </Button>
      </div>
    ), {
      duration: 30000,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Router for Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Router className="w-5 h-5" />
            Add MikroTik Router for Admin
          </DialogTitle>
          <DialogDescription>
            Create a new MikroTik router and assign it to one of your admins.
            The admin will be able to manage this router from their dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Admin Selection */}
          <div className="space-y-2">
            <Label htmlFor="admin-select">Select Admin *</Label>
            <Select value={formData.adminId} onValueChange={handleAdminSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an admin" />
              </SelectTrigger>
              <SelectContent>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.business_name || admin.name} ({admin.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The router will be assigned to this admin
            </p>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Router className="w-4 h-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Router Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Office Router"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="routerId">Router ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="routerId"
                    name="routerId"
                    value={formData.routerId}
                    onChange={handleInputChange}
                    placeholder="e.g., OFFICE-MAIN-01"
                    readOnly={!!generatedRouterId}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateRouterId}
                    disabled={!!generatedRouterId}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique identifier for this router
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Network Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="w-4 h-4" />
                Network Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ipAddress">IP Address (Optional)</Label>
                  <Input
                    id="ipAddress"
                    name="ipAddress"
                    value={formData.ipAddress}
                    onChange={handleInputChange}
                    placeholder="e.g., 192.168.88.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Can be set later via self-install
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiPort">API Port</Label>
                  <Input
                    id="apiPort"
                    name="apiPort"
                    type="number"
                    value={formData.apiPort}
                    onChange={handleInputChange}
                    placeholder="8728"
                  />
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Leave blank for default"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MPESA Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                MPESA Configuration (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mpesaPaybill">Paybill Number</Label>
                  <Input
                    id="mpesaPaybill"
                    name="mpesaPaybill"
                    value={formData.mpesaPaybill}
                    onChange={handleInputChange}
                    placeholder="e.g., 522522"
                    maxLength={12}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mpesaTillNumber">Till Number</Label>
                  <Input
                    id="mpesaTillNumber"
                    name="mpesaTillNumber"
                    value={formData.mpesaTillNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., 123456"
                    maxLength={12}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mpesaNumber">MPESA Phone Number</Label>
                <Input
                  id="mpesaNumber"
                  name="mpesaNumber"
                  value={formData.mpesaNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 0712345678"
                  maxLength={10}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-800 text-sm">How It Works</h4>
                <p className="text-xs text-blue-700 mt-1">
                  After creating the router, you'll receive a setup script. Share this script
                  with the admin, who should run it on the MikroTik device via Terminal or SSH.
                  The router will then connect to the billing server automatically.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetForm} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Router className="w-4 h-4 mr-2" />
                Create Router
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
