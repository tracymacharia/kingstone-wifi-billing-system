import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { SteppedForm } from "@/components/ui/stepped-form";
import { Shield, Mail, Lock, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const OwnerLogin = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountVerified, setAccountVerified] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateEmail = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (!email.trim()) {
        setError("Email is required");
        return false;
      }

      if (!email.endsWith('@gmail.com')) {
        setError("Please use a Gmail address to login");
        return false;
      }

      // Check if any owner account exists in the database using the RPC function
      const { data: ownerExists, error: checkError } = await supabase
        .rpc('owner_account_exists');

      if (checkError) {
        console.error('Error checking owner existence:', checkError);
        setError(`System error: ${checkError.message || 'Please try again.'}`);
        return false;
      }

      if (!ownerExists) {
        setError("No owner account found. Please register first.");
        return false;
      }

      // Since there's only one owner account allowed, we don't need to check for a specific email
      // The login will be handled by the AuthContext which will verify credentials
      setAccountVerified(true);
      return true;
    } catch (err: any) {
      console.error('Email validation error:', err);
      setError(err?.message || "An error occurred. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (!email.trim() || !password.trim()) {
        setError("Both email and password are required");
        return;
      }

      // Attempt to login
      const success = await login(email, password);
      if (success) {
        toast.success("Login successful!");
        navigate("/owner/dashboard");
      } else {
        // Check if owner account exists but credentials are wrong
        const { data: ownerExists, error: checkError } = await supabase
          .rpc('owner_account_exists');

        if (checkError) {
          console.error('Error checking owner existence:', checkError);
          setError(`System error: ${checkError.message || 'Please try again.'}`);
          return;
        }

        if (ownerExists) {
          setError("Invalid credentials. Please check your email and password.");
        } else {
          setError("No owner account found. Please register first.");
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      const isValid = await validateEmail();
      if (isValid) {
        setCurrentStep(1);
      }
    } else if (currentStep === 1) {
      await handleLogin();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return email.trim() !== "" && !isLoading;
      case 1:
        return password.trim() !== "" && !isLoading;
      default:
        return false;
    }
  };

  const steps = [
    {
      title: "Email",
      description: "Enter your Gmail account",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-4 h-4 text-primary" />
              Gmail Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="yourname@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setAccountVerified(false);
              }}
              disabled={isLoading}
              className="transition-all duration-200"
            />
          </div>
          
          {error && (
            <Alert variant="destructive" className="animate-slide-up">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {accountVerified && (
            <Alert className="animate-slide-up border-accent/50 bg-accent/5">
              <Sparkles className="h-4 w-4 text-accent" />
              <AlertDescription className="text-accent-foreground">
                Account verified! You can proceed to login.
              </AlertDescription>
            </Alert>
          )}
        </div>
      ),
    },
    {
      title: "Password",
      description: "Enter your account password",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
              <Lock className="w-4 h-4 text-primary" />
              Password
            </Label>
            <PasswordInput
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              disabled={isLoading}
              className="transition-all duration-200"
            />
          </div>
          
          {error && (
            <Alert variant="destructive" className="animate-slide-up">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center">
            <Button variant="link" size="sm" asChild className="text-sm hover-lift">
              <Link to="/owner/reset-password">
                Forgot password?
              </Link>
            </Button>
          </div>
        </div>
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
            title="Owner Login"
            description="Access your Kingstone dashboard"
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
                  <Link to="/owner/register" className="flex items-center justify-center">
                    Don't have an account?
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

export default OwnerLogin;
