import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Save, RotateCcw } from "lucide-react";

interface EmailTemplate {
  subject: string;
  greeting: string;
  mainMessage: string;
  qrInstructions: string;
  closingMessage: string;
  senderName: string;
  headerTitle: string;
}

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  onTemplateChange: (template: EmailTemplate) => void;
  onSave: () => void;
}

const defaultTemplate: EmailTemplate = {
  subject: "Your Event QR Code - {attendeeName}",
  greeting: "Hello {attendeeName}!",
  mainMessage: "Here's your QR code for the event. Please save this image and present it at check-in.",
  qrInstructions: "Your unique QR code:",
  closingMessage: "We look forward to seeing you at the event!",
  senderName: "Juspay",
  headerTitle: "Your Event QR Code"
};

export const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  template,
  onTemplateChange,
  onSave
}) => {
  const [previewMode, setPreviewMode] = useState(false);

  const handleFieldChange = (field: keyof EmailTemplate, value: string) => {
    onTemplateChange({
      ...template,
      [field]: value
    });
  };

  const resetToDefault = () => {
    onTemplateChange(defaultTemplate);
  };

  const generatePreviewHtml = () => {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="text-align: center; padding: 0; margin: 0;">
          <img src="https://dth95m2xtyv8v.cloudfront.net/tesseract/assets/hyper-checkout/gffinviteheader.png" alt="Event Banner" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0; border-radius: 12px 12px 0 0;" />
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #0099FF; margin: 0 0 20px 0; font-size: 24px;">${template.greeting.replace('{attendeeName}', 'John Doe')}</h2>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            ${template.mainMessage.replace(/\n/g, '<br>')}
          </p>
          
          <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 2px dashed #e5e7eb;">
            <div style="width: 200px; height: 200px; background-color: #e5e7eb; border: 3px solid #262883; border-radius: 12px; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #6b7280;">
              QR Code Preview
            </div>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
            <p style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">${template.qrInstructions}</p>
            <p style="background: #ffffff; padding: 12px 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 600; color: #0099FF; margin: 0; border: 1px solid #e5e7eb; letter-spacing: 1px;">
              SAMPLE-QR-CODE-123
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
            ${template.closingMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
          </p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Best regards,<br>
            <strong style="color: #0099FF;">${template.senderName}</strong>
          </p>
        </div>
      </div>
    `;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Email Template Customization
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefault}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button size="sm" onClick={onSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Customize your QR code email template. Use {'{attendeeName}'} to personalize messages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {previewMode ? (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-medium mb-4">Email Preview</h3>
            <div 
              className="bg-white rounded-lg shadow-sm border overflow-hidden"
              dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
            />
          </div>
        ) : (
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting Message</Label>
                <Input
                  id="greeting"
                  value={template.greeting}
                  onChange={(e) => handleFieldChange('greeting', e.target.value)}
                  placeholder="Hello {attendeeName}!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mainMessage">Main Message</Label>
                <Textarea
                  id="mainMessage"
                  value={template.mainMessage}
                  onChange={(e) => handleFieldChange('mainMessage', e.target.value)}
                  placeholder="Enter your main message here..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qrInstructions">QR Code Instructions</Label>
                <Input
                  id="qrInstructions"
                  value={template.qrInstructions}
                  onChange={(e) => handleFieldChange('qrInstructions', e.target.value)}
                  placeholder="Your unique QR code:"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="closingMessage">Closing Message</Label>
                <Textarea
                  id="closingMessage"
                  value={template.closingMessage}
                  onChange={(e) => handleFieldChange('closingMessage', e.target.value)}
                  placeholder="We look forward to seeing you at the event!"
                  rows={2}
                />
                <p className="text-sm text-muted-foreground">
                  Use **text** to make text bold (e.g., **Important:** will become <strong>Important:</strong>)
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={template.subject}
                  onChange={(e) => handleFieldChange('subject', e.target.value)}
                  placeholder="Your Event QR Code - {attendeeName}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headerTitle">Header Title</Label>
                <Input
                  id="headerTitle"
                  value={template.headerTitle}
                  onChange={(e) => handleFieldChange('headerTitle', e.target.value)}
                  placeholder="Your Event QR Code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderName">Sender Name</Label>
                <Input
                  id="senderName"
                  value={template.senderName}
                  onChange={(e) => handleFieldChange('senderName', e.target.value)}
                  placeholder="Juspay"
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export type { EmailTemplate };
export { defaultTemplate };