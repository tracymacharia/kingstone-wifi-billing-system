import { useState } from 'react';
import { Settings, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DashboardVisibilitySettings } from '@/hooks/useDashboardVisibility';

interface DashboardSettingsProps {
  settings: DashboardVisibilitySettings;
  onToggle: (key: keyof DashboardVisibilitySettings) => void;
  onResetDefaults: () => void;
  onHideAll: () => void;
  onShowAll: () => void;
}

const settingsLabels: Record<keyof DashboardVisibilitySettings, string> = {
  revenue: 'Revenue & Earnings',
  activeUsers: 'Active Users',
  activePackages: 'Active Packages',
  mikrotiks: 'Mikrotik Devices',
  systemHealth: 'System Health',
  graphs: 'Analytics Graphs',
  equipmentTracker: 'Equipment Tracker',
  realTimeMonitor: 'Real-time Monitor',
  paymentHistory: 'Payment History',
  revenueGraph: 'Revenue Chart',
  clientsGraph: 'Active Clients Chart',
  packageStatsGraph: 'Package Usage Chart',
  mikrotikStatusGraph: 'Mikrotik Status Chart',
  subscriptionGraph: 'Subscription Trends Chart',
};

export const DashboardSettings = ({ 
  settings, 
  onToggle, 
  onResetDefaults,
  onHideAll,
  onShowAll 
}: DashboardSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Customize Dashboard
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dashboard Visibility</CardTitle>
            <CardDescription>
              Choose which sections to display on your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onShowAll}>
                <Eye className="w-3 h-3 mr-1" />
                Show All
              </Button>
              <Button variant="outline" size="sm" onClick={onHideAll}>
                <EyeOff className="w-3 h-3 mr-1" />
                Hide All
              </Button>
              <Button variant="outline" size="sm" onClick={onResetDefaults}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>

            <Separator />

            {/* Settings Checkboxes */}
            <div className="space-y-3">
              {Object.entries(settingsLabels).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={settings[key as keyof DashboardVisibilitySettings]}
                    onCheckedChange={() => onToggle(key as keyof DashboardVisibilitySettings)}
                    aria-labelledby={`${key}-label`}
                  />
                  <Label 
                    id={`${key}-label`}
                    className="text-sm font-normal cursor-pointer"
                    onClick={() => onToggle(key as keyof DashboardVisibilitySettings)}
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};