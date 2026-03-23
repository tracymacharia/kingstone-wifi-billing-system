import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { VisibilityCard } from "@/components/ui/visibility-card";
import { DashboardVisibilitySettings } from "@/hooks/useDashboardVisibility";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/utils";

interface OwnerChartsProps {
  visibilitySettings?: DashboardVisibilitySettings;
  onToggleVisibility?: (key: keyof DashboardVisibilitySettings) => void;
  ownerId?: string | null;
}

interface MonthData { month: string; value: number; }
interface AdminStatusMonth { month: string; active: number; inactive: number; }

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getLastSixMonths(): { label: string; year: number; month: number }[] {
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    result.push({ label: MONTH_LABELS[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
  }
  return result;
}

export const OwnerCharts = ({ visibilitySettings, onToggleVisibility, ownerId }: OwnerChartsProps) => {
  const [adminGrowthData, setAdminGrowthData] = useState<MonthData[]>([]);
  const [mikrotikGrowthData, setMikrotikGrowthData] = useState<MonthData[]>([]);
  const [revenueData, setRevenueData] = useState<MonthData[]>([]);
  const [adminStatusData, setAdminStatusData] = useState<AdminStatusMonth[]>([]);
  const [loading, setLoading] = useState(true);

  // Default visibility settings if not provided
  const defaultVisibility = {
    subscriptionGraph: true,
    mikrotikStatusGraph: true,
    revenueGraph: true,
    adminActivityGraph: true,
  };

  const safeVisibility = visibilitySettings || defaultVisibility;
  const safeToggle = onToggleVisibility || (() => {});

  useEffect(() => {
    loadChartData();
  }, [ownerId]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAdminGrowth(),
        loadMikrotikGrowth(),
        loadRevenueTrend(),
        loadAdminStatus(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminGrowth = async () => {
    const months = getLastSixMonths();
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);

    const query = supabase
      .from('admins')
      .select('created_at')
      .gte('created_at', since.toISOString());

    if (ownerId) {
      query.eq('owner_id', ownerId);
    }

    const { data } = await query;

    const byMonth: Record<string, number> = {};
    months.forEach(m => { byMonth[m.label] = 0; });

    (data || []).forEach(a => {
      const d = new Date(a.created_at);
      const label = MONTH_LABELS[d.getMonth()];
      if (label in byMonth) byMonth[label] += 1;
    });

    setAdminGrowthData(months.map(m => ({ month: m.label, value: byMonth[m.label] })));
  };

  const loadMikrotikGrowth = async () => {
    const months = getLastSixMonths();
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);

    const { data } = await supabase
      .from('mikrotiks')
      .select('created_at')
      .gte('created_at', since.toISOString());

    const byMonth: Record<string, number> = {};
    months.forEach(m => { byMonth[m.label] = 0; });

    (data || []).forEach(mk => {
      const d = new Date(mk.created_at);
      const label = MONTH_LABELS[d.getMonth()];
      if (label in byMonth) byMonth[label] += 1;
    });

    setMikrotikGrowthData(months.map(m => ({ month: m.label, value: byMonth[m.label] })));
  };

  const loadRevenueTrend = async () => {
    const months = getLastSixMonths();
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);

    const { data } = await supabase
      .from('payments')
      .select('amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', since.toISOString());

    const byMonth: Record<string, number> = {};
    months.forEach(m => { byMonth[m.label] = 0; });

    (data || []).forEach(p => {
      const d = new Date(p.created_at);
      const label = MONTH_LABELS[d.getMonth()];
      if (label in byMonth) byMonth[label] += Number(p.amount) || 0;
    });

    setRevenueData(months.map(m => ({ month: m.label, value: byMonth[m.label] })));
  };

  const loadAdminStatus = async () => {
    const months = getLastSixMonths();

    const query = supabase
      .from('admins')
      .select('subscription_status, created_at');

    if (ownerId) {
      query.eq('owner_id', ownerId);
    }

    const { data } = await query;

    const activeSet = new Set<string>();
    const byMonth: Record<string, { active: number; inactive: number }> = {};
    months.forEach(m => { byMonth[m.label] = { active: 0, inactive: 0 }; });

    (data || []).forEach(a => {
      if (a.subscription_status === 'active') activeSet.add(a.created_at);
    });

    let runningActive = 0;
    let runningInactive = 0;
    (data || []).forEach(a => {
      const d = new Date(a.created_at);
      const label = MONTH_LABELS[d.getMonth()];
      if (label in byMonth) {
        if (a.subscription_status === 'active' || a.subscription_status === 'trial') {
          byMonth[label].active += 1;
        } else {
          byMonth[label].inactive += 1;
        }
      }
    });

    setAdminStatusData(months.map(m => ({
      month: m.label,
      active: byMonth[m.label].active,
      inactive: byMonth[m.label].inactive,
    })));
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      <VisibilityCard
        title="New Admins Registered (Monthly)"
        value=""
        isVisible={safeVisibility.subscriptionGraph}
        onToggleVisibility={() => safeToggle('subscriptionGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={adminGrowthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value: number) => [`${value}`, 'New Admins']} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </VisibilityCard>

      <VisibilityCard
        title="Mikrotik Routers Added (Monthly)"
        value=""
        isVisible={safeVisibility.mikrotikStatusGraph}
        onToggleVisibility={() => safeToggle('mikrotikStatusGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mikrotikGrowthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value: number) => [`${value}`, 'Mikrotiks Added']} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--secondary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--secondary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </VisibilityCard>

      <VisibilityCard
        title="Platform Revenue (Monthly)"
        value=""
        isVisible={safeVisibility.revenueGraph}
        onToggleVisibility={() => safeToggle('revenueGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => [formatKES(value), 'Revenue']} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </VisibilityCard>

      <VisibilityCard
        title="Admin Activity This Period"
        value=""
        isVisible={safeVisibility.adminActivityGraph ?? true}
        onToggleVisibility={() => safeToggle('adminActivityGraph' as keyof DashboardVisibilitySettings)}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={adminStatusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="active" name="Active" fill="#22c55e" radius={4} />
            <Bar dataKey="inactive" name="Inactive/Trial" fill="#f59e0b" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </VisibilityCard>
    </div>
  );
};
