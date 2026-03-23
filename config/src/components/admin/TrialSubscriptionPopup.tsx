import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface TrialPopupProps {
  daysRemaining: number;
  expiresAt: string;
  onDismiss: () => void;
}

export const TrialSubscriptionPopup = ({ daysRemaining, expiresAt, onDismiss }: TrialPopupProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPopup, setShowPopup] = useState(true);

  const trialDays = 5;
  const isExpiringSoon = daysRemaining <= 2;
  const isExpired = daysRemaining <= 0;

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      // Here you would integrate with your payment provider (M-Pesa, Stripe, etc.)
      // For now, we'll show a mock payment flow
      
      toast.info('Opening payment interface...');
      
      // TODO: Integrate with M-Pesa or other payment gateway
      // Example: const { data, error } = await supabase.functions.invoke('initiate-payment', ...);
      
      setTimeout(() => {
        toast.success('Payment integration coming soon! Contact support to complete subscription.');
        setIsProcessing(false);
      }, 1500);
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    setShowPopup(false);
    onDismiss();
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md relative animate-in fade-in zoom-in duration-300">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            {isExpired ? (
              <AlertTriangle className="h-10 w-10 text-red-500" />
            ) : isExpiringSoon ? (
              <AlertTriangle className="h-10 w-10 text-yellow-500" />
            ) : (
              <CheckCircle className="h-10 w-10 text-green-500" />
            )}
            <div>
              <CardTitle className="text-xl">
                {isExpired ? 'Trial Expired' : isExpiringSoon ? 'Trial Expiring Soon' : 'Welcome to Your Trial!'}
              </CardTitle>
              <CardDescription>
                {isExpired ? 'Your 5-day free trial has ended' : `${trialDays}-day free trial`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Trial Status */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Trial Status</span>
              <Badge variant={isExpired ? 'destructive' : isExpiringSoon ? 'secondary' : 'default'}>
                {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Days Remaining</span>
              <span className={`font-bold ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-yellow-500' : 'text-green-500'}`}>
                {Math.max(0, daysRemaining.toFixed(1))} days
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Expires On</span>
              <span className="font-medium">
                {new Date(expiresAt).toLocaleDateString('en-KE', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-2">
            <p className="text-sm font-medium">During your trial, you have access to:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Full dashboard access
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                User management
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Package management
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Payment tracking
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                SMS notifications
              </li>
            </ul>
          </div>

          {/* Pricing Info */}
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Continue with full access</p>
                <p className="text-xs text-muted-foreground">Only KES 999/month</p>
              </div>
              <Badge variant="secondary">Best Value</Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleSubscribe}
              disabled={isProcessing}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Subscribe Now'}
            </Button>
            
            {!isExpired && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleDismiss}
              >
                Continue Using Trial
              </Button>
            )}

            {isExpired && (
              <p className="text-xs text-center text-muted-foreground">
                Please subscribe to continue using the dashboard
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
