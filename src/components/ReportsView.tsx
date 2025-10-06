import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Users, UserCheck, Clock, TrendingUp, UserPlus, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import { exportReportsToExcel } from "@/lib/reportsExcelExport";
import type { Attendee } from "./EventDashboard";

interface CheckinInstance {
  id: string;
  attendee_id: string;
  checkin_number: number;
  guest_type: string;
  checked_in_at: string;
  qr_code: string;
}

interface ReportsViewProps {
  attendees: Attendee[];
  checkinInstances: CheckinInstance[];
}

export const ReportsView = ({ attendees, checkinInstances }: ReportsViewProps) => {
  const { toast } = useToast();

  const stats = {
    total: attendees.length,
    checkedIn: attendees.filter(a => a.checkedIn).length,
    pending: attendees.filter(a => !a.checkedIn).length,
    checkInRate: attendees.length > 0 ? Math.round((attendees.filter(a => a.checkedIn).length / attendees.length) * 100) : 0,
    
    // Pre-registered stats
    preRegistered: attendees.filter(a => (a.registrationType || 'pre_registered') === 'pre_registered').length,
    preRegisteredCheckedIn: attendees.filter(a => (a.registrationType || 'pre_registered') === 'pre_registered' && a.checkedIn).length,
    preRegisteredRate: (() => {
      const total = attendees.filter(a => (a.registrationType || 'pre_registered') === 'pre_registered').length;
      const checkedIn = attendees.filter(a => (a.registrationType || 'pre_registered') === 'pre_registered' && a.checkedIn).length;
      return total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    })(),
    
    // Walk-in stats
    walkIn: attendees.filter(a => a.registrationType === 'walk_in').length,
    walkInCheckedIn: attendees.filter(a => a.registrationType === 'walk_in' && a.checkedIn).length,
    walkInRate: (() => {
      const total = attendees.filter(a => a.registrationType === 'walk_in').length;
      const checkedIn = attendees.filter(a => a.registrationType === 'walk_in' && a.checkedIn).length;
      return total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    })(),
    
    // Plus guest stats
    totalCheckIns: checkinInstances.length,
    originalGuests: checkinInstances.filter(i => i.guest_type === 'original').length,
    plusOneGuests: checkinInstances.filter(i => i.guest_type === 'plus_one').length,
    plusTwoGuests: checkinInstances.filter(i => i.guest_type === 'plus_two').length,
    plusThreeGuests: checkinInstances.filter(i => i.guest_type === 'plus_three').length,
    totalPlusGuests: checkinInstances.filter(i => i.guest_type !== 'original').length,
    averageGuestsPerQR: checkinInstances.length > 0 ? 
      Math.round((checkinInstances.length / new Set(checkinInstances.map(i => i.qr_code)).size) * 10) / 10 : 0,
    uniqueQRsWithPlusGuests: new Set(checkinInstances.filter(i => i.guest_type !== 'original').map(i => i.qr_code)).size
  };

  const recentCheckIns = checkinInstances
    .sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
    .slice(0, 10)
    .map(instance => {
      const attendee = attendees.find(a => a.id === instance.attendee_id);
      return {
        ...instance,
        attendeeName: attendee?.name || 'Unknown',
        attendeeEmail: attendee?.email || 'Unknown',
        attendeeCompany: attendee?.company || 'N/A'
      };
    });

  const handleExportExcel = async () => {
    try {
      await exportReportsToExcel(attendees, checkinInstances);
      toast({
        title: "Excel Report Exported!",
        description: "Professional multi-sheet report has been downloaded",
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the Excel report",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();
    
    // Title
    doc.setFontSize(20);
    doc.text('Event Attendance Report with Plus Guests', 20, 30);
    
    // Date
    doc.setFontSize(12);
    doc.text(`Generated on: ${currentDate}`, 20, 45);
    
    // Summary statistics
    doc.setFontSize(14);
    doc.text('Summary Statistics', 20, 65);
    doc.setFontSize(11);
    doc.text(`Total Registered: ${stats.total}`, 20, 80);
    doc.text(`Total Check-ins (all guests): ${stats.totalCheckIns}`, 20, 90);
    doc.text(`Original Guests: ${stats.originalGuests}`, 20, 100);
    doc.text(`Plus One Guests: ${stats.plusOneGuests}`, 20, 110);
    doc.text(`Plus Two Guests: ${stats.plusTwoGuests}`, 20, 120);
    doc.text(`Plus Three+ Guests: ${stats.plusThreeGuests}`, 20, 130);
    doc.text(`Total Plus Guests: ${stats.totalPlusGuests}`, 20, 140);
    doc.text(`Average Guests per QR: ${stats.averageGuestsPerQR}`, 20, 150);
    
    // Registration type breakdown
    doc.text(`Pre-registered: ${stats.preRegistered} (${stats.preRegisteredCheckedIn} checked in, ${stats.preRegisteredRate}% rate)`, 20, 165);
    doc.text(`Walk-ins: ${stats.walkIn} (${stats.walkInCheckedIn} checked in, ${stats.walkInRate}% rate)`, 20, 175);
    
    // Plus Guest Insights
    doc.setFontSize(14);
    doc.text('Plus Guest Insights', 20, 195);
    doc.setFontSize(11);
    doc.text(`QR Codes with Plus Guests: ${stats.uniqueQRsWithPlusGuests}`, 20, 210);
    doc.text(`QR Code Sharing Rate: ${stats.total > 0 ? Math.round((stats.uniqueQRsWithPlusGuests / stats.total) * 100) : 0}%`, 20, 220);
    
    // New page for detailed check-ins
    doc.addPage();
    doc.setFontSize(14);
    doc.text('All Check-in Instances', 20, 30);
    
    let yPosition = 50;
    doc.setFontSize(10);
    
    // Table headers
    doc.text('Attendee', 20, yPosition);
    doc.text('Guest Type', 70, yPosition);
    doc.text('QR Code', 120, yPosition);
    doc.text('Check-In Time', 150, yPosition);
    yPosition += 10;
    
    // Check-in instance data
    checkinInstances.forEach((instance, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      
      const attendee = attendees.find(a => a.id === instance.attendee_id);
      doc.text((attendee?.name || 'Unknown').substring(0, 20), 20, yPosition);
      doc.text(instance.guest_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), 70, yPosition);
      doc.text(instance.qr_code, 120, yPosition);
      doc.text(new Date(instance.checked_in_at).toLocaleDateString(), 150, yPosition);
      yPosition += 8;
    });
    
    doc.save(`event-report-plus-guests-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "Enhanced PDF Report Exported!",
      description: "Event report with plus guest analytics has been downloaded as PDF",
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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
            <CardTitle className="text-sm font-medium">Pre-registered</CardTitle>
            <QrCode className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.preRegistered}</div>
            <p className="text-xs text-muted-foreground">{stats.preRegisteredCheckedIn} checked in ({stats.preRegisteredRate}%)</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Walk-ins</CardTitle>
            <UserPlus className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.walkIn}</div>
            <p className="text-xs text-muted-foreground">{stats.walkInCheckedIn} checked in ({stats.walkInRate}%)</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checked In</CardTitle>
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
            <p className="text-xs text-muted-foreground">overall check-in rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Plus Guest Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalCheckIns}</div>
            <p className="text-xs text-muted-foreground">including plus guests</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plus Guests</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalPlusGuests}</div>
            <p className="text-xs text-muted-foreground">
              +1: {stats.plusOneGuests}, +2: {stats.plusTwoGuests}, +3+: {stats.plusThreeGuests}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Guests/QR</CardTitle>
            <QrCode className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{stats.averageGuestsPerQR}</div>
            <p className="text-xs text-muted-foreground">per QR code</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Sharing</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.uniqueQRsWithPlusGuests}</div>
            <p className="text-xs text-muted-foreground">QRs with plus guests</p>
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
              onClick={handleExportExcel}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
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

      {/* Recent Check-ins (Including Plus Guests) */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Recent Check-ins</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest check-ins including plus guests
          </p>
        </CardHeader>
        <CardContent>
          {recentCheckIns.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Original Attendee</TableHead>
                    <TableHead>Guest Type</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCheckIns.map((instance) => (
                    <TableRow key={instance.id}>
                      <TableCell className="font-medium">{instance.attendeeName}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            instance.guest_type === 'original' 
                              ? "border-green-500 text-green-700" 
                              : instance.guest_type === 'plus_one'
                              ? "border-blue-500 text-blue-700"
                              : instance.guest_type === 'plus_two'
                              ? "border-purple-500 text-purple-700"
                              : "border-amber-500 text-amber-700"
                          }
                        >
                          {instance.guest_type === 'original' && <UserCheck className="w-3 h-3 mr-1" />}
                          {instance.guest_type !== 'original' && <Users className="w-3 h-3 mr-1" />}
                          {instance.guest_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {instance.qr_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        {new Date(instance.checked_in_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-success text-success-foreground">
                          Checked In #{instance.checkin_number}
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

      {/* Plus Guest Analysis Table */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Plus Guest Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            QR codes with multiple check-ins
          </p>
        </CardHeader>
        <CardContent>
          {(() => {
            const qrCodeStats = checkinInstances.reduce((acc, instance) => {
              if (!acc[instance.qr_code]) {
                const attendee = attendees.find(a => a.id === instance.attendee_id);
                acc[instance.qr_code] = {
                  qr_code: instance.qr_code,
                  attendeeName: attendee?.name || 'Unknown',
                  attendeeEmail: attendee?.email || 'Unknown',
                  totalCheckins: 0,
                  plusGuests: 0,
                  guestTypes: []
                };
              }
              acc[instance.qr_code].totalCheckins++;
              if (instance.guest_type !== 'original') {
                acc[instance.qr_code].plusGuests++;
              }
              acc[instance.qr_code].guestTypes.push(instance.guest_type);
              return acc;
            }, {} as Record<string, any>);

            const multipleCheckIns = Object.values(qrCodeStats).filter((stat: any) => stat.totalCheckins > 1);

            return multipleCheckIns.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>QR Code</TableHead>
                      <TableHead>Original Attendee</TableHead>
                      <TableHead>Total Check-ins</TableHead>
                      <TableHead>Plus Guests</TableHead>
                      <TableHead>Guest Types</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {multipleCheckIns.map((stat: any) => (
                      <TableRow key={stat.qr_code}>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {stat.qr_code}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{stat.attendeeName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{stat.totalCheckins}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{stat.plusGuests}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {stat.guestTypes.map((type: string, index: number) => (
                              <Badge 
                                key={index}
                                variant="outline" 
                                className={
                                  type === 'original' 
                                    ? "border-green-500 text-green-700 text-xs" 
                                    : type === 'plus_one'
                                    ? "border-blue-500 text-blue-700 text-xs"
                                    : type === 'plus_two'
                                    ? "border-purple-500 text-purple-700 text-xs"
                                    : "border-amber-500 text-amber-700 text-xs"
                                }
                              >
                                {type.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No QR codes have been used for plus guests yet
              </div>
            );
          })()}
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
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
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
                    <TableCell className="text-sm text-muted-foreground">{attendee.company || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          (attendee.registrationType || 'pre_registered') === 'pre_registered' 
                            ? "border-blue-500 text-blue-700" 
                            : "border-orange-500 text-orange-700"
                        }
                      >
                        {(attendee.registrationType || 'pre_registered') === 'pre_registered' ? (
                          <>
                            <QrCode className="w-3 h-3 mr-1" />
                            Pre-registered
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3 mr-1" />
                            Walk-in
                          </>
                        )}
                      </Badge>
                    </TableCell>
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