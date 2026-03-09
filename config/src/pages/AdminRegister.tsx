import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { SteppedForm } from '@/components/ui/stepped-form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, User, Mail, Phone, Building2, UserRound, Lock, CheckCircle } from 'lucide-react';

// Define schema for validation
const adminRegisterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(
    /^(\+254|0)[17]\d{8}$/,
    "Phone number must be a valid Kenyan format (e.g., 0712345678 or +254712345678)"
  ),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/\d/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  ownerId: z.string().min(1, "Owner ID is required"),
  subscriptionType: z.enum(['hotspot', 'pppoe', 'static', 'both', 'hotspot_pppoe', 'hotspot_static'])
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AdminRegisterForm = z.infer<typeof adminRegisterSchema>;

const AdminRegister = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formInitialized, setFormInitialized] = useState(false);
  const [resolvedOwnerId, setResolvedOwnerId] = useState<string>("");

  // Initialize the form state when component mounts
  useEffect(() => {
    const ownerIdParam = searchParams.get('ownerId');
    const numericOwnerIdParam = searchParams.get('numericOwnerId');

    // If neither parameter is provided, mark as initialized
    if (!ownerIdParam && !numericOwnerIdParam) {
      setFormInitialized(true);
      return;
    }

    // If ownerId is provided directly, use it and mark as initialized
    if (ownerIdParam) {
      setResolvedOwnerId(ownerIdParam);
      setFormInitialized(true);
      return;
    }

    // If numericOwnerId is provided, we'll resolve it later
    if (numericOwnerIdParam) {
      // Don't set as initialized yet, we're waiting for resolution
      setResolvedOwnerId(''); // Will be resolved after fetching
    }
  }, []); // Empty dependency array to run only once on mount

  // Resolve numeric owner ID to UUID if provided
  useEffect(() => {
    const ownerIdParam = searchParams.get('ownerId');
    const numericOwnerIdParam = searchParams.get('numericOwnerId');

    // If neither parameter is provided, form is already initialized
    if (!ownerIdParam && !numericOwnerIdParam) {
      return;
    }

    // If ownerId is provided directly, use it
    if (ownerIdParam) {
      setResolvedOwnerId(ownerIdParam);
      return;
    }

    // If numericOwnerId is provided, resolve it
    if (numericOwnerIdParam) {
      const resolveNumericId = async () => {
        try {
          const numericId = parseInt(numericOwnerIdParam);
          if (isNaN(numericId)) {
            toast.error('Invalid numeric owner ID provided');
            setFormInitialized(true); // Mark as initialized even if there's an error
            return;
          }

          const { data, error } = await supabase
            .rpc('get_owner_id_by_numeric', { numeric_id: numericId });

          if (error) {
            console.error('Error resolving numeric owner ID:', error);
            toast.error('Invalid numeric owner ID provided');
          } else if (data && data.length > 0) {
            setResolvedOwnerId(data[0]);
          } else {
            toast.error('Owner not found with provided numeric ID');
          }
        } catch (error) {
          console.error('Error resolving numeric owner ID:', error);
          toast.error('Failed to resolve numeric owner ID');
        } finally {
          // Always mark as initialized after attempting resolution
          setFormInitialized(true);
        }
      };

      resolveNumericId();
    }
  }, [searchParams]);

  const form = useForm<AdminRegisterForm>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      businessName: "",
      username: "",
      password: "",
      confirmPassword: "",
      ownerId: resolvedOwnerId,
      subscriptionType: 'hotspot',
    },
  });

  // Update form values when resolvedOwnerId changes
  useEffect(() => {
    if (resolvedOwnerId) {
      form.setValue('ownerId', resolvedOwnerId);
    }
  }, [resolvedOwnerId, form]);

  const onSubmit = async (data: AdminRegisterForm) => {
    setLoading(true);

    try {
      // Use the resolvedOwnerId if available, otherwise use the form's ownerId
      const ownerIdToSend = resolvedOwnerId || data.ownerId;

      // Validate that we have an owner ID to send
      if (!ownerIdToSend || ownerIdToSend.trim() === '') {
        toast.error('Owner ID is required to register. Please enter the Owner ID provided by your system owner.');
        setLoading(false);
        return;
      }


      // Call the register-admin edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken()}`
        },
        body: JSON.stringify({
          full_name: data.fullName,
          phone: data.phone,
          email: data.email,
          business_name: data.businessName,
          username: data.username,
          password: data.password,
          subscription_type: data.subscriptionType === 'both' || data.subscriptionType === 'hotspot_pppoe' || data.subscriptionType === 'hotspot_static' ? 'ppoe_static' : data.subscriptionType,
          owner_id: ownerIdToSend
        })
      });

      const result = await response.json();


      if (!response.ok) {
        console.error('Registration error:', result.error, result.details);
        throw new Error(result.error || 'Failed to register admin');
      }

      if (result.success) {
        setIsSuccess(true);
        toast.success('Admin registered successfully! Please make payment to activate your account.');

        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      } else {
        console.error('Registration failed:', result.error);
        toast.error(result.error || 'Failed to register admin');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const getAccessToken = async () => {
    return sessionStorage.getItem('kingstone_session_token') || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  };

  const handleNext = () => {
    if (currentStep === 2) {
      form.handleSubmit(onSubmit)();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const { fullName, email, phone, businessName, username, password, confirmPassword, ownerId } = form.getValues();

    // Don't allow proceeding to step 2 if we're still resolving numeric ID
    const numericOwnerIdParam = searchParams.get('numericOwnerId');
    const isResolvingNumericId = numericOwnerIdParam && resolvedOwnerId === '';
    if (isResolvingNumericId && currentStep === 2) {
      return false;
    }

    switch (currentStep) {
      case 0:
        return fullName.trim() !== "" && email.trim() !== "" && phone.trim() !== "" && businessName.trim() !== "";
      case 1:
        return username.trim() !== "" && password.trim() !== "" && confirmPassword.trim() !== "" && password === confirmPassword;
      case 2:
        // Ensure ownerId is not empty and we're not in the middle of resolving
        const ownerIdValue = resolvedOwnerId || ownerId;
        return ownerIdValue && ownerIdValue.trim() !== "" && !isResolvingNumericId;
      default:
        return false;
    }
  };

  if (isSuccess) {
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

        <div className="glass-card rounded-2xl p-8 w-full max-w-md animate-scale-in relative z-10">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto animate-glow">
              <CheckCircle className="w-8 h-8 text-accent-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                Success!
              </h2>
              <p className="text-muted-foreground">
                Admin registered successfully! Redirecting to login...
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    {
      title: "Personal Info",
      description: "Tell us about yourself and your business",
      content: (
        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      disabled={loading}
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      disabled={loading}
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    Phone Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="0712345678 or +254712345678"
                      disabled={loading}
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Business Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter business name"
                      disabled={loading}
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      ),
    },
    {
      title: "Credentials",
      description: "Set up your login credentials",
      content: (
        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <UserRound className="w-4 h-4 text-primary" />
                    Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter username"
                      disabled={loading}
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    Password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Minimum 8 characters, 1 uppercase, 1 number"
                      disabled={loading}
                      showStrengthIndicator
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Re-enter your password"
                      disabled={loading}
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      ),
    },
    {
      title: "Account Setup",
      description: "Provide owner ID and subscription type",
      content: (
        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter owner ID provided by your owner"
                      disabled={loading}
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact your system owner to get the Owner ID to register under their business.
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subscriptionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hotspot">Hotspot</SelectItem>
                      <SelectItem value="pppoe">PPPoE</SelectItem>
                      <SelectItem value="static">Static</SelectItem>
                      <SelectItem value="both">Both PPPoE & Static</SelectItem>
                      <SelectItem value="hotspot_pppoe">Hotspot & PPPoE</SelectItem>
                      <SelectItem value="hotspot_static">Hotspot & Static</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      ),
    },
  ];

  const ownerIdParam = searchParams.get('ownerId');
  const numericOwnerIdParam = searchParams.get('numericOwnerId');
  const codeParam = searchParams.get('code');

  // Block access entirely if there is no invitation in the URL
  if (!ownerIdParam && !numericOwnerIdParam && !codeParam) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Invitation Required</h2>
          <p className="text-gray-400 mb-6">
            Admin registration requires an invitation link from a platform owner. 
            Contact your service provider or visit the platform to request access.
          </p>
          <Link to="/" className="text-blue-400 hover:text-blue-300 underline text-sm">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Show loading state while resolving numeric owner ID
  const isResolvingNumericId = numericOwnerIdParam && resolvedOwnerId === '';

  if (isResolvingNumericId) {
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

        <div className="flex flex-col items-center space-y-4 relative z-10">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-muted-foreground">Resolving owner ID...</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            If this takes too long, please refresh the page or contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col hide-scrollbar bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30 relative overflow-hidden">
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

      <div className="flex-grow flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-full sm:max-w-lg">
          <SteppedForm
            title="Admin Self-Registration"
            description="Sign up as a new administrator"
            steps={steps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isLoading={loading}
            canProceed={canProceed()}
            additionalFooter={
              <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
                <Button variant="ghost" size="sm" asChild className="hover-lift flex-1">
                  <Link to="/" className="flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Link>
                </Button>

                <Button variant="ghost" size="sm" asChild className="hover-lift flex-1">
                  <Link to="/admin" className="flex items-center justify-center">
                    Already have an account?
                  </Link>
                </Button>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;