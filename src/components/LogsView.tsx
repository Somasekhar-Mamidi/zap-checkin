import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, User, QrCode, Mail, UserPlus, Activity, Download, Search, Filter, Eye, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState, useMemo, useEffect } from "react";
import { format, addDays, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'checkin' | 'registration' | 'qr_generated' | 'email_sent' | 'system';
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
  onLoadLogs?: (page: number, limit: number, startDate?: Date, endDate?: Date) => Promise<LogEntry[]>;
  totalLogs?: number;
}

export const LogsView = ({ logs, onClearLogs, onExportLogs, onLoadLogs, totalLogs = 0 }: LogsViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(50);
  const [allLogs, setAllLogs] = useState<LogEntry[]>(logs);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load more logs when pagination changes
  useEffect(() => {
    const loadOlderLogs = async () => {
      if (onLoadLogs && currentPage > 1) {
        setLoading(true);
        try {
          const olderLogs = await onLoadLogs(currentPage, logsPerPage, dateRange?.from, dateRange?.to);
          setAllLogs(prev => [...prev, ...olderLogs]);
        } catch (error) {
          console.error('Error loading older logs:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadOlderLogs();
  }, [currentPage, onLoadLogs, dateRange.from, dateRange.to]);

  // Reset when date range changes
  useEffect(() => {
    if (dateRange?.from || dateRange?.to) {
      setCurrentPage(1);
      setAllLogs(logs);
    }
  }, [dateRange?.from, dateRange?.to, logs]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      const matchesSearch = searchTerm === "" || 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "all" || log.type === filterType;
      const matchesStatus = filterStatus === "all" || log.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [allLogs, searchTerm, filterType, filterStatus]);

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
            
            {/* Date Range Picker */}
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-64 justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Pick a date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                  <div className="flex gap-2 mb-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        setDateRange({ from: today, to: today });
                        setShowDatePicker(false);
                      }}>
                      Today
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const yesterday = subDays(today, 7);
                        setDateRange({ from: yesterday, to: today });
                        setShowDatePicker(false);
                      }}>
                      Last 7 days
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setDateRange(undefined);
                        setShowDatePicker(false);
                      }}>
                      Clear
                    </Button>
                  </div>
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </div>
              </PopoverContent>
            </Popover>
            
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
                {allLogs.filter(log => log.status === 'success').length}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-2xl font-bold text-destructive">
                {allLogs.filter(log => log.status === 'error').length}
              </div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">
                {allLogs.filter(log => log.type === 'checkin').length}
              </div>
              <div className="text-sm text-muted-foreground">Check-ins</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-2xl font-bold text-secondary-foreground">
                {allLogs.filter(log => log.type === 'email_sent').length}
              </div>
              <div className="text-sm text-muted-foreground">Emails Sent</div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-md border">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[140px]">Time</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {allLogs.length === 0 ? "No logs yet" : "No logs match your filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">
                          <div>{format(log.timestamp, 'MMM dd')}</div>
                          <div className="text-muted-foreground">{format(log.timestamp, 'HH:mm:ss')}</div>
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
                          {log.user ? (
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3" />
                              <div>
                                <div className="font-medium text-sm">{log.user}</div>
                                {log.email && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">{log.email}</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">System</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          <div className="truncate" title={log.details || ''}>
                            {log.details || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Pagination */}
          {onLoadLogs && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {filteredLogs.length} of {totalLogs} logs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="px-3 py-1 text-sm bg-muted rounded">
                  Page {currentPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={loading || filteredLogs.length < logsPerPage}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {loading && (
                  <div className="ml-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Log View Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getLogIcon(selectedLog.type)}
              Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="font-mono text-sm">
                    {format(selectedLog.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusColor(selectedLog.status)}>
                      {selectedLog.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <div className="mt-1">
                    <Badge className={getTypeColor(selectedLog.type)}>
                      <div className="flex items-center gap-1">
                        {getLogIcon(selectedLog.type)}
                        <span className="capitalize">{selectedLog.type.replace('_', ' ')}</span>
                      </div>
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID</label>
                  <p className="font-mono text-sm text-muted-foreground">{selectedLog.id}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Action</label>
                <p className="font-medium">{selectedLog.action}</p>
              </div>

              {(selectedLog.user || selectedLog.email) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedLog.user && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">User</label>
                      <p>{selectedLog.user}</p>
                    </div>
                  )}
                  {selectedLog.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p>{selectedLog.email}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Details</label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <pre className="text-sm whitespace-pre-wrap break-words">
                      {selectedLog.details}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};