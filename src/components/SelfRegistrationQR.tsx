import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode, ExternalLink } from "lucide-react";

const SelfRegistrationQR = () => {
  const registrationUrl = `${window.location.origin}/register`;

  const downloadQRCode = () => {
    const svg = document.getElementById("self-registration-qr");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      
      const link = document.createElement("a");
      link.download = "Self_Registration_QR_Code.png";
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const openRegistrationPage = () => {
    window.open(registrationUrl, "_blank");
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <CardTitle>Self-Registration QR Code</CardTitle>
        </div>
        <CardDescription>
          Display this QR code for attendees to register themselves
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg border-2 border-muted">
            <QRCodeSVG
              id="self-registration-qr"
              value={registrationUrl}
              size={200}
              level="M"
              includeMargin={true}
            />
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Registration URL:</p>
          <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded">
            {registrationUrl}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button onClick={downloadQRCode} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
          <Button onClick={openRegistrationPage} variant="outline" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Test Registration
          </Button>
        </div>

        <div className="bg-accent/50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-accent-foreground mb-2">How it works:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Attendees scan this QR code with their phone</li>
            <li>• They fill out a simple registration form</li>
            <li>• They get their own unique QR code instantly</li>
            <li>• Staff can check them in using the normal scanner</li>
            <li>• All walk-ins appear in your attendee reports</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SelfRegistrationQR;