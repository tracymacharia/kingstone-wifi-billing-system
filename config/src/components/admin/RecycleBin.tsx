import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, RotateCcw, Search, Trash, FileX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface DeletedPayment {
  id: string;
  admin_id: string;
  amount: number;
  user_phone: string;
  package_name: string;
  payment_method: string;
  status: string;
  created_at: string;
  deleted_at: string;
  transaction_id?: string;
  mpesa_receipt_number?: string;
}

const RecycleBin = () => {
  const { user } = useAuth();
  const [deletedPayments, setDeletedPayments] = useState<DeletedPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<DeletedPayment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.adminId) {
      loadDeletedPayments();
    }
  }, [user?.adminId]);

  useEffect(() => {
    filterPayments();
  }, [deletedPayments, searchQuery, statusFilter]);

  const loadDeletedPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('admin_id', user?.adminId)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedPayments(data || []);
    } catch (error) {
      toast.error('Failed to load deleted transactions');
    }
  };

  const filterPayments = () => {
    let filtered = [...deletedPayments];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(payment =>
        payment.user_phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.package_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.mpesa_receipt_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const restorePayments = async (paymentIds: string[]) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          is_deleted: false,
          deleted_at: null
        })
        .in('id', paymentIds);

      if (error) throw error;
      
      toast.success(`${paymentIds.length} transaction(s) restored successfully`);
      setSelectedPayments([]);
      loadDeletedPayments();
    } catch (error) {
      toast.error('Failed to restore transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const permanentlyDelete = async (paymentIds: string[]) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .in('id', paymentIds);

      if (error) throw error;
      
      toast.success(`${paymentIds.length} transaction(s) permanently deleted`);
      setSelectedPayments([]);
      loadDeletedPayments();
    } catch (error) {
      toast.error('Failed to permanently delete transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDeleteTransactions = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('admin_id', user?.adminId)
        .eq('is_deleted', false);

      if (error) throw error;
      
      toast.success('All transactions moved to recycle bin');
      loadDeletedPayments();
    } catch (error) {
      toast.error('Failed to delete transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev =>
      prev.includes(paymentId)
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedPayments(
      selectedPayments.length === filteredPayments.length
        ? []
        : filteredPayments.map(p => p.id)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Trash2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Transaction Recycle Bin</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deleted Transactions</CardTitle>
          <CardDescription>
            Manage and restore deleted payment transactions
          </CardDescription>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone, package, or transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading}>
                  <Trash className="h-4 w-4 mr-2" />
                  Bulk Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bulk Delete Transactions</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will move ALL active transactions to the recycle bin. They can be restored later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkDeleteTransactions}>
                    Move to Recycle Bin
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>

        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <FileX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No deleted transactions</h3>
              <p className="text-muted-foreground">
                Deleted transactions will appear here for recovery or permanent deletion.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedPayments.length === filteredPayments.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedPayments.length} of {filteredPayments.length} selected
                  </span>
                </div>

                {selectedPayments.length > 0 && (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restorePayments(selectedPayments)}
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore ({selectedPayments.length})
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isLoading}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Forever ({selectedPayments.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently Delete Transactions</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The selected transactions will be permanently deleted from the database.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => permanentlyDelete(selectedPayments)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Forever
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedPayments.length === filteredPayments.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Deleted Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedPayments.includes(payment.id)}
                          onChange={() => toggleSelectPayment(payment.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        KSh {payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{payment.user_phone}</TableCell>
                      <TableCell>{payment.package_name}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.transaction_id || payment.mpesa_receipt_number || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(payment.deleted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restorePayments([payment.id])}
                            disabled={isLoading}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={isLoading}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Permanently Delete Transaction</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This transaction will be permanently deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => permanentlyDelete([payment.id])}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Forever
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecycleBin;