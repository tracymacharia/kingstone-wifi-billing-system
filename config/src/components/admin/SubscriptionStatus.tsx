import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getAdminIdFromUser } from '@/hooks/useAdminId';
import { Phone, DollarSign, Smartphone } from 'lucide-react';

interface SubscriptionStatusProps {
  businessName: string;
}

interface PaymentSetting {
  id: string;
  method: 'paybill' | 'till';
  paybill_number?: string;
  account_number?: string;
  till_number?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const SubscriptionStatus = ({ businessName }: SubscriptionStatusProps) => {
  const { user } = useAuth();
  const [adminData, setAdminData] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [requestPhone, setRequestPhone] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [stkPhone, setStkPhone] = useState('');
  const [stkAmount, setStkAmount] = useState('');
  const [initiatingStk, setInitiatingStk] = useState(false);

  const fetchPaymentSettings = async (ownerId: string) => {
    try {
      const { data, error } = await supabase
        .from('owner_payment_settings')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching payment settings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching payment settings:', error);
      return [];
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const adminUsername = user?.username;
    
    const fetchAdminData = async () => {
      try {
        if (!adminUsername) {
          console.error('No admin username available');
          setLoading(false);
          return;
        }


        // Use RPC function to get admin data (bypasses RLS issues)
        const { data: adminData, error: adminError } = await supabase
          .rpc('get_admin_by_username', { p_username: adminUsername });

        if (adminError) {
          console.error('Error fetching admin data via RPC:', adminError);
          toast.error('Failed to load admin data: ' + adminError.message);
          setLoading(false);
          return;
        }

        if (!adminData || adminData.length === 0) {
          console.warn('No admin data found for username:', adminUsername);
          toast.error('Admin record not found. Please contact the owner.');
          setLoading(false);
          return;
        }

        const admin = adminData[0];

        // If we have owner_id, try to fetch owner data separately
        let ownerData = null;
        let settings: PaymentSetting[] = [];
        if (admin.owner_id) {
          
          const { data: ownerResult, error: ownerError } = await supabase
            .from('owners')
            .select('business_name, paybill_number, paybill_account, till_number')
            .eq('id', admin.owner_id)
            .single();

          if (ownerError) {
            console.warn('Could not fetch owner data:', ownerError);
          } else {
            ownerData = ownerResult;
          }

          // Fetch payment settings from owner_payment_settings table
          settings = await fetchPaymentSettings(admin.owner_id);
          
          
          // Set up real-time subscription for payment settings changes
          channel = supabase
            .channel(`owner_payment_settings:${admin.owner_id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'owner_payment_settings',
                filter: `owner_id=eq.${admin.owner_id}`
              },
              async (payload) => {
                
                // Refresh payment settings immediately
                const updatedSettings = await fetchPaymentSettings(admin.owner_id);
                setPaymentSettings(updatedSettings);
                
                if (payload.eventType === 'INSERT') {
                  toast.success('New payment method added by owner');
                } else if (payload.eventType === 'UPDATE') {
                  toast.info('Payment method updated by owner');
                } else if (payload.eventType === 'DELETE') {
                  toast.info('Payment method removed by owner');
                }
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.error('❌ Real-time subscription error:', status);
              }
            });
        }

        setAdminData({
          ...admin,
          owner: ownerData
        });
        setPaymentSettings(settings);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();

    // Cleanup function to unsubscribe from channel
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const handleVerifyPayment = async () => {
    if (!paymentReference.trim() || !paymentAmount.trim()) {
      toast.error('Please enter both payment reference and amount');
      return;
    }

    setVerifying(true);

    try {
      const adminId = getAdminIdFromUser(user);
      const sessionToken = sessionStorage.getItem('kingstone_session_token') || '';

      // Call the verification edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-subscription-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({
          admin_id: adminId,
          payment_reference: paymentReference.trim(),
          amount: parseFloat(paymentAmount.trim()),
          payment_method: 'MPESA'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        // Reload admin data to reflect new status
        window.location.reload();
      } else {
        toast.error(result.error || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('An error occurred during payment verification');
    } finally {
      setVerifying(false);
    }
  };

  const handleRequestPaymentAssistance = async () => {
    if (!requestPhone.trim() || !requestAmount.trim()) {
      toast.error('Please enter both phone number and amount');
      return;
    }

    setRequesting(true);

    try {
      const adminId = getAdminIdFromUser(user);

      // Insert payment request into database
      const { data, error } = await supabase
        .from('payment_requests')
        .insert({
          admin_id: adminId,
          phone: requestPhone.trim(),
          amount: parseFloat(requestAmount.trim()),
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Payment request submitted successfully! We will contact you shortly.');
      setRequestPhone('');
      setRequestAmount('');
    } catch (error) {
      console.error('Request error:', error);
      toast.error('An error occurred while submitting your request');
    } finally {
      setRequesting(false);
    }
  };

  const handleInitiateStkPush = async () => {
    if (!stkPhone.trim() || !stkAmount.trim()) {
      toast.error('Please enter both phone number and amount');
      return;
    }

    setInitiatingStk(true);

    try {
      const adminId = getAdminIdFromUser(user);

      // Get the custom session token from sessionStorage
      const sessionToken = sessionStorage.getItem('kingstone_session_token');

      if (!sessionToken) {
        toast.error('Session expired. Please log in again.');
        setInitiatingStk(false);
        return;
      }

      // Call the STK push initiation edge function
      // Note: admin_id is derived from the session token on the server
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-subscription-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({
          phone: stkPhone.trim(),
          amount: parseFloat(stkAmount.trim())
        })
      });

      
      const result = await response.json();

      if (result.success) {
        toast.success(
          `STK Push sent to ${stkPhone}! Please check your phone and enter your MPESA PIN to complete the payment of KES ${stkAmount}.`
        );
        setStkPhone('');
        setStkAmount('');
      } else {
        toast.error(result.error || 'Failed to initiate STK Push');
      }
    } catch (error) {
      console.error('STK Push error:', error);
      toast.error('An error occurred while initiating STK Push. Please try again.');
    } finally {
      setInitiatingStk(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading subscription status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!adminData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not load admin data</p>
        </CardContent>
      </Card>
    );
  }

  if (adminData.subscription_status === 'active' && 
      (!adminData.subscription_expires_at || new Date(adminData.subscription_expires_at) > new Date())) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Your subscription is active and up to date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <p className="text-sm">{adminData.subscription_type || 'N/A'}</p>
              </div>
              <div>
                <Label>Status</Label>
                <p className="text-sm text-green-600 font-semibold">Active</p>
              </div>
              <div>
                <Label>Expires At</Label>
                <p className="text-sm">
                  {adminData.subscription_expires_at 
                    ? new Date(adminData.subscription_expires_at).toLocaleDateString() 
                    : 'Never'}
                </p>
              </div>
              <div>
                <Label>Amount Paid</Label>
                <p className="text-sm">{adminData.subscription_amount ? `KES ${adminData.subscription_amount}` : 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Subscription Required</CardTitle>
        <CardDescription>
          Your account requires an active subscription to access the dashboard features.
          Please make a payment to activate your subscription.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Payment Instructions</h3>
            <div className="space-y-4">
              {/* Display payment settings from owner_payment_settings table */}
              {paymentSettings.length > 0 ? (
                <div className="space-y-3">
                  {paymentSettings.map((setting, index) => (
                    <div key={setting.id} className="bg-white border border-blue-100 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={setting.is_active ? 'default' : 'secondary'} className="text-xs">
                          {setting.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="font-semibold text-blue-900 capitalize">{setting.method}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {setting.method === 'paybill' ? (
                          <>
                            <p><strong>Paybill Number:</strong> {setting.paybill_number || 'N/A'}</p>
                            <p><strong>Account Number:</strong> {setting.account_number || 'N/A'}</p>
                          </>
                        ) : (
                          <p><strong>Till Number:</strong> {setting.till_number || 'N/A'}</p>
                        )}
                        {setting.description && (
                          <p className="text-muted-foreground mt-2">{setting.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback to legacy owner data if no payment settings found
                <div className="space-y-2 text-sm">
                  <p><strong>Business:</strong> {adminData.owner?.business_name || 'N/A'}</p>
                  <p><strong>Paybill/Till Number:</strong> {adminData.owner?.till_number || adminData.owner?.paybill_number || 'N/A'}</p>
                  <p><strong>Account Number:</strong> {adminData.owner?.paybill_account || 'N/A'}</p>
                </div>
              )}
              <div className="border-t border-blue-200 pt-2 mt-2">
                <p><strong>Amount:</strong> KES {adminData.subscription_amount || 'N/A'}</p>
                <p><strong>Reference:</strong> Your phone number ({adminData.phone})</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentReference">MPESA Transaction Reference</Label>
              <Input
                id="paymentReference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Enter transaction reference (e.g. ABC123XYZ)"
                disabled={verifying}
              />
            </div>
            <div>
              <Label htmlFor="paymentAmount">Paid Amount (KES)</Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter the amount paid"
                disabled={verifying}
              />
            </div>
            <Button
              onClick={handleVerifyPayment}
              disabled={verifying || !paymentReference.trim() || !paymentAmount.trim()}
              className="w-full"
            >
              {verifying ? 'Submitting...' : 'Submit Payment Verification'}
            </Button>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Need Payment Assistance?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              If you need help with payment, enter your phone number and the amount you need to pay.
              We'll contact you to arrange the payment.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="requestPhone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="requestPhone"
                    value={requestPhone}
                    onChange={(e) => setRequestPhone(e.target.value)}
                    placeholder="Enter your phone number (e.g. 0712345678)"
                    disabled={requesting}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="requestAmount">Amount Required (KES)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="requestAmount"
                    type="number"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    placeholder="Enter the amount you need"
                    disabled={requesting}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-lg">Pay with MPESA STK Push</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your phone number and the amount to pay. You'll receive an MPESA prompt on your phone to complete the payment instantly.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="stkPhone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="stkPhone"
                    value={stkPhone}
                    onChange={(e) => setStkPhone(e.target.value)}
                    placeholder="Enter your phone number (e.g. 0712345678)"
                    disabled={initiatingStk}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="stkAmount">Amount to Pay (KES)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="stkAmount"
                    type="number"
                    value={stkAmount}
                    onChange={(e) => setStkAmount(e.target.value)}
                    placeholder="Enter the subscription amount"
                    disabled={initiatingStk}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          onClick={handleInitiateStkPush}
          disabled={initiatingStk}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {initiatingStk ? 'Sending STK Push...' : 'Pay with MPESA STK Push'}
        </Button>
        <Button
          onClick={handleRequestPaymentAssistance}
          disabled={requesting}
          className="w-full"
          variant="outline"
        >
          {requesting ? 'Submitting Request...' : 'Request Payment Assistance'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionStatus;