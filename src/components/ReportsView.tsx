import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Users, UserCheck, Clock, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import type { Attendee } from "./EventDashboard";

interface ReportsViewProps {
  attendees: Attendee[];
}

export const ReportsView = ({ attendees }: ReportsViewProps) => {
  const { toast } = useToast();

  const stats = {
    total: attendees.length,
    checkedIn: attendees.filter(a => a.checkedIn).length,
    pending: attendees.filter(a => !a.checkedIn).length,
    checkInRate: attendees.length > 0 ? Math.round((attendees.filter(a => a.checkedIn).length / attendees.length) * 100) : 0
  };

  const recentCheckIns = attendees
    .filter(a => a.checkedIn && a.checkedInAt)
    .sort((a, b) => (b.checkedInAt?.getTime() || 0) - (a.checkedInAt?.getTime() || 0))
    .slice(0, 10);

  const handleExportCSV = () => {
    const csvData = [
      ['Name', 'Email', 'Phone', 'Status', 'QR Code', 'Check-In Time'],
      ...attendees.map(attendee => [
        attendee.name,
        attendee.email,
        attendee.phone,
        attendee.checkedIn ? 'Checked In' : 'Registered',
        attendee.qrCode || '',
        attendee.checkedInAt ? attendee.checkedInAt.toLocaleString() : ''
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "Report Exported!",
      description: "Event report has been downloaded as CSV",
    });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();
    
    // Title
    doc.setFontSize(20);
    doc.text('Event Attendance Report', 20, 30);
    
    // Date
    doc.setFontSize(12);
    doc.text(`Generated on: ${currentDate}`, 20, 45);
    
    // Summary statistics
    doc.setFontSize(14);
    doc.text('Summary', 20, 65);
    doc.setFontSize(11);
    doc.text(`Total Registered: ${stats.total}`, 20, 80);
    doc.text(`Checked In: ${stats.checkedIn}`, 20, 90);
    doc.text(`Pending: ${stats.pending}`, 20, 100);
    doc.text(`Attendance Rate: ${stats.checkInRate}%`, 20, 110);
    
    // Attendee details
    doc.setFontSize(14);
    doc.text('Attendee Details', 20, 130);
    
    let yPosition = 145;
    doc.setFontSize(10);
    
    // Table headers
    doc.text('Name', 20, yPosition);
    doc.text('Email', 80, yPosition);
    doc.text('Status', 140, yPosition);
    doc.text('Check-In Time', 170, yPosition);
    yPosition += 10;
    
    // Attendee data
    attendees.forEach((attendee, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      
      doc.text(attendee.name.substring(0, 25), 20, yPosition);
      doc.text(attendee.email.substring(0, 30), 80, yPosition);
      doc.text(attendee.checkedIn ? 'Checked In' : 'Registered', 140, yPosition);
      doc.text(attendee.checkedInAt ? attendee.checkedInAt.toLocaleDateString() : 'N/A', 170, yPosition);
      yPosition += 8;
    });
    
    doc.save(`event-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "PDF Report Exported!",
      description: "Event report has been downloaded as PDF",
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">attendees</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.checkedIn}</div>
            <p className="text-xs text-muted-foreground">confirmed attendance</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">awaiting check-in</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checkInRate}%</div>
            <p className="text-xs text-muted-foreground">check-in percentage</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Actions */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
          <p className="text-sm text-muted-foreground">
            Download comprehensive reports for your records
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={handleExportCSV}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </Button>
            <Button 
              variant="outline"
              onClick={handleExportPDF}
            >
              <Download className="w-4 h-4 mr-2" />
              Export to PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Check-ins */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Recent Check-ins</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest attendee check-ins
          </p>
        </CardHeader>
        <CardContent>
          {recentCheckIns.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCheckIns.map((attendee) => (
                    <TableRow key={attendee.id}>
                      <TableCell className="font-medium">{attendee.name}</TableCell>
                      <TableCell>{attendee.email}</TableCell>
                      <TableCell>
                        {attendee.checkedInAt?.toLocaleString() || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-success text-success-foreground">
                          Checked In
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No check-ins yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Attendees */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>All Attendees</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete list of registered attendees
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell className="font-medium">{attendee.name}</TableCell>
                    <TableCell>{attendee.email}</TableCell>
                    <TableCell>{attendee.phone}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {attendee.qrCode}
                      </code>
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
                      {attendee.checkedInAt?.toLocaleString() || 'Not checked in'}
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