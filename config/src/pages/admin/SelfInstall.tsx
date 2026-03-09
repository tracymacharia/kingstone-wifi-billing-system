import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Router,
  Download,
  Terminal,
  Copy,
  Check,
  AlertTriangle,
  Settings,
  ChevronRight,
  Loader2,
  Shield,
  Clock
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

interface ScriptGenerationData {
  routerId: string;
  routerName: string;
  scriptPath: string;
  signedUrl: string;
  fetchCommand: string;
  mikrotikId: string;
  expiresAt: string;
}

const AdminSelfInstall = () => {
  const { routerId } = useParams<{ routerId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [scriptData, setScriptData] = useState<ScriptGenerationData | null>(null);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  useEffect(() => {
    if (routerId) {
      // Load existing script data if routerId is provided
      loadExistingScript(routerId);
    } else {
      setLoading(false);
    }
  }, [routerId]);

  // Countdown timer for URL expiration
  useEffect(() => {
    if (!scriptData?.expiresAt) return;

    const updateCountdown = () => {
      const expires = new Date(scriptData.expiresAt).getTime();
      const now = Date.now();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scriptData?.expiresAt]);

  const loadExistingScript = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('mikrotiks')
        .select('*')
        .eq('router_id', id)
        .eq('admin_id', user?.id)
        .single();

      if (data && data.script_path) {
        // Generate a new signed URL
        const { data: urlData } = await supabase.storage
          .from('mikrotik-scripts')
          .createSignedUrl(data.script_path, 900);

        if (urlData) {
          setScriptData({
            routerId: data.router_id || '',
            routerName: data.router_name || data.name || '',
            scriptPath: data.script_path,
            signedUrl: urlData.signedUrl,
            fetchCommand: `/tool fetch url="${urlData.signedUrl}" dst-path=Kingstone.rsc mode=https`,
            mikrotikId: data.id,
            expiresAt: new Date(Date.now() + 900000).toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error loading script:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScript = async () => {
    try {
      setGenerating(true);

      // Check if user is authenticated
      if (!user) {
        toast.error('Please login to generate scripts');
        navigate('/admin');
        return;
      }


      // Get the session token manually
      const sessionToken = sessionStorage.getItem('kingstone_session_token');

      // Get current session from Supabase auth
      const { data: { session } } = await supabase.auth.getSession();
      
      const tokenToUse = session?.access_token || sessionToken;

      if (!tokenToUse) {
        toast.error('No authentication token found. Please login again.');
        navigate('/admin');
        return;
      }

      // Call Edge Function with explicit authorization and session token
      const response = await fetch(
        'https://hloxkbcxpolhshegjjou.supabase.co/functions/v1/generate-mikrotik-script',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenToUse}`,
            'X-Session-Token': tokenToUse,  // Pass session token for custom auth
            'X-User-ID': user.id,  // Pass user ID directly as header
            'X-User-Email': user.email || '',
          },
          body: JSON.stringify({
            routerName: `Kingstone-Router-${user?.email?.split('@')[0] || 'Admin'}`,
            billingServerUrl: window.location.origin,
            apiPort: 8728,
            // Also include in body as backup
            adminId: user.id,
            adminEmail: user.email,
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('Edge Function error:', result);
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/admin');
        } else {
          toast.error(result.error || 'Failed to generate script');
        }
        return;
      }

      if (result.success) {
        setScriptData(result);
        toast.success('Script generated successfully!');
      } else {
        throw new Error(result.error || 'Failed to generate script');
      }
    } catch (error: any) {
      console.error('Generate script error:', error);
      toast.error(error.message || 'Failed to generate script');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegisterRouter = async () => {
    try {
      setRegistering(true);

      const { data, error } = await supabase.functions.invoke('register-mikrotik', {
        body: {
          mikrotikId: scriptData?.mikrotikId
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast.success('Router registered successfully!');
        navigate('/admin/mikrotiks/list');
      } else {
        throw new Error(data.error || 'Failed to register router');
      }
    } catch (error: any) {
      console.error('Register router error:', error);
      toast.error(error.message || 'Failed to register router');
    } finally {
      setRegistering(false);
    }
  };

  const copyToClipboard = async (text: string, stepId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStep(stepId);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedStep(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleBack = () => {
    navigate('/admin/mikrotiks');
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AdminSidebar onLogout={handleLogout} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col w-full">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 gap-2">
            <SidebarTrigger className="shrink-0" />
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Router className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold truncate">Self Install</h1>
                <p className="text-xs text-muted-foreground truncate">
                  {scriptData ? `Profile: ${scriptData.routerId}.rsc` : 'Generate configuration script'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {!scriptData ? (
              // Generate Script View
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Generate Configuration Script
                  </CardTitle>
                  <CardDescription>
                    Create a MikroTik configuration script for self-installation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">What will be generated?</p>
                        <ul className="text-xs text-blue-700 mt-2 space-y-1">
                          <li>• Unique router ID (INVOMXXXXXX)</li>
                          <li>• Hotspot configuration script</li>
                          <li>• API and SSL settings</li>
                          <li>• Billing system integration</li>
                          <li>• Automatic heartbeat monitoring</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerateScript} 
                    disabled={generating}
                    className="w-full"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Script...
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4 mr-2" />
                        Generate Configuration Script
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              // Script Generated View
              <>
                {/* Status Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      Profile already generated on server
                    </CardTitle>
                    <CardDescription>
                      Your configuration files have been generated. Follow these steps to configure your MikroTik router.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Router ID</p>
                        <p className="text-sm font-mono font-medium">{scriptData.routerId}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Router Name</p>
                        <p className="text-sm font-medium">{scriptData.routerName}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">URL Expires In</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <p className={`text-sm font-medium ${timeRemaining === 'Expired' ? 'text-red-600' : ''}`}>
                            {timeRemaining}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 1 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-8 h-8 rounded-full p-0 items-center justify-center">1</Badge>
                      <CardTitle>Download Script</CardTitle>
                    </div>
                    <CardDescription>
                      Download the configuration script to your MikroTik router
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Winbox Terminal Command</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(scriptData.fetchCommand, 'step1')}
                        >
                          {copiedStep === 'step1' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm overflow-x-auto">
                        <code>{scriptData.fetchCommand}</code>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>Copy this command and paste it into your MikroTik Winbox terminal</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-8 h-8 rounded-full p-0 items-center justify-center">2</Badge>
                      <CardTitle>Import Configuration</CardTitle>
                    </div>
                    <CardDescription>
                      Import the downloaded script to apply configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Winbox Terminal Command</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard('/import Kingstone.rsc', 'step2')}
                        >
                          {copiedStep === 'step2' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm">
                        <code>/import Kingstone.rsc</code>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>Run this command in Winbox terminal after the script has been downloaded</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Troubleshooting */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      Troubleshoot — "device mode not allowed"
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Some newer MikroTik models (e.g., hAP lite, RB951) ship in <strong>Home mode</strong> which blocks advanced configuration.
                      If you see <strong>"device mode not allowed"</strong>, switch the router to <strong>Advanced mode</strong>, then rerun Step 1 and Step 2.
                    </p>
                    
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-800">Run in MikroTik Terminal:</p>
                      </div>
                      <div className="bg-black text-green-400 p-3 rounded-md font-mono text-sm overflow-x-auto">
                        <code>/system device-mode update mode=advanced</code>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-amber-800">Instructions:</p>
                        <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                          <li>Run the command above in MikroTik terminal</li>
                          <li>Power off the router</li>
                          <li>Power on the router</li>
                          <li>Repeat Step 1 and Step 2</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Register Button */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Ready to complete setup?</p>
                        <p className="text-sm text-muted-foreground">
                          Register this router in the billing system after configuration
                        </p>
                      </div>
                      <Button 
                        onClick={handleRegisterRouter} 
                        disabled={registering || timeRemaining === 'Expired'}
                        size="lg"
                        className="gap-2"
                      >
                        {registering ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          <>
                            NEXT — Add Router to Billing System
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminSelfInstall;
