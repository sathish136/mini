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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingBalance(balance)}
                          className="text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
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
    </div>
  );
}