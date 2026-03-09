/**
 * Mikrotik Script Generator
 * Creates .rsc script files that can be imported and run in Winbox
 * Uses single-line command syntax compatible with RouterOS import
 *
 * Supports:
 * - Hotspot only (default)
 * - PPPoE only
 * - Both Hotspot + PPPoE
 */

import type { ProvisioningConfig } from "./mikrotikProvisioning";

/**
 * Generate HOTSPOT-ONLY script file content
 * Compatible with RouterOS 6.x and 7.x import
 */
export function generateHotspotScript(config: ProvisioningConfig): string {
  const billingHost = config.billingServerUrl.replace('https://', '').split('/')[0];
  const safeRouterName = config.routerName.replace(/"/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');

  return `# HOTSPOT Configuration
# Router: ${config.routerId}
# Generated: ${new Date().toISOString()}
# Compatible with RouterOS 6.x and 7.x

/interface bridge add name=bridge-hotspot comment="Hotspot Bridge"
/ip pool add name=${config.addressPool} ranges=10.5.50.2-10.5.50.254
/ip address add address=10.5.50.1/24 interface=bridge-hotspot comment="Hotspot Gateway"
/ip dhcp-server add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot lease-time=1h name=dhcp-hotspot
/ip dhcp-server network add address=10.5.50.0/24 gateway=10.5.50.1 dns-server=10.5.50.1
/ip hotspot profile set [find default=yes] dns-name=${config.dnsName} name=hotspot-profile
/ip hotspot add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot name=hotspot1 profile=hotspot-profile
/ip hotspot walled-garden add dst-host=${billingHost} comment="Billing Server" disabled=no
/ip hotspot walled-garden add dst-host=*${billingHost}* comment="Billing Wildcard" disabled=no
/ip service set api disabled=no port=${config.apiPort}
/ip service set api-ssl disabled=no port=8729
/ip service set www-ssl disabled=no port=443
/ip hotspot set [find] cookie-ttl=1d
/ip hotspot set [find] concurrent-logins=${config.antiSharing.maxSessions}
/ip firewall filter add chain=forward protocol=udp dst-port=53 action=drop comment="Block External DNS UDP"
/ip firewall filter add chain=forward protocol=tcp dst-port=53 action=drop comment="Block External DNS TCP"
/system logging add topics=hotspot action=memory
/system logging add topics=accounting action=memory
/system identity set name=${safeRouterName}

:local hc [/ip hotspot print count-only]
:if (\$hc > 0) do={
    :log info message="${config.routerId} HOTSPOT ONLINE"
    :put "SUCCESS: ${config.routerId} is now ONLINE"
    :put "Billing: ${billingHost}"
    :put "Status: Ready"
} else={
    :log error message="${config.routerId} Failed"
    :put "ERROR: Hotspot setup failed - check /log print"
}
`;
}

/**
 * Generate PPPoE-ONLY script file content
 * Compatible with RouterOS 6.x and 7.x import
 */
export function generatePPPoEScript(config: ProvisioningConfig): string {
  const billingHost = config.billingServerUrl.replace('https://', '').split('/')[0];
  const safeRouterName = config.routerName.replace(/"/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const pppoePool = `${config.addressPool.replace('_pool', '')}_pppoe_pool`;

  return `# PPPoE Configuration
# Router: ${config.routerId}
# Generated: ${new Date().toISOString()}
# Compatible with RouterOS 6.x and 7.x

/interface bridge add name=bridge-pppoe comment="PPPoE Bridge"
/ip pool add name=${pppoePool} ranges=10.5.60.2-10.5.60.254
/ip address add address=10.5.60.1/24 interface=bridge-pppoe comment="PPPoE Gateway"
/interface pppoe-server add authentication=chap,mschap1,mschap2 disabled=no interface=bridge-pppoe name=pppoe-server1 service-name=${safeRouterName}-WiFi
/ppp profile set [find default=yes] local-address=10.5.60.1 remote-address=${pppoePool} name=default-profile
/ip service set api disabled=no port=${config.apiPort}
/ip service set api-ssl disabled=no port=8729
/ip service set www-ssl disabled=no port=443
/ppp aaa set accounting=yes
/ip firewall filter add chain=forward protocol=pppoe action=accept comment="Allow PPPoE Traffic"
/system logging add topics=ppp action=memory
/system logging add topics=accounting action=memory
/system identity set name=${safeRouterName}

:local pc [/interface pppoe-server print count-only]
:if (\$pc > 0) do={
    :log info message="${config.routerId} PPPoE ONLINE"
    :put "SUCCESS: ${config.routerId} is now ONLINE"
    :put "Status: Ready"
} else={
    :log error message="${config.routerId} Failed"
    :put "ERROR: PPPoE setup failed - check /log print"
}
`;
}

/**
 * Generate COMBINED Hotspot + PPPoE script
 * For deployments using both authentication methods
 * HOTSPOT ONLY VERSION - PPPoE must be configured separately
 * Compatible with RouterOS 6.x and 7.x import
 */
export function generateCombinedScript(config: ProvisioningConfig): string {
  const billingHost = config.billingServerUrl.replace('https://', '').split('/')[0];
  const safeRouterName = config.routerName.replace(/"/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');

  return `# COMBINED Hotspot Configuration
# Router: ${config.routerId}
# Generated: ${new Date().toISOString()}
# Compatible with RouterOS 6.x and 7.x
# NOTE: This is HOTSPOT only. PPPoE must be configured separately.

/interface bridge add name=bridge-combo comment="Hotspot Bridge"
/ip pool add name=${config.addressPool} ranges=10.5.50.2-10.5.50.254
/ip address add address=10.5.50.1/24 interface=bridge-combo comment="Hotspot Gateway"
/ip dhcp-server add address-pool=${config.addressPool} disabled=no interface=bridge-combo lease-time=1h name=dhcp-hotspot
/ip dhcp-server network add address=10.5.50.0/24 gateway=10.5.50.1 dns-server=10.5.50.1
/ip hotspot profile set [find default=yes] dns-name=${config.dnsName} name=hotspot-profile
/ip hotspot add address-pool=${config.addressPool} disabled=no interface=bridge-combo name=hotspot1 profile=hotspot-profile
/ip hotspot walled-garden add dst-host=${billingHost} comment="Billing Server" disabled=no
/ip hotspot walled-garden add dst-host=*${billingHost}* comment="Billing Wildcard" disabled=no
/ip service set api disabled=no port=${config.apiPort}
/ip service set api-ssl disabled=no port=8729
/ip service set www-ssl disabled=no port=443
/ip hotspot set [find] cookie-ttl=1d
/ip hotspot set [find] concurrent-logins=${config.antiSharing.maxSessions}
/ip firewall filter add chain=forward protocol=udp dst-port=53 action=drop comment="Block External DNS UDP"
/ip firewall filter add chain=forward protocol=tcp dst-port=53 action=drop comment="Block External DNS TCP"
/system logging add topics=hotspot action=memory
/system logging add topics=accounting action=memory
/system identity set name=${safeRouterName}

:local hc [/ip hotspot print count-only]
:if (\$hc > 0) do={
    :log info message="${config.routerId} HOTSPOT ONLINE"
    :put "SUCCESS: ${config.routerId} is now ONLINE"
    :put "Billing: ${billingHost}"
    :put "Status: Ready"
} else={
    :log error message="${config.routerId} Failed"
    :put "ERROR: Hotspot setup failed - check /log print"
}
`;
}

/**
 * Download script as .rsc file
 */
export function downloadScriptFile(config: ProvisioningConfig): void {
  const script = generateImportScript(config);
  
  const content = `# Kingstone WiFi Billing System - Provisioning Script
# Router: ${config.routerName} (${config.routerId})
# Generated: ${new Date().toISOString()}
#
# HOW TO USE:
# 1. In Winbox, go to Files
# 2. Drag this file to Winbox Files window
# 3. In Terminal, run: /system script run admin.rsc
# OR
# 1. Copy entire content
# 2. In Terminal, paste and press Enter

${script}
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin.rsc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate copy-paste friendly version (single-line commands)
 * Compatible with RouterOS 6.x and 7.x import syntax
 */
export function generateMultiLineCommand(config: ProvisioningConfig): string {
  const billingHost = config.billingServerUrl.replace('https://', '').split('/')[0];
  const safeRouterName = config.routerName.replace(/"/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');

  return `# Kingstone WiFi Billing System Setup - ${config.routerId}
# Copy ALL lines below and paste in Winbox Terminal
# Compatible with RouterOS 6.x and 7.x

/interface bridge add name=bridge-hotspot comment="Billing Bridge"
/ip pool add name=${config.addressPool} ranges=10.5.50.2-10.5.50.254
/ip address add address=10.5.50.1/24 interface=bridge-hotspot comment="Hotspot Network"
/ip dhcp-server add address-pool=${config.addressPool} authoritative=after-2sec-delay disabled=no interface=bridge-hotspot lease-time=1h name=hotspot-dhcp
/ip dhcp-server network add address=10.5.50.0/24 dns-server=10.5.50.1 gateway=10.5.50.1
/ip hotspot profile set [find default=yes] dns-name=${config.dnsName} name=hotspot-profile
/ip hotspot add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot name=hotspot1 profile=hotspot-profile
/ip hotspot walled-garden add dst-host=${billingHost} comment="Billing Server"
/ip hotspot walled-garden add dst-host=*${billingHost}* comment="Billing Wildcard"
/ip service set api disabled=no port=${config.apiPort}
/ip service set api-ssl disabled=no port=8729
/ip service set www-ssl disabled=no port=443
/ip hotspot set [find] cookie-ttl=1d idle-timeout=none keepalive-timeout=30s login-by=cookie,http-chap,https
/ip hotspot set [find] concurrent-logins=${config.antiSharing.maxSessions}
/ip firewall filter add chain=forward protocol=udp dst-port=53 action=drop comment="Block External DNS"
/ip firewall filter add chain=forward protocol=tcp dst-port=53 action=drop
/ip firewall connection tracking set enabled=yes
/system logging add topics=hotspot action=memory
/system logging add topics=accounting action=memory
/system identity set name=${safeRouterName}

:local hc [/ip hotspot print count-only]
:if (\$hc > 0) do={
    :log info message="${config.routerId} ONLINE"
    :put ""
    :put "SUCCESS: ${config.routerId} is now ONLINE"
    :put "Billing: ${billingHost}"
    :put "Status: Ready"
    :put ""
    :put "Check Owner Dashboard"
} else={
    :log error message="${config.routerId} Failed"
    :put ""
    :put "ERROR: Setup failed"
    :put "Run: /log print"
    :put ""
}
`;
}

/**
 * Download HOTSPOT script as .rsc file
 */
export function downloadHotspotScript(config: ProvisioningConfig): void {
  const script = generateHotspotScript(config);
  const content = `# Kingstone WiFi Billing System - HOTSPOT Configuration
# Router: ${config.routerName} (${config.routerId})
# Generated: ${new Date().toISOString()}
#
# HOW TO USE:
# 1. In Winbox, go to Files
# 2. Drag this file to Winbox Files window
# 3. In Terminal, run: /system script run admin-hotspot.rsc

${script}
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin-hotspot.rsc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download PPPoE script as .rsc file
 */
export function downloadPPPoEScript(config: ProvisioningConfig): void {
  const script = generatePPPoEScript(config);
  const content = `# Kingstone WiFi Billing System - PPPoE Configuration
# Router: ${config.routerName} (${config.routerId})
# Generated: ${new Date().toISOString()}
#
# HOW TO USE:
# 1. In Winbox, go to Files
# 2. Drag this file to Winbox Files window
# 3. In Terminal, run: /system script run admin-pppoe.rsc

${script}
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin-pppoe.rsc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download COMBINED script as .rsc file
 */
export function downloadCombinedScript(config: ProvisioningConfig): void {
  const script = generateCombinedScript(config);
  const content = `# Kingstone WiFi Billing System - COMBINED Configuration
# Router: ${config.routerName} (${config.routerId})
# Generated: ${new Date().toISOString()}
#
# HOW TO USE:
# 1. In Winbox, go to Files
# 2. Drag this file to Winbox Files window
# 3. In Terminal, run: /system script run admin-combo.rsc

${script}
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin-combo.rsc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default {
  // Script generators
  generateHotspotScript,
  generatePPPoEScript,
  generateCombinedScript,
  // Download functions
  downloadHotspotScript,
  downloadPPPoEScript,
  downloadCombinedScript,
  // Legacy functions
  generateImportScript: generateHotspotScript,
  downloadScriptFile: downloadHotspotScript,
  generateMultiLineCommand
};
