import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Scan, Camera, CameraOff, UserCheck, AlertCircle, Maximize, Minimize, Flashlight, FlashlightOff, UserPlus } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";
import { useMobileOptimizations } from "@/hooks/useMobileOptimizations";
import type { Attendee } from "./EventDashboard";

interface CheckInScannerProps {
  attendees: Attendee[];
  onCheckIn: (qrCode: string) => void;
  onAddWalkIn?: (attendee: { name: string; email?: string; phone?: string }) => Promise<any>;
}

export const CheckInScanner = ({ attendees, onCheckIn, onAddWalkIn }: CheckInScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState<Attendee | null>(null);
  const [scannerError, setScannerError] = useState<string>("");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInData, setWalkInData] = useState({ name: '', email: '', phone: '' });
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { toast } = useToast();
  const { isMobile, isFullscreen, requestFullscreen, exitFullscreen, vibrate } = useMobileOptimizations();

  const handleScanSuccess = (decodedText: string) => {
    const attendee = attendees.find(a => a.qrCode === decodedText);
    
    // Mobile feedback
    if (isMobile) {
      vibrate([100, 50, 100]); // Success vibration pattern
    }
    
    if (attendee) {
      if (attendee.checkedIn) {
        if (isMobile) {
          vibrate([200, 100, 200]); // Error vibration pattern
        }
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
      if (isMobile) {
        vibrate([200, 100, 200]); // Error vibration pattern
      }
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

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately as we just needed to check permissions
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("Camera permission denied:", error);
      setScannerError("Camera permission denied. Please allow camera access and try again.");
      return false;
    }
  };

  const toggleTorch = async () => {
    if (!currentStream) return;
    
    const videoTrack = currentStream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const capabilities = videoTrack.getCapabilities() as any;
      if (capabilities.torch) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !isTorchOn } as any]
        });
        setIsTorchOn(!isTorchOn);
      }
    } catch (error) {
      console.warn('Torch toggle failed:', error);
    }
  };

  const startScanning = async () => {
    setScannerError("");
    
    // Check if camera is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerError("Camera not available. Your browser or device doesn't support camera access.");
      return;
    }

    // Request camera permission first
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      return;
    }

    setIsScanning(true);
    
    try {
      // Get camera stream for torch control
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: isMobile ? "environment" : "user",
          width: { ideal: isMobile ? 1920 : 640 },
          height: { ideal: isMobile ? 1080 : 480 }
        } 
      });
      setCurrentStream(stream);
      
      // Stop the stream as html5-qrcode will handle it
      stream.getTracks().forEach(track => track.stop());

      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: isMobile ? 15 : 10,
          qrbox: isMobile 
            ? { width: Math.min(300, window.innerWidth - 40), height: Math.min(300, window.innerWidth - 40) }
            : { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: isMobile ? 1.5 : 2,
          videoConstraints: {
            facingMode: isMobile ? "environment" : "user"
          }
        },
        false
      );

      scannerRef.current.render(handleScanSuccess, (error) => {
        // Only show meaningful errors
        if (error.includes("Permission denied") || error.includes("NotAllowedError")) {
          setScannerError("Camera permission denied. Please allow camera access in your browser settings.");
        } else if (error.includes("NotFoundError") || error.includes("No camera found")) {
          setScannerError("No camera found. Please ensure your device has a camera.");
        } else if (!error.includes("No QR code found") && !error.includes("QR code parse error")) {
          console.error("Scanner error:", error);
        }
      });
    } catch (error) {
      console.error("Failed to start scanner:", error);
      setScannerError("Failed to initialize camera scanner. Please try again.");
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setCurrentStream(null);
    }
    
    if (scannerRef.current) {
      scannerRef.current.clear().then(() => {
        setIsScanning(false);
        setScannerError("");
        setIsTorchOn(false);
      }).catch((error) => {
        console.error("Error stopping scanner:", error);
        setIsScanning(false);
        setIsTorchOn(false);
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

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walkInData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter the attendee's name",
        variant: "destructive"
      });
      return;
    }

    if (onAddWalkIn) {
      try {
        await onAddWalkIn({
          name: walkInData.name.trim(),
          email: walkInData.email.trim() || undefined,
          phone: walkInData.phone.trim() || undefined
        });
        
        // Reset form and close dialog
        setWalkInData({ name: '', email: '', phone: '' });
        setShowWalkInForm(false);
      } catch (error) {
        console.error('Error adding walk-in:', error);
      }
    }
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
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4 overflow-auto' : ''}`}>
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Scanner Section */}
        <Card className={`shadow-elegant ${isFullscreen ? 'h-full' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scan className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
              QR Code Scanner
            </CardTitle>
            {isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={isFullscreen ? exitFullscreen : requestFullscreen}
                className="p-2"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            )}
          </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className={`bg-accent/20 rounded-lg mb-4 ${isFullscreen ? 'p-2' : 'p-6'}`}>
                  <div id="qr-reader" className={isScanning ? "" : "hidden"}></div>
                  {!isScanning && (
                    <div className={`flex flex-col items-center ${isFullscreen ? 'space-y-6 py-8' : 'space-y-4'}`}>
                      <Camera className={`text-muted-foreground ${isMobile ? 'w-20 h-20' : 'w-16 h-16'}`} />
                      <p className={`text-muted-foreground ${isMobile ? 'text-lg' : ''}`}>
                        {isMobile ? 'Tap "Start Scanner" to scan QR codes' : 'Click "Start Scanner" to begin scanning QR codes with your camera'}
                      </p>
                      <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>
                        {isMobile ? 'Allow camera access when prompted' : 'Make sure to allow camera permissions when prompted'}
                      </p>
                    </div>
                  )}
                </div>
                
                {scannerError && (
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {scannerError}
                      {scannerError.includes("permission") && (
                        <div className="mt-2 text-sm">
                          <p>To fix this:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Click the camera icon in your browser's address bar</li>
                            <li>Select "Allow" for camera access</li>
                            <li>Refresh the page and try again</li>
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className={`flex gap-2 justify-center ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'}`}>
                  <Button
                    onClick={isScanning ? stopScanning : startScanning}
                    className={`${isMobile ? 'py-4 text-lg' : ''} ${isScanning 
                      ? "bg-destructive hover:bg-destructive/90" 
                      : "bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <CameraOff className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} mr-2`} />
                        Stop Scanner
                      </>
                    ) : (
                      <>
                        <Camera className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} mr-2`} />
                        Start Scanner
                      </>
                    )}
                  </Button>
                  
                  {isScanning && isMobile && (
                    <Button
                      onClick={toggleTorch}
                      variant="outline"
                      className="py-4 text-lg"
                    >
                      {isTorchOn ? (
                        <>
                          <FlashlightOff className="w-6 h-6 mr-2" />
                          Turn Off Flash
                        </>
                      ) : (
                        <>
                          <Flashlight className="w-6 h-6 mr-2" />
                          Turn On Flash
                        </>
                      )}
                    </Button>
                  )}
                  
                  {!isScanning && !isMobile && (
                    <Button
                      onClick={requestCameraPermission}
                      variant="outline"
                      className="text-sm"
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Request Camera Permissions
                    </Button>
                  )}
                </div>
                
                {!isScanning && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Having trouble? Try the manual entry option below
                  </p>
                )}
              </div>
            </CardContent>
        </Card>

        {/* Manual Entry & Stats */}
        {!isFullscreen && (
          <div className="space-y-6">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className={isMobile ? 'text-lg' : ''}>Manual Check-In</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                  <Input
                    placeholder="Enter QR code manually"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualCheckIn()}
                    className={isMobile ? 'py-3 text-lg' : ''}
                  />
                  <Button 
                    onClick={handleManualCheckIn} 
                    variant="outline"
                    className={isMobile ? 'py-3 text-lg' : ''}
                  >
                    <UserCheck className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} mr-2`} />
                    Check In
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Walk-in Registration */}
            {onAddWalkIn && (
              <Card className="shadow-elegant border-primary/20">
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
                    <UserPlus className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-primary`} />
                    Quick Walk-in Registration
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Register uninvited guests on the spot
                  </p>
                </CardHeader>
                <CardContent>
                  <Dialog open={showWalkInForm} onOpenChange={setShowWalkInForm}>
                    <DialogTrigger asChild>
                      <Button 
                        className={`w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 ${isMobile ? 'py-4 text-lg' : ''}`}
                      >
                        <UserPlus className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} mr-2`} />
                        Add Walk-in Guest
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Quick Walk-in Registration</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleWalkInSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="walkInName">Name *</Label>
                          <Input
                            id="walkInName"
                            value={walkInData.name}
                            onChange={(e) => setWalkInData({ ...walkInData, name: e.target.value })}
                            placeholder="Enter guest's name"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="walkInEmail">Email (Optional)</Label>
                          <Input
                            id="walkInEmail"
                            type="email"
                            value={walkInData.email}
                            onChange={(e) => setWalkInData({ ...walkInData, email: e.target.value })}
                            placeholder="Enter email (optional)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="walkInPhone">Phone (Optional)</Label>
                          <Input
                            id="walkInPhone"
                            value={walkInData.phone}
                            onChange={(e) => setWalkInData({ ...walkInData, phone: e.target.value })}
                            placeholder="Enter phone (optional)"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => setShowWalkInForm(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" className="bg-gradient-primary">
                            Register & Check In
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className={isMobile ? 'text-lg' : ''}>Check-In Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`flex justify-between items-center ${isMobile ? 'text-lg' : ''}`}>
                  <span>Total Registered:</span>
                  <Badge variant="outline" className={isMobile ? 'text-base px-3 py-1' : ''}>{totalCount}</Badge>
                </div>
                <div className={`flex justify-between items-center ${isMobile ? 'text-lg' : ''}`}>
                  <span>Checked In:</span>
                  <Badge className={`bg-success text-success-foreground ${isMobile ? 'text-base px-3 py-1' : ''}`}>{checkedInCount}</Badge>
                </div>
                <div className={`flex justify-between items-center ${isMobile ? 'text-lg' : ''}`}>
                  <span>Remaining:</span>
                  <Badge variant="secondary" className={isMobile ? 'text-base px-3 py-1' : ''}>{totalCount - checkedInCount}</Badge>
                </div>
                <div className={`w-full bg-muted rounded-full ${isMobile ? 'h-3' : 'h-2'}`}>
                  <div 
                    className={`bg-gradient-success rounded-full transition-all duration-300 ${isMobile ? 'h-3' : 'h-2'}`}
                    style={{ width: `${totalCount > 0 ? (checkedInCount / totalCount) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className={`text-center text-muted-foreground ${isMobile ? 'text-base' : 'text-sm'}`}>
                  {totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0}% attendance rate
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Last Scanned */}
      {lastScanned && !isFullscreen && (
        <Card className="shadow-elegant border-success/50">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-success ${isMobile ? 'text-lg' : ''}`}>
              <UserCheck className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
              Last Check-In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-semibold ${isMobile ? 'text-lg' : ''}`}>{lastScanned.name}</h3>
                <p className={`text-muted-foreground ${isMobile ? 'text-base' : 'text-sm'}`}>{lastScanned.email}</p>
                <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>QR: {lastScanned.qrCode}</p>
              </div>
              <Badge className={`bg-success text-success-foreground ${isMobile ? 'text-base px-3 py-1' : ''}`}>
                Checked In
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Mobile Quick Stats in Fullscreen */}
      {isMobile && isFullscreen && lastScanned && (
        <div className="fixed bottom-4 left-4 right-4 bg-card border border-success/50 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-success">{lastScanned.name}</p>
              <p className="text-sm text-muted-foreground">Just checked in</p>
            </div>
            <Badge className="bg-success text-success-foreground">
              ✓ Success
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};