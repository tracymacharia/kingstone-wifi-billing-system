import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wifi, CheckCircle, Loader2, AlertCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface Package {
  id: string;
  name: string;
  duration: string;
  price: number;
  type: string;
}

interface WiFiSettings {
  hotspot_title: string;
  description: string;
  theme_color: string;
  contact_phone: string;
  contact_email: string;
}

const PaymentPortal = () => {
  const { mikrotikId } = useParams();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wifiSettings, setWifiSettings] = useState<WiFiSettings>({
    hotspot_title: "WiFi Portal",
    description: "Select a package and pay to connect",
    theme_color: "#3b82f6",
    contact_phone: "",
    contact_email: ""
  });

  useEffect(() => {
    loadPortalData();
  }, [mikrotikId]);

  const loadPortalData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      logger.debug('Loading portal data for mikrotikId:', mikrotikId);

      // First get the admin_id from the mikrotik
      const { data: mikrotikData, error: mikrotikError } = await supabase
        .from('mikrotiks')
        .select('admin_id')
        .eq('router_id', mikrotikId)
        .single();

      if (mikrotikError || !mikrotikData) {
        logger.error('Mikrotik not found:', mikrotikError);
        setError('Router not found. Please check the portal URL.');
        setIsLoading(false);
        return;
      }

      logger.debug('Mikrotik found, admin_id:', mikrotikData.admin_id);

      // Load wifi_settings for this admin
      const { data: settings, error: settingsError } = await supabase
        .from('wifi_settings')
        .select('hotspot_title, description, theme_color, contact_phone, contact_email')
        .eq('admin_id', mikrotikData.admin_id)
        .maybeSingle();

      if (settingsError) {
        logger.error('Error loading wifi_settings:', settingsError);
      }

      if (settings) {
        setWifiSettings({
          hotspot_title: settings.hotspot_title || "WiFi Portal",
          description: settings.description || "Select a package and pay to connect",
          theme_color: settings.theme_color || "#3b82f6",
          contact_phone: settings.contact_phone || "",
          contact_email: settings.contact_email || ""
        });
        logger.debug('WiFi settings loaded:', settings);
      }

      // Load packages for this admin (hotspot packages only)
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('admin_id', mikrotikData.admin_id)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (packagesError) {
        logger.error('Error loading packages:', packagesError);
        setError('Unable to load packages');
      } else {
        logger.debug('Packages loaded:', packagesData?.length || 0);
        setPackages(packagesData || []);
      }
    } catch (error) {
      logger.error('Error loading portal data:', error);
      setError('Failed to load portal data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPackage) {
      toast.error("Please select a package");
      return;
    }

    if (!phoneNumber || !/^(\+254|0)[17]\d{8}$/.test(phoneNumber)) {
      toast.error("Please enter a valid phone number (e.g., 0712345678)");
      return;
    }

    setIsProcessing(true);

    try {
      const pkg = packages.find(p => p.id === selectedPackage);
      if (!pkg) throw new Error("Package not found");

      const formattedPhone = phoneNumber.startsWith("+254")
        ? phoneNumber.substring(1)
        : phoneNumber.startsWith("0")
        ? "254" + phoneNumber.substring(1)
        : phoneNumber;

      // Get mikrotik info for payment
      const { data: mikrotikData } = await supabase
        .from('mikrotiks')
        .select('id, admin_id, mpesa_type, mpesa_number')
        .eq('router_id', mikrotikId)
        .single();

      if (!mikrotikData) {
        throw new Error("Router not found");
      }

      logger.debug('Mikrotik data:', mikrotikData);

      if (!mikrotikData.mpesa_type || !mikrotikData.mpesa_number) {
        logger.error('M-Pesa configuration missing:', {
          mpesa_type: mikrotikData.mpesa_type,
          mpesa_number: mikrotikData.mpesa_number
        });
        throw new Error("M-Pesa not configured. Please contact the administrator.");
      }

      // Prepare payment data
      const paymentData = {
        phone: formattedPhone,
        amount: pkg.price,
        packageId: pkg.id,
        packageName: pkg.name,
        adminId: mikrotikData.admin_id,
        mikrotikId: mikrotikData.id,
        mpesaType: mikrotikData.mpesa_type,
        mpesaNumber: mikrotikData.mpesa_number
      };

      logger.debug('Sending to STK push:', paymentData);

      // Initiate STK Push using direct fetch to get full error details
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      logger.debug('Using Supabase URL:', supabaseUrl);
      logger.debug('Using key prefix:', supabaseKey ? supabaseKey.substring(0, 50) + '...' : 'NO KEY');
      
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/mpesa-stk-push`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'X-Client-Info': 'payment-portal'
          },
          body: JSON.stringify(paymentData)
        });

        const result = await response.json();

        logger.debug('STK push response:', {
          status: response.status,
          ok: response.ok,
          data: result
        });

        if (!response.ok) {
          const errorMsg = result?.error || result?.message || `HTTP ${response.status}: ${response.statusText}`;
          logger.error('STK Push failed - full response:', result);
          throw new Error(errorMsg);
        }

        if (!result?.success) {
          logger.error('STK Push failed - not successful:', result);
          throw new Error(result?.error || 'STK Push failed');
        }

        toast.success(result.message || "Check your phone! Enter M-Pesa PIN to complete payment");

        // Poll for payment completion
        if (result.payment_id) {
          pollPaymentStatus(result.payment_id);
        }
        
      } catch (error: any) {
        throw error; // Re-throw to be caught by outer catch
      }

    } catch (error: any) {
      logger.error('Payment error:', error);
      toast.error(error.message || "Payment failed. Please try again");
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (paymentId: string) => {
    const maxAttempts = 30; // 2.5 minutes with 5s intervals
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;

      try {
        // First, check local database
        const { data: payment } = await supabase
          .from('payments')
          .select('status, mpesa_receipt_number, transaction_id')
          .eq('id', paymentId)
          .single();

        logger.debug(`Polling attempt ${attempts}: Payment status =`, payment?.status);

        if (payment?.status === 'completed') {
          clearInterval(poll);
          setPaymentComplete(true);
          toast.success("Payment successful! Internet access is now available");
          setIsProcessing(false);
          return;
        }

        if (payment?.status === 'failed' || payment?.status === 'cancelled') {
          clearInterval(poll);
          toast.error(`Payment ${payment.status}. Please try again.`);
          setIsProcessing(false);
          return;
        }

        // If still pending after 3 attempts, query M-Pesa directly
        if (attempts >= 3 && payment?.transaction_id && payment?.status === 'pending') {
          logger.debug('Querying M-Pesa for payment status...');

          // Get mikrotik info for shortcode
          const { data: mikrotikData } = await supabase
            .from('mikrotiks')
            .select('mpesa_number')
            .eq('router_id', mikrotikId)
            .single();

          const shortcode = mikrotikData?.mpesa_number;
          if (!shortcode) {
            logger.error('M-Pesa shortcode not found in mikrotik configuration');
            return;
          }

          const { data: stkStatus, error: stkError } = await supabase.functions.invoke('check-stk-status', {
            body: {
              transaction_id: payment.transaction_id,
              shortcode: shortcode
            }
          });

          if (stkError) {
            logger.error('STK status query error:', stkError);
          } else if (stkStatus?.success) {
            logger.debug('STK status query result:', stkStatus.status);
            
            if (stkStatus.status === 'completed') {
              // Payment completed!
              clearInterval(poll);
              setPaymentComplete(true);
              toast.success("Payment successful! Internet access is now available");
              setIsProcessing(false);
              return;
            } else if (stkStatus.status === 'cancelled' || stkStatus.status === 'failed') {
              clearInterval(poll);
              toast.error(`Payment ${stkStatus.status}: ${stkStatus.resultDesc || 'Please try again'}`);
              setIsProcessing(false);
              return;
            }
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          toast.info("Payment verification timeout. Contact support if you were charged.", {
            duration: 10000
          });
          setIsProcessing(false);
        }
      } catch (error) {
        logger.error('Polling error:', error);
      }
    }, 5000); // Check every 5 seconds
  };

  const getGradientBackground = (color: string) => {
    // Convert hex to rgba for gradient
    return `linear-gradient(135deg, ${color}15 0%, #f3f4f6 100%)`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: getGradientBackground(wifiSettings.theme_color) }}>
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin" style={{ color: wifiSettings.theme_color }} />
              <p className="text-muted-foreground">Loading portal...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: getGradientBackground(wifiSettings.theme_color) }}>
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#ef4444' }}>
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-red-600">Portal Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: getGradientBackground(wifiSettings.theme_color) }}>
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: wifiSettings.theme_color }}>
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>Internet access is now available</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-sm text-green-700 ml-2">
                Your device is now connected to the internet. You can close this page and start browsing.
              </AlertDescription>
            </Alert>
            <Button onClick={() => window.location.reload()} className="w-full" style={{ backgroundColor: wifiSettings.theme_color }}>
              Buy Another Package
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manual verification function for demo purposes
  const handleManualVerification = async () => {
    if (!selectedPackage) {
      toast.error("Please select a package first");
      return;
    }

    try {
      // Get mikrotik info for payment verification
      const { data: mikrotikData } = await supabase
        .from('mikrotiks')
        .select('id, admin_id, mpesa_number')
        .eq('router_id', mikrotikId)
        .single();

      if (!mikrotikData) {
        throw new Error("Router not found");
      }

      const { data: recentPayment } = await supabase
        .from('payments')
        .select('transaction_id, status')
        .eq('admin_id', mikrotikData.admin_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!recentPayment?.transaction_id) {
        toast.error("No recent payment found");
        return;
      }

      toast.info("Verifying payment with M-Pesa...");

      const { data, error } = await supabase.functions.invoke('check-stk-status', {
        body: {
          transaction_id: recentPayment.transaction_id,
          shortcode: mikrotikData.mpesa_number
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        if (data.status === 'completed') {
          setPaymentComplete(true);
          toast.success("Payment verified! Internet access is now available");
        } else {
          toast.error(`Payment status: ${data.status}. ${data.resultDesc || ''}`);
        }
      } else {
        toast.error(data?.error || "Verification failed");
      }
    } catch (error: any) {
      logger.error('Manual verification error:', error);
      toast.error(error.message || "Verification failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: getGradientBackground(wifiSettings.theme_color) }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: wifiSettings.theme_color }}>
              <Wifi className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: wifiSettings.theme_color }}>
            {wifiSettings.hotspot_title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {wifiSettings.description}
          </p>
        </div>

        {/* Package Selection */}
        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Choose Package & Pay</CardTitle>
            <CardDescription className="text-xs">Select a package and enter your M-Pesa number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Package Selection */}
            <div className="space-y-2">
              <Label>Internet Package</Label>
              <div className="grid grid-cols-2 gap-2">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all text-center ${
                      selectedPackage === pkg.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-sm">{pkg.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{pkg.duration}</p>
                    <p className="text-sm font-bold mt-1" style={{ color: selectedPackage === pkg.id ? wifiSettings.theme_color : undefined }}>
                      {formatKES(pkg.price)}
                    </p>
                  </div>
                ))}
              </div>
              {packages.length === 0 && (
                <p className="text-center text-gray-500 py-4 text-sm">No packages available</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label>M-Pesa Phone Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="0712345678"
                  className="pl-10"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handlePayment}
              disabled={!selectedPackage || isProcessing}
              className="w-full text-lg font-semibold py-6"
              size="lg"
              style={{ backgroundColor: wifiSettings.theme_color }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-5 w-5" />
                  Pay {selectedPackage ? formatKES(packages.find(p => p.id === selectedPackage)?.price || 0) : ''}
                </>
              )}
            </Button>

            {/* Manual Verification Button (for demo) */}
            {isProcessing && (
              <Button
                onClick={handleManualVerification}
                variant="outline"
                className="w-full"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify Payment Now
              </Button>
            )}

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-700">
                After clicking "Pay", check your phone and enter your M-Pesa PIN to complete the payment
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Footer */}
        {(wifiSettings.contact_phone || wifiSettings.contact_email) && (
          <div className="text-center mt-6 text-xs text-muted-foreground">
            {wifiSettings.contact_phone && <p>Contact: {wifiSettings.contact_phone}</p>}
            {wifiSettings.contact_email && <p className="mt-1">Email: {wifiSettings.contact_email}</p>}
            <p className="mt-2">{wifiSettings.hotspot_title}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPortal;
