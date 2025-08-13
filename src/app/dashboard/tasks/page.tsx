
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, MoreHorizontal, ClipboardCheck, Calendar as CalendarIcon, X, Users as UsersIcon, MessageSquare, CalendarPlus, Download, CheckCircle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, formatDistanceToNow, setHours, setMinutes, setSeconds } from 'date-fns';
import * as ics from 'ics';


import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
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
  DropdownMenuSeparator,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';
import { tasks as mockTasks, units as mockUnits, users as mockUsers } from '@/lib/mock-data';
import type { Task, User, Comment } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';


const AUTH_USER_KEY = 'current_user';

const reminderDaysSchema = z.object({
  days: z.number().min(0, "Cannot be negative").max(365, "Cannot be more than 365 days"),
});

const taskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    unit: z.string().min(1, "Unit is required"),
    assignedTo: z.string().optional(),
    sharedWith: z.array(z.string()).optional(),
    dueDate: z.date({ required_error: "Date is required" }),
    recurrenceType: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
    dayOfWeek: z.number().optional(),
    dayOfMonth: z.number().optional(),
    reminders: z.array(reminderDaysSchema).min(1, "At least one reminder is required."),
});

const commentSchema = z.object({
    text: z.string().min(1, "Comment cannot be empty.").max(500, "Comment is too long."),
});


const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TasksPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>(mockTasks);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const { toast } = useToast();
    const [usersInUnit, setUsersInUnit] = useState<User[]>([]);

    const [isCommentsSheetOpen, setIsCommentsSheetOpen] = useState(false);
    const [selectedTaskForComments, setSelectedTaskForComments] = useState<Task | null>(null);

    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);


    const form = useForm<z.infer<typeof taskSchema>>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            title: "",
            description: "",
            unit: "",
            assignedTo: "",
            sharedWith: [],
            recurrenceType: "none",
            time: "09:00",
            reminders: [{ days: 1 }],
        },
    });

    const commentForm = useForm<z.infer<typeof commentSchema>>({
        resolver: zodResolver(commentSchema),
        defaultValues: { text: "" },
    });
    
    const selectedUnit = form.watch('unit');

    useEffect(() => {
        if (selectedUnit) {
            setUsersInUnit(mockUsers.filter(u => u.unit === selectedUnit));
        } else {
            setUsersInUnit([]);
        }
    }, [selectedUnit]);


     const { fields: reminderDayFields, append: appendReminderDay, remove: removeReminderDay } = useFieldArray({
        control: form.control,
        name: "reminders"
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
                assignedTo: editingTask.assignedTo,
                sharedWith: editingTask.sharedWith,
                dueDate: new Date(editingTask.dueDate),
                recurrenceType: editingTask.recurrence.type,
                time: editingTask.recurrence.time,
                dayOfWeek: editingTask.recurrence.dayOfWeek,
                dayOfMonth: editingTask.recurrence.dayOfMonth,
                reminders: editingTask.reminders.map(days => ({ days })),
            });
        } else {
            form.reset({
                title: "",
                description: "",
                unit: defaultUnit,
                assignedTo: "",
                sharedWith: [],
                dueDate: new Date(),
                recurrenceType: 'none',
                time: "09:00",
                reminders: [{ days: 1 }],
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

    const handleOpenCommentsSheet = (task: Task) => {
        setSelectedTaskForComments(task);
        setIsCommentsSheetOpen(true);
    };

    const handleCloseCommentsSheet = () => {
        setSelectedTaskForComments(null);
        setIsCommentsSheetOpen(false);
        commentForm.reset();
    };

     const onCommentSubmit = (values: z.infer<typeof commentSchema>) => {
        if (!currentUser || !selectedTaskForComments) return;

        const newComment: Comment = {
            id: `CMT-T-${Date.now()}`,
            text: values.text,
            author: currentUser.name,
            authorId: currentUser.id,
            createdAt: new Date().toISOString(),
        };

        const updatedTask = {
            ...selectedTaskForComments,
            comments: [...(selectedTaskForComments.comments || []), newComment],
        };

        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        setSelectedTaskForComments(updatedTask);
        commentForm.reset();
        toast({
            title: "Comment Added",
            description: "Your comment has been successfully posted.",
        });
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
            assignedTo: values.assignedTo,
            sharedWith: values.sharedWith,
            dueDate: values.dueDate.toISOString(),
            recurrence: {
                type: values.recurrenceType,
                time: values.time,
                dayOfWeek: values.recurrenceType === 'weekly' ? values.dayOfWeek : undefined,
                dayOfMonth: values.recurrenceType === 'monthly' ? values.dayOfMonth : undefined,
            },
            reminders: values.reminders.map(r => r.days),
        };
        
        if (editingTask) {
            const updatedTask: Task = {
                ...editingTask,
                ...taskData,
                status: editingTask.status, // Preserve status on edit
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
                status: 'pending',
                comments: [],
            };
            setTasks([newTask, ...tasks]);
            toast({
                title: "Task Created",
                description: `Task "${newTask.title}" has been created.`,
            });
        }
        handleCloseDialog();
    };

    const handleBulkExport = () => {
        const tasksToExport = tasks.filter(task => selectedTaskIds.includes(task.id));
        if (tasksToExport.length === 0) {
            toast({
                title: "No Tasks Selected",
                description: "Please select tasks to export.",
                variant: "destructive",
            });
            return;
        }

        const events: ics.EventAttributes[] = tasksToExport.map(task => {
            const dueDate = new Date(task.dueDate);
            const [hours, minutes] = task.recurrence.time.split(':').map(Number);
            const startDate = setSeconds(setMinutes(setHours(dueDate, hours), minutes), 0);
            return {
                title: task.title,
                description: task.description,
                start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startDate.getHours(), startDate.getMinutes()],
                duration: { hours: 1 },
            };
        });

        ics.createEvents(events, (error, value) => {
             if (error) {
                console.error(error);
                toast({
                    title: "Error Creating Calendar File",
                    description: "There was a problem generating the .ics file.",
                    variant: "destructive",
                });
                return;
            }
            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ContractWise_Tasks_Export.ics`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setSelectedTaskIds([]); // Deselect tasks after export
        });
    };

    const handleAddToCalendar = (task: Task) => {
        const dueDate = new Date(task.dueDate);
        const [hours, minutes] = task.recurrence.time.split(':').map(Number);
        const startDate = setSeconds(setMinutes(setHours(dueDate, hours), minutes), 0);
        
        const event: ics.EventAttributes = {
            title: task.title,
            description: task.description,
            start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startDate.getHours(), startDate.getMinutes()],
            duration: { hours: 1 },
        };
        
        ics.createEvent(event, (error, value) => {
            if (error) {
                console.error(error);
                toast({
                    title: "Error Creating Calendar Event",
                    description: "There was a problem generating the .ics file.",
                    variant: "destructive",
                });
                return;
            }

            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${task.title.replace(/\s+/g, '_')}.ics`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    const recurrenceType = form.watch('recurrenceType');

    const filteredTasks = useMemo(() => {
        if (!currentUser) return [];

        if (currentUser.role === 'super-admin') {
            return tasks;
        }

        return tasks.filter(task => {
            const isAssigned = task.assignedTo === currentUser.id;
            const isShared = task.sharedWith?.includes(currentUser.id);
            const isCreator = mockUsers.find(u => u.name === task.createdBy)?.id === currentUser.id;
            const inSameUnit = task.unit === currentUser.unit;
            // Admins see all tasks in their unit
            if (currentUser.role === 'admin') return inSameUnit;
            // Regular users see tasks assigned to them or shared with them
            return isAssigned || isShared || isCreator;
        });

    }, [tasks, currentUser]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedTaskIds(filteredTasks.map(task => task.id));
        } else {
            setSelectedTaskIds([]);
        }
    };
    
    const handleSelectRow = (taskId: string, checked: boolean) => {
        if (checked) {
            setSelectedTaskIds(prev => [...prev, taskId]);
        } else {
            setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
        }
    };


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

    const getCommentAuthor = (authorId: string): User | undefined => {
        return mockUsers.find(u => u.id === authorId);
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
                     <div className="flex items-center gap-2">
                        {selectedTaskIds.length > 0 && (
                             <Button onClick={handleBulkExport} variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Export Selected to Calendar ({selectedTaskIds.length})
                            </Button>
                        )}
                        <Button onClick={() => handleOpenDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add New Task
                        </Button>
                    </div>
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
                                name="assignedTo"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assign to</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedUnit}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {usersInUnit.map((user) => (
                                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="sharedWith"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Share with</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start font-normal" disabled={!selectedUnit}>
                                                    {field.value && field.value.length > 0
                                                        ? `${field.value.length} user(s) selected`
                                                        : "Select users to share with"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                 <Command>
                                                    <CommandInput placeholder="Search users..." />
                                                    <CommandList>
                                                        <CommandEmpty>No users found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {usersInUnit.map((user) => (
                                                                <CommandItem
                                                                    key={user.id}
                                                                    onSelect={() => {
                                                                        const currentValue = field.value || [];
                                                                        if (currentValue.includes(user.id)) {
                                                                            field.onChange(currentValue.filter(id => id !== user.id));
                                                                        } else {
                                                                            field.onChange([...currentValue, user.id]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Checkbox
                                                                        className="mr-2"
                                                                        checked={field.value?.includes(user.id)}
                                                                    />
                                                                    <span>{user.name}</span>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
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
                            
                            <FormField
                                control={form.control}
                                name="dueDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>
                                            {recurrenceType === 'none' ? 'Date' : 'Start / Reference Date'}
                                        </FormLabel>
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
                                        <FormDescription>
                                            For recurring tasks, this is the first due date.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {recurrenceType === 'weekly' && (
                                <FormField
                                    control={form.control}
                                    name="dayOfWeek"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Day of Week</FormLabel>
                                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value)}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a day"/></SelectTrigger></FormControl>
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
                                            <FormControl><Input type="number" min="1" max="31" {...field} onChange={e => field.onChange(parseInt(e.target.value))} placeholder="e.g., 15"/></FormControl>
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

                            <div className="space-y-4">
                                <div>
                                    <FormLabel>Task Reminders</FormLabel>
                                    <FormDescription className="mb-2">Days before the due date to send a reminder. Enter 0 for on the same day.</FormDescription>
                                    {reminderDayFields.map((field, index) => (
                                    <FormField
                                        key={field.id}
                                        control={form.control}
                                        name={`reminders.${index}.days`}
                                        render={({ field }) => (
                                            <FormItem>
                                            <div className="flex items-center gap-2">
                                                <FormControl>
                                                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} placeholder="e.g., 3" />
                                                </FormControl>
                                                <span className="text-sm text-muted-foreground">days before</span>
                                                {reminderDayFields.length > 1 && (
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeReminderDay(index)}>
                                                    <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    ))}
                                    <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => appendReminderDay({ days: 1 })}
                                    >
                                    Add Reminder
                                    </Button>
                                </div>
                            </div>


                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                <Button type="submit">{editingTask ? 'Save Changes' : 'Create Task'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

             <Sheet open={isCommentsSheetOpen} onOpenChange={(isOpen) => !isOpen && handleCloseCommentsSheet()}>
                <SheetContent className="flex flex-col">
                    <SheetHeader>
                        <SheetTitle>Comments for {selectedTaskForComments?.title}</SheetTitle>
                        <SheetDescription>
                            Task ID: {selectedTaskForComments?.id}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto pr-6 -mr-6 space-y-4">
                        {(selectedTaskForComments?.comments || []).length > 0 ? (
                            (selectedTaskForComments?.comments || []).map(comment => {
                                const author = getCommentAuthor(comment.authorId);
                                return (
                                <div key={comment.id} className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={author?.avatar} alt={author?.name} />
                                        <AvatarFallback>{comment.author.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-sm">{comment.author}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-lg mt-1">{comment.text}</p>
                                    </div>
                                </div>
                            )})
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                <MessageSquare className="mx-auto h-12 w-12" />
                                <p className="mt-4">No comments yet.</p>
                                <p>Be the first to add a comment.</p>
                            </div>
                        )}
                    </div>
                    <SheetFooter>
                        <div className="w-full">
                        <Form {...commentForm}>
                            <form onSubmit={commentForm.handleSubmit(onCommentSubmit)} className="flex items-start gap-2">
                               <FormField
                                  control={commentForm.control}
                                  name="text"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Textarea placeholder="Type your comment here..." {...field} className="min-h-[60px]" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit">Post</Button>
                            </form>
                        </Form>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
            
            <Card>
                <CardHeader>
                    <CardTitle>Task List</CardTitle>
                    <CardDescription>A list of all tasks assigned to you or your units.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                         <Checkbox
                                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                            checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                                            aria-label="Select all rows"
                                        />
                                    </TableHead>
                                    <TableHead className="w-[60px] text-center border-r">Done</TableHead>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                    <TableHead>Next Due</TableHead>
                                    <TableHead>Recurrence</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Info</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => {
                                        const assignedUser = mockUsers.find(u => u.id === task.assignedTo);
                                        const sharedUsers = mockUsers.filter(u => task.sharedWith?.includes(u.id));

                                        return (
                                        <TableRow key={task.id} data-state={selectedTaskIds.includes(task.id) && "selected"} className={cn(task.status === 'completed' && 'text-muted-foreground line-through')}>
                                             <TableCell>
                                                <Checkbox
                                                    onCheckedChange={(checked) => handleSelectRow(task.id, !!checked)}
                                                    checked={selectedTaskIds.includes(task.id)}
                                                    aria-label={`Select row for task "${task.title}"`}
                                                />
                                            </TableCell>
                                            <TableCell className="px-2 text-center border-r">
                                                <Checkbox
                                                    checked={task.status === 'completed'}
                                                    onCheckedChange={() => handleToggleStatus(task)}
                                                    aria-label={`Mark task "${task.title}" as ${task.status === 'pending' ? 'completed' : 'pending'}`}
                                                    className="rounded-full h-5 w-5 mx-auto"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div>{task.title}</div>
                                                <div className="text-xs text-muted-foreground">{task.unit} Unit</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {assignedUser && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                     <Avatar className="h-7 w-7">
                                                                        <AvatarImage src={assignedUser.avatar} alt={assignedUser.name}/>
                                                                        <AvatarFallback>{assignedUser.name.charAt(0)}</AvatarFallback>
                                                                    </Avatar>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Assigned to {assignedUser.name}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {sharedUsers.length > 0 && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <div className="relative flex items-center">
                                                                        <UsersIcon className="h-5 w-5 text-muted-foreground" />
                                                                        <span className="absolute -top-1 -right-2 text-xs font-bold">{sharedUsers.length}</span>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Shared with: {sharedUsers.map(u => u.name).join(', ')}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{format(new Date(task.dueDate), "PP")}</TableCell>
                                            <TableCell>{formatRecurrence(task)}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={'outline'}
                                                    className={cn(
                                                        task.status === 'pending'
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-700'
                                                            : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-700'
                                                    )}
                                                >
                                                    {task.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <TooltipProvider>
                                                    {(task.comments?.length || 0) > 0 && (
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Has comments</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleOpenDialog(task)}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleOpenCommentsSheet(task)}>Comments</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleAddToCalendar(task)}>
                                                            <CalendarPlus className="mr-2 h-4 w-4" />
                                                            Add to Calendar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive">Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )})
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
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

    
    

    