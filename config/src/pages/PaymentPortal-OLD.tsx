import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KingstoneIcon } from "@/components/ui/Kingstone-icon";
import {
  CreditCard,
  Clock,
  Zap,
  CheckCircle,
  Loader2,
  Smartphone,
  Router,
  Shield,
  Calendar,
  CalendarDays,
  QrCode,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Key,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/utils";

interface Package {
  id: string;
  name: string;
  duration: string;
  price: number;
  bandwidth: string;
  type: 'hotspot' | 'pppoe' | 'static';
  packageType: 'hourly' | 'daily' | 'monthly';
  popular?: boolean;
}

interface ClientInfo {
  mac: string;
  ip: string;
  routerId: string;
  linkLogin: string;
  linkOrig: string;
}

const PaymentPortal = () => {
  const { mikrotikId } = useParams();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [mpesaMessage, setMpesaMessage] = useState("");
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [reconnectPhone, setReconnectPhone] = useState("");
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [trialTaken, setTrialTaken] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    mac: '',
    ip: '',
    routerId: '',
    linkLogin: '',
    linkOrig: ''
  });
  const [mikrotikInfo, setMikrotikInfo] = useState({
    name: "Kingstone WiFi",
    location: "Nairobi Central"
  });

  useEffect(() => {
    
    // Extract client information from URL parameters
    const clientData: ClientInfo = {
      mac: searchParams.get('mac') || 'Unknown',
      ip: searchParams.get('ip') || 'Unknown',
      routerId: searchParams.get('router_id') || mikrotikId || 'Unknown',
      linkLogin: searchParams.get('link_login') || '',
      linkOrig: searchParams.get('link_orig') || ''
    };

    setClientInfo(clientData);

    // Set mikrotik info based on router ID
    if (clientData.routerId) {
      setMikrotikInfo({
        name: `Kingstone WiFi - ${clientData.routerId}`,
        location: clientData.ip ? `Network: ${clientData.ip.split('.').slice(0, 3).join('.')}.0/24` : "Nairobi Central"
      });
    }

    // Check for existing session (auto-reconnection)
    checkExistingSession(clientData);

    // Load packages based on router configuration - only hotspot packages for payment portal
    loadHotspotPackages();
  }, [mikrotikId, searchParams]);

  const loadHotspotPackages = async () => {
    
    try {
      // Get mikrotik info first to find the admin
      const { data: mikrotik, error: mikrotikError } = await supabase
        .from('mikrotiks')
        .select('admin_id')
        .eq('router_id', clientInfo.routerId)
        .single();

      if (mikrotikError || !mikrotik) {
        // Fallback to mock data if mikrotik not found - HOTSPOT PACKAGES ONLY
        const fallbackPackages = [
          {
            id: 'pkg001',
            name: 'Quick Browse',
            duration: '30 minutes',
            price: 0,
            bandwidth: '3 Mbps',
            type: 'hotspot' as const,
            packageType: 'hourly' as const
          },
          {
            id: 'pkg002',
            name: 'Basic Hour',
            duration: '1 hour',
            price: 0,
            bandwidth: '5 Mbps',
            type: 'hotspot' as const,
            packageType: 'hourly' as const,
            popular: true
          }
        ];
        setPackages(fallbackPackages);
        // Set default selection to first package
        setSelectedPackage(fallbackPackages[0].id);
        return;
      }

      // Load ONLY HOTSPOT packages for this admin (exclude pppoe and static)
      const { data: packageData, error } = await supabase
        .from('packages')
        .select('*')
        .eq('admin_id', mikrotik.admin_id)
        .eq('package_type', 'hotspot') // ONLY HOTSPOT
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error loading hotspot packages:', error);
        // Use fallback on error
        const fallbackPackages = [
          {
            id: 'pkg001',
            name: 'Quick Browse',
            duration: '30 minutes',
            price: 0,
            bandwidth: '3 Mbps',
            type: 'hotspot' as const,
            packageType: 'hourly' as const
          }
        ];
        setPackages(fallbackPackages);
        setSelectedPackage(fallbackPackages[0].id);
        return;
      }

      if (packageData && packageData.length > 0) {
        const formattedPackages = packageData.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          duration: `${pkg.duration_value} ${pkg.duration_type}`,
          price: Number(pkg.price),
          bandwidth: `${pkg.download_speed_mbps || 10} Mbps`,
          type: 'hotspot' as const,
          packageType: (pkg.duration_type === 'minutes' || pkg.duration_type === 'hours' ? 'hourly' :
                      pkg.duration_type === 'days' ? 'daily' : 'monthly') as 'hourly' | 'daily' | 'monthly'
        }));
        setPackages(formattedPackages);

        // Set default selection to first package
        setSelectedPackage(formattedPackages[0].id);
      } else {
        // No packages found, use fallback
        const fallbackPackages = [
          {
            id: 'pkg001',
            name: 'Quick Browse',
            duration: '30 minutes',
            price: 0,
            bandwidth: '3 Mbps',
            type: 'hotspot' as const,
            packageType: 'hourly' as const
          }
        ];
        setPackages(fallbackPackages);
        setSelectedPackage(fallbackPackages[0].id);
      }
    } catch (error) {
      console.error('Error loading hotspot packages:', error);
      // Use fallback on any error
      const fallbackPackages = [
        {
          id: 'pkg001',
          name: 'Quick Browse',
          duration: '30 minutes',
          price: 0,
          bandwidth: '3 Mbps',
          type: 'hotspot' as const,
          packageType: 'hourly' as const
        }
      ];
      setPackages(fallbackPackages);
      setSelectedPackage(fallbackPackages[0].id);
    }
  };

  const checkExistingSession = async (clientData: ClientInfo) => {
    try {
      if (clientData.mac === 'Unknown') return;

      // Check localStorage for active session
      const sessionKey = `wifi_session_${clientData.mac}`;
      const savedSession = localStorage.getItem(sessionKey);

      if (savedSession) {
        const session = JSON.parse(savedSession);
        const now = new Date();
        const expiry = new Date(session.expiresAt);

        if (expiry > now) {
          setHasActiveSession(true);
          
          // Try to re-authenticate with Mikrotik
          const { data: mikrotik } = await supabase
            .from('mikrotiks')
            .select('*')
            .eq('router_id', clientData.routerId)
            .single();

          if (mikrotik) {
            // Re-create hotspot user session
            const mikrotikUrl = `http://${mikrotik.ip_address}/rest/ip/hotspot/user`;
            const mikrotikAuth = btoa(`${mikrotik.username}:${mikrotik.password}`);

            await fetch(mikrotikUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${mikrotikAuth}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: session.username,
                password: session.password,
                'profile': 'default',
                'comment': `Auto-reconnect - MAC: ${clientData.mac}`
              }),
            });

            toast.success("Welcome back! You're already connected.");
            
            // Redirect to original page
            if (clientData.linkOrig) {
              setTimeout(() => {
                window.location.href = clientData.linkOrig;
              }, 2000);
            }
          }
        } else {
          // Session expired, clear it
          localStorage.removeItem(sessionKey);
        }
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    }
  };

  const handlePayment = async () => {
    if (!selectedPackage || !phoneNumber) {
      toast.error("Please select a package and enter your phone number");
      return;
    }

    if (!/^254\d{9}$/.test(phoneNumber)) {
      toast.error("Please enter a valid Kenyan phone number (254xxxxxxxxx)");
      return;
    }

    setIsProcessing(true);

    try {
      // For zero-price packages (demo/trial mode), skip payment processing
      if (selectedPkg?.price === 0) {
        // Simulate processing for demo
        await new Promise(resolve => setTimeout(resolve, 2000));

        setPaymentComplete(true);
        toast.success("Access granted! Demo package activated.");

        // Redirect back to original URL or show success
        if (clientInfo.linkOrig) {
          setTimeout(() => {
            window.location.href = clientInfo.linkOrig;
          }, 3000);
        }
        return;
      }

      // Get mikrotik info for the payment
      const { data: mikrotik } = await supabase
        .from('mikrotiks')
        .select('*')
        .eq('router_id', clientInfo.routerId)
        .single();

      if (!mikrotik) {
        toast.error("Router configuration not found");
        return;
      }

      // Process M-Pesa payment via edge function
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: phoneNumber,
          amount: selectedPkg?.price,
          packageId: selectedPackage,
          packageName: selectedPkg?.name,
          packageType: selectedPkg?.packageType,
          durationHours: parseDurationToHours(selectedPkg?.duration || ''),
          mikrotikId: mikrotik.id,
          adminId: mikrotik.admin_id,
          mpesaType: mikrotik.mpesa_type,
          mpesaNumber: mikrotik.mpesa_number
        }
      });

      if (error) {
        console.error('Payment error:', error);
        toast.error("Payment failed. Please try again.");
        return;
      }

      if (data.success) {
        setPaymentComplete(true);
        toast.success("Payment successful! Internet access activated.");

        // Save session for auto-reconnection
        const sessionKey = `wifi_session_${clientInfo.mac}`;
        const sessionDuration = parseDurationToHours(selectedPkg?.duration || '') * 60 * 60 * 1000; // ms
        localStorage.setItem(sessionKey, JSON.stringify({
          username: phoneNumber,
          password: phoneNumber, // Phone number is the password for M-Pesa payments
          expiresAt: new Date(Date.now() + sessionDuration).toISOString(),
          package: selectedPkg?.name,
          routerId: clientInfo.routerId
        }));

        // Redirect back to original URL or show success
        if (clientInfo.linkOrig) {
          setTimeout(() => {
            window.location.href = clientInfo.linkOrig;
          }, 3000);
        }
      } else {
        toast.error(data.error || "Payment failed. Please try again.");
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFreeTrial = async () => {
    setIsProcessing(true);

    try {
      // Check if trial already taken for this device
      const trialKey = `wifi_trial_${clientInfo.mac}`;
      const existingTrial = localStorage.getItem(trialKey);
      
      if (existingTrial) {
        toast.error("You have already used the free trial");
        return;
      }

      // Get mikrotik info
      const { data: mikrotik } = await supabase
        .from('mikrotiks')
        .select('*')
        .eq('router_id', clientInfo.routerId)
        .single();

      if (!mikrotik) {
        toast.error("Router configuration not found");
        return;
      }

      // Create temporary hotspot user for trial (30 minutes)
      const trialUsername = `trial_${clientInfo.mac.replace(/:/g, '')}`;
      const trialPassword = Math.random().toString(36).slice(-8);

      // Create user on Mikrotik
      const mikrotikUrl = `http://${mikrotik.ip_address}/rest/ip/hotspot/user`;
      const mikrotikAuth = btoa(`${mikrotik.username}:${mikrotik.password}`);

      const response = await fetch(mikrotikUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${mikrotikAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trialUsername,
          password: trialPassword,
          'profile': 'default',
          'comment': `Free trial - MAC: ${clientInfo.mac}`,
          'limit-uptime': '30m' // 30 minutes trial
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create trial user');
      }

      // Record trial in localStorage to prevent abuse
      localStorage.setItem(trialKey, JSON.stringify({
        taken: true,
        timestamp: new Date().toISOString(),
        mac: clientInfo.mac
      }));

      setTrialTaken(true);
      setPaymentComplete(true);
      toast.success("Free trial activated! You have 30 minutes of free internet.");

      // Save trial session for auto-reconnection
      const sessionKey = `wifi_session_${clientInfo.mac}`;
      const sessionDuration = 30 * 60 * 1000; // 30 minutes in ms
      localStorage.setItem(sessionKey, JSON.stringify({
        username: trialUsername,
        password: trialPassword,
        expiresAt: new Date(Date.now() + sessionDuration).toISOString(),
        package: 'Free Trial',
        routerId: clientInfo.routerId,
        isTrial: true
      }));

      // Redirect back to original URL
      if (clientInfo.linkOrig) {
        setTimeout(() => {
          window.location.href = clientInfo.linkOrig;
        }, 2000);
      }

    } catch (error) {
      console.error('Trial activation error:', error);
      toast.error("Failed to activate trial. Please try again or purchase a package.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMpesaMessageSubmission = async () => {
    if (!mpesaMessage || !phoneNumber) {
      toast.error("Please enter both M-Pesa message and phone number");
      return;
    }

    if (!/^254\d{9}$/.test(phoneNumber)) {
      toast.error("Please enter a valid Kenyan phone number (254xxxxxxxxx)");
      return;
    }

    // Validate M-Pesa message format (should contain transaction ID)
    const mpesaCodeMatch = mpesaMessage.match(/([A-Z]{2}\d{8,10})/i);
    if (!mpesaCodeMatch) {
      toast.error("Please enter a valid M-Pesa message with transaction code (e.g., QGH009L8K3)");
      return;
    }

    setIsSubmittingMessage(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-mpesa-message', {
        body: {
          mpesaMessage: mpesaMessage.trim(),
          phoneNumber: phoneNumber,
          transactionCode: mpesaCodeMatch[1].toUpperCase(),
          macAddress: clientInfo.mac !== 'Unknown' ? clientInfo.mac : undefined,
          ipAddress: clientInfo.ip !== 'Unknown' ? clientInfo.ip : undefined,
          routerId: clientInfo.routerId
        }
      });

      if (error) {
        console.error('M-Pesa message submission error:', error);
        toast.error(error.message || "Failed to submit message. Please try again.");
        return;
      }

      if (data.success) {
        // Show success with credentials
        toast.success("Payment verified! You have been automatically connected.");
        
        // Show credentials dialog
        const { username, password, autoActivated } = data.data || {};
        
        if (autoActivated) {
          toast.success(`✅ Connected! Username: ${username}, Password: ${password}`);
        }
        
        setMpesaMessage("");
        
        // Clear form after successful submission
        setTimeout(() => {
          setPaymentComplete(true);
        }, 3000);
      } else {
        toast.error(data.error || "Failed to submit message. Please try again.");
      }

    } catch (error) {
      console.error('M-Pesa message submission error:', error);
      toast.error("Failed to submit message. Please try again.");
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  const handlePhoneReconnection = async () => {
    if (!reconnectPhone) {
      toast.error("Please enter your phone number");
      return;
    }

    if (!/^254\d{9}$/.test(reconnectPhone)) {
      toast.error("Please enter a valid Kenyan phone number (254xxxxxxxxx)");
      return;
    }

    setIsReconnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('reconnect-user', {
        body: {
          phoneNumber: reconnectPhone,
          macAddress: clientInfo.mac !== 'Unknown' ? clientInfo.mac : undefined,
          ipAddress: clientInfo.ip !== 'Unknown' ? clientInfo.ip : undefined,
          routerId: clientInfo.routerId
        }
      });

      if (error) {
        console.error('Phone reconnection error:', error);
        toast.error(error.message || "Reconnection failed. Please try again.");
        return;
      }

      if (data.success) {
        toast.success("Reconnection successful! You are now connected.");

        const { username, password } = data.data || {};
        toast.success(`✅ Connected! Username: ${username}, Password: ${password}`);

        // Clear form
        setReconnectPhone("");

        setTimeout(() => {
          setPaymentComplete(true);
        }, 3000);
      } else {
        toast.error(data.error || "Reconnection failed. Please try again.");
      }

    } catch (error) {
      console.error('Phone reconnection error:', error);
      toast.error("Reconnection failed. Please check your credentials and try again.");
    } finally {
      setIsReconnecting(false);
    }
  };

  const parseDurationToHours = (duration: string): number => {
    if (duration.includes('minute')) {
      return parseFloat(duration) / 60;
    } else if (duration.includes('hour')) {
      return parseFloat(duration);
    } else if (duration.includes('day')) {
      return parseFloat(duration) * 24;
    }
    return 1; // default to 1 hour
  };

  const getPackagesByType = (packageType: 'hourly' | 'daily' | 'monthly') => {
    return packages.filter(pkg => pkg.packageType === packageType && pkg.type === 'hotspot');
  };

  const getPackageTypeIcon = (packageType: string) => {
    switch (packageType) {
      case 'hourly':
        return Clock;
      case 'daily':
        return Calendar;
      case 'monthly':
        return CalendarDays;
      default:
        return Clock;
    }
  };

  const selectedPkg = packages.find(pkg => pkg.id === selectedPackage);

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">Access Granted!</CardTitle>
            <CardDescription>
              You now have internet access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800">Package Activated</h3>
              <p className="text-sm text-green-600">
                {selectedPkg?.name} - {selectedPkg?.duration}
              </p>
              <p className="text-sm text-green-600">
                Speed: {selectedPkg?.bandwidth}
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg text-sm">
              <h4 className="font-medium text-blue-800 mb-2">Connection Details</h4>
              <div className="space-y-1 text-blue-600">
                <div className="flex justify-between">
                  <span>Device:</span>
                  <span className="font-mono text-xs">{clientInfo.mac}</span>
                </div>
                <div className="flex justify-between">
                  <span>IP Address:</span>
                  <span className="font-mono">{clientInfo.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span>Router:</span>
                  <span>{clientInfo.routerId}</span>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>You can now browse the internet!</p>
              <p>Session will expire in {selectedPkg?.duration}</p>
              {clientInfo.linkOrig && (
                <p className="mt-2 text-green-600">Redirecting to your original page in 3 seconds...</p>
              )}
            </div>

            {clientInfo.linkOrig ? (
              <>
                <Button
                  onClick={() => window.location.href = clientInfo.linkOrig}
                  className="w-full mb-2"
                >
                  Continue to Website Now
                </Button>
                <Button
                  onClick={() => {
                    setPaymentComplete(false);
                    window.location.reload();
                  }}
                  className="w-full"
                  variant="outline"
                >
                  Stay Here (Buy Another Package)
                </Button>
              </>
            ) : (
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
                variant="outline"
              >
                Buy Another Package
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <KingstoneIcon className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
            {mikrotikInfo.name}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            {mikrotikInfo.location} • Choose your internet package or reconnect
          </p>

          {/* Connection Info */}
          {clientInfo.mac !== 'Unknown' && (
            <div className="mt-6 flex justify-center">
              <Card className="w-full max-w-md shadow-md">
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Router className="w-4 h-4" />
                    <span>Device: {clientInfo.mac}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>IP: {clientInfo.ip}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Free Trial Section */}
          <Card className="border-purple-200 bg-purple-50/50 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 text-base sm:text-xl">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                Try Before You Pay - Free Trial Available!
              </CardTitle>
              <CardDescription className="text-purple-600 text-xs sm:text-sm">
                Get instant access with our free trial - no payment required
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-purple-100">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-sm sm:text-base">Free 30-minute trial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs sm:text-sm text-muted-foreground">No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs sm:text-sm text-muted-foreground">Instant activation</span>
                  </div>
                </div>
                <Button
                  onClick={handleFreeTrial}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
                  size="lg"
                  disabled={isProcessing || trialTaken}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating...
                    </>
                  ) : trialTaken ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Trial Activated
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Start Free Trial
                    </>
                  )}
                </Button>
              </div>
              <Alert className="bg-blue-50 border-blue-200">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 text-xs sm:text-sm">
                  One free trial per device. After trial expires, you can purchase a package to continue.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Package Selection Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Choose Your Internet Package
              </CardTitle>
              <CardDescription>
                Select the perfect internet package for your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage}>
                {/* Hourly Packages */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Hourly Packages
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getPackagesByType('hourly').map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50 ${
                          selectedPackage === pkg.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          setSelectedPackage(pkg.id);
                          setShowPaymentDialog(true);
                        }}
                      >
                        <RadioGroupItem
                          value={pkg.id}
                          id={pkg.id}
                          className="absolute top-4 right-4"
                        />
                        {pkg.popular && (
                          <Badge className="absolute -top-2 left-4 bg-secondary text-secondary-foreground">
                            Most Popular
                          </Badge>
                        )}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">{pkg.name}</h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="w-4 h-4 mr-1" />
                            {pkg.duration}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Zap className="w-4 h-4 mr-1" />
                            {pkg.bandwidth}
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {formatKES(pkg.price)}
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {pkg.packageType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {pkg.type.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getPackagesByType('hourly').length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No hourly packages available
                    </div>
                  )}
                </div>

                {/* Daily Packages */}
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Daily Packages
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getPackagesByType('daily').map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50 ${
                          selectedPackage === pkg.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          setSelectedPackage(pkg.id);
                          setShowPaymentDialog(true);
                        }}
                      >
                        <RadioGroupItem
                          value={pkg.id}
                          id={pkg.id}
                          className="absolute top-4 right-4"
                        />
                        {pkg.popular && (
                          <Badge className="absolute -top-2 left-4 bg-secondary text-secondary-foreground">
                            Most Popular
                          </Badge>
                        )}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">{pkg.name}</h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-1" />
                            {pkg.duration}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Zap className="w-4 h-4 mr-1" />
                            {pkg.bandwidth}
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {formatKES(pkg.price)}
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {pkg.packageType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {pkg.type.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getPackagesByType('daily').length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No daily packages available
                    </div>
                  )}
                </div>

                {/* Monthly Packages */}
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Monthly Packages
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getPackagesByType('monthly').map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50 ${
                          selectedPackage === pkg.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          setSelectedPackage(pkg.id);
                          setShowPaymentDialog(true);
                        }}
                      >
                        <RadioGroupItem
                          value={pkg.id}
                          id={pkg.id}
                          className="absolute top-4 right-4"
                        />
                        {pkg.popular && (
                          <Badge className="absolute -top-2 left-4 bg-secondary text-secondary-foreground">
                            Most Popular
                          </Badge>
                        )}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">{pkg.name}</h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <CalendarDays className="w-4 h-4 mr-1" />
                            {pkg.duration}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Zap className="w-4 h-4 mr-1" />
                            {pkg.bandwidth}
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {formatKES(pkg.price)}
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {pkg.packageType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {pkg.type.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getPackagesByType('monthly').length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No monthly packages available
                    </div>
                  )}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Payment Dialog - Opens when package is selected */}
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <CreditCard className="w-5 h-5" />
                  Complete Your Payment
                </DialogTitle>
                <DialogDescription>
                  Enter your phone number to pay via M-PESA
                </DialogDescription>
              </DialogHeader>
              {selectedPkg && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Selected Package</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Package:</span>
                        <span className="font-medium">{selectedPkg.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{selectedPkg.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <span>{selectedPkg.bandwidth}</span>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-primary">KSh {selectedPkg.price}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone-dialog">Phone Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone-dialog"
                        type="tel"
                        placeholder="254712345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-10"
                        disabled={isProcessing}
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your M-PESA phone number
                    </p>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Secure payment via M-PESA. You will receive a prompt on your phone.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handlePayment}
                    className="w-full"
                    size="lg"
                    disabled={!phoneNumber || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Payment...
                      </>
                    ) : selectedPkg?.price === 0 ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Get Free Access
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay KSh {selectedPkg.price}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* M-Pesa Reconnection Section */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-xl text-green-700">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                Automatic Reconnection (M-Pesa Payment)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-green-600">
                Paid via M-Pesa but not connected? Paste your message and get connected instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs sm:text-sm text-blue-700">
                  <strong>Example M-Pesa Message:</strong><br/>
                  "Confirmed KSh50 sent to Kingstone WiFi. Transaction code QGH009L8K3. New balance KSh100. Time: 12/2/26 2:30 PM"
                </AlertDescription>
              </Alert>

              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs sm:text-sm text-green-700">
                  <strong>✨ Instant Activation!</strong><br/>
                  Your payment will be verified automatically and you'll be connected immediately. 
                  Your username will be your phone number and password will be the transaction code.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="mpesa-message" className="text-xs sm:text-sm">M-Pesa Confirmation Message</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    id="mpesa-message"
                    rows={4}
                    placeholder="Paste your M-Pesa confirmation message here..."
                    value={mpesaMessage}
                    onChange={(e) => setMpesaMessage(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 text-sm sm:text-base"
                    disabled={isSubmittingMessage}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Include the transaction code (e.g., QGH009L8K3)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reconnect-phone" className="text-xs sm:text-sm">Phone Number Used for Payment</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reconnect-phone"
                    type="tel"
                    placeholder="254712345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10 text-sm sm:text-base"
                    disabled={isSubmittingMessage}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This will be your username for login
                </p>
              </div>

              <Button
                onClick={handleMpesaMessageSubmission}
                className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                size="lg"
                disabled={!mpesaMessage || !phoneNumber || isSubmittingMessage}
              >
                {isSubmittingMessage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying & Connecting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Connect Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Phone Reconnection Section */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-xl text-blue-700">
                <Key className="w-4 h-4 sm:w-5 sm:h-5" />
                Lost Connection? Reconnect with Phone Number
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-blue-600">
                If you used a phone number before and lost connection, reconnect instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <UserCheck className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs sm:text-sm text-green-700">
                  <strong>Quick Reconnection:</strong><br/>
                  Use your phone number to reconnect.
                  Your remaining time will be restored automatically.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="reconnect-phone" className="text-xs sm:text-sm">Phone Number</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reconnect-phone"
                    type="tel"
                    placeholder="254712345678"
                    value={reconnectPhone}
                    onChange={(e) => setReconnectPhone(e.target.value)}
                    className="pl-10 text-sm sm:text-base"
                    disabled={isReconnecting}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Phone number used when paying
                </p>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs sm:text-sm text-blue-700">
                  <strong>How it works:</strong><br/>
                  We'll look up your session and restore your connection with remaining time.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handlePhoneReconnection}
                className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
                size="lg"
                disabled={!reconnectPhone || isReconnecting}
              >
                {isReconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reconnecting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reconnect Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center py-6">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Powered by{" "}
              <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Kingstone wifi billing system
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPortal;
