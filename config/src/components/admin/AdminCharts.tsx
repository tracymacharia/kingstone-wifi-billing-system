import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VisibilityCard } from "@/components/ui/visibility-card";
import { DashboardVisibilitySettings } from "@/hooks/useDashboardVisibility";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";
import { formatKES } from "@/lib/utils";

interface AdminChartsProps {
  visibilitySettings: DashboardVisibilitySettings;
  onToggleVisibility: (key: keyof DashboardVisibilitySettings) => void;
}

interface DayRevenue { day: string; revenue: number; }
interface DayClients { day: string; clients: number; }
interface PackageUsage { name: string; value: number; color: string; }
interface MikrotikStatus { name: string; value: number; color: string; }

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const AdminCharts = ({ visibilitySettings, onToggleVisibility }: AdminChartsProps) => {
  const { user } = useAuth();
  const [revenueData, setRevenueData] = useState<DayRevenue[]>([]);
  const [clientsData, setClientsData] = useState<DayClients[]>([]);
  const [packageUsageData, setPackageUsageData] = useState<PackageUsage[]>([]);
  const [mikrotikStatusData, setMikrotikStatusData] = useState<MikrotikStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadChartData();
  }, [user]);

  const loadChartData = async () => {
    const adminId = getAdminIdFromUser(user);
    if (!adminId) return;

    setLoading(true);
    try {
      await Promise.all([
        loadRevenueTrend(adminId),
        loadClientsTrend(adminId),
        loadPackageUsage(adminId),
        loadMikrotikStatus(adminId),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueTrend = async (adminId: string) => {
    const since = new Date();
    since.setDate(since.getDate() - 6);

    const { data } = await supabase
      .from('payments')
      .select('amount, created_at')
      .eq('admin_id', adminId)
      .eq('status', 'completed')
      .gte('created_at', since.toISOString());

    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDay[DAY_LABELS[d.getDay()]] = 0;
    }

    (data || []).forEach(p => {
      const label = DAY_LABELS[new Date(p.created_at).getDay()];
      if (label in byDay) byDay[label] += Number(p.amount) || 0;
    });

    setRevenueData(Object.entries(byDay).map(([day, revenue]) => ({ day, revenue })));
  };

  const loadClientsTrend = async (adminId: string) => {
    const since = new Date();
    since.setDate(since.getDate() - 6);

    const { data } = await supabase
      .from('wifi_users')
      .select('created_at, is_active')
      .eq('admin_id', adminId)
      .gte('created_at', since.toISOString());

    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDay[DAY_LABELS[d.getDay()]] = 0;
    }

    (data || []).forEach(u => {
      const label = DAY_LABELS[new Date(u.created_at).getDay()];
      if (label in byDay) byDay[label] += 1;
    });

    setClientsData(Object.entries(byDay).map(([day, clients]) => ({ day, clients })));
  };

  const loadPackageUsage = async (adminId: string) => {
    const { data } = await supabase
      .from('wifi_users')
      .select('current_package_id, packages:current_package_id(name)')
      .eq('admin_id', adminId)
      .eq('is_active', true)
      .not('current_package_id', 'is', null);

    const counts: Record<string, number> = {};
    (data || []).forEach((u: any) => {
      const name = u.packages?.name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });

    const result = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

    setPackageUsageData(result.length > 0 ? result : [{ name: 'No active users', value: 1, color: 'hsl(var(--muted))' }]);
  };

  const loadMikrotikStatus = async (adminId: string) => {
    const { data } = await supabase
      .from('mikrotiks')
      .select('status')
      .eq('admin_id', adminId);

    const online = (data || []).filter(m => m.status === 'online').length;
    const offline = (data || []).filter(m => m.status !== 'online').length;

    setMikrotikStatusData([
      { name: 'Online', value: online || 0, color: '#22c55e' },
      { name: 'Offline', value: offline || 0, color: '#ef4444' },
    ]);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <VisibilityCard
        title="Revenue Trend (Last 7 Days)"
        value=""
        isVisible={visibilitySettings.revenueGraph}
        onToggleVisibility={() => onToggleVisibility('revenueGraph')}
        className="md:col-span-1"
      >
        <div className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [formatKES(value), 'Revenue']} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </VisibilityCard>

      <VisibilityCard
        title="New Clients (Last 7 Days)"
        value=""
        isVisible={visibilitySettings.clientsGraph}
        onToggleVisibility={() => onToggleVisibility('clientsGraph')}
        className="md:col-span-1"
      >
        <div className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clientsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={(value: number) => [`${value}`, 'New Clients']} />
              <Bar dataKey="clients" fill="hsl(var(--secondary))" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </VisibilityCard>

      <VisibilityCard
        title="Package Usage Distribution"
        value=""
        isVisible={visibilitySettings.packageStatsGraph}
        onToggleVisibility={() => onToggleVisibility('packageStatsGraph')}
        className="md:col-span-1"
      >
        <div className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={packageUsageData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {packageUsageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </VisibilityCard>

      <VisibilityCard
        title="Mikrotik Status"
        value=""
        isVisible={visibilitySettings.mikrotikStatusGraph}
        onToggleVisibility={() => onToggleVisibility('mikrotikStatusGraph')}
        className="md:col-span-1"
      >
        <div className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mikrotikStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                dataKey="value"
              >
                {mikrotikStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </VisibilityCard>
    </div>
  );
};
