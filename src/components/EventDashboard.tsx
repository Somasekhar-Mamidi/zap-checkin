import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";

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
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: new Date(),
      type: 'system',
      action: 'System initialized',
      details: 'Event dashboard started',
      status: 'success'
    }
  ]);
  const { toast } = useToast();

  // Load attendees from database
  const loadAttendees = async () => {
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading attendees:', error);
        toast({
          title: "Error",
          description: "Failed to load attendees",
          variant: "destructive"
        });
        return;
      }

      const formattedAttendees: Attendee[] = data.map(attendee => ({
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        phone: attendee.phone || '',
        checkedIn: attendee.checked_in,
        checkedInAt: attendee.checked_in_at ? new Date(attendee.checked_in_at) : undefined,
        qrCode: attendee.qr_code || undefined
      }));

      setAttendees(formattedAttendees);
    } catch (error) {
      console.error('Error loading attendees:', error);
      toast({
        title: "Error", 
        description: "Failed to load attendees",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendees();
  }, []);

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

  const addAttendee = async (attendee: Omit<Attendee, 'id' | 'checkedIn' | 'qrCode'>) => {
    const qrCode = `EVT-${Date.now()}-${attendee.name.split(' ')[0].toUpperCase()}`;
    
    try {
      const { data, error } = await supabase
        .from('attendees')
        .insert({
          name: attendee.name,
          email: attendee.email,
          phone: attendee.phone,
          qr_code: qrCode
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding attendee:', error);
        toast({
          title: "Error",
          description: "Failed to add attendee",
          variant: "destructive"
        });
        return;
      }

      // Reload attendees to get the latest data
      await loadAttendees();
      
      // Log the registration
      addLog({
        type: 'registration',
        action: 'New attendee registered',
        user: attendee.name,
        email: attendee.email,
        details: `QR Code: ${qrCode}`,
        status: 'success'
      });

      toast({
        title: "Success",
        description: `${attendee.name} has been registered`,
      });
    } catch (error) {
      console.error('Error adding attendee:', error);
      toast({
        title: "Error",
        description: "Failed to add attendee",
        variant: "destructive"
      });
    }
  };

  const addBulkAttendees = async (newAttendees: Omit<Attendee, 'id' | 'checkedIn' | 'qrCode'>[]) => {
    try {
      const attendeesToInsert = newAttendees.map((attendee, index) => ({
        name: attendee.name,
        email: attendee.email,
        phone: attendee.phone,
        qr_code: `EVT-${Date.now() + index}-${attendee.name.split(' ')[0].toUpperCase()}`
      }));

      const { data, error } = await supabase
        .from('attendees')
        .insert(attendeesToInsert)
        .select();

      if (error) {
        console.error('Error adding bulk attendees:', error);
        toast({
          title: "Error",
          description: "Failed to add attendees",
          variant: "destructive"
        });
        return;
      }

      // Reload attendees to get the latest data
      await loadAttendees();
      
      // Log the bulk registration
      addLog({
        type: 'registration',
        action: 'Bulk attendees registered',
        details: `${newAttendees.length} attendees added via CSV upload`,
        status: 'success'
      });

      toast({
        title: "Success",
        description: `${newAttendees.length} attendees have been registered`,
      });
    } catch (error) {
      console.error('Error adding bulk attendees:', error);
      toast({
        title: "Error",
        description: "Failed to add attendees",
        variant: "destructive"
      });
    }
  };

  const deleteBulkAttendees = async (attendeeIds: string[]) => {
    try {
      const { error } = await supabase
        .from('attendees')
        .delete()
        .in('id', attendeeIds);

      if (error) {
        console.error('Error deleting attendees:', error);
        toast({
          title: "Error",
          description: "Failed to delete attendees",
          variant: "destructive"
        });
        return;
      }

      // Reload attendees to get the latest data
      await loadAttendees();
      
      // Log the bulk deletion
      addLog({
        type: 'system',
        action: 'Bulk attendees deleted',
        details: `${attendeeIds.length} attendees removed`,
        status: 'success'
      });

      toast({
        title: "Success",
        description: `${attendeeIds.length} attendees have been deleted`,
      });
    } catch (error) {
      console.error('Error deleting attendees:', error);
      toast({
        title: "Error",
        description: "Failed to delete attendees",
        variant: "destructive"
      });
    }
  };

  const checkInAttendee = async (qrCode: string) => {
    const attendee = attendees.find(a => a.qrCode === qrCode);
    
    if (attendee) {
      try {
        const { data, error } = await supabase
          .from('attendees')
          .update({
            checked_in: true,
            checked_in_at: new Date().toISOString()
          })
          .eq('qr_code', qrCode)
          .select()
          .single();

        if (error) {
          console.error('Error checking in attendee:', error);
          toast({
            title: "Error",
            description: "Failed to check in attendee",
            variant: "destructive"
          });
          return;
        }

        // Reload attendees to get the latest data
        await loadAttendees();
        
        // Log the check-in
        addLog({
          type: 'checkin',
          action: 'Attendee checked in',
          user: attendee.name,
          email: attendee.email,
          details: `QR Code: ${qrCode}`,
          status: 'success'
        });

        toast({
          title: "Check-In Successful",
          description: `${attendee.name} has been checked in`,
        });
      } catch (error) {
        console.error('Error checking in attendee:', error);
        toast({
          title: "Error",
          description: "Failed to check in attendee",
          variant: "destructive"
        });
      }
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

        {isLoading ? (
          <Card className="shadow-elegant">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading attendees...</p>
              </div>
            </CardContent>
          </Card>
        ) : (

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="attendees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Attendees</span>
            </TabsTrigger>
            <TabsTrigger value="qr-codes" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR Codes</span>
            </TabsTrigger>
            <TabsTrigger value="checkin" className="flex items-center gap-2">
              <Scan className="w-4 h-4" />
              <span className="hidden sm:inline">Check-In</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
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
              onDeleteBulkAttendees={deleteBulkAttendees}
              onLog={addLog}
              customMessage={customMessage}
              onCustomMessageChange={setCustomMessage}
            />
          </TabsContent>

          <TabsContent value="qr-codes">
            <QRGenerator 
              attendees={attendees}
              onLog={addLog}
              customMessage={customMessage}
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
        )}
      </div>
    </div>
  );
};

export default EventDashboard;