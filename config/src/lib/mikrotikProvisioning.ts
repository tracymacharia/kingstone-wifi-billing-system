/**
 * Mikrotik Provisioning Command Generator
 * Generates Winbox terminal commands for connecting Mikrotik routers to the billing system
 * Supports both API and RADIUS integration for Hotspot and PPPoE authentication
 *
 * @module mikrotikProvisioning
 */

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export type AuthenticationMethod = 'hotspot' | 'pppoe' | 'both';
export type IntegrationType = 'api' | 'radius' | 'api_radius';

export interface ProvisioningConfig {
  routerId: string;
  routerName: string;
  ipAddress: string;
  billingServerUrl: string;
  apiPort: number;
  hotspotInterface: string;
  addressPool: string;
  dnsName: string;
  sslCertificate?: string;
  authentication: AuthenticationConfig;
  radius: RadiusConfig;
  antiSharing: AntiSharingConfig;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize router name for RouterOS compatibility
 * Removes or replaces special characters that could break scripts
 */
function sanitizeRouterName(name: string): string {
  return name.replace(/"/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Sanitize identifier for RouterOS compatibility
 */
function sanitizeIdentifier(id: string): string {
  return id.replace(/"/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

export interface AuthenticationConfig {
  method: AuthenticationMethod;
  integrationType: IntegrationType;
  hotspotEnabled: boolean;
  pppoeEnabled: boolean;
  radiusAccounting: boolean;
  radiusInterimUpdate: number; // seconds
}

export interface RadiusConfig {
  enabled: boolean;
  primaryServer: string;
  primaryPort: number;
  primarySecret: string;
  secondaryServer?: string;
  secondaryPort?: number;
  secondarySecret?: string;
  accountingPort: number;
  timeout: number; // milliseconds
  maxRetries: number;
  nasIdentifier: string;
}

export interface AntiSharingConfig {
  enabled: boolean;
  maxSessions: number;
  blockRouting: boolean;
  blockBridge: boolean;
  blockVpn: boolean;
  arpFilter: boolean;
  dhcpLeaseLimit: number;
  firewallRules: boolean;
}

// ============================================================================
// MAIN PROVISIONING SCRIPT GENERATOR
// ============================================================================

/**
 * Generate complete provisioning script for Mikrotik router
 * Supports Hotspot, PPPoE, or both with API and/or RADIUS integration
 */
export function generateProvisioningScript(config: ProvisioningConfig): string {
  const timestamp = new Date().toISOString();
  const safeRouterName = sanitizeRouterName(config.routerName);
  const safeRouterId = sanitizeIdentifier(config.routerId);

  return `# ============================================
# Kingstone WiFi Billing System - Provisioning Script
# Generated: ${timestamp}
# Router: ${safeRouterName} (${safeRouterId})
# Authentication: ${config.authentication.method.toUpperCase()} | Integration: ${config.authentication.integrationType.toUpperCase()}
# ============================================

# --------------------------------------------
# SECTION 1: SYSTEM CONFIGURATION
# --------------------------------------------

# Set router identity
/system identity
set [find] name="${safeRouterName}"

# Set DNS name for hotspot
/ip dns
set servers=8.8.8.8,8.8.4.4

/ip dns static
add name="${config.dnsName}" address="${config.ipAddress}"

# Set NTP servers for time synchronization (important for RADIUS accounting)
/system ntp client
set enabled=yes primary-ntp=pool.ntp.org secondary-ntp=time.google.com

# --------------------------------------------
# SECTION 2: NETWORK INFRASTRUCTURE
# --------------------------------------------

# Create hotspot interface (if not exists)
/interface bridge
add name=bridge-hotspot comment="Hotspot Bridge"

# Setup IP pool for hotspot clients
/ip pool
add name="${config.addressPool}" ranges=10.5.50.2-10.5.50.254

# Configure hotspot network
/ip address
add address=10.5.50.1/24 interface=bridge-hotspot comment="Hotspot Network"

# Setup DHCP server for hotspot
/ip dhcp-server
add address-pool="${config.addressPool}" authoritative=after-2sec-delay disabled=no interface=bridge-hotspot lease-time=1h name=hotspot-dhcp

/ip dhcp-server network
add address=10.5.50.0/24 dns-server=10.5.50.1 gateway=10.5.50.1 dns-domain="${config.dnsName}"

# --------------------------------------------
# SECTION 3: RADIUS CONFIGURATION
# --------------------------------------------

${generateRadiusCommands(config.radius, config.authentication)}

# --------------------------------------------
# SECTION 4: HOTSPOT CONFIGURATION
# --------------------------------------------

${config.authentication.hotspotEnabled ? generateHotspotCommands(config) : '# Hotspot disabled for this router'}

# --------------------------------------------
# SECTION 5: PPPoE CONFIGURATION
# --------------------------------------------

${config.authentication.pppoeEnabled ? generatePPPoECommands(config) : '# PPPoE disabled for this router'}

# --------------------------------------------
# SECTION 6: ANTI-SHARING CONFIGURATION
# --------------------------------------------

${generateAntiSharingCommands(config.antiSharing, config.authentication)}

# --------------------------------------------
# SECTION 7: API & BILLING SYSTEM INTEGRATION
# --------------------------------------------

${generateAPIIntegrationCommands(config)}

# --------------------------------------------
# SECTION 8: FIREWALL RULES
# --------------------------------------------

${generateFirewallRules(config)}

# --------------------------------------------
# SECTION 9: MONITORING & LOGGING
# --------------------------------------------

# Enable comprehensive logging
/system logging
add topics=hotspot action=memory
add topics=ppp action=memory
add topics=radius action=memory
add topics=accounting action=memory

# Setup SNMP for monitoring (optional)
/snmp community
set [find] name=public addresses=10.5.50.0/24 read-access=yes

# Create monitoring scripts
${generateMonitoringScripts(config)}

# --------------------------------------------
# SECTION 10: BACKUP & MAINTENANCE
# --------------------------------------------

# Create backup script
/system script
add name=backup-config policy=ftp,reboot,read,write,policy,test,password,sniff,sensitive,romon source="/system backup save name=\\\"backup-\\$[/system clock get date]\\\""

# Schedule automatic backup (daily at 2 AM)
/system scheduler
add name=daily-backup interval=1d on-event="/system script run backup-config" start-time=02:00:00

# --------------------------------------------
# VERIFICATION COMMANDS
# --------------------------------------------

# Hotspot verification:
# /ip hotspot print
# /ip hotspot active print
# /ip hotspot user print

# PPPoE verification:
# /ppp profile print
# /ppp secret print
# /interface pppoe-server print

# RADIUS verification:
# /radius print
# /tool radius monitor

# API verification:
# /ip service print

# ============================================
# END OF PROVISIONING SCRIPT
# ============================================
`;
}

// ============================================================================
// RADIUS CONFIGURATION COMMANDS
// ============================================================================

/**
 * Generate RADIUS server configuration commands
 */
function generateRadiusCommands(radius: RadiusConfig, auth: AuthenticationConfig): string {
  if (!radius.enabled) {
    return "# RADIUS integration disabled\n";
  }

  const safeNasIdentifier = sanitizeIdentifier(radius.nasIdentifier);

  let commands = `# Configure RADIUS server for authentication and accounting
/radius
add address=${radius.primaryServer} secret="${radius.primarySecret}" service=hotspot,ppp accounting-port=${radius.accountingPort} auth-port=${radius.primaryPort} timeout=${radius.timeout}ms max-retries=${radius.maxRetries} name=radius-primary comment="Primary RADIUS Server"
${radius.secondaryServer ? `add address=${radius.secondaryServer} secret="${radius.secondarySecret || radius.primarySecret}" service=hotspot,ppp accounting-port=${radius.secondaryPort || radius.accountingPort} auth-port=${radius.secondaryPort || radius.primaryPort} timeout=${radius.timeout}ms max-retries=${radius.maxRetries} name=radius-secondary comment="Secondary RADIUS Server"` : ''}

# Set RADIUS accounting settings
/radius accounting
set interim-update=${auth.radiusInterimUpdate}s accounting-port=${radius.accountingPort}

# Enable RADIUS incoming
/radius incoming
set port=${radius.accountingPort}

# Configure NAS identifier
/radius
set [find] nas-identifier="${safeNasIdentifier}"

# Add RADIUS to authentication order
/user aaa
set accounting=yes interim-update=${auth.radiusInterimUpdate}s

`;

  if (auth.hotspotEnabled) {
    commands += `
# Configure hotspot to use RADIUS
/ip hotspot
set [find] use-radius=yes radius-mac-format=XX:XX:XX:XX:XX:XX

`;
  }

  if (auth.pppoeEnabled) {
    commands += `
# Configure PPPoE to use RADIUS
/ppp aaa
set use-radius=yes accounting=yes interim-update=${auth.radiusInterimUpdate}s

`;
  }

  return commands;
}

// ============================================================================
// HOTSPOT CONFIGURATION COMMANDS
// ============================================================================

/**
 * Generate Hotspot configuration commands
 */
function generateHotspotCommands(config: ProvisioningConfig): string {
  const { radius, authentication } = config;
  const safeDnsName = config.dnsName.replace(/"/g, '');
  const safeCertificate = config.sslCertificate ? config.sslCertificate.replace(/"/g, '') : '';

  let commands = `# Configure hotspot profile
/ip hotspot profile
set [find default=yes] html-directory=flash/hotspot http-proxy=0.0.0.0:0 https-certificate-name="${safeCertificate}" name=hotspot-profile dns-name="${safeDnsName}"

# Create hotspot server
/ip hotspot
add address-pool="${config.addressPool}" disabled=no interface=bridge-hotspot name=hotspot1 profile=hotspot-profile

# Setup walled garden for billing server
/ip hotspot walled-garden
add dst-host="${config.billingServerUrl}" comment="Billing Server"
add dst-host="*${config.billingServerUrl.replace('https://', '').split('/')[0]}*" comment="Billing Server Wildcard"

# Allow billing server in walled garden IP list
/ip hotspot walled-garden ip
add dst-host="${config.billingServerUrl.replace('https://', '').split('/')[0]}" src-address=10.5.50.0/24

# Hotspot authentication settings
/ip hotspot
set [find] address-pool="${config.addressPool}" idle-timeout=none keepalive-timeout=30s login-by=cookie,http-chap,https

`;

  // RADIUS-specific hotspot configuration
  if (radius.enabled && (authentication.integrationType === 'radius' || authentication.integrationType === 'api_radius')) {
    commands += `
# RADIUS authentication for hotspot
/ip hotspot
set [find] use-radius=yes radius-mac-format=XX:XX:XX:XX:XX:XX

# Hotspot RADIUS MAC authentication
/ip hotspot user-profile
add name=radius-authenticated rate-limit=10M/5M transparent-proxy=no

`;
  }

  // API-specific hotspot configuration
  if (authentication.integrationType === 'api' || authentication.integrationType === 'api_radius') {
    commands += `
# API-based hotspot management
/ip hotspot
set [find] cookie-ttl=1d

# HTTP PAP for external authentication
/ip hotspot
set [find] address-pool="${config.addressPool}" idle-timeout=none keepalive-timeout=30s login-by=cookie,http-chap,https

`;
  }

  return commands;
}

// ============================================================================
// PPPoE CONFIGURATION COMMANDS
// ============================================================================

/**
 * Generate PPPoE configuration commands
 */
function generatePPPoECommands(config: ProvisioningConfig): string {
  const { radius, authentication } = config;
  const safeServiceName = sanitizeRouterName(config.routerName).substring(0, 20);

  let commands = `# Configure PPPoE server
/interface pppoe-server
add authentication=chap,mschap1,mschap2 disabled=no interface=bridge-hotspot max-mru=1480 max-mtu=1480 mrru=1600 name=pppoe-server1 ppp-profile=default profile=default service-name=${safeServiceName}-WiFi

# PPPoE IP pool
/ip pool
add name=pppoe-pool ranges=10.5.60.2-10.5.60.254

# PPPoE network configuration
/ip address
add address=10.5.60.1/24 interface=bridge-hotspot comment="PPPoE Network"

# PPPoE AAA settings
/ppp aaa
set accounting=yes interim-update=${authentication.radiusInterimUpdate}s

`;

  // RADIUS-specific PPPoE configuration
  if (radius.enabled && (authentication.integrationType === 'radius' || authentication.integrationType === 'api_radius')) {
    commands += `
# RADIUS authentication for PPPoE
/ppp aaa
set use-radius=yes accounting=yes interim-update=${authentication.radiusInterimUpdate}s

# PPPoE profile with RADIUS
/ppp profile
add name=pppoe-radius-profile local-address=10.5.60.1 rate-limit=10M/5M remote-address=pppoe-pool use-compression=no use-encryption=yes use-vj-compression=no

`;
  }

  // API-specific PPPoE configuration
  if (authentication.integrationType === 'api' || authentication.integrationType === 'api_radius') {
    commands += `
# API-managed PPPoE secrets
/ppp secret
# Secrets will be managed via API from billing system

`;
  }

  return commands;
}

// ============================================================================
// API INTEGRATION COMMANDS
// ============================================================================

/**
 * Generate API integration configuration commands
 */
function generateAPIIntegrationCommands(config: ProvisioningConfig): string {
  const { apiPort, routerId, ipAddress } = config;
  const safeRouterId = sanitizeIdentifier(routerId);

  return `# Setup API access for billing system
/ip service
set www-ssl address=10.5.50.0/24,${ipAddress}/32 disabled=no port=443
set api address=10.5.50.0/24,${ipAddress}/32 disabled=no port=${apiPort}
set api-ssl address=10.5.50.0/24,${ipAddress}/32 disabled=no port=8729

# Create API users for billing system
/user
add name="billing_api_${safeRouterId}" group=full password="[GENERATE_SECURE_PASSWORD]" comment="Billing System API Access - Hotspot and PPPoE"
add name="hotspot_${safeRouterId}" group=hotspot password="[GENERATE_SECURE_PASSWORD]" comment="Hotspot Management"
add name="pppoe_${safeRouterId}" group=read password="[GENERATE_SECURE_PASSWORD]" comment="PPPoE Read Access"

# API rate limiting (prevent abuse)
/user settings
set minimum-password-length=8

# Enable API-SSL for secure communication
/certificate
add name=api-ssl-cert common-name=${safeRouterId} days-valid=365 key-size=2048 key-type=rsa key-usage=key-cert-sign,crl-sign,digital-signature,key-encipherment,name-constraints=critical,permitted;DNS:${safeRouterId} self-signed=yes

# Configure API access log
/system logging action
add name=api-memory memory-lines=1000 target=memory

/system logging
add action=api-memory topics=api,webapi

# IMPORTANT: Replace [GENERATE_SECURE_PASSWORD] with strong passwords before deployment
`;
}

// ============================================================================
// ANTI-SHARING CONFIGURATION COMMANDS
// ============================================================================

/**
 * Generate anti-sharing configuration commands
 */
function generateAntiSharingCommands(config: AntiSharingConfig, auth: AuthenticationConfig): string {
  if (!config.enabled) {
    return "# Anti-sharing features disabled\n";
  }

  let commands = "";

  // Hotspot-specific anti-sharing
  if (auth.hotspotEnabled) {
    commands += `# Limit concurrent sessions per hotspot user
/ip hotspot
set [find] concurrent-logins=${config.maxSessions}

`;
  }

  // PPPoE-specific anti-sharing
  if (auth.pppoeEnabled) {
    commands += `# Limit concurrent PPPoE sessions
/ppp profile
set [find] only-one=yes

`;
  }

  // Block routing protocols
  if (config.blockRouting) {
    commands += `# Block routing protocols to prevent internet sharing
/ip firewall filter
add chain=forward protocol=ospf action=drop comment="Block OSPF"
add chain=forward protocol=rip action=drop comment="Block RIP"
add chain=forward protocol=bgp action=drop comment="Block BGP"
add chain=forward protocol=gre action=drop comment="Block GRE Tunneling"
add chain=forward protocol=ipip action=drop comment="Block IPIP Tunneling"

`;
  }

  // Block bridge traffic
  if (config.blockBridge) {
    commands += `# Block bridge traffic between clients
/interface bridge filter
add chain=forward in-interface=bridge-hotspot out-interface=bridge-hotspot action=drop comment="Block Client-to-Client Bridge"

`;
  }

  // Block VPN protocols
  if (config.blockVpn) {
    commands += `# Block VPN protocols to prevent tethering
/ip firewall filter
add chain=forward protocol=udp dst-port=1194 action=drop comment="Block OpenVPN"
add chain=forward protocol=tcp dst-port=1194 action=drop comment="Block OpenVPN TCP"
add chain=forward protocol=udp dst-port=500 action=drop comment="Block IPSec IKE"
add chain=forward protocol=udp dst-port=4500 action=drop comment="Block IPSec NAT-T"
add chain=forward protocol=udp dst-port=1701 action=drop comment="Block L2TP"
add chain=forward protocol=tcp dst-port=1723 action=drop comment="Block PPTP"

# Create address list for common VPN ports
/ip firewall address-list
add list=vpn_ports address=443 comment="HTTPS (potential VPN)"
add list=vpn_ports address=8443 comment="Alternative HTTPS VPN"
add list=vpn_ports address=1194 comment="OpenVPN"

`;
  }

  // ARP filtering
  if (config.arpFilter) {
    commands += `# Enable ARP filtering to prevent MAC spoofing
/interface bridge settings
set use-ip-firewall=yes

/ip firewall filter
add chain=input in-interface=bridge-hotspot arp op=reply action=accept comment="Allow ARP Reply"
add chain=input in-interface=bridge-hotspot arp op=request action=accept comment="Allow ARP Request"
add chain=input in-interface=bridge-hotspot protocol=arp action=drop comment="Drop Other ARP"

`;
  }

  // DHCP lease limiting
  if (config.dhcpLeaseLimit > 0) {
    commands += `# Limit DHCP leases per MAC address
/ip dhcp-server lease
# Maximum ${config.dhcpLeaseLimit} lease(s) per device - monitoring script below

`;
  }

  // Connection tracking for session monitoring
  commands += `# Enable connection tracking for better session management
/ip firewall connection tracking
set enabled=yes

# Set connection tracking limits
/ip firewall connection tracking
set tcp-established-timeout=1d tcp-fin-wait-timeout=10s tcp-close-wait-timeout=10s
set tcp-last-ack-timeout=10s tcp-time-wait-timeout=10s tcp-close-timeout=10s
set udp-timeout=10s icmp-timeout=10s udp-stream-timeout=1m

`;

  return commands;
}

// ============================================================================
// FIREWALL RULES
// ============================================================================

/**
 * Generate firewall rules for anti-sharing and security
 */
function generateFirewallRules(config: ProvisioningConfig): string {
  const { authentication, radius } = config;

  let commands = `# Block unauthorized DNS (force clients to use router DNS)
/ip firewall filter
add chain=forward protocol=udp dst-port=53 action=drop comment="Block External DNS UDP"
add chain=forward protocol=tcp dst-port=53 action=drop comment="Block External DNS TCP"

`;

  // RADIUS-specific firewall rules
  if (radius.enabled) {
    commands += `# Allow RADIUS traffic
/ip firewall filter
add chain=output protocol=udp dst-port=${radius.primaryPort},${radius.accountingPort} action=accept comment="Allow RADIUS Primary"
${radius.secondaryServer ? `add chain=output protocol=udp dst-port=${radius.secondaryPort || radius.accountingPort} action=accept comment="Allow RADIUS Secondary"` : ''}

`;
  }

  // Hotspot firewall rules
  if (authentication.hotspotEnabled) {
    commands += `# Hotspot connection tracking
/ip firewall filter
add chain=forward connection-mark=no-mark action=mark-connection new-connection-mark=hotspot_conn passthrough=yes comment="Mark hotspot connections"
add chain=forward connection-mark=hotspot_conn connection-nat-state=dstnat action=accept comment="Allow NATed traffic"

# Block multiple NAT detection
add chain=forward protocol=tcp tcp-flags=!syn,ack,fin,rst action=drop comment="Drop invalid TCP flags"

`;
  }

  // PPPoE firewall rules
  if (authentication.pppoeEnabled) {
    commands += `# PPPoE firewall rules
/ip firewall filter
add chain=forward protocol=pppoe action=accept comment="Allow PPPoE traffic"
add chain=input protocol=pppoe action=accept comment="Allow PPPoE to router"

`;
  }

  return commands;
}

// ============================================================================
// MONITORING SCRIPTS
// ============================================================================

/**
 * Generate monitoring and maintenance scripts
 */
function generateMonitoringScripts(config: ProvisioningConfig): string {
  const { authentication, radius } = config;

  let scripts = "";

  // Hotspot monitoring
  if (authentication.hotspotEnabled) {
    scripts += `
# Hotspot active sessions monitor
/system script
add name=hotspot-monitor source={
    :local activeUsers [/ip hotspot active print count-only];
    :local totalUsers [/ip hotspot user print count-only];
    :log info message=("Hotspot Active: " . \$activeUsers . " / Total: " . \$totalUsers);

    # Export to file for billing system
    /file print detail file="hotspot-status.txt";
}
`;
  }

  // PPPoE monitoring
  if (authentication.pppoeEnabled) {
    scripts += `
# PPPoE active sessions monitor
/system script
add name=pppoe-monitor source={
    :local activeSessions [/interface pppoe-server print count-only];
    :local secrets [/ppp secret print count-only];
    :log info message=("PPPoE Active: " . \$activeSessions . " / Secrets: " . \$secrets);
}
`;
  }

  // RADIUS monitoring
  if (radius.enabled) {
    scripts += `
# RADIUS server status monitor
/system script
add name=radius-monitor source={
    :foreach r in=[/radius find] do={
        :local addr [/radius get \$r address];
        :local status [/tool radius monitor numbers=\$r];
        :log info message=("RADIUS Server: " . \$addr . " Status: " . \$status);
    }
}
`;
  }

  // Accounting export script
  scripts += `
# Accounting data export for billing system
/system script
add name=export-accounting source={
    :local timestamp [/system clock get date];

    # Export hotspot accounting
${authentication.hotspotEnabled ? `    /ip hotspot active print detail file=("hotspot-active-" . \$timestamp . ".txt");
    /ip hotspot log print file=("hotspot-log-" . \$timestamp . ".txt");` : '    # Hotspot disabled'}

    # Export PPPoE accounting
${authentication.pppoeEnabled ? `    /ppp active print detail file=("pppoe-active-" . \$timestamp . ".txt");
    /ppp log print file=("pppoe-log-" . \$timestamp . ".txt");` : '    # PPPoE disabled'}

    :log info message="Accounting data exported successfully";
}

# Schedule accounting export (every hour)
/system scheduler
add name=hourly-accounting interval=1h on-event="/system script run export-accounting" start-time=00:00:00
`;

  return scripts;
}

// ============================================================================
// QUICK SETUP COMMANDS
// ============================================================================

/**
 * Generate quick setup commands for Winbox terminal
 */
export function generateQuickSetupCommands(config: ProvisioningConfig): string {
  const { radius, authentication } = config;
  const safeRouterName = sanitizeRouterName(config.routerName);
  const safeRouterId = sanitizeIdentifier(config.routerId);

  return `# Quick Setup - Copy and paste into Winbox Terminal
# Router: ${safeRouterName} (${safeRouterId})
# Authentication: ${config.authentication.method.toUpperCase()} | Integration: ${config.authentication.integrationType.toUpperCase()}

# 1. Basic Network Setup
/interface bridge
add name=bridge-hotspot

/ip pool
add name=${config.addressPool} ranges=10.5.50.2-10.5.50.254

/ip address
add address=10.5.50.1/24 interface=bridge-hotspot

/ip dhcp-server
add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot lease-time=1h

/ip dhcp-server network
add address=10.5.50.0/24 dns-server=10.5.50.1 gateway=10.5.50.1

# 2. RADIUS Configuration (if enabled)
${radius.enabled ? `/radius
add address=${radius.primaryServer} secret="${radius.primarySecret}" service=hotspot,ppp accounting-port=${radius.accountingPort} auth-port=${radius.primaryPort} name=radius-primary

/radius accounting
set interim-update=${authentication.radiusInterimUpdate}s` : '# RADIUS disabled'}

# 3. Hotspot Setup (if enabled)
${authentication.hotspotEnabled ? `/ip hotspot
add address-pool=${config.addressPool} disabled=no interface=bridge-hotspot name=hotspot1

/ip hotspot walled-garden
add dst-host=${config.billingServerUrl}` : '# Hotspot disabled'}

# 4. PPPoE Setup (if enabled)
${authentication.pppoeEnabled ? `/interface pppoe-server
add authentication=chap,mschap1,mschap2 disabled=no interface=bridge-hotspot name=pppoe-server1` : '# PPPoE disabled'}

# 5. Anti-Sharing (Basic)
/ip hotspot
set [find] concurrent-logins=${config.antiSharing.maxSessions}

/ip firewall filter
add chain=forward protocol=udp dst-port=53 action=drop comment="Block External DNS"
add chain=forward protocol=tcp dst-port=53 action=drop

# 6. API Access
/ip service
set api disabled=no port=${config.apiPort}
set www-ssl disabled=no
set api-ssl disabled=no port=8729

# Done! Router is ready for ${config.authentication.method.toUpperCase()} with ${config.authentication.integrationType.toUpperCase()} integration.
`;
}

// ============================================================================
// ANTI-SHARING ONLY COMMANDS
// ============================================================================

/**
 * Generate anti-sharing specific commands
 */
export function generateAntiSharingCommandsOnly(config: AntiSharingConfig, auth: AuthenticationConfig): string {
  if (!config.enabled) {
    return `# Anti-sharing is disabled
# To enable, set enabled: true in configuration
`;
  }

  return `# Anti-Sharing Configuration Commands
# Copy and paste into Winbox Terminal
# Authentication Mode: ${auth.method.toUpperCase()}

# 1. Limit Concurrent Sessions
${auth.hotspotEnabled ? `/ip hotspot
set [find] concurrent-logins=${config.maxSessions}` : '# Hotspot not enabled'}
${auth.pppoeEnabled ? `/ppp profile
set [find] only-one=yes` : '# PPPoE not enabled'}

# 2. Block Routing Protocols
${config.blockRouting ? `/ip firewall filter
add chain=forward protocol=ospf action=drop comment="Block OSPF"
add chain=forward protocol=rip action=drop comment="Block RIP"
add chain=forward protocol=bgp action=drop comment="Block BGP"
add chain=forward protocol=gre action=drop comment="Block GRE"
add chain=forward protocol=ipip action=drop comment="Block IPIP"` : '# Routing block disabled'}

# 3. Block Client-to-Client Communication
${config.blockBridge ? `/interface bridge filter
add chain=forward in-interface=bridge-hotspot out-interface=bridge-hotspot action=drop comment="Block C2C"` : '# Bridge block disabled'}

# 4. Block VPN Protocols
${config.blockVpn ? `/ip firewall filter
add chain=forward protocol=udp dst-port=1194 action=drop comment="Block OpenVPN"
add chain=forward protocol=tcp dst-port=1194 action=drop
add chain=forward protocol=udp dst-port=500 action=drop comment="Block IPSec"
add chain=forward protocol=udp dst-port=4500 action=drop
add chain=forward protocol=udp dst-port=1701 action=drop comment="Block L2TP"
add chain=forward protocol=tcp dst-port=1723 action=drop comment="Block PPTP"` : '# VPN block disabled'}

# 5. Block External DNS (Force Router DNS)
/ip firewall filter
add chain=forward protocol=udp dst-port=53 action=drop comment="Block External DNS UDP"
add chain=forward protocol=tcp dst-port=53 action=drop comment="Block External DNS TCP"

# 6. Connection Tracking
/ip firewall connection tracking
set enabled=yes

# 7. DHCP Lease Monitoring (Hotspot only)
${config.dhcpLeaseLimit > 0 && auth.hotspotEnabled ? `/system script
add name=lease-monitor source={
    :local maxLeases ${config.dhcpLeaseLimit};
    /ip dhcp-server lease print detail;
}` : '# DHCP lease monitoring disabled'}

# Verification Commands:
# /ip hotspot print
# /ip firewall filter print
# /ip hotspot active print
# /ppp active print (if PPPoE enabled)
`;
}

// ============================================================================
// RADIUS-ONLY CONFIGURATION
// ============================================================================

/**
 * Generate RADIUS-only configuration commands
 */
export function generateRadiusOnlyCommands(radius: RadiusConfig, auth: AuthenticationConfig): string {
  if (!radius.enabled) {
    return `# RADIUS is disabled
# To enable, set radius.enabled: true in configuration
`;
  }

  const safeNasIdentifier = sanitizeIdentifier(radius.nasIdentifier);

  return `# RADIUS Configuration Commands
# Copy and paste into Winbox Terminal
# Integration Type: ${auth.integrationType.toUpperCase()}

# 1. Configure Primary RADIUS Server
/radius
add address=${radius.primaryServer} secret="${radius.primarySecret}" service=hotspot,ppp accounting-port=${radius.accountingPort} auth-port=${radius.primaryPort} timeout=${radius.timeout}ms max-retries=${radius.maxRetries} name=radius-primary comment="Primary RADIUS Server"
${radius.secondaryServer ? `add address=${radius.secondaryServer} secret="${radius.secondarySecret || radius.primarySecret}" service=hotspot,ppp accounting-port=${radius.secondaryPort || radius.accountingPort} auth-port=${radius.secondaryPort || radius.primaryPort} timeout=${radius.timeout}ms max-retries=${radius.maxRetries} name=radius-secondary comment="Secondary RADIUS Server"` : ''}

# 2. Configure RADIUS Accounting
/radius accounting
set interim-update=${auth.radiusInterimUpdate}s accounting-port=${radius.accountingPort}

# 3. Enable RADIUS Incoming
/radius incoming
set port=${radius.accountingPort}

# 4. Set NAS Identifier
/radius
set [find] nas-identifier="${safeNasIdentifier}"

# 5. Configure User AAA
/user aaa
set accounting=yes interim-update=${auth.radiusInterimUpdate}s

# 6. Configure for Hotspot (if enabled)
${auth.hotspotEnabled ? `/ip hotspot
set [find] use-radius=yes radius-mac-format=XX:XX:XX:XX:XX:XX` : '# Hotspot not configured'}

# 7. Configure for PPPoE (if enabled)
${auth.pppoeEnabled ? `/ppp aaa
set use-radius=yes accounting=yes interim-update=${auth.radiusInterimUpdate}s` : '# PPPoE not configured'}

# Verification Commands:
# /radius print
# /tool radius monitor
# /radius accounting print
`;
}

// ============================================================================
// DOWNLOAD FUNCTIONS
// ============================================================================

/**
 * Download provisioning script as file
 */
export function downloadProvisioningScript(config: ProvisioningConfig, filename?: string): void {
  const script = generateProvisioningScript(config);
  const blob = new Blob([script], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `provisioning_${config.routerId}_${new Date().toISOString().split('T')[0]}.rsc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download quick setup commands
 */
export function downloadQuickSetup(config: ProvisioningConfig): void {
  const script = generateQuickSetupCommands(config);
  const blob = new Blob([script], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quick_setup_${config.routerId}.rsc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download RADIUS-only configuration
 */
export function downloadRadiusConfig(config: ProvisioningConfig): void {
  const script = generateRadiusOnlyCommands(config.radius, config.authentication);
  const blob = new Blob([script], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `radius_${config.routerId}.rsc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate provisioning configuration
 */
export function validateProvisioningConfig(config: ProvisioningConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.routerId || config.routerId.trim().length === 0) {
    errors.push('Router ID is required');
  }

  if (!config.routerName || config.routerName.trim().length === 0) {
    errors.push('Router name is required');
  }

  if (!config.ipAddress || !isValidIP(config.ipAddress)) {
    errors.push('Valid IP address is required');
  }

  if (!config.billingServerUrl || !config.billingServerUrl.startsWith('http')) {
    errors.push('Valid billing server URL is required');
  }

  if (config.apiPort < 1 || config.apiPort > 65535) {
    errors.push('Valid API port (1-65535) is required');
  }

  if (config.antiSharing.maxSessions < 1 || config.antiSharing.maxSessions > 10) {
    errors.push('Max sessions must be between 1 and 10');
  }

  if (config.antiSharing.dhcpLeaseLimit < 0) {
    errors.push('DHCP lease limit must be non-negative');
  }

  // RADIUS validation
  if (config.radius.enabled) {
    if (!config.radius.primaryServer || !isValidIP(config.radius.primaryServer)) {
      errors.push('Valid RADIUS primary server IP is required');
    }

    if (config.radius.primaryPort < 1 || config.radius.primaryPort > 65535) {
      errors.push('Valid RADIUS auth port (1-65535) is required');
    }

    if (config.radius.accountingPort < 1 || config.radius.accountingPort > 65535) {
      errors.push('Valid RADIUS accounting port (1-65535) is required');
    }

    if (!config.radius.primarySecret || config.radius.primarySecret.length < 8) {
      errors.push('RADIUS secret must be at least 8 characters');
    }

    if (config.authentication.radiusInterimUpdate < 30 || config.authentication.radiusInterimUpdate > 3600) {
      errors.push('RADIUS interim update must be between 30 and 3600 seconds');
    }
  }

  // Authentication method validation
  if (config.authentication.method === 'both') {
    if (!config.authentication.hotspotEnabled || !config.authentication.pppoeEnabled) {
      errors.push('Both Hotspot and PPPoE must be enabled when method is "both"');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Simple IP address validation
 */
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  return ip.split('.').every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default anti-sharing configuration
 */
export const defaultAntiSharingConfig: AntiSharingConfig = {
  enabled: true,
  maxSessions: 2,
  blockRouting: true,
  blockBridge: true,
  blockVpn: true,
  arpFilter: false,
  dhcpLeaseLimit: 1,
  firewallRules: true
};

/**
 * Default RADIUS configuration
 */
export const defaultRadiusConfig: RadiusConfig = {
  enabled: false,
  primaryServer: '192.168.1.100',
  primaryPort: 1812,
  primarySecret: '[RADIUS_SECRET]',
  secondaryServer: undefined,
  secondaryPort: undefined,
  secondarySecret: undefined,
  accountingPort: 1813,
  timeout: 1000,
  maxRetries: 3,
  nasIdentifier: 'MIKROTIK_ROUTER'
};

/**
 * Default authentication configuration
 */
export const defaultAuthenticationConfig: AuthenticationConfig = {
  method: 'hotspot',
  integrationType: 'api_radius',
  hotspotEnabled: true,
  pppoeEnabled: false,
  radiusAccounting: true,
  radiusInterimUpdate: 300
};

/**
 * Create default provisioning config
 */
export function createDefaultConfig(routerId: string, routerName: string, ipAddress: string): ProvisioningConfig {
  return {
    routerId,
    routerName,
    ipAddress,
    billingServerUrl: 'https://billing.Kingstone.com',
    apiPort: 8728,
    hotspotInterface: 'bridge-hotspot',
    addressPool: `${routerId.replace(/\s+/g, '_')}_pool`,
    dnsName: `${routerId}.hotspot.local`,
    sslCertificate: undefined,
    authentication: { ...defaultAuthenticationConfig },
    radius: { ...defaultRadiusConfig },
    antiSharing: { ...defaultAntiSharingConfig }
  };
}
