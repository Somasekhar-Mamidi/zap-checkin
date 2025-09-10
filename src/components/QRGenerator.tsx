import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Send, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import type { Attendee } from "./EventDashboard";
import type { LogEntry } from "./LogsView";

interface QRGeneratorProps {
  attendees: Attendee[];
  onLog?: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  customMessage?: string;
}

export const QRGenerator = ({ attendees, onLog, customMessage = "" }: QRGeneratorProps) => {
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    const generateQRCodes = async () => {
      const images: Record<string, string> = {};
      for (const attendee of attendees) {
        if (attendee.qrCode) {
          try {
            const qrDataURL = await QRCode.toDataURL(attendee.qrCode, {
              width: 200,
              margin: 2,
              color: {
                dark: '#262883',
                light: '#FFFFFF'
              }
            });
            images[attendee.id] = qrDataURL;
          } catch (error) {
            console.error('Error generating QR code:', error);
          }
        }
      }
      setQrImages(images);
    };

    generateQRCodes();
  }, [attendees]);

  const handleDownloadQR = (attendee: Attendee) => {
    const qrImage = qrImages[attendee.id];
    if (qrImage) {
      const link = document.createElement('a');
      link.download = `QR_${attendee.name.replace(/\s+/g, '_')}.png`;
      link.href = qrImage;
      link.click();
      toast({
        title: "Downloaded!",
        description: `QR code for ${attendee.name} downloaded successfully`,
      });
    }
  };

  const handleSendQR = async (attendee: Attendee) => {
    const qrImage = qrImages[attendee.id];
    if (!qrImage) {
      toast({
        title: "Error",
        description: "QR code not generated yet",
        variant: "destructive"
      });
      return;
    }

    try {
      // Log email sending attempt
      onLog?.({
        type: 'email_sent',
        action: 'QR code email sending initiated',
        user: attendee.name,
        email: attendee.email,
        details: `QR Code: ${attendee.qrCode}`,
        status: 'pending'
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data, error } = await supabase.functions.invoke('send-qr-email', {
        body: {
          attendee: {
            name: attendee.name,
            email: attendee.email,
            qrCode: attendee.qrCode
          },
          qrImageData: qrImage,
          customMessage
        }
      });

      if (error) throw error;

      // Log successful email sending
      onLog?.({
        type: 'email_sent',
        action: 'QR code email sent successfully',
        user: attendee.name,
        email: attendee.email,
        details: `QR Code: ${attendee.qrCode}`,
        status: 'success'
      });

      toast({
        title: "QR Code Sent!",
        description: `QR code sent to ${attendee.name} via email`,
      });
    } catch (error) {
      console.error('Failed to send QR code:', error);
      
      // Log failed email sending
      onLog?.({
        type: 'email_sent',
        action: 'QR code email sending failed',
        user: attendee.name,
        email: attendee.email,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error'
      });

      toast({
        title: "Error",
        description: "Failed to send QR code email",
        variant: "destructive"
      });
    }
  };

  const handleDownloadAll = () => {
    attendees.forEach(attendee => {
      if (qrImages[attendee.id]) {
        setTimeout(() => handleDownloadQR(attendee), 100 * parseInt(attendee.id));
      }
    });
    toast({
      title: "Bulk Download Started!",
      description: "All QR codes are being downloaded",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>QR Code Generator</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Generate and manage QR codes for all attendees
            </p>
          </div>
          <Button 
            onClick={handleDownloadAll}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {attendees.map((attendee) => (
              <Card key={attendee.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{attendee.name}</h3>
                      <p className="text-sm text-muted-foreground">{attendee.email}</p>
                    </div>
                    <Badge 
                      variant={attendee.checkedIn ? "default" : "secondary"}
                      className={attendee.checkedIn ? "bg-success text-success-foreground" : ""}
                    >
                      {attendee.checkedIn ? "Checked In" : "Pending"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    {qrImages[attendee.id] ? (
                      <img 
                        src={qrImages[attendee.id]} 
                        alt={`QR Code for ${attendee.name}`}
                        className="w-32 h-32 border rounded-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {attendee.qrCode}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>QR Code - {attendee.name}</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center space-y-4">
                          {qrImages[attendee.id] && (
                            <img 
                              src={qrImages[attendee.id]} 
                              alt={`QR Code for ${attendee.name}`}
                              className="w-64 h-64 border rounded-lg"
                            />
                          )}
                          <div className="text-center space-y-2">
                            <p className="font-medium">{attendee.name}</p>
                            <p className="text-sm text-muted-foreground">{attendee.email}</p>
                            <code className="text-sm bg-muted px-3 py-1 rounded">
                              {attendee.qrCode}
                            </code>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownloadQR(attendee)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSendQR(attendee)}
                      className="flex-1 hover:bg-success hover:text-success-foreground"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};