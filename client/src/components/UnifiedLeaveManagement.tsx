import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Users, Clock, TrendingUp, Edit, Plus, Minus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Employee interface
interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  department: string;
  employee_group: string;
}

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

// Unified leave form schema
const leaveActionSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  days: z.number().min(1).max(45, "Days must be between 1 and 45"),
  reason: z.string().min(1, "Reason is required"),
});

type LeaveActionForm = z.infer<typeof leaveActionSchema>;

export default function UnifiedLeaveManagement() {
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [actionType, setActionType] = useState<'deduct' | 'add'>('deduct');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: () => apiRequest('GET', '/api/employees'),
  });

  // Fetch leave balances
  const { data: leaveBalances = [], isLoading } = useQuery({
    queryKey: ['/api/leave-balances/report', selectedYear],
    queryFn: () => apiRequest('GET', `/api/leave-balances/report?year=${selectedYear}`),
  });

  // Initialize leave balance for employee
  const initializeBalanceMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return apiRequest('POST', '/api/leave-balances', {
        employeeId,
        year: selectedYear,
        annualEntitlement: 45,
        usedDays: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-balances/report'] });
      toast({
        title: "Success",
        description: "Leave balance initialized successfully",
      });
    },
  });

  // Update leave balance mutation
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ employeeId, newUsedDays }: { employeeId: string; newUsedDays: number }) => {
      return apiRequest('PUT', `/api/leave-balances/${employeeId}/${selectedYear}`, { 
        usedDays: Math.max(0, newUsedDays) 
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave balance updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-balances/report'] });
      setIsActionDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave balance",
        variant: "destructive",
      });
    },
  });

  const form = useForm<LeaveActionForm>({
    resolver: zodResolver(leaveActionSchema),
    defaultValues: {
      employeeId: "",
      days: 1,
      reason: "",
    },
  });

  const handleSubmit = (data: LeaveActionForm) => {
    const balance = leaveBalances.find(b => b.employee_id === data.employeeId);
    if (!balance) {
      // Initialize balance first
      initializeBalanceMutation.mutate(data.employeeId);
      return;
    }

    const currentUsedDays = balance.used_days || 0;
    const newUsedDays = actionType === 'deduct' 
      ? currentUsedDays + data.days 
      : Math.max(0, currentUsedDays - data.days);

    updateBalanceMutation.mutate({
      employeeId: data.employeeId,
      newUsedDays,
    });
  };

  const handleQuickAction = (employeeId: string, action: 'deduct' | 'add', days: number) => {
    const balance = leaveBalances.find(b => b.employee_id === employeeId);
    if (!balance) {
      initializeBalanceMutation.mutate(employeeId);
      return;
    }

    const currentUsedDays = balance.used_days || 0;
    const newUsedDays = action === 'deduct' 
      ? currentUsedDays + days 
      : Math.max(0, currentUsedDays - days);

    updateBalanceMutation.mutate({
      employeeId,
      newUsedDays,
    });
  };

  // Calculate summary statistics
  const reportData = Array.isArray(leaveBalances) ? leaveBalances : [];
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
          <p className="text-gray-600">Manage 45-day annual leave entitlements - Add or deduct leave days</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add/Deduct Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Leave Balance Action</DialogTitle>
                <DialogDescription>
                  Add or deduct leave days for an employee
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.fullName} ({employee.employeeId})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={actionType === 'deduct' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActionType('deduct')}
                      className="flex-1"
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      Deduct
                    </Button>
                    <Button
                      type="button"
                      variant={actionType === 'add' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActionType('add')}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Back
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Days to {actionType === 'deduct' ? 'Deduct' : 'Add Back'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="45"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter reason for leave adjustment" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsActionDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateBalanceMutation.isPending}>
                      {updateBalanceMutation.isPending ? 'Processing...' : 'Update Balance'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Statistics */}
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
            <CardTitle className="text-sm font-medium">Total Entitlement</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntitlement}</div>
            <p className="text-xs text-muted-foreground">Total leave days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Used</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsed}</div>
            <p className="text-xs text-muted-foreground">Leave days taken</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageUtilization}%</div>
            <p className="text-xs text-muted-foreground">Average usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Leave Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Leave Balances - {selectedYear}</CardTitle>
          <CardDescription>
            Annual leave entitlement: 45 days per employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {reportData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No leave balances found for {selectedYear}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Employee</th>
                        <th className="text-left p-2 font-medium">Department</th>
                        <th className="text-left p-2 font-medium">Group</th>
                        <th className="text-right p-2 font-medium">Entitlement</th>
                        <th className="text-right p-2 font-medium">Used</th>
                        <th className="text-right p-2 font-medium">Remaining</th>
                        <th className="text-right p-2 font-medium">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((balance) => (
                        <tr key={balance.employee_id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div className="font-medium">{balance.full_name}</div>
                            <div className="text-sm text-gray-500">{balance.emp_id}</div>
                          </td>
                          <td className="p-2 text-sm">{balance.department}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">
                              {balance.employee_group === 'group_a' ? 'Group A' : 'Group B'}
                            </Badge>
                          </td>
                          <td className="text-right p-2 font-medium">{balance.annual_entitlement}</td>
                          <td className="text-right p-2">
                            <span className={`font-medium ${balance.used_days > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                              {balance.used_days}
                            </span>
                          </td>
                          <td className="text-right p-2">
                            <span className={`font-medium ${balance.remaining_days < 10 ? 'text-red-600' : 'text-green-600'}`}>
                              {balance.remaining_days}
                            </span>
                          </td>
                          <td className="text-right p-2">
                            <div className="flex justify-end space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickAction(balance.employee_id, 'deduct', 1)}
                                disabled={updateBalanceMutation.isPending}
                                className="px-2 py-1 text-xs"
                              >
                                -1
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickAction(balance.employee_id, 'add', 1)}
                                disabled={updateBalanceMutation.isPending || balance.used_days === 0}
                                className="px-2 py-1 text-xs"
                              >
                                +1
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}