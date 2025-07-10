import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Users, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AutomaticLeaveDeduction() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => apiRequest("GET", "/api/employees"),
  });

  // Fetch attendance data for the selected date
  const { data: attendanceData = [], isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["/api/attendance", selectedDate],
    queryFn: () => apiRequest("GET", `/api/attendance?date=${selectedDate}`),
  });

  // Fetch leave balances for current year
  const { data: leaveBalances = [] } = useQuery({
    queryKey: ["/api/leave-balances/report", new Date().getFullYear()],
    queryFn: () => apiRequest("GET", `/api/leave-balances/report?year=${new Date().getFullYear()}`),
  });

  // Process automatic leave deduction
  const processLeaveDeductionMutation = useMutation({
    mutationFn: async ({ date, employeeId }: { date: string; employeeId?: string }) => {
      return apiRequest("POST", "/api/leave-deduction/process", {
        date,
        employeeId: employeeId === "all" ? undefined : employeeId
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Success",
        description: `Processed leave deduction for ${data.processedEmployees || 0} employees. ${data.deductedCount || 0} leave days deducted.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process leave deduction",
        variant: "destructive",
      });
    },
  });

  const handleProcessLeaveDeduction = () => {
    processLeaveDeductionMutation.mutate({
      date: selectedDate,
      employeeId: selectedEmployee
    });
  };

  // Calculate statistics
  const activeEmployees = employees?.filter((emp: any) => emp.status === 'active') || [];
  const totalEmployees = activeEmployees.length;
  const attendedEmployees = attendanceData?.length || 0;
  const absentEmployees = totalEmployees - attendedEmployees;
  const eligibleForDeduction = leaveBalances?.filter((balance: any) => balance.remaining_days > 0)?.length || 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Automatic Leave Deduction</h2>
          <p className="text-gray-600">Process leave deductions for absent employees</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {activeEmployees.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleProcessLeaveDeduction}
            disabled={processLeaveDeductionMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {processLeaveDeductionMutation.isPending ? "Processing..." : "Process Deduction"}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{attendedEmployees}</div>
            <p className="text-xs text-muted-foreground">Attended on {selectedDate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentEmployees}</div>
            <p className="text-xs text-muted-foreground">Eligible for deduction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Leave Balance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eligibleForDeduction}</div>
            <p className="text-xs text-muted-foreground">Have remaining days</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Deduction Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Leave Deduction Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="text-xs">Rule 1</Badge>
              <p className="text-sm">Employees absent without prior leave application will have 1 day deducted from their annual leave balance.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="text-xs">Rule 2</Badge>
              <p className="text-sm">Deduction applies only to employees with remaining leave balance (greater than 0 days).</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="text-xs">Rule 3</Badge>
              <p className="text-sm">Employees who have already applied for leave on the selected date are excluded from deduction.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="text-xs">Rule 4</Badge>
              <p className="text-sm">Government holidays and weekends are excluded from automatic deduction processing.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Process Summary */}
      {isAttendanceLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-4">Loading attendance data...</p>
          </CardContent>
        </Card>
      )}

      {!isAttendanceLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Summary for {selectedDate}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Active Employees:</span>
                <span className="font-medium">{totalEmployees}</span>
              </div>
              <div className="flex justify-between">
                <span>Present Employees:</span>
                <span className="font-medium text-green-600">{attendedEmployees}</span>
              </div>
              <div className="flex justify-between">
                <span>Absent Employees:</span>
                <span className="font-medium text-red-600">{absentEmployees}</span>
              </div>
              <div className="flex justify-between">
                <span>Eligible for Deduction:</span>
                <span className="font-medium text-orange-600">{Math.min(absentEmployees, eligibleForDeduction)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}