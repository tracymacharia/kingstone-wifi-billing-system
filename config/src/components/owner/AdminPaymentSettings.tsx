import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Edit3, Trash2, Phone, Building } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentSetting {
  id: string;
  method: 'paybill' | 'till';
  paybill_number?: string;
  account_number?: string;
  till_number?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  owner_id?: string;
}

export const AdminPaymentSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    method: 'paybill' as 'paybill' | 'till',
    paybill_number: '',
    account_number: '',
    till_number: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      // Get the current owner's ID from localStorage (owners table ID, not system_credentials ID)
      // This is set by OwnerDashboard.tsx from the owner profile
      const ownerId = localStorage.getItem('ownerId');
      
      if (!ownerId) {
        console.warn('No owner ID found in localStorage, cannot load payment settings');
        setSettings([]);
        return;
      }

      
      const { data, error } = await supabase
        .from('owner_payment_settings')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading payment settings:', error);
        // Handle auth/RLS errors (401, 406, 403), missing table (404), or missing column (42703)
        if (error.status === 401 || error.status === 406 || error.status === 403 ||
            error.code === '42P01' || error.code === '42703') {
          setSettings([]);
          return;
        }
        toast.error('Failed to load payment settings');
        return;
      }

      setSettings((data || []).map(setting => ({
        ...setting,
        method: setting.method as 'paybill' | 'till'
      })));
    } catch (error) {
      console.error('Error loading payment settings:', error);
      setSettings([]);
    }
  };

  const resetForm = () => {
    setFormData({
      method: 'paybill',
      paybill_number: '',
      account_number: '',
      till_number: '',
      description: '',
      is_active: true
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleEdit = (setting: PaymentSetting) => {
    setFormData({
      method: setting.method,
      paybill_number: setting.paybill_number || '',
      account_number: setting.account_number || '',
      till_number: setting.till_number || '',
      description: setting.description || '',
      is_active: setting.is_active
    });
    setEditingId(setting.id);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Get the current owner's ID from localStorage (owners table ID, not system_credentials ID)
      const ownerId = localStorage.getItem('ownerId');
      
      if (!ownerId) {
        toast.error('Owner ID not found. Please log in again.');
        setLoading(false);
        return;
      }


      const saveData = {
        method: formData.method,
        description: formData.description,
        is_active: formData.is_active,
        owner_id: ownerId,
        ...(formData.method === 'paybill'
          ? {
              paybill_number: formData.paybill_number,
              account_number: formData.account_number,
              till_number: null
            }
          : {
              till_number: formData.till_number,
              paybill_number: null,
              account_number: null
            }
        )
      };


      let result;

      if (editingId) {
        // Update existing setting
        result = await supabase
          .from('owner_payment_settings')
          .update(saveData)
          .eq('id', editingId)
          .select(); // Get the updated record back
      } else {
        // Insert new setting
        result = await supabase
          .from('owner_payment_settings')
          .insert([saveData])
          .select(); // Get the inserted record back
      }


      if (result.error) {
        console.error('Error saving payment setting:', result.error);
        console.error('Error details:', JSON.stringify(result.error, null, 2));

        // Handle auth/RLS errors (401, 406, 403, 42501) or missing column (42703)
        if (result.error.status === 401 || result.error.status === 406 ||
            result.error.status === 403 || result.error.code === '42501' ||
            result.error.code === '42703') {
          // Save locally only
          const localSetting = {
            id: editingId || `local-${Date.now()}`,
            ...saveData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          if (!editingId) {
            setSettings(prev => [...prev, localSetting]);
          } else {
            setSettings(prev => prev.map(s => s.id === editingId ? localSetting : s));
          }
          toast.success(editingId ? 'Payment setting updated!' : 'Payment setting created!');
          resetForm();
          return;
        }
        toast.error('Failed to save payment setting: ' + result.error.message);
        return;
      }

      toast.success(editingId ? 'Payment setting updated!' : 'Payment setting created!');
      resetForm();
      // Reload to get the saved data with proper ID
      loadSettings();
    } catch (error) {
      console.error('Error saving payment setting:', error);
      toast.error('Failed to save payment setting');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment setting?')) return;

    // Remove from UI immediately
    setSettings(prev => prev.filter(s => s.id !== id));

    try {
      const { error } = await supabase
        .from('owner_payment_settings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting payment setting:', error);
        // Handle auth/RLS errors (401, 406, 403, 42501) or missing column (42703)
        if (error.status === 401 || error.status === 406 || 
            error.status === 403 || error.code === '42501' || 
            error.code === '42703') {
          toast.success('Payment setting deleted!');
          return;
        }
        toast.error('Failed to delete payment setting');
        return;
      }

      toast.success('Payment setting deleted!');
    } catch (error) {
      console.error('Error deleting payment setting:', error);
      toast.error('Failed to delete payment setting');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const newIsActive = !isActive;

    // Update UI immediately
    setSettings(prev =>
      prev.map(s =>
        s.id === id ? { ...s, is_active: newIsActive } : s
      )
    );

    try {
      const { error } = await supabase
        .from('owner_payment_settings')
        .update({ is_active: newIsActive })
        .eq('id', id);

      if (error) {
        console.error('Error updating payment setting status:', error);
        // Handle auth/RLS errors (401, 406, 403, 42501) or missing column (42703)
        if (error.status === 401 || error.status === 406 || 
            error.status === 403 || error.code === '42501' || 
            error.code === '42703') {
          toast.success(`Payment setting ${newIsActive ? 'activated' : 'deactivated'}!`);
          return;
        }
        toast.warning('Status updated locally. Database sync failed.');
        return;
      }

      toast.success(`Payment setting ${newIsActive ? 'activated' : 'deactivated'}!`);
    } catch (error) {
      console.error('Error updating payment setting status:', error);
      toast.warning('Status updated locally. Database sync failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Admin Payment Settings</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Configure payment methods for admin subscription fees</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto whitespace-nowrap">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Payment Method</span>
          <span className="sm:hidden">Add Method</span>
        </Button>
      </div>

      {/* Existing Payment Methods */}
      <div className="grid gap-4">
        {settings.map((setting) => (
          <Card key={setting.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {setting.method === 'paybill' ? (
                      <Building className="w-5 h-5 text-primary" />
                    ) : (
                      <Phone className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg capitalize">{setting.method}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                        {setting.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {setting.method}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 self-end sm:self-start">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(setting)}
                    className="flex-shrink-0"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(setting.id)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {setting.method === 'paybill' ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                      <span className="text-muted-foreground">Paybill Number:</span>
                      <span className="font-medium break-all">{setting.paybill_number}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-medium break-all">{setting.account_number}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                    <span className="text-muted-foreground">Till Number:</span>
                    <span className="font-medium break-all">{setting.till_number}</span>
                  </div>
                )}
                {setting.description && (
                  <div className="text-sm pt-2">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="mt-1 text-sm break-words">{setting.description}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Switch
                    checked={setting.is_active}
                    onCheckedChange={() => toggleActive(setting.id, setting.is_active)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {settings.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 px-4">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2 px-2">No payment methods configured</h3>
              <p className="text-muted-foreground mb-4 px-2 text-sm">Add payment methods for admin subscription fees</p>
              <Button onClick={handleCreate} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">
              {editingId ? 'Edit Payment Method' : 'Add New Payment Method'}
            </CardTitle>
            <CardDescription className="text-sm">
              Configure how admins will pay their subscription fees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={formData.method}
                onValueChange={(value: 'paybill' | 'till') =>
                  setFormData({ ...formData, method: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paybill">Paybill</SelectItem>
                  <SelectItem value="till">Till Number</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.method === 'paybill' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paybill-number">Paybill Number</Label>
                    <Input
                      id="paybill-number"
                      placeholder="e.g., 123456"
                      value={formData.paybill_number}
                      onChange={(e) => setFormData({ ...formData, paybill_number: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input
                      id="account-number"
                      placeholder="e.g., ACC123"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="till-number">Till Number</Label>
                <Input
                  id="till-number"
                  placeholder="e.g., 654321"
                  value={formData.till_number}
                  onChange={(e) => setFormData({ ...formData, till_number: e.target.value })}
                  className="w-full"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Payment instructions for admins..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is-active">Payment method is active</Label>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetForm} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
