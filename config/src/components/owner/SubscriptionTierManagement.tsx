import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Plus, Settings } from "lucide-react";

interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  monthly_fee: number;
  max_revenue_threshold?: number;
  features: any;
}

interface AdminSubscription {
  id: string;
  admin_id: string;
  tier_id: string;
  status: string;
  last_payment_date?: string;
  next_due_date: string;
  grace_period_days: number;
  total_revenue: number;
  subscription_tiers: SubscriptionTier;
}

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface SubscriptionTierManagementProps {
  admins: Admin[];
}

const SubscriptionTierManagement: React.FC<SubscriptionTierManagementProps> = ({ admins }) => {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [adminSubscriptions, setAdminSubscriptions] = useState<AdminSubscription[]>([]);
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [gracePeriod, setGracePeriod] = useState(7);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTiers();
    fetchAdminSubscriptions();
    fetchSystemSettings();
  }, []);

  const fetchTiers = async () => {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('monthly_fee');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch subscription tiers",
        variant: "destructive",
      });
    } else {
      setTiers(data || []);
    }
  };

  const fetchAdminSubscriptions = async () => {
    const { data, error } = await supabase
      .from('admin_subscriptions')
      .select(`
        *,
        subscription_tiers (*)
      `);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch admin subscriptions",
        variant: "destructive",
      });
    } else {
      setAdminSubscriptions(data || []);
    }
    setIsLoading(false);
  };

  const fetchSystemSettings = async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'default_grace_period')
      .single();

    if (data && !error) {
      const settingValue = data.setting_value as any;
      setGracePeriod(settingValue.days || 7);
    }
  };

  const handleUpdateTier = async (tier: SubscriptionTier) => {
    const { error } = await supabase
      .from('subscription_tiers')
      .update({
        name: tier.name,
        description: tier.description,
        monthly_fee: tier.monthly_fee,
        max_revenue_threshold: tier.max_revenue_threshold,
        features: tier.features
      })
      .eq('id', tier.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription tier",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Subscription tier updated successfully",
      });
      fetchTiers();
      setEditingTier(null);
    }
  };

  const handleUpdateGracePeriod = async () => {
    const { error } = await supabase
      .from('system_settings')
      .update({
        setting_value: { days: gracePeriod }
      })
      .eq('setting_key', 'default_grace_period');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update grace period",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Grace period updated successfully",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default", label: "Active" },
      suspended: { variant: "destructive", label: "Suspended" },
      expired: { variant: "secondary", label: "Expired" },
      grace: { variant: "outline", label: "Grace Period" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return <div>Loading subscription management...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Subscription Tiers Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Subscription Tiers
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Subscription Tier</DialogTitle>
                  <DialogDescription>
                    Create a new subscription tier for admins
                  </DialogDescription>
                </DialogHeader>
                {/* Add form for creating new tier */}
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Manage subscription tiers and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {tiers.map((tier) => (
              <div key={tier.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{tier.name}</h4>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                  <p className="text-sm font-medium">{formatCurrency(tier.monthly_fee)}/month</p>
                  {tier.max_revenue_threshold && (
                    <p className="text-xs text-muted-foreground">
                      Max revenue: {formatCurrency(tier.max_revenue_threshold)}
                    </p>
                  )}
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTier(tier)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Subscription Tier</DialogTitle>
                    </DialogHeader>
                    {editingTier && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={editingTier.name}
                            onChange={(e) =>
                              setEditingTier({ ...editingTier, name: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={editingTier.description}
                            onChange={(e) =>
                              setEditingTier({ ...editingTier, description: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="fee">Monthly Fee (KSh)</Label>
                          <Input
                            id="fee"
                            type="number"
                            value={editingTier.monthly_fee}
                            onChange={(e) =>
                              setEditingTier({ ...editingTier, monthly_fee: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="threshold">Max Revenue Threshold (Optional)</Label>
                          <Input
                            id="threshold"
                            type="number"
                            value={editingTier.max_revenue_threshold || ''}
                            onChange={(e) =>
                              setEditingTier({ 
                                ...editingTier, 
                                max_revenue_threshold: e.target.value ? parseFloat(e.target.value) : null 
                              })
                            }
                          />
                        </div>
                        <Button onClick={() => handleUpdateTier(editingTier)}>
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Subscriptions</CardTitle>
          <CardDescription>
            View and manage admin subscription statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Monthly Fee</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminSubscriptions.map((subscription) => {
                const admin = admins.find(a => a.id === subscription.admin_id);
                return (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{admin?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{admin?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{subscription.subscription_tiers.name}</TableCell>
                    <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                    <TableCell>{formatCurrency(subscription.subscription_tiers.monthly_fee)}</TableCell>
                    <TableCell>
                      {new Date(subscription.next_due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{formatCurrency(subscription.total_revenue)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="gracePeriod">Default Grace Period (Days)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="gracePeriod"
                  type="number"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(parseInt(e.target.value))}
                  className="w-32"
                />
                <Button onClick={handleUpdateGracePeriod}>Update</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionTierManagement;