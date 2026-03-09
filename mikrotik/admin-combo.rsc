# ============================================
# Kingstone WiFi Billing System - COMBINED Configuration
# ============================================
# Router: [ROUTER_NAME] ([ROUTER_ID])
# Compatible with RouterOS 6.x and 7.x
#
# HOTSPOT ONLY - PPPoE must be configured separately
#
# TO USE:
# 1. Replace all placeholders below with actual values
# 2. In Winbox: Files > Drag this file to router
# 3. In Terminal: /system script run admin-combo.rsc
# ============================================

/interface bridge add name=bridge-combo comment="Hotspot Bridge"
/ip pool add name=[ADDRESS_POOL] ranges=10.5.50.2-10.5.50.254
/ip address add address=10.5.50.1/24 interface=bridge-combo comment="Hotspot Gateway"
/ip dhcp-server add address-pool=[ADDRESS_POOL] disabled=no interface=bridge-combo lease-time=1h name=dhcp-hotspot
/ip dhcp-server network add address=10.5.50.0/24 gateway=10.5.50.1 dns-server=10.5.50.1
/ip hotspot profile set [find default=yes] dns-name=[DNS_NAME] name=hotspot-profile
/ip hotspot add address-pool=[ADDRESS_POOL] disabled=no interface=bridge-combo name=hotspot1 profile=hotspot-profile
/ip hotspot walled-garden add dst-host=[BILLING_HOST] comment="Billing Server" disabled=no
/ip hotspot walled-garden add dst-host=*[BILLING_HOST]* comment="Billing Wildcard" disabled=no
/ip service set api disabled=no port=[API_PORT]
/ip service set api-ssl disabled=no port=8729
/ip service set www-ssl disabled=no port=443
/ip hotspot set [find] cookie-ttl=1d
/ip hotspot set [find] concurrent-logins=[MAX_SESSIONS]
/ip firewall filter add chain=forward protocol=udp dst-port=53 action=drop comment="Block External DNS UDP"
/ip firewall filter add chain=forward protocol=tcp dst-port=53 action=drop comment="Block External DNS TCP"
/system logging add topics=hotspot action=memory
/system logging add topics=accounting action=memory
/system identity set name=[ROUTER_NAME]

:local hc [/ip hotspot print count-only]
:if ($hc > 0) do={
    :log info message="[ROUTER_ID] HOTSPOT ONLINE"
    :put "SUCCESS: [ROUTER_ID] is now ONLINE"
    :put "Billing: [BILLING_HOST]"
    :put "Status: Ready"
} else={
    :log error message="[ROUTER_ID] Failed"
    :put "ERROR: Hotspot setup failed - check /log print"
}
