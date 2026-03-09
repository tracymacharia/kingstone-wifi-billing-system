# ============================================
# Kingstone WiFi Billing System - ADMIN CONFIGURATION
# ============================================
# Router: [ROUTER_NAME] ([ROUTER_ID])
# Compatible with RouterOS 6.x and 7.x
#
# TO USE:
# 1. Replace all placeholders below with actual values
# 2. In Winbox: Files > Drag this file to router
# 3. In Terminal: /system script run admin-config.rsc
#
# WARNING: Change default passwords after setup!
# ============================================

/system identity set name="[ROUTER_NAME]"
/ip hotspot profile set [find default=yes] name=hotspot-profile dns-name="[DNS_NAME]"
/ip hotspot walled-garden add dst-host="[BILLING_HOST]" comment="Billing Server" disabled=no
/ip hotspot walled-garden add dst-host="*[BILLING_HOST]*" comment="Billing Wildcard" disabled=no
/ip service set api disabled=no port=[API_PORT] comment="Billing API"
/ip service set api-ssl disabled=no port=8729 comment="Billing API SSL"
/ip service set www-ssl disabled=no port=443 comment="Billing HTTPS"
/user add name="billing_[ROUTER_ID]" group=full password="[ADMIN_PASSWORD]" comment="Billing System API User"
/user add name="hotspot_[ROUTER_ID]" group=hotspot password="[ADMIN_PASSWORD]" comment="Hotspot Management User"
/system logging add topics=hotspot action=memory comment="Hotspot Events"
/system logging add topics=accounting action=memory comment="Accounting Events"
/system logging add topics=api action=memory comment="API Access"
/system script add name="export-status" source="/ip hotspot active print detail file=hotspot.txt"
/system scheduler add name="hourly-export" interval=1h on-event="/system script run export-status" start-time=00:00:00

:local hotspotCount [/ip hotspot print count-only]
:local apiEnabled [/ip service get [find name="api"] disabled]
:local walledGardenCount [/ip hotspot walled-garden print count-only]
:if ($hotspotCount > 0 && $apiEnabled = false && $walledGardenCount > 0) do={
    :log info message="[ROUTER_ID] Admin Config OK"
    :put "SUCCESS: Admin Config Applied"
    :put "Router: [ROUTER_ID]"
    :put "Billing: [BILLING_HOST]"
    :put "API Port: [API_PORT]"
    :put "Users: billing_[ROUTER_ID], hotspot_[ROUTER_ID]"
    :put "CHANGE PASSWORDS NOW!"
} else={
    :log error message="[ROUTER_ID] Admin Config Failed"
    :put "ERROR: Check /log print"
}
