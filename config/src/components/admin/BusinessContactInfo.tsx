import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Mail, Building2, Save, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface AdminContactData {
  business_name: string;
  phone: string;
  email: string;
}

const BusinessContactInfo = () => {
  const { user } = useAuth();
  const [contactData, setContactData] = useState<AdminContactData>({
    business_name: '',
    phone: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const adminId = getAdminIdFromUser(user);
    if (adminId) {
      loadContactInfo();
    }
  }, [user]);

  const loadContactInfo = async () => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) return;

      setIsLoading(true);

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('phone, email')
        .eq('id', adminId)
        .single();

      if (adminError && adminError.code !== 'PGRST116') {
        throw adminError;
      }

      if (adminData) {
        setContactData({
          business_name: user?.username || '',
          phone: adminData.phone || '',
          email: adminData.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading contact info:', error);
      toast.error('Failed to load contact information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) {
        toast.error('Admin ID not found');
        return;
      }

      setIsSaving(true);

      if (!contactData.phone.trim() && !contactData.email.trim()) {
        toast.error('At least one contact method (phone or email) is required');
        return;
      }

      const { error: updateError } = await supabase
        .from('admins')
        .update({
          phone: contactData.phone.trim() || null,
          email: contactData.email.trim() || null,
        })
        .eq('id', adminId);

      if (updateError) {
        throw updateError;
      }

      toast.success('Contact information updated successfully!');
      toast.info('These details will now appear in your clients\' portal');
    } catch (error) {
      console.error('Error saving contact info:', error);
      toast.error('Failed to save contact information');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Contact Information
              </CardTitle>
              <CardDescription>
                These details will be displayed in your clients' portal
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Client Portal
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="contact_phone"
                placeholder="e.g., +254 700 000 000"
                value={contactData.phone}
                onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Clients can call this number for support
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="contact_email"
                type="email"
                placeholder="e.g., support@yourisp.com"
                value={contactData.email}
                onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Clients can email this address for support
            </p>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Contact Info'}
            </Button>
            {(contactData.phone || contactData.email) && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Info className="h-3 w-3 mr-1" />
                Visible to clients
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How it appears to clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">
                {contactData.business_name || user?.username || 'Your Business'}
              </h3>
            </div>

            {contactData.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contactData.phone}</span>
              </div>
            )}

            {contactData.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contactData.email}</span>
              </div>
            )}

            {!contactData.phone && !contactData.email && (
              <p className="text-sm text-muted-foreground italic">
                No contact information set. Add your business details above.
              </p>
            )}
          </div>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              This information will be displayed in the Client Portal under the Overview section,
              helping clients know how to contact you for support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessContactInfo;
