import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { SteppedForm } from "@/components/ui/stepped-form";
import { Shield, ArrowLeft, User, Mail, Phone, Lock, CheckCircle, Sparkles, MailCheck, Timer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Step 1: Contact Information Schema
const contactSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email").refine(
    (email) => email.endsWith("@gmail.com"),
    "Email must be a valid Gmail address (@gmail.com)"
  ),
  phoneNumber: z.string().regex(
    /^(\+254|0)[17]\d{8}$/,
    "Phone number must be a valid Kenyan format (e.g., 0712345678 or +254712345678)"
  ),
});

// Step 2: Security Schema
const securitySchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/\d/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Step 3: OTP Verification Schema
const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

// Step 4: Terms Acceptance Schema
const termsSchema = z.object({
  acceptTerms: z.boolean().refine(val => val === true, "You must accept the terms and privacy policy"),
});

type ContactForm = z.infer<typeof contactSchema>;
type SecurityForm = z.infer<typeof securitySchema>;
type OTPForm = z.infer<typeof otpSchema>;
type TermsForm = z.infer<typeof termsSchema>;

const OwnerRegister = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpValue, setOtpValue] = useState("");
  const navigate = useNavigate();
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Separate forms for each step
  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
    },
  });

  const securityForm = useForm<SecurityForm>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const otpForm = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const termsForm = useForm<TermsForm>({
    defaultValues: {
      acceptTerms: false,
    },
  });

  // Handle countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [countdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, []);

  // Send OTP to user's email
  const handleSendOtp = async (): Promise<boolean> => {
    const { fullName, email } = contactForm.getValues();

    // Validate contact form first
    const isValid = await contactForm.trigger();
    if (!isValid) {
      toast.error("Please fill in all fields correctly");
      setCurrentStep(0);
      return false;
    }

    // Normalize email to lowercase and trim
    const normalizedEmail = email.trim().toLowerCase();

    setIsSendingOtp(true);
    try {
      // Call the database function to generate and send OTP
      const { data, error } = await supabase.rpc('request_registration_otp', {
        p_email: normalizedEmail,
        p_full_name: fullName.trim(),
      });

      if (error) {
        console.error('OTP request error:', error);
        throw new Error(error.message || 'Failed to send OTP');
      }

      if (!data || !(data as any).success) {
        throw new Error((data as any)?.error || 'Failed to send OTP');
      }

      const otpCode = (data as any)._debug_otp;

      // Call the edge function to actually send the email
      const { error: emailError } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email: normalizedEmail,
          otp: otpCode,
          fullName: fullName.trim(),
        }
      });

      if (emailError) {
        console.error('Email send error:', emailError);
      }

      toast.success('Verification code sent to your email!');
      setOtpSent(true);
      setCountdown(120);
      return true;
    } catch (error: any) {
      console.error('OTP send error:', error);
      toast.error(error.message || 'Failed to send OTP. Please try again.');
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP code
  const handleVerifyOtp = async (): Promise<boolean> => {
    const { otp } = otpForm.getValues();
    const { email } = contactForm.getValues();

    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return false;
    }

    // Normalize email to lowercase and trim
    const normalizedEmail = email.trim().toLowerCase();

    setIsVerifyingOtp(true);
    try {
      const { data, error } = await supabase.rpc('validate_otp', {
        p_email: normalizedEmail,
        p_otp: otp,
      });

      if (error) {
        throw new Error(error.message || 'OTP verification failed');
      }

      const result = data as any;

      if (!result || !result.success) {
        throw new Error(result?.error || 'Invalid OTP');
      }

      setOtpVerified(true);
      toast.success('Email verified successfully!');
      return true;
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error(error.message || 'Invalid OTP. Please try again.');
      return false;
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    await handleSendOtp();
  };

  const onSubmit = async () => {
    setIsLoading(true);

    try {
      const contactData = contactForm.getValues();
      const securityData = securityForm.getValues();

      // Trim and normalize email to lowercase
      const normalizedEmail = contactData.email.trim().toLowerCase();

      // Call the register_owner function with OTP
      const { data: result, error } = await supabase.rpc('register_owner', {
        p_full_name: contactData.fullName.trim(),
        p_email: normalizedEmail,
        p_phone_number: contactData.phoneNumber.trim(),
        p_password: securityData.password,
        p_otp: otpForm.getValues().otp,
      });


      if (error) {
        console.error('Registration error:', error);
        toast.error(`Database error: ${error.message}`);
        throw new Error(error.message || 'Registration failed');
      }

      if (!result || !(result as any).success) {
        const errorMsg = (result as any)?.error || 'Registration failed';
        console.error('Registration failed with error:', errorMsg);
        toast.error(`Error: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const registrationResult = result as any;

      setIsSuccess(true);
      toast.success("Account created successfully! Redirecting to login...");
      
      setTimeout(() => {
        navigate("/owner");
      }, 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    // Step-specific validation before proceeding
    switch (currentStep) {
      case 0: // Contact Info -> Send OTP
        const contactValid = await contactForm.trigger();
        if (!contactValid) {
          toast.error("Please fill in all fields correctly");
          return;
        }
        const otpSentSuccess = await handleSendOtp();
        if (otpSentSuccess) {
          setCurrentStep(currentStep + 1);
        }
        break;

      case 1: // OTP Verification -> Just check OTP format, actual verification happens on submit
        const otpValid = await otpForm.trigger();
        if (!otpValid) {
          toast.error("Please enter a valid 6-digit OTP");
          return;
        }
        const otpValue = otpForm.getValues().otp;
        if (!otpValue || otpValue.length !== 6) {
          toast.error("Please enter a valid 6-digit OTP");
          return;
        }
        // Skip server-side verification here - it will happen on final submit
        setOtpVerified(true);
        setCurrentStep(currentStep + 1);
        break;

      case 2: // Security -> Validate and proceed
        const securityValid = await securityForm.trigger();
        if (!securityValid) {
          toast.error("Please fill in all fields correctly");
          return;
        }
        setCurrentStep(currentStep + 1);
        break;

      case 3: // Terms -> Submit registration
        const termsValid = termsForm.getValues().acceptTerms;
        if (!termsValid) {
          toast.error("You must accept the terms and privacy policy");
          return;
        }
        await onSubmit();
        break;
        
      default:
        break;
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0 && currentStep < 4) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Contact Info
        const contactValues = contactForm.getValues();
        return (
          contactValues.fullName.trim() !== "" &&
          contactValues.email.trim() !== "" &&
          contactValues.phoneNumber.trim() !== ""
        );
        
      case 1: // OTP Verification
        const otpValues = otpForm.getValues();
        return otpValues.otp.length === 6 && !otpVerified;
        
      case 2: // Security
        const securityValues = securityForm.getValues();
        return (
          securityValues.password.trim() !== "" &&
          securityValues.confirmPassword.trim() !== "" &&
          securityValues.password === securityValues.confirmPassword
        );
        
      case 3: // Terms
        return termsForm.getValues().acceptTerms === true;
        
      default:
        return false;
    }
  };

  // Remove the old ownerExists check since we don't need it anymore
  // The loading state is now handled by the forms

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
                Account created successfully. Redirecting...
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
      title: "Contact Info",
      description: "Enter your contact details",
      content: (
        <Form {...contactForm}>
          <div className="space-y-4">
            <FormField
              control={contactForm.control}
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
                      disabled={isSendingOtp || isLoading}
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={contactForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Gmail Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="yourname@gmail.com"
                      disabled={isSendingOtp || isLoading || otpSent}
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={contactForm.control}
              name="phoneNumber"
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
                      disabled={isSendingOtp || isLoading}
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
      title: "Email Verification",
      description: "Verify your email address",
      content: (
        <div className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MailCheck className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm">Check your email</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  We've sent a 6-digit verification code to{" "}
                  <span className="font-medium text-foreground">{contactForm.getValues().email}</span>
                </p>
              </div>
            </div>
          </div>

          <Form {...otpForm}>
            <FormField
              control={otpForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Enter Verification Code
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <Input
                        placeholder="000000"
                        disabled={isVerifyingOtp || isLoading}
                        className="transition-all duration-200 focus:scale-[1.02] text-center text-lg tracking-widest uppercase"
                        maxLength={6}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          field.onChange(value);
                        }}
                      />
                      
                      {countdown > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Timer className="w-4 h-4" />
                          <span>Resend code in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
                        </div>
                      )}
                      
                      {countdown === 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResendOtp}
                          disabled={isSendingOtp}
                          className="w-full"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isSendingOtp ? 'animate-spin' : ''}`} />
                          Resend Code
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>

          {otpVerified && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Email verified successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Debug: Show OTP in development */}
          {otpValue && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800">[DEV MODE] Your OTP:</p>
              <p className="font-mono text-lg text-yellow-900 mt-1">{otpValue}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Security",
      description: "Create a secure password",
      content: (
        <Form {...securityForm}>
          <div className="space-y-4">
            <FormField
              control={securityForm.control}
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
                      disabled={isLoading}
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
              control={securityForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Re-enter your password"
                      disabled={isLoading}
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
      title: "Complete",
      description: "Accept terms and conditions",
      content: (
        <Form {...termsForm}>
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Account Summary</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Name:</strong> {contactForm.getValues().fullName}</p>
                <p><strong>Email:</strong> {contactForm.getValues().email}</p>
                <p><strong>Phone:</strong> {contactForm.getValues().phoneNumber}</p>
                <p><strong>Password:</strong> {'•'.repeat(securityForm.getValues().password.length)}</p>
              </div>
            </div>

            <FormField
              control={termsForm.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                      className="mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      I accept the{" "}
                      <a href="#" className="text-primary hover:underline">Terms of Service</a>
                      {" "}and{" "}
                      <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Alert className="bg-blue-50 border-blue-200">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                Your account includes a <strong>14-day free trial</strong> with full access to all features. 
                No credit card required to start.
              </AlertDescription>
            </Alert>
          </div>
        </Form>
      ),
    },
  ];

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
        <div className="w-full max-w-lg">
          <SteppedForm
            title="Create Owner Account"
            description="Register your Gmail account to get started with Kingstone"
            steps={steps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isLoading={isLoading}
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
                  <Link to="/owner" className="flex items-center justify-center">
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

export default OwnerRegister;