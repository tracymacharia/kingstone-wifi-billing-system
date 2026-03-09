import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { VisibilityCard } from "@/components/ui/visibility-card";
import { DashboardVisibilitySettings } from "@/hooks/useDashboardVisibility";

interface AdminChartsProps {
  visibilitySettings: DashboardVisibilitySettings;
  onToggleVisibility: (key: keyof DashboardVisibilitySettings) => void;
}

// Zeroed data for charts
const revenueData = [
  { day: 'Mon', revenue: 0 },
  { day: 'Tue', revenue: 0 },
  { day: 'Wed', revenue: 0 },
  { day: 'Thu', revenue: 0 },
  { day: 'Fri', revenue: 0 },
  { day: 'Sat', revenue: 0 },
  { day: 'Sun', revenue: 0 },
];

const clientsData = [
  { day: 'Mon', clients: 0 },
  { day: 'Tue', clients: 0 },
  { day: 'Wed', clients: 0 },
  { day: 'Thu', clients: 0 },
  { day: 'Fri', clients: 0 },
  { day: 'Sat', clients: 0 },
  { day: 'Sun', clients: 0 },
];

const packageUsageData = [
  { name: 'Quick Browse', value: 0, color: 'hsl(var(--primary))' },
  { name: 'Extended Session', value: 0, color: 'hsl(var(--secondary))' },
  { name: 'Day Pass', value: 0, color: 'hsl(var(--accent))' },
  { name: 'Weekend Special', value: 0, color: 'hsl(var(--muted))' },
  { name: 'Monthly Premium', value: 0, color: 'hsl(var(--destructive))' },
];

const mikrotikStatusData = [
  { name: 'Online', value: 0, color: '#22c55e' },
  { name: 'Offline', value: 0, color: '#ef4444' },
];

export const AdminCharts = ({ visibilitySettings, onToggleVisibility }: AdminChartsProps) => {
  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      <VisibilityCard
        title="Revenue Trend"
        value=""
        isVisible={visibilitySettings.revenueGraph}
        onToggleVisibility={() => onToggleVisibility('revenueGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(value) => [`KSh ${value}`, 'Revenue']} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </VisibilityCard>

      <VisibilityCard
        title="Active Clients"
        value=""
        isVisible={visibilitySettings.clientsGraph}
        onToggleVisibility={() => onToggleVisibility('clientsGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={clientsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value}`, 'Active Clients']} />
            <Bar dataKey="clients" fill="hsl(var(--secondary))" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </VisibilityCard>

      <VisibilityCard
        title="Package Usage Distribution"
        value=""
        isVisible={visibilitySettings.packageStatsGraph}
        onToggleVisibility={() => onToggleVisibility('packageStatsGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={packageUsageData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {packageUsageData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value}`, 'Users']} />
          </PieChart>
        </ResponsiveContainer>
      </VisibilityCard>

      <VisibilityCard
        title="Mikrotik Status"
        value=""
        isVisible={visibilitySettings.mikrotikStatusGraph}
        onToggleVisibility={() => onToggleVisibility('mikrotikStatusGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={mikrotikStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {mikrotikStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value}`, 'Routers']} />
          </PieChart>
        </ResponsiveContainer>
      </VisibilityCard>
    </div>
  );
};