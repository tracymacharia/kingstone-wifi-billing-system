import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Package, Router, TrendingUp } from "lucide-react";

interface GraphDashboardProps {
  adminId: string;
}

const GraphDashboard: React.FC<GraphDashboardProps> = ({ adminId }) => {
  // Mock data - replace with real data from Supabase
  const [activeUsersData, setActiveUsersData] = useState([
    { hour: '00:00', users: 12 },
    { hour: '04:00', users: 8 },
    { hour: '08:00', users: 25 },
    { hour: '12:00', users: 45 },
    { hour: '16:00', users: 38 },
    { hour: '20:00', users: 32 },
    { hour: '24:00', users: 18 }
  ]);

  const [packageUsageData, setPackageUsageData] = useState([
    { name: 'Hourly Basic', value: 35, count: 142 },
    { name: 'Daily Standard', value: 25, count: 98 },
    { name: 'Weekly Premium', value: 20, count: 76 },
    { name: 'Monthly Unlimited', value: 20, count: 84 }
  ]);

  const [mikrotikStatusData, setMikrotikStatusData] = useState([
    { name: 'Online', value: 85, count: 17 },
    { name: 'Offline', value: 15, count: 3 }
  ]);

  const [revenueData, setRevenueData] = useState([
    { date: '2024-01-26', revenue: 1200 },
    { date: '2024-01-27', revenue: 1800 },
    { date: '2024-01-28', revenue: 1600 },
    { date: '2024-01-29', revenue: 2200 },
    { date: '2024-01-30', revenue: 1900 },
    { date: '2024-01-31', revenue: 2400 },
    { date: '2024-02-01', revenue: 2100 }
  ]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  useEffect(() => {
    // Fetch real data from Supabase here
    // This would include calls to get active users, package usage, mikrotik status, and revenue
  }, [adminId]);

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`;

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30 p-6 rounded-2xl">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">
              +12% from last hour
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">400</div>
            <p className="text-xs text-muted-foreground">
              +8% from yesterday
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Mikrotiks</CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">17/20</div>
            <p className="text-xs text-muted-foreground">
              85% uptime
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh 2,100</div>
            <p className="text-xs text-muted-foreground">
              +15% from yesterday
            </p>
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