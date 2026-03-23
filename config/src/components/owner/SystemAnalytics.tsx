
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Admin {
  id: string;
  name: string;
}

interface Mikrotik {
  id: string;
  status: 'online' | 'offline';
}

interface SystemAnalyticsProps {
  admins: Admin[];
  mikrotiks?: Mikrotik[];
}

const SystemAnalytics = ({ admins, mikrotiks = [] }: SystemAnalyticsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Analytics</CardTitle>
        <CardDescription>
          Real-time system performance and operational insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-primary">Revenue Overview</h4>
            {admins.length > 0 ? (
              admins.map((admin) => (
                <div key={admin.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">{admin.name}</span>
                  <span className="text-sm text-muted-foreground">Connect to view revenue</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No administrators configured</p>
                <p className="text-xs mt-1">Add admins to view revenue analytics</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-secondary">System Status</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                <span className="text-sm">Network Devices</span>
                <span className="font-medium text-primary">{mikrotiks.filter(m => m.status === 'online').length}/{mikrotiks.length}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                <span className="text-sm">Active Admins</span>
                <span className="font-medium text-secondary">{admins.length}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                <span className="text-sm">Platform Status</span>
                <span className="font-medium text-emerald-600">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemAnalytics;
