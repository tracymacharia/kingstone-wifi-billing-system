/**
 * Mikrotik Admin Configuration Script Generator
 * Creates .rsc script files containing admin/billing system configuration
 * Uses single-line command syntax compatible with RouterOS import
 * Compatible with RouterOS 6.x and 7.x
 */

import type { ProvisioningConfig } from "./mikrotikProvisioning";

/**
 * Generate admin configuration script
 * Stores admin and billing system details on the router
 */
export function generateAdminConfigScript(config: ProvisioningConfig): string {
  const billingHost = config.billingServerUrl.replace('https://', '').split('/')[0];
  const safeRouterName = config.routerName.replace(/"/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeRouterId = config.routerId.replace(/"/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');

  return `# ============================================
# Kingstone WiFi Billing System - Admin Configuration
# ============================================
# Router: ${safeRouterName} (${safeRouterId})
# Generated: ${new Date().toISOString()}
# Compatible with RouterOS 6.x and 7.x
#
# TO USE:
# 1. Download admin-config.rsc file
# 2. Upload to Mikrotik via Winbox Files
# 3. Run: /system script run admin-config.rsc
# ============================================

/system identity set name="${safeRouterName}"
/ip hotspot profile set [find default=yes] name=hotspot-profile dns-name="${config.dnsName}"
/ip hotspot walled-garden add dst-host="${billingHost}" comment="Billing Server" disabled=no
/ip hotspot walled-garden add dst-host="*${billingHost}*" comment="Billing Wildcard" disabled=no
/ip service set api disabled=no port=${config.apiPort} comment="Billing API"
/ip service set api-ssl disabled=no port=8729 comment="Billing API SSL"
/ip service set www-ssl disabled=no port=443 comment="Billing HTTPS"
/user add name="billing_${safeRouterId}" group=full password="Billing@${safeRouterId}2026" comment="Billing System API User"
/user add name="hotspot_${safeRouterId}" group=hotspot password="Hotspot@${safeRouterId}2026" comment="Hotspot Management User"
/system logging add topics=hotspot action=memory comment="Hotspot Events"
/system logging add topics=accounting action=memory comment="Accounting Events"
/system logging add topics=api action=memory comment="API Access"
/system script add name="export-status" source="/ip hotspot active print detail file=hotspot.txt"
/system scheduler add name="hourly-export" interval=1h on-event="/system script run export-status" start-time=00:00:00

:local hotspotCount [/ip hotspot print count-only]
:local apiEnabled [/ip service get [find name="api"] disabled]
:local walledGardenCount [/ip hotspot walled-garden print count-only]

:if (\$hotspotCount > 0 && \$apiEnabled = false && \$walledGardenCount > 0) do={
    :log info message="${safeRouterId} Admin Config Applied Successfully"
    :put ""
    :put "SUCCESS: Admin Configuration Applied"
    :put "Router: ${safeRouterId}"
    :put "Billing: ${billingHost}"
    :put "API Port: ${config.apiPort}"
    :put "Users Created: billing_${safeRouterId}, hotspot_${safeRouterId}"
    :put ""
    :put "IMPORTANT: Change default passwords!"
} else={
    :log error message="${safeRouterId} Admin Config Failed"
    :put ""
    :put "ERROR: Configuration failed"
    :put "Check /log print for details"
    :put ""
}

# SECURITY: Change default API user passwords immediately
# /user set [find name="billing_${safeRouterId}"] password="YourNewStrongPassword!"
# /user set [find name="hotspot_${safeRouterId}"] password="YourNewStrongPassword!"
`;
}

/**
 * Download admin configuration script as .rsc file
 */
export function downloadAdminConfigScript(config: ProvisioningConfig): void {
  const script = generateAdminConfigScript(config);

  const content = `${script}
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin-config.rsc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate admin details summary (for reference)
 */
export function generateAdminDetails(config: ProvisioningConfig): string {
  const billingHost = config.billingServerUrl.replace('https://', '').split('/')[0];

  return `
═══════════════════════════════════════════════════════════
Kingstone WiFi Billing System - ADMIN CONFIGURATION DETAILS
═══════════════════════════════════════════════════════════

Router Information:
  Router Name: ${config.routerName}
  Router ID: ${config.routerId}
  Billing Server: ${billingHost}

Network Configuration:
  Address Pool: ${config.addressPool}
  IP Range: 10.5.50.2-10.5.50.254
  Gateway: 10.5.50.1
  DNS Name: ${config.dnsName}

API Configuration:
  API Port: ${config.apiPort}
  API-SSL Port: 8729
  HTTPS Port: 443

API Users (Change Passwords!):
  Billing API User: billing_${config.routerId}
  Hotspot User: hotspot_${config.routerId}

Walled Garden:
  Billing Server: ${billingHost}
  Wildcard: *${billingHost}*

Logging:
  Hotspot Events: Enabled
  Accounting Events: Enabled
  API Access: Enabled

Scheduled Tasks:
  Hourly Hotspot Export: Enabled

═══════════════════════════════════════════════════════════
SECURITY REMINDERS:
1. Change default API passwords immediately
2. Restrict API access to billing server IP
3. Enable API-SSL for secure communication
4. Review API access logs regularly
5. Keep RouterOS updated
═══════════════════════════════════════════════════════════
`;
}

export default {
  generateAdminConfigScript,
  downloadAdminConfigScript,
  generateAdminDetails
};
