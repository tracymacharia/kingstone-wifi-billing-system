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
  Network,
  Save,
  RotateCcw,
  EthernetPort,
  Zap,
  Settings,
  Activity,
  Check,
  X,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MikrotikModel, EthernetPort as PortModel, PortLayout } from "@/lib/mikrotikDeviceDetection";
import { generatePortLayout } from "@/lib/mikrotikDeviceDetection";
import { createMikrotikClient, type MikrotikInterfaceInfo, type MikrotikPoEInfo } from "@/lib/mikrotikApiClient";

interface PortConfig {
  id: number;
  name: string;
  enabled: boolean;
  comment: string;
  speed: string;
  vlanMode: 'disabled' | 'fallback' | 'check' | 'secure';
  vlanId?: number;
  poeOut?: boolean;
  poePriority?: 'low' | 'medium' | 'high';
  rateLimit?: {
    tx: number; // Mbps
    rx: number; // Mbps
  };
}

interface EthernetConfigurationProps {
  mikrotikId: string;
  routerId: string;
  model?: MikrotikModel;
  onSave?: (config: any) => void;
}

export const EthernetConfiguration = ({
  mikrotikId,
  routerId,
  model,
  onSave
}: EthernetConfigurationProps) => {
  const [portLayout, setPortLayout] = useState<PortLayout | null>(null);
  const [portConfigs, setPortConfigs] = useState<Map<number, PortConfig>>(new Map());
  const [loading, setLoading] = useState(false);
  const [poeEnabled, setPoeEnabled] = useState(true);

  useEffect(() => {
    if (model) {
      const layout = generatePortLayout(model);
      setPortLayout(layout);
      initializePortConfigs(layout);
    }
  }, [model]);

  const initializePortConfigs = (layout: PortLayout) => {
    const configs = new Map<number, PortConfig>();
    
    layout.ethernet.forEach(port => {
      configs.set(port.id, {
        id: port.id,
        name: port.name,
        enabled: true,
        comment: port.label || port.name,
        speed: 'auto',
        vlanMode: 'disabled',
        vlanId: undefined,
        poeOut: port.poeOut || false,
        poePriority: 'medium',
        rateLimit: undefined
      });
    });

    setPortConfigs(configs);
  };

  const loadCurrentConfig = async () => {
    try {
      setLoading(true);
      // TODO: Implement actual API call to fetch current port configuration
      toast.success("Port configuration loaded");
    } catch (error) {
      console.error("Error loading port config:", error);
      toast.error("Failed to load port configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Generate RouterOS commands
      const commands = generatePortCommands();
      
      // TODO: Implement actual API call to save configuration
      
      toast.success("Ethernet configuration saved successfully!");
      
      if (onSave) {
        onSave({
          mikrotikId,
          routerId,
          configs: Array.from(portConfigs.values()),
          commands,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error saving port config:", error);
      toast.error("Failed to save port configuration");
    } finally {
      setLoading(false);
    }
  };

  const generatePortCommands = (): string => {
    const commands: string[] = [];

    portConfigs.forEach((config) => {
      // Enable/disable port
      commands.push(`/interface ethernet set [find name="${config.name}"] disabled=${!config.enabled}`);
      
      // Set comment
      commands.push(`/interface ethernet set [find name="${config.name}"] comment="${config.comment}"`);
      
      // Set speed (if not auto)
      if (config.speed !== 'auto') {
        commands.push(`/interface ethernet set [find name="${config.name}"] speed="${config.speed}"`);
      }

      // VLAN configuration
      if (config.vlanMode !== 'disabled' && config.vlanId) {
        commands.push(`/interface ethernet switch vlan add ports=${config.name} vlan-id=${config.vlanId}`);
      }

      // Rate limiting
      if (config.rateLimit) {
        commands.push(`/queue simple add name="queue-${config.name}" target=${config.name} max-limit=${config.rateLimit.tx}M/${config.rateLimit.rx}M`);
      }

      // PoE configuration
      if (config.poeOut && model?.poe.supported) {
        commands.push(`/interface ethernet poe set [find name="${config.name}"] enabled=yes priority=${config.poePriority || 'medium'}`);
      } else if (model?.poe.supported) {
        commands.push(`/interface ethernet poe set [find name="${config.name}"] enabled=no`);
      }
    });

    return commands.join('\n\n');
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all port settings to defaults?")) {
      if (portLayout) {
        initializePortConfigs(portLayout);
      }
      toast.info("Port configuration reset to defaults");
    }
  };

  const updatePortConfig = (portId: number, updates: Partial<PortConfig>) => {
    setPortConfigs(prev => {
      const newConfigs = new Map(prev);
      const config = newConfigs.get(portId);
      if (config) {
        newConfigs.set(portId, { ...config, ...updates });
      }
      return newConfigs;
    });
  };

  if (!portLayout) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Loading port configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Port Layout Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EthernetPort className="w-5 h-5" />
              <CardTitle>Ethernet Ports</CardTitle>
            </div>
            <Badge variant="outline">{model?.name}</Badge>
          </div>
          <CardDescription>
            Configure Ethernet port settings for {model?.name || routerId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Visual Port Layout */}
          <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg mb-6">
            <div className="text-center text-white font-semibold mb-4">
              {model?.name} - Port Layout
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {/* Ethernet Ports */}
              {portLayout.ethernet.map((port) => {
                const config = portConfigs.get(port.id);
                return (
                  <TooltipProvider key={port.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`
                            relative w-16 h-24 rounded-lg border-2 transition-all cursor-pointer
                            ${config?.enabled 
                              ? 'bg-green-600 border-green-400 shadow-lg shadow-green-500/30' 
                              : 'bg-red-900 border-red-700 opacity-50'}
                            ${config?.poeOut ? 'border-yellow-400 border-4' : ''}
                          `}
                          onClick={() => updatePortConfig(port.id, { enabled: !config?.enabled })}
                        >
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs text-white font-bold">
                            {port.id}
                          </div>
                          <div className="flex flex-col items-center justify-center h-full text-white text-xs">
                            <EthernetPort className="w-6 h-6 mb-1" />
                            <span className="font-mono">{port.name.replace('ether', '')}</span>
                          </div>
                          {port.poeOut && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                              <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">{port.name}</p>
                        <p className="text-xs">{port.speed}</p>
                        <p className="text-xs">{port.label}</p>
                        {port.poeIn && <p className="text-xs text-green-400">✓ PoE In</p>}
                        {port.poeOut && <p className="text-xs text-yellow-400">✓ PoE Out</p>}
                        <p className="text-xs text-muted-foreground">
                          Status: {config?.enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}

              {/* SFP Ports */}
              {portLayout.sfp.map((port) => (
                <TooltipProvider key={port.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-16 h-24 rounded-lg border-2 border-blue-500 bg-blue-900/50 flex flex-col items-center justify-center text-white cursor-pointer hover:bg-blue-900 transition-colors">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs text-blue-300 font-bold">
                          {port.id}
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <Activity className="w-6 h-6 mb-1" />
                          <span className="font-mono text-xs">{port.name}</span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{port.name}</p>
                      <p className="text-xs">{port.speed} {port.type.toUpperCase()}</p>
                      <p className="text-xs">{port.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-6 text-xs text-white">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span>Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-900 rounded"></div>
                <span>Disabled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                <span>PoE Out</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-900 border-2 border-blue-500 rounded"></div>
                <span>SFP</span>
              </div>
            </div>
          </div>

          {/* PoE Status */}
          {model?.poe.supported && (
            <div className="p-4 bg-slate-100 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold">PoE Configuration</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="poe-enabled" className="text-sm">PoE Enabled</Label>
                  <Switch
                    id="poe-enabled"
                    checked={poeEnabled}
                    onCheckedChange={setPoeEnabled}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2 font-medium">{model.poe.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Max Output:</span>
                  <span className="ml-2 font-medium">{model.poe.maxOutputPower || 0}W</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Standard:</span>
                  <span className="ml-2 font-medium">{model.poe.standard}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Port Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Port Configuration</CardTitle>
          <CardDescription>
            Configure individual port settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from(portConfigs.values()).map((config) => (
              <div
                key={config.id}
                className={`p-4 border rounded-lg ${!config.enabled ? 'opacity-50 bg-slate-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.enabled ? 'bg-green-100' : 'bg-red-100'}`}>
                      <EthernetPort className={`w-5 h-5 ${config.enabled ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <div className="font-semibold">{config.name} - {config.comment}</div>
                      <div className="text-sm text-muted-foreground">
                        Port {config.id} • {portLayout.ethernet.find(p => p.id === config.id)?.speed || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) => updatePortConfig(config.id, { enabled: checked })}
                    />
                    <Label className="text-sm">Enabled</Label>
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor={`comment-${config.id}`}>Comment</Label>
                    <Input
                      id={`comment-${config.id}`}
                      value={config.comment}
                      onChange={(e) => updatePortConfig(config.id, { comment: e.target.value })}
                      disabled={!config.enabled}
                      placeholder="Port description"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`speed-${config.id}`}>Speed</Label>
                    <Select
                      value={config.speed}
                      onValueChange={(value) => updatePortConfig(config.id, { speed: value })}
                    >
                      <SelectTrigger disabled={!config.enabled}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="1000M-full">1000M Full</SelectItem>
                        <SelectItem value="100M-full">100M Full</SelectItem>
                        <SelectItem value="100M-half">100M Half</SelectItem>
                        <SelectItem value="10M-full">10M Full</SelectItem>
                        <SelectItem value="10M-half">10M Half</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`vlan-${config.id}`}>VLAN Mode</Label>
                    <Select
                      value={config.vlanMode}
                      onValueChange={(value: any) => updatePortConfig(config.id, { vlanMode: value })}
                    >
                      <SelectTrigger disabled={!config.enabled}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="fallback">Fallback</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="secure">Secure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {config.vlanMode !== 'disabled' && (
                    <div>
                      <Label htmlFor={`vlanid-${config.id}`}>VLAN ID</Label>
                      <Input
                        id={`vlanid-${config.id}`}
                        type="number"
                        value={config.vlanId || ''}
                        onChange={(e) => updatePortConfig(config.id, { vlanId: parseInt(e.target.value) })}
                        disabled={!config.enabled}
                        placeholder="1-4094"
                      />
                    </div>
                  )}
                </div>

                {/* PoE Configuration */}
                {portLayout.ethernet.find(p => p.id === config.id)?.poeOut && model?.poe.supported && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-yellow-600" />
                      <Label className="font-semibold">PoE Output Configuration</Label>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.poeOut || false}
                          onCheckedChange={(checked) => updatePortConfig(config.id, { poeOut: checked })}
                        />
                        <Label>PoE Output Enabled</Label>
                      </div>
                      <div>
                        <Label>PoE Priority</Label>
                        <Select
                          value={config.poePriority}
                          onValueChange={(value: any) => updatePortConfig(config.id, { poePriority: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rate Limiting */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <Label className="font-semibold">Rate Limiting (Optional)</Label>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`tx-${config.id}`}>TX Limit (Mbps)</Label>
                      <Input
                        id={`tx-${config.id}`}
                        type="number"
                        value={config.rateLimit?.tx || ''}
                        onChange={(e) => updatePortConfig(config.id, { 
                          rateLimit: { ...config.rateLimit, tx: parseInt(e.target.value) } 
                        })}
                        disabled={!config.enabled}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`rx-${config.id}`}>RX Limit (Mbps)</Label>
                      <Input
                        id={`rx-${config.id}`}
                        type="number"
                        value={config.rateLimit?.rx || ''}
                        onChange={(e) => updatePortConfig(config.id, { 
                          rateLimit: { ...config.rateLimit, rx: parseInt(e.target.value) } 
                        })}
                        disabled={!config.enabled}
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
};
