import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Users,
  Wifi,
  RefreshCw,
  Router,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ConnectedUser {
  id: string;
  username: string;
  mac_address: string;
  ip_address: string;
  session_start: string;
  expires_at: string;
  package_name: string | null;
  status: string;
  bytes_in: number;
  bytes_out: number;
}

interface MikrotikStatus {
  id: string;
  name: string;
  router_id: string;
  ip_address: string;
  status: string;
  active_users: number;
  total_earnings: number;
  uptime?: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

const RealTimeMonitor = () => {
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [mikrotikStatus, setMikrotikStatus] = useState<MikrotikStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Debounce refs to prevent rapid successive updates
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingFetchRef = useRef<boolean>(false);

  // Debounced fetch function - limits updates to once every 2 seconds
  const debouncedFetchRealTimeData = useCallback(() => {
    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    // If currently fetching, mark as pending and schedule retry
    if (isLoading) {
      pendingFetchRef.current = true;
      return;
    }

    // Schedule fetch with 2 second debounce
    fetchTimeoutRef.current = setTimeout(() => {
      fetchRealTimeData();
    }, 2000);
  }, [isLoading]);

  // Complete fetch callback to handle pending requests
  const onCompleteFetch = useCallback(() => {
    if (pendingFetchRef.current) {
      pendingFetchRef.current = false;
      debouncedFetchRealTimeData();
    }
  }, [debouncedFetchRealTimeData]);

  useEffect(() => {
    fetchRealTimeData();

    // Set up real-time subscriptions with debouncing to prevent constant reloading
    const usersChannel = supabase
      .channel('connected-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connected_users'
        },
        () => {
          debouncedFetchRealTimeData();
        }
      )
      .subscribe();

    const mikrotiksChannel = supabase
      .channel('mikrotiks-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mikrotiks'
        },
        () => {
          debouncedFetchRealTimeData();
        }
      )
      .subscribe();

    // Auto-refresh every 60 seconds (increased from 30s to reduce load)
    const interval = setInterval(() => {
      fetchRealTimeData();
    }, 60000);

    return () => {
      clearInterval(interval);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(mikrotiksChannel);
    };
  }, []);

  const fetchRealTimeData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchConnectedUsers(),
        fetchMikrotikStatus()
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      toast.error('Failed to fetch real-time data');
    } finally {
      setIsLoading(false);
      // Check if there's a pending fetch request
      onCompleteFetch();
    }
  };

  const fetchConnectedUsers = async () => {
    const { data, error } = await supabase
      .from('connected_users')
      .select('*')
      .eq('status', 'active')
      .order('session_start', { ascending: false });

    if (error) {
      console.error('Error fetching connected users:', error);
      return;
    }

    setConnectedUsers(data || []);
  };

  const fetchMikrotikStatus = async () => {
    const { data, error } = await supabase
      .from('mikrotiks')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching mikrotik status:', error);
      return;
    }

    setMikrotikStatus(data || []);
  };

  const disconnectUser = async (userId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('connected_users')
        .update({ 
          status: 'disconnected',
          session_end: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User ${username} disconnected successfully`);
      fetchConnectedUsers();
    } catch (error) {
      console.error('Error disconnecting user:', error);
      toast.error('Failed to disconnect user');
    }
  };

  const refreshMikrotikStatus = async (mikrotikId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('mikrotik-api', {
        body: {
          action: 'status',
          mikrotikId: mikrotikId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Router status updated');
        fetchMikrotikStatus();
      }
    } catch (error) {
      console.error('Error refreshing router status:', error);
      toast.error('Failed to refresh router status');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const totalActiveUsers = connectedUsers.length;
  const onlineRouters = mikrotikStatus.filter(m => m.status === 'online').length;
  const totalRevenue = mikrotikStatus.reduce((sum, m) => sum + parseFloat(m.total_earnings?.toString() || '0'), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveUsers}</div>
            <p className="text-xs text-muted-foreground">
              Currently connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Routers</CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineRouters}/{mikrotikStatus.length}</div>
            <p className="text-xs text-muted-foreground">
              Network status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              All-time earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastUpdated.toLocaleTimeString()}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchRealTimeData}
              disabled={isLoading}
              className="text-xs p-0 h-auto"
            >
              {isLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Connected Users</TabsTrigger>
          <TabsTrigger value="routers">Router Status</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Connected Users</CardTitle>
              <CardDescription>
                Real-time monitoring of active user sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connectedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Smartphone className="h-8 w-8 mx-auto mb-2" />
                    <p>No active users</p>
                  </div>
                ) : (
                  connectedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user.username}</span>
                          <Badge variant="default">{user.package_name}</Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          <span>IP: {user.ip_address}</span>
                          <span className="mx-2">•</span>
                          <span>MAC: {user.mac_address}</span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          <span>Session: {formatDuration(user.session_start)}</span>
                          <span className="mx-2">•</span>
                          <span>{getTimeRemaining(user.expires_at)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <div className="flex items-center text-green-600">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            {formatBytes(user.bytes_in)}
                          </div>
                          <div className="flex items-center text-blue-600">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {formatBytes(user.bytes_out)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => disconnectUser(user.id, user.username)}
                          className="mt-2"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routers">
          <Card>
            <CardHeader>
              <CardTitle>Router Status</CardTitle>
              <CardDescription>
                Monitor your MikroTik routers in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mikrotikStatus.map((router) => (
                  <div key={router.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Router className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{router.name}</span>
                        <Badge variant={router.status === 'online' ? 'default' : 'destructive'}>
                          {router.status}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span>IP: {router.ip_address}</span>
                        <span className="mx-2">•</span>
                        <span>ID: {router.router_id}</span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span>Active Users: {router.active_users}</span>
                        <span className="mx-2">•</span>
                        <span>Revenue: KSh {parseFloat(router.total_earnings?.toString() || '0').toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refreshMikrotikStatus(router.id)}
                        className="mr-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTimeMonitor;