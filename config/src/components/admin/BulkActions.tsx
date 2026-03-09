import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Edit3, RotateCcw, CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface BulkActionsProps {
  selectedUsers: string[];
  onSelectionChange: (selected: string[]) => void;
  onRefresh: () => void;
}

const BulkActions = ({ selectedUsers, onSelectionChange, onRefresh }: BulkActionsProps) => {
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'expired' | 'inactive' | 'selected'>('selected');
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    duration_value: '',
    price: ''
  });

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) return;

      let query = supabase.from('wifi_users').delete().eq('admin_id', adminId);

      switch (deleteType) {
        case 'expired':
          // Delete users with expired packages
          query = query.lt('package_expires_at', new Date().toISOString());
          break;
        case 'inactive':
          // Delete users without active packages or inactive status
          query = query.or('is_active.eq.false,current_package_id.is.null');
          break;
        case 'selected':
          if (selectedUsers.length === 0) {
            toast.error('No users selected');
            return;
          }
          query = query.in('id', selectedUsers);
          break;
      }

      const { error } = await query;

      if (error) {
        console.error('Error deleting users:', error);
        toast.error('Failed to delete users');
        return;
      }

      toast.success(`Successfully deleted ${deleteType} users`);
      setShowDeleteDialog(false);
      onSelectionChange([]);
      onRefresh();
    } catch (error) {
      console.error('Error deleting users:', error);
      toast.error('Failed to delete users');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedUsers.length === 0) {
      toast.error('No users selected');
      return;
    }

    if (!editData.duration_value && !editData.price) {
      toast.error('Please enter at least one value to update');
      return;
    }

    setLoading(true);
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) return;

      // Get selected users with their packages
      const { data: users, error: fetchError } = await supabase
        .from('wifi_users')
        .select('id, current_package_id')
        .eq('admin_id', adminId)
        .in('id', selectedUsers);

      if (fetchError) {
        console.error('Error fetching users:', fetchError);
        toast.error('Failed to fetch user data');
        return;
      }

      // Update packages for selected users
      const packageIds = [...new Set(users?.map(u => u.current_package_id).filter(Boolean))];

      if (packageIds.length > 0) {
        const updateData: any = {};
        if (editData.duration_value) updateData.duration_value = parseInt(editData.duration_value);
        if (editData.price) updateData.price = parseFloat(editData.price);

        const { error: updateError } = await supabase
          .from('packages')
          .update(updateData)
          .eq('admin_id', adminId)
          .in('id', packageIds);

        if (updateError) {
          console.error('Error updating packages:', updateError);
          toast.error('Failed to update packages');
          return;
        }

        toast.success(`Successfully updated packages for ${selectedUsers.length} users`);
        setShowEditDialog(false);
        setEditData({ duration_value: '', price: '' });
        onSelectionChange([]);
        onRefresh();
      } else {
        toast.warning('No packages found for selected users');
      }
    } catch (error) {
      console.error('Error editing packages:', error);
      toast.error('Failed to edit packages');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFromBin = async () => {
    // This would restore users from recycle bin
    toast.info('Restore from recycle bin feature coming soon');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <CheckSquare className="h-5 w-5 flex-shrink-0" />
          <span>Bulk Actions</span>
        </CardTitle>
        <CardDescription>
          Perform actions on multiple users at once
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 items-center">
          <Select
            onValueChange={(value) => {
              setDeleteType(value as 'expired' | 'inactive' | 'selected');
              setShowDeleteDialog(true);
            }}
          >
            <SelectTrigger className="w-full sm:w-48 flex-shrink-0">
              <SelectValue placeholder="Delete Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expired">Delete All Expired Users</SelectItem>
              <SelectItem value="inactive">Delete All Inactive Users</SelectItem>
              <SelectItem value="selected">Delete Selected Users</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setShowEditDialog(true)}
            disabled={selectedUsers.length === 0}
            className="flex-1 sm:flex-none"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Edit Selected Packages</span>
            <span className="sm:hidden">Edit Packages</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleRestoreFromBin}
            className="flex-1 sm:flex-none"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Restore from Bin</span>
            <span className="sm:hidden">Restore</span>
          </Button>

          {selectedUsers.length > 0 && (
            <Badge variant="secondary" className="ml-auto flex-shrink-0">
              {selectedUsers.length} selected
            </Badge>
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {
                deleteType === 'expired' ? 'all expired users' :
                deleteType === 'inactive' ? 'all inactive users' :
                `${selectedUsers.length} selected users`
              }? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Multiple Packages</DialogTitle>
            <DialogDescription>
              Update package settings for {selectedUsers.length} selected users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (in package units)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="e.g., 30 for 30 days"
                value={editData.duration_value}
                onChange={(e) => setEditData({ ...editData, duration_value: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (KES)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="e.g., 1000.00"
                value={editData.price}
                onChange={(e) => setEditData({ ...editData, price: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkEdit} disabled={loading}>
                {loading ? 'Updating...' : 'Update Packages'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BulkActions;