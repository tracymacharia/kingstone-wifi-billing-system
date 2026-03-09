import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus, Edit3, Trash2, Wifi, Clock, Database, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";
import { validatePackage, sanitizeInput } from "@/lib/validators";

interface PackageData {
  id?: string;
  admin_id?: string;
  name: string;
  package_type: 'limited' | 'unlimited' | 'hotspot' | 'pppoe' | 'static';
  duration_type: 'minutes' | 'hours' | 'days' | 'months';
  duration_value: number;
  price: number;
  bandwidth_limit_mb?: number;
  upload_speed_mbps?: number;
  download_speed_mbps?: number;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const EnhancedPackageManager = () => {
  const { user, getAuthUser } = useAuth();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageData | null>(null);
  
  const [formData, setFormData] = useState<PackageData>({
    name: '',
    package_type: 'hotspot',
    duration_type: 'hours',
    duration_value: 1,
    price: 0,
    bandwidth_limit_mb: undefined,
    upload_speed_mbps: 10,
    download_speed_mbps: 10,
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const userId = getAdminIdFromUser(user);
      

      if (!userId) {
        console.error('No admin ID available for loading packages');
        return;
      }

      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('admin_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading packages:', error);
        return;
      }

      setPackages((data || []).map(pkg => ({
        ...pkg,
        package_type: pkg.package_type as 'limited' | 'unlimited' | 'hotspot' | 'pppoe' | 'static',
        duration_type: pkg.duration_type as 'minutes' | 'hours' | 'days' | 'months'
      })));
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      package_type: 'hotspot',
      duration_type: 'hours',
      duration_value: 1,
      price: 0,
      bandwidth_limit_mb: undefined,
      upload_speed_mbps: 10,
      download_speed_mbps: 10,
      description: '',
      is_active: true
    });
    setEditingPackage(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleEdit = (pkg: PackageData) => {
    setFormData({ ...pkg });
    setEditingPackage(pkg);
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const userId = getAdminIdFromUser(user);
      
      
      if (!userId) {
        console.error('PackageManager HandleSave - No admin ID available');
        toast.error("Admin not authenticated");
        return;
      }

      // Validate package data
      const validation = validatePackage({
        name: formData.name,
        price: formData.price,
        duration_value: formData.duration_value,
        download_speed_mbps: formData.download_speed_mbps,
        upload_speed_mbps: formData.upload_speed_mbps,
        bandwidth_limit_mb: formData.bandwidth_limit_mb
      });

      if (!validation.isValid) {
        toast.error(`Validation Error: ${validation.errors.join(', ')}`);
        return;
      }

      // Validate user ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('PackageManager HandleSave - Invalid UUID format:', userId);
        toast.error("Invalid admin ID format");
        return;
      }

      const packageData = {
        name: sanitizeInput(formData.name),
        package_type: formData.package_type,
        duration_type: formData.duration_type,
        duration_value: formData.duration_value,
        price: formData.price,
        admin_id: userId,
        // Only include bandwidth fields for limited packages
        bandwidth_limit_mb: formData.package_type === 'limited' ? formData.bandwidth_limit_mb : null,
        upload_speed_mbps: formData.upload_speed_mbps,
        download_speed_mbps: formData.download_speed_mbps,
        description: formData.description ? sanitizeInput(formData.description) : null,
        is_active: formData.is_active
      };


      let error;
      let result;

      if (editingPackage) {
        // Update existing package
        result = await supabase
          .from('packages')
          .update(packageData)
          .eq('id', editingPackage.id);
        error = result.error;
      } else {
        // Create new package
        result = await supabase
          .from('packages')
          .insert([packageData]);
        error = result.error;
      }


      if (error) {
        console.error('Error saving package:', error);
        toast.error(`Failed to save package: ${error.message}`);
        return;
      }

      toast.success(editingPackage ? "Package updated!" : "Package created!");
      setShowCreateDialog(false);
      resetForm();
      loadPackages();
    } catch (error) {
      console.error('Error saving package - Exception:', error);
      toast.error(`Failed to save package: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;

    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', packageId);

      if (error) {
        console.error('Error deleting package:', error);
        toast.error("Failed to delete package");
        return;
      }

      toast.success("Package deleted!");
      loadPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error("Failed to delete package");
    }
  };

  const getPackageTypeIcon = (type: string) => {
    switch (type) {
      case 'hotspot': return <Wifi className="h-4 w-4" />;
      case 'pppoe': return <Zap className="h-4 w-4" />;
      case 'static': return <Database className="h-4 w-4" />;
      case 'limited': return <Database className="h-4 w-4" />;
      default: return <Wifi className="h-4 w-4" />;
    }
  };

  const getDurationDisplay = (type: string, value: number) => {
    const unit = value === 1 ? type.slice(0, -1) : type;
    return `${value} ${unit}`;
  };

  const getBandwidthDisplay = (limitMb?: number) => {
    if (!limitMb) return 'Unlimited';
    if (limitMb >= 1024) {
      return `${(limitMb / 1024).toFixed(1)} GB`;
    }
    return `${limitMb} MB`;
  };

  const groupedPackages = packages.reduce((acc, pkg) => {
    if (!acc[pkg.duration_type]) {
      acc[pkg.duration_type] = [];
    }
    acc[pkg.duration_type].push(pkg);
    return acc;
  }, {} as Record<string, PackageData[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Package Management</h2>
          <p className="text-muted-foreground">Create and manage WiFi packages with bandwidth controls</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Package
        </Button>
      </div>

      <Tabs defaultValue="hours" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="minutes">Minutes</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="days">Days</TabsTrigger>
          <TabsTrigger value="months">Months</TabsTrigger>
        </TabsList>

        {(['minutes', 'hours', 'days', 'months'] as const).map((durationType) => (
          <TabsContent key={durationType} value={durationType} className="space-y-4">
            {groupedPackages[durationType]?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedPackages[durationType].map((pkg) => (
                  <Card key={pkg.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getPackageTypeIcon(pkg.package_type)}
                          <CardTitle className="text-lg">{pkg.name}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(pkg)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => pkg.id && handleDelete(pkg.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={pkg.package_type === 'limited' ? 'secondary' : 'default'}>
                          {pkg.package_type}
                        </Badge>
                        <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                          {pkg.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Duration</span>
                          <span className="font-medium">{getDurationDisplay(pkg.duration_type, pkg.duration_value)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Price</span>
                          <span className="font-medium">{formatKES(pkg.price)}</span>
                        </div>
                        {pkg.package_type === 'limited' && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Data Limit</span>
                            <span className="font-medium">{getBandwidthDisplay(pkg.bandwidth_limit_mb)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Speed</span>
                          <span className="font-medium">
                            ↓{pkg.download_speed_mbps} / ↑{pkg.upload_speed_mbps} Mbps
                          </span>
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No {durationType} packages</h3>
                <p className="text-muted-foreground mb-4">Create your first {durationType} package to get started</p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Package
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Package Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <DialogHeader>
            <DialogTitle className="pr-8">
              {editingPackage ? 'Edit Package' : 'Create New Package'}
            </DialogTitle>
            <DialogDescription>
              Configure package settings, pricing, and bandwidth limits
            </DialogDescription>
          </DialogHeader>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowCreateDialog(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </button>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Premium 1-Hour"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (KES)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-type">Package Type</Label>
                <Select 
                  value={formData.package_type} 
                  onValueChange={(value: 'limited' | 'unlimited' | 'hotspot' | 'pppoe' | 'static') => 
                    setFormData({ ...formData, package_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotspot">Hotspot</SelectItem>
                    <SelectItem value="pppoe">PPPoE</SelectItem>
                    <SelectItem value="static">Static</SelectItem>
                    <SelectItem value="unlimited">Unlimited (Legacy)</SelectItem>
                    <SelectItem value="limited">Limited (Legacy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration-type">Duration Type</Label>
                <Select 
                  value={formData.duration_type} 
                  onValueChange={(value: 'minutes' | 'hours' | 'days' | 'months') => 
                    setFormData({ ...formData, duration_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration-value">Duration Value</Label>
                <Input
                  id="duration-value"
                  type="number"
                  min="1"
                  value={formData.duration_value}
                  onChange={(e) => setFormData({ ...formData, duration_value: parseInt(e.target.value) || 1 })}
                />
              </div>

              {formData.package_type === 'limited' && (
                <div className="space-y-2">
                  <Label htmlFor="bandwidth-limit">Data Limit (MB)</Label>
                  <Input
                    id="bandwidth-limit"
                    type="number"
                    min="1"
                    placeholder="e.g., 1024 for 1GB"
                    value={formData.bandwidth_limit_mb || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      bandwidth_limit_mb: parseInt(e.target.value) || undefined 
                    })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="download-speed">Download Speed (Mbps)</Label>
                <Input
                  id="download-speed"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.download_speed_mbps}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    download_speed_mbps: parseFloat(e.target.value) || 10 
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-speed">Upload Speed (Mbps)</Label>
                <Input
                  id="upload-speed"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.upload_speed_mbps}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    upload_speed_mbps: parseFloat(e.target.value) || 10 
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Package description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is-active">Package is active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4 pb-2 sticky bottom-0 bg-background border-t pt-4 -mx-6 px-6">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : (editingPackage ? 'Update' : 'Create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedPackageManager;
