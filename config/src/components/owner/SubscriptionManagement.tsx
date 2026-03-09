import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Calendar, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Admin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  loginUrl: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastReset?: string;
  resetBy?: string;
  mustChangePassword?: boolean;
  subscription_status?: string;
  subscription_type?: string;
  subscription_expires_at?: string;
  earnings_total?: number;
  business_name?: string;
}

interface OwnerSubscriptionSettings {
  id: string;
  owner_id: string;
  hotspot_below_10000: number;
  hotspot_above_10000: number;
  ppoe_static_price: number;
  created_at: string;
  updated_at: string;
}

interface SubscriptionManagementProps {
  admins: Admin[];
  ownerId?: string | null;
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ admins, ownerId: propOwnerId }) => {
  const [settings, setSettings] = useState<OwnerSubscriptionSettings | null>(null);
  const [editing, setEditing] = useState(false);
  const [newSettings, setNewSettings] = useState<OwnerSubscriptionSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Get ownerId from prop, localStorage, or fetch it
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    // Use prop ownerId if available, otherwise use localStorage, otherwise fetch
    if (propOwnerId) {
      console.log('Using prop ownerId:', propOwnerId);
      setOwnerId(propOwnerId);
    } else {
      const storedOwnerId = localStorage.getItem('ownerId');
      if (storedOwnerId) {
        console.log('Using localStorage ownerId:', storedOwnerId);
        setOwnerId(storedOwnerId);
      } else {
        console.log('No ownerId found, fetching...');
        fetchOwnerId();
      }
    }
  }, [propOwnerId]);

  useEffect(() => {
    if (ownerId) {
      fetchSubscriptionSettings();
    }
  }, [ownerId]);

  const fetchOwnerId = async () => {
    try {
      // Get session token
      const sessionToken = sessionStorage.getItem('kingstone_session_token');

      if (!sessionToken) {
        console.error('No session token found');
        setLoading(false);
        return;
      }

      // Use RPC to get owner profile (bypasses RLS)
      const { data, error } = await supabase.rpc('get_owner_profile_by_session', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('Error fetching owner profile via RPC:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const fetchedOwnerId = data[0].owner_id || data[0].profile_id;
        setOwnerId(fetchedOwnerId);
        localStorage.setItem('ownerId', fetchedOwnerId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching owner ID:', error);
      setLoading(false);
    }
  };

  const fetchSubscriptionSettings = async () => {
    if (!ownerId) return;

    try {
      setLoading(true);
      // Force fresh data from database by adding a timestamp header
      const { data, error } = await supabase
        .from('owner_subscription_settings')
        .select('*')
        .eq('owner_id', ownerId)
        .single();

      console.log('Fetched settings:', { data, error });

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error fetching subscription settings:', error);
        console.error('Error code:', error.code, 'Status:', error.status);

        // If table doesn't exist (404) or access denied (406), use defaults
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('Table does not exist, using default settings');
          const defaultSettings = {
            id: '',
            owner_id: ownerId,
            hotspot_below_10000: 500,
            hotspot_above_10000: 1200,
            ppoe_static_price: 2500,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setSettings(defaultSettings);
          setNewSettings({ ...defaultSettings });
          toast.info('Subscription settings table not found. Using defaults.');
        } else if (error.status === 406 || error.status === 403) {
          console.log('Access denied by RLS policy, using default settings');
          const defaultSettings = {
            id: '',
            owner_id: ownerId,
            hotspot_below_10000: 500,
            hotspot_above_10000: 1200,
            ppoe_static_price: 2500,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setSettings(defaultSettings);
          setNewSettings({ ...defaultSettings });
          toast.warning('Unable to load settings. Using defaults. Run database migration to fix.');
        } else {
          toast.error('Failed to fetch subscription settings: ' + error.message);
        }
      } else if (data) {
        console.log('Settings loaded from database:', data);
        setSettings(data);
        setNewSettings({ ...data });
      } else {
        // If no settings exist, create default ones
        const defaultSettings = {
          id: '',
          owner_id: ownerId,
          hotspot_below_10000: 500,
          hotspot_above_10000: 1200,
          ppoe_static_price: 2500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setSettings(defaultSettings);
        setNewSettings({ ...defaultSettings });
      }
    } catch (error: any) {
      console.error('Error in fetchSubscriptionSettings:', error);
      // Use default settings on error
      const defaultSettings = {
        id: '',
        owner_id: ownerId,
        hotspot_below_10000: 500,
        hotspot_above_10000: 1200,
        ppoe_static_price: 2500,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSettings(defaultSettings);
      setNewSettings({ ...defaultSettings });
      toast.info('Using default subscription settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!newSettings || !ownerId) return;

    try {
      console.log('=== SAVE START ===');
      console.log('Current ownerId:', ownerId);
      console.log('Settings before save:', settings);
      console.log('New settings to save:', newSettings);
      
      // Use RPC function to bypass RLS
      const { data, error } = await supabase.rpc('update_owner_subscription_settings', {
        p_owner_id: ownerId,
        p_hotspot_below_10000: newSettings.hotspot_below_10000,
        p_hotspot_above_10000: newSettings.hotspot_above_10000,
        p_ppoe_static_price: newSettings.ppoe_static_price
      });

      console.log('RPC result:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('Saved via RPC:', data[0]);
        toast.success('Subscription settings updated successfully!');
        // Refetch to ensure we have the latest data
        await fetchSubscriptionSettings();
      } else {
        console.warn('RPC returned no data');
        toast.success('Settings updated (local cache)');
        setSettings(newSettings);
      }
      
      setEditing(false);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      // Still update local state even if database fails
      setSettings(newSettings);
      setEditing(false);
      toast.error('Failed to save to database. Settings updated locally.');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'expired':
        return 'destructive';
      case 'suspended':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  // Show loading only while actually fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show message if owner ID could not be fetched
  if (!ownerId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Unable to load subscription settings. Please ensure you are logged in as an owner.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Pricing Settings</CardTitle>
          <CardDescription>
            Set the prices for different subscription types that admins will pay
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="hotspot_below_10000">Hotspot (≤10K earnings)</Label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">KES</span>
                    <Input
                      id="hotspot_below_10000"
                      type="number"
                      value={newSettings?.hotspot_below_10000 || 0}
                      onChange={(e) => 
                        newSettings && setNewSettings({
                          ...newSettings,
                          hotspot_below_10000: parseFloat(e.target.value) || 0
                        })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="hotspot_above_10000">{'Hotspot (>10K earnings)'}</Label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">KES</span>
                    <Input
                      id="hotspot_above_10000"
                      type="number"
                      value={newSettings?.hotspot_above_10000 || 0}
                      onChange={(e) => 
                        newSettings && setNewSettings({
                          ...newSettings,
                          hotspot_above_10000: parseFloat(e.target.value) || 0
                        })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ppoe_static_price">PPPoE Static</Label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">KES</span>
                    <Input
                      id="ppoe_static_price"
                      type="number"
                      value={newSettings?.ppoe_static_price || 0}
                      onChange={(e) => 
                        newSettings && setNewSettings({
                          ...newSettings,
                          ppoe_static_price: parseFloat(e.target.value) || 0
                        })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 pt-4">
                <Button onClick={handleSaveSettings}>Save Changes</Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditing(false);
                    setNewSettings(settings ? { ...settings } : null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center">
                  <Wallet className="w-5 h-5 text-blue-500 mr-2" />
                  <h4 className="font-medium">Hotspot (≤10K earnings)</h4>
                </div>
                <p className="text-2xl font-bold mt-2">{formatCurrency(settings?.hotspot_below_10000 || 0)}</p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                  <h4 className="font-medium">{'Hotspot (>10K earnings)'}</h4>
                </div>
                <p className="text-2xl font-bold mt-2">{formatCurrency(settings?.hotspot_above_10000 || 0)}</p>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-5 h-5 text-purple-500 mr-2 flex items-center justify-center">
                    <div className="w-3 h-3 border border-purple-500 rounded-sm"></div>
                  </div>
                  <h4 className="font-medium">{'PPPoE & Static'}</h4>
                </div>
                <p className="text-2xl font-bold mt-2">{formatCurrency(settings?.ppoe_static_price || 0)}</p>
              </div>
            </div>
          )}
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setEditing(!editing)}
              disabled={!settings}
            >
              <Edit className="w-4 h-4 mr-2" />
              {editing ? 'Cancel Editing' : 'Edit Pricing'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Subscriptions Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Subscriptions Overview</CardTitle>
          <CardDescription>
            View subscription status for all administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subscription Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Expires At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.business_name || admin.name}</TableCell>
                  <TableCell>@{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    {admin.subscription_type ? (
                      <Badge variant="outline" className="capitalize">
                        {admin.subscription_type === 'ppoe_static' ? 'PPPoE & Static' :
                         admin.subscription_type === 'ppoe' ? 'PPPoE' :
                         admin.subscription_type === 'static' ? 'Static' :
                         admin.subscription_type === 'hotspot_pppoe' ? 'Hotspot & PPPoE' :
                         admin.subscription_type === 'hotspot_static' ? 'Hotspot & Static' :
                         admin.subscription_type.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(admin.subscription_status || 'pending')}>
                      {admin.subscription_status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {admin.earnings_total !== undefined ? formatCurrency(admin.earnings_total) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {admin.subscription_expires_at ? (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-muted-foreground" />
                        {formatDate(admin.subscription_expires_at)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subscription Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Statistics</CardTitle>
          <CardDescription>
            Summary of subscription statuses across all admins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">
                {admins.filter(a => a.subscription_status === 'active').length}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">
                {admins.filter(a => a.subscription_status === 'pending').length}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">
                {admins.filter(a => a.subscription_status === 'expired').length}
              </p>
              <p className="text-sm text-muted-foreground">Expired</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">
                {admins.filter(a => a.subscription_status === 'suspended').length}
              </p>
              <p className="text-sm text-muted-foreground">Suspended</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionManagement;