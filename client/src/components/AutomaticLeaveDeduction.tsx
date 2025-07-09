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
  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
  });

  // Fetch attendance data for the selected date
  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["/api/attendance", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/attendance?date=${selectedDate}`);
      if (!response.ok) throw new Error("Failed to fetch attendance");
      return response.json();
    },
  });

  // Fetch leave balances for current year
  const { data: leaveBalances } = useQuery({
    queryKey: ["/api/leave-balances", new Date().getFullYear()],
    queryFn: async () => {
      const response = await fetch(`/api/leave-balances?year=${new Date().getFullYear()}`);
      if (!response.ok) throw new Error("Failed to fetch leave balances");
      return response.json();
    },
  });

  // Process automatic leave deduction
  const processLeaveDeductionMutation = useMutation({
    mutationFn: async ({ date, employeeId }: { date: string; employeeId?: string }) => {
      const response = await apiRequest("POST", "/api/leave-deduction/process", {
        date,
        employeeId: employeeId === "all" ? undefined : employeeId
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Success",
        description: `Processed leave deduction for ${data.processedEmployees} employees. ${data.deductedCount} leave days deducted.`,
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
  const eligibleForDeduction = leaveBalances?.filter((balance: any) => balance.remainingDays > 0)?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Automatic Leave Deduction</h2>
        <div className="flex items-center gap-2">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {activeEmployees.map((emp: any) => (
                <SelectItem key={emp.employeeId} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button 
            onClick={handleProcessLeaveDeduction}
            disabled={processLeaveDeductionMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {processLeaveDeductionMutation.isPending ? "Processing..." : "Process Deduction"}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="flex items-center p-4">
            <div className="rounded-full bg-blue-500 p-3 mr-3">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Employees</p>
              <p className="text-2xl font-bold text-blue-900">{totalEmployees}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="flex items-center p-4">
            <div className="rounded-full bg-green-500 p-3 mr-3">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Present Today</p>
              <p className="text-2xl font-bold text-green-900">{attendedEmployees}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="flex items-center p-4">
            <div className="rounded-full bg-red-500 p-3 mr-3">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-600 font-medium">Absent Today</p>
              <p className="text-2xl font-bold text-red-900">{absentEmployees}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="flex items-center p-4">
            <div className="rounded-full bg-purple-500 p-3 mr-3">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Eligible for Deduction</p>
              <p className="text-2xl font-bold text-purple-900">{eligibleForDeduction}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            How Automatic Leave Deduction Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Process Overview</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>System checks attendance records for the selected date</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Identifies employees without attendance records</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Automatically deducts 1 day from eligible leave balance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Updates leave balance records in real-time</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Eligibility Criteria</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Employee must be active in the system</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Must have remaining leave balance (greater than 0 days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>No attendance record for the selected date</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Not on a government holiday or weekend</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Absent Employees Table */}
      {isAttendanceLoading ? (
        <Card className="shadow-sm border border-gray-200">
          <CardContent className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
              <div className="text-lg text-gray-600">Loading attendance data...</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Absent Employees - {new Date(selectedDate).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {absentEmployees === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Perfect Attendance!</h3>
                <p className="text-gray-600">All employees have attendance records for this date.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-2 text-left font-semibold">Employee ID</th>
                      <th className="px-4 py-2 text-left font-semibold">Name</th>
                      <th className="px-4 py-2 text-left font-semibold">Department</th>
                      <th className="px-4 py-2 text-left font-semibold">Group</th>
                      <th className="px-4 py-2 text-left font-semibold">Leave Balance</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activeEmployees
                      .filter((emp: any) => !attendanceData?.some((att: any) => att.employeeId === emp.employeeId))
                      .map((emp: any) => {
                        const balance = leaveBalances?.find((b: any) => b.employee_id === emp.employeeId);
                        return (
                          <tr key={emp.employeeId} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{emp.employeeId}</td>
                            <td className="px-4 py-2">{emp.fullName}</td>
                            <td className="px-4 py-2">{emp.department}</td>
                            <td className="px-4 py-2">
                              <Badge variant={emp.employeeGroup === 'group_a' ? 'default' : 'secondary'}>
                                {emp.employeeGroup === 'group_a' ? 'Group A' : 'Group B'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`font-medium ${balance?.remaining_days > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {balance?.remaining_days || 0} days
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {balance?.remaining_days > 0 ? (
                                <Badge className="bg-orange-100 text-orange-800">Eligible for Deduction</Badge>
                              ) : (
                                <Badge variant="destructive">No Leave Balance</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}