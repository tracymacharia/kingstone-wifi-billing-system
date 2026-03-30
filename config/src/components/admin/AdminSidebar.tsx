import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Router,
  Package,
  UserCheck,
  CreditCard,
  Users,
  Settings,
  Activity,
  MessageSquare,
  TrendingUp,
  LogOut,
  LayoutDashboard,
  Wifi,
  Trash2,
  Key,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AdminSidebarProps {
  onLogout: () => Promise<void>;
  businessName: string;
}

const menuItems = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard, tab: null },
  { id: "packages", title: "Enhanced Packages", icon: Package, tab: "packages" },
  { id: "reconnections", title: "Reconnections", icon: RefreshCw, tab: "reconnections" },
  {
    id: "wifi-users",
    title: "WiFi Users",
    icon: UserCheck,
    tab: "wifi-users",
    submenu: [
      { id: "wifi-users-manage", title: "Manage Users", subtab: "manage" },
      { id: "wifi-users-accounts", title: "User Accounts", subtab: "accounts" }
    ]
  },
  { id: "wifi-settings", title: "WiFi Settings", icon: Wifi, tab: "wifi-settings" },
  { id: "business-contact", title: "Business Contact", icon: Users, tab: "business-contact" },
  { id: "payments", title: "Payments", icon: CreditCard, tab: "payments" },
  { id: "users", title: "Connected Users", icon: Users, tab: "users" },
  { id: "mikrotiks", title: "Mikrotik Management", icon: Router, tab: "mikrotiks" },
  { id: "recycle-bin", title: "Recycle Bin", icon: Trash2, tab: "recycle-bin" },
  { id: "sms", title: "SMS", icon: MessageSquare, tab: "sms" },
  { id: "audit-logs", title: "Activity Logs", icon: Activity, tab: "audit-logs" },
  { id: "password-management", title: "Password Manager", icon: Key, tab: "password-management" },
  { id: "settings", title: "Account Settings", icon: Settings, tab: "settings" },
  { id: "analytics", title: "Analytics", icon: BarChart3, tab: "analytics" },
  { id: "monitor", title: "Real-time Monitor", icon: Activity, tab: "monitor" },
  { id: "payment-history", title: "Payment History", icon: CreditCard, tab: "payment-history" },
];

export const AdminSidebar = ({ onLogout, businessName }: AdminSidebarProps) => {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || null;
  const activeSubtab = searchParams.get('subtab') || 'manage';
  const isCollapsed = state === "collapsed";
  const [expandedMenu, setExpandedMenu] = useState<string | null>(activeTab);

  const isActive = (tabValue: string | null) => {
    if (tabValue === null) return activeTab === null;
    return activeTab === tabValue;
  };

  const handleNavigation = (tabValue: string | null, subtabValue?: string, externalRoute?: string) => {
    if (externalRoute) {
      window.location.href = externalRoute;
      return;
    }

    const url = new URL(window.location.href);
    if (tabValue) {
      url.searchParams.set('tab', tabValue);
      if (subtabValue) {
        url.searchParams.set('subtab', subtabValue);
      } else {
        url.searchParams.delete('subtab');
      }
    } else {
      url.searchParams.delete('tab');
      url.searchParams.delete('subtab');
    }
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));

    // Close sidebar on mobile after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const toggleSubmenu = (menuId: string) => {
    setExpandedMenu(expandedMenu === menuId ? null : menuId);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 py-4">
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <Router className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">{businessName}</h2>
                  <p className="text-xs text-muted-foreground">Admin Panel</p>
                </div>
              </div>
            )}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  {item.submenu ? (
                    <>
                      <div className="flex items-center">
                        <SidebarMenuButton
                          onClick={() => {
                            handleNavigation(item.tab, item.submenu[0].subtab);
                            toggleSubmenu(item.id);
                          }}
                          className={isActive(item.tab) ? "bg-accent text-accent-foreground" : ""}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </SidebarMenuButton>
                        {!isCollapsed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubmenu(item.id);
                            }}
                            className="ml-auto p-1 hover:bg-accent rounded"
                          >
                            {expandedMenu === item.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                      {expandedMenu === item.id && !isCollapsed && (
                        <SidebarMenuSub>
                          {item.submenu.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.id}>
                              <SidebarMenuSubButton
                                onClick={() => handleNavigation(item.tab, subItem.subtab)}
                                className={activeSubtab === subItem.subtab ? "bg-accent text-accent-foreground" : ""}
                              >
                                {subItem.title}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </>
                  ) : (
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.tab, undefined, item.route)}
                      className={isActive(item.tab) || (item.route && location.pathname.startsWith(item.route)) ? "bg-accent text-accent-foreground" : ""}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-2">
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start"
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {!isCollapsed && "Logout"}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};