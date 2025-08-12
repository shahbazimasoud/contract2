
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, MoreHorizontal, ClipboardCheck, Calendar as CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';
import { tasks as mockTasks, units as mockUnits } from '@/lib/mock-data';
import type { Task, User } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

const AUTH_USER_KEY = 'current_user';

const taskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    unit: z.string().min(1, "Unit is required"),
    dueDate: z.date({ required_error: "Due date is required" }),
    recurrenceType: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
    dayOfWeek: z.number().optional(),
    dayOfMonth: z.number().optional(),
});

const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TasksPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>(mockTasks);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof taskSchema>>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            title: "",
            description: "",
            unit: "",
            recurrenceType: "none",
            time: "09:00",
        },
    });
    
    useEffect(() => {
        const storedUser = localStorage.getItem(AUTH_USER_KEY);
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        const defaultUnit = currentUser.role === 'admin' ? currentUser.unit : "";

        if (editingTask) {
            form.reset({
                title: editingTask.title,
                description: editingTask.description,
                unit: editingTask.unit,
                dueDate: new Date(editingTask.dueDate),
                recurrenceType: editingTask.recurrence.type,
                time: editingTask.recurrence.time,
                dayOfWeek: editingTask.recurrence.dayOfWeek,
                dayOfMonth: editingTask.recurrence.dayOfMonth,
            });
        } else {
            form.reset({
                title: "",
                description: "",
                unit: defaultUnit,
                dueDate: new Date(),
                recurrenceType: 'none',
                time: "09:00",
            });
        }
    }, [editingTask, form, currentUser]);

    const handleOpenDialog = (task: Task | null) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setEditingTask(null);
        setIsDialogOpen(false);
        form.reset();
    };

    const handleToggleStatus = (task: Task) => {
        const newStatus = task.status === 'pending' ? 'completed' : 'pending';
        const updatedTask = { ...task, status: newStatus };
        setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
        toast({
            title: "Task Status Updated",
            description: `Task "${task.title}" marked as ${newStatus}.`,
        });
    };
    
    const handleDelete = (id: string) => {
      setTasks(tasks.filter(t => t.id !== id));
      toast({
          title: "Task Deleted",
          description: `The task has been successfully deleted.`,
          variant: "destructive",
      });
    }

    const onSubmit = (values: z.infer<typeof taskSchema>) => {
        if (!currentUser) return;

        const taskData = {
            title: values.title,
            description: values.description,
            unit: values.unit,
            status: 'pending' as const,
            dueDate: values.dueDate.toISOString(),
            recurrence: {
                type: values.recurrenceType,
                time: values.time,
                dayOfWeek: values.recurrenceType === 'weekly' ? values.dayOfWeek : undefined,
                dayOfMonth: values.recurrenceType === 'monthly' ? values.dayOfMonth : undefined,
            },
        };
        
        if (editingTask) {
            const updatedTask: Task = {
                ...editingTask,
                ...taskData,
            };
            setTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t));
            toast({
                title: "Task Updated",
                description: `Task "${updatedTask.title}" has been updated.`,
            });
        } else {
            const newTask: Task = {
                id: `T-${Date.now()}`,
                createdBy: currentUser.name,
                ...taskData,
            };
            setTasks([newTask, ...tasks]);
            toast({
                title: "Task Created",
                description: `Task "${newTask.title}" has been created.`,
            });
        }
        handleCloseDialog();
    };

    const recurrenceType = form.watch('recurrenceType');

    const filteredTasks = useMemo(() => {
        if (!currentUser) return [];
        return currentUser.role === 'admin'
            ? tasks.filter(t => t.unit === currentUser.unit)
            : tasks;
    }, [tasks, currentUser]);

    function formatRecurrence(task: Task): string {
        const { recurrence } = task;
        const time = format(parse(recurrence.time, 'HH:mm', new Date()), 'h:mm a');
        switch (recurrence.type) {
            case 'none':
                return 'One-time';
            case 'daily':
                return `Daily at ${time}`;
            case 'weekly':
                return `Weekly on ${weekDays[recurrence.dayOfWeek!]} at ${time}`;
            case 'monthly':
                return `Monthly on day ${recurrence.dayOfMonth} at ${time}`;
            case 'yearly':
                return `Yearly on ${format(new Date(task.dueDate), 'MMM d')} at ${time}`;
            default:
                return 'N/A';
        }
    }
    
    if (!currentUser) {
      return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <PageHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <PageHeaderHeading>Tasks & Reminders</PageHeaderHeading>
                        <PageHeaderDescription>Manage your recurring and one-time tasks.</PageHeaderDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Task
                    </Button>
                </div>
            </PageHeader>

            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                        <DialogDescription>
                            Fill out the form below to create or update a task.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl><Input placeholder="e.g., Weekly Backup Check" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl><Textarea placeholder="Describe the task..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unit</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={currentUser.role === 'admin'}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a unit" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {mockUnits.map((unit) => (
                                                <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="recurrenceType"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Recurrence</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">One-time</SelectItem>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            
                            {recurrenceType === 'none' && (
                                <FormField
                                    control={form.control}
                                    name="dueDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            
                            {recurrenceType === 'weekly' && (
                                <FormField
                                    control={form.control}
                                    name="dayOfWeek"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Day of Week</FormLabel>
                                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value)}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {weekDays.map((day, i) => <SelectItem key={day} value={String(i)}>{day}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            
                            {recurrenceType === 'monthly' && (
                                <FormField
                                    control={form.control}
                                    name="dayOfMonth"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Day of Month</FormLabel>
                                            <FormControl><Input type="number" min="1" max="31" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                             <FormField
                                control={form.control}
                                name="time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Time</FormLabel>
                                        <FormControl><Input type="time" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                <Button type="submit">{editingTask ? 'Save Changes' : 'Create Task'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            
            <Card>
                <CardHeader>
                    <CardTitle>Task List</CardTitle>
                    <CardDescription>A list of all tasks assigned to your units.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40px]"></TableHead>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Next Due</TableHead>
                                    <TableHead>Recurrence</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => (
                                        <TableRow key={task.id} className={cn(task.status === 'completed' && 'text-muted-foreground line-through')}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={task.status === 'completed'}
                                                    onCheckedChange={() => handleToggleStatus(task)}
                                                    aria-label={`Mark task "${task.title}" as ${task.status === 'pending' ? 'completed' : 'pending'}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div>{task.title}</div>
                                                <div className="text-xs text-muted-foreground">{task.description}</div>
                                            </TableCell>
                                            <TableCell>{task.unit}</TableCell>
                                            <TableCell>{format(new Date(task.dueDate), "PP")}</TableCell>
                                            <TableCell>{formatRecurrence(task)}</TableCell>
                                            <TableCell>
                                                <Badge variant={task.status === 'pending' ? 'secondary' : 'outline'}>{task.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleOpenDialog(task)}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive">Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                                                <p className="font-semibold">No tasks found.</p>
                                                <p className="text-muted-foreground text-sm">Create a new task to get started.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
