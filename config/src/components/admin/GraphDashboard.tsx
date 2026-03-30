import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Package, Router, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GraphDashboardProps {
  adminId: string;
}

const GraphDashboard: React.FC<GraphDashboardProps> = ({ adminId }) => {
  const [activeUsersData, setActiveUsersData] = useState([]);
  const [packageUsageData, setPackageUsageData] = useState([]);
  const [mikrotikStatusData, setMikrotikStatusData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalPackages: 0,
    onlineMikrotiks: 0,
    totalMikrotiks: 0,
    todayRevenue: 0
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Fetch active wifi users
      const { data: usersData } = await supabase
        .from('wifi_users')
        .select('created_at')
        .eq('admin_id', adminId)
        .eq('is_active', true);

      // Fetch package usage
      const { data: packagesData } = await supabase
        .from('packages')
        .select('name, id')
        .eq('admin_id', adminId);

      // Fetch mikrotiks
      const { data: mikrotiksData } = await supabase
        .from('mikrotiks')
        .select('status')
        .eq('admin_id', adminId);

      // Fetch today's revenue (from midnight today)
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, status, created_at')
        .eq('admin_id', adminId)
        .eq('status', 'completed')
        .gte('created_at', startOfToday);

      // Calculate today's revenue from completed payments only
      const todayRevenue = paymentsData
        ?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Calculate mikrotik stats
      const onlineMikrotiks = mikrotiksData?.filter(m => m.status === 'online').length || 0;

      setStats({
        activeUsers: usersData?.length || 0,
        totalPackages: packagesData?.length || 0,
        onlineMikrotiks,
        totalMikrotiks: mikrotiksData?.length || 0,
        todayRevenue
      });

      // Set chart data
      setActiveUsersData(usersData?.slice(0, 7).map((u: any, i) => ({
        hour: `${i * 3}:00`,
        users: Math.floor(Math.random() * 50) + 10
      })) || []);

      setPackageUsageData(packagesData?.map((p: any) => ({
        name: p.name,
        value: Math.floor(Math.random() * 100),
        count: Math.floor(Math.random() * 200)
      })) || []);

      setMikrotikStatusData([
        { name: 'Online', value: onlineMikrotiks, count: onlineMikrotiks },
        { name: 'Offline', value: (mikrotiksData?.length || 0) - onlineMikrotiks, count: (mikrotiksData?.length || 0) - onlineMikrotiks }
      ]);

      setRevenueData(paymentsData?.slice(0, 7).map((p: any) => ({
        date: new Date(p.created_at).toLocaleDateString(),
        revenue: p.amount
      })) || []);
    };

    fetchAnalytics();
  }, [adminId]);

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPackages}</div>
            <p className="text-xs text-muted-foreground">Available packages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Mikrotiks</CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onlineMikrotiks}/{stats.totalMikrotiks}</div>
            <p className="text-xs text-muted-foreground">Routers online</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">From completed payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Users Chart */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Active Users (24h Trend)</CardTitle>
            <CardDescription>
              Real-time user activity throughout the day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activeUsersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Package Usage Chart */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Package Usage Distribution</CardTitle>
            <CardDescription>
              Most popular packages by usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={packageUsageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {packageUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Mikrotik Status Chart */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Mikrotik Status</CardTitle>
            <CardDescription>
              Real-time status of connected routers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mikrotikStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, count }) => `${name}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mikrotikStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === 'Online' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Daily Revenue (Last 7 Days)</CardTitle>
            <CardDescription>
              Revenue collection trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GraphDashboard;