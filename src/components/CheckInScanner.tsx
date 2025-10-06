import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Scan, Camera, CameraOff, UserCheck, AlertCircle, Maximize, Minimize, Flashlight, FlashlightOff, UserPlus } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";
import { useMobileOptimizations } from "@/hooks/useMobileOptimizations";
import type { Attendee } from "./EventDashboard";

interface CheckInScannerProps {
  attendees: Attendee[];
  onCheckIn: (qrCode: string) => Promise<{ guestType: string; checkinNumber: number; attendeeName: string } | undefined>;
  onAddWalkIn?: (attendee: { name: string; email?: string; phone?: string; company?: string }) => Promise<any>;
}

export const CheckInScanner = ({ attendees, onCheckIn, onAddWalkIn }: CheckInScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState<Attendee | null>(null);
  const [scannerError, setScannerError] = useState<string>("");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInData, setWalkInData] = useState({ name: '', email: '', phone: '', company: '' });
  const [processingQR, setProcessingQR] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successData, setSuccessData] = useState<{
    name: string;
    email: string;
    guestType: string;
    checkinNumber: number;
  } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const isScanningLockRef = useRef<boolean>(false);
  const cooldownMapRef = useRef<Map<string, number>>(new Map());
  // Strict detection throttle to prevent duplicate callbacks within a short window
  const DETECTION_THROTTLE_MS = 2000;
  const throttleUntilRef = useRef<number>(0);
  const lastDecodedRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<number>(0); // Track when scanner session starts
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Safety timeout for processing state
  const { toast } = useToast();
  const { isMobile, isFullscreen, requestFullscreen, exitFullscreen, vibrate } = useMobileOptimizations();

  // Cooldown period in milliseconds (3 seconds)
  const COOLDOWN_PERIOD = 3000;

  const handleScanSuccess = async (decodedText: string) => {
    const now = Date.now();

    // Session cooldown: Ignore scans within 1500ms of starting the scanner session
    // This prevents cached/buffered QR codes from being processed
    if (now - sessionStartTimeRef.current < 1500) {
      console.log('Ignoring scan - session cooldown period');
      return;
    }

    // If a scan is already being processed, ignore this one
    if (isScanningLockRef.current) {
      return;
    }

    // Throttle rapid successive detections
    if (now < throttleUntilRef.current) {
      return;
    }

    // Ignore same code seen immediately before in this session
    if (decodedText === lastDecodedRef.current) {
      // small re-throttle to avoid bursts
      throttleUntilRef.current = now + 800;
      return;
    }

    const lastScanTime = cooldownMapRef.current.get(decodedText);

    // Check if this QR code was scanned recently (within cooldown period)
    if (lastScanTime && now - lastScanTime < COOLDOWN_PERIOD) {
      // Show cooldown feedback
      if (processingQR !== decodedText) {
        setProcessingQR(decodedText);
        const remainingTime = Math.ceil((COOLDOWN_PERIOD - (now - lastScanTime)) / 1000);
        toast({
          title: "Please Wait",
          description: `QR code recently scanned. Wait ${remainingTime}s before next scan.`,
          variant: "default"
        });
        
        // Clear processing state after a short delay
        setTimeout(() => setProcessingQR(null), 1500);
      }
      // Briefly throttle to avoid rapid duplicate callbacks
      throttleUntilRef.current = now + 800;
      return;
    }

    // Set session throttle/dedupe and acquire processing lock
    throttleUntilRef.current = now + DETECTION_THROTTLE_MS;
    lastDecodedRef.current = decodedText;
    isScanningLockRef.current = true;

    // Set cooldown for this QR code
    cooldownMapRef.current.set(decodedText, now);
    setProcessingQR(decodedText);

    // Safety timeout: Clear processing state after 5 seconds if something goes wrong
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    processingTimeoutRef.current = setTimeout(() => {
      console.warn('Processing timeout reached - clearing processing state');
      setProcessingQR(null);
      isScanningLockRef.current = false;
    }, 5000);

    // Immediately pause scanning to prevent multiple detections
    stopScanning({ preserveProcessing: true, preserveCooldown: true });
    
    // Clean up old entries (keep only last 50 entries to prevent memory bloat)
    if (cooldownMapRef.current.size > 50) {
      const entries = Array.from(cooldownMapRef.current.entries());
      const cutoff = now - COOLDOWN_PERIOD * 2; // Keep entries for 2x cooldown period
      const validEntries = entries.filter(([, timestamp]) => timestamp > cutoff);
      cooldownMapRef.current = new Map(validEntries.slice(-30)); // Keep only 30 most recent
    }

    const attendee = attendees.find(a => a.qrCode === decodedText);
    
    if (attendee) {
      try {
        const result = await onCheckIn(decodedText);
        
        // Clear processing timeout on success
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }
        
        if (result) {
          // Single success vibration
          if (isMobile) {
            vibrate([150]); // Single 150ms haptic feedback
          }
          
          // Scanner already stopped at line 86, show success dialog
          
          setSuccessData({
            name: result.attendeeName,
            email: attendee.email,
            guestType: result.guestType,
            checkinNumber: result.checkinNumber
          });
          
          setShowSuccessDialog(true);
          
          setLastScanned({
            ...attendee,
            guestType: result.guestType,
            checkinNumber: result.checkinNumber
          });
        }
      } catch (error) {
        console.error('Check-in error:', error);
        // Clear processing timeout on error
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }
        if (isMobile) {
          vibrate([100, 100, 100]); // Error vibration pattern
        }
        // Auto-restart scanning after error
        setTimeout(() => {
          setProcessingQR(null);
          startScanning();
        }, 1000);
      }
    } else {
      // Clear processing timeout for invalid QR
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      if (isMobile) {
        vibrate([100, 100, 100]); // Error vibration pattern
      }
      toast({
        title: "Invalid QR Code",
        description: "This QR code is not registered for this event",
        variant: "destructive"
      });
      setTimeout(() => {
        setProcessingQR(null);
        // Auto-restart scanning after showing the error
        startScanning();
      }, 1000);
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
      // Request back camera for mobile devices
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: isMobile ? "environment" : "user"
        } 
      });
      // Stop the stream immediately as we just needed to check permissions
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      setScannerError("");
      return true;
    } catch (error: any) {
      console.error("Camera permission denied:", error);
      setPermissionState('denied');
      
      // Set Android-specific error message with recovery steps
      const isAndroid = /android/i.test(navigator.userAgent);
      
      if (isAndroid) {
        setScannerError(
          "Camera access blocked. To fix:\n" +
          "1. Tap the lock icon (🔒) in your browser's address bar\n" +
          "2. Tap 'Permissions' or 'Site settings'\n" +
          "3. Find 'Camera' and select 'Allow'\n" +
          "4. Reload this page and try again\n\n" +
          "Or use the Manual Entry option below."
        );
      } else {
        setScannerError(
          "Camera permission denied. Please allow camera access in your browser settings and reload the page."
        );
      }
      
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
    // Reset scan guards when starting fresh
    isScanningLockRef.current = false;
    throttleUntilRef.current = 0;
    setProcessingQR(null);
    setScannerError("");
    
    // Clear processing timeout if any
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    
    // Clear any existing scanner instance first
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.log("Error clearing previous scanner:", error);
      }
    }
    
    // Add 300ms delay to flush camera buffer from previous session
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check if camera is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerError("Camera not available. Your browser or device doesn't support camera access.");
      return;
    }

    // Check permission state first
    if (permissionState === 'denied') {
      const isAndroid = /android/i.test(navigator.userAgent);
      setScannerError(
        isAndroid
          ? "Camera access blocked. Tap the lock icon (🔒) in your browser's address bar → Permissions → Camera → Allow, then reload and try again."
          : "Camera permission denied. Please allow camera access in your browser settings and reload the page."
      );
      return;
    }

    // Request camera permission first
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      return;
    }

    // Set session start time for cooldown protection
    sessionStartTimeRef.current = Date.now();
    
    // Delay clearing lastDecodedRef to maintain protection against previous QR code
    setTimeout(() => {
      lastDecodedRef.current = null;
    }, 2000);
    
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

      const Html5QrcodeScanner = (await import('html5-qrcode')).Html5QrcodeScanner;
      const { Html5QrcodeScanType } = await import('html5-qrcode');
      
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: isMobile ? 5 : 5,
          qrbox: isMobile 
            ? { width: Math.min(300, window.innerWidth - 40), height: Math.min(300, window.innerWidth - 40) }
            : { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: isMobile ? 1.5 : 2,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA, Html5QrcodeScanType.SCAN_TYPE_FILE],
          rememberLastUsedCamera: true,
          videoConstraints: {
            facingMode: isMobile ? "environment" : "user"
          }
        },
        false
      );

      scannerRef.current.render(handleScanSuccess, (error) => {
        // Only show meaningful errors
        if (error.includes("Permission denied") || error.includes("NotAllowedError")) {
          setPermissionState('denied');
          const isAndroid = /android/i.test(navigator.userAgent);
          setScannerError(
            isAndroid
              ? "Camera blocked. Fix: Tap lock icon (🔒) in address bar → Permissions → Camera → Allow → Reload page"
              : "Camera permission denied. Allow camera access in browser settings and reload."
          );
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

  const stopScanning = (optionsOrEvent?: any) => {
    // Normalize options when this is used as an onClick handler
    const options: { preserveProcessing?: boolean; preserveCooldown?: boolean } | undefined =
      optionsOrEvent && typeof optionsOrEvent === 'object' && 'preventDefault' in optionsOrEvent
        ? undefined
        : optionsOrEvent;

    // Do NOT release scan lock here - only release when startScanning() is called
    
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setCurrentStream(null);
    }
    
    if (scannerRef.current) {
      scannerRef.current.clear().then(() => {
        setIsScanning(false);
        setScannerError("");
        setIsTorchOn(false);
        if (!options?.preserveProcessing) {
          setProcessingQR(null);
        }
        // Clear cooldown map when stopping scanner, unless preserved
        if (!options?.preserveCooldown) {
          cooldownMapRef.current.clear();
        }
      }).catch((error) => {
        console.error("Error stopping scanner:", error);
        setIsScanning(false);
        setIsTorchOn(false);
        if (!options?.preserveProcessing) {
          setProcessingQR(null);
        }
        if (!options?.preserveCooldown) {
          cooldownMapRef.current.clear();
        }
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
          phone: walkInData.phone.trim() || undefined,
          company: walkInData.company.trim() || undefined
        });
        
        // Reset form and close dialog
        setWalkInData({ name: '', email: '', phone: '', company: '' });
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
                   
                   {/* Processing indicator */}
                   {processingQR && (
                     <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center">
                       <div className="bg-background/90 rounded-lg p-4 text-center">
                         <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                         <p className="text-sm font-medium">Processing scan...</p>
                       </div>
                     </div>
                   )}
                 </div>
                
                {scannerError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="whitespace-pre-line">
                      {scannerError}
                      {permissionState === 'denied' && (
                        <div className="mt-4">
                          <Button
                            onClick={async () => {
                              setScannerError("");
                              setPermissionState('unknown');
                              await requestCameraPermission();
                            }}
                            variant="outline"
                            size="sm"
                            className="bg-background"
                          >
                            Retry Permission
                          </Button>
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
                  
                  {!isScanning && isMobile && (
                    <Button
                      onClick={requestCameraPermission}
                      variant="outline"
                      className="py-4 text-lg"
                    >
                      <AlertCircle className="w-6 h-6 mr-2" />
                      Request Camera Permission
                    </Button>
                  )}
                </div>
                
                {!isScanning && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Having trouble? Use the "Scan from Image" button in the scanner or try manual entry below
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
                        <div>
                          <Label htmlFor="walkInCompany">Company (Optional)</Label>
                          <Input
                            id="walkInCompany"
                            value={walkInData.company}
                            onChange={(e) => setWalkInData({ ...walkInData, company: e.target.value })}
                            placeholder="Enter company name (optional)"
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

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={(open) => {
        setShowSuccessDialog(open);
        if (!open) {
          setProcessingQR(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success text-2xl justify-center">
              <UserCheck className="w-8 h-8" />
              Successfully Scanned!
            </DialogTitle>
            <DialogDescription className="sr-only">Attendee has been successfully checked in to the event</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Large success checkmark animation */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center animate-in zoom-in duration-300">
                <UserCheck className="w-16 h-16 text-success" />
              </div>
            </div>
            
            {/* Attendee details */}
            {successData && (
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">{successData.name}</h3>
                <p className="text-muted-foreground">{successData.email}</p>
                <Badge className="bg-success text-success-foreground text-base px-4 py-1">
                  Check-in #{successData.checkinNumber}
                </Badge>
                <Badge variant="outline" className="text-base px-4 py-1 ml-2">
                  {successData.guestType}
                </Badge>
              </div>
            )}
          </div>
          
          {/* Scan another button */}
          <div className="space-y-2">
            <Button 
              onClick={() => {
                setShowSuccessDialog(false);
                setSuccessData(null);
                setProcessingQR(null);
                // Restart scanner automatically
                startScanning();
              }}
              className="w-full bg-gradient-primary hover:shadow-glow py-6 text-lg"
            >
              <Scan className="w-6 h-6 mr-2" />
              Scan Another QR Code
            </Button>
            
            <Button 
              onClick={() => {
                setShowSuccessDialog(false);
                setSuccessData(null);
                setProcessingQR(null);
                stopScanning();
              }}
              variant="outline"
              className="w-full py-4"
            >
              Done Scanning
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Last Scanned (Historical Reference) */}
      {lastScanned && !isFullscreen && !showSuccessDialog && (
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
      {isMobile && isFullscreen && lastScanned && !showSuccessDialog && (
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