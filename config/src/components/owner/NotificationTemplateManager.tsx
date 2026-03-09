import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NotificationTemplate {
  id: string;
  template_type: string;
  template_content: string;
}

const NotificationTemplateManager = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [smsTemplate, setSmsTemplate] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*');

      if (error) throw error;

      setTemplates(data || []);
      
      // Set form values
      data?.forEach((template) => {
        switch (template.template_type) {
          case 'sms_reset':
            setSmsTemplate(template.template_content);
            break;
          case 'email_reset_subject':
            setEmailSubject(template.template_content);
            break;
          case 'email_reset_body':
            setEmailBody(template.template_content);
            break;
        }
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error("Failed to load notification templates");
    } finally {
      setLoading(false);
    }
  };

  const saveTemplates = async () => {
    setSaving(true);
    try {
      const updates = [
        { template_type: 'sms_reset', template_content: smsTemplate },
        { template_type: 'email_reset_subject', template_content: emailSubject },
        { template_type: 'email_reset_body', template_content: emailBody },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('notification_templates')
          .upsert(update, { onConflict: 'template_type' });

        if (error) throw error;
      }

      toast.success("Notification templates updated successfully!");
      await fetchTemplates();
    } catch (error) {
      console.error('Error saving templates:', error);
      toast.error("Failed to save notification templates");
    } finally {
      setSaving(false);
    }
  };

  const getPreviewContent = () => {
    const placeholders = {
      '{username}': 'admin',
      '{password}': 'Kingstone123',
      '{admin_name}': 'John Smith',
      '{owner_name}': 'System Owner',
      '{system_name}': 'Kingstone WiFi Billing System'
    };

    const replacePlaceholders = (text: string) => {
      let result = text;
      Object.entries(placeholders).forEach(([placeholder, value]) => {
        result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      });
      return result;
    };

    return {
      sms: replacePlaceholders(smsTemplate),
      emailSubject: replacePlaceholders(emailSubject),
      emailBody: replacePlaceholders(emailBody)
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
          <CardDescription>Loading templates...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const preview = getPreviewContent();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
          <CardDescription className="text-sm">
            Customize SMS and email templates sent when admin credentials are reset.
            Use placeholders: {"{username}"}, {"{password}"}, {"{admin_name}"}, {"{owner_name}"}, {"{system_name}"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SMS Template */}
          <div className="space-y-2">
            <Label htmlFor="smsTemplate">SMS Reset Template</Label>
            <Textarea
              id="smsTemplate"
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              placeholder="Enter SMS template..."
              className="w-full"
              rows={3}
            />
          </div>

          {/* Email Subject */}
          <div className="space-y-2">
            <Label htmlFor="emailSubject">Email Subject Template</Label>
            <Input
              id="emailSubject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full"
            />
          </div>

          {/* Email Body */}
          <div className="space-y-2">
            <Label htmlFor="emailBody">Email Body Template</Label>
            <Textarea
              id="emailBody"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Enter email body template..."
              className="w-full"
              rows={8}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button 
              onClick={saveTemplates} 
              disabled={saving}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              <Save className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{saving ? "Saving..." : "Save Templates"}</span>
              <span className="sm:hidden">{saving ? "Saving..." : "Save"}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              <Eye className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{showPreview ? "Hide Preview" : "Show Preview"}</span>
              <span className="sm:hidden">{showPreview ? "Hide" : "Preview"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription className="text-sm">
              Here's how the templates will look with sample data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">SMS Message:</h4>
              <div className="p-3 bg-muted rounded-md text-sm break-words">
                {preview.sms}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">Email Subject:</h4>
              <div className="p-3 bg-muted rounded-md text-sm font-medium break-words">
                {preview.emailSubject}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">Email Body:</h4>
              <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap break-words">
                {preview.emailBody}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationTemplateManager;