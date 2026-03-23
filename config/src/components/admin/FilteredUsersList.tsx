import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatKESSimple } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface FilteredUser {
  id: string;
  username: string;
  package_name?: string;
  package_type?: string;
  package_expires_at?: string;
  status: 'active' | 'expired' | 'inactive';
  user_type: 'hotspot' | 'pppoe' | 'static';
  price?: number;
}

interface FilteredUsersListProps {
  filter: string;
  onBack: () => void;
  selectedUsers: string[];
  onSelectionChange: (selected: string[]) => void;
}

const FilteredUsersList = ({ filter, onBack, selectedUsers, onSelectionChange }: FilteredUsersListProps) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<FilteredUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<FilteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    packageType: '',
    userType: '',
    dateRange: '',
    search: ''
  });

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [filter, user]);

  useEffect(() => {
    applyFilters();
  }, [users, filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) return;

      // Load WiFi users
      const { data: wifiUsers, error: wifiError } = await supabase
        .from('wifi_users')
        .select(`
          id, username, is_active, package_expires_at, package_id, created_at, phone_number,
          package:package_id (
            name,
            duration_type,
            duration_value
          )
        `)
        .eq('admin_id', adminId);

      if (wifiError) {
        console.error('Error loading WiFi users:', wifiError);
        return;
      }

      // Load broadband users
      const { data: broadbandUsers, error: broadbandError } = await supabase
        .from('broadband_users')
        .select('id, username, user_type, is_active, package_id')
        .eq('admin_id', adminId);

      if (broadbandError) {
        console.error('Error loading broadband users:', broadbandError);
      }

      // Transform data
      const allUsers: FilteredUser[] = [];
      const now = new Date();

      // Process WiFi users
      wifiUsers?.forEach(user => {
        let status: 'active' | 'expired' | 'inactive' = 'inactive';
        
        if (user.is_active && user.package_expires_at) {
          status = new Date(user.package_expires_at) > now ? 'active' : 'expired';
        }

        allUsers.push({
          id: user.id,
          username: user.username,
          package_name: user.package?.name,
          package_type: user.package?.package_type,
          package_expires_at: user.package_expires_at,
          status,
          user_type: 'hotspot',
          price: user.package?.price
        });
      });

      // Process broadband users
      broadbandUsers?.forEach(user => {
        const status: 'active' | 'expired' | 'inactive' = user.is_active ? 'active' : 'inactive';

        allUsers.push({
          id: user.id,
          username: user.username,
          package_name: undefined, // Will be loaded separately if needed
          package_type: undefined,
          status,
          user_type: user.user_type as 'pppoe' | 'static',
          price: undefined
        });
      });

      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Apply main filter
    switch (filter) {
      case 'active':
        filtered = filtered.filter(u => u.status === 'active');
        break;
      case 'expired':
        filtered = filtered.filter(u => u.status === 'expired');
        break;
      case 'inactive':
        filtered = filtered.filter(u => u.status === 'inactive');
        break;
      case 'hotspot-online':
        filtered = filtered.filter(u => u.user_type === 'hotspot' && u.status === 'active');
        break;
      case 'pppoe-online':
        filtered = filtered.filter(u => u.user_type === 'pppoe' && u.status === 'active');
        break;
      case 'static-online':
        filtered = filtered.filter(u => u.user_type === 'static' && u.status === 'active');
        break;
    }

    // Apply additional filters
    if (filters.packageType) {
      filtered = filtered.filter(u => u.package_type === filters.packageType);
    }

    if (filters.userType) {
      filtered = filtered.filter(u => u.user_type === filters.userType);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(u => 
        u.username.toLowerCase().includes(searchLower) ||
        u.package_name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredUsers.map(u => u.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUsers, userId]);
    } else {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      // Try to delete from wifi_users first
      let { error } = await supabase
        .from('wifi_users')
        .delete()
        .eq('id', userId);

      // If not found, try broadband_users
      if (error) {
        const { error: broadbandError } = await supabase
          .from('broadband_users')
          .delete()
          .eq('id', userId);
        
        if (broadbandError) {
          console.error('Error deleting user:', broadbandError);
          toast.error('Failed to delete user');
          return;
        }
      }

      toast.success('User deleted successfully');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      expired: 'destructive',
      inactive: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getFilterTitle = () => {
    const titles = {
      active: 'Active Users',
      expired: 'Expired Users',
      inactive: 'Inactive Users',
      'hotspot-online': 'Online Hotspot Users',
      'pppoe-online': 'Online PPPoE Users',
      'static-online': 'Online Static Users'
    };
    return titles[filter as keyof typeof titles] || 'Users';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              {getFilterTitle()} ({filteredUsers.length})
              <Button variant="ghost" size="sm" onClick={onBack}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription className="truncate">
              Filter and manage user accounts
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">Filters:</span>
          </div>

          <Select value={filters.packageType} onValueChange={(value) => setFilters({ ...filters, packageType: value })}>
            <SelectTrigger className="w-32 sm:w-40 flex-shrink-0">
              <SelectValue placeholder="Package Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="hotspot">Hotspot</SelectItem>
              <SelectItem value="pppoe">PPPoE</SelectItem>
              <SelectItem value="static">Static</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.userType} onValueChange={(value) => setFilters({ ...filters, userType: value })}>
            <SelectTrigger className="w-32 sm:w-40 flex-shrink-0">
              <SelectValue placeholder="User Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Users</SelectItem>
              <SelectItem value="hotspot">Hotspot</SelectItem>
              <SelectItem value="pppoe">PPPoE</SelectItem>
              <SelectItem value="static">Static</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search users..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full sm:w-48 min-w-0"
          />
        </div>
      </CardHeader>

      <CardContent>
        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 min-w-[3rem]">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="min-w-[8rem]">Username</TableHead>
                  <TableHead className="min-w-[8rem]">Package</TableHead>
                  <TableHead className="min-w-[6rem]">Type</TableHead>
                  <TableHead className="min-w-[5rem]">Status</TableHead>
                  <TableHead className="min-w-[8rem]">Expiry Date</TableHead>
                  <TableHead className="min-w-[5rem]">Price</TableHead>
                  <TableHead className="min-w-[5rem]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="w-12">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs sm:text-sm truncate max-w-[8rem] sm:max-w-none">{user.username}</TableCell>
                    <TableCell className="text-xs sm:text-sm truncate max-w-[8rem] sm:max-w-none">{user.package_name || 'None'}</TableCell>
                    <TableCell className="text-xs sm:text-sm capitalize whitespace-nowrap">{user.user_type}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                      {user.package_expires_at
                        ? new Date(user.package_expires_at).toLocaleDateString()
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                      {user.price ? formatKESSimple(user.price) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteUser(user.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No users found matching the current filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FilteredUsersList;