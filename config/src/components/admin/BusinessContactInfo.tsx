import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Mail, Building2, Save, Info, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface AdminContactData {
  business_name: string;
  contact_phone: string;
  contact_email: string;
  business_description?: string;
}

const BusinessContactInfo = () => {
  const { user } = useAuth();
  const [contactData, setContactData] = useState<AdminContactData>({
    business_name: '',
    contact_phone: '',
    contact_email: '',
    business_description: ''
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

      // Load from admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('business_name, contact_phone, contact_email')
        .eq('id', adminId)
        .single();

      if (adminError && adminError.code !== 'PGRST116') {
        throw adminError;
      }

      if (adminData) {
        setContactData({
          business_name: adminData.business_name || '',
          contact_phone: adminData.contact_phone || '',
          contact_email: adminData.contact_email || '',
          business_description: adminData.business_description || ''
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

      // Validate inputs
      if (!contactData.business_name.trim()) {
        toast.error('Business name is required');
        return;
      }

      if (!contactData.contact_phone.trim() && !contactData.contact_email.trim()) {
        toast.error('At least one contact method (phone or email) is required');
        return;
      }

      // Update admins table
      const { error: updateError } = await supabase
        .from('admins')
        .update({
          contact_phone: contactData.contact_phone.trim() || null,
          contact_email: contactData.contact_email.trim() || null,
          business_description: contactData.business_description?.trim() || null
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
      {/* Business Contact Info Card */}
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
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name *</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="business_name"
                placeholder="e.g., Yobrazlyan WiFi Solutions"
                value={contactData.business_name}
                onChange={(e) => setContactData({ ...contactData, business_name: e.target.value })}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will be displayed as the ISP name in the client portal
            </p>
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="contact_phone"
                placeholder="e.g., +254 700 000 000"
                value={contactData.contact_phone}
                onChange={(e) => setContactData({ ...contactData, contact_phone: e.target.value })}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Clients can call this number for support
            </p>
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="contact_email"
                type="email"
                placeholder="e.g., support@yobrazlyan.com"
                value={contactData.contact_email}
                onChange={(e) => setContactData({ ...contactData, contact_email: e.target.value })}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Clients can email this address for support
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-2 pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Contact Info'}
            </Button>
            {contactData.business_name && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Info className="h-3 w-3 mr-1" />
                Visible to clients
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How it appears to clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">
                {contactData.business_name || 'Your Business Name'}
              </h3>
            </div>
            
            {contactData.contact_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contactData.contact_phone}</span>
              </div>
            )}
            
            {contactData.contact_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contactData.contact_email}</span>
              </div>
            )}
            
            {!contactData.business_name && !contactData.contact_phone && !contactData.contact_email && (
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
