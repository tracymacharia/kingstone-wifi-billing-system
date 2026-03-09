# ============================================
# Kingstone WiFi Billing System - ADMIN CONFIGURATION
# EXAMPLE FILE - Replace values with yours
# ============================================
# Replace these values BEFORE uploading:
# - billy001 = Your router ID
# - billy = Your router name  
# - billing.invomatic.com = Your billing server
# - billy001.hotspot.local = Your DNS name
# - 8728 = API port
# - StrongPassword123! = YOUR STRONG PASSWORD
# ============================================

/system identity set name="billy"
/ip hotspot profile set [find default=yes] name=hotspot-profile dns-name="billy001.hotspot.local"
/ip hotspot walled-garden add dst-host="billing.invomatic.com" comment="Billing Server" disabled=no
/ip hotspot walled-garden add dst-host="*billing.invomatic.com*" comment="Billing Wildcard" disabled=no
/ip service set api disabled=no port=8728 comment="Billing API"
/ip service set api-ssl disabled=no port=8729 comment="Billing API SSL"
/ip service set www-ssl disabled=no port=443 comment="Billing HTTPS"
/user add name="billing_billy001" group=full password="StrongPassword123!" comment="Billing System API User"
/user add name="hotspot_billy001" group=hotspot password="StrongPassword123!" comment="Hotspot Management User"
/system logging add topics=hotspot action=memory comment="Hotspot Events"
/system logging add topics=accounting action=memory comment="Accounting Events"
/system logging add topics=api action=memory comment="API Access"
/system script add name="export-status" source="/ip hotspot active print detail file=hotspot.txt"
/system scheduler add name="hourly-export" interval=1h on-event="/system script run export-status" start-time=00:00:00

:local hotspotCount [/ip hotspot print count-only]
:local apiEnabled [/ip service get [find name="api"] disabled]
:local walledGardenCount [/ip hotspot walled-garden print count-only]
:if ($hotspotCount > 0 && $apiEnabled = false && $walledGardenCount > 0) do={
    :log info message="billy001 Admin Config OK"
    :put "SUCCESS: Admin Config Applied"
    :put "Router: billy001"
    :put "Billing: billing.invomatic.com"
    :put "API Port: 8728"
    :put "Users: billing_billy001, hotspot_billy001"
    :put "CHANGE PASSWORDS NOW!"
} else={
    :log error message="billy001 Admin Config Failed"
    :put "ERROR: Check /log print"
}
