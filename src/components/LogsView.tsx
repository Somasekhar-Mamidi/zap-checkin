import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, User, QrCode, Mail, UserPlus, Activity, Download, Search, Filter, MessageCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'checkin' | 'registration' | 'qr_generated' | 'email_sent' | 'whatsapp_sent' | 'system';
  action: string;
  user?: string;
  email?: string;
  details?: string;
  status: 'success' | 'error' | 'pending';
}

interface LogsViewProps {
  logs: LogEntry[];
  onClearLogs?: () => void;
  onExportLogs?: () => void;
}

export const LogsView = ({ logs, onClearLogs, onExportLogs }: LogsViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = searchTerm === "" || 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "all" || log.type === filterType;
      const matchesStatus = filterStatus === "all" || log.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [logs, searchTerm, filterType, filterStatus]);

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'checkin':
        return <QrCode className="w-4 h-4" />;
      case 'registration':
        return <UserPlus className="w-4 h-4" />;
      case 'qr_generated':
        return <QrCode className="w-4 h-4" />;
      case 'email_sent':
        return <Mail className="w-4 h-4" />;
      case 'whatsapp_sent':
        return <MessageCircle className="w-4 h-4" />;
      case 'system':
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: LogEntry['status']) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'checkin':
        return 'bg-success text-success-foreground';
      case 'registration':
        return 'bg-primary text-primary-foreground';
      case 'qr_generated':
        return 'bg-blue-500 text-white';
      case 'email_sent':
        return 'bg-purple-500 text-white';
      case 'whatsapp_sent':
        return 'bg-green-500 text-white';
      case 'system':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Logs
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track all system activities and events
            </p>
          </div>
          <div className="flex gap-2">
            {onExportLogs && (
              <Button variant="outline" onClick={onExportLogs}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            {onClearLogs && (
              <Button variant="outline" onClick={onClearLogs}>
                Clear Logs
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="checkin">Check-ins</SelectItem>
                <SelectItem value="registration">Registrations</SelectItem>
                <SelectItem value="qr_generated">QR Generated</SelectItem>
                <SelectItem value="email_sent">Emails Sent</SelectItem>
                <SelectItem value="whatsapp_sent">WhatsApp Sent</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted rounded-lg p-4">
              <div className="text-2xl font-bold text-success">
                {logs.filter(log => log.status === 'success').length}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-2xl font-bold text-destructive">
                {logs.filter(log => log.status === 'error').length}
              </div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">
                {logs.filter(log => log.type === 'checkin').length}
              </div>
              <div className="text-sm text-muted-foreground">Check-ins</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-2xl font-bold text-secondary-foreground">
                {logs.filter(log => log.type === 'email_sent').length}
              </div>
              <div className="text-sm text-muted-foreground">Emails Sent</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-2xl font-bold text-secondary-foreground">
                {logs.filter(log => log.type === 'whatsapp_sent').length}
              </div>
              <div className="text-sm text-muted-foreground">WhatsApp Sent</div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-md border">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[100px]">Time</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {logs.length === 0 ? "No logs yet" : "No logs match your filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {format(log.timestamp, 'HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(log.type)}>
                            <div className="flex items-center gap-1">
                              {getLogIcon(log.type)}
                              <span className="capitalize">{log.type.replace('_', ' ')}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>
                          {log.user && (
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3" />
                              <div>
                                <div className="font-medium text-sm">{log.user}</div>
                                {log.email && (
                                  <div className="text-xs text-muted-foreground">{log.email}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.details}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};