
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Router,
  Eye,
  EyeOff,
  Shield,
  Info,
  X,
  Terminal,
  Settings,
  ChevronDown,
  ChevronUp,
  Copy,
  Calendar,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { downloadOVPNPackage } from "@/lib/ovpnGenerator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { validateMikrotik, sanitizeInput } from "@/lib/validators";
import { ProvisioningCommands } from "@/components/owner/ProvisioningCommands";
import { DeviceSettings } from "@/components/owner/DeviceSettings";
import { OwnerMikrotikSelfInstall } from "@/components/owner/OwnerMikrotikSelfInstall";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Admin {
  id: string;
  name: string;
  email: string;
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

interface MikrotikManagementProps {
  admins: Admin[];
  mikrotiks: Mikrotik[];
  onMikrotikAdd: (mikrotik: Omit<Mikrotik, 'id'>) => void;
  onMikrotikUpdate: (mikrotik: Mikrotik) => void;
  onMikrotikDelete: (id: string) => void;
  onLoadData?: () => void;
  filter?: string | null;
  onClearFilter?: () => void;
}

const MikrotikManagement = ({
  admins,
  mikrotiks,
  onMikrotikAdd,
  onMikrotikUpdate,
  onMikrotikDelete,
  onLoadData,
  filter,
  onClearFilter
}: MikrotikManagementProps) => {
  const [newMikrotik, setNewMikrotik] = useState<{
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
  }>({
    name: "",
    routerId: "",
    ipAddress: "",
    apiPort: 8728,
    username: "",
    password: "",
    adminId: "",
    status: 'offline',
    mpesaType: 'till',
    mpesaNumber: "",
    location: ""
  });

  const handleMikrotikDelete = (id: string) => {
    onMikrotikDelete(id);
    // Refresh the data to ensure consistency
    if (onLoadData) {
      onLoadData();
    }
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [expandedMikrotikId, setExpandedMikrotikId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Mikrotik | null>(null);

  // Filter mikrotiks based on filter prop
  const filteredMikrotiks = mikrotiks.filter(mk => {
    if (!filter || filter === 'all') return true;
    // Add more specific filters here if needed
    return true;
  });

  const handleAddMikrotik = () => {
    // Validate the Mikrotik data
    const validation = validateMikrotik({
      name: newMikrotik.name,
      routerId: newMikrotik.routerId,
      ipAddress: newMikrotik.ipAddress,
      username: newMikrotik.username,
      password: newMikrotik.password,
      apiPort: newMikrotik.apiPort,
      mpesaNumber: newMikrotik.mpesaNumber
    });

    if (!validation.isValid) {
      toast.error(`Validation Error: ${validation.errors.join(', ')}`);
      return;
    }

    if (!newMikrotik.adminId) {
      toast.error("Please select an admin");
      return;
    }

    // Sanitize inputs before saving
    const sanitizedMikrotik = {
      ...newMikrotik,
      name: sanitizeInput(newMikrotik.name),
      routerId: sanitizeInput(newMikrotik.routerId),
      username: sanitizeInput(newMikrotik.username),
      mpesaNumber: sanitizeInput(newMikrotik.mpesaNumber)
    };

    onMikrotikAdd(sanitizedMikrotik);
    setNewMikrotik({
      name: "",
      routerId: "",
      ipAddress: "",
      apiPort: 8728,
      username: "",
      password: "",
      adminId: "",
      status: 'offline',
      mpesaType: 'till',
      mpesaNumber: ""
    });
    toast.success("Mikrotik router added successfully!");
    
    // Refresh the data to ensure consistency
    if (onLoadData) {
      onLoadData();
    }
  };

  const generateHotspotFiles = (mikrotik: Mikrotik) => {
    const loginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="3; url=https://billing.Kingstone.com/portal/${mikrotik.routerId}?mac=$(mac)&ip=$(ip)&router_id=${mikrotik.routerId}&link_login=$(link-login-only)&link_orig=$(link-orig)">
    <title>Kingstone WiFi - Connecting...</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #D32F2F 0%, #FBC02D 50%, #1976D2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
        }
        
        .container {
            max-width: 400px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            color: #333;
            backdrop-filter: blur(10px);
        }
        
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            background: linear-gradient(135deg, #D32F2F, #FBC02D);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: bold;
            color: white;
        }
        
        h1 {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, #D32F2F, #FBC02D);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 2rem;
            font-size: 1rem;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #D32F2F;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 1rem auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .status {
            color: #666;
            font-size: 0.9rem;
            margin-top: 1rem;
        }
        
        .manual-link {
            display: inline-block;
            margin-top: 1.5rem;
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #D32F2F, #FBC02D);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            transition: transform 0.2s;
        }
        
        .manual-link:hover {
            transform: translateY(-2px);
        }
        
        .info {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1.5rem;
            font-size: 0.8rem;
            color: #666;
        }
        
        @media (max-width: 480px) {
            .container {
                margin: 1rem;
                padding: 1.5rem;
            }
            
            h1 {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">I</div>
        <h1>Kingstone WiFi</h1>
        <p class="subtitle">${mikrotik.name} - Connecting you to the internet...</p>
        
        <div class="spinner"></div>
        <p class="status">Redirecting to payment portal...</p>
        
        <a href="https://billing.Kingstone.com/portal/${mikrotik.routerId}?mac=$(mac)&ip=$(ip)&router_id=${mikrotik.routerId}&link_login=$(link-login-only)&link_orig=$(link-orig)" class="manual-link">
            Continue Manually
        </a>
        
        <div class="info">
            <strong>Connection Info:</strong><br>
            MAC: $(mac)<br>
            IP: $(ip)<br>
            Router: ${mikrotik.name} (${mikrotik.routerId})
        </div>
    </div>
    
    <script>
        setTimeout(function() {
            if (!document.hidden) {
                window.location.href = "https://billing.Kingstone.com/portal/${mikrotik.routerId}?mac=$(mac)&ip=$(ip)&router_id=${mikrotik.routerId}&link_login=$(link-login-only)&link_orig=$(link-orig)";
            }
        }, 5000);
        
        document.addEventListener('DOMContentLoaded', function() {
            const status = document.querySelector('.status');
            let dots = 0;
            
            setInterval(function() {
                dots = (dots + 1) % 4;
                status.textContent = 'Redirecting to payment portal' + '.'.repeat(dots);
            }, 500);
        });
    </script>
</body>
</html>`;

    // Create and download the file
    const blob = new Blob([loginHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mikrotik_${mikrotik.name.replace(/\s+/g, '_')}_login.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Hotspot file downloaded for ${mikrotik.name}`);
  };

  const getAdminName = (adminId: string) => {
    return admins.find(admin => admin.id === adminId)?.name || 'Unknown';
  };

  const togglePasswordVisibility = (mikrotikId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [mikrotikId]: !prev[mikrotikId]
    }));
  };

  const handleMpesaTypeChange = (value: string) => {
    setNewMikrotik({
      ...newMikrotik,
      mpesaType: value as 'till' | 'paybill'
    });
  };

  const openEditDialog = (mikrotik: Mikrotik) => {
    setEditForm(mikrotik);
    setEditingId(mikrotik.id);
  };

  const handleEditSave = () => {
    if (editForm) {
      onMikrotikUpdate(editForm);
      setEditingId(null);
      setEditForm(null);
      toast.success("Mikrotik updated successfully!");
      if (onLoadData) {
        onLoadData();
      }
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy. Please copy manually.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Mikrotik */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Mikrotik Router</CardTitle>
          <CardDescription>
            Configure a new Mikrotik router and assign it to an admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="mikrotikName">Router Name *</Label>
              <Input
                id="mikrotikName"
                value={newMikrotik.name}
                onChange={(e) => setNewMikrotik({ ...newMikrotik, name: e.target.value })}
                placeholder="e.g., Cafe Router 1"
              />
            </div>
            <div>
              <Label htmlFor="routerId">Router ID *</Label>
              <Input
                id="routerId"
                value={newMikrotik.routerId}
                onChange={(e) => setNewMikrotik({ ...newMikrotik, routerId: e.target.value })}
                placeholder="e.g., CAFE001"
              />
            </div>
            <div>
              <Label htmlFor="ipAddress">IP Address *</Label>
              <Input
                id="ipAddress"
                value={newMikrotik.ipAddress}
                onChange={(e) => setNewMikrotik({ ...newMikrotik, ipAddress: e.target.value })}
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <Label htmlFor="apiPort">API Port</Label>
              <Input
                id="apiPort"
                type="number"
                value={newMikrotik.apiPort}
                onChange={(e) => setNewMikrotik({ ...newMikrotik, apiPort: parseInt(e.target.value) || 8728 })}
                placeholder="8728"
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={newMikrotik.username}
                onChange={(e) => setNewMikrotik({ ...newMikrotik, username: e.target.value })}
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newMikrotik.password}
                onChange={(e) => setNewMikrotik({ ...newMikrotik, password: e.target.value })}
                placeholder="router password"
              />
            </div>
            <div>
              <Label htmlFor="adminSelect">Assign to Admin *</Label>
              <Select value={newMikrotik.adminId} onValueChange={(value) => setNewMikrotik({ ...newMikrotik, adminId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select admin" />
                </SelectTrigger>
                <SelectContent>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mpesaType">MPESA Type</Label>
              <Select value={newMikrotik.mpesaType} onValueChange={handleMpesaTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="till">Till Number</SelectItem>
                  <SelectItem value="paybill">Paybill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mpesaNumber">MPESA Number</Label>
              <Input
                id="mpesaNumber"
                value={newMikrotik.mpesaNumber}
                onChange={(e) => setNewMikrotik({ ...newMikrotik, mpesaNumber: e.target.value })}
                placeholder="123456"
              />
            </div>
            <div>
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={newMikrotik.location || ''}
                onChange={(e) => setNewMikrotik({ ...newMikrotik, location: e.target.value })}
                placeholder="e.g., Nairobi CBD, Moi Avenue"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddMikrotik} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Router
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mikrotik List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Mikrotik Routers
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium">Available Actions:</p>
                      <p className="text-xs mt-1">⚙️ Device Settings - Wireless & Ethernet configuration</p>
                      <p className="text-xs">💻 Provisioning Commands - Winbox terminal setup</p>
                      <p className="text-xs">🌐 Hotspot Files - Portal pages for client access</p>
                      <p className="text-xs">🛡️ OVPN Config - Secure VPN tunnel for remote management</p>
                      <p className="text-xs mt-1 text-green-600">📊 Admin changes sync automatically</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                Manage your Mikrotik routers and download configuration files
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <OwnerMikrotikSelfInstall admins={admins} onMikrotikAdded={onLoadData} />
              {onLoadData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadData}
                  title="Refresh to see admin changes"
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </Button>
              )}
              {filter && onClearFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearFilter}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
          {filter && (
            <div className="mt-2">
              <Badge variant="secondary" className="capitalize">
                Filter: {filter === 'all' ? 'All Devices' : filter}
                <span className="ml-2 text-xs">({filteredMikrotiks.length} of {mikrotiks.length})</span>
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMikrotiks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Router className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No Mikrotik devices found</p>
              </div>
            ) : (
              filteredMikrotiks.map((mikrotik) => (
                <Collapsible
                  key={mikrotik.id}
                  open={expandedMikrotikId === mikrotik.id}
                  onOpenChange={(isOpen) => setExpandedMikrotikId(isOpen ? mikrotik.id : null)}
                  className="border rounded-lg"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Router className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base">{mikrotik.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {mikrotik.ipAddress}:{mikrotik.apiPort} • Admin: {getAdminName(mikrotik.adminId)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={mikrotik.status === 'online' ? 'default' : 'destructive'}>
                          {mikrotik.status}
                        </Badge>
                        {expandedMikrotikId === mikrotik.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 border-t">
                      <div className="grid md:grid-cols-2 gap-6 mt-4">
                        {/* Connection Details */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Router className="w-4 h-4" />
                              Connection Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Router ID:</span>
                                <span className="font-medium">{mikrotik.routerId}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">IP Address:</span>
                                <span className="font-medium">{mikrotik.ipAddress}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">API Port:</span>
                                <span className="font-medium">{mikrotik.apiPort}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Username:</span>
                                <span className="font-medium">{mikrotik.username}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Password:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{showPasswords[mikrotik.id] ? mikrotik.password : '********'}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-auto p-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePasswordVisibility(mikrotik.id);
                                    }}
                                  >
                                    {showPasswords[mikrotik.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </Button>
                                </div>
                              </div>
                              {mikrotik.location && (
                                <div className="flex justify-between py-1 border-b">
                                  <span className="text-muted-foreground">Location:</span>
                                  <span className="font-medium">{mikrotik.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* MPESA & Admin */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              MPESA Configuration
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">MPESA Type:</span>
                                <span className="font-medium capitalize">{mikrotik.mpesaType}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">MPESA Number:</span>
                                <span className="font-medium">{mikrotik.mpesaNumber}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Assigned Admin:</span>
                                <span className="font-medium">{getAdminName(mikrotik.adminId)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant={mikrotik.status === 'online' ? 'default' : 'destructive'}>
                              {mikrotik.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateHotspotFiles(mikrotik)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Hotspot Files
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download Hotspot login pages</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadOVPNPackage(mikrotik)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                OVPN Config
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download OVPN configuration</p>
                              <p className="text-xs text-muted-foreground">Secure VPN tunnel for remote control</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DeviceSettings mikrotik={mikrotik} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Device Settings</p>
                              <p className="text-xs text-muted-foreground">Wireless & Ethernet configuration</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ProvisioningCommands mikrotik={mikrotik} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Winbox Provisioning Commands</p>
                              <p className="text-xs text-muted-foreground">Terminal setup & anti-sharing</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(mikrotik);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Mikrotik Router</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{mikrotik.name}</strong>?
                                <br /><br />
                                <strong className="text-red-600">This action cannot be undone.</strong>
                                <br /><br />
                                This will permanently delete:
                                <br />• Router configuration
                                <br />• All associated settings
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMikrotikDelete(mikrotik.id);
                                }}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Router
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Mikrotik Dialog */}
      <AlertDialog open={editingId !== null} onOpenChange={(open) => {
        if (!open) {
          setEditingId(null);
          setEditForm(null);
        }
      }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Mikrotik Router</AlertDialogTitle>
            <AlertDialogDescription>
              Update the router configuration. Changes will be saved immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {editForm && (
            <div className="grid md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Router Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Router name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-routerId">Router ID *</Label>
                <Input
                  id="edit-routerId"
                  value={editForm.routerId}
                  onChange={(e) => setEditForm({ ...editForm, routerId: e.target.value })}
                  placeholder="Router ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ipAddress">IP Address *</Label>
                <Input
                  id="edit-ipAddress"
                  value={editForm.ipAddress}
                  onChange={(e) => setEditForm({ ...editForm, ipAddress: e.target.value })}
                  placeholder="IP address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-apiPort">API Port</Label>
                <Input
                  id="edit-apiPort"
                  type="number"
                  value={editForm.apiPort}
                  onChange={(e) => setEditForm({ ...editForm, apiPort: parseInt(e.target.value) || 8728 })}
                  placeholder="API port"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  placeholder="Username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mpesaType">MPESA Type</Label>
                <Select value={editForm.mpesaType} onValueChange={(value: 'till' | 'paybill') => setEditForm({ ...editForm, mpesaType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="till">Till Number</SelectItem>
                    <SelectItem value="paybill">Paybill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mpesaNumber">MPESA Number</Label>
                <Input
                  id="edit-mpesaNumber"
                  value={editForm.mpesaNumber}
                  onChange={(e) => setEditForm({ ...editForm, mpesaNumber: e.target.value })}
                  placeholder="MPESA number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editForm.location || ''}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="Location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editForm.status} onValueChange={(value: 'online' | 'offline') => setEditForm({ ...editForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setEditingId(null);
              setEditForm(null);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditSave}
              className="bg-green-600 hover:bg-green-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MikrotikManagement;
