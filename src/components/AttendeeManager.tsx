import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Mail, Phone, QrCode, Send, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from 'papaparse';
import type { Attendee } from "./EventDashboard";

interface AttendeeManagerProps {
  attendees: Attendee[];
  onAddAttendee: (attendee: Omit<Attendee, 'id' | 'checkedIn' | 'qrCode'>) => void;
  onAddBulkAttendees: (attendees: Omit<Attendee, 'id' | 'checkedIn' | 'qrCode'>[]) => void;
}

export const AttendeeManager = ({ attendees, onAddAttendee, onAddBulkAttendees }: AttendeeManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    onAddAttendee(formData);
    setFormData({ name: "", email: "", phone: "" });
    setIsDialogOpen(false);
    toast({
      title: "Success!",
      description: "Attendee added successfully",
    });
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validAttendees: Omit<Attendee, 'id' | 'checkedIn' | 'qrCode'>[] = [];
        const errors: string[] = [];

        results.data.forEach((row: any, index: number) => {
          const { name, email, phone } = row;
          
          if (!name || !email || !phone) {
            errors.push(`Row ${index + 1}: Missing required fields`);
          } else if (!email.includes('@')) {
            errors.push(`Row ${index + 1}: Invalid email format`);
          } else {
            validAttendees.push({ name, email, phone });
          }
        });

        if (errors.length > 0) {
          toast({
            title: "CSV Upload Errors",
            description: `${errors.length} errors found. Check console for details.`,
            variant: "destructive"
          });
          console.error('CSV Upload Errors:', errors);
          return;
        }

        if (validAttendees.length > 0) {
          onAddBulkAttendees(validAttendees);
          setIsBulkDialogOpen(false);
          toast({
            title: "Success!",
            description: `${validAttendees.length} attendees uploaded successfully`,
          });
        }
      },
      error: (error) => {
        toast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive"
        });
        console.error('CSV Parse Error:', error);
      }
    });

    // Reset the file input
    event.target.value = '';
  };

  const handleSendQR = async (attendee: Attendee) => {
    if (!attendee.qrCode) {
      toast({
        title: "Error",
        description: "QR code not available for this attendee",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate QR code image data
      const QRCode = (await import("qrcode")).default;
      const qrImageData = await QRCode.toDataURL(attendee.qrCode, {
        width: 200,
        margin: 2,
        color: {
          dark: '#262883',
          light: '#FFFFFF'
        }
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data, error } = await supabase.functions.invoke('send-qr-email', {
        body: {
          attendee: {
            name: attendee.name,
            email: attendee.email,
            qrCode: attendee.qrCode
          },
          qrImageData
        }
      });

      if (error) throw error;

      toast({
        title: "QR Code Sent!",
        description: `QR code sent to ${attendee.name} via email`,
      });
    } catch (error) {
      console.error('Failed to send QR code:', error);
      toast({
        title: "Error",
        description: "Failed to send QR code email",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Attendee Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add and manage event attendees
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Attendees</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="csv-upload">Upload CSV File</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      CSV should have columns: name, email, phone
                    </p>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <h4 className="font-medium mb-2">CSV Format Example:</h4>
                    <code className="text-sm">
                      name,email,phone<br />
                      John Doe,john@example.com,+1234567890<br />
                      Jane Smith,jane@example.com,+0987654321
                    </code>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Attendee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Attendee</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary">
                    Add Attendee
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell className="font-medium">{attendee.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                        {attendee.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                        {attendee.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={attendee.checkedIn ? "default" : "secondary"}
                        className={attendee.checkedIn ? "bg-success text-success-foreground" : ""}
                      >
                        {attendee.checkedIn ? "Checked In" : "Registered"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <QrCode className="w-4 h-4 mr-2 text-primary" />
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {attendee.qrCode}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendQR(attendee)}
                        className="hover:bg-primary hover:text-primary-foreground"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send QR
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};