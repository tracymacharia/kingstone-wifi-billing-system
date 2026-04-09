import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
  MessageSquare,
  Search,
  Wifi,
  User
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";
import { logger } from "@/lib/logger";

interface ReconnectionRequest {
  id: string;
  phone_number: string;
  transaction_code: string;
  mpesa_message: string;
  mac_address?: string;
  ip_address?: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  amount?: number;
  mpesa_account?: string;
  notes?: string;
  created_at: string;
  completed_at?: string;
  is_trial?: boolean;
  is_session?: boolean;
}

const ReconnectionManager = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ReconnectionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReconnectionRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'completed' | 'rejected'>('processing');
  const [adminNotes, setAdminNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadReconnectionRequests();
    // Auto-refresh disabled to prevent constant reloading
    // const interval = setInterval(loadReconnectionRequests, 30000);
    // return () => clearInterval(interval);
  }, []);

  const loadReconnectionRequests = async () => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) return;

      setLoading(true);

      const { data, error } = await supabase
        .from('reconnection_requests')
        .select('*')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error loading reconnection requests:', error);
        return;
      }

      setRequests(data || []);
    } catch (error) {
      logger.error('Error loading reconnection requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest) return;

    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) {
        toast.error("Admin not authenticated");
        return;
      }

      // Update request status
      const { error } = await supabase
        .from('reconnection_requests')
        .update({
          status: processingStatus,
          notes: adminNotes || null,
          completed_at: processingStatus !== 'processing' ? new Date().toISOString() : null,
          verified_by: adminId
        })
        .eq('id', selectedRequest.id);

      if (error) {
        logger.error('Error updating request:', error);
        toast.error("Failed to update request");
        return;
      }

      // If completed, try to activate the user on Mikrotik
      if (processingStatus === 'completed') {
        await activateUserOnMikrotik(selectedRequest);
      }

      toast.success(`Request marked as ${processingStatus}`);
      setShowProcessDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
      loadReconnectionRequests();
    } catch (error) {
      logger.error('Error processing request:', error);
      toast.error("Failed to process request");
    }
  };

  const activateUserOnMikrotik = async (request: ReconnectionRequest) => {
    try {
      // Get mikrotik info
      const { data: mikrotik } = await supabase
        .from('mikrotiks')
        .select('*')
        .eq('id', request.mikrotik_id)
        .single();

      if (!mikrotik) {
        toast.error("Router configuration not found");
        return;
      }

      // Create hotspot user with phone number
      const mikrotikUrl = `http://${mikrotik.ip_address}/rest/ip/hotspot/user`;
      const mikrotikAuth = btoa(`${mikrotik.username}:${mikrotik.password}`);

      await fetch(mikrotikUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${mikrotikAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: request.phone_number,
          password: request.transaction_code,
          'profile': 'default',
          'comment': `Reconnection: ${request.transaction_code}, MAC: ${request.mac_address || 'N/A'}`
        }),
      });

      toast.success("User activated on router");
    } catch (error) {
      logger.error('Error activating user on Mikrotik:', error);
      toast.error("Could not activate user on router. Please do it manually.");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      rejected: 'destructive'
    } as const;

    const icons = {
      pending: Clock,
      processing: RefreshCw,
      completed: CheckCircle,
      rejected: XCircle
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status === 'completed' ? 'Auto-Connected' : status}
      </Badge>
    );
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.phone_number.includes(searchTerm) ||
      req.transaction_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reconnection Requests</h2>
          <p className="text-muted-foreground">
            Manage automatic and manual reconnection requests ({pendingCount} pending)
          </p>
        </div>
        <Button onClick={loadReconnectionRequests} disabled={loading} className="w-full sm:w-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {pendingCount > 0 && (
        <Alert className="bg-orange-50 border-orange-200">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700">
            You have <strong>{pendingCount}</strong> request(s) requiring manual attention
          </AlertDescription>
        </Alert>
      )}

      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700 text-sm">
          <strong>Automatic Reconnection Enabled:</strong> Most payments are verified and connected automatically. 
          Only failed activations or invalid payments require your attention.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Reconnection Requests History
          </CardTitle>
          <CardDescription>
            View and process user reconnection requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Phone number or transaction code"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction Code</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono font-bold">{request.transaction_code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono text-xs">{request.phone_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.amount ? (
                          <span className="font-medium">KSh {request.amount}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{new Date(request.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {request.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setProcessingStatus('processing');
                                setShowProcessDialog(true);
                              }}
                            >
                              Process
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No reconnection requests</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? "No requests match your filters" 
                  : "Requests will appear here when users submit M-Pesa messages"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Reconnection Request Details
            </DialogTitle>
            <DialogDescription>
              Transaction: {selectedRequest?.transaction_code}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono">{selectedRequest.phone_number}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <p className="text-lg font-bold">
                    {selectedRequest.amount ? `KSh ${selectedRequest.amount}` : 'Not specified'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>M-Pesa Account</Label>
                  <p>{selectedRequest.mpesa_account || 'Not specified'}</p>
                </div>
              </div>

              {selectedRequest.mac_address && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Device MAC Address
                  </Label>
                  <p className="font-mono text-sm">{selectedRequest.mac_address}</p>
                </div>
              )}

              {selectedRequest.ip_address && (
                <div className="space-y-2">
                  <Label>IP Address</Label>
                  <p className="font-mono text-sm">{selectedRequest.ip_address}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>M-Pesa Message</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.mpesa_message}</p>
                </div>
              </div>

              {selectedRequest.notes && (
                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">{selectedRequest.notes}</p>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p>Submitted: {new Date(selectedRequest.created_at).toLocaleString()}</p>
                {selectedRequest.completed_at && (
                  <p>Completed: {new Date(selectedRequest.completed_at).toLocaleString()}</p>
                )}
              </div>

              {selectedRequest.status === 'pending' && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailsDialog(false);
                      setProcessingStatus('processing');
                      setShowProcessDialog(true);
                    }}
                  >
                    Process Request
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Request Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Reconnection Request</DialogTitle>
            <DialogDescription>
              Transaction: {selectedRequest?.transaction_code}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={processingStatus} onValueChange={(val: any) => setProcessingStatus(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed (Activate User)</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this request..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>

            {processingStatus === 'completed' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 text-sm">
                  User will be activated on the router with phone number as username and transaction code as password
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleProcessRequest}>
                {processingStatus === 'completed' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete & Activate
                  </>
                ) : processingStatus === 'rejected' ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Request
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Mark as Processing
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReconnectionManager;
