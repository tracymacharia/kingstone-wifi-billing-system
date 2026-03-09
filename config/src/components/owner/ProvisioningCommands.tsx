import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Terminal,
  Shield,
  Copy,
  Check,
  Settings,
  Wifi,
  Lock,
  AlertTriangle,
  Info,
  Server,
  Key,
  Network,
  Zap,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import {
  generateProvisioningScript,
  generateQuickSetupCommands,
  generateAntiSharingCommandsOnly,
  generateRadiusOnlyCommands,
  downloadProvisioningScript,
  downloadQuickSetup,
  downloadRadiusConfig,
  validateProvisioningConfig,
  defaultAntiSharingConfig,
  defaultRadiusConfig,
  defaultAuthenticationConfig,
  type ProvisioningConfig,
  type AntiSharingConfig,
  type RadiusConfig,
  type AuthenticationConfig
} from "@/lib/mikrotikProvisioning";
import {
  getSingleCommandOptions,
  downloadSingleCommand,
  copyCommandToClipboard,
  type ProvisioningCommandOption
} from "@/lib/mikrotikSingleCommand";
import {
  downloadScriptFile,
  downloadHotspotScript,
  downloadPPPoEScript,
  downloadCombinedScript,
  generateMultiLineCommand
} from "@/lib/mikrotikScriptGenerator";
import {
  downloadAdminConfigScript,
  generateAdminDetails
} from "@/lib/mikrotikAdminConfig";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
}

interface ProvisioningCommandsProps {
  mikrotik: Mikrotik;
}

const DEFAULT_BILLING_URL = "https://billing.Kingstone.com";
const DEFAULT_RADIUS_SERVER = "192.168.1.100";
const DEFAULT_RADIUS_SECRET = "[GENERATE_SECURE_RADIUS_SECRET]";

export const ProvisioningCommands = ({ mikrotik }: ProvisioningCommandsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [billingServerUrl, setBillingServerUrl] = useState(DEFAULT_BILLING_URL);
  const [dnsName, setDnsName] = useState(`${mikrotik.routerId}.hotspot.local`);
  const [addressPool, setAddressPool] = useState(`${mikrotik.routerId.replace(/\s+/g, '_')}_pool`);
  
  // Authentication configuration
  const [authentication, setAuthentication] = useState<AuthenticationConfig>({
    ...defaultAuthenticationConfig
  });

  // RADIUS configuration
  const [radius, setRadius] = useState<RadiusConfig>({
    ...defaultRadiusConfig,
    nasIdentifier: mikrotik.routerId
  });
  
  const [antiSharing, setAntiSharing] = useState<AntiSharingConfig>({
    ...defaultAntiSharingConfig
  });

  const [activeTab, setActiveTab] = useState<"single" | "full" | "quick" | "antisharing" | "radius">("single");
  const [selectedCommand, setSelectedCommand] = useState<ProvisioningCommandOption | null>(null);

  const generateConfig = (): ProvisioningConfig => {
    return {
      routerId: mikrotik.routerId,
      routerName: mikrotik.name,
      ipAddress: mikrotik.ipAddress,
      billingServerUrl: billingServerUrl,
      apiPort: mikrotik.apiPort,
      hotspotInterface: "bridge-hotspot",
      addressPool: addressPool,
      dnsName: dnsName,
      authentication: authentication,
      radius: radius,
      antiSharing: antiSharing
    };
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {
      toast.error("Failed to copy");
    });
  };

  const handleCopySingleCommand = async (type: 'short' | 'complete') => {
    const config = generateConfig();
    const success = await copyCommandToClipboard(config, type);
    if (success) {
      setCopied(`single-${type}`);
      toast.success("Single command copied! Paste in Winbox Terminal (Ctrl+T)");
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleDownloadSingle = (type: 'short' | 'complete') => {
    const config = generateConfig();
    downloadSingleCommand(config, type);
    toast.success("Single command downloaded!");
  };

  const handleDownloadScript = () => {
    const config = generateConfig();
    downloadHotspotScript(config);
    toast.success("Hotspot script downloaded! (admin-hotspot.rsc)");
  };

  const handleDownloadPPPoEScript = () => {
    const config = generateConfig();
    downloadPPPoEScript(config);
    toast.success("PPPoE script downloaded! (admin-pppoe.rsc)");
  };

  const handleDownloadCombinedScript = () => {
    const config = generateConfig();
    downloadCombinedScript(config);
    toast.success("Combined script downloaded! (admin-combo.rsc)");
  };

  const handleDownloadAdminConfig = () => {
    const config = generateConfig();
    downloadAdminConfigScript(config);
    toast.success("Admin config downloaded! (admin-config.rsc)");
  };

  const handleCopyMultiLine = () => {
    const config = generateConfig();
    const script = generateMultiLineCommand(config);
    navigator.clipboard.writeText(script).then(() => {
      setCopied("multiline");
      toast.success("Multi-line command copied! Paste all at once in Winbox");
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {
      toast.error("Failed to copy");
    });
  };

  const handleDownloadFull = () => {
    const config = generateConfig();
    const validation = validateProvisioningConfig(config);
    
    if (!validation.isValid) {
      toast.error("Configuration Error: " + validation.errors.join(', '));
      return;
    }
    
    downloadProvisioningScript(config);
    toast.success("Full provisioning script downloaded!");
  };

  const handleDownloadQuick = () => {
    const config = generateConfig();
    downloadQuickSetup(config);
    toast.success("Quick setup commands downloaded!");
  };

  const handleDownloadAntiSharing = () => {
    const config = generateConfig();
    const script = generateAntiSharingCommandsOnly(antiSharing, authentication);
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `antisharing_${mikrotik.routerId}.rsc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Anti-sharing commands downloaded!");
  };

  const handleDownloadRadius = () => {
    const config = generateConfig();
    downloadRadiusConfig(config);
    toast.success("RADIUS configuration downloaded!");
  };

  const config = generateConfig();
  const fullScript = generateProvisioningScript(config);
  const quickScript = generateQuickSetupCommands(config);
  const antiSharingScript = generateAntiSharingCommandsOnly(antiSharing, authentication);
  const radiusScript = generateRadiusOnlyCommands(radius, authentication);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-purple-600 hover:text-purple-700">
          <Terminal className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Winbox Provisioning Commands
            <Badge variant="secondary">{mikrotik.name}</Badge>
            <Badge variant="default" className="bg-green-600">New: Single Command</Badge>
          </DialogTitle>
          <DialogDescription>
            One command to connect Mikrotik to billing system. Router will appear online after execution.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="single" className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Single Command
              </TabsTrigger>
              <TabsTrigger value="full">Full Script</TabsTrigger>
              <TabsTrigger value="quick">Quick</TabsTrigger>
              <TabsTrigger value="antisharing">Anti-Sharing</TabsTrigger>
              <TabsTrigger value="radius">API + RADIUS</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Zap className="w-5 h-5" />
                    Single Command - Recommended
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    One command to connect your Mikrotik to the billing system. Router appears online after execution.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Alternative Methods */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-900 mb-2">Download Configuration Scripts</h4>
                          <p className="text-sm text-blue-800 mb-3">
                            Choose the script that matches your deployment type:
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDownloadScript}
                              className="bg-white hover:bg-green-50"
                            >
                              <Download className="w-3 h-3 mr-2" />
                              Hotspot
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDownloadPPPoEScript}
                              className="bg-white hover:bg-blue-50"
                            >
                              <Download className="w-3 h-3 mr-2" />
                              PPPoE
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDownloadCombinedScript}
                              className="bg-white hover:bg-purple-50"
                            >
                              <Download className="w-3 h-3 mr-2" />
                              Combo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDownloadAdminConfig}
                              className="bg-white hover:bg-orange-50"
                            >
                              <Download className="w-3 h-3 mr-2" />
                              Admin Config
                            </Button>
                          </div>
                          <div className="mt-3 p-2 bg-white rounded border border-blue-100">
                            <p className="text-xs text-blue-700 font-semibold mb-1">How to use script files:</p>
                            <ol className="text-xs text-blue-600 list-decimal list-inside space-y-1">
                              <li>Download .rsc file (hotspot/pppoe/combo/admin-config)</li>
                              <li>Open Winbox → Connect to router</li>
                              <li>Click "Files" in left menu</li>
                              <li>Drag .rsc file to Winbox Files window</li>
                              <li>In Terminal, run: <code className="bg-blue-100 px-1 rounded">/system script run filename.rsc</code></li>
                            </ol>
                          </div>
                          <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                            <p className="text-xs text-orange-800 font-semibold">⚠️ Admin Config Script:</p>
                            <p className="text-xs text-orange-700 mt-1">
                              Creates API users and stores billing system details on router. 
                              <strong> Change default passwords after setup!</strong>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Command Options */}
                    <div className="grid gap-3">
                      {getSingleCommandOptions(generateConfig()).map((option) => (
                        <div
                          key={option.id}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedCommand?.id === option.id
                              ? 'border-green-500 bg-white shadow-md'
                              : 'border-gray-200 bg-white hover:border-green-300'
                          }`}
                          onClick={() => setSelectedCommand(option)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                option.complexity === 'simple' ? 'bg-blue-100' :
                                option.complexity === 'moderate' ? 'bg-yellow-100' : 'bg-green-100'
                              }`}>
                                {option.complexity === 'simple' ? <Zap className="w-5 h-5 text-blue-600" /> :
                                 option.complexity === 'moderate' ? <Clock className="w-5 h-5 text-yellow-600" /> :
                                 <Check className="w-5 h-5 text-green-600" />}
                              </div>
                              <div>
                                <div className="font-semibold">{option.name}</div>
                                <div className="text-sm text-muted-foreground">{option.description}</div>
                              </div>
                            </div>
                            <Badge variant={option.complexity === 'complete' ? 'default' : 'outline'}>
                              {option.estimatedTime}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Selected Command Display */}
                    {selectedCommand && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">
                          Command to Execute:
                        </Label>
                        <div className="relative">
                          <Textarea
                            value={selectedCommand.command}
                            readOnly
                            className="font-mono text-xs h-32 bg-slate-950 text-green-400 resize-none"
                          />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopySingleCommand(
                                selectedCommand.id === 'ultra-short' ? 'short' : 'complete'
                              )}
                              className="bg-white/90"
                            >
                              {copied?.includes(`single-${selectedCommand.id === 'ultra-short' ? 'short' : 'complete'}`) 
                                ? <Check className="w-3 h-3" /> 
                                : <Copy className="w-3 h-3" />}
                              {copied?.includes(`single-${selectedCommand.id === 'ultra-short' ? 'short' : 'complete'}`) 
                                ? "Copied!" 
                                : "Copy"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadSingle(
                                selectedCommand.id === 'ultra-short' ? 'short' : 'complete'
                              )}
                              className="bg-white/90"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Instructions */}
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div className="text-sm text-blue-800">
                              <p className="font-semibold mb-2">How to Execute:</p>
                              <ol className="list-decimal list-inside space-y-1">
                                <li>Open Mikrotik Winbox</li>
                                <li>Connect to your router</li>
                                <li>Press <strong>Ctrl+T</strong> (or click New Terminal)</li>
                                <li>Copy the command above</li>
                                <li>Paste into terminal window</li>
                                <li>Press <strong>Enter</strong></li>
                                <li>Wait for "ONLINE" message in logs</li>
                                <li>Check Owner Dashboard - router should be online</li>
                              </ol>
                            </div>
                          </div>
                        </div>

                        {/* What Gets Configured */}
                        <div className="mt-4 grid md:grid-cols-2 gap-3">
                          <div className="p-3 bg-white border rounded-lg">
                            <div className="font-semibold text-sm mb-2">✓ Configured:</div>
                            <ul className="text-xs space-y-1 text-muted-foreground">
                              <li>• Hotspot interface & profile</li>
                              <li>• DHCP server & IP pool</li>
                              <li>• Walled garden for billing</li>
                              <li>• API & API-SSL access</li>
                              <li>• Anti-sharing (basic)</li>
                              <li>• System logging</li>
                            </ul>
                          </div>
                          <div className="p-3 bg-white border rounded-lg">
                            <div className="font-semibold text-sm mb-2">✓ After Execution:</div>
                            <ul className="text-xs space-y-1 text-muted-foreground">
                              <li>• Router appears online</li>
                              <li>• Connected to billing system</li>
                              <li>• Ready for user authentication</li>
                              <li>• Vouchers can be activated</li>
                              <li>• Payments processed automatically</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {!selectedCommand && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Select a command option above to get started</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="full" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configuration Parameters
                  </CardTitle>
                  <CardDescription>
                    Customize the provisioning script for your router
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="billingUrl">Billing Server URL</Label>
                    <Input
                      id="billingUrl"
                      value={billingServerUrl}
                      onChange={(e) => setBillingServerUrl(e.target.value)}
                      placeholder="https://billing.Kingstone.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dnsName">Hotspot DNS Name</Label>
                    <Input
                      id="dnsName"
                      value={dnsName}
                      onChange={(e) => setDnsName(e.target.value)}
                      placeholder="router.hotspot.local"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addressPool">Address Pool Name</Label>
                    <Input
                      id="addressPool"
                      value={addressPool}
                      onChange={(e) => setAddressPool(e.target.value)}
                      placeholder="router_pool"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Network className="w-5 h-5" />
                      <CardTitle>Authentication Method</CardTitle>
                    </div>
                  </div>
                  <CardDescription>
                    Choose authentication method and integration type
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="authMethod">Authentication Method</Label>
                    <Select 
                      value={authentication.method} 
                      onValueChange={(value: any) => setAuthentication({ ...authentication, method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hotspot">Hotspot Only</SelectItem>
                        <SelectItem value="pppoe">PPPoE Only</SelectItem>
                        <SelectItem value="both">Both Hotspot & PPPoE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="integrationType">Integration Type</Label>
                    <Select 
                      value={authentication.integrationType} 
                      onValueChange={(value: any) => setAuthentication({ ...authentication, integrationType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api">API Only</SelectItem>
                        <SelectItem value="radius">RADIUS Only</SelectItem>
                        <SelectItem value="api_radius">API + RADIUS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="hotspotEnabled"
                      checked={authentication.hotspotEnabled}
                      onCheckedChange={(checked) => setAuthentication({ ...authentication, hotspotEnabled: checked })}
                    />
                    <Label htmlFor="hotspotEnabled" className="cursor-pointer">Enable Hotspot</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="pppoeEnabled"
                      checked={authentication.pppoeEnabled}
                      onCheckedChange={(checked) => setAuthentication({ ...authentication, pppoeEnabled: checked })}
                    />
                    <Label htmlFor="pppoeEnabled" className="cursor-pointer">Enable PPPoE</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      <CardTitle>Anti-Sharing Options</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="antisharing-enable" className="text-sm">Enable</Label>
                      <Switch
                        id="antisharing-enable"
                        checked={antiSharing.enabled}
                        onCheckedChange={(checked) => setAntiSharing({ ...antiSharing, enabled: checked })}
                      />
                    </div>
                  </div>
                  <CardDescription>
                    Configure hotspot anti-sharing features
                  </CardDescription>
                </CardHeader>
                <CardContent className={antiSharing.enabled ? "" : "opacity-50 pointer-events-none"}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4" />
                        <Label htmlFor="maxSessions" className="cursor-pointer">Max Sessions per User</Label>
                      </div>
                      <Input
                        id="maxSessions"
                        type="number"
                        min="1"
                        max="10"
                        value={antiSharing.maxSessions}
                        onChange={(e) => setAntiSharing({ ...antiSharing, maxSessions: parseInt(e.target.value) || 2 })}
                        className="w-20"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <Label htmlFor="dhcpLimit" className="cursor-pointer">DHCP Lease Limit</Label>
                      </div>
                      <Input
                        id="dhcpLimit"
                        type="number"
                        min="0"
                        value={antiSharing.dhcpLeaseLimit}
                        onChange={(e) => setAntiSharing({ ...antiSharing, dhcpLeaseLimit: parseInt(e.target.value) || 0 })}
                        className="w-20"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <Label htmlFor="blockRouting" className="cursor-pointer flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Block Routing Protocols
                      </Label>
                      <Switch
                        id="blockRouting"
                        checked={antiSharing.blockRouting}
                        onCheckedChange={(checked) => setAntiSharing({ ...antiSharing, blockRouting: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <Label htmlFor="blockBridge" className="cursor-pointer flex items-center gap-2">
                        <Wifi className="w-4 h-4" />
                        Block Client-to-Client
                      </Label>
                      <Switch
                        id="blockBridge"
                        checked={antiSharing.blockBridge}
                        onCheckedChange={(checked) => setAntiSharing({ ...antiSharing, blockBridge: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <Label htmlFor="blockVpn" className="cursor-pointer flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Block VPN Protocols
                      </Label>
                      <Switch
                        id="blockVpn"
                        checked={antiSharing.blockVpn}
                        onCheckedChange={(checked) => setAntiSharing({ ...antiSharing, blockVpn: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <Label htmlFor="arpFilter" className="cursor-pointer flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        ARP Filtering
                      </Label>
                      <Switch
                        id="arpFilter"
                        checked={antiSharing.arpFilter}
                        onCheckedChange={(checked) => setAntiSharing({ ...antiSharing, arpFilter: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      <CardTitle>RADIUS Server Configuration</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="radius-enable" className="text-sm">Enable</Label>
                      <Switch
                        id="radius-enable"
                        checked={radius.enabled}
                        onCheckedChange={(checked) => setRadius({ ...radius, enabled: checked })}
                      />
                    </div>
                  </div>
                  <CardDescription>
                    Configure RADIUS server for centralized authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className={radius.enabled ? "" : "opacity-50 pointer-events-none"}>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="radiusPrimary">Primary RADIUS Server</Label>
                      <Input
                        id="radiusPrimary"
                        value={radius.primaryServer}
                        onChange={(e) => setRadius({ ...radius, primaryServer: e.target.value })}
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="radiusAuthPort">Auth Port</Label>
                      <Input
                        id="radiusAuthPort"
                        type="number"
                        value={radius.primaryPort}
                        onChange={(e) => setRadius({ ...radius, primaryPort: parseInt(e.target.value) || 1812 })}
                        className="w-20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="radiusAcctPort">Accounting Port</Label>
                      <Input
                        id="radiusAcctPort"
                        type="number"
                        value={radius.accountingPort}
                        onChange={(e) => setRadius({ ...radius, accountingPort: parseInt(e.target.value) || 1813 })}
                        className="w-20"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="radiusSecret">RADIUS Secret</Label>
                      <Input
                        id="radiusSecret"
                        value={radius.primarySecret}
                        onChange={(e) => setRadius({ ...radius, primarySecret: e.target.value })}
                        placeholder="[GENERATE_SECURE_RADIUS_SECRET]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="radiusTimeout">Timeout (ms)</Label>
                      <Input
                        id="radiusTimeout"
                        type="number"
                        value={radius.timeout}
                        onChange={(e) => setRadius({ ...radius, timeout: parseInt(e.target.value) || 1000 })}
                        className="w-20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="radiusRetries">Max Retries</Label>
                      <Input
                        id="radiusRetries"
                        type="number"
                        value={radius.maxRetries}
                        onChange={(e) => setRadius({ ...radius, maxRetries: parseInt(e.target.value) || 3 })}
                        className="w-20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="radiusInterim">Interim Update (sec)</Label>
                      <Input
                        id="radiusInterim"
                        type="number"
                        value={authentication.radiusInterimUpdate}
                        onChange={(e) => setAuthentication({ ...authentication, radiusInterimUpdate: parseInt(e.target.value) || 300 })}
                        className="w-20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nasIdentifier">NAS Identifier</Label>
                      <Input
                        id="nasIdentifier"
                        value={radius.nasIdentifier}
                        onChange={(e) => setRadius({ ...radius, nasIdentifier: e.target.value })}
                        placeholder={mikrotik.routerId}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Full Provisioning Script</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(fullScript, "full")}
                      >
                        {copied === "full" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied === "full" ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleDownloadFull}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Complete router configuration with all features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Textarea
                      value={fullScript}
                      readOnly
                      className="font-mono text-xs h-96 bg-slate-950 text-green-400 resize-none"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="bg-slate-800 text-slate-300">
                        RouterOS Script
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">Important Instructions:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Open Mikrotik Winbox and connect to your router</li>
                          <li>Go to <strong>New Terminal</strong> (Ctrl+T)</li>
                          <li>Copy the entire script above and paste it into the terminal</li>
                          <li>Press <strong>Enter</strong> to execute</li>
                          <li>Replace <code className="bg-amber-100 px-1 rounded">[GENERATE_SECURE_PASSWORD]</code> with actual passwords</li>
                          <li>Verify configuration with: <code className="bg-amber-100 px-1 rounded">/ip hotspot print</code></li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quick" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Quick Setup Commands</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(quickScript, "quick")}
                      >
                        {copied === "quick" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied === "quick" ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadQuick}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Minimal commands to get started quickly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Textarea
                      value={quickScript}
                      readOnly
                      className="font-mono text-xs h-64 bg-slate-950 text-green-400 resize-none"
                    />
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Quick Setup Guide:</p>
                        <p>
                          These commands will set up basic hotspot functionality with walled garden 
                          for the billing system and basic anti-sharing. Perfect for quick deployments.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="antisharing" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Anti-Sharing Commands</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(antiSharingScript, "antisharing")}
                      >
                        {copied === "antisharing" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied === "antisharing" ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadAntiSharing}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Dedicated anti-sharing configuration commands
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Textarea
                      value={antiSharingScript}
                      readOnly
                      className="font-mono text-xs h-96 bg-slate-950 text-green-400 resize-none"
                    />
                  </div>
                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Benefits:</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>✓ Prevents password sharing</li>
                        <li>✓ Blocks VPN tunneling</li>
                        <li>✓ Stops client-to-client communication</li>
                        <li>✓ Enforces single device per account</li>
                        <li>✓ Improves network performance</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">Considerations:</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>⚠ Users can't use multiple devices</li>
                        <li>⚠ May block legitimate VPN usage</li>
                        <li>⚠ Requires careful testing</li>
                        <li>⚠ Monitor for false positives</li>
                        <li>⚠ May need firewall adjustments</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="radius" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>API + RADIUS Configuration</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(radiusScript, "radius")}
                      >
                        {copied === "radius" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied === "radius" ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadRadius}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    RADIUS server configuration for centralized authentication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Textarea
                      value={radiusScript}
                      readOnly
                      className="font-mono text-xs h-96 bg-slate-950 text-green-400 resize-none"
                    />
                  </div>
                  <div className="mt-4 grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-2">🔐 API Integration</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>✓ Direct router control</li>
                        <li>✓ Real-time user management</li>
                        <li>✓ Hotspot & PPPoE support</li>
                        <li>✓ Billing system sync</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">🌐 RADIUS Integration</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>✓ Centralized authentication</li>
                        <li>✓ Accounting & billing</li>
                        <li>✓ Multi-router support</li>
                        <li>✓ Roaming capabilities</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">⚡ API + RADIUS</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>✓ Best of both worlds</li>
                        <li>✓ Redundant authentication</li>
                        <li>✓ Flexible deployment</li>
                        <li>✓ Enterprise-grade</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">RADIUS Setup Requirements:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>RADIUS server must be reachable from router</li>
                          <li>Configure shared secret on both ends</li>
                          <li>Open UDP ports 1812 (auth) and 1813 (accounting)</li>
                          <li>Test connectivity before deployment</li>
                          <li>Configure NAS identifier uniquely per router</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
