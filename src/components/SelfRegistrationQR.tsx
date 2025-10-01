import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode, ExternalLink, Copy, AlertTriangle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SelfRegistrationQR = () => {
  const { toast } = useToast();
  const [publicSiteUrl, setPublicSiteUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  
  useEffect(() => {
    const saved = localStorage.getItem("publicSiteUrl");
    if (saved) {
      setPublicSiteUrl(saved);
      setInputUrl(saved);
    }
  }, []);

  const normalizeUrl = (url: string) => {
    return url.replace(/\/+$/, "");
  };

  const registrationUrl = publicSiteUrl 
    ? `${normalizeUrl(publicSiteUrl)}/register`
    : `${window.location.origin}/register`;

  const isEditorDomain = !publicSiteUrl && (
    window.location.hostname.includes("lovable.app") || 
    window.location.pathname.includes("/projects/")
  );

  const savePublicUrl = () => {
    const normalized = normalizeUrl(inputUrl);
    localStorage.setItem("publicSiteUrl", normalized);
    setPublicSiteUrl(normalized);
    toast({
      title: "Public URL Saved",
      description: "QR code will now use this URL for registration.",
    });
  };

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

  const copyLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    toast({
      title: "Link Copied",
      description: "Registration URL copied to clipboard.",
    });
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
        {isEditorDomain && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This QR code currently points to the Lovable editor domain, which requires login. 
              Please set your public site URL below to generate a working QR code for third-party attendees.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Label htmlFor="public-url">Public Site URL (for QR code)</Label>
          <div className="flex gap-2">
            <Input
              id="public-url"
              type="url"
              placeholder="https://your-site.lovable.app"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={savePublicUrl} size="icon" variant="outline">
              <Save className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your deployed site URL (e.g., https://your-app.lovable.app) so the QR code works for anyone.
          </p>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button onClick={downloadQRCode} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download QR
          </Button>
          <Button onClick={copyLink} variant="outline" className="w-full">
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          <Button onClick={openRegistrationPage} variant="outline" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Test Form
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