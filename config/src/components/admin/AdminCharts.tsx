import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { VisibilityCard } from "@/components/ui/visibility-card";
import { DashboardVisibilitySettings } from "@/hooks/useDashboardVisibility";

interface AdminChartsProps {
  visibilitySettings: DashboardVisibilitySettings;
  onToggleVisibility: (key: keyof DashboardVisibilitySettings) => void;
}

// Mock data for charts
const revenueData = [
  { day: 'Mon', revenue: 2400 },
  { day: 'Tue', revenue: 1398 },
  { day: 'Wed', revenue: 9800 },
  { day: 'Thu', revenue: 3908 },
  { day: 'Fri', revenue: 4800 },
  { day: 'Sat', revenue: 3800 },
  { day: 'Sun', revenue: 4300 },
];

const clientsData = [
  { day: 'Mon', clients: 12 },
  { day: 'Tue', clients: 8 },
  { day: 'Wed', clients: 15 },
  { day: 'Thu', clients: 20 },
  { day: 'Fri', clients: 25 },
  { day: 'Sat', clients: 18 },
  { day: 'Sun', clients: 14 },
];

const packageUsageData = [
  { name: 'Quick Browse', value: 35, color: 'hsl(var(--primary))' },
  { name: 'Extended Session', value: 25, color: 'hsl(var(--secondary))' },
  { name: 'Day Pass', value: 20, color: 'hsl(var(--accent))' },
  { name: 'Weekend Special', value: 15, color: 'hsl(var(--muted))' },
  { name: 'Monthly Premium', value: 5, color: 'hsl(var(--destructive))' },
];

const mikrotikStatusData = [
  { name: 'Online', value: 8, color: '#22c55e' },
  { name: 'Offline', value: 2, color: '#ef4444' },
];

export const AdminCharts = ({ visibilitySettings, onToggleVisibility }: AdminChartsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <VisibilityCard
        title="Revenue Trend"
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
              <Tooltip formatter={(value) => [`KSh ${value}`, 'Revenue']} />
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
        title="Active Clients"
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
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value}`, 'Active Clients']} />
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
                fill="#8884d8"
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
                fill="#8884d8"
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