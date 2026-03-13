import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Key, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminPasswordManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Recovery contact fields
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  
  const { changePassword, user } = useAuth();

  // Load existing recovery contacts
  useEffect(() => {
    const loadRecoveryContacts = async () => {
      try {
        const { data: credentials, error } = await supabase
          .from('system_credentials')
          .select('recovery_email, recovery_phone')
          .eq('username', user?.username || '')
          .single();

        if (error) {
          if (error.code === '42703' || error.code === 'PGRST116') {
            return;
          }
          console.warn('Could not load recovery contacts:', error.message);
          return;
        }

        if (credentials) {
          setRecoveryEmail((credentials as any).recovery_email || '');
          setRecoveryPhone((credentials as any).recovery_phone || '');
        }
      } catch (error) {
        console.warn('Recovery contacts not available:', error);
      }
    };

    loadRecoveryContacts();
  }, []);

  const handleUpdateRecoveryContacts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('system_credentials')
        .update({
          recovery_email: recoveryEmail || null,
          recovery_phone: recoveryPhone || null
        } as any)
        .eq('username', user?.username || '');

      if (error) {
        if (error.code === '42703') {
          toast.error('Recovery contact fields are not yet set up in the database. Please run the database migration.');
          return;
        }
        throw error;
      }

      toast.success('Recovery contacts updated successfully!');
    } catch (error) {
      console.error('Recovery contacts update error:', error);
      setError('Failed to update recovery contacts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please enter both password fields');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const success = await changePassword(user?.username || '', newPassword);
      if (!success) {
        throw new Error('Failed to update password');
      }

      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password update error:', error);
      setError('Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recovery Contacts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Password Recovery Contacts</CardTitle>
          </div>
          <CardDescription>
            Set recovery email and phone for password reset
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Recovery Email</Label>
              <Input
                id="recovery-email"
                type="email"
                placeholder="admin@example.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-phone">Recovery Phone</Label>
              <Input
                id="recovery-phone"
                type="tel"
                placeholder="+1234567890"
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleUpdateRecoveryContacts}
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating contacts...
              </>
            ) : (
              'Update Recovery Contacts'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Change Password</CardTitle>
          </div>
          <CardDescription>
            Set a secure password for your admin account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  required
                  minLength={6}
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
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Important:</strong> After changing your password, you'll need to use the new password to log in next time.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPasswordManager;