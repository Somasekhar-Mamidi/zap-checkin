import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Download, UserPlus } from "lucide-react";

const registrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

const SelfRegister = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredAttendee, setRegisteredAttendee] = useState<{ name: string; qr_code: string } | null>(null);
  const navigate = useNavigate();

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
    },
  });

  const onSubmit = async (data: RegistrationForm) => {
    setIsSubmitting(true);
    try {
      // Generate a unique 4-digit QR code
      const qrCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      const attendeeData = {
        name: data.name,
        email: data.email || "",
        phone: data.phone || "",
        company: data.company || "",
        qr_code: qrCode,
        registration_type: "walk_in",
        checked_in: false,
      };

      const { error } = await supabase
        .from("attendees")
        .insert([attendeeData]);

      if (error) throw error;

      setRegisteredAttendee({ name: data.name, qr_code: qrCode });
      toast.success("Registration successful! Your QR code is ready.");
      
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadQRCode = () => {
    if (!registeredAttendee) return;
    
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
      link.download = `${registeredAttendee.name.replace(/\s+/g, "_")}_QR.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (registeredAttendee) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-success rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6 text-success-foreground" />
            </div>
            <CardTitle className="text-2xl text-foreground">Registration Complete!</CardTitle>
            <CardDescription>
              Welcome, {registeredAttendee.name}! Here's your QR code for check-in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  id="attendee-qr-code"
                  value={registeredAttendee.qr_code}
                  size={150}
                  level="M"
                />
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Your QR Code:</p>
              <p className="text-2xl font-mono font-bold text-foreground">{registeredAttendee.qr_code}</p>
            </div>

            <div className="space-y-3">
              <Button onClick={downloadQRCode} className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
              <Button 
                onClick={() => navigate("/")} 
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                Continue
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              <p>Show this QR code at the event entrance for quick check-in.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-foreground">Walk-in Registration</CardTitle>
          <CardDescription>
            Register for the event and get your QR code instantly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your full name"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter your email"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel"
                        placeholder="Enter your phone number"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your company name"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 text-base bg-gradient-primary hover:opacity-90"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registering..." : "Register & Get QR Code"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-xs text-muted-foreground text-center">
            <p>After registration, you'll receive a unique QR code for event check-in.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SelfRegister;