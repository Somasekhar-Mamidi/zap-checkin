import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Send, Eye, Upload, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { composeQRWithBackground, type QRCompositionOptions } from "@/lib/qr-canvas";
import type { Attendee } from "./EventDashboard";
import type { LogEntry } from "./LogsView";

interface QRGeneratorProps {
  attendees: Attendee[];
  onLog?: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  defaultMessage?: string;
}

export const QRGenerator = ({ attendees, onLog, defaultMessage = "" }: QRGeneratorProps) => {
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [qrOptions, setQrOptions] = useState<QRCompositionOptions>({
    qrSize: 200,
    qrOpacity: 1,
    position: 'center',
    backgroundOpacity: 1,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const generateQRCodes = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    try {
      const images: Record<string, string> = {};
      for (const attendee of attendees) {
        if (attendee.qrCode) {
          try {
            // Generate base QR code
            const baseQrDataURL = await QRCode.toDataURL(attendee.qrCode, {
              width: qrOptions.qrSize,
              margin: 2,
              color: {
                dark: 'hsl(262 83% 58%)', // Use primary color from design system
                light: '#FFFFFF'
              }
            });

            // Compose with background if available
            let finalQrDataURL = baseQrDataURL;
            if (backgroundFile) {
              finalQrDataURL = await composeQRWithBackground(baseQrDataURL, {
                ...qrOptions,
                background: backgroundFile,
              });
            }

            images[attendee.id] = finalQrDataURL;
          } catch (error) {
            console.error('Error generating QR code:', error);
          }
        }
      }
      setQrImages(images);
    } catch (error) {
      console.error('Error in QR generation:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR codes",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateQRCodes();
  }, [attendees, backgroundFile, qrOptions]);

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
          defaultMessage
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast({
            title: "File too large",
            description: "Please select an image smaller than 5MB",
            variant: "destructive"
          });
          return;
        }
        
        setBackgroundFile(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setBackgroundPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
        toast({
          title: "Background uploaded!",
          description: "QR codes will be regenerated with the new background",
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (PNG, JPG, etc.)",
          variant: "destructive"
        });
      }
    }
  };

  const handleRemoveBackground = () => {
    setBackgroundFile(null);
    setBackgroundPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: "Background removed",
      description: "QR codes will be regenerated without background",
    });
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
      {/* Background Upload and Controls */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Branded QR Codes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload a background image and customize your QR codes
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Background Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Background
              </Button>
              {backgroundFile && (
                <Button 
                  onClick={handleRemoveBackground}
                  variant="outline"
                  size="sm"
                >
                  Remove Background
                </Button>
              )}
            </div>
            
            {backgroundPreview && (
              <div className="relative w-32 h-32">
                <img 
                  src={backgroundPreview} 
                  alt="Background preview"
                  className="w-full h-full object-cover rounded-lg border"
                />
              </div>
            )}
          </div>

          {/* QR Customization Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>QR Size: {qrOptions.qrSize}px</Label>
              <Slider
                value={[qrOptions.qrSize]}
                onValueChange={(value) => setQrOptions(prev => ({ ...prev, qrSize: value[0] }))}
                min={100}
                max={300}
                step={10}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label>QR Opacity: {Math.round(qrOptions.qrOpacity * 100)}%</Label>
              <Slider
                value={[qrOptions.qrOpacity]}
                onValueChange={(value) => setQrOptions(prev => ({ ...prev, qrOpacity: value[0] }))}
                min={0.5}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
            
            {backgroundFile && (
              <div className="space-y-2">
                <Label>Background Opacity: {Math.round(qrOptions.backgroundOpacity * 100)}%</Label>
                <Slider
                  value={[qrOptions.backgroundOpacity]}
                  onValueChange={(value) => setQrOptions(prev => ({ ...prev, backgroundOpacity: value[0] }))}
                  min={0.3}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                value={qrOptions.position}
                onValueChange={(value) => setQrOptions(prev => ({ ...prev, position: value as QRCompositionOptions['position'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Generator */}
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Generated QR Codes</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isGenerating ? "Generating QR codes..." : `${attendees.length} QR codes ready`}
            </p>
          </div>
          <Button 
            onClick={handleDownloadAll}
            disabled={isGenerating || Object.keys(qrImages).length === 0}
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
                         className="w-32 h-32 border rounded-lg object-cover"
                       />
                     ) : (
                       <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                         <span className="text-muted-foreground">
                           {isGenerating ? "Generating..." : "Loading..."}
                         </span>
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
                               className="w-64 h-64 border rounded-lg object-cover"
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