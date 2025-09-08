import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, QrCode, FileText, Plus, Scan, Activity } from "lucide-react";
import { AttendeeManager } from "./AttendeeManager";
import { CheckInScanner } from "./CheckInScanner";
import { ReportsView } from "./ReportsView";
import { QRGenerator } from "./QRGenerator";
import { LogsView, LogEntry } from "./LogsView";
import { useToast } from "@/hooks/use-toast";

export interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  checkedIn: boolean;
  checkedInAt?: Date;
  qrCode?: string;
}

const EventDashboard = () => {
  const [attendees, setAttendees] = useState<Attendee[]>([
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      checkedIn: true,
      checkedInAt: new Date(),
      qrCode: "EVT-001-JOHN"
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+1234567891",
      checkedIn: false,
      qrCode: "EVT-002-JANE"
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike@example.com",
      phone: "+1234567892",
      checkedIn: true,
      checkedInAt: new Date(),
      qrCode: "EVT-003-MIKE"
    }
  ]);

  const [activeTab, setActiveTab] = useState("overview");
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: new Date(),
      type: 'system',
      action: 'System initialized',
      details: 'Event dashboard started with 3 pre-registered attendees',
      status: 'success'
    }
  ]);
  const { toast } = useToast();

  const addLog = (log: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setLogs(prevLogs => [newLog, ...prevLogs]);
  };

  const stats = {
    total: attendees.length,
    checkedIn: attendees.filter(a => a.checkedIn).length,
    pending: attendees.filter(a => !a.checkedIn).length,
    checkInRate: Math.round((attendees.filter(a => a.checkedIn).length / attendees.length) * 100)
  };

  const addAttendee = (attendee: Omit<Attendee, 'id' | 'checkedIn' | 'qrCode'>) => {
    const newAttendee: Attendee = {
      ...attendee,
      id: Date.now().toString(),
      checkedIn: false,
      qrCode: `EVT-${Date.now()}-${attendee.name.split(' ')[0].toUpperCase()}`
    };
    setAttendees([...attendees, newAttendee]);
    
    // Log the registration
    addLog({
      type: 'registration',
      action: 'New attendee registered',
      user: attendee.name,
      email: attendee.email,
      details: `QR Code: ${newAttendee.qrCode}`,
      status: 'success'
    });
  };

  const addBulkAttendees = (newAttendees: Omit<Attendee, 'id' | 'checkedIn' | 'qrCode'>[]) => {
    const attendeesWithIds: Attendee[] = newAttendees.map((attendee, index) => ({
      ...attendee,
      id: (Date.now() + index).toString(),
      checkedIn: false,
      qrCode: `EVT-${Date.now() + index}-${attendee.name.split(' ')[0].toUpperCase()}`
    }));
    setAttendees([...attendees, ...attendeesWithIds]);
    
    // Log the bulk registration
    addLog({
      type: 'registration',
      action: 'Bulk attendees registered',
      details: `${newAttendees.length} attendees added via CSV upload`,
      status: 'success'
    });
  };

  const checkInAttendee = (qrCode: string) => {
    const attendee = attendees.find(a => a.qrCode === qrCode);
    if (attendee) {
      setAttendees(attendees.map(a => 
        a.qrCode === qrCode 
          ? { ...a, checkedIn: true, checkedInAt: new Date() }
          : a
      ));
      
      // Log the check-in
      addLog({
        type: 'checkin',
        action: 'Attendee checked in',
        user: attendee.name,
        email: attendee.email,
        details: `QR Code: ${qrCode}`,
        status: 'success'
      });
    } else {
      // Log failed check-in attempt
      addLog({
        type: 'checkin',
        action: 'Check-in attempt failed',
        details: `Invalid QR Code: ${qrCode}`,
        status: 'error'
      });
    }
  };

  const clearLogs = () => {
    setLogs([]);
    toast({
      title: "Logs Cleared",
      description: "All activity logs have been cleared",
    });
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Action', 'User', 'Email', 'Details', 'Status'],
      ...logs.map(log => [
        log.timestamp.toISOString(),
        log.type,
        log.action,
        log.user || '',
        log.email || '',
        log.details || '',
        log.status
      ])
    ];
    
    const csvString = csvContent.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Logs Exported",
      description: "Activity logs have been exported as CSV",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/10">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
            Event Check-In Platform
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your event attendees with QR code check-ins
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-fit lg:grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="attendees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Attendees
            </TabsTrigger>
            <TabsTrigger value="qr-codes" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Codes
            </TabsTrigger>
            <TabsTrigger value="checkin" className="flex items-center gap-2">
              <Scan className="w-4 h-4" />
              Check-In
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">attendees registered</p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Checked In</CardTitle>
                  <UserCheck className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{stats.checkedIn}</div>
                  <p className="text-xs text-muted-foreground">attendees checked in</p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Users className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{stats.pending}</div>
                  <p className="text-xs text-muted-foreground">not checked in yet</p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Check-in Rate</CardTitle>
                  <QrCode className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.checkInRate}%</div>
                  <p className="text-xs text-muted-foreground">overall attendance</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Recent Check-ins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendees
                    .filter(a => a.checkedIn)
                    .slice(0, 5)
                    .map(attendee => (
                    <div key={attendee.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-success rounded-full flex items-center justify-center">
                          <UserCheck className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{attendee.name}</p>
                          <p className="text-sm text-muted-foreground">{attendee.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        Checked In
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendees">
            <AttendeeManager 
              attendees={attendees} 
              onAddAttendee={addAttendee} 
              onAddBulkAttendees={addBulkAttendees}
              onLog={addLog}
            />
          </TabsContent>

          <TabsContent value="qr-codes">
            <QRGenerator 
              attendees={attendees}
              onLog={addLog}
            />
          </TabsContent>

          <TabsContent value="checkin">
            <CheckInScanner attendees={attendees} onCheckIn={checkInAttendee} />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsView attendees={attendees} />
          </TabsContent>

          <TabsContent value="logs">
            <LogsView 
              logs={logs} 
              onClearLogs={clearLogs}
              onExportLogs={exportLogs}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EventDashboard;