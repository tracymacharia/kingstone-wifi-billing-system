import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wifi, Cable, MonitorSpeaker, Clock, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [stats, setStats] = useState<UserStats>({
    totalActiveUsers: 0,
    onlineHotspotUsers: 0,
    onlinePPPoEUsers: 0,
    onlineStaticUsers: 0,
    expiredUsers: 0,
    inactiveUsers: 0
  });
  const [loading, setLoading] = useState(false); // Set to false to skip loading

  useEffect(() => {
    // Don't load real data - keep all values as zero
    // loadUserStats();
    // Refresh stats every 30 seconds
    // const interval = setInterval(loadUserStats, 30000);
    // return () => clearInterval(interval);
  }, []);

  /*
  const loadUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get WiFi users stats
      const { data: wifiUsers, error: wifiError } = await supabase
        .from('wifi_users')
        .select('id, is_active, package_expires_at, current_package_id')
        .eq('admin_id', user.id);

      if (wifiError) {
        console.error('Error loading WiFi users:', wifiError);
        return;
      }

      // Get connected users (hotspot)
      const { data: connectedUsers, error: connectedError } = await supabase
        .from('connected_users')
        .select('id, status')
        .eq('admin_id', user.id)
        .eq('status', 'active');

      if (connectedError) {
        console.error('Error loading connected users:', connectedError);
      }

      // Get broadband users (PPPoE/Static)
      const { data: broadbandUsers, error: broadbandError } = await supabase
        .from('broadband_users')
        .select('id, user_type, is_active')
        .eq('admin_id', user.id);

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
        if (user.is_active && user.current_package_id) {
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

      const onlineHotspot = connectedUsers?.length || 0;
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
  */

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
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {statsCards.map((card, index) => (
        <Card
          key={index}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onCardClick(card.filter)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <div className={card.color}>
              {card.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserStatsCards;