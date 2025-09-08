import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scan, Camera, CameraOff, UserCheck, AlertCircle } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";
import type { Attendee } from "./EventDashboard";

interface CheckInScannerProps {
  attendees: Attendee[];
  onCheckIn: (qrCode: string) => void;
}

export const CheckInScanner = ({ attendees, onCheckIn }: CheckInScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState<Attendee | null>(null);
  const [scannerError, setScannerError] = useState<string>("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { toast } = useToast();

  const handleScanSuccess = (decodedText: string) => {
    const attendee = attendees.find(a => a.qrCode === decodedText);
    
    if (attendee) {
      if (attendee.checkedIn) {
        toast({
          title: "Already Checked In",
          description: `${attendee.name} was already checked in`,
          variant: "destructive"
        });
      } else {
        onCheckIn(decodedText);
        setLastScanned(attendee);
        toast({
          title: "Check-In Successful!",
          description: `${attendee.name} has been checked in`,
        });
      }
    } else {
      toast({
        title: "Invalid QR Code",
        description: "This QR code is not registered for this event",
        variant: "destructive"
      });
    }
  };

  const handleScanError = (error: string) => {
    // Only show error if it's not a common scanning error
    if (!error.includes("No QR code found")) {
      setScannerError(error);
    }
  };

  const startScanning = () => {
    setIsScanning(true);
    setScannerError("");
    
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    scannerRef.current.render(handleScanSuccess, handleScanError);
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().then(() => {
        setIsScanning(false);
        setScannerError("");
      }).catch((error) => {
        console.error("Error stopping scanner:", error);
        setIsScanning(false);
      });
    }
  };

  const handleManualCheckIn = () => {
    if (!manualCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a QR code",
        variant: "destructive"
      });
      return;
    }

    handleScanSuccess(manualCode.trim());
    setManualCode("");
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const checkedInCount = attendees.filter(a => a.checkedIn).length;
  const totalCount = attendees.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5" />
              QR Code Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="bg-accent/20 rounded-lg p-6 mb-4">
                <div id="qr-reader" className={isScanning ? "" : "hidden"}></div>
                {!isScanning && (
                  <div className="flex flex-col items-center space-y-4">
                    <Camera className="w-16 h-16 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Click the button below to start scanning QR codes
                    </p>
                  </div>
                )}
              </div>
              
              {scannerError && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{scannerError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={isScanning ? stopScanning : startScanning}
                className={isScanning 
                  ? "bg-destructive hover:bg-destructive/90" 
                  : "bg-gradient-primary hover:shadow-glow transition-all duration-300"
                }
              >
                {isScanning ? (
                  <>
                    <CameraOff className="w-4 h-4 mr-2" />
                    Stop Scanner
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Start Scanner
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry & Stats */}
        <div className="space-y-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Manual Check-In</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter QR code manually"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualCheckIn()}
                />
                <Button onClick={handleManualCheckIn} variant="outline">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Check-In Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Total Registered:</span>
                <Badge variant="outline">{totalCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Checked In:</span>
                <Badge className="bg-success text-success-foreground">{checkedInCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Remaining:</span>
                <Badge variant="secondary">{totalCount - checkedInCount}</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-gradient-success h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalCount > 0 ? (checkedInCount / totalCount) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                {totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0}% attendance rate
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Last Scanned */}
      {lastScanned && (
        <Card className="shadow-elegant border-success/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <UserCheck className="w-5 h-5" />
              Last Check-In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{lastScanned.name}</h3>
                <p className="text-sm text-muted-foreground">{lastScanned.email}</p>
                <p className="text-xs text-muted-foreground">QR: {lastScanned.qrCode}</p>
              </div>
              <Badge className="bg-success text-success-foreground">
                Checked In
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};