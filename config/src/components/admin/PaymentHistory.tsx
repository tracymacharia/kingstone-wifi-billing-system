import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Search,
  Download,
  Filter,
  Calendar,
  Phone,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";
import { logger } from "@/lib/logger";

interface Payment {
  id: string;
  user_phone: string;
  amount: number;
  package_name: string;
  package_type: string;
  duration_hours: number;
  transaction_id: string | null;
  mpesa_receipt_number: string | null;
  status: string;
  payment_method: string;
  created_at: string;
  mikrotiks?: {
    name: string;
    router_id: string;
  } | null;
}

const PaymentHistory = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    if (user) fetchPayments();
  }, [user]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter, dateFilter]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          mikrotiks (
            name,
            router_id
          )
        `)
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setPayments(data || []);
    } catch (error) {
      logger.error('Error fetching payments:', error);
      toast.error('Failed to fetch payment history');
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.user_phone.includes(searchTerm) ||
        payment.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.mpesa_receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(payment => 
        new Date(payment.created_at) >= filterDate
      );
    }

    setFilteredPayments(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const exportPayments = () => {
    // Create CSV content
    const headers = ['Date', 'Phone', 'Package', 'Amount', 'Status', 'Transaction ID', 'Receipt', 'Router'];
    const csvContent = [
      headers.join(','),
      ...filteredPayments.map(payment => [
        new Date(payment.created_at).toLocaleDateString(),
        payment.user_phone,
        payment.package_name,
        payment.amount,
        payment.status,
        payment.transaction_id || '',
        payment.mpesa_receipt_number || '',
        payment.mikrotiks?.name || ''
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Payment history exported successfully');
  };

  const totalAmount = filteredPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  const successfulPayments = filteredPayments.filter(p => p.status === 'completed').length;
  const failedPayments = filteredPayments.filter(p => p.status === 'failed').length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Loading payment data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {successfulPayments} successful payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPayments.length > 0 
                ? Math.round((successfulPayments / filteredPayments.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {failedPayments} failed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Showing filtered results
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment History
          </CardTitle>
          <CardDescription>
            View and manage all payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by phone, package, transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={exportPayments} variant="outline" className="w-full md:w-auto">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          {/* Payment List */}
          <div className="space-y-4">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2" />
                <p>No payments found</p>
              </div>
            ) : (
              filteredPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(payment.status)}
                      <span className="font-medium">KSh {parseFloat(payment.amount.toString()).toFixed(2)}</span>
                      <Badge variant={getStatusVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{payment.user_phone}</span>
                        <span>•</span>
                        <span>{payment.package_name}</span>
                        <span>•</span>
                        <span>{payment.duration_hours}h</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {payment.transaction_id && (
                        <span>TXN: {payment.transaction_id} • </span>
                      )}
                      {payment.mpesa_receipt_number && (
                        <span>Receipt: {payment.mpesa_receipt_number} • </span>
                      )}
                      <span>Router: {payment.mikrotiks?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{new Date(payment.created_at).toLocaleDateString()}</div>
                    <div>{new Date(payment.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;