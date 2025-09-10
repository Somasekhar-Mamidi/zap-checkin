import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Mail, Phone, QrCode, Send, Upload, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Papa from 'papaparse';
import type { Attendee } from "./EventDashboard";
import type { LogEntry } from "./LogsView";

interface AttendeeManagerProps {
  attendees: Attendee[];
  onAddAttendee: (attendee: Omit<Attendee, 'id' | 'checkedIn' | 'qrCode'>) => void;
  onAddBulkAttendees: (attendees: Omit<Attendee, 'id' | 'checkedIn' | 'qrCode'>[]) => void;
  onDeleteBulkAttendees: (attendeeIds: string[]) => void;
  onLog?: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  customMessage?: string;
  onCustomMessageChange?: (message: string) => void;
}

export const AttendeeManager = ({ attendees, onAddAttendee, onAddBulkAttendees, onDeleteBulkAttendees, onLog, customMessage = "", onCustomMessageChange }: AttendeeManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
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

        // Get the headers from the CSV
        const headers = results.meta.fields || [];
        console.log('CSV Headers found:', headers);

        // Create a mapping function to find the correct field
        const findField = (row: any, possibleNames: string[]): string => {
          for (const possibleName of possibleNames) {
            const exactMatch = row[possibleName];
            if (exactMatch) return exactMatch;
            
            // Try case-insensitive match
            const caseInsensitiveMatch = Object.keys(row).find(key => 
              key.toLowerCase().trim() === possibleName.toLowerCase()
            );
            if (caseInsensitiveMatch && row[caseInsensitiveMatch]) {
              return row[caseInsensitiveMatch];
            }
          }
          return '';
        };

        results.data.forEach((row: any, index: number) => {
          // Try multiple possible column names for each field
          const name = findField(row, ['name', 'full name', 'full_name', 'Name', 'Full Name', 'FULL_NAME']);
          const email = findField(row, ['email', 'email address', 'email_address', 'Email', 'Email Address', 'EMAIL']);
          const phone = findField(row, ['phone', 'phone number', 'phone_number', 'Phone', 'Phone Number', 'PHONE']);
          
          if (!name?.trim() || !email?.trim() || !phone?.trim()) {
            const availableFields = Object.keys(row).filter(key => row[key]?.toString().trim());
            errors.push(`Row ${index + 1}: Missing required fields. Found columns: ${availableFields.join(', ')}`);
          } else if (!email.includes('@')) {
            errors.push(`Row ${index + 1}: Invalid email format - ${email}`);
          } else {
            validAttendees.push({ 
              name: name.trim(), 
              email: email.trim(), 
              phone: phone.trim() 
            });
          }
        });

        if (errors.length > 0) {
          toast({
            title: "CSV Upload Errors",
            description: `${errors.length} errors found. Check console for details.`,
            variant: "destructive"
          });
          console.error('CSV Upload Errors:', errors);
          console.log('Expected columns: name, email, phone (case-insensitive)');
          console.log('Alternative accepted names: "Full Name", "Email Address", "Phone Number"');
          return;
        }

        if (validAttendees.length > 0) {
          onAddBulkAttendees(validAttendees);
          setIsBulkDialogOpen(false);
          toast({
            title: "Success!",
            description: `${validAttendees.length} attendees uploaded successfully`,
          });
        } else {
          toast({
            title: "No Data",
            description: "No valid attendee data found in CSV file",
            variant: "destructive"
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
      // Log email sending attempt
      onLog?.({
        type: 'email_sent',
        action: 'QR code email sending initiated',
        user: attendee.name,
        email: attendee.email,
        details: `QR Code: ${attendee.qrCode}`,
        status: 'pending'
      });

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
          qrImageData,
          customMessage
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAttendees(attendees.map(a => a.id));
    } else {
      setSelectedAttendees([]);
    }
  };

  const handleSelectAttendee = (attendeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedAttendees(prev => [...prev, attendeeId]);
    } else {
      setSelectedAttendees(prev => prev.filter(id => id !== attendeeId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAttendees.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedAttendees.length} attendee${selectedAttendees.length > 1 ? 's' : ''}?`;
    if (window.confirm(confirmMessage)) {
      await onDeleteBulkAttendees(selectedAttendees);
      setSelectedAttendees([]);
      
      // Log the bulk deletion
      onLog?.({
        type: 'system',
        action: 'Bulk attendees deleted',
        details: `${selectedAttendees.length} attendees deleted by user`,
        status: 'success'
      });
    }
  };

  const isAllSelected = attendees.length > 0 && selectedAttendees.length === attendees.length;
  const isPartiallySelected = selectedAttendees.length > 0 && selectedAttendees.length < attendees.length;

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
            {selectedAttendees.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                className="hover:bg-destructive/90"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedAttendees.length})
              </Button>
            )}
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
          <div className="mb-6">
            <Label htmlFor="custom-message" className="text-base font-medium">
              Custom Message for QR Code Emails
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              This message will be included in all QR code emails sent to attendees
            </p>
            <Textarea
              id="custom-message"
              placeholder="Enter a personalized message for your attendees (e.g., 'Welcome to our event! Please keep this QR code handy for check-in.')"
              value={customMessage}
              onChange={(e) => onCustomMessageChange?.(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">
                {customMessage.length}/500 characters
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCustomMessageChange?.("")}
                  disabled={!customMessage}
                  className="text-xs"
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCustomMessageChange?.("Welcome to our event! Please keep this QR code handy for check-in. We're excited to see you there!")}
                  className="text-xs"
                >
                  Use Example
                </Button>
              </div>
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
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
                    <TableCell>
                      <Checkbox
                        checked={selectedAttendees.includes(attendee.id)}
                        onCheckedChange={(checked) => handleSelectAttendee(attendee.id, checked as boolean)}
                      />
                    </TableCell>
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