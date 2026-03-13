import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Copy,
  Edit3,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  MessageSquare,
  Users,
  Calendar,
  Package
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface WiFiUser {
  id: string;
  username: string;
  password: string;
  phone_number?: string;
  package_id?: string;
  package_expires_at?: string;
  is_active: boolean;
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

interface WiFiUserAccountsListProps {
  users: WiFiUser[];
  onRefresh: () => Promise<void>;
  onEdit: (user: WiFiUser) => void;
  onDelete: (userId: string) => Promise<void>;
}

const WiFiUserAccountsList = ({ users, onRefresh, onEdit, onDelete }: WiFiUserAccountsListProps) => {
  const { user } = useAuth();
  const [filteredUsers, setFilteredUsers] = useState<WiFiUser[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<WiFiUser | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    phone_number: '',
    package_id: '',
    is_active: true
  });

  useEffect(() => {
    if (user) {
      loadPackages();
    }
  }, [user]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, packageTypeFilter, statusFilter]);


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

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Package type filter
    if (packageTypeFilter !== 'all') {
      filtered = filtered.filter(user => user.package?.package_type === packageTypeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.is_active && isPackageActive(user));
      } else if (statusFilter === 'expired') {
        filtered = filtered.filter(user => !isPackageActive(user));
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(user => !user.is_active);
      }
    }

    setFilteredUsers(filtered);
  };

  const isPackageActive = (user: WiFiUser) => {
    if (!user.package_expires_at) return false;
    return new Date(user.package_expires_at) > new Date();
  };

  const copyPortalLink = (user: WiFiUser) => {
    const portalLink = `${window.location.origin}/client-login`;
    const loginInstructions = `Client Portal\nURL: ${portalLink}\nUsername: ${user.username}\nPassword: ${user.password}`;
    navigator.clipboard.writeText(loginInstructions);
    toast.success("Portal login link copied to clipboard!");
  };

  const openPortalLink = (user: WiFiUser) => {
    window.open(`${window.location.origin}/client-login`, '_blank');
  };

  const handleEditInternal = (user: WiFiUser) => {
    setEditFormData({
      username: user.username,
      password: user.password,
      phone_number: user.phone_number || '',
      package_id: user.package_id || '',
      is_active: user.is_active
    });
    setEditingUser(user);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('wifi_users')
        .update({
          username: editFormData.username,
          password: editFormData.password,
          phone_number: editFormData.phone_number,
          current_package_id: editFormData.package_id || null,
          is_active: editFormData.is_active
        })
        .eq('id', editingUser.id);

      if (error) {
        console.error('Error updating user:', error);
        toast.error("Failed to update user");
        return;
      }

      toast.success("User updated successfully!");
      setShowEditDialog(false);
      setEditingUser(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInternal = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    await onDelete(userId);
  };

  const sendPortalSMS = async (user: WiFiUser) => {
    if (!user.phone_number) {
      toast.error("User has no phone number");
      return;
    }

    // Simulate SMS sending - replace with actual SMS integration
    toast.success(`Portal link sent to ${user.phone_number}`);
  };

  const getStatusBadge = (user: WiFiUser) => {
    if (!user.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    if (!user.package_id) {
      return <Badge variant="outline">No Package</Badge>;
    }
    
    if (isPackageActive(user)) {
      return <Badge variant="default">Active</Badge>;
    }
    
    return <Badge variant="destructive">Expired</Badge>;
  };

  const formatExpiryDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (date < new Date()) {
      return <span className="text-destructive">Expired</span>;
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Accounts List</h2>
          <p className="text-muted-foreground">
            Manage WiFi user accounts and portal access links
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Users className="h-3 w-3 mr-1" />
            {filteredUsers.length} users
          </Badge>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <label className="text-sm font-medium">Package Type</label>
              <Select value={packageTypeFilter} onValueChange={setPackageTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hotspot">Hotspot</SelectItem>
                  <SelectItem value="pppoe">PPPoE</SelectItem>
                  <SelectItem value="static">Static</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end space-y-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setPackageTypeFilter('all');
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

      {/* Users Table - Responsive */}
      <Card>
        <CardContent className="p-0">
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              {/* Desktop Table View */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Package Type</TableHead>
                    <TableHead>Assigned Package</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Login Link</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono font-medium">{user.username}</div>
                          {user.phone_number && (
                            <div className="text-sm text-muted-foreground">
                              {user.phone_number}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.package?.package_type ? (
                          <Badge variant="outline">
                            {user.package.package_type.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.package?.name ? (
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {user.package.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No package</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatExpiryDate(user.package_expires_at)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyPortalLink(user)}
                            title="Copy portal login link"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPortalLink(user)}
                            title="Open portal login"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.phone_number && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendPortalSMS(user)}
                              title="Send portal link via SMS"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(user)}
                            title="Edit user"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteInternal(user.id, user.username)}
                            title="Delete user"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 p-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{user.username}</h3>
                            {getStatusBadge(user)}
                          </div>
                          {user.phone_number && (
                            <p className="text-sm text-muted-foreground">{user.phone_number}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          {user.package?.package_type ? (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {user.package.package_type.toUpperCase()}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground"> -</span>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Package:</span>
                          <span className="ml-1">{user.package?.name || 'None'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Expires:</span>
                          <span className="ml-1">{formatExpiryDate(user.package_expires_at)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyPortalLink(user)}
                            className="text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Link
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPortalLink(user)}
                            className="text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </Button>
                        </>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(user)}
                          className="text-xs"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteInternal(user.id, user.username)}
                          className="text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No users found</h3>
              <p className="text-muted-foreground">
                {users.length === 0
                  ? "No WiFi users have been created yet"
                  : "No users match the current filters"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Account</DialogTitle>
            <DialogDescription>
              Update user account details and package assignment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={editFormData.username}
                onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                value={editFormData.phone_number}
                onChange={(e) => setEditFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                placeholder="e.g., 254712345678"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Package</label>
              <Select 
                value={editFormData.package_id} 
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, package_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No package</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.package_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Active account
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WiFiUserAccountsList;