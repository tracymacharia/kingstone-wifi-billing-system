import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket, Plus, Download, Printer, FileDown, Eye, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface VoucherData {
  id: string;
  voucher_code: string;
  username: string;
  password: string;
  status: 'unused' | 'used' | 'expired';
  expires_at: string;
  used_at?: string;
  used_by_ip?: string;
  phone_number?: string;
  activated_at?: string;
  package: {
    name: string;
    package_type: string;
    duration_type: string;
    duration_value: number;
    price: number;
  };
  created_at: string;
}

interface PackageOption {
  id: string;
  name: string;
  package_type: string;
  duration_type: string;
  duration_value: number;
  price: number;
}

const VoucherManager = () => {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherData | null>(null);
  
  const [formData, setFormData] = useState({
    package_id: '',
    quantity: 1,
    username_prefix: 'USER',
    password_length: 8,
    expires_in_days: 30,
    auto_generate: true
  });

  useEffect(() => {
    loadVouchers();
    loadPackages();
  }, []);

  const loadVouchers = async () => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) return;

      const { data, error } = await supabase
        .from('vouchers')
        .select(`
          *,
          package:package_id (
            name,
            package_type,
            duration_type,
            duration_value,
            price
          )
        `)
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading vouchers:', error);
        return;
      }

      setVouchers((data || []).map(voucher => ({
        ...voucher,
        status: voucher.status as 'unused' | 'used' | 'expired'
      })));
    } catch (error) {
      console.error('Error loading vouchers:', error);
    }
  };

  const loadPackages = async () => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) return;

      const { data, error } = await supabase
        .from('packages')
        .select('id, name, package_type, duration_type, duration_value, price')
        .eq('admin_id', adminId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading packages:', error);
        return;
      }

      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const generateUsername = (prefix: string, index: number) => {
    return `${prefix}${String(index).padStart(3, '0')}`;
  };

  const generatePassword = (length: number) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleCreateVouchers = async () => {
    if (!formData.package_id) {
      toast.error("Please select a package");
      return;
    }

    setLoading(true);
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) {
        toast.error("Admin not authenticated");
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + formData.expires_in_days);

      const vouchersToCreate = [];
      for (let i = 1; i <= formData.quantity; i++) {
        // Generate voucher code
        const { data: codeData } = await supabase.rpc('generate_voucher_code');
        
        vouchersToCreate.push({
          admin_id: adminId,
          package_id: formData.package_id,
          voucher_code: codeData || `VOUCHER${Date.now()}${i}`,
          username: formData.auto_generate ? generateUsername(formData.username_prefix, i) : `${formData.username_prefix}${i}`,
          password: generatePassword(formData.password_length),
          expires_at: expiresAt.toISOString(),
        });
      }

      const { error } = await supabase
        .from('vouchers')
        .insert(vouchersToCreate);

      if (error) {
        console.error('Error creating vouchers:', error);
        toast.error("Failed to create vouchers");
        return;
      }

      toast.success(`${formData.quantity} voucher(s) created successfully!`);
      setShowCreateDialog(false);
      setFormData({
        package_id: '',
        quantity: 1,
        username_prefix: 'USER',
        password_length: 8,
        expires_in_days: 30,
        auto_generate: true
      });
      loadVouchers();
    } catch (error) {
      console.error('Error creating vouchers:', error);
      toast.error("Failed to create vouchers");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Voucher Code', 'Username', 'Password', 'Package', 'Status', 'Expires At', 'Created At'].join(','),
      ...vouchers.map(v => [
        v.voucher_code,
        v.username,
        v.password,
        v.package.name,
        v.status,
        new Date(v.expires_at).toLocaleDateString(),
        new Date(v.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vouchers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Vouchers exported to CSV");
  };

  const handlePrintVouchers = () => {
    const printContent = vouchers.map(v => `
      <div style="border: 1px solid #ccc; padding: 20px; margin: 10px; page-break-inside: avoid; width: 300px; font-family: Arial;">
        <h3>WiFi Voucher</h3>
        <p><strong>Code:</strong> ${v.voucher_code}</p>
        <p><strong>Username:</strong> ${v.username}</p>
        <p><strong>Password:</strong> ${v.password}</p>
        <p><strong>Package:</strong> ${v.package.name}</p>
        <p><strong>Expires:</strong> ${new Date(v.expires_at).toLocaleDateString()}</p>
        <hr>
        <small>Present this voucher to activate your WiFi access</small>
      </div>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>WiFi Vouchers</title></head>
          <body style="margin: 0; padding: 20px;">
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      unused: 'default',
      used: 'secondary',
      expired: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  const filteredVouchers = vouchers.filter(v => {
    const now = new Date();
    const expiresAt = new Date(v.expires_at);
    if (v.status === 'unused' && expiresAt < now) {
      return false; // Hide expired unused vouchers
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Voucher Management</h2>
          <p className="text-muted-foreground">Generate and manage WiFi access vouchers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportCSV} disabled={vouchers.length === 0} className="flex-1 sm:flex-none">
            <FileDown className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button variant="outline" onClick={handlePrintVouchers} disabled={vouchers.length === 0} className="flex-1 sm:flex-none">
            <Printer className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Print All</span>
            <span className="sm:hidden">Print</span>
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Generate Vouchers</span>
            <span className="sm:hidden">Generate</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Voucher History
          </CardTitle>
          <CardDescription>
            Track voucher usage and status ({filteredVouchers.length} vouchers)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredVouchers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Activated At</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-mono">{voucher.voucher_code}</TableCell>
                      <TableCell>{voucher.username}</TableCell>
                      <TableCell>{voucher.package.name}</TableCell>
                      <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                      <TableCell>
                        {voucher.phone_number ? (
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-3 h-3 text-muted-foreground" />
                            <span className="font-mono text-xs">{voucher.phone_number}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {voucher.activated_at ? (
                          new Date(voucher.activated_at).toLocaleDateString()
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{new Date(voucher.expires_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedVoucher(voucher)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No vouchers found</h3>
              <p className="text-muted-foreground mb-4">Generate your first batch of vouchers to get started</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Vouchers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Vouchers Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Vouchers</DialogTitle>
            <DialogDescription>
              Create new WiFi access vouchers with auto-generated credentials
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="package">Package</Label>
              <Select value={formData.package_id} onValueChange={(value) => setFormData({ ...formData, package_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - ${pkg.price} ({pkg.duration_value} {pkg.duration_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Expires In (days)</Label>
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  value={formData.expires_in_days}
                  onChange={(e) => setFormData({ ...formData, expires_in_days: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username-prefix">Username Prefix</Label>
              <Input
                id="username-prefix"
                placeholder="e.g., GUEST, USER, WIFI"
                value={formData.username_prefix}
                onChange={(e) => setFormData({ ...formData, username_prefix: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-length">Password Length</Label>
              <Select 
                value={formData.password_length.toString()} 
                onValueChange={(value) => setFormData({ ...formData, password_length: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 characters</SelectItem>
                  <SelectItem value="8">8 characters</SelectItem>
                  <SelectItem value="10">10 characters</SelectItem>
                  <SelectItem value="12">12 characters</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateVouchers} disabled={loading}>
                {loading ? 'Generating...' : `Generate ${formData.quantity} Voucher(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voucher Details Dialog */}
      <Dialog open={!!selectedVoucher} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Voucher Details</DialogTitle>
          </DialogHeader>

          {selectedVoucher && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Code:</span>
                  <span className="font-mono font-bold">{selectedVoucher.voucher_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Username:</span>
                  <span className="font-mono">{selectedVoucher.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Password:</span>
                  <span className="font-mono">{selectedVoucher.password}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Package:</span>
                  <span>{selectedVoucher.package.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedVoucher.status)}
                </div>
                {selectedVoucher.phone_number && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Phone Number:</span>
                    <span className="font-mono text-xs">{selectedVoucher.phone_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span>{new Date(selectedVoucher.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expires:</span>
                  <span>{new Date(selectedVoucher.expires_at).toLocaleDateString()}</span>
                </div>
                {selectedVoucher.activated_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Activated At:</span>
                    <span>{new Date(selectedVoucher.activated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VoucherManager;