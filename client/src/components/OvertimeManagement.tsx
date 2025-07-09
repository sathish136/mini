import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Users, Filter, Check, TrendingUp, Award, Activity, RefreshCw, FileText, Download, Search, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function OvertimeManagement() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [employeeToReject, setEmployeeToReject] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: eligibleEmployees = [], isLoading: isEligibleLoading } = useQuery({
    queryKey: ["/api/overtime-eligible", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/overtime-eligible?date=${selectedDate}`);
      if (!response.ok) throw new Error("Failed to fetch eligible employees");
      return response.json();
    },
  });

  const { data: overtimeRequests = [], isLoading: isRequestsLoading } = useQuery({
    queryKey: ["/api/overtime-requests"],
    queryFn: async () => {
      const response = await fetch("/api/overtime-requests");
      if (!response.ok) throw new Error("Failed to fetch overtime requests");
      return response.json();
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (employees: any[]) => {
      const promises = employees.map(employee => {
        const overtimeRequest = {
          employeeId: employee.employeeId, // Use employeeId string instead of numeric id
          date: employee.date, // Send as string, schema will coerce to date
          startTime: `${employee.date}T08:00:00`, // Send as string
          endTime: `${employee.date}T17:00:00`, // Send as string
          hours: employee.otHours.toString(), // Convert to string as expected by schema
          reason: "Bulk approved for overtime hours worked",
          status: "approved",
        };
        return apiRequest("POST", "/api/overtime-requests", overtimeRequest).then(res => res.json());
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-eligible"] });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
      setSelectedEmployees(new Set());
      toast({
        title: "Success",
        description: `${selectedEmployees.size} overtime requests approved successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve overtime requests",
        variant: "destructive",
      });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (employees: any[]) => {
      const promises = employees.map(employee => {
        const overtimeRequest = {
          employeeId: employee.employeeId, // Use employeeId string instead of numeric id
          date: employee.date, // Send as string, schema will coerce to date
          startTime: `${employee.date}T08:00:00`, // Send as string
          endTime: `${employee.date}T17:00:00`, // Send as string
          hours: employee.otHours.toString(), // Convert to string as expected by schema
          reason: "Bulk rejected - overtime not authorized",
          status: "rejected",
        };
        return apiRequest("POST", "/api/overtime-requests", overtimeRequest).then(res => res.json());
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-eligible"] });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
      setSelectedEmployees(new Set());
      toast({
        title: "Success",
        description: `${selectedEmployees.size} overtime requests rejected successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject overtime requests",
        variant: "destructive",
      });
    },
  });

  const singleApproveMutation = useMutation({
    mutationFn: async (employee: any) => {
      console.log("Single approve mutation called with employee:", employee);
      const overtimeRequest = {
        employeeId: employee.employeeId, // Use employeeId string instead of numeric id
        date: employee.date, // Send as string, schema will coerce to date
        startTime: `${employee.date}T08:00:00`, // Send as string
        endTime: `${employee.date}T17:00:00`, // Send as string
        hours: employee.otHours.toString(), // Convert to string as expected by schema
        reason: "Approved for overtime hours worked",
        status: "approved",
      };
      console.log("Sending overtime request:", overtimeRequest);
      const response = await apiRequest("POST", "/api/overtime-requests", overtimeRequest);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-eligible"] });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
      toast({
        title: "Success",
        description: "Overtime approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve overtime",
        variant: "destructive",
      });
    },
  });

  const singleRejectMutation = useMutation({
    mutationFn: async ({ employee, reason }: { employee: any; reason: string }) => {
      const overtimeRequest = {
        employeeId: employee.employeeId, // Use employeeId string instead of numeric id
        date: employee.date, // Send as string, schema will coerce to date
        startTime: `${employee.date}T08:00:00`, // Send as string
        endTime: `${employee.date}T17:00:00`, // Send as string
        hours: employee.otHours.toString(), // Convert to string as expected by schema
        reason: reason || "Rejected - overtime not authorized",
        status: "rejected",
      };
      const response = await apiRequest("POST", "/api/overtime-requests", overtimeRequest);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-eligible"] });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
      toast({
        title: "Success",
        description: "Overtime rejected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject overtime",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(new Set(filteredEmployees.map((emp: any) => emp.id)));
    } else {
      setSelectedEmployees(new Set());
    }
  };

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    console.log("Selecting employee:", employeeId, "checked:", checked);
    const newSelected = new Set(selectedEmployees);
    if (checked) {
      newSelected.add(employeeId);
    } else {
      newSelected.delete(employeeId);
    }
    setSelectedEmployees(newSelected);
    console.log("Selected employees:", newSelected);
  };

  const handleBulkApprove = () => {
    const selectedEmpData = filteredEmployees.filter((emp: any) => selectedEmployees.has(emp.id));
    bulkApproveMutation.mutate(selectedEmpData);
  };

  const handleBulkReject = () => {
    const selectedEmpData = filteredEmployees.filter((emp: any) => selectedEmployees.has(emp.id));
    bulkRejectMutation.mutate(selectedEmpData);
  };

  const totalOTHours = eligibleEmployees.reduce((sum: number, emp: any) => sum + parseFloat(emp.otHours), 0);
  const selectedOTHours = eligibleEmployees
    .filter((emp: any) => selectedEmployees.has(emp.id))
    .reduce((sum: number, emp: any) => sum + parseFloat(emp.otHours), 0);

  // Calculate statistics
  const pendingRequests = overtimeRequests.filter((req: any) => req.status === 'pending').length;
  const approvedRequests = overtimeRequests.filter((req: any) => req.status === 'approved').length;
  const rejectedRequests = overtimeRequests.filter((req: any) => req.status === 'rejected').length;
  const totalRequests = overtimeRequests.length;

  const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;

  // Filter employees based on search term and group
  const filteredEmployees = eligibleEmployees.filter((employee: any) => {
    const matchesSearch = searchTerm === "" || 
      employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = selectedGroup === "all" || 
      employee.employeeGroup === selectedGroup;
    
    return matchesSearch && matchesGroup;
  });

  const handleRejectWithReason = (employee: any) => {
    setEmployeeToReject(employee);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (employeeToReject && rejectReason.trim()) {
      singleRejectMutation.mutate({ 
        employee: employeeToReject, 
        reason: rejectReason.trim() 
      });
      setShowRejectDialog(false);
      setRejectReason("");
      setEmployeeToReject(null);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Professional Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Overtime Management
          </h1>
          <p className="text-gray-600">Streamline overtime approvals with intelligent workflow automation</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="border-gray-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="border-gray-300">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Professional Dashboard Cards with Subtle Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Pending Approvals</p>
                <p className="text-3xl font-bold text-gray-900">{eligibleEmployees.length}</p>
                <p className="text-gray-500 text-xs mt-1">Require action today</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Total OT Hours</p>
                <p className="text-3xl font-bold text-gray-900">{totalOTHours.toFixed(1)}h</p>
                <p className="text-gray-500 text-xs mt-1">This period</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-full">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Approval Rate</p>
                <p className="text-3xl font-bold text-gray-900">{approvalRate.toFixed(0)}%</p>
                <div className="mt-2">
                  <Progress value={approvalRate} className="h-2" />
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Selected</p>
                <p className="text-3xl font-bold text-gray-900">{selectedEmployees.size}</p>
                <p className="text-gray-500 text-xs mt-1">{selectedOTHours.toFixed(1)}h selected</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-full">
                <Check className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Action Bar */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">Date:</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-44 border-gray-300"
                  />
                </div>
                
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <Search className="w-5 h-5 text-gray-600" />
                  <Input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 border-gray-300"
                  />
                </div>

                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">Group:</label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="w-32 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      <SelectItem value="group_a">Group A</SelectItem>
                      <SelectItem value="group_b">Group B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedEmployees.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedEmployees.size} Selected
                  </Badge>
                  <span className="text-sm text-blue-600">•</span>
                  <span className="text-sm font-medium text-blue-700">{selectedOTHours.toFixed(1)}h total</span>
                </div>
              )}
            </div>
            
            {selectedEmployees.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 h-8 text-xs"
                  onClick={handleBulkApprove}
                  disabled={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approve {selectedEmployees.size}
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 h-8 text-xs"
                  onClick={handleBulkReject}
                  disabled={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject {selectedEmployees.size}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Professional Workflow Tabs */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 border-b border-gray-200">
            <TabsTrigger value="pending" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
              <AlertCircle className="w-4 h-4" />
              Pending Approvals ({eligibleEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-green-500">
              <CheckCircle className="w-4 h-4" />
              Approved ({approvedRequests})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-red-500">
              <XCircle className="w-4 h-4" />
              Rejected ({rejectedRequests})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Overtime Approvals Required - {new Date(selectedDate).toLocaleDateString()}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    {filteredEmployees.length} of {eligibleEmployees.length} Pending
                  </Badge>
                </div>
              </div>
              
              {isEligibleLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600 font-medium">Loading eligible employees...</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-800 mb-2">
                    {eligibleEmployees.length === 0 ? "All caught up!" : "No matches found"}
                  </h4>
                  <p className="text-gray-600">
                    {eligibleEmployees.length === 0 
                      ? `No overtime approvals needed for ${new Date(selectedDate).toLocaleDateString()}`
                      : "Try adjusting your search filters"
                    }
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {eligibleEmployees.length === 0 
                      ? "Try selecting a different date or check attendance records."
                      : `${eligibleEmployees.length} total employees available`
                    }
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="w-16 text-gray-700 font-semibold">S.No</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Employee ID</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Group</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Actual Hours</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Required Hours</TableHead>
                        <TableHead className="text-gray-700 font-semibold">OT Hours</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee: any, index: number) => (
                        <TableRow key={`${employee.employeeId}-${employee.date}`} className="hover:bg-gray-50 border-gray-200">
                          <TableCell>
                            <Checkbox
                              checked={selectedEmployees.has(employee.id)}
                              onCheckedChange={(checked) => handleSelectEmployee(employee.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-gray-800">{index + 1}</TableCell>
                          <TableCell className="font-mono text-gray-700">{employee.employeeId}</TableCell>
                          <TableCell className="font-medium text-gray-800">{employee.fullName}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={employee.employeeGroup === 'group_a' ? 'default' : 'secondary'}
                              className={employee.employeeGroup === 'group_a' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                            >
                              {employee.employeeGroup === 'group_a' ? 'Group A' : 'Group B'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-700">{employee.actualHours}h</TableCell>
                          <TableCell className="text-gray-600">{employee.requiredHours}h</TableCell>
                          <TableCell>
                            <Badge className="bg-orange-100 text-orange-700 font-bold border border-orange-300">
                              +{employee.otHours}h
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 h-7 text-xs"
                                onClick={() => singleApproveMutation.mutate(employee)}
                                disabled={singleApproveMutation.isPending || singleRejectMutation.isPending}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 h-7 text-xs"
                                onClick={() => handleRejectWithReason(employee)}
                                disabled={singleApproveMutation.isPending || singleRejectMutation.isPending}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Approved Overtime Requests</h3>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {approvedRequests} Approved
                </Badge>
              </div>
              
              {isRequestsLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600 font-medium">Loading approved requests...</p>
                </div>
              ) : overtimeRequests.filter((req: any) => req.status === 'approved').length === 0 ? (
                <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-green-800 mb-2">No Approved Requests</h4>
                  <p className="text-green-700">No overtime requests have been approved yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-16 text-gray-700 font-semibold">S.No</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Employee ID</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Date</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Hours</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Reason</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Approved By</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Approved At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overtimeRequests.filter((req: any) => req.status === 'approved').map((request: any, index: number) => (
                        <TableRow key={request.id} className="hover:bg-gray-50 border-gray-200">
                          <TableCell className="font-medium text-gray-800">{index + 1}</TableCell>
                          <TableCell className="font-mono text-gray-700">{request.employeeId}</TableCell>
                          <TableCell className="text-gray-700">{new Date(request.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700 font-bold border border-green-300">
                              {request.hours}h
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600 max-w-xs truncate">{request.reason}</TableCell>
                          <TableCell className="text-gray-700">{request.approvedBy || 'System'}</TableCell>
                          <TableCell className="text-gray-600">
                            {request.approvedAt ? new Date(request.approvedAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Rejected Overtime Requests</h3>
                </div>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {rejectedRequests} Rejected
                </Badge>
              </div>
              
              {isRequestsLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600 font-medium">Loading rejected requests...</p>
                </div>
              ) : overtimeRequests.filter((req: any) => req.status === 'rejected').length === 0 ? (
                <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
                  <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-red-800 mb-2">No Rejected Requests</h4>
                  <p className="text-red-700">No overtime requests have been rejected yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-16 text-gray-700 font-semibold">S.No</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Employee ID</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Date</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Hours</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Reason</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Rejected At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overtimeRequests.filter((req: any) => req.status === 'rejected').map((request: any, index: number) => (
                        <TableRow key={request.id} className="hover:bg-gray-50 border-gray-200">
                          <TableCell className="font-medium text-gray-800">{index + 1}</TableCell>
                          <TableCell className="font-mono text-gray-700">{request.employeeId}</TableCell>
                          <TableCell className="text-gray-700">{new Date(request.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 text-red-700 font-bold border border-red-300">
                              {request.hours}h
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600 max-w-xs truncate">{request.reason}</TableCell>
                          <TableCell className="text-gray-600">
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Reject Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-600" />
              Reject Overtime Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Please provide a reason for rejecting this overtime request:
              </p>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-20 border-gray-300"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason("");
                  setEmployeeToReject(null);
                }}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmReject}
                disabled={!rejectReason.trim() || singleRejectMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {singleRejectMutation.isPending ? "Rejecting..." : "Reject Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}