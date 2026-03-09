import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { VisibilityCard } from "@/components/ui/visibility-card";
import { DashboardVisibilitySettings } from "@/hooks/useDashboardVisibility";

interface OwnerChartsProps {
  visibilitySettings: DashboardVisibilitySettings;
  onToggleVisibility: (key: keyof DashboardVisibilitySettings) => void;
}

// Mock data for owner charts
const subscriptionPaymentsData = [
  { month: 'Jan', payments: 15400 },
  { month: 'Feb', payments: 18200 },
  { month: 'Mar', payments: 22100 },
  { month: 'Apr', payments: 19800 },
  { month: 'May', payments: 25300 },
  { month: 'Jun', payments: 28700 },
];

const mikrotikGrowthData = [
  { month: 'Jan', mikrotiks: 5 },
  { month: 'Feb', mikrotiks: 8 },
  { month: 'Mar', mikrotiks: 12 },
  { month: 'Apr', mikrotiks: 15 },
  { month: 'May', mikrotiks: 18 },
  { month: 'Jun', mikrotiks: 22 },
];

const totalRevenueData = [
  { month: 'Jan', revenue: 45200 },
  { month: 'Feb', revenue: 52100 },
  { month: 'Mar', revenue: 68400 },
  { month: 'Apr', revenue: 72300 },
  { month: 'May', revenue: 89500 },
  { month: 'Jun', revenue: 95800 },
];

const adminStatusData = [
  { month: 'Jan', active: 8, inactive: 2 },
  { month: 'Feb', active: 12, inactive: 1 },
  { month: 'Mar', active: 15, inactive: 3 },
  { month: 'Apr', active: 18, inactive: 2 },
  { month: 'May', active: 20, inactive: 1 },
  { month: 'Jun', active: 22, inactive: 2 },
];

export const OwnerCharts = ({ visibilitySettings, onToggleVisibility }: OwnerChartsProps) => {
  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      <VisibilityCard
        title="Admin Subscription Payments"
        value=""
        isVisible={visibilitySettings.subscriptionGraph}
        onToggleVisibility={() => onToggleVisibility('subscriptionGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={subscriptionPaymentsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`KSh ${value}`, 'Payments']} />
            <Bar dataKey="payments" fill="hsl(var(--primary))" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </VisibilityCard>

      <VisibilityCard
        title="Mikrotik Growth Timeline"
        value=""
        isVisible={visibilitySettings.mikrotikStatusGraph}
        onToggleVisibility={() => onToggleVisibility('mikrotikStatusGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mikrotikGrowthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value}`, 'Mikrotiks Added']} />
            <Line 
              type="monotone" 
              dataKey="mikrotiks" 
              stroke="hsl(var(--secondary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--secondary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </VisibilityCard>

      <VisibilityCard
        title="Total Revenue Collected"
        value=""
        isVisible={visibilitySettings.revenueGraph}
        onToggleVisibility={() => onToggleVisibility('revenueGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={totalRevenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`KSh ${value}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </VisibilityCard>

      <VisibilityCard
        title="Admin Activity Status"
        value=""
        isVisible={visibilitySettings.clientsGraph}
        onToggleVisibility={() => onToggleVisibility('clientsGraph')}
        className="md:col-span-1"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={adminStatusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="active" stackId="a" fill="#22c55e" name="Active Admins" />
            <Bar dataKey="inactive" stackId="a" fill="#ef4444" name="Inactive Admins" />
          </BarChart>
        </ResponsiveContainer>
      </VisibilityCard>
    </div>
  );
};