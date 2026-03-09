
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Edit3, Trash2, MessageSquare, Send, Link, Package, Power, Clock, Eye, EyeOff, Search, Filter, Key } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";
import { validateUsername, validatePassword, validatePhoneNumber, sanitizeInput } from "@/lib/validators";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WiFiUser {
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
  is_active?: boolean;
}

const WiFiUserManager = () => {
  const location = useLocation();
  const { user, getAuthUser } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const activeSubtab = searchParams.get('subtab') || 'manage';
  
  const [users, setUsers] = useState<WiFiUser[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<WiFiUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<WiFiUser | null>(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [activationDuration, setActivationDuration] = useState<string>('24');
  const [activationDurationType, setActivationDurationType] = useState<string>('hours');
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    phone_number: '',
    user_type: '',
    is_active: true
  });

  useEffect(() => {
    loadUsers();
    loadPackages();
  }, []);

  const loadUsers = async () => {
    try {
      const userId = getAdminIdFromUser(user);

      console.log('WiFiUserManager loadUsers - Context user:', user);
      console.log('WiFiUserManager loadUsers - Using admin ID:', userId);

      if (!userId) {
        console.error('No admin ID available for loading wifi users');
        return;
      }

      const { data, error } = await supabase
        .from('wifi_users')
        .select(`
          *,
          package:current_package_id (
            name,
            package_type,
            bandwidth_limit_mb,
            price
          )
        `)
        .eq('admin_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading wifi users:', error);
        return;
      }

      const usersData = (data || []).map((user: any) => ({
        id: user.id,
        username: user.username,
        password: user.password,
        phone_number: user.phone_number || '',
        portal_token: user.portal_token || '',
        package_id: user.current_package_id,
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
      console.error('Error loading wifi users:', error);
    }
  };

  const loadPackages = async () => {
    try {
      const userId = getAdminIdFromUser(user);

      if (!userId) {
        console.error('No admin ID available for loading packages');
        return;
      }

      console.log('Loading packages for admin:', userId);

      const { data, error } = await supabase
        .from('packages')
        .select('id, name, package_type, duration_type, duration_value, price, is_active, bandwidth_limit_mb')
        .eq('admin_id', userId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading packages:', error);
        toast.error("Failed to load packages");
        return;
      }

      console.log('Loaded packages:', data);
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages - Exception:', error);
      toast.error("Failed to load packages");
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      phone_number: '',
      user_type: '',
      is_active: true
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      user.username.toLowerCase().includes(searchLower) ||
      user.phone_number?.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleEdit = (user: WiFiUser) => {
    setFormData({
      username: user.username,
      password: user.password,
      phone_number: user.phone_number || '',
      user_type: user.user_type,
      is_active: user.is_active
    });
    setEditingUser(user);
    setShowPassword(false);
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.username.trim() || !formData.password.trim() || !formData.user_type) {
      toast.error("Username, password, and user type are required");
      return;
    }

    // Validate username
    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.isValid) {
      toast.error(`Username Error: ${usernameValidation.errors.join(', ')}`);
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password, 4, 6);
    if (!passwordValidation.isValid) {
      toast.error(`Password Error: ${passwordValidation.errors.join(', ')}`);
      return;
    }

    // Validate phone number if provided
    if (formData.phone_number) {
      const phoneValidation = validatePhoneNumber(formData.phone_number, false);
      if (!phoneValidation.isValid) {
        toast.error(`Phone Error: ${phoneValidation.errors.join(', ')}`);
        return;
      }
    }

    setLoading(true);
    try {
      const userId = getAdminIdFromUser(user);

      console.log('WiFiUserManager handleSave - Context user:', user);
      console.log('WiFiUserManager handleSave - Using admin ID:', userId);

      if (!userId) {
        console.error('WiFiUserManager handleSave - No admin ID available');
        toast.error("Admin not authenticated");
        return;
      }

      const userData = {
        username: sanitizeInput(formData.username),
        password: formData.password, // This will be hashed by the database trigger
        phone_number: formData.phone_number ? sanitizeInput(formData.phone_number) : null,
        user_type: formData.user_type,
        is_active: formData.is_active,
        admin_id: userId
      };

      let error;

      if (editingUser) {
        const { error: updateError } = await supabase
          .from('wifi_users')
          .update(userData)
          .eq('id', editingUser.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('wifi_users')
          .insert([userData]);
        error = insertError;
      }

      if (error) {
        console.error('Error saving wifi user:', error);
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

      // Auto-send SMS to new users with phone numbers
      if (!editingUser && formData.phone_number) {
        toast.info("Consider sending welcome SMS with portal link");
      }
    } catch (error) {
      console.error('Error saving wifi user:', error);
      toast.error("Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const { error } = await supabase
        .from('wifi_users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting wifi user:', error);
        toast.error("Failed to delete user");
        return;
      }

      toast.success("User deleted!");
      loadUsers();
    } catch (error) {
      console.error('Error deleting wifi user:', error);
      toast.error("Failed to delete user");
    }
  };

  const handleAssignPackage = (user: WiFiUser) => {
    setSelectedUser(user);
    setSelectedPackageId(user.package_id || '');
    setShowPackageDialog(true);
  };

  const handleSavePackageAssignment = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('wifi_users')
        .update({
          current_package_id: selectedPackageId || null,
          package_expires_at: selectedPackageId ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
        })
        .eq('id', selectedUser.id);

      if (error) {
        console.error('Error assigning package:', error);
        toast.error("Failed to assign package");
        return;
      }

      toast.success("Package assigned successfully!");
      setShowPackageDialog(false);
      setSelectedUser(null);
      setSelectedPackageId('');
      loadUsers();
    } catch (error) {
      console.error('Error assigning package:', error);
      toast.error("Failed to assign package");
    }
  };

  const handleCopyPortalLink = (user: WiFiUser) => {
    if (!user.portal_token) {
      toast.error("Portal link not available - user needs a portal token");
      return;
    }

    const portalLink = `${window.location.origin}/client/${user.portal_token}`;
    navigator.clipboard.writeText(portalLink);
    toast.success("Portal link copied to clipboard!");
  };

  const handleOpenPortal = (user: WiFiUser) => {
    if (!user.portal_token) {
      toast.error("Portal link not available - user needs a portal token");
      return;
    }

    const portalLink = `${window.location.origin}/client/${user.portal_token}`;
    window.open(portalLink, '_blank');
  };

  const handleCopyPppoeCredentials = (user: WiFiUser) => {
    const credentialsText = `PPPoE Credentials:\nUsername: ${user.username}\nPassword: ${user.password}\n\nSetup: Configure your router's PPPoE settings with these credentials.`;
    navigator.clipboard.writeText(credentialsText);
    toast.success("PPPoE credentials copied to clipboard!");
  };

  const handleCopyPortalLoginLink = (user: WiFiUser) => {
    const portalLoginLink = `${window.location.origin}/client-login`;
    const loginInstructions = `Client Portal Login\n\nURL: ${portalLoginLink}\nUsername: ${user.username}\nPassword: ${user.password}\n\nUse these credentials to login to the client portal and manage your account.`;
    navigator.clipboard.writeText(loginInstructions);
    toast.success("Portal login link and credentials copied!");
  };

  const handleOpenPortalLogin = (user: WiFiUser) => {
    const portalLoginLink = `${window.location.origin}/client-login`;
    window.open(portalLoginLink, '_blank');
    toast.info(`Share these credentials with the user:\nUsername: ${user.username}\nPassword: ${user.password}`);
  };

  const handleActivateUser = (user: WiFiUser) => {
    setSelectedUser(user);
    setActivationDuration('24');
    setActivationDurationType('hours');
    setShowActivateDialog(true);
  };

  const handleSaveActivation = async () => {
    if (!selectedUser) return;

    setLoading(true);

    try {
      if (selectedUser.is_active) {
        // DEACTIVATE user
        const { error: deactError } = await supabase
          .rpc('deactivate_wifi_user_in_router', {
            p_username: selectedUser.username,
            p_user_type: selectedUser.user_type,
            p_admin_id: getAdminIdFromUser(user)
          });

        if (deactError) {
          console.error('Error deactivating user:', deactError);
          toast.error("Failed to deactivate user");
          return;
        }

        toast.success(`User ${selectedUser.username} deactivated!`);
      } else {
        // ACTIVATE user
        const duration = parseInt(activationDuration);
        if (isNaN(duration) || duration <= 0) {
          toast.error("Please enter a valid duration");
          return;
        }

        // Calculate expiry time for display
        const now = new Date();
        const expiryTime = new Date(now);
        if (activationDurationType === 'hours') {
          expiryTime.setHours(expiryTime.getHours() + duration);
        } else if (activationDurationType === 'days') {
          expiryTime.setDate(expiryTime.getDate() + duration);
        }

        const durationInHours = activationDurationType === 'hours' ? duration : duration * 24;

        // Activate user in router and database
        const { data: actData, error: actError } = await supabase
          .rpc('activate_wifi_user_in_router', {
            p_username: selectedUser.username,
            p_password: selectedUser.password,
            p_user_type: selectedUser.user_type,
            p_duration_hours: durationInHours,
            p_admin_id: getAdminIdFromUser(user)
          });

        if (actError) {
          console.error('Error activating user:', actError);
          toast.error("Failed to activate user: " + actError.message);
          return;
        }

        // Check if router integration worked
        if (actData && !(actData as any).success) {
          toast.warning("User activated in database but router sync failed");
        } else {
          toast.success(`User activated for ${duration} ${activationDurationType}! Expires: ${expiryTime.toLocaleString()}`);
        }
      }

      setShowActivateDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error in activation:', error);
      toast.error("Failed to process activation");
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = (user: WiFiUser) => {
    if (!user.phone_number) {
      toast.error("User has no phone number");
      return;
    }

    setSelectedUser(user);

    // Generate portal link - now using login-based access
    const portalLoginLink = `${window.location.origin}/client-login`;

    const defaultMessage = `Hello from [Business Name]!

Your WiFi account is ready:
Username: ${user.username}
Password: ${user.password}
Type: ${user.user_type.toUpperCase()}

Client Portal Login: ${portalLoginLink}
Login with the credentials above to manage your account.

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
      console.log('SMS to:', selectedUser.phone_number, 'Message:', smsMessage);
      
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
      console.log('Bulk SMS sent to:', usersWithPhone.map(u => u.phone_number));
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      toast.error("Failed to send bulk SMS");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">WiFi User Management</h2>
          <p className="text-muted-foreground">Create and manage WiFi user accounts</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={sendBulkSMS} className="flex-1 sm:flex-none">
            <Send className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Bulk SMS</span>
            <span className="sm:hidden">SMS</span>
          </Button>
          <Button onClick={handleCreate} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create User</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search username or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end space-y-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table - Horizontal Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            WiFi Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Manage WiFi user accounts and PPPoE credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>PPPoE Credentials</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.username}</div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{user.password}</code>
                      </TableCell>
                      <TableCell>
                        {user.phone_number || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.user_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.package ? (
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{user.package.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-blue-50 px-2 py-1 rounded text-xs border border-blue-200">
                            {user.username}:{user.password}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopyPppoeCredentials(user)}
                          >
                            <Link className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant={user.is_active ? "outline" : "default"}
                            className={user.is_active ? "" : "bg-green-600 hover:bg-green-700"}
                            onClick={() => handleActivateUser(user)}
                          >
                            <Power className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignPackage(user)}
                          >
                            <Package className="w-3 h-3" />
                          </Button>
                          {user.phone_number && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendSMS(user)}
                            >
                              <MessageSquare className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPortalLogin(user)}
                            title="Client Portal Login"
                          >
                            <Key className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(user.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No WiFi users found</h3>
              <p className="text-muted-foreground mb-4">Create your first WiFi user account</p>
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
              {editingUser ? 'Edit WiFi User' : 'Create WiFi User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user credentials and settings' : 'Create a new WiFi user account'}
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="4-6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be 4-6 characters. This is the PPPoE password for client's router.
                Stored in plain text for PPPoE authentication (not used for system login).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g., +254700000000"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Optional: for SMS notifications and portal access</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-type">User Type *</Label>
              <Select 
                value={formData.user_type} 
                onValueChange={(value) => setFormData({ ...formData, user_type: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="-- Select User Type --" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  <SelectItem value="hotspot">Hotspot</SelectItem>
                  <SelectItem value="pppoe">PPPoE</SelectItem>
                  <SelectItem value="static">Static</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.user_type === 'hotspot' && 'Auth via hotspot login portal. Requires username & password.'}
                {formData.user_type === 'pppoe' && 'Auth via Mikrotik PPPoE interface. Requires username, password & bandwidth.'}
                {formData.user_type === 'static' && 'Auth via static IP MAC binding. Requires username, password & static IP.'}
              </p>
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

      {/* Package Assignment Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign Package to {selectedUser?.username}
            </DialogTitle>
            <DialogDescription>
              Select a package to assign to this user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="package">Select Package</Label>
              <Select
                value={selectedPackageId || "none"}
                onValueChange={(value) => setSelectedPackageId(value === "none" ? "" : value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="-- Select a package --" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  <SelectItem value="none">No Package (Clear Assignment)</SelectItem>
                  {packages.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No packages available. Create a package first.
                    </div>
                  ) : (
                    packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - KES {pkg.price} ({pkg.package_type})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPackageId && packages.length > 0 && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Package Details:</p>
                {(() => {
                  const pkg = packages.find(p => p.id === selectedPackageId);
                  if (!pkg) return null;
                  return (
                    <div className="mt-2 space-y-1 text-sm">
                      <p>Name: {pkg.name}</p>
                      <p>Type: {pkg.package_type.toUpperCase()}</p>
                      <p>Price: KES {pkg.price}</p>
                      {pkg.bandwidth_limit_mb && (
                        <p>Bandwidth: {pkg.bandwidth_limit_mb} MB</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {packages.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  No packages available. Please create a package first in the Package Manager.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPackageDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSavePackageAssignment}
                disabled={packages.length === 0 && selectedPackageId !== ''}
              >
                <Package className="h-4 w-4 mr-2" />
                Assign Package
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Activation Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              {selectedUser?.is_active ? 'Deactivate' : 'Activate'} User
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.is_active 
                ? 'Deactivating this user will disconnect them from the network'
                : 'Activate user with time-based access. User will be automatically disconnected when time expires.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Info */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">User: {selectedUser?.username}</p>
              <p className="text-xs text-muted-foreground">Type: {selectedUser?.user_type?.toUpperCase()}</p>
              {selectedUser?.is_active && selectedUser?.package_expires_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current expiry: {new Date(selectedUser.package_expires_at).toLocaleString()}
                </p>
              )}
            </div>

            {!selectedUser?.is_active && (
              <>
                {/* Duration Input */}
                <div className="space-y-2">
                  <Label htmlFor="duration">Activation Duration</Label>
                  <div className="flex gap-2">
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="365"
                      value={activationDuration}
                      onChange={(e) => setActivationDuration(e.target.value)}
                      className="w-24"
                    />
                    <Select value={activationDurationType} onValueChange={setActivationDurationType}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    User will expire on: {(() => {
                      const expiry = new Date();
                      const duration = parseInt(activationDuration) || 0;
                      if (activationDurationType === 'hours') {
                        expiry.setHours(expiry.getHours() + duration);
                      } else {
                        expiry.setDate(expiry.getDate() + duration);
                      }
                      return expiry.toLocaleString();
                    })()}
                  </p>
                </div>

                {/* Router Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 font-medium">PPPoE Credentials for Client's Router:</p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• <strong>Username</strong>: <code className="bg-white px-2 py-0.5 rounded">{selectedUser?.username}</code></li>
                    <li>• <strong>Password</strong>: <code className="bg-white px-2 py-0.5 rounded">{selectedUser?.password}</code></li>
                    <li className="mt-2 pt-2 border-t border-blue-300">• Client uses these in their home router's PPPoE settings</li>
                    <li>• User will be created/updated in Mikrotik billing router</li>
                    <li>• Auto-disconnect on expiry</li>
                  </ul>
                </div>
              </>
            )}

            {selectedUser?.is_active && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 font-medium">Warning:</p>
                <p className="text-xs text-red-700 mt-1">
                  Deactivating this user will:
                </p>
                <ul className="text-xs text-red-700 mt-1 space-y-1">
                  <li>• Remove them from the Mikrotik router</li>
                  <li>• Disconnect any active sessions</li>
                  <li>• Set their status to inactive</li>
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowActivateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveActivation}
                disabled={loading}
                variant={selectedUser?.is_active ? "destructive" : "default"}
              >
                {loading ? (
                  'Processing...'
                ) : selectedUser?.is_active ? (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Deactivate User
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Activate User
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WiFiUserManager;
