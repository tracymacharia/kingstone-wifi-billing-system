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

const PasswordManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  
  const [ownerPassword, setOwnerPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Recovery contact fields
  const [ownerRecoveryEmail, setOwnerRecoveryEmail] = useState('');
  const [ownerRecoveryPhone, setOwnerRecoveryPhone] = useState('');
  const [adminRecoveryEmail, setAdminRecoveryEmail] = useState('');
  const [adminRecoveryPhone, setAdminRecoveryPhone] = useState('');
  
  const { changePassword } = useAuth();

  // Load existing recovery contacts
  useEffect(() => {
    const loadRecoveryContacts = async () => {
      try {
        const { data: credentials, error } = await supabase
          .from('system_credentials')
          .select('username, recovery_email, recovery_phone');

        if (error) throw error;

        credentials?.forEach((cred) => {
          if (cred.username === 'owner') {
            setOwnerRecoveryEmail(cred.recovery_email || '');
            setOwnerRecoveryPhone(cred.recovery_phone || '');
          } else if (cred.username === 'admin') {
            setAdminRecoveryEmail(cred.recovery_email || '');
            setAdminRecoveryPhone(cred.recovery_phone || '');
          }
        });
      } catch (error) {
        console.error('Error loading recovery contacts:', error);
      }
    };

    loadRecoveryContacts();
  }, []);

  const handleUpdateRecoveryContacts = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Update owner recovery contacts
      const { error: ownerError } = await supabase
        .from('system_credentials')
        .update({
          recovery_email: ownerRecoveryEmail || null,
          recovery_phone: ownerRecoveryPhone || null
        })
        .eq('username', 'owner');

      if (ownerError) throw ownerError;

      // Update admin recovery contacts
      const { error: adminError } = await supabase
        .from('system_credentials')
        .update({
          recovery_email: adminRecoveryEmail || null,
          recovery_phone: adminRecoveryPhone || null
        })
        .eq('username', 'admin');

      if (adminError) throw adminError;

      toast.success('Recovery contacts updated successfully!');
    } catch (error) {
      console.error('Recovery contacts update error:', error);
      setError('Failed to update recovery contacts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePasswords = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!ownerPassword || !adminPassword) {
      setError('Please enter both passwords');
      setIsLoading(false);
      return;
    }

    if (ownerPassword.length < 6 || adminPassword.length < 6) {
      setError('Passwords must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // Update owner password
      const ownerSuccess = await changePassword('owner', ownerPassword);
      if (!ownerSuccess) {
        throw new Error('Failed to update owner password');
      }

      // Update admin password
      const adminSuccess = await changePassword('admin', adminPassword);
      if (!adminSuccess) {
        throw new Error('Failed to update admin password');
      }

      toast.success('Passwords updated successfully!');
      setOwnerPassword('');
      setAdminPassword('');
    } catch (error) {
      console.error('Password update error:', error);
      setError('Failed to update passwords. Please try again.');
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
        
        <CardContent className="space-y-6">
          {/* Owner Recovery Contacts */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Owner Account Recovery</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner-recovery-email">Recovery Email</Label>
                <Input
                  id="owner-recovery-email"
                  type="email"
                  placeholder="owner@example.com"
                  value={ownerRecoveryEmail}
                  onChange={(e) => setOwnerRecoveryEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-recovery-phone">Recovery Phone</Label>
                <Input
                  id="owner-recovery-phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={ownerRecoveryPhone}
                  onChange={(e) => setOwnerRecoveryPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Admin Recovery Contacts */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Admin Account Recovery</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-recovery-email">Recovery Email</Label>
                <Input
                  id="admin-recovery-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={adminRecoveryEmail}
                  onChange={(e) => setAdminRecoveryEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-recovery-phone">Recovery Phone</Label>
                <Input
                  id="admin-recovery-phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={adminRecoveryPhone}
                  onChange={(e) => setAdminRecoveryPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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

      {/* Password Update Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Change Passwords</CardTitle>
          </div>
          <CardDescription>
            Update login passwords for owner and admin accounts
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleUpdatePasswords} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="owner-password">Owner Password</Label>
            <div className="relative">
              <Input
                id="owner-password"
                type={showPasswords ? "text" : "password"}
                placeholder="Enter new owner password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                className="pr-10"
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="admin-password">Admin Password</Label>
            <Input
              id="admin-password"
              type={showPasswords ? "text" : "password"}
              placeholder="Enter new admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
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
                Updating passwords...
              </>
            ) : (
              'Update Passwords'
            )}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Changing passwords will require all users to log in again with the new credentials.
          </p>
        </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordManager;