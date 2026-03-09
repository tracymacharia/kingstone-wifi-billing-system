import { NavLink, useLocation } from "react-router-dom";
import { 
  Users, 
  Router, 
  Settings, 
  LogOut,
  DollarSign,
  Activity,
  CreditCard,
  BarChart3,
  LayoutDashboard,
  Key,
  Mail
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface OwnerSidebarProps {
  onLogout: () => Promise<void>;
}

const menuItems = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard, tab: null },
  { id: "admins", title: "Admin Management", icon: Users, tab: "admins" },
  { id: "mikrotiks", title: "Mikrotik Management", icon: Router, tab: "mikrotiks" },
  { id: "subscriptions", title: "Subscriptions", icon: CreditCard, tab: "subscriptions" },
  { id: "payment-settings", title: "Payment Settings", icon: DollarSign, tab: "payment-settings" },
  { id: "notification-templates", title: "Notification Templates", icon: Mail, tab: "notification-templates" },
  { id: "analytics", title: "Analytics", icon: BarChart3, tab: "analytics" },
  { id: "audit-logs", title: "Activity Logs", icon: Activity, tab: "audit-logs" },
  { id: "password-management", title: "Password Management", icon: Key, tab: "password-management" },
];

export const OwnerSidebar = ({ onLogout }: OwnerSidebarProps) => {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || null;
  const isCollapsed = state === "collapsed";

  const isActive = (tabValue: string | null) => {
    if (tabValue === null) return activeTab === null;
    return activeTab === tabValue;
  };

  const handleNavigation = (tabValue: string | null) => {
    const url = new URL(window.location.href);
    if (tabValue) {
      url.searchParams.set('tab', tabValue);
    } else {
      url.searchParams.delete('tab');
    }
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
    
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 py-4">
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Kingstone</h2>
                  <p className="text-xs text-muted-foreground">Owner Panel</p>
                </div>
              </div>
            )}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => handleNavigation(item.tab)}
                    className={isActive(item.tab) ? "bg-primary/10 text-primary" : ""}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
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