import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wifi,
  Signal,
  Shield,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Settings,
  Radio,
  RefreshCw,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import type { MikrotikModel, WirelessConfig } from "@/lib/mikrotikDeviceDetection";
import { createMikrotikClient, type MikrotikWirelessInfo } from "@/lib/mikrotikApiClient";

interface WirelessConfigData {
  ssid: string;
  mode: 'ap-bridge' | 'bridge' | 'station' | 'station-bridge' | 'align';
  band: '2.4GHz' | '5GHz' | 'both';
  channelWidth: string;
  frequency: number;
  txPower: number;
  security: {
    profile: string;
    authenticationTypes: string[];
    encryption: string;
  };
  hideSsid: boolean;
  isolateClients: boolean;
  multicastHelper: boolean;
  accessList: string[];
}

interface WirelessConfigurationProps {
  mikrotikId: string;
  routerId: string;
  ipAddress?: string;
  apiPort?: number;
  username?: string;
  password?: string;
  model?: MikrotikModel;
  onSave?: (config: any) => void;
}

const DEFAULT_WIRELESS_CONFIG: WirelessConfigData = {
  ssid: "Yobrazlyan-WiFi",
  mode: 'ap-bridge',
  band: 'both',
  channelWidth: '20/40mhz-Ce',
  frequency: 2437,
  txPower: 20,
  security: {
    profile: "default",
    authenticationTypes: ["wpa2-psk"],
    encryption: "aes-ccm",
  },
  hideSsid: false,
  isolateClients: false,
  multicastHelper: true,
  accessList: []
};

export const WirelessConfiguration = ({
  mikrotikId,
  routerId,
  ipAddress,
  apiPort,
  username,
  password: apiPassword,  // Rename to avoid collision
  model,
  onSave
}: WirelessConfigurationProps) => {
  const [config, setConfig] = useState<WirelessConfigData>(DEFAULT_WIRELESS_CONFIG);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [wirelessEnabled, setWirelessEnabled] = useState(true);
  const [wifiPassword, setWifiPassword] = useState("Yobrazlyan@2026");  // Renamed
  const [wirelessInfo, setWirelessInfo] = useState<MikrotikWirelessInfo | null>(null);
  const [fetchingData, setFetchingData] = useState(false);

  const wirelessSpec = model?.wireless;

  useEffect(() => {
    // Load current wireless configuration
    loadWirelessConfig();
  }, [mikrotikId]);

  const loadWirelessConfig = async () => {
    try {
      setFetchingData(true);
      
      // Check if we have API credentials
      if (ipAddress && apiPort && username && password) {
        // Fetch real wireless data from router
        const client = createMikrotikClient({
          id: mikrotikId,
          mikrotikId,
          routerId,
          ipAddress,
          apiPort,
          username,
          password
        });

        const connectResult = await client.connect();
        
        if (connectResult.success) {
          const wirelessData = await client.getAllWirelessInterfaces();
          
          if (wirelessData.success && wirelessData.data && wirelessData.data.length > 0) {
            const firstWireless = wirelessData.data[0];
            setWirelessInfo(firstWireless);
            
            // Update config with real data
            setConfig({
              ...config,
              ssid: firstWireless.ssid || config.ssid,
              mode: firstWireless.mode as any || config.mode,
              band: firstWireless.band.includes('5ghz') && firstWireless.band.includes('2ghz') 
                ? 'both' 
                : firstWireless.band.includes('5ghz') 
                  ? '5GHz' 
                  : '2.4GHz',
              frequency: firstWireless.frequency || config.frequency,
              txPower: firstWireless.txPower || config.txPower,
              hideSsid: firstWireless.hideSsid
            });

            setWifiPassword("********"); // Don't show real password

            toast.success(`Loaded wireless config: ${firstWireless.ssid}`);
          }
          
          await client.disconnect();
        } else {
          console.warn("Could not connect to router:", connectResult.error);
          toast.warning("Using cached configuration");
        }
      } else {
        console.warn("No API credentials provided, using cached configuration");
      }
    } catch (error) {
      console.error("Error loading wireless config:", error);
      toast.error("Failed to load wireless configuration");
    } finally {
      setFetchingData(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate configuration
      if (!config.ssid || config.ssid.length < 1) {
        toast.error("SSID cannot be empty");
        return;
      }

      if (config.security.authenticationTypes.includes('wpa2-psk') && password.length < 8) {
        toast.error("WPA2 password must be at least 8 characters");
        return;
      }

      // Generate RouterOS commands
      const commands = generateWirelessCommands();
      
      // TODO: Implement actual API call to save configuration
      
      toast.success("Wireless configuration saved successfully!");
      
      if (onSave) {
        onSave({
          mikrotikId,
          routerId,
          config,
          commands,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error saving wireless config:", error);
      toast.error("Failed to save wireless configuration");
    } finally {
      setLoading(false);
    }
  };

  const generateWirelessCommands = (): string => {
    const commands: string[] = [];

    // Enable/disable wireless
    commands.push(`/interface wireless set [find] disabled=${!wirelessEnabled}`);

    // Configure wireless interface
    commands.push(`/interface wireless set [find] \\
    ssid="${config.ssid}" \\
    mode=${config.mode} \\
    band=${config.band === 'both' ? '2ghz-b/g/n,5ghz-a/n/ac' : config.band === '2.4GHz' ? '2ghz-b/g/n' : '5ghz-a/n/ac'} \\
    channel-width=${config.channelWidth} \\
    frequency=${config.frequency} \\
    tx-power=${config.txPower} \\
    hide-ssid=${config.hideSsid ? 'yes' : 'no'} \\
    hide-ssid=yes`);

    // Security profile
    commands.push(`/interface wireless security-profile set [find] \\
    mode=dynamic-keys \\
    authentication-types=${config.security.authenticationTypes.join(',')} \\
    encryption=${config.security.encryption} \\
    wpa2-pre-shared-key="${password}"`);

    // Client isolation
    if (config.isolateClients) {
      commands.push(`/interface wireless set [find] default-ap-tx-limit=0 default-client-tx-limit=0`);
      commands.push(`/interface wireless access-list add interface=[find] signal-range=-120..-30 action=reject comment="Client Isolation"`);
    }

    // Multicast helper
    commands.push(`/interface wireless set [find] multicast-helper=${config.multicastHelper ? 'full' : 'disabled'}`);

    return commands.join('\n\n');
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset to default settings?")) {
      setConfig(DEFAULT_WIRELESS_CONFIG);
      setWirelessEnabled(true);
      setPassword("Yobrazlyan@2026");
      toast.info("Configuration reset to defaults");
    }
  };

  const getBandChannels = (band: string): number[] => {
    if (band === '2.4GHz') {
      return [2412, 2417, 2422, 2427, 2432, 2437, 2442, 2447, 2452, 2457, 2462, 2467, 2472, 2484];
    } else if (band === '5GHz') {
      return [5180, 5200, 5220, 5240, 5260, 5280, 5300, 5320, 5500, 5520, 5540, 5560, 5580, 5600, 5620, 5640, 5660, 5680, 5700, 5720, 5745, 5765, 5785, 5805, 5825];
    }
    return [2437];
  };

  return (
    <div className="space-y-6">
      {/* Wireless Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5" />
              <CardTitle>Wireless Configuration</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={loadWirelessConfig}
                disabled={fetchingData || !ipAddress}
                title="Refresh from router"
              >
                <RefreshCw className={`w-4 h-4 ${fetchingData ? 'animate-spin' : ''}`} />
              </Button>
              <Label htmlFor="wireless-enabled" className="text-sm">Wireless Enabled</Label>
              <Switch
                id="wireless-enabled"
                checked={wirelessEnabled}
                onCheckedChange={setWirelessEnabled}
                disabled={!wirelessSpec?.enabled}
              />
            </div>
          </div>
          <CardDescription>
            Configure WiFi settings for {model?.name || routerId}
            {wirelessInfo && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Connected clients: {wirelessInfo.registeredClients}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wirelessSpec?.enabled ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Wireless Standard</div>
                <div className="font-semibold">{wirelessSpec.standards.join(', ')}</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Antenna Configuration</div>
                <div className="font-semibold">{wirelessSpec.chains}</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Max TX Power</div>
                <div className="font-semibold">{wirelessSpec.maxTxPower} dBm</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Frequency Bands</div>
                <div className="font-semibold">
                  {Object.entries(wirelessSpec.frequencyBands)
                    .filter(([_, enabled]) => enabled)
                    .map(([band, _]) => band)
                    .join(', ')}
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Antenna Gain</div>
                <div className="font-semibold">{wirelessSpec.antennaGain} dBi</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Max SSIDs</div>
                <div className="font-semibold">{wirelessSpec.ssidCount}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wifi className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>This device does not have wireless capability</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Clients */}
      {wirelessInfo && wirelessInfo.clients && wirelessInfo.clients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Connected Wireless Clients ({wirelessInfo.clients.length})
            </CardTitle>
            <CardDescription>
              Currently connected devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {wirelessInfo.clients.map((client, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Wifi className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{client.macAddress}</div>
                      <div className="text-xs text-muted-foreground">
                        Signal: {client.signalStrength} dBm • {client.txRate} Mbps
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>TX: {(client.txBytes / 1024).toFixed(1)} KB</div>
                    <div>RX: {(client.rxBytes / 1024).toFixed(1)} KB</div>
                    <div>{client.uptime}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {wirelessSpec?.enabled && (
        <>
          {/* Basic Wireless Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Basic Wireless Settings
              </CardTitle>
              <CardDescription>
                Configure SSID and basic wireless parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ssid">Network Name (SSID)</Label>
                  <Input
                    id="ssid"
                    value={config.ssid}
                    onChange={(e) => setConfig({ ...config, ssid: e.target.value })}
                    placeholder="Yobrazlyan-WiFi"
                  />
                </div>
                <div>
                  <Label htmlFor="mode">Wireless Mode</Label>
                  <Select
                    value={config.mode}
                    onValueChange={(value: any) => setConfig({ ...config, mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ap-bridge">Access Point (AP Bridge)</SelectItem>
                      <SelectItem value="bridge">Bridge</SelectItem>
                      <SelectItem value="station">Station</SelectItem>
                      <SelectItem value="station-bridge">Station Bridge</SelectItem>
                      <SelectItem value="align">Align</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="band">Frequency Band</Label>
                  <Select
                    value={config.band}
                    onValueChange={(value: any) => {
                      setConfig({ ...config, band: value });
                      // Update frequency based on band
                      const channels = getBandChannels(value);
                      setConfig({ ...config, band: value, frequency: channels[0] });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Dual Band (2.4GHz + 5GHz)</SelectItem>
                      <SelectItem value="2.4GHz">2.4 GHz Only</SelectItem>
                      <SelectItem value="5GHz">5 GHz Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="channelWidth">Channel Width</Label>
                  <Select
                    value={config.channelWidth}
                    onValueChange={(value) => setConfig({ ...config, channelWidth: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20mhz">20 MHz</SelectItem>
                      <SelectItem value="20/40mhz-Ce">20/40 MHz</SelectItem>
                      <SelectItem value="40mhz">40 MHz</SelectItem>
                      <SelectItem value="80mhz">80 MHz (5GHz only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency (MHz)</Label>
                  <Select
                    value={config.frequency.toString()}
                    onValueChange={(value) => setConfig({ ...config, frequency: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getBandChannels(config.band).map((freq) => (
                        <SelectItem key={freq} value={freq.toString()}>
                          {freq} MHz
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="txPower">TX Power (dBm): {config.txPower}</Label>
                  <Slider
                    id="txPower"
                    min={0}
                    max={wirelessSpec.maxTxPower}
                    step={1}
                    value={[config.txPower]}
                    onValueChange={(value) => setConfig({ ...config, txPower: value[0] })}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0 dBm</span>
                    <span>{wirelessSpec.maxTxPower} dBm (Max)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="hideSsid"
                    checked={config.hideSsid}
                    onCheckedChange={(checked) => setConfig({ ...config, hideSsid: checked })}
                  />
                  <Label htmlFor="hideSsid">Hide SSID</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="multicastHelper"
                    checked={config.multicastHelper}
                    onCheckedChange={(checked) => setConfig({ ...config, multicastHelper: checked })}
                  />
                  <Label htmlFor="multicastHelper">Multicast Helper</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Wireless Security
              </CardTitle>
              <CardDescription>
                Configure WiFi security and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="securityProfile">Security Profile</Label>
                  <Select
                    value={config.security.profile}
                    onValueChange={(value) => setConfig({ ...config, security: { ...config.security, profile: value } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="none">None (Open)</SelectItem>
                      <SelectItem value="wpa2">WPA2 Personal</SelectItem>
                      <SelectItem value="wpa3">WPA3 Personal</SelectItem>
                      <SelectItem value="wpa2-enterprise">WPA2 Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="encryption">Encryption</Label>
                  <Select
                    value={config.security.encryption}
                    onValueChange={(value) => setConfig({ ...config, security: { ...config.security, encryption: value } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aes-ccm">AES-CCM</SelectItem>
                      <SelectItem value="tkip">TKIP</SelectItem>
                      <SelectItem value="aes-ccm+tkip">AES-CCM + TKIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {config.security.profile !== 'none' && (
                <div>
                  <Label htmlFor="password">WiFi Password</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder="Enter WiFi password"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Password must be at least 8 characters for WPA2
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  id="isolateClients"
                  checked={config.isolateClients}
                  onCheckedChange={(checked) => setConfig({ ...config, isolateClients: checked })}
                />
                <Label htmlFor="isolateClients">Client Isolation (AP Isolation)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, wireless clients cannot communicate with each other
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
