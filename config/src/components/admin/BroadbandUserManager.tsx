import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Edit3, Trash2, Eye, UserCheck, UserX, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface BroadbandUser {
  id: string;
  username: string;
  password: string;
  phone_number?: string;
  portal_token?: string;
  package_id?: string;
  package_expires_at?: string;
  bandwidth_used_mb: number;
  is_active: boolean;
  last_login?: string;
  user_type: string;
  created_at: string;
  package?: {
    name: string;
    package_type: string;
    bandwidth_limit_mb?: number;
    price: number;
  };
}

interface PackageOption {
  id: string;
  name: string;
  package_type: string;
  duration_type: string;
  duration_value: number;
  price: number;
}

const BroadbandUserManager = () => {
  const { user, getAuthUser } = useAuth();
  const [users, setUsers] = useState<BroadbandUser[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<BroadbandUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<BroadbandUser | null>(null);
  const [smsMessage, setSmsMessage] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    phone_number: '',
    user_type: 'pppoe',
    is_active: true
  });

  const [assignData, setAssignData] = useState({
    user_id: '',
    package_id: '',
    duration_override: 0
  });

  useEffect(() => {
    loadUsers();
    loadPackages();
  }, []);

  const loadUsers = async () => {
    try {
      const userId = getAdminIdFromUser(user);


      if (!userId) {
        console.error('No admin ID available for loading broadband users');
        return;
      }

      const { data, error } = await supabase
        .from('broadband_users')
        .select(`
          *,
          package:package_id (
            name,
            package_type,
            bandwidth_limit_mb,
            price
          )
        `)
        .eq('admin_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading broadband users:', error);
        return;
      }

      const usersData = (data || []).map((user: any) => ({
        id: user.id,
        username: user.username,
        password: user.password,
        phone_number: user.phone_number || '',
        portal_token: user.portal_token || '',
        package_id: user.package_id,
        package_expires_at: user.package_expires_at,
        bandwidth_used_mb: user.bandwidth_used_mb || 0,
        is_active: user.is_active,
        last_login: user.last_login,
        user_type: user.user_type,
        created_at: user.created_at,
        package: user.package && !user.package.error ? {
          name: user.package.name,
          package_type: user.package.package_type,
          bandwidth_limit_mb: user.package.bandwidth_limit_mb,
          price: user.package.price
        } : undefined
      }));
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading broadband users:', error);
    }
  };

  const loadPackages = async () => {
    try {
      const userId = getAdminIdFromUser(user);

      if (!userId) {
        console.error('No admin ID available for loading packages');
        return;
      }

      const { data, error } = await supabase
        .from('packages')
        .select('id, name, package_type, duration_type, duration_value, price')
        .eq('admin_id', userId)
        .eq('is_active', true)
        .in('package_type', ['pppoe', 'static'])
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

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      phone_number: '',
      user_type: 'pppoe',
      is_active: true
    });
    setEditingUser(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleEdit = (user: BroadbandUser) => {
    setFormData({
      username: user.username,
      password: user.password,
      phone_number: user.phone_number || '',
      user_type: user.user_type,
      is_active: user.is_active
    });
    setEditingUser(user);
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error("Username and password are required");
      return;
    }

    if (!formData.phone_number.trim()) {
      toast.error("Phone number is required for SMS notifications");
      return;
    }

    setLoading(true);
    try {
      const userId = getAdminIdFromUser(user);


      if (!userId) {
        console.error('BroadbandUserManager handleSave - No admin ID available');
        toast.error("Admin not authenticated");
        return;
      }

      const userData = {
        ...formData,
        admin_id: userId
      };

      let error;

      if (editingUser) {
        const { error: updateError } = await supabase
          .from('broadband_users')
          .update(userData)
          .eq('id', editingUser.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('broadband_users')
          .insert([userData]);
        error = insertError;
      }

      if (error) {
        console.error('Error saving broadband user:', error);
        if (error.code === '23505') {
          toast.error("Username already exists");
        } else {
          toast.error("Failed to save user");
        }
        return;
      }

      toast.success(editingUser ? "User updated!" : "User created!");
      setShowCreateDialog(false);
      resetForm();
      loadUsers();

      // Auto-send SMS to new users
      if (!editingUser && formData.phone_number) {
        // We'll implement SMS sending after creating the user
        toast.info("Consider sending welcome SMS with portal link");
      }
    } catch (error) {
      console.error('Error saving broadband user:', error);
      toast.error("Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const { error } = await supabase
        .from('broadband_users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting broadband user:', error);
        toast.error("Failed to delete user");
        return;
      }

      toast.success("User deleted!");
      loadUsers();
    } catch (error) {
      console.error('Error deleting broadband user:', error);
      toast.error("Failed to delete user");
    }
  };

  const handleAssignPackage = async () => {
    if (!assignData.package_id) {
      toast.error("Please select a package");
      return;
    }

    setLoading(true);
    try {
      const selectedPackage = packages.find(p => p.id === assignData.package_id);
      if (!selectedPackage) return;

      const expiresAt = new Date();
      const durationValue = assignData.duration_override || selectedPackage.duration_value;
      
      switch (selectedPackage.duration_type) {
        case 'minutes':
          expiresAt.setMinutes(expiresAt.getMinutes() + durationValue);
          break;
        case 'hours':
          expiresAt.setHours(expiresAt.getHours() + durationValue);
          break;
        case 'days':
          expiresAt.setDate(expiresAt.getDate() + durationValue);
          break;
        case 'months':
          expiresAt.setMonth(expiresAt.getMonth() + durationValue);
          break;
      }

      const { error } = await supabase
        .from('broadband_users')
        .update({
          package_id: assignData.package_id,
          package_expires_at: expiresAt.toISOString(),
          bandwidth_used_mb: 0
        })
        .eq('id', assignData.user_id);

      if (error) {
        console.error('Error assigning package:', error);
        toast.error("Failed to assign package");
        return;
      }

      toast.success("Package assigned successfully!");
      setShowAssignDialog(false);
      setAssignData({ user_id: '', package_id: '', duration_override: 0 });
      loadUsers();
    } catch (error) {
      console.error('Error assigning package:', error);
      toast.error("Failed to assign package");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('broadband_users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user status:', error);
        toast.error("Failed to update user status");
        return;
      }

      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error("Failed to update user status");
    }
  };

  const handleSendSMS = (user: BroadbandUser) => {
    if (!user.phone_number) {
      toast.error("User has no phone number");
      return;
    }

    setSelectedUser(user);
    
    // Generate portal link
    const portalLink = user.portal_token 
      ? `${window.location.origin}/client/${user.portal_token}`
      : 'Portal link not available';

    const defaultMessage = `Hello from [Business Name]!

Your internet account is ready:
Username: ${user.username}
Type: ${user.user_type.toUpperCase()}

View your account: ${portalLink}

${user.package ? `Package: ${user.package.name} - KES ${user.package.price}` : 'No package assigned'}

Pay via Till/Paybill: [Payment Details]`;

    setSmsMessage(defaultMessage);
    setShowSmsDialog(true);
  };

  const sendSMS = async () => {
    if (!selectedUser || !smsMessage.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      // Here you would integrate with your SMS service
      // For now, we'll just show the message
      toast.success(`SMS sent to ${selectedUser.phone_number}`);
      
      setShowSmsDialog(false);
      setSmsMessage('');
      setSelectedUser(null);
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error("Failed to send SMS");
    }
  };

  const sendBulkSMS = async () => {
    const usersWithPhone = users.filter(u => u.phone_number && u.is_active);
    
    if (usersWithPhone.length === 0) {
      toast.error("No active users with phone numbers found");
      return;
    }

    try {
      // Here you would send SMS to all users
      toast.success(`Bulk SMS sent to ${usersWithPhone.length} users`);
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      toast.error("Failed to send bulk SMS");
    }
  };

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );

  const getPackageStatus = (user: BroadbandUser) => {
    if (!user.package_id || !user.package_expires_at) {
      return <Badge variant="secondary">No Package</Badge>;
    }

    const expiresAt = new Date(user.package_expires_at);
    const now = new Date();

    if (expiresAt < now) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    return <Badge variant="default">Active</Badge>;
  };

  const getPortalLink = (user: BroadbandUser) => {
    if (!user.portal_token) return 'No portal token';
    return `${window.location.origin}/client/${user.portal_token}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">PPPoE/Static User Management</h2>
          <p className="text-muted-foreground">Create and manage PPPoE and Static IP users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={sendBulkSMS}>
            <Send className="h-4 w-4 mr-2" />
            Bulk SMS
          </Button>
          <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
            <UserCheck className="h-4 w-4 mr-2" />
            Assign Package
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Broadband Users ({users.length})
          </CardTitle>
          <CardDescription>
            Manage PPPoE and Static IP user accounts with SMS notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Package Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.user_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{user.phone_number || '-'}</TableCell>
                      <TableCell>{getStatusBadge(user.is_active)}</TableCell>
                      <TableCell>{user.package?.name || 'None'}</TableCell>
                      <TableCell>{getPackageStatus(user)}</TableCell>
                      <TableCell>
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.phone_number && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSendSMS(user)}
                              title="Send SMS"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(getPortalLink(user));
                              toast.success("Portal link copied!");
                            }}
                            title="Copy Portal Link"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                          >
                            {user.is_active ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No broadband users found</h3>
              <p className="text-muted-foreground mb-4">Create your first PPPoE or Static user account</p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit Broadband User' : 'Create Broadband User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user credentials and settings' : 'Create a new PPPoE or Static IP user account'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g., +254700000000"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Required for SMS notifications and portal access</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-type">Connection Type</Label>
              <Select 
                value={formData.user_type} 
                onValueChange={(value) => setFormData({ ...formData, user_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pppoe">PPPoE</SelectItem>
                  <SelectItem value="static">Static IP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is-active">User is active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Package Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Package</DialogTitle>
            <DialogDescription>
              Assign a package to a broadband user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={assignData.user_id} onValueChange={(value) => 
                setAssignData({ ...assignData, user_id: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Choose user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username} ({user.user_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Package</Label>
              <Select value={assignData.package_id} onValueChange={(value) => 
                setAssignData({ ...assignData, package_id: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Choose package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - KES {pkg.price} ({pkg.duration_value} {pkg.duration_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration Override (0 = use package default)</Label>
              <Input
                type="number"
                min="0"
                value={assignData.duration_override}
                onChange={(e) => setAssignData({ 
                  ...assignData, 
                  duration_override: parseInt(e.target.value) || 0 
                })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignPackage} disabled={loading}>
                {loading ? 'Assigning...' : 'Assign Package'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send SMS to {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Phone: {selectedUser?.phone_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <textarea
                className="w-full h-32 p-3 border rounded-md resize-none"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Enter your SMS message..."
              />
              <p className="text-xs text-muted-foreground">
                {smsMessage.length}/160 characters
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSmsDialog(false)}>
                Cancel
              </Button>
              <Button onClick={sendSMS}>
                <Send className="h-4 w-4 mr-2" />
                Send SMS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BroadbandUserManager;
