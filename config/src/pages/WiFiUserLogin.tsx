import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Eye, EyeOff, Wifi, Smartphone, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WiFiUserLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if user already has an active session
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('broadband_users')
          .select('id')
          .eq('username', session.user.email)
          .single();

        if (userData) {
          navigate(`/client/demo`); // Use demo mode for now
        }
      }
    };

    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      setIsLoading(false);
      return;
    }

    try {
      
      // Authenticate WiFi user by checking credentials in database
      // This does NOT use the admin session - it's a separate authentication
      const { data, error } = await supabase.rpc('authenticate_wifi_user', {
        p_username: username,
        p_password: password
      });

      if (error) {
        console.error('Database error:', error);
        setError('Invalid username or password');
        setIsLoading(false);
        return;
      }


      if (!data || data.length === 0 || !data[0].success) {
        const errorMsg = data?.[0]?.message || 'Invalid username or password';
        console.error('Authentication failed:', errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Authentication successful
      const result = data[0];
      setLoginSuccess(true);
      toast.success('Login successful! Redirecting to portal...');

      // Store user session info
      sessionStorage.setItem('wifi_user_id', result.user_id);
      sessionStorage.setItem('wifi_username', username);
      sessionStorage.setItem('wifi_user_type', result.user_type);
      sessionStorage.setItem('wifi_portal_token', result.portal_token);

      // Redirect to client portal after a brief delay
      setTimeout(() => {
        // Use the portal_token for direct access
        navigate(`/client/${result.portal_token}`);
      }, 1500);

    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.1)_0%,_transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(139,92,246,0.1)_0%,_transparent_70%)]"></div>
      </div>

      {/* Floating WiFi Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10 animate-pulse"
            style={{
              width: `${Math.random() * 80 + 40}px`,
              height: `${Math.random() * 80 + 40}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, ${i % 3 === 0 ? 'rgba(59, 130, 246, 0.2)' : i % 3 === 1 ? 'rgba(139, 92, 246, 0.2)' : 'rgba(14, 165, 233, 0.2)'}, transparent)`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              animationDelay: `${Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wifi className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Client Portal Login</h1>
          <p className="text-muted-foreground">
            Access your WiFi account dashboard
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="border-border/50 shadow-lg bg-white/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold text-center">WiFi User Login</CardTitle>
            <CardDescription className="text-center">
              Use the same credentials you use to configure your home router
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loginSuccess ? (
              <div className="space-y-4 py-6">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <CheckCircle className="h-16 w-16 text-green-600 animate-pulse" />
                  <p className="text-lg font-semibold text-green-600">Login Successful!</p>
                  <p className="text-sm text-muted-foreground">Redirecting to your portal...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your WiFi username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Eye className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your WiFi password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Wifi className="mr-2 h-4 w-4" />
                      Login to Portal
                    </>
                  )}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-muted-foreground">Need help?</span>
                  </div>
                </div>

                <div className="text-sm text-center space-y-2">
                  <p className="text-muted-foreground">
                    Don't have an account? Contact your ISP administrator
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToHome}
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-800">
                    <strong>ℹ️ Login Credentials:</strong><br />
                    Use the same username and password that was provided to you by your ISP administrator.
                    These are the credentials you use to configure your PPPoE/Static IP router settings.
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Features Section */}
        <Card className="border-border/50 shadow-md bg-white/60 backdrop-blur">
          <CardContent className="py-6">
            <h3 className="text-sm font-semibold text-center mb-4 text-gray-700">
              What you can do in the portal
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>View account status</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Check data usage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>View connection details</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Pay bills online</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Download invoices</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Submit support tickets</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WiFiUserLogin;
