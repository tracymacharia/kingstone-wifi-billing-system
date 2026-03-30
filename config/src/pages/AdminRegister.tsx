import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, User, Mail, Phone, Building2, Lock, Eye, EyeOff } from 'lucide-react';

const AdminRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    businessName: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.fullName || formData.fullName.length < 2) {
      setError('Full name must be at least 2 characters');
      return false;
    }
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email');
      return false;
    }
    if (!formData.phone || !/^(0[17]\d{8}|\+254[17]\d{8}|254[17]\d{8})$/.test(formData.phone)) {
      setError('Please enter a valid Kenyan phone number');
      return false;
    }
    if (!formData.businessName || formData.businessName.length < 2) {
      setError('Business name must be at least 2 characters');
      return false;
    }
    if (!formData.username || formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Use the atomic create_admin_account function for better error handling
      const { data, error } = await supabase.rpc('create_admin_account', {
        p_username: formData.username,
        p_email: formData.email,
        p_phone: formData.phone,
        p_business_name: formData.businessName,
        p_full_name: formData.fullName,
        p_password: formData.password
      });

      if (error) {
        console.error('RPC error:', error);
        setError('Failed to create account: ' + error.message);
        setLoading(false);
        return;
      }

      // Check if the function returned success
      const result = data[0];
      if (!result.success) {
        setError(result.error_message || 'Failed to create account');
        setLoading(false);
        return;
      }

      toast.success('Account created successfully! Please login.');
      navigate('/admin');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30 relative overflow-hidden">
      {/* 3D Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(120,119,198,0.1)_0%,_transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(120,119,198,0.1)_0%,_transparent_70%)]"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20 animate-pulse"
            style={{
              width: `${Math.random() * 100 + 20}px`,
              height: `${Math.random() * 100 + 20}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, ${i % 3 === 0 ? 'rgba(99, 102, 241, 0.3)' : i % 3 === 1 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(8, 145, 178, 0.3)'}, transparent)`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              animationDelay: `${Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Admin Account</h1>
          <p className="text-muted-foreground">Register as a WiFi business administrator</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-center">Business Registration</CardTitle>
            <CardDescription className="text-center">
              Create your admin account to manage your WiFi business
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => updateForm('fullName', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0712345678"
                    value={formData.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Enter your business name"
                    value={formData.businessName}
                    onChange={(e) => updateForm('businessName', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e) => updateForm('username', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    className="pl-10 pr-10"
                    required
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

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateForm('confirmPassword', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Lock className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/admin" className="text-primary hover:underline">
                  Sign In
                </Link>
              </div>

              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            By registering, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
