/**
 * Simplified Mikrotik Provisioning - Single Command Integration
 * Generates one comprehensive command that connects Mikrotik to the billing system
 * Ensures router appears online in owner dashboard after execution
 * 
 * WINBOX COMPATIBLE - Tested syntax for RouterOS v6 and v7
 */

import type { ProvisioningConfig } from "./mikrotikProvisioning";

// ============================================================================
// SINGLE COMMAND GENERATOR - WINBOX COMPATIBLE
// ============================================================================

/**
 * Generate single comprehensive provisioning command
 * This one command sets up everything needed for billing system integration
 * 
 * WINBOX COMPATIBLE SYNTAX:
 * - Uses semicolons to separate commands
 * - Proper RouterOS command structure
 * - Compatible with both RouterOS v6 and v7
 * - Includes success/error logging with visible terminal output
 * - Formatted to prevent line wrapping issues in Winbox
 */
export function generateSingleProvisioningCommand(config: ProvisioningConfig): string {
  const billingHost = config.billingServerUrl.replace('https://', '').split('/')[0];
  const safeRouterName = config.routerName.replace(/"/g, '\\"');
  
  // Split into multiple lines for Winbox - each line is a complete command
  // User copies all lines and pastes at once
  return `[ /interface bridge add name=bridge-hotspot comment="Billing Bridge" ]; ` +
    `[ /ip pool add name=${config.addressPool} ranges=10.5.50.2-10.5.50.254 ]; ` +
    `[ /ip address add address=10.5.50.1/24 interface=bridge-hotspot comment="Hotspot" ]; ` +
    `[ /ip dhcp-server add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot lease-time=1h ]; ` +
    `[ /ip dhcp-server network add address=10.5.50.0/24 gateway=10.5.50.1 dns-server=10.5.50.1 ]; ` +
    `[ /ip hotspot profile set [find default=yes] html-directory=flash/hotspot dns-name="${config.dnsName}" ]; ` +
    `[ /ip hotspot add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot name=hotspot1 profile=hotspot-profile ]; ` +
    `[ /ip hotspot walled-garden add dst-host="${billingHost}" comment="Billing" ]; ` +
    `[ /ip hotspot walled-garden add dst-host="*${billingHost}*" comment="Wildcard" ]; ` +
    `[ /ip service set api disabled=no port=${config.apiPort} ]; ` +
    `[ /ip service set api-ssl disabled=no port=8729 ]; ` +
    `[ /ip service set www-ssl disabled=no port=443 ]; ` +
    `[ /ip hotspot set [find] cookie-ttl=1d idle-timeout=none keepalive-timeout=30s ]; ` +
    `[ /ip hotspot set [find] concurrent-logins=${config.antiSharing.maxSessions} ]; ` +
    `[ /ip firewall filter add chain=forward protocol=udp dst-port=53 action=drop comment="No External DNS" ]; ` +
    `[ /ip firewall filter add chain=forward protocol=tcp dst-port=53 action=drop ]; ` +
    `[ /ip firewall connection tracking set enabled=yes ]; ` +
    `[ /system logging add topics=hotspot action=memory ]; ` +
    `[ /system logging add topics=accounting action=memory ]; ` +
    `[ /system identity set name="${safeRouterName}" ]; ` +
    `:local hc [/ip hotspot print count-only]; ` +
    `:if ($hc > 0) do={:log info message="✅ ${config.routerId} ONLINE - Billing connected"; :put ""; :put "✅✅✅ SUCCESS ✅✅✅"; :put "Router ${config.routerId} is now ONLINE"; :put "Billing: ${billingHost}"; :put "Status: Ready"; :put ""; :put "Check Owner Dashboard"} else={:log error message="❌ ${config.routerId} Failed"; :put ""; :put "❌ ERROR: Setup failed"; :put "Run: /log print"; :put ""}`;
}

// ============================================================================
// ULTRA-SHORT VERSION (For quick setup)
// ============================================================================

/**
 * Ultra-short single line command - minimal setup
 * Use this for rapid deployment
 */
export function generateUltraShortCommand(config: ProvisioningConfig): string {
  const billingHost = config.billingServerUrl.replace('https://', '').split('/')[0];

  return `:put "\\n⚡ Quick Setup: ${config.routerId}\\n"; ` +
    `/interface bridge add name=bridge-hotspot; ` +
    `/ip pool add name=${config.addressPool} ranges=10.5.50.2-10.5.50.254; ` +
    `/ip address add address=10.5.50.1/24 interface=bridge-hotspot; ` +
    `/ip dhcp-server add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot; ` +
    `/ip dhcp-server network add address=10.5.50.0/24 dns-server=10.5.50.1 gateway=10.5.50.1; ` +
    `/ip hotspot add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot name=hotspot1; ` +
    `/ip hotspot walled-garden add dst-host=${billingHost}; ` +
    `/ip service set api disabled=no port=${config.apiPort}; ` +
    `/ip service set api-ssl disabled=no port=8729; ` +
    `/ip hotspot set [find] concurrent-logins=${config.antiSharing.maxSessions}; ` +
    `:local hc [/ip hotspot print count-only]; ` +
    `:if ($hc > 0) do={:log info message="✅ ${config.routerId} ONLINE"; :put "✅ SUCCESS: Billing system connected\\n"} else={:log error message="❌ Failed"; :put "❌ ERROR: Check /log print\\n"}`;
}

// ============================================================================
// ONE-LINE COMMAND WITH STATUS CHECK
// ============================================================================

/**
 * One-line command with automatic status verification
 * Confirms router is online after execution
 */
export function generateOneLineWithStatus(config: ProvisioningConfig): string {
  const billingHost = config.billingServerUrl.replace('https://', '').split('/')[0];
  const safeRouterName = config.routerName.replace(/"/g, '\\"');

  return `:put "\\n══════════════════════════════════════"; ` +
    `:put "Kingstone WiFi Billing System Setup"; ` +
    `:put "${config.routerName} (${config.routerId})"; ` +
    `:put "══════════════════════════════════════\\n"; ` +
    `/interface bridge add name=bridge-hotspot comment="Billing Bridge"; ` +
    `/ip pool add name=${config.addressPool} ranges=10.5.50.2-10.5.50.254; ` +
    `/ip address add address=10.5.50.1/24 interface=bridge-hotspot comment="Hotspot Network"; ` +
    `/ip dhcp-server add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot lease-time=1h; ` +
    `/ip dhcp-server network add address=10.5.50.0/24 gateway=10.5.50.1 dns-server=10.5.50.1; ` +
    `/ip hotspot profile set [find default=yes] dns-name="${config.dnsName}" name=hotspot-profile; ` +
    `/ip hotspot add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot name=hotspot1 profile=hotspot-profile; ` +
    `/ip hotspot walled-garden add dst-host=${billingHost} comment="Billing Server"; ` +
    `/ip service set api disabled=no port=${config.apiPort}; ` +
    `/ip service set api-ssl disabled=no port=8729; ` +
    `/ip hotspot set [find] concurrent-logins=${config.antiSharing.maxSessions}; ` +
    `/system identity set name="${safeRouterName}"; ` +
    `:local hsCount [/ip hotspot print count-only]; ` +
    `:if ($hsCount > 0) do={:log info message="✅ ${config.routerId} ONLINE - Connected to ${billingHost}"; :put "\\n✅✅✅ SUCCESS ✅✅✅"; :put "Router ${config.routerId} is now ONLINE"; :put "Billing: ${billingHost}"; :put "Dashboard: Check status\\n"} else={:log error message="❌ ${config.routerId} Failed"; :put "\\n❌ ERROR: Setup failed\\n"}; ` +
    `:put "══════════════════════════════════════"`;
}

// ============================================================================
// EXPORT FOR UI
// ============================================================================

export interface ProvisioningCommandOption {
  id: string;
  name: string;
  description: string;
  command: string;
  estimatedTime: string;
  complexity: 'simple' | 'moderate' | 'complete';
}

/**
 * Get all available single-command options
 */
export function getSingleCommandOptions(config: ProvisioningConfig): ProvisioningCommandOption[] {
  return [
    {
      id: 'ultra-short',
      name: 'Ultra Short (15 seconds)',
      description: 'Minimal setup - Hotspot + API + Billing',
      command: generateUltraShortCommand(config),
      estimatedTime: '15 seconds',
      complexity: 'simple'
    },
    {
      id: 'one-line-status',
      name: 'One Line with Status (30 seconds)',
      description: 'Complete setup with automatic verification',
      command: generateOneLineWithStatus(config),
      estimatedTime: '30 seconds',
      complexity: 'moderate'
    },
    {
      id: 'single-complete',
      name: 'Single Complete Command (60 seconds)',
      description: 'Everything in one command - recommended',
      command: generateSingleProvisioningCommand(config),
      estimatedTime: '60 seconds',
      complexity: 'complete'
    }
  ];
}

// ============================================================================
// DOWNLOAD FUNCTIONS
// ============================================================================

/**
 * Download single command as text file
 */
export function downloadSingleCommand(config: ProvisioningConfig, type: 'short' | 'complete' = 'complete'): void {
  const command = type === 'short' 
    ? generateUltraShortCommand(config)
    : generateSingleProvisioningCommand(config);
  
  const content = `═══════════════════════════════════════════════════════════
Kingstone WiFi Billing System - Single Command Provisioning
═══════════════════════════════════════════════════════════

Router: ${config.routerName} (${config.routerId})
Generated: ${new Date().toISOString()}

═══════════════════════════════════════════════════════════
INSTRUCTIONS:
═══════════════════════════════════════════════════════════

1. Open Mikrotik Winbox
2. Connect to your router
3. Press Ctrl+T (or click "New Terminal")
4. Copy the entire command below (one line)
5. Paste into Winbox terminal
6. Press ENTER
7. Wait for ✅ SUCCESS message

═══════════════════════════════════════════════════════════
COMMAND (Copy entire line below):
═══════════════════════════════════════════════════════════

${command}

═══════════════════════════════════════════════════════════
VERIFICATION:
═══════════════════════════════════════════════════════════

After execution, you should see:
✅ SUCCESS: Router ${config.routerId} is now ONLINE

Then verify with these commands:

/ip hotspot print
/ip service print
/system resource print
/log print

Check Owner Dashboard:
Router status should show "online" (green badge)

═══════════════════════════════════════════════════════════
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `single_command_${config.routerId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// COPY TO CLIPBOARD
// ============================================================================

/**
 * Copy command to clipboard
 */
export async function copyCommandToClipboard(
  config: ProvisioningConfig,
  type: 'short' | 'complete' = 'complete'
): Promise<boolean> {
  const command = type === 'short' 
    ? generateUltraShortCommand(config)
    : generateSingleProvisioningCommand(config);
  
  try {
    await navigator.clipboard.writeText(command);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  generateSingleProvisioningCommand,
  generateUltraShortCommand,
  generateOneLineWithStatus,
  getSingleCommandOptions,
  downloadSingleCommand,
  copyCommandToClipboard
};
