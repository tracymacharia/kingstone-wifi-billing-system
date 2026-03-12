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
import { Plus, Trash2, Eye, Wifi, Zap, Clock, Calendar, CalendarDays, CreditCard, Smartphone, Shield, Router, CheckCircle, MessageSquare, Key, UserCheck, RefreshCw, Ticket, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface WiFiSettingsData {
  id?: string;
  hotspot_title: string;
  enable_trial: boolean;
  trial_minutes: number;
  enable_vouchers: boolean;
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
    enable_vouchers: false,
    description: 'Welcome to our WiFi service',
    theme_color: '#ef4444',
    faq_json: [],
    contact_phone: '',
    contact_email: ''
  });

  const [hotspotPackages, setHotspotPackages] = useState<HotspotPackage[]>([]);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [isLoading, setIsLoading] = useState(false);
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
      if (!adminId) return;

      const { data, error } = await supabase
        .from('wifi_settings')
        .select('*')
        .eq('admin_id', adminId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        if ((error as any).code === '42P01') {
          return;
        }
        throw error;
      }

      if (data) {
        setSettings({
          ...data,
          faq_json: Array.isArray(data.faq_json) ? data.faq_json : []
        });
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

      const { error } = await supabase
        .from('wifi_settings')
        .upsert({
          admin_id: adminId,
          ...settings
        });

      if (error) {
        if ((error as any).code === '42P01') {
          toast.error('WiFi settings table not set up yet. Please run the database setup SQL first.');
          return;
        }
        throw error;
      }
      toast.success('WiFi settings saved successfully');
    } catch (error) {
      console.error('Failed to save WiFi settings:', error);
      toast.error('Failed to save WiFi settings');
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Vouchers</Label>
              <p className="text-sm text-muted-foreground">
                Allow voucher-based authentication
              </p>
            </div>
            <Switch
              checked={settings.enable_vouchers}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enable_vouchers: checked }))}
            />
          </div>

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

                {/* Preview Container - Exact copy of PaymentPortal */}
                <div ref={previewRef} className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
                  <div className="container mx-auto max-w-7xl px-4 py-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
                          <Wifi className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
                        {settings.hotspot_title || 'Kingstone WiFi'}
                      </h1>
                      <p className="text-base sm:text-lg text-muted-foreground">
                        {settings.description || 'Choose your internet package or reconnect'}
                      </p>

                      {/* Connection Info Mockup */}
                      <div className="mt-6 flex justify-center">
                        <Card className="w-full max-w-md shadow-md">
                          <CardContent className="pt-4">
                            <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                              <Router className="w-4 h-4" />
                              <span>Device: AA:BB:CC:DD:EE:FF</span>
                              <span className="hidden sm:inline">•</span>
                              <span>IP: 192.168.88.100</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Free Trial Section */}
                      {settings.enable_trial && (
                        <Card className="border-purple-200 bg-purple-50/50 shadow-md">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-purple-700 text-base sm:text-xl">
                              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                              Try Before You Pay - Free Trial Available!
                            </CardTitle>
                            <CardDescription className="text-purple-600 text-xs sm:text-sm">
                              Get instant access with our free trial - no payment required
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-purple-100">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="font-medium text-sm sm:text-base">Free {settings.trial_minutes}-minute trial</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-xs sm:text-sm text-muted-foreground">No credit card required</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-xs sm:text-sm text-muted-foreground">Instant activation</span>
                                </div>
                              </div>
                              <Button
                                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
                                size="lg"
                                disabled
                              >
                                <Zap className="mr-2 h-4 w-4" />
                                Start Free Trial
                              </Button>
                            </div>
                            <Alert className="bg-blue-50 border-blue-200">
                              <Shield className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-blue-700 text-xs sm:text-sm">
                                One free trial per device. After trial expires, you can purchase a package to continue.
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                      )}

                      {/* Package Selection Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-base sm:text-xl">
                            <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Choose Your Internet Package
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm">
                            Select the perfect internet package for your needs
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <RadioGroup value="pkg001">
                            {/* Hourly Packages */}
                            <div className="space-y-3">
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Hourly Packages
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getPackagesByType('minutes').concat(getPackagesByType('hours')).map((pkg) => (
                                  <div
                                    key={pkg.id}
                                    className="relative border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50"
                                  >
                                    <RadioGroupItem
                                      value={pkg.id}
                                      id={pkg.id}
                                      className="absolute top-4 right-4"
                                    />
                                    {pkg.name.includes('Basic') && (
                                      <Badge className="absolute -top-2 left-4 bg-secondary text-secondary-foreground">
                                        Most Popular
                                      </Badge>
                                    )}
                                    <div className="space-y-2">
                                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                                      <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4 mr-1" />
                                        {formatDuration(pkg.duration_value, pkg.duration_type)}
                                      </div>
                                      <div className="flex items-center text-sm text-muted-foreground">
                                        <Zap className="w-4 h-4 mr-1" />
                                        {pkg.download_speed_mbps} Mbps
                                      </div>
                                      <div className="text-2xl font-bold text-primary">
                                        KES {pkg.price.toLocaleString()}
                                      </div>
                                      <div className="flex space-x-2">
                                        <Badge variant="outline" className="text-xs capitalize">
                                          {pkg.duration_type}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          HOTSPOT
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Daily Packages */}
                            <Separator />
                            <div className="space-y-3">
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Daily Packages
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getPackagesByType('days').map((pkg) => (
                                  <div
                                    key={pkg.id}
                                    className="relative border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50"
                                  >
                                    <RadioGroupItem
                                      value={pkg.id}
                                      id={pkg.id}
                                      className="absolute top-4 right-4"
                                    />
                                    <div className="space-y-2">
                                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                                      <div className="flex items-center text-sm text-muted-foreground">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        {formatDuration(pkg.duration_value, pkg.duration_type)}
                                      </div>
                                      <div className="flex items-center text-sm text-muted-foreground">
                                        <Zap className="w-4 h-4 mr-1" />
                                        {pkg.download_speed_mbps} Mbps
                                      </div>
                                      <div className="text-2xl font-bold text-primary">
                                        KES {pkg.price.toLocaleString()}
                                      </div>
                                      <div className="flex space-x-2">
                                        <Badge variant="outline" className="text-xs capitalize">
                                          {pkg.duration_type}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          HOTSPOT
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Monthly Packages */}
                            <Separator />
                            <div className="space-y-3">
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <CalendarDays className="w-4 h-4" />
                                Monthly Packages
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getPackagesByType('months').map((pkg) => (
                                  <div
                                    key={pkg.id}
                                    className="relative border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50"
                                  >
                                    <RadioGroupItem
                                      value={pkg.id}
                                      id={pkg.id}
                                      className="absolute top-4 right-4"
                                    />
                                    <div className="space-y-2">
                                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                                      <div className="flex items-center text-sm text-muted-foreground">
                                        <CalendarDays className="w-4 h-4 mr-1" />
                                        {formatDuration(pkg.duration_value, pkg.duration_type)}
                                      </div>
                                      <div className="flex items-center text-sm text-muted-foreground">
                                        <Zap className="w-4 h-4 mr-1" />
                                        {pkg.download_speed_mbps} Mbps
                                      </div>
                                      <div className="text-2xl font-bold text-primary">
                                        KES {pkg.price.toLocaleString()}
                                      </div>
                                      <div className="flex space-x-2">
                                        <Badge variant="outline" className="text-xs capitalize">
                                          {pkg.duration_type}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          HOTSPOT
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </RadioGroup>
                        </CardContent>
                      </Card>

                      {/* Payment Dialog Preview - Shows popup style */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-10" style={{position: 'sticky', top: '20px'}}>
                          <Card className="w-full max-w-md shadow-2xl border-2 border-primary">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <CreditCard className="w-5 h-5" />
                                  Complete Your Payment
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <CardDescription className="text-sm">
                                Enter your phone number to pay via M-PESA
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {hotspotPackages.length > 0 && (
                                <div className="p-4 bg-muted rounded-lg">
                                  <h3 className="font-medium mb-2 text-sm">Selected Package</h3>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span>Package:</span>
                                      <span className="font-medium">{hotspotPackages[0].name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Duration:</span>
                                      <span>{formatDuration(hotspotPackages[0].duration_value, hotspotPackages[0].duration_type)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Speed:</span>
                                      <span>{hotspotPackages[0].download_speed_mbps} Mbps</span>
                                    </div>
                                  </div>
                                  <Separator className="my-3" />
                                  <div className="flex justify-between font-bold text-base">
                                    <span>Total:</span>
                                    <span className="text-primary">KES {hotspotPackages[0].price.toLocaleString()}</span>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label htmlFor="phone-preview-dialog" className="text-xs">Phone Number</Label>
                                <div className="relative">
                                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="phone-preview-dialog"
                                    type="tel"
                                    placeholder="254712345678"
                                    className="pl-10"
                                    defaultValue="254712345678"
                                    readOnly
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Enter your M-PESA phone number
                                </p>
                              </div>

                              <Alert>
                                <Shield className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  Secure payment via M-PESA. You will receive a prompt on your phone.
                                </AlertDescription>
                              </Alert>

                              <Button
                                className="w-full"
                                size="lg"
                                disabled
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Pay KES {hotspotPackages.length > 0 ? hotspotPackages[0].price.toLocaleString() : '0'}
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                        <div className="h-96"></div>
                      </div>

                      {/* Voucher Activation Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
                            <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
                            Activate Voucher
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm">
                            Enter your voucher code and phone number to activate internet access
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="voucher-preview" className="text-xs sm:text-sm">Voucher Code</Label>
                            <div className="relative">
                              <Ticket className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="voucher-preview"
                                type="text"
                                placeholder="Enter voucher code"
                                className="pl-10 uppercase tracking-wider text-sm sm:text-base"
                                defaultValue="VOUCHER123"
                                readOnly
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Enter the voucher code from your voucher card
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="voucher-phone-preview" className="text-xs sm:text-sm">Phone Number</Label>
                            <div className="relative">
                              <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="voucher-phone-preview"
                                type="tel"
                                placeholder="254712345678"
                                className="pl-10 text-sm sm:text-base"
                                defaultValue="254712345678"
                                readOnly
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Phone number will be recorded for admin tracking
                            </p>
                          </div>

                          <Alert className="bg-blue-50 border-blue-200">
                            <Shield className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-xs sm:text-sm text-blue-700">
                              Your phone number will be recorded for administrative purposes and future reference.
                            </AlertDescription>
                          </Alert>

                          <Button
                            className="w-full text-sm sm:text-base"
                            size="lg"
                            disabled
                          >
                            <Ticket className="mr-2 h-4 w-4" />
                            Activate Voucher
                          </Button>
                        </CardContent>
                      </Card>

                      {/* M-Pesa Reconnection Section */}
                      <Card className="border-green-200 bg-green-50/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base sm:text-xl text-green-700">
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            Automatic Reconnection (M-Pesa Payment)
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm text-green-600">
                            Paid via M-Pesa but not connected? Paste your message and get connected instantly
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Alert className="bg-blue-50 border-blue-200">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-xs sm:text-sm text-blue-700">
                              <strong>Example M-Pesa Message:</strong><br/>
                              "Confirmed KSh50 sent to Kingstone WiFi. Transaction code QGH009L8K3. New balance KSh100. Time: 12/2/26 2:30 PM"
                            </AlertDescription>
                          </Alert>

                          <div className="space-y-2">
                            <Label htmlFor="mpesa-preview" className="text-xs sm:text-sm">M-Pesa Confirmation Message</Label>
                            <div className="relative">
                              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <textarea
                                id="mpesa-preview"
                                rows={4}
                                placeholder="Paste your M-Pesa confirmation message here..."
                                className="w-full pl-10 pr-3 py-2 border rounded-md text-sm sm:text-base"
                                defaultValue="Confirmed KSh50 sent to Kingstone WiFi. Transaction code QGH009L8K3. New balance KSh100."
                                readOnly
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Include the transaction code (e.g., QGH009L8K3)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reconnect-phone-preview" className="text-xs sm:text-sm">Phone Number Used for Payment</Label>
                            <div className="relative">
                              <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reconnect-phone-preview"
                                type="tel"
                                placeholder="254712345678"
                                className="pl-10 text-sm sm:text-base"
                                defaultValue="254712345678"
                                readOnly
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              This will be your username for login
                            </p>
                          </div>

                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                            size="lg"
                            disabled
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Connect Now
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Voucher Reconnection Section */}
                      <Card className="border-blue-200 bg-blue-50/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base sm:text-xl text-blue-700">
                            <Key className="w-4 h-4 sm:w-5 sm:h-5" />
                            Lost Connection? Reconnect with Voucher
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm text-blue-600">
                            If you used a voucher before and lost connection, reconnect instantly
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Alert className="bg-green-50 border-green-200">
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-xs sm:text-sm text-green-700">
                              <strong>Quick Reconnection:</strong><br/>
                              Use your original voucher code or phone number to reconnect. 
                              Your remaining time will be restored automatically.
                            </AlertDescription>
                          </Alert>

                          <div className="space-y-3">
                            <Label className="text-xs sm:text-sm">Reconnect Method</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                type="button"
                                variant="default"
                                className="flex items-center justify-center gap-2 text-xs sm:text-sm"
                              >
                                <Ticket className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">Voucher Code</span>
                                <span className="xs:hidden">Voucher</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="flex items-center justify-center gap-2 text-xs sm:text-sm"
                              >
                                <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">Phone Number</span>
                                <span className="xs:hidden">Phone</span>
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reconnect-voucher-preview" className="text-xs sm:text-sm">Voucher Code</Label>
                            <div className="relative">
                              <Ticket className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reconnect-voucher-preview"
                                type="text"
                                placeholder="Enter your voucher code"
                                className="pl-10 uppercase tracking-wider text-sm sm:text-base"
                                defaultValue="VOUCHER123"
                                readOnly
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Enter the same voucher code you used before
                            </p>
                          </div>

                          <Alert className="bg-blue-50 border-blue-200">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-xs sm:text-sm text-blue-700">
                              <strong>How it works:</strong><br/>
                              We'll look up your voucher session and restore your connection with remaining time.
                            </AlertDescription>
                          </Alert>

                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
                            size="lg"
                            disabled
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reconnect Now
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Footer */}
                      <div className="text-center py-6">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Powered by{" "}
                          <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Kingstone wifi billing system
                          </span>
                        </p>
                        <div className="mt-4 text-xs text-muted-foreground">
                          Contact: {settings.contact_phone || 'Not set'} | {settings.contact_email || 'Not set'}
                        </div>
                      </div>
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