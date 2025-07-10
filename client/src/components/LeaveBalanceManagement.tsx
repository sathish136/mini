import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, FileText, Users, Clock, TrendingUp, BarChart3, AlertCircle, Download, Edit, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

// Leave Balance interface
interface LeaveBalance {
  employee_id: string;
  full_name: string;
  emp_id: string;
  year: number;
  annual_entitlement: number;
  used_days: number;
  remaining_days: number;
  department: string;
  employee_group: string;
  utilization_percentage: number;
  usage_category?: string;
}

// Detailed Leave Balance Calculation interface
interface LeaveBalanceCalculation {
  employee: {
    id: number;
    employeeId: string;
    fullName: string;
    department: string;
    group: string;
    email: string;
    joinDate: string;
  };
  leaveBalance: {
    year: number;
    annualEntitlement: number;
    totalLeaveTaken: number;
    remainingDays: number;
    utilizationPercentage: number;
    usageCategory: string;
  };
  leaveHistory: {
    startDate: string;
    endDate: string;
    totalDays: number;
    leaveType: string;
    reason: string;
    status: string;
  }[];
  calculation: {
    formula: string;
    details: {
      annualEntitlement: string;
      totalLeaveTaken: string;
      remainingBalance: string;
    };
  };
}

// Leave Balance form schema
const leaveBalanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  year: z.number().min(2020).max(2030),
  annualEntitlement: z.number().min(1).max(60).default(45),
  usedDays: z.number().min(0).max(60).default(0),
});

type LeaveBalanceForm = z.infer<typeof leaveBalanceSchema>;

export default function LeaveBalanceManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingBalance, setEditingBalance] = useState<LeaveBalance | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch leave balances
  const { data: leaveBalances = [], isLoading } = useQuery({
    queryKey: ['/api/leave-balances', selectedYear],
    queryFn: () => apiRequest('GET', `/api/leave-balances?year=${selectedYear}`),
  });

  // Fetch leave balance report
  const { data: leaveReport = [], isLoading: isReportLoading } = useQuery({
    queryKey: ['/api/leave-balances/report', selectedYear],
    queryFn: () => apiRequest('GET', `/api/leave-balances/report?year=${selectedYear}`),
  });

  // Fetch detailed leave balance calculation
  const { data: leaveCalculation, isLoading: isCalculationLoading } = useQuery({
    queryKey: ['/api/leave-balances/calculate', selectedEmployeeId, selectedYear],
    queryFn: () => apiRequest('GET', `/api/leave-balances/calculate/${selectedEmployeeId}/${selectedYear}`),
    enabled: !!selectedEmployeeId,
  });

  // Create/Update leave balance mutation
  const createBalanceMutation = useMutation({
    mutationFn: async (data: LeaveBalanceForm) => {
      return apiRequest('POST', '/api/leave-balances', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave balance created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-balances/report'] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create leave balance",
        variant: "destructive",
      });
    },
  });

  // Update leave balance mutation
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ employeeId, year, usedDays }: { employeeId: string; year: number; usedDays: number }) => {
      return apiRequest('PUT', `/api/leave-balances/${employeeId}/${year}`, { usedDays });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave balance updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-balances/report'] });
      setEditingBalance(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave balance",
        variant: "destructive",
      });
    },
  });

  const form = useForm<LeaveBalanceForm>({
    resolver: zodResolver(leaveBalanceSchema),
    defaultValues: {
      employeeId: "",
      year: selectedYear,
      annualEntitlement: 45,
      usedDays: 0,
    },
  });

  const handleSubmit = (data: LeaveBalanceForm) => {
    createBalanceMutation.mutate(data);
  };

  const handleUpdateUsedDays = (balance: LeaveBalance, newUsedDays: number) => {
    updateBalanceMutation.mutate({
      employeeId: balance.employee_id,
      year: balance.year,
      usedDays: newUsedDays,
    });
  };

  const handleViewDetails = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setIsDetailViewOpen(true);
  };

  const getUsageCategoryColor = (category: string) => {
    switch (category) {
      case 'No Leave Taken':
        return 'bg-gray-100 text-gray-800';
      case 'Low Usage':
        return 'bg-green-100 text-green-800';
      case 'Moderate Usage':
        return 'bg-yellow-100 text-yellow-800';
      case 'High Usage':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate summary statistics
  const reportData = Array.isArray(leaveReport) ? leaveReport : [];
  const totalEmployees = reportData.length;
  const totalEntitlement = reportData.reduce((sum, emp) => sum + (emp.annual_entitlement || 0), 0);
  const totalUsed = reportData.reduce((sum, emp) => sum + (emp.used_days || 0), 0);
  const totalRemaining = reportData.reduce((sum, emp) => sum + (emp.remaining_days || 0), 0);
  const averageUtilization = totalEmployees > 0 ? (totalUsed / totalEntitlement * 100).toFixed(1) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Balance Management</h1>
          <p className="text-gray-600">Manage 45-day annual leave entitlements for all employees</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Leave Balance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Leave Balance</DialogTitle>
                <DialogDescription>
                  Create a new leave balance record for an employee.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee ID</FormLabel>
                        <FormControl>
                          <Input placeholder="EMP001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value || selectedYear} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="annualEntitlement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Entitlement (Days)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value || 45} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="usedDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Used Days</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value || 0} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createBalanceMutation.isPending}>
                      {createBalanceMutation.isPending ? "Creating..." : "Create Balance"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-blue-500 p-3 mr-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Employees</p>
              <p className="text-2xl font-bold text-blue-900">{totalEmployees}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-green-500 p-3 mr-4">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Total Entitlement</p>
              <p className="text-2xl font-bold text-green-900">{totalEntitlement} days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-orange-500 p-3 mr-4">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-orange-600 font-medium">Total Used</p>
              <p className="text-2xl font-bold text-orange-900">{totalUsed} days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-purple-500 p-3 mr-4">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Average Utilization</p>
              <p className="text-2xl font-bold text-purple-900">{averageUtilization}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balance Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Leave Balance Report - {selectedYear}
          </CardTitle>
          <CardDescription>
            Track 45-day annual leave entitlements and usage for all employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isReportLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Employee ID</th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Full Name</th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Department</th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Group</th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Entitlement</th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Used Days</th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Remaining</th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Utilization</th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((balance) => (
                    <tr key={`${balance.employee_id}-${balance.year}`} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 text-sm">{balance.emp_id}</td>
                      <td className="border border-gray-200 px-4 py-2 text-sm font-medium">{balance.full_name}</td>
                      <td className="border border-gray-200 px-4 py-2 text-sm">{balance.department}</td>
                      <td className="border border-gray-200 px-4 py-2 text-sm">
                        <Badge variant={balance.employee_group === 'group_a' ? 'default' : 'secondary'}>
                          {balance.employee_group === 'group_a' ? 'Group A' : 'Group B'}
                        </Badge>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-sm font-medium">{balance.annual_entitlement}</td>
                      <td className="border border-gray-200 px-4 py-2 text-sm">
                        <span className={`font-medium ${balance.used_days > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {balance.used_days}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-sm">
                        <span className={`font-medium ${balance.remaining_days < 10 ? 'text-red-600' : 'text-green-600'}`}>
                          {balance.remaining_days}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-sm">
                        <span className={`font-medium ${balance.utilization_percentage > 80 ? 'text-red-600' : balance.utilization_percentage > 50 ? 'text-orange-600' : 'text-green-600'}`}>
                          {balance.utilization_percentage}%
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-sm">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(balance.employee_id)}
                            className="text-xs"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingBalance(balance)}
                            className="text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {reportData.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No leave balance records found for {selectedYear}</p>
                  <p className="text-sm text-gray-400">Create leave balance records for employees using the "Add Leave Balance" button.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Leave Balance Dialog */}
      <Dialog open={!!editingBalance} onOpenChange={() => setEditingBalance(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Leave Balance</DialogTitle>
            <DialogDescription>
              Update used days for {editingBalance?.full_name} ({editingBalance?.emp_id})
            </DialogDescription>
          </DialogHeader>
          {editingBalance && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="usedDays">Used Days</Label>
                <Input
                  id="usedDays"
                  type="number"
                  min="0"
                  max={editingBalance.annual_entitlement}
                  defaultValue={editingBalance.used_days}
                  onChange={(e) => {
                    const newUsedDays = parseInt(e.target.value) || 0;
                    if (newUsedDays >= 0 && newUsedDays <= editingBalance.annual_entitlement) {
                      handleUpdateUsedDays(editingBalance, newUsedDays);
                    }
                  }}
                />
              </div>
              <div className="text-sm text-gray-600">
                <p>Annual Entitlement: {editingBalance.annual_entitlement} days</p>
                <p>Current Used: {editingBalance.used_days} days</p>
                <p>Remaining: {editingBalance.remaining_days} days</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Policy Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Leave Policy Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Annual Leave Entitlement</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All employees receive 45 days of annual leave per year</li>
                <li>• Leave balance is individual to each employee</li>
                <li>• Leave days are deducted when employees are absent</li>
                <li>• Remaining leave balance carries forward based on policy</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Leave Management</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Track leave usage and remaining balances</li>
                <li>• Generate reports for HR and management</li>
                <li>• Monitor leave utilization patterns</li>
                <li>• Manage leave requests and approvals</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Leave Balance View Dialog */}
      <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Detailed Leave Balance Calculation
            </DialogTitle>
            <DialogDescription>
              Comprehensive leave balance details and calculation breakdown
            </DialogDescription>
          </DialogHeader>
          
          {isCalculationLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : leaveCalculation ? (
            <div className="space-y-6">
              {/* Employee Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employee Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Employee ID</p>
                      <p className="font-medium">{leaveCalculation.employee.employeeId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium">{leaveCalculation.employee.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="font-medium">{leaveCalculation.employee.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Group</p>
                      <Badge variant={leaveCalculation.employee.group === 'group_a' ? 'default' : 'secondary'}>
                        {leaveCalculation.employee.group === 'group_a' ? 'Group A' : 'Group B'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leave Balance Calculation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Leave Balance Calculation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Calculation Formula */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Calculation Formula</h4>
                      <p className="text-lg font-mono bg-white p-2 rounded border">
                        {leaveCalculation.calculation.formula}
                      </p>
                    </div>
                    
                    {/* Balance Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-700">{leaveCalculation.leaveBalance.annualEntitlement}</div>
                        <div className="text-sm text-green-600">Annual Entitlement</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-orange-700">{leaveCalculation.leaveBalance.totalLeaveTaken}</div>
                        <div className="text-sm text-orange-600">Total Leave Taken</div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-700">{leaveCalculation.leaveBalance.remainingDays}</div>
                        <div className="text-sm text-purple-600">Remaining Days</div>
                      </div>
                    </div>

                    {/* Usage Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Utilization Percentage</p>
                        <p className="text-lg font-medium">{leaveCalculation.leaveBalance.utilizationPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Usage Category</p>
                        <Badge className={getUsageCategoryColor(leaveCalculation.leaveBalance.usageCategory)}>
                          {leaveCalculation.leaveBalance.usageCategory}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leave History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Leave History ({leaveCalculation.leaveBalance.year})</CardTitle>
                </CardHeader>
                <CardContent>
                  {leaveCalculation.leaveHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Start Date</th>
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">End Date</th>
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Days</th>
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Type</th>
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Reason</th>
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaveCalculation.leaveHistory.map((leave, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-4 py-2 text-sm">
                                {new Date(leave.startDate).toLocaleDateString()}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm">
                                {new Date(leave.endDate).toLocaleDateString()}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm font-medium">
                                {leave.totalDays}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm">
                                <Badge variant="outline">{leave.leaveType}</Badge>
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm">
                                {leave.reason || 'N/A'}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm">
                                <Badge variant={leave.status === 'approved' ? 'default' : 'secondary'}>
                                  {leave.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarDays className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">No leave records found for {leaveCalculation.leaveBalance.year}</p>
                      <p className="text-sm text-gray-400">Employee has not taken any approved leave this year.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Unable to load leave balance details</p>
              <p className="text-sm text-gray-400">Please try again later or contact support.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}