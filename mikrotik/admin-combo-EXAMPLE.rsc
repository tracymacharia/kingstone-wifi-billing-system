# ============================================
# Kingstone WiFi Billing System - COMBINED Configuration
# EXAMPLE FILE - Replace values with yours
# ============================================
# Replace these values BEFORE uploading:
# - billy001 = Your router ID
# - billy = Your router name
# - billing.invomatic.com = Your billing server
# - billy001.hotspot.local = Your DNS name
# - 8728 = API port
# - billy001_pool = Pool name
# - 2 = Max sessions per user
# ============================================

/interface bridge add name=bridge-combo comment="Hotspot Bridge"
/ip pool add name=billy001_pool ranges=10.5.50.2-10.5.50.254
/ip address add address=10.5.50.1/24 interface=bridge-combo comment="Hotspot Gateway"
/ip dhcp-server add address-pool=billy001_pool disabled=no interface=bridge-combo lease-time=1h name=dhcp-hotspot
/ip dhcp-server network add address=10.5.50.0/24 gateway=10.5.50.1 dns-server=10.5.50.1
/ip hotspot profile set [find default=yes] dns-name=billy001.hotspot.local name=hotspot-profile
/ip hotspot add address-pool=billy001_pool disabled=no interface=bridge-combo name=hotspot1 profile=hotspot-profile
/ip hotspot walled-garden add dst-host=billing.invomatic.com comment="Billing Server" disabled=no
/ip hotspot walled-garden add dst-host=*billing.invomatic.com* comment="Billing Wildcard" disabled=no
/ip service set api disabled=no port=8728
/ip service set api-ssl disabled=no port=8729
/ip service set www-ssl disabled=no port=443
/ip hotspot set [find] cookie-ttl=1d
/ip hotspot set [find] concurrent-logins=2
/ip firewall filter add chain=forward protocol=udp dst-port=53 action=drop comment="Block External DNS UDP"
/ip firewall filter add chain=forward protocol=tcp dst-port=53 action=drop comment="Block External DNS TCP"
/system logging add topics=hotspot action=memory
/system logging add topics=accounting action=memory
/system identity set name=billy

:local hc [/ip hotspot print count-only]
:if ($hc > 0) do={
    :log info message="billy001 HOTSPOT ONLINE"
    :put "SUCCESS: billy001 is now ONLINE"
    :put "Billing: billing.invomatic.com"
    :put "Status: Ready"
} else={
    :log error message="billy001 Failed"
    :put "ERROR: Hotspot setup failed - check /log print"
}
