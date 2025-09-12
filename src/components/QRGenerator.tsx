import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download, Send, Eye, Upload, Image as ImageIcon, CheckCircle, Clock, Loader2, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { composeQRWithBackground, type QRCompositionOptions } from "@/lib/qr-canvas";
import { useBackgroundPersistence } from "@/hooks/useBackgroundPersistence";
import { hslToHex } from "@/lib/utils";
import type { Attendee } from "./EventDashboard";
import type { LogEntry } from "./LogsView";

interface QRGeneratorProps {
  attendees: Attendee[];
  onLog?: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  defaultMessage?: string;
}

type QRProgress = 'waiting' | 'generating' | 'ready' | 'error';

export const QRGenerator = ({ attendees, onLog, defaultMessage = "" }: QRGeneratorProps) => {
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [qrProgress, setQrProgress] = useState<Record<string, QRProgress>>({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const {
    backgroundFile,
    backgroundPreview,
    qrOptions,
    saveBackground,
    removeBackground,
    updateQrOptions
  } = useBackgroundPersistence();

  const generateQRCodes = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setOverallProgress(0);
    
    // Initialize progress for all attendees
    const progressState: Record<string, QRProgress> = {};
    attendees.forEach(attendee => {
      progressState[attendee.id] = 'waiting';
    });
    setQrProgress(progressState);
    
    try {
      const images: Record<string, string> = {};
      let completedCount = 0;
      
      for (const attendee of attendees) {
        if (attendee.qrCode) {
          try {
            // Update progress to generating
            setQrProgress(prev => ({ ...prev, [attendee.id]: 'generating' }));
            
            // Generate base QR code
            const baseQrDataURL = await QRCode.toDataURL(attendee.qrCode, {
              width: qrOptions.qrSize,
              margin: 2,
              color: {
                dark: hslToHex(262, 83, 58), // Convert primary color to hex
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
            
            // Update progress to ready
            setQrProgress(prev => ({ ...prev, [attendee.id]: 'ready' }));
            completedCount++;
            
            // Update overall progress
            setOverallProgress((completedCount / attendees.length) * 100);
            
          } catch (error) {
            console.error('Error generating QR code:', error);
            setQrProgress(prev => ({ ...prev, [attendee.id]: 'error' }));
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

  const handleSendWhatsApp = (attendee: Attendee) => {
    try {
      const qrImageData = qrImages[attendee.id];
      if (!qrImageData) {
        toast({
          title: "Error",
          description: "QR code not generated yet",
          variant: "destructive"
        });
        return;
      }

      // Clean phone number (remove non-numeric characters except +)
      const cleanPhone = attendee.phone.replace(/[^\d+]/g, '');
      
      if (!cleanPhone) {
        toast({
          title: "Error",
          description: "No phone number available for this attendee",
          variant: "destructive"
        });
        return;
      }

      // Create WhatsApp message
      const message = defaultMessage || `Hi ${attendee.name}! Here's your QR code for the event. Code: ${attendee.qrCode}`;
      const encodedMessage = encodeURIComponent(message);
      
      // Create WhatsApp Web URL
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      
      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank');

      // Log WhatsApp sending
      onLog?.({
        type: 'whatsapp_sent',
        action: 'QR code sent via WhatsApp',
        user: attendee.name,
        email: attendee.email,
        details: `WhatsApp message opened for ${cleanPhone}`,
        status: 'success'
      });

      toast({
        title: "WhatsApp Opened!",
        description: `WhatsApp opened with QR code message for ${attendee.name}`,
      });
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
      
      onLog?.({
        type: 'whatsapp_sent',
        action: 'WhatsApp opening failed',
        user: attendee.name,
        email: attendee.email,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error'
      });

      toast({
        title: "Error",
        description: "Failed to open WhatsApp",
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
        
        saveBackground(file);
        
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
    removeBackground();
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

          {/* Progress Bar */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Generating QR codes...</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="w-full" />
            </div>
          )}

          {/* QR Customization Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>QR Size: {qrOptions.qrSize}px</Label>
              <Slider
                value={[qrOptions.qrSize]}
                onValueChange={(value) => updateQrOptions({ qrSize: value[0] })}
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
                onValueChange={(value) => updateQrOptions({ qrOpacity: value[0] })}
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
                  onValueChange={(value) => updateQrOptions({ backgroundOpacity: value[0] })}
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
                onValueChange={(value) => updateQrOptions({ position: value as QRCompositionOptions['position'] })}
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
                     {qrProgress[attendee.id] === 'ready' && qrImages[attendee.id] ? (
                       <div className="relative">
                         <img 
                           src={qrImages[attendee.id]} 
                           alt={`QR Code for ${attendee.name}`}
                           className="w-32 h-32 border rounded-lg object-cover"
                         />
                         <div className="absolute -top-2 -right-2 bg-success rounded-full p-1">
                           <CheckCircle className="w-4 h-4 text-success-foreground" />
                         </div>
                       </div>
                     ) : qrProgress[attendee.id] === 'generating' ? (
                       <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                         <div className="flex flex-col items-center gap-2">
                           <Loader2 className="w-6 h-6 animate-spin text-primary" />
                           <span className="text-xs text-muted-foreground">Generating...</span>
                         </div>
                       </div>
                     ) : qrProgress[attendee.id] === 'error' ? (
                       <div className="w-32 h-32 bg-destructive/10 rounded-lg flex items-center justify-center border border-destructive/20">
                         <span className="text-xs text-destructive text-center">
                           Generation failed
                         </span>
                       </div>
                     ) : (
                       <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                         <div className="flex flex-col items-center gap-2">
                           <Clock className="w-6 h-6 text-muted-foreground" />
                           <span className="text-xs text-muted-foreground">Waiting...</span>
                         </div>
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
                   </div>
                   <div className="flex gap-2 mt-2">
                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => handleSendQR(attendee)}
                       className="flex-1 hover:bg-success hover:text-success-foreground"
                     >
                       <Send className="w-4 h-4 mr-1" />
                       Email
                     </Button>
                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => handleSendWhatsApp(attendee)}
                       className="flex-1 hover:bg-accent hover:text-accent-foreground"
                       disabled={!attendee.phone}
                     >
                       <MessageCircle className="w-4 h-4 mr-1" />
                       WhatsApp
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