

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, MoreHorizontal, ClipboardCheck, Calendar as CalendarIcon, X, Users as UsersIcon, MessageSquare, CalendarPlus, Download, CheckCircle, ArrowUpDown, Tag, Palette } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, formatDistanceToNow, setHours, setMinutes, setSeconds, parseISO } from 'date-fns';
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
  DialogTrigger,
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
import { tasks as mockTasks, units as mockUnits, users as mockUsers, taskBoards as mockTaskBoards } from '@/lib/mock-data';
import type { Task, User, Comment, TaskBoard } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const AUTH_USER_KEY = 'current_user';
type SortableTaskField = 'title' | 'dueDate' | 'status';
type SortDirection = 'asc' | 'desc';

const reminderDaysSchema = z.object({
  days: z.number().min(0, "Cannot be negative").max(365, "Cannot be more than 365 days"),
});

const taskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    unit: z.string().min(1, "Unit is required"),
    assignedTo: z.string().optional(),
    sharedWith: z.array(z.string()).optional(),
    tags: z.string().optional(),
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

const boardSchema = z.object({
  name: z.string().min(1, "Board name is required"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
});


const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultColors = ["#3b82f6", "#ef4444", "#10b981", "#eab308", "#8b5cf6", "#f97316"];


export default function TasksPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>(mockTasks);
    const [boards, setBoards] = useState<TaskBoard[]>(mockTaskBoards);
    const [activeBoardId, setActiveBoardId] = useState<string>(mockTaskBoards[0]?.id);

    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [isBoardDialogOpen, setIsBoardDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const { toast } = useToast();
    const [usersInUnit, setUsersInUnit] = useState<User[]>([]);

    const [isCommentsSheetOpen, setIsCommentsSheetOpen] = useState(false);
    const [selectedTaskForComments, setSelectedTaskForComments] = useState<Task | null>(null);

    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    
    // Filtering and Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', unit: 'all', tags: [] as string[] });
    const [sorting, setSorting] = useState<{ field: SortableTaskField, direction: SortDirection }>({ field: 'dueDate', direction: 'asc' });


    const form = useForm<z.infer<typeof taskSchema>>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            title: "",
            description: "",
            unit: "",
            assignedTo: "",
            sharedWith: [],
            tags: "",
            recurrenceType: "none",
            time: "09:00",
            reminders: [{ days: 1 }],
        },
    });

    const commentForm = useForm<z.infer<typeof commentSchema>>({
        resolver: zodResolver(commentSchema),
        defaultValues: { text: "" },
    });
    
    const boardForm = useForm<z.infer<typeof boardSchema>>({
      resolver: zodResolver(boardSchema),
      defaultValues: {
        name: "",
        color: defaultColors[0],
      }
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
                tags: editingTask.tags?.join(', '),
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
                tags: "",
                dueDate: new Date(),
                recurrenceType: 'none',
                time: "09:00",
                reminders: [{ days: 1 }],
            });
        }
    }, [editingTask, form, currentUser]);

    const handleOpenTaskDialog = (task: Task | null) => {
        setEditingTask(task);
        setIsTaskDialogOpen(true);
    };

    const handleCloseTaskDialog = () => {
        setEditingTask(null);
        setIsTaskDialogOpen(false);
        form.reset();
    };
    
    const onBoardSubmit = (values: z.infer<typeof boardSchema>) => {
      const newBoard: TaskBoard = {
        id: `TB-${Date.now()}`,
        name: values.name,
        color: values.color,
      };
      setBoards(prev => [...prev, newBoard]);
      setActiveBoardId(newBoard.id);
      toast({
        title: "Board Created",
        description: `Board "${newBoard.name}" has been created.`
      });
      setIsBoardDialogOpen(false);
      boardForm.reset({ name: "", color: defaultColors[0] });
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

    const onTaskSubmit = (values: z.infer<typeof taskSchema>) => {
        if (!currentUser || !activeBoardId) return;

        const taskData = {
            title: values.title,
            description: values.description,
            unit: values.unit,
            assignedTo: values.assignedTo,
            sharedWith: values.sharedWith,
            tags: values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
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
                boardId: activeBoardId,
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
        handleCloseTaskDialog();
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
    
    const handleSort = (field: SortableTaskField) => {
        const newDirection = sorting.field === field && sorting.direction === 'asc' ? 'desc' : 'asc';
        setSorting({ field, direction: newDirection });
    };

    const recurrenceType = form.watch('recurrenceType');

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        tasks.forEach(task => {
            task.tags?.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        if (!currentUser) return [];

        // 1. Filter by active board
        let baseTasks = tasks.filter(task => task.boardId === activeBoardId);

        // 2. Apply global role-based filter
        if (currentUser.role !== 'super-admin') {
           baseTasks = baseTasks.filter(task => {
                const isAssigned = task.assignedTo === currentUser.id;
                const isShared = task.sharedWith?.includes(currentUser.id);
                const isCreator = mockUsers.find(u => u.name === task.createdBy)?.id === currentUser.id;
                const inSameUnit = task.unit === currentUser.unit;
                // Admins see all tasks in their unit
                if (currentUser.role === 'admin') return inSameUnit;
                // Regular users see tasks assigned to them or shared with them
                return isAssigned || isShared || isCreator;
            });
        }
        
        // 3. Apply search and filters
        baseTasks = baseTasks.filter(task => {
            const searchMatch = !searchTerm || task.title.toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = filters.status === 'all' || task.status === filters.status;
            const unitMatch = filters.unit === 'all' || task.unit === filters.unit;
            const tagsMatch = filters.tags.length === 0 || filters.tags.every(tag => task.tags?.includes(tag));
            return searchMatch && statusMatch && unitMatch && tagsMatch;
        });
        
         // 4. Apply sorting
        baseTasks.sort((a, b) => {
            const field = sorting.field;
            const direction = sorting.direction === 'asc' ? 1 : -1;

            const valA = a[field];
            const valB = b[field];

            if (field === 'dueDate') {
                return (parseISO(valA).getTime() - parseISO(valB).getTime()) * direction;
            }

            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });


        return baseTasks;

    }, [tasks, currentUser, searchTerm, filters, sorting, activeBoardId]);

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
                </div>
            </PageHeader>
            
            <Tabs value={activeBoardId} onValueChange={setActiveBoardId} className="w-full">
                <div className="flex items-center gap-2 mb-4">
                    <TabsList>
                        {boards.map(board => (
                            <TabsTrigger key={board.id} value={board.id} style={{'--board-color': board.color} as React.CSSProperties} className="data-[state=active]:bg-[--board-color] data-[state=active]:text-white">
                                {board.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <Dialog open={isBoardDialogOpen} onOpenChange={setIsBoardDialogOpen}>
                        <DialogTrigger asChild>
                             <Button variant="ghost" size="icon"><PlusCircle className="h-5 w-5" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Board</DialogTitle>
                                <DialogDescription>Create a new list to organize your tasks.</DialogDescription>
                            </DialogHeader>
                            <Form {...boardForm}>
                                <form onSubmit={boardForm.handleSubmit(onBoardSubmit)} className="space-y-4">
                                     <FormField
                                        control={boardForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Board Name</FormLabel>
                                                <FormControl><Input placeholder="e.g., Project Phoenix" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={boardForm.control}
                                        name="color"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Board Color</FormLabel>
                                                <div className="flex items-center gap-2">
                                                    {defaultColors.map(color => (
                                                        <button key={color} type="button" onClick={() => field.onChange(color)} className={cn("h-8 w-8 rounded-full border-2", field.value === color ? 'border-primary' : 'border-transparent')}>
                                                            <div className="h-full w-full rounded-full" style={{backgroundColor: color}} />
                                                        </button>
                                                    ))}
                                                    <Input type="color" {...field} className="w-16 h-10 p-1" />
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter>
                                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                                        <Button type="submit">Create Board</Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>

                <TabsContent value={activeBoardId || ''}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Task List</CardTitle>
                                 <div className="flex items-center gap-2">
                                    {selectedTaskIds.length > 0 && (
                                        <Button onClick={handleBulkExport} variant="outline">
                                            <Download className="mr-2 h-4 w-4" />
                                            Export Selected ({selectedTaskIds.length})
                                        </Button>
                                    )}
                                    <Button onClick={() => handleOpenTaskDialog(null)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add New Task
                                    </Button>
                                </div>
                            </div>
                            <CardDescription>A list of all tasks in this board.</CardDescription>
                            <div className="flex flex-wrap items-center gap-2 pt-4">
                                <Input
                                    placeholder="Search tasks by title..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                                {currentUser.role === 'super-admin' && (
                                    <Select value={filters.unit} onValueChange={(value) => setFilters(prev => ({ ...prev, unit: value }))}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Filter by unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Units</SelectItem>
                                            {mockUnits.map(unit => (
                                                <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full sm:w-auto">
                                            <Tag className="mr-2 h-4 w-4" />
                                            Filter by Tags
                                            {filters.tags.length > 0 && <span className="ml-2 rounded-full bg-primary px-2 text-xs text-primary-foreground">{filters.tags.length}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-0">
                                        <Command>
                                            <CommandInput placeholder="Filter tags..." />
                                            <CommandList>
                                                <CommandEmpty>No tags found.</CommandEmpty>
                                                <CommandGroup>
                                                    {allTags.map((tag) => (
                                                        <CommandItem
                                                            key={tag}
                                                            onSelect={() => {
                                                                const newTags = filters.tags.includes(tag)
                                                                    ? filters.tags.filter(t => t !== tag)
                                                                    : [...filters.tags, tag];
                                                                setFilters(prev => ({ ...prev, tags: newTags }));
                                                            }}
                                                        >
                                                            <Checkbox
                                                                className="mr-2"
                                                                checked={filters.tags.includes(tag)}
                                                            />
                                                            <span>{tag}</span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                            </div>
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
                                            <TableHead>
                                                <Button variant="ghost" onClick={() => handleSort('title')}>
                                                    Task
                                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>Assigned To</TableHead>
                                            <TableHead>
                                                <Button variant="ghost" onClick={() => handleSort('dueDate')}>
                                                    Next Due
                                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>Recurrence</TableHead>
                                            <TableHead>
                                                <Button variant="ghost" onClick={() => handleSort('status')}>
                                                    Status
                                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </TableHead>
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
                                                        {task.tags && task.tags.length > 0 && (
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                {task.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                                            </div>
                                                        )}
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
                                                                <DropdownMenuItem onClick={() => handleOpenTaskDialog(task)}>Edit</DropdownMenuItem>
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
                                                        <p className="text-muted-foreground text-sm">Try adjusting your filters or create a new task in this board.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>


            <Dialog open={isTaskDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseTaskDialog()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                        <DialogDescription>
                            Fill out the form below to create or update a task.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onTaskSubmit)} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
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
                                name="tags"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl><Input placeholder="e.g., reporting, critical, finance" {...field} /></FormControl>
                                        <FormDescription>
                                            Enter tags separated by commas.
                                        </FormDescription>
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
        </div>
    );
}
