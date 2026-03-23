import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Settings, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminIdFromUser } from "@/hooks/useAdminId";

interface SMSLog {
  id: string;
  recipient: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
  type: 'expiry' | 'manual';
}

interface SMSSettingsProps {
  businessName: string;
}

const SMSSettings = ({ businessName }: SMSSettingsProps) => {
  const { user } = useAuth();
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [senderNumber, setSenderNumber] = useState("");
  const [apiProvider, setApiProvider] = useState("twilio");
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState(
    `Your Wi-Fi package will expire on {expiry_date}. Please renew to continue service.`
  );
  const [testPhone, setTestPhone] = useState("");
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadSMSSettings();
      loadSMSLogs();
    }
  }, [user]);

  const loadSMSSettings = async () => {
    try {
      const sessionToken = sessionStorage.getItem('kingstone_session_token');
      
      // Try RPC first
      const { data, error } = await supabase.rpc('get_admin_sms_settings', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('Error loading SMS settings via RPC:', error);
        
        // Handle missing function - fallback to direct query
        if (error.code === '42883' || error.message.includes('does not exist')) {
          const adminId = getAdminIdFromUser(user);
          if (!adminId) return;

          const { data: directData, error: directError } = await supabase
            .from('sms_settings')
            .select('*')
            .eq('admin_id', adminId)
            .single();

          if (directError && directError.code !== 'PGRST116') {
            if ((directError as any).code === '42P01') return;
            console.error('Fallback query failed:', directError);
            return;
          }

          if (directData) {
            setSmsEnabled(directData.enabled);
            setSenderNumber(directData.sender_number || '');
            setApiProvider(directData.provider || 'twilio');
            setUsername(directData.username || '');
            setMessageTemplate(directData.message_template || messageTemplate);
          }
          return;
        }
        return;
      }

      if (data && data.length > 0) {
        const settings = data[0];
        setSmsEnabled(settings.enabled);
        setSenderNumber(settings.sender_number || '');
        setApiProvider(settings.provider || 'twilio');
        setUsername(settings.username || '');
        setMessageTemplate(settings.message_template || messageTemplate);
      }
    } catch (error) {
      console.error('Error loading SMS settings:', error);
    }
  };

  const loadSMSLogs = async () => {
    try {
      const adminId = getAdminIdFromUser(user);
      if (!adminId) return;

      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        if ((error as any).code === '42P01') return;
        console.error('Error loading SMS logs:', error);
        return;
      }

      const formattedLogs: SMSLog[] = data.map(log => ({
        id: log.id,
        recipient: log.recipient,
        message: log.message,
        status: log.status as 'sent' | 'failed' | 'pending',
        timestamp: new Date(log.created_at).toLocaleString(),
        type: log.type as 'expiry' | 'manual'
      }));

      setSmsLogs(formattedLogs);
    } catch (error) {
      console.error('Error loading SMS logs:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const sessionToken = sessionStorage.getItem('kingstone_session_token');

      // Try RPC first
      const { error } = await supabase.rpc('save_admin_sms_settings', {
        p_enabled: smsEnabled,
        p_provider: apiProvider,
        p_sender_number: senderNumber,
        p_username: username,
        p_message_template: messageTemplate
      });

      if (error) {
        console.error('Error saving SMS settings via RPC:', error);
        
        // Handle missing function - fallback to direct query
        if (error.code === '42883' || error.message.includes('does not exist')) {
          const adminId = getAdminIdFromUser(user);
          if (!adminId) {
            toast.error("User not authenticated");
            setSaving(false);
            return;
          }

          const { error: upsertError } = await supabase
            .from('sms_settings')
            .upsert({
              admin_id: adminId,
              enabled: smsEnabled,
              provider: apiProvider,
              sender_number: senderNumber,
              username: username,
              message_template: messageTemplate
            }, {
              onConflict: 'admin_id'
            });

          if (upsertError) {
            if ((upsertError as any).code === '42P01') {
              toast.error("SMS settings table not set up yet. Please run database/PAYMENT_AND_SMS_SETUP.sql in Supabase SQL Editor.");
              setSaving(false);
              return;
            }
            console.error('Fallback upsert failed:', upsertError);
            toast.error("Failed to save SMS settings");
            setSaving(false);
            return;
          }

          toast.success("SMS settings updated successfully!");
          setSaving(false);
          loadSMSSettings();
          return;
        }
        
        toast.error("Failed to save SMS settings: " + error.message);
        setSaving(false);
        return;
      }

      toast.success("SMS settings updated successfully!");
      loadSMSSettings();
    } catch (error) {
      console.error('Error saving SMS settings:', error);
      toast.error("Failed to save SMS settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestSMS = async () => {
    if (!testPhone) {
      toast.error("Please enter a test phone number");
      return;
    }

    setLoading(true);
    try {
      const testMessage = `Test SMS from ${businessName} WiFi System - ${new Date().toLocaleString()}`;
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          recipient: testPhone,
          message: testMessage,
          type: 'manual'
        }
      });

      if (error) {
        console.error('Error sending test SMS:', error);
        toast.error(`Failed to send test SMS: ${error.message}`);
        return;
      }

      toast.success(`Test SMS sent to ${testPhone}`);
      setTestPhone("");
      loadSMSLogs(); // Refresh logs to show the new test SMS
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast.error("Failed to send test SMS");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'sent' ? 'default' : status === 'failed' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* SMS Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Configuration
          </CardTitle>
          <CardDescription>
            Configure SMS notifications for client package expiry alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable SMS Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Send automatic SMS when client packages expire
              </div>
            </div>
            <Switch
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
            />
          </div>

          {smsEnabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-provider">SMS Provider</Label>
                  <Select value={apiProvider} onValueChange={setApiProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="africas-talking">Africa's Talking</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="custom">Custom Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender-number">Sender Number/ID</Label>
                  <Input
                    id="sender-number"
                    placeholder="e.g., +254700000000 or CAFENET"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your SMS provider API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="API Username (if required)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-template">Message Template</Label>
                <Textarea
                  id="message-template"
                  placeholder="SMS message template"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={3}
                />
                <div className="text-sm text-muted-foreground">
                  Available variables: [business_name], [time], [reconnect_url], [package_name]
                </div>
              </div>

              <Button onClick={handleSaveSettings} className="w-full" disabled={saving}>
                <Settings className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save SMS Settings"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Test SMS */}
      {smsEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Test SMS
            </CardTitle>
            <CardDescription>
              Send a test SMS to verify your configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter phone number (e.g., +254712345678)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
              <Button onClick={handleSendTestSMS} disabled={loading}>
                <Phone className="h-4 w-4 mr-2" />
                {loading ? "Sending..." : "Send Test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SMS Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS History
          </CardTitle>
          <CardDescription>
            Recent SMS notifications sent to clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {smsLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{log.recipient}</span>
                    {getStatusIcon(log.status)}
                    {getStatusBadge(log.status)}
                    <Badge variant="outline">{log.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.message}</p>
                  <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SMSSettings;