import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Search, FileX, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Payment {
  id: string;
  admin_id: string;
  amount: number;
  user_phone: string;
  package_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  transaction_id?: string;
  mpesa_receipt_number?: string;
}

const RecycleBin = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.adminId) {
      loadFailedPayments();
    }
  }, [user?.adminId]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, statusFilter]);

  const loadFailedPayments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id, admin_id, amount, user_phone, package_name, status, created_at, updated_at, transaction_id, mpesa_receipt_number')
        .eq('admin_id', user?.adminId)
        .in('status', ['failed', 'cancelled', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.user_phone?.toLowerCase().includes(q) ||
        p.package_name?.toLowerCase().includes(q) ||
        p.transaction_id?.toLowerCase().includes(q) ||
        p.mpesa_receipt_number?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const markAsCompleted = async (paymentIds: string[]) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .in('id', paymentIds);

      if (error) throw error;

      toast.success(`${paymentIds.length} transaction(s) marked as completed`);
      setSelectedPayments([]);
      loadFailedPayments();
    } catch (error) {
      console.error('Error updating payments:', error);
      toast.error('Failed to update transactions');
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
      loadFailedPayments();
    } catch (error) {
      console.error('Error deleting payments:', error);
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

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Trash2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Failed &amp; Pending Transactions</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unresolved Transactions</CardTitle>
          <CardDescription>
            Review and manage failed, cancelled, or pending payment transactions
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={loadFailedPayments} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <FileX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No unresolved transactions</h3>
              <p className="text-muted-foreground">
                Failed, cancelled, and pending transactions will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
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
                      onClick={() => markAsCompleted(selectedPayments)}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Mark Completed ({selectedPayments.length})
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
                        checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
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
                        KSh {Number(payment.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{payment.user_phone || '-'}</TableCell>
                      <TableCell>{payment.package_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.transaction_id || payment.mpesa_receipt_number || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsCompleted([payment.id])}
                            disabled={isLoading}
                            title="Mark as completed"
                          >
                            <RefreshCw className="h-4 w-4" />
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
