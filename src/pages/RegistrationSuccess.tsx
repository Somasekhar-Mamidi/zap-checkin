import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { Download, UserPlus } from "lucide-react";
import { useEffect } from "react";

const RegistrationSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const attendeeData = location.state as { name: string; qr_code: string } | null;

  useEffect(() => {
    // Redirect to register page if no attendee data
    if (!attendeeData) {
      navigate("/register");
    }
  }, [attendeeData, navigate]);

  const downloadQRCode = () => {
    if (!attendeeData) return;
    
    const svg = document.getElementById("attendee-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 200, 200);
      ctx.drawImage(img, 0, 0, 200, 200);
      
      const link = document.createElement("a");
      link.download = `${attendeeData.name.replace(/\s+/g, "_")}_QR.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (!attendeeData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-success rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6 text-success-foreground" />
          </div>
          <CardTitle className="text-2xl text-foreground">Registration Complete!</CardTitle>
          <CardDescription>
            Welcome, {attendeeData.name}! Here's your QR code for check-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG
                id="attendee-qr-code"
                value={attendeeData.qr_code}
                size={150}
                level="M"
              />
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Your QR Code:</p>
            <p className="text-2xl font-mono font-bold text-foreground">{attendeeData.qr_code}</p>
          </div>

          <div className="space-y-3">
            <Button onClick={downloadQRCode} className="w-full" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-2">
            <p className="font-medium">What's next?</p>
            <p>1. Save or download your QR code</p>
            <p>2. Show this QR code at the event entrance for quick check-in</p>
            <p>3. You can close this page now</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationSuccess;
