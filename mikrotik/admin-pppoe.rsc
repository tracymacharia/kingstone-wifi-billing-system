# ============================================
# Kingstone WiFi Billing System - PPPoE Configuration
# ============================================
# Router: [ROUTER_NAME] ([ROUTER_ID])
# Compatible with RouterOS 6.x and 7.x
#
# TO USE:
# 1. Replace all placeholders below with actual values
# 2. In Winbox: Files > Drag this file to router
# 3. In Terminal: /system script run admin-pppoe.rsc
# ============================================

/interface bridge add name=bridge-pppoe comment="PPPoE Bridge"
/ip pool add name=[PPPOE_POOL] ranges=10.5.60.2-10.5.60.254
/ip address add address=10.5.60.1/24 interface=bridge-pppoe comment="PPPoE Gateway"
/interface pppoe-server add authentication=chap,mschap1,mschap2 disabled=no interface=bridge-pppoe name=pppoe-server1 service-name=[ROUTER_NAME]-WiFi
/ppp profile set [find default=yes] local-address=10.5.60.1 remote-address=[PPPOE_POOL] name=default-profile
/ip service set api disabled=no port=[API_PORT]
/ip service set api-ssl disabled=no port=8729
/ip service set www-ssl disabled=no port=443
/ppp aaa set accounting=yes
/ip firewall filter add chain=forward protocol=pppoe action=accept comment="Allow PPPoE Traffic"
/system logging add topics=ppp action=memory
/system logging add topics=accounting action=memory
/system identity set name=[ROUTER_NAME]

:local pc [/interface pppoe-server print count-only]
:if ($pc > 0) do={
    :log info message="[ROUTER_ID] PPPoE ONLINE"
    :put "SUCCESS: [ROUTER_ID] is now ONLINE"
    :put "Status: Ready"
} else={
    :log error message="[ROUTER_ID] Failed"
    :put "ERROR: PPPoE setup failed - check /log print"
}
