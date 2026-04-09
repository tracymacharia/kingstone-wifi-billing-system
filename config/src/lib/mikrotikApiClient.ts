/**
 * Mikrotik RouterOS API Client
 * Connects to Mikrotik routers via API to fetch real-time device information
 * and apply configurations
 * 
 * Supports both direct API connection and Supabase edge function proxy
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface MikrotikConnection {
  id: string;
  mikrotikId: string;
  routerId: string;
  ipAddress: string;
  apiPort: number;
  username: string;
  password: string;
  timeout?: number;
}

export interface MikrotikSystemInfo {
  identity: string;
  boardName: string;
  version: string;
  architecture: string;
  serialNumber: string;
  uptime: string;
  cpuLoad: number;
  memoryTotal: number;
  memoryFree: number;
  memoryUsage: number;
  temperature?: number;
}

export interface MikrotikInterfaceInfo {
  name: string;
  type: string;
  running: boolean;
  enabled: boolean;
  comment?: string;
  mtu: number;
  macAddress: string;
  rxByte: number;
  txByte: number;
  rxPacket: number;
  txPacket: number;
  rxError: number;
  txError: number;
  rxDrop: number;
  txDrop: number;
}

export interface MikrotikWirelessInfo {
  interface: string;
  ssid: string;
  mode: string;
  band: string;
  channelWidth: string;
  frequency: number;
  txPower: number;
  hideSsid: boolean;
  securityProfile: string;
  encryption: string;
  registeredClients: number;
  clients: WirelessClient[];
}

export interface WirelessClient {
  macAddress: string;
  ssid: string;
  interface: string;
  txRate: number;
  rxRate: number;
  signalStrength: number;
  uptime: string;
  txBytes: number;
  rxBytes: number;
}

export interface MikrotikPoEInfo {
  interface: string;
  poeEnabled: boolean;
  poeStatus: 'powered-on' | 'powered-off' | 'waiting-for-power' | 'overloaded' | 'unknown';
  poePriority: 'low' | 'medium' | 'high';
  poeVoltage?: number;
  poeCurrent?: number;
  poePower?: number;
}

export interface MikrotikResourceInfo {
  cpuLoad: number;
  memoryTotal: number;
  memoryFree: number;
  memoryUsage: number;
  uptimeSeconds: number;
  uptime: string;
  temperature?: number;
  voltage?: number;
  current?: number;
  powerConsumption?: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// MIKROTIK API CLIENT CLASS
// ============================================================================

export class MikrotikAPIClient {
  private connection: MikrotikConnection;
  private socket: WebSocket | null = null;
  private connected: boolean = false;
  private sequenceNumber: number = 0;

  constructor(connection: MikrotikConnection) {
    this.connection = connection;
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Connect to Mikrotik router via API
   * Note: This is a simulated connection for demonstration
   * In production, use actual RouterOS API or edge function
   */
  async connect(): Promise<APIResponse<void>> {
    try {
      // In production, this would establish actual API connection
      // For now, we'll use Supabase edge function as proxy
      
      const { data, error } = await supabase.functions.invoke('mikrotik-api', {
        body: {
          action: 'connect',
          mikrotikId: this.connection.mikrotikId,
          username: this.connection.username,
          password: this.connection.password
        }
      });

      if (error) {
        throw error;
      }

      this.connected = true;
      return { success: true, message: 'Connected to Mikrotik router' };
    } catch (error: any) {
      logger.error('Failed to connect to Mikrotik:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to router' 
      };
    }
  }

  /**
   * Disconnect from Mikrotik router
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ============================================================================
  // SYSTEM INFORMATION
  // ============================================================================

  /**
   * Fetch system information from router
   */
  async getSystemInfo(): Promise<APIResponse<MikrotikSystemInfo>> {
    try {
      const response = await this.sendCommand('/system/resource/print');
      
      if (!response.success) {
        return response;
      }

      const resource = response.data[0];
      
      // Get system identity
      const identityResponse = await this.sendCommand('/system/identity/print');
      const identity = identityResponse.data?.[0]?.name || 'Mikrotik';

      // Get system routerboard info
      const routerboardResponse = await this.sendCommand('/system/routerboard/print');
      const routerboard = routerboardResponse.data?.[0] || {};

      // Calculate memory usage
      const memoryTotal = parseInt(resource['total-memory']) || 0;
      const memoryFree = parseInt(resource['free-memory']) || 0;
      const memoryUsage = Math.round(((memoryTotal - memoryFree) / memoryTotal) * 100);

      // Parse uptime
      const uptimeSeconds = parseInt(resource['uptime']) || 0;
      const uptime = this.formatUptime(uptimeSeconds);

      return {
        success: true,
        data: {
          identity,
          boardName: routerboard['model'] || 'Unknown',
          version: resource['version'] || 'Unknown',
          architecture: resource['architecture-name'] || 'Unknown',
          serialNumber: routerboard['serial-number'] || 'Unknown',
          uptime,
          cpuLoad: parseInt(resource['cpu-load']) || 0,
          memoryTotal,
          memoryFree,
          memoryUsage,
          temperature: resource['temperature'] ? parseInt(resource['temperature']) : undefined
        }
      };
    } catch (error: any) {
      logger.error('Failed to get system info:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch system information' 
      };
    }
  }

  // ============================================================================
  // INTERFACE INFORMATION
  // ============================================================================

  /**
   * Fetch all interface information
   */
  async getInterfaces(): Promise<APIResponse<MikrotikInterfaceInfo[]>> {
    try {
      const response = await this.sendCommand('/interface/print', {
        'proplist': 'name,type,running,disabled,comment,mtu,mac-address,rx-byte,tx-byte,rx-packet,tx-packet,rx-error,tx-error,rx-drop,tx-drop'
      });

      if (!response.success) {
        return response;
      }

      const interfaces = response.data.map((iface: any) => ({
        name: iface.name,
        type: iface.type,
        running: iface.running === true,
        enabled: iface.disabled !== true,
        comment: iface.comment,
        mtu: iface.mtu || 1500,
        macAddress: iface['mac-address'] || '',
        rxByte: parseInt(iface['rx-byte']) || 0,
        txByte: parseInt(iface['tx-byte']) || 0,
        rxPacket: parseInt(iface['rx-packet']) || 0,
        txPacket: parseInt(iface['tx-packet']) || 0,
        rxError: parseInt(iface['rx-error']) || 0,
        txError: parseInt(iface['tx-error']) || 0,
        rxDrop: parseInt(iface['rx-drop']) || 0,
        txDrop: parseInt(iface['tx-drop']) || 0
      }));

      return {
        success: true,
        data: interfaces
      };
    } catch (error: any) {
      logger.error('Failed to get interfaces:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch interface information' 
      };
    }
  }

  /**
   * Fetch ethernet interfaces only
   */
  async getEthernetInterfaces(): Promise<APIResponse<MikrotikInterfaceInfo[]>> {
    const response = await this.getInterfaces();
    
    if (!response.success) {
      return response;
    }

    const ethernetInterfaces = response.data?.filter(
      iface => iface.type === 'ether' || iface.type === 'vlan-ethernet'
    ) || [];

    return {
      success: true,
      data: ethernetInterfaces
    };
  }

  // ============================================================================
  // WIRELESS INFORMATION
  // ============================================================================

  /**
   * Fetch wireless interface information
   */
  async getWirelessInfo(interfaceName: string = 'wlan1'): Promise<APIResponse<MikrotikWirelessInfo>> {
    try {
      // Get wireless interface configuration
      const response = await this.sendCommand('/interface/wireless/print', {
        '?name': interfaceName
      });

      if (!response.success || !response.data?.[0]) {
        return { 
          success: false, 
          error: 'Wireless interface not found' 
        };
      }

      const wireless = response.data[0];

      // Get registered clients
      const clientsResponse = await this.sendCommand('/interface/wireless/registration-table/print', {
        '?interface': interfaceName
      });

      const clients: WirelessClient[] = clientsResponse.data?.map((client: any) => ({
        macAddress: client['mac-address'] || '',
        ssid: client.ssid || '',
        interface: client.interface || '',
        txRate: parseInt(client['tx-rate']) || 0,
        rxRate: parseInt(client['rx-rate']) || 0,
        signalStrength: parseInt(client['signal-strength']) || 0,
        uptime: this.formatUptime(parseInt(client['uptime']) || 0),
        txBytes: parseInt(client['tx-byte']) || 0,
        rxBytes: parseInt(client['rx-byte']) || 0
      })) || [];

      return {
        success: true,
        data: {
          interface: wireless.name,
          ssid: wireless.ssid || '',
          mode: wireless.mode || 'ap-bridge',
          band: wireless.band || '',
          channelWidth: wireless['channel-width'] || '',
          frequency: parseInt(wireless.frequency) || 0,
          txPower: parseInt(wireless['tx-power']) || 0,
          hideSsid: wireless['hide-ssid'] === true,
          securityProfile: wireless['security-profile'] || 'default',
          encryption: wireless.encryption || '',
          registeredClients: clients.length,
          clients
        }
      };
    } catch (error: any) {
      logger.error('Failed to get wireless info:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch wireless information' 
      };
    }
  }

  /**
   * Fetch all wireless interfaces
   */
  async getAllWirelessInterfaces(): Promise<APIResponse<MikrotikWirelessInfo[]>> {
    try {
      const response = await this.sendCommand('/interface/wireless/print');

      if (!response.success) {
        return response;
      }

      const wirelessInfos: MikrotikWirelessInfo[] = [];

      for (const wireless of response.data) {
        const info = await this.getWirelessInfo(wireless.name);
        if (info.success && info.data) {
          wirelessInfos.push(info.data);
        }
      }

      return {
        success: true,
        data: wirelessInfos
      };
    } catch (error: any) {
      logger.error('Failed to get all wireless interfaces:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch wireless interfaces' 
      };
    }
  }

  // ============================================================================
  // PoE INFORMATION
  // ============================================================================

  /**
   * Fetch PoE information for all interfaces
   */
  async getPoeInfo(): Promise<APIResponse<MikrotikPoEInfo[]>> {
    try {
      const response = await this.sendCommand('/interface/ethernet/poe/print');

      if (!response.success) {
        return { 
          success: false, 
          error: 'PoE not supported on this device' 
        };
      }

      const poeInfo: MikrotikPoEInfo[] = response.data.map((poe: any) => ({
        interface: poe.name || poe.interface,
        poeEnabled: poe.enabled !== false,
        poeStatus: poe['poe-out-status'] || poe.status || 'unknown',
        poePriority: poe.priority || 'medium',
        poeVoltage: poe['poe-voltage'] ? parseFloat(poe['poe-voltage']) : undefined,
        poeCurrent: poe['poe-current'] ? parseFloat(poe['poe-current']) : undefined,
        poePower: poe['poe-power'] ? parseFloat(poe['poe-power']) : undefined
      }));

      return {
        success: true,
        data: poeInfo
      };
    } catch (error: any) {
      logger.error('Failed to get PoE info:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch PoE information' 
      };
    }
  }

  // ============================================================================
  // RESOURCE MONITORING
  // ============================================================================

  /**
   * Fetch current resource usage
   */
  async getResources(): Promise<APIResponse<MikrotikResourceInfo>> {
    try {
      const response = await this.sendCommand('/system/resource/print');

      if (!response.success) {
        return response;
      }

      const resource = response.data[0];
      const uptimeSeconds = parseInt(resource['uptime']) || 0;
      const memoryTotal = parseInt(resource['total-memory']) || 0;
      const memoryFree = parseInt(resource['free-memory']) || 0;

      return {
        success: true,
        data: {
          cpuLoad: parseInt(resource['cpu-load']) || 0,
          memoryTotal,
          memoryFree,
          memoryUsage: Math.round(((memoryTotal - memoryFree) / memoryTotal) * 100),
          uptimeSeconds,
          uptime: this.formatUptime(uptimeSeconds),
          temperature: resource['temperature'] ? parseInt(resource['temperature']) : undefined,
          voltage: resource['voltage'] ? parseFloat(resource['voltage']) : undefined,
          current: resource['current'] ? parseFloat(resource['current']) : undefined,
          powerConsumption: resource['power-consumption'] ? parseFloat(resource['power-consumption']) : undefined
        }
      };
    } catch (error: any) {
      logger.error('Failed to get resources:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch resource information' 
      };
    }
  }

  // ============================================================================
  // CONFIGURATION COMMANDS
  // ============================================================================

  /**
   * Execute configuration command
   */
  async executeCommand(command: string): Promise<APIResponse<void>> {
    try {
      // Parse command into RouterOS API format
      const lines = command.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      for (const line of lines) {
        await this.sendCommand(line);
      }

      return {
        success: true,
        message: 'Command executed successfully'
      };
    } catch (error: any) {
      logger.error('Failed to execute command:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to execute command' 
      };
    }
  }

  /**
   * Apply wireless configuration
   */
  async applyWirelessConfig(config: {
    interface?: string;
    ssid?: string;
    mode?: string;
    band?: string;
    channelWidth?: string;
    frequency?: number;
    txPower?: number;
    hideSsid?: boolean;
    securityProfile?: string;
  }): Promise<APIResponse<void>> {
    try {
      const commands: string[] = [];

      // Build wireless configuration command
      let wirelessCmd = '/interface/wireless/set';
      
      if (config.interface) {
        wirelessCmd += ` [find name="${config.interface}"]`;
      } else {
        wirelessCmd += ' [find]';
      }

      if (config.ssid !== undefined) {
        wirelessCmd += ` ssid="${config.ssid}"`;
      }
      if (config.mode !== undefined) {
        wirelessCmd += ` mode=${config.mode}`;
      }
      if (config.band !== undefined) {
        wirelessCmd += ` band=${config.band}`;
      }
      if (config.channelWidth !== undefined) {
        wirelessCmd += ` channel-width=${config.channelWidth}`;
      }
      if (config.frequency !== undefined) {
        wirelessCmd += ` frequency=${config.frequency}`;
      }
      if (config.txPower !== undefined) {
        wirelessCmd += ` tx-power=${config.txPower}`;
      }
      if (config.hideSsid !== undefined) {
        wirelessCmd += ` hide-ssid=${config.hideSsid ? 'yes' : 'no'}`;
      }

      commands.push(wirelessCmd);

      // Security profile configuration
      if (config.securityProfile) {
        commands.push(`/interface/wireless/security-profiles/set [find] mode=dynamic-keys`);
      }

      // Execute all commands
      for (const cmd of commands) {
        await this.sendCommand(cmd);
      }

      return {
        success: true,
        message: 'Wireless configuration applied successfully'
      };
    } catch (error: any) {
      logger.error('Failed to apply wireless config:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to apply wireless configuration' 
      };
    }
  }

  /**
   * Apply ethernet port configuration
   */
  async applyEthernetConfig(config: {
    name: string;
    enabled?: boolean;
    comment?: string;
    speed?: string;
  }[]): Promise<APIResponse<void>> {
    try {
      for (const port of config) {
        let cmd = `/interface/ethernet/set [find name="${port.name}"]`;
        
        if (port.enabled !== undefined) {
          cmd += ` disabled=${!port.enabled ? 'yes' : 'no'}`;
        }
        if (port.comment !== undefined) {
          cmd += ` comment="${port.comment}"`;
        }
        if (port.speed !== undefined) {
          cmd += ` speed=${port.speed}`;
        }

        await this.sendCommand(cmd);
      }

      return {
        success: true,
        message: 'Ethernet configuration applied successfully'
      };
    } catch (error: any) {
      logger.error('Failed to apply ethernet config:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to apply ethernet configuration' 
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Send command to Mikrotik router
   */
  private async sendCommand(command: string, params?: Record<string, any>): Promise<APIResponse<any[]>> {
    try {
      // In production, this would use actual RouterOS API protocol
      // For now, we'll use Supabase edge function as proxy
      
      const response = await supabase.functions.invoke('mikrotik-api', {
        body: {
          action: 'command',
          mikrotikId: this.connection.mikrotikId,
          command,
          params
        }
      });

      if (response.error) {
        throw response.error;
      }

      return {
        success: true,
        data: response.data?.result || []
      };
    } catch (error: any) {
      logger.error('Failed to send command:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send command' 
      };
    }
  }

  /**
   * Format uptime seconds to human readable string
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '< 1m';
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create Mikrotik API client from Mikrotik object
 */
export function createMikrotikClient(mikrotik: {
  id: string;
  mikrotikId?: string;
  routerId: string;
  ipAddress: string;
  apiPort: number;
  username: string;
  password: string;
}): MikrotikAPIClient {
  return new MikrotikAPIClient({
    id: mikrotik.id,
    mikrotikId: mikrotik.mikrotikId || mikrotik.id,
    routerId: mikrotik.routerId,
    ipAddress: mikrotik.ipAddress,
    apiPort: mikrotik.apiPort,
    username: mikrotik.username,
    password: mikrotik.password,
    timeout: 5000
  });
}

/**
 * Fetch complete device information from Mikrotik router
 */
export async function fetchMikrotikDeviceInfo(mikrotik: {
  id: string;
  routerId: string;
  ipAddress: string;
  apiPort: number;
  username: string;
  password: string;
}): Promise<{
  system?: MikrotikSystemInfo;
  interfaces?: MikrotikInterfaceInfo[];
  wireless?: MikrotikWirelessInfo[];
  poe?: MikrotikPoEInfo[];
  resources?: MikrotikResourceInfo;
  error?: string;
}> {
  try {
    const client = createMikrotikClient(mikrotik);
    
    // Connect to router
    const connectResult = await client.connect();
    if (!connectResult.success) {
      return { error: connectResult.error };
    }

    // Fetch all information in parallel
    const [system, interfaces, wireless, poe, resources] = await Promise.all([
      client.getSystemInfo(),
      client.getEthernetInterfaces(),
      client.getAllWirelessInterfaces(),
      client.getPoeInfo(),
      client.getResources()
    ]);

    // Disconnect
    await client.disconnect();

    return {
      system: system.success ? system.data : undefined,
      interfaces: interfaces.success ? interfaces.data : undefined,
      wireless: wireless.success ? wireless.data : undefined,
      poe: poe.success ? poe.data : undefined,
      resources: resources.success ? resources.data : undefined
    };
  } catch (error: any) {
    logger.error('Failed to fetch device info:', error);
    return { error: error.message || 'Failed to fetch device information' };
  }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  MikrotikAPIClient,
  createMikrotikClient,
  fetchMikrotikDeviceInfo
};
