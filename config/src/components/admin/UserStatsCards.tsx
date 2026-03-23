import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wifi, Cable, MonitorSpeaker, Clock, UserX, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface UserStats {
  totalActiveUsers: number;
  onlineHotspotUsers: number;
  onlinePPPoEUsers: number;
  onlineStaticUsers: number;
  expiredUsers: number;
  inactiveUsers: number;
}

interface UserStatsCardsProps {
  onCardClick: (filter: string) => void;
}

const UserStatsCards = ({ onCardClick }: UserStatsCardsProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalActiveUsers: 0,
    onlineHotspotUsers: 0,
    onlinePPPoEUsers: 0,
    onlineStaticUsers: 0,
    expiredUsers: 0,
    inactiveUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserStats();
      // Auto-refresh disabled to prevent constant reloading
      // const interval = setInterval(loadUserStats, 30000);
      // return () => clearInterval(interval);
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) return;

      // Get WiFi users stats
      const { data: wifiUsers, error: wifiError } = await supabase
        .from('wifi_users')
        .select('id, is_active, package_expires_at, package_id')
        .eq('admin_id', adminId);

      if (wifiError) {
        console.error('Error loading WiFi users:', wifiError);
        return;
      }

      // Get broadband users (PPPoE/Static)
      const { data: broadbandUsers, error: broadbandError } = await supabase
        .from('broadband_users')
        .select('id, user_type, is_active')
        .eq('admin_id', adminId);

      if (broadbandError) {
        console.error('Error loading broadband users:', broadbandError);
      }

      // Calculate stats
      const now = new Date();
      let totalActive = 0;
      let expired = 0;
      let inactive = 0;

      // Process WiFi users
      wifiUsers?.forEach(user => {
        if (user.is_active && user.package_id) {
          if (user.package_expires_at && new Date(user.package_expires_at) > now) {
            totalActive++;
          } else {
            expired++;
          }
        } else {
          inactive++;
        }
      });

      // Process broadband users
      broadbandUsers?.forEach(user => {
        if (user.is_active) {
          totalActive++;
        } else {
          inactive++;
        }
      });

      const onlineHotspot = wifiUsers?.filter(u =>
        u.is_active && u.package_expires_at && new Date(u.package_expires_at) > now
      ).length || 0;
      const onlinePPPoE = broadbandUsers?.filter(u => u.user_type === 'pppoe' && u.is_active).length || 0;
      const onlineStatic = broadbandUsers?.filter(u => u.user_type === 'static' && u.is_active).length || 0;

      setStats({
        totalActiveUsers: totalActive,
        onlineHotspotUsers: onlineHotspot,
        onlinePPPoEUsers: onlinePPPoE,
        onlineStaticUsers: onlineStatic,
        expiredUsers: expired,
        inactiveUsers: inactive
      });

    } catch (error) {
      console.error('Error loading user stats:', error);
      toast.error('Failed to load user statistics');
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Total Active Users",
      value: stats.totalActiveUsers,
      subtitle: "Currently subscribed",
      icon: <Users className="h-4 w-4" />,
      filter: "active",
      color: "text-blue-600"
    },
    {
      title: "Online Hotspot Users",
      value: stats.onlineHotspotUsers,
      subtitle: "Connected via WiFi",
      icon: <Wifi className="h-4 w-4" />,
      filter: "hotspot-online",
      color: "text-green-600"
    },
    {
      title: "Online PPPoE Users",
      value: stats.onlinePPPoEUsers,
      subtitle: "PPPoE connections",
      icon: <Cable className="h-4 w-4" />,
      filter: "pppoe-online",
      color: "text-purple-600"
    },
    {
      title: "Online Static Users",
      value: stats.onlineStaticUsers,
      subtitle: "Static IP users",
      icon: <MonitorSpeaker className="h-4 w-4" />,
      filter: "static-online",
      color: "text-teal-600"
    },
    {
      title: "Expired Users",
      value: stats.expiredUsers,
      subtitle: "Package expired",
      icon: <Clock className="h-4 w-4" />,
      filter: "expired",
      color: "text-orange-600"
    },
    {
      title: "Inactive Users",
      value: stats.inactiveUsers,
      subtitle: "No active plan",
      icon: <UserX className="h-4 w-4" />,
      filter: "inactive",
      color: "text-red-600"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse min-w-0">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <div className="h-3 sm:h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="h-6 sm:h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-2 sm:h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {statsCards.map((card, index) => (
        <Card
          key={index}
          className="cursor-pointer hover:shadow-md transition-all hover:scale-105 active:scale-95 min-w-0 border-2 hover:border-primary"
          onClick={() => onCardClick(card.filter)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate flex-1 mr-2">
              {card.title}
            </CardTitle>
            <div className={card.color + " flex-shrink-0"}>
              {card.icon}
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold truncate">{card.value}</div>
            <p className="text-xs text-muted-foreground truncate">
              {card.subtitle}
            </p>
            <div className="text-xs text-primary mt-2 font-medium flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Click to view
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserStatsCards;