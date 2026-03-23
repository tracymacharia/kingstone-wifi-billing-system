import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Eye, Wifi, Zap, Clock, Calendar, CalendarDays, CreditCard, Smartphone, Shield, Router, CheckCircle, MessageSquare, Key, UserCheck, RefreshCw, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface WiFiSettingsData {
  id?: string;
  hotspot_title: string;
  enable_trial: boolean;
  trial_minutes: number;
  description: string;
  theme_color: string;
  faq_json: any[];
  contact_phone: string;
  contact_email: string;
}

interface HotspotPackage {
  id: string;
  name: string;
  duration_value: number;
  duration_type: string;
  price: number;
  download_speed_mbps: number;
  upload_speed_mbps: number;
  is_active: boolean;
}

const WiFiSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WiFiSettingsData>({
    hotspot_title: 'WiFi Access Portal',
    enable_trial: true,
    trial_minutes: 3,
    description: 'Welcome to our WiFi service',
    theme_color: '#ef4444',
    faq_json: [],
    contact_phone: '',
    contact_email: ''
  });

  const [hotspotPackages, setHotspotPackages] = useState<HotspotPackage[]>([]);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [previewPhone, setPreviewPhone] = useState('254712345678');
  const [previewVoucher, setPreviewVoucher] = useState('VOUCHER123');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const adminId = getAdminIdFromUser(user);
    if (adminId) {
      loadSettings();
      loadHotspotPackages();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) {
        console.log('No admin ID found for loading settings');
        return;
      }

      console.log('Loading WiFi settings for admin:', adminId);

      const { data, error } = await supabase
        .from('wifi_settings')
        .select('*')
        .eq('admin_id', adminId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading WiFi settings:', error);
        if ((error as any).code === '42P01') {
          console.log('WiFi settings table does not exist');
          return;
        }
        throw error;
      }

      console.log('Loaded WiFi settings:', data);

      if (data) {
        setSettings({
          ...data,
          faq_json: Array.isArray(data.faq_json) ? data.faq_json : []
        });
        console.log('Settings applied to state');
      } else {
        console.log('No existing settings found, using defaults');
      }
    } catch (error) {
      console.error('Failed to load WiFi settings:', error);
    }
  };

  const loadHotspotPackages = async () => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) return;

      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('admin_id', adminId)
        .eq('package_type', 'hotspot')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        throw error;
      }

      if (data) {
        setHotspotPackages(data);
      }
    } catch (error) {
      console.error('Failed to load hotspot packages:', error);
    }
  };

  const getPackagesByType = (durationType: string) => {
    return hotspotPackages.filter(pkg => pkg.duration_type === durationType);
  };

  const getPackageTypeIcon = (durationType: string) => {
    switch (durationType) {
      case 'minutes':
      case 'hours':
        return Clock;
      case 'days':
        return Calendar;
      case 'months':
        return CalendarDays;
      default:
        return Clock;
    }
  };

  const formatDuration = (value: number, type: string) => {
    return `${value} ${type}`;
  };

  const downloadPreview = async () => {
    try {
      toast.info('Preparing preview download...');
      
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      if (!previewRef.current) {
        toast.error('Preview not ready');
        return;
      }

      // Capture the preview
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Convert to image
      const image = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.href = image;
      link.download = `wifi-portal-preview-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      
      toast.success('Preview downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download preview. Please try again.');
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) {
        toast.error('Admin ID not found');
        return;
      }

      console.log('Saving WiFi settings for admin:', adminId);
      console.log('Settings to save:', settings);

      // First, check if settings exist
      const { data: existing, error: fetchError } = await supabase
        .from('wifi_settings')
        .select('id')
        .eq('admin_id', adminId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing settings:', fetchError);
        if ((fetchError as any).code === '42P01') {
          toast.error('WiFi settings table does not exist. Please contact support to set up the database.');
          return;
        }
      }

      console.log('Existing settings:', existing);

      let result;
      let error;
      
      if (existing) {
        // Update existing
        console.log('Updating existing settings...');
        result = await supabase
          .from('wifi_settings')
          .update({
            hotspot_title: settings.hotspot_title,
            enable_trial: settings.enable_trial,
            trial_minutes: settings.trial_minutes,
            description: settings.description,
            theme_color: settings.theme_color,
            faq_json: settings.faq_json,
            contact_phone: settings.contact_phone,
            contact_email: settings.contact_email,
            updated_at: new Date().toISOString()
          })
          .eq('admin_id', adminId)
          .select()
          .single();
        error = result.error;
      } else {
        // Insert new
        console.log('Inserting new settings...');
        result = await supabase
          .from('wifi_settings')
          .insert({
            admin_id: adminId,
            hotspot_title: settings.hotspot_title,
            enable_trial: settings.enable_trial,
            trial_minutes: settings.trial_minutes,
            description: settings.description,
            theme_color: settings.theme_color,
            faq_json: settings.faq_json,
            contact_phone: settings.contact_phone,
            contact_email: settings.contact_email
          })
          .select()
          .single();
        error = result.error;
      }

      console.log('Save result:', result);
      console.log('Save error:', error);

      if (error) {
        console.error('Save error details:', error);
        if ((error as any).code === '42P01') {
          toast.error('WiFi settings table does not exist. Please run the database setup SQL.');
          return;
        }
        throw error;
      }
      
      toast.success('WiFi settings saved successfully');
      
      // Reload settings to ensure UI reflects the saved data
      console.log('Reloading settings...');
      await loadSettings();
    } catch (error) {
      console.error('Failed to save WiFi settings:', error);
      toast.error(`Failed to save WiFi settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addFaq = () => {
    if (newFaq.question && newFaq.answer) {
      setSettings(prev => ({
        ...prev,
        faq_json: [...prev.faq_json, newFaq]
      }));
      setNewFaq({ question: '', answer: '' });
    }
  };

  const removeFaq = (index: number) => {
    setSettings(prev => ({
      ...prev,
      faq_json: prev.faq_json.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Wifi className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">WiFi Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hotspot Configuration</CardTitle>
          <CardDescription>
            Configure how your hotspot login and payment page appears to users. User creation for PPPoE, Static, and Hotspot users is now handled in the dedicated User Management section.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={settings.hotspot_title}
                onChange={(e) => setSettings(prev => ({ ...prev, hotspot_title: e.target.value }))}
                placeholder="WiFi Access Portal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme Color</Label>
              <Input
                id="theme"
                type="color"
                value={settings.theme_color}
                onChange={(e) => setSettings(prev => ({ ...prev, theme_color: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={settings.description}
              onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of your WiFi service"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                value={settings.contact_phone}
                onChange={(e) => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="+254 700 000 000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.contact_email}
                onChange={(e) => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="support@example.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Free Trial</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to access free trial before payment
              </p>
            </div>
            <Switch
              checked={settings.enable_trial}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enable_trial: checked }))}
            />
          </div>

          {settings.enable_trial && (
            <div className="space-y-2">
              <Label htmlFor="trial">Trial Duration (minutes)</Label>
              <Input
                id="trial"
                type="number"
                value={settings.trial_minutes}
                onChange={(e) => setSettings(prev => ({ ...prev, trial_minutes: parseInt(e.target.value) || 0 }))}
                min="1"
                max="60"
              />
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <Label>FAQ Section</Label>
            <div className="space-y-3">
              {settings.faq_json.map((faq, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{faq.question}</p>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFaq(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Question"
                value={newFaq.question}
                onChange={(e) => setNewFaq(prev => ({ ...prev, question: e.target.value }))}
              />
              <Input
                placeholder="Answer"
                value={newFaq.answer}
                onChange={(e) => setNewFaq(prev => ({ ...prev, answer: e.target.value }))}
              />
            </div>
            <Button onClick={addFaq} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </div>

          <div className="flex justify-end space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="px-6 py-4 border-b flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">Hotspot Payment Portal Preview</DialogTitle>
                    <DialogDescription>
                      Live preview of your hotspot login and payment page - matches exactly what users see
                    </DialogDescription>
                  </div>
                  <Button onClick={downloadPreview} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Preview
                  </Button>
                </DialogHeader>

                {/* Preview Container - Simple Customer Payment Page */}
                <div ref={previewRef} className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${settings.theme_color}15 0%, #f3f4f6 100%)` }}>
                  <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: settings.theme_color }}>
                          <Wifi className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      <h1 className="text-2xl font-bold mb-2" style={{ color: settings.theme_color }}>
                        {settings.hotspot_title || 'Kingstone WiFi'}
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        {settings.description || 'Select a package and connect'}
                      </p>
                    </div>

                    {/* Simple Payment Card */}
                    <Card className="shadow-xl border-0">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold">Choose Package & Pay</CardTitle>
                        <CardDescription className="text-xs">Enter payment details to connect</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Package Selection */}
                        <div className="space-y-2">
                          <Label>Internet Package</Label>
                          <select className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2">
                            <option value="">-- Select Package --</option>
                            <option value="1hr">1 Hour - KES 20</option>
                            <option value="3hrs">3 Hours - KES 50</option>
                            <option value="6hrs">6 Hours - KES 100</option>
                            <option value="1day">1 Day - KES 300</option>
                            <option value="7days">7 Days - KES 1,000</option>
                            <option value="1month">1 Month - KES 2,000</option>
                            <option value="6months">6 Months - KES 8,000</option>
                          </select>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-2">
                          <Label>M-Pesa Phone Number</Label>
                          <div className="relative">
                            <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="tel"
                              placeholder="254712345678"
                              className="pl-10"
                              value={previewPhone}
                              onChange={(e) => setPreviewPhone(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* PIN Input */}
                        <div className="space-y-2">
                          <Label>M-Pesa PIN</Label>
                          <div className="relative">
                            <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="password"
                              placeholder="Enter PIN"
                              className="pl-10"
                              maxLength={4}
                            />
                          </div>
                        </div>

                        {/* Pay Button */}
                        <Button
                          className="w-full text-lg font-semibold py-6"
                          size="lg"
                          style={{ backgroundColor: settings.theme_color }}
                        >
                          <CreditCard className="mr-2 h-5 w-5" />
                          Pay & Connect
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Success Message */}
                    <Card className="mt-4 border-green-200 bg-green-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-700 text-sm">Payment Successful!</p>
                            <p className="text-xs text-green-600">Connected to internet</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Footer */}
                    <div className="text-center mt-6 text-xs text-muted-foreground">
                      <p>Contact: {settings.contact_phone || 'Not set'}</p>
                      <p className="mt-1">Kingstone WiFi</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={saveSettings} disabled={isLoading}>
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WiFiSettings;