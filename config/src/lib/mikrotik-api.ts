/**
 * Mikrotik RouterOS API Integration
 * Handles communication with Mikrotik hotspot routers
 */

import { logger } from "@/lib/logger";

export interface MikrotikConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL?: boolean;
}

export interface MikrotikUser {
  name: string;
  password: string;
  profile: string;
  disabled?: boolean;
  comment?: string;
}

export interface MikrotikProfile {
  name: string;
  uptime?: string;
  rate_limit_tx?: string;
  rate_limit_rx?: string;
  shared_users?: number;
}

export interface MikrotikResponse {
  done?: boolean;
  data?: any[];
  error?: string;
}

export class MikrotikAPI {
  private config: MikrotikConfig;
  private socket: WebSocket | null = null;
  private connected: boolean = false;

  constructor(config: MikrotikConfig) {
    this.config = config;
  }

  /**
   * Connect to Mikrotik router
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = this.config.useSSL ? 'wss' : 'ws';
        const url = `${protocol}://${this.config.host}:${this.config.port}`;
        
        // Note: WebSocket connection to Mikrotik requires router to support API-WS
        // For traditional API, use TCP socket connection via backend
        this.socket = new WebSocket(url);
        
        this.socket.onopen = () => {
          this.connected = true;
          resolve(true);
        };

        this.socket.onerror = (error) => {
          logger.error('Mikrotik connection error:', error);
          reject(new Error('Failed to connect to Mikrotik'));
        };

        this.socket.onclose = () => {
          this.connected = false;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from router
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Send command to Mikrotik
   */
  async sendCommand(command: string, params: Record<string, any> = {}): Promise<MikrotikResponse> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      try {
        // Format command for Mikrotik API
        const formattedCommand = this.formatCommand(command, params);
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(formattedCommand);
          
          const timeout = setTimeout(() => {
            reject(new Error('Command timeout'));
          }, 10000);

          this.socket.onmessage = (event) => {
            clearTimeout(timeout);
            const response = this.parseResponse(event.data);
            resolve(response);
          };
        } else {
          reject(new Error('Not connected to Mikrotik'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Format command for Mikrotik API
   */
  private formatCommand(command: string, params: Record<string, any>): string {
    let formatted = command;
    
    for (const [key, value] of Object.entries(params)) {
      formatted += ` ${key}=${value}`;
    }
    
    return formatted;
  }

  /**
   * Parse Mikrotik response
   */
  private parseResponse(data: any): MikrotikResponse {
    // Parse response based on Mikrotik API format
    return {
      done: true,
      data: data,
    };
  }

  /**
   * Create hotspot user
   */
  async createHotspotUser(user: MikrotikUser): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/user/add', {
      '=name': user.name,
      '=password': user.password,
      '=profile': user.profile,
      '=comment': user.comment || '',
    });
  }

  /**
   * Remove hotspot user
   */
  async removeHotspotUser(userId: string): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/user/remove', {
      '.id': userId,
    });
  }

  /**
   * Get all hotspot users
   */
  async getHotspotUsers(): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/user/print');
  }

  /**
   * Find hotspot user by name
   */
  async findHotspotUser(name: string): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/user/print', {
      '?name': name,
    });
  }

  /**
   * Enable hotspot user
   */
  async enableHotspotUser(userId: string): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/user/enable', {
      '.id': userId,
    });
  }

  /**
   * Disable hotspot user
   */
  async disableHotspotUser(userId: string): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/user/disable', {
      '.id': userId,
    });
  }

  /**
   * Create hotspot profile
   */
  async createProfile(profile: MikrotikProfile): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/user/profile/add', {
      '=name': profile.name,
      '=uptime': profile.uptime || '0',
      '=rate-limit': profile.rate_limit_tx 
        ? `${profile.rate_limit_tx}/${profile.rate_limit_rx}` 
        : '',
      '=shared-users': profile.shared_users?.toString() || '1',
    });
  }

  /**
   * Get all profiles
   */
  async getProfiles(): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/user/profile/print');
  }

  /**
   * Remove profile
   */
  async removeProfile(profileId: string): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/user/profile/remove', {
      '.id': profileId,
    });
  }

  /**
   * Get active hotspot sessions
   */
  async getActiveSessions(): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/active/print');
  }

  /**
   * Kick user from hotspot
   */
  async kickUser(sessionId: string): Promise<MikrotikResponse> {
    return this.sendCommand('/ip/hotspot/active/remove', {
      '.id': sessionId,
    });
  }

  /**
   * Get router identity
   */
  async getIdentity(): Promise<MikrotikResponse> {
    return this.sendCommand('/system/identity/print');
  }

  /**
   * Get router resources
   */
  async getResources(): Promise<MikrotikResponse> {
    return this.sendCommand('/system/resource/print');
  }
}

/**
 * Create Mikrotik connection from database config
 */
export function createMikrotikFromConfig(dbConfig: any): MikrotikAPI {
  return new MikrotikAPI({
    host: dbConfig.ip_address,
    port: dbConfig.api_port || 8728,
    username: dbConfig.username,
    password: dbConfig.password_encrypted,
    useSSL: dbConfig.status === 'secure',
  });
}

export default MikrotikAPI;
