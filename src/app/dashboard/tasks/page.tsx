

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PlusCircle, MoreHorizontal, ClipboardCheck, Calendar as CalendarIcon, X, Users as UsersIcon, MessageSquare, CalendarPlus, Download, CheckCircle, ArrowUpDown, Tag, Palette, Settings, Trash2, Edit, Share2, ListChecks, Paperclip, Upload, Move, List, LayoutGrid, Archive, ArchiveRestore, Calendar as CalendarViewIcon, ChevronLeft, ChevronRight, Copy, Mail, SlidersHorizontal, ListVideo, PencilRuler, ChevronsUpDown, Check } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, formatDistanceToNow, setHours, setMinutes, setSeconds, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday, nextDay, Day } from 'date-fns';
import * as ics from 'ics';
import { useRouter } from "next/navigation";
import Link from "next/link";


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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';
import { tasks as mockTasks, units as mockUnits, users as mockUsers, taskBoards as mockTaskBoards, scheduledReports as mockScheduledReports } from '@/lib/mock-data';
import type { Task, User, Comment, TaskBoard, BoardShare, BoardPermissionRole, ChecklistItem, BoardColumn, AppearanceSettings, ScheduledReport, ScheduledReportType } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';


const AUTH_USER_KEY = 'current_user';
const APPEARANCE_SETTINGS_KEY = 'appearance-settings';
type SortableTaskField = 'title' | 'dueDate' | 'priority' | 'columnId';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'board' | 'archived' | 'calendar';

const reminderDaysSchema = z.object({
  days: z.number().min(0, "Cannot be negative").max(365, "Cannot be more than 365 days"),
});

const checklistItemSchema = z.object({
    id: z.string(),
    text: z.string().min(1, "Checklist item cannot be empty"),
    completed: z.boolean(),
});

const taskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    unit: z.string().min(1, "Unit is required"),
    columnId: z.string().min(1, "A list must be selected"),
    assignees: z.array(z.string()).optional(),
    tags: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    dueDate: z.date({ required_error: "Date is required" }),
    recurrenceType: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
    dayOfWeek: z.number().optional(),
    dayOfMonth: z.number().optional(),
    reminders: z.array(reminderDaysSchema).min(1, "At least one reminder is required."),
    checklist: z.array(checklistItemSchema).optional(),
    attachments: z.any().optional(),
    isCompleted: z.boolean(),
});

const commentSchema = z.object({
    text: z.string().min(1, "Comment cannot be empty.").max(500, "Comment is too long."),
});

const boardSchema = z.object({
  name: z.string().min(1, "Board name is required"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
});

const columnSchema = z.object({
  title: z.string().min(1, "Column title cannot be empty"),
});

const copyColumnSchema = z.object({
  title: z.string().min(1, "New list name cannot be empty"),
});

const weeklyReportSchema = z.object({
    name: z.string().min(1, "Report name is required."),
    dayOfWeek: z.string().min(1, "Day of week is required"),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
    recipients: z.string().min(1, "At least one recipient is required"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().optional(),
});


const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultColors = ["#3b82f6", "#ef4444", "#10b981", "#eab308", "#8b5cf6", "#f97316"];


export default function TasksPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>(mockTasks);
    const [boards, setBoards] = useState<TaskBoard[]>(mockTaskBoards);
    const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(mockScheduledReports);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings | null>(null);

    const [isBoardSwitcherOpen, setIsBoardSwitcherOpen] = useState(false);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [isBoardDialogOpen, setIsBoardDialogOpen] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isDeleteColumnAlertOpen, setIsDeleteColumnAlertOpen] = useState(false);
    const [columnToDelete, setColumnToDelete] = useState<BoardColumn | null>(null);
    const [isMoveTaskDialogOpen, setIsMoveTaskDialogOpen] = useState(false);
    const [isCopyColumnDialogOpen, setIsCopyColumnDialogOpen] = useState(false);
    const [columnToCopy, setColumnToCopy] = useState<BoardColumn | null>(null);
    const [isWeeklyReportDialogOpen, setIsWeeklyReportDialogOpen] = useState(false);
    const [isReportManagerOpen, setIsReportManagerOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<ScheduledReport | null>(null);
    
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
    const [editingColumnTitle, setEditingColumnTitle] = useState("");
    const [showAddColumnForm, setShowAddColumnForm] = useState(false);


    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editingBoard, setEditingBoard] = useState<TaskBoard | null>(null);
    const [sharingBoard, setSharingBoard] = useState<TaskBoard | null>(null);
    const [movingTask, setMovingTask] = useState<Task | null>(null);
    const [moveTargetBoardId, setMoveTargetBoardId] = useState<string>("");
    
    const [reportConfigType, setReportConfigType] = useState<ScheduledReportType | null>(null);
    const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);

    const { toast } = useToast();
    const [usersOnBoard, setUsersOnBoard] = useState<User[]>([]);
    
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

    const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);

    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    
    // Filtering and Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', unit: 'all', tags: [] as string[], priority: 'all' });
    const [sorting, setSorting] = useState<{ field: SortableTaskField, direction: SortDirection }>({ field: 'dueDate', direction: 'asc' });

    const newColumnFormRef = useRef<HTMLFormElement>(null);
    
    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());


    const form = useForm<z.infer<typeof taskSchema>>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            title: "",
            description: "",
            unit: "",
            columnId: "",
            assignees: [],
            tags: "",
            priority: 'medium',
            recurrenceType: "none",
            time: "09:00",
            reminders: [{ days: 1 }],
            checklist: [],
            attachments: [],
            isCompleted: false,
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
    
    const columnForm = useForm<z.infer<typeof columnSchema>>({
        resolver: zodResolver(columnSchema),
        defaultValues: { title: "" }
    });

    const copyColumnForm = useForm<z.infer<typeof copyColumnSchema>>({
      resolver: zodResolver(copyColumnSchema),
    });
    
    const weeklyReportForm = useForm<z.infer<typeof weeklyReportSchema>>({
        resolver: zodResolver(weeklyReportSchema),
        defaultValues: {
            name: "",
            dayOfWeek: "1", // Monday
            time: "09:00",
            recipients: "",
            subject: "",
            body: "",
        },
    });
    const reportBody = weeklyReportForm.watch('body');


    useEffect(() => {
        const storedUser = localStorage.getItem(AUTH_USER_KEY);
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setCurrentUser(user);
        }
        const savedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
        if (savedSettings) {
            setAppearanceSettings(JSON.parse(savedSettings));
        }
    }, []);
    
    const visibleBoards = useMemo(() => {
        if (!currentUser) return [];
        return boards.filter(board => 
            board.ownerId === currentUser.id || 
            board.sharedWith?.some(s => s.userId === currentUser.id)
        );
    }, [boards, currentUser]);
    
    useEffect(() => {
        if (visibleBoards.length > 0 && !activeBoardId) {
            if (currentUser) {
                const ownedBoard = visibleBoards.find(b => b.ownerId === currentUser.id);
                if (ownedBoard) {
                    setActiveBoardId(ownedBoard.id);
                } else {
                    setActiveBoardId(visibleBoards[0]?.id);
                }
            }
        } else if (visibleBoards.length > 0 && activeBoardId && !visibleBoards.find(b => b.id === activeBoardId)) {
           setActiveBoardId(visibleBoards[0]?.id);
        } else if (visibleBoards.length === 0) {
            setActiveBoardId(null);
        }
    }, [currentUser, visibleBoards, activeBoardId]);

    const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);

    const userPermissions = useMemo((): BoardPermissionRole | 'owner' | 'none' => {
        if (!currentUser || !activeBoard) return 'none';
        if (activeBoard.ownerId === currentUser.id) return 'owner';
        const shareInfo = activeBoard.sharedWith?.find(s => s.userId === currentUser.id);
        return shareInfo ? shareInfo.role : 'none';
    }, [currentUser, activeBoard]);
    

    useEffect(() => {
        if (activeBoard) {
            const boardOwner = mockUsers.find(u => u.id === activeBoard.ownerId);
            const sharedUsers = activeBoard.sharedWith?.map(s => mockUsers.find(u => u.id === s.userId)).filter(Boolean) as User[] || [];
            const allUsersOnBoard = boardOwner ? [boardOwner, ...sharedUsers] : sharedUsers;
            const uniqueUsers = Array.from(new Set(allUsersOnBoard.map(u => u.id))).map(id => allUsersOnBoard.find(u => u.id === id)!);
            setUsersOnBoard(uniqueUsers);
        } else {
            setUsersOnBoard([]);
        }
    }, [activeBoard]);


     const { fields: reminderDayFields, append: appendReminderDay, remove: removeReminderDay } = useFieldArray({
        control: form.control,
        name: "reminders"
    });
    
     const { fields: checklistFields, append: appendChecklistItem, remove: removeChecklistItem } = useFieldArray({
        control: form.control,
        name: "checklist"
    });

    useEffect(() => {
        if (!currentUser || !activeBoard) return;
        const defaultUnit = activeBoard.ownerId === currentUser.id ? mockUsers.find(u => u.id === currentUser.id)?.unit || "" : "";
        const activeColumns = activeBoard.columns.filter(c => !c.isArchived);

        if (editingTask) {
            form.reset({
                title: editingTask.title,
                description: editingTask.description,
                unit: editingTask.unit,
                columnId: editingTask.columnId,
                assignees: editingTask.assignees,
                tags: editingTask.tags?.join(', '),
                priority: editingTask.priority || 'medium',
                dueDate: new Date(editingTask.dueDate),
                recurrenceType: editingTask.recurrence.type,
                time: editingTask.recurrence.time,
                dayOfWeek: editingTask.recurrence.dayOfWeek,
                dayOfMonth: editingTask.recurrence.dayOfMonth,
                reminders: editingTask.reminders.map(days => ({ days })),
                checklist: editingTask.checklist || [],
                attachments: [],
                isCompleted: editingTask.isCompleted,
            });
             setAttachedFiles([]);
        } else {
            form.reset({
                title: "",
                description: "",
                unit: defaultUnit,
                columnId: form.getValues('columnId') || activeColumns?.[0]?.id || "",
                assignees: [],
                tags: "",
                priority: 'medium',
                dueDate: new Date(),
                recurrenceType: 'none',
                time: "09:00",
                reminders: [{ days: 1 }],
                checklist: [],
                attachments: [],
                isCompleted: false,
            });
        }
    }, [editingTask, form, currentUser, activeBoard]);

    useEffect(() => {
        if (editingBoard) {
            boardForm.reset({
                name: editingBoard.name,
                color: editingBoard.color,
            });
        } else {
            boardForm.reset({
                name: "",
                color: defaultColors[0],
            });
        }
    }, [editingBoard, boardForm]);
    
    useEffect(() => {
        if (columnToCopy) {
            copyColumnForm.reset({
                title: `${columnToCopy.title} (Copy)`,
            });
        }
    }, [columnToCopy, copyColumnForm]);

     useEffect(() => {
        if (!isWeeklyReportDialogOpen) {
            setEditingReport(null);
            setReportConfigType(null);
            weeklyReportForm.reset();
            return;
        };

        if (activeBoard && appearanceSettings && currentUser) {
            const reportName = editingReport ? editingReport.name : `Weekly Report for ${activeBoard.name}`;
            const subject = editingReport ? editingReport.subject : `${appearanceSettings.siteName}: Weekly Summary for ${activeBoard.name}`;
            const recipients = editingReport ? editingReport.recipients.join(', ') : currentUser.email;

            weeklyReportForm.reset({
                name: reportName,
                dayOfWeek: editingReport ? String(editingReport.schedule.dayOfWeek) : "1",
                time: editingReport ? editingReport.schedule.time : "09:00",
                recipients: recipients,
                subject: subject,
                body: editingReport ? editingReport.body : `Here is the weekly status summary for the "${activeBoard.name}" board.`,
            });
        }
    }, [isWeeklyReportDialogOpen, editingReport, activeBoard, appearanceSettings, weeklyReportForm, currentUser]);


    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (newColumnFormRef.current && !newColumnFormRef.current.contains(event.target as Node)) {
                setShowAddColumnForm(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleOpenTaskDialog = (task: Task | null, columnId?: string) => {
        setEditingTask(task);
        if (!task && columnId && activeBoard) {
             const defaultUnit = currentUser?.role === 'admin' ? currentUser.unit : "";
             const activeColumns = activeBoard.columns.filter(c => !c.isArchived);
            form.reset({
                title: "",
                description: "",
                unit: defaultUnit,
                columnId: columnId || activeColumns?.[0]?.id || "",
                assignees: [],
                tags: "",
                priority: 'medium',
                dueDate: new Date(),
                recurrenceType: 'none',
                time: "09:00",
                reminders: [{ days: 1 }],
                checklist: [],
                attachments: [],
                isCompleted: false,
            });
        }
        setIsTaskDialogOpen(true);
    };

    const handleCloseTaskDialog = () => {
        setEditingTask(null);
        setIsTaskDialogOpen(false);
        form.reset();
        setAttachedFiles([]);
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        setAttachedFiles(Array.from(event.target.files));
        form.setValue('attachments', Array.from(event.target.files));
      }
    };


    const handleOpenBoardDialog = (board: TaskBoard | null) => {
        setEditingBoard(board);
        setIsBoardDialogOpen(true);
    }

    const handleCloseBoardDialog = () => {
        setEditingBoard(null);
        setIsBoardDialogOpen(false);
        boardForm.reset();
    }
    
    const handleOpenShareDialog = (board: TaskBoard) => {
        setSharingBoard(board);
        setIsShareDialogOpen(true);
    }

    const handleCloseShareDialog = () => {
        setSharingBoard(null);
        setIsShareDialogOpen(false);
    }
    
    const handleOpenMoveDialog = (task: Task) => {
        setMovingTask(task);
        setMoveTargetBoardId(""); // Reset selection
        setIsMoveTaskDialogOpen(true);
    };

    const handleCloseMoveDialog = () => {
        setMovingTask(null);
        setIsMoveTaskDialogOpen(false);
    };

    const handleOpenCopyColumnDialog = (column: BoardColumn) => {
        setColumnToCopy(column);
        setIsCopyColumnDialogOpen(true);
    };

    const handleCloseCopyColumnDialog = () => {
        setColumnToCopy(null);
        setIsCopyColumnDialogOpen(false);
        copyColumnForm.reset();
    };
    
    const handleOpenReportDialog = (type: ScheduledReportType, report?: ScheduledReport) => {
        setReportConfigType(type);
        setEditingReport(report || null);
        setIsWeeklyReportDialogOpen(true);
    };
    
    const handleCloseReportDialog = () => {
        setIsWeeklyReportDialogOpen(false);
    }

    const handleDeleteReport = () => {
        if (!reportToDelete) return;
        setScheduledReports(prev => prev.filter(r => r.id !== reportToDelete.id));
        toast({ title: "Report Deleted", description: `The report "${reportToDelete.name}" has been deleted.` });
        setReportToDelete(null);
    }

    const onBoardSubmit = (values: z.infer<typeof boardSchema>) => {
      if(!currentUser) return;

      if (editingBoard) {
        const updatedBoard = { ...editingBoard, ...values };
        setBoards(boards.map(b => b.id === editingBoard.id ? updatedBoard : b));
        toast({
            title: "Board Updated",
            description: `Board "${updatedBoard.name}" has been updated.`
        });
      } else {
         const newBoardId = `TB-${Date.now()}`;
         const newBoard: TaskBoard = {
            id: newBoardId,
            name: values.name,
            color: values.color,
            ownerId: currentUser.id,
            sharedWith: [],
            columns: [
                { id: `COL-${Date.now()}-1`, title: 'To Do', boardId: newBoardId, isArchived: false },
                { id: `COL-${Date.now()}-2`, title: 'In Progress', boardId: newBoardId, isArchived: false },
                { id: `COL-${Date.now()}-3`, title: 'Done', boardId: newBoardId, isArchived: false },
            ],
        };
        setBoards(prev => [...prev, newBoard]);
        setActiveBoardId(newBoard.id);
        toast({
            title: "Board Created",
            description: `Board "${newBoard.name}" has been created.`
        });
      }
      handleCloseBoardDialog();
    };

    const handleDeleteBoard = (boardId: string) => {
        const boardToDelete = boards.find(b => b.id === boardId);
        if (!boardToDelete || !currentUser || boardToDelete.ownerId !== currentUser.id) return;

        const remainingBoards = boards.filter(b => b.id !== boardId);
        const remainingTasks = tasks.filter(t => t.boardId !== boardId);

        setBoards(remainingBoards);
        setTasks(remainingTasks);
        
        if (activeBoardId === boardId) {
            setActiveBoardId(remainingBoards[0]?.id || null);
        }

        toast({
            title: "Board Deleted",
            description: `Board "${boardToDelete.name}" and all its tasks have been deleted.`,
            variant: "destructive",
        });
        setIsBoardSwitcherOpen(false); // Close switcher after deletion
    };
    
    const handleAddColumn = (values: z.infer<typeof columnSchema>) => {
        if (!activeBoard) return;
        
        const newColumn: BoardColumn = {
            id: `COL-${Date.now()}`,
            title: values.title,
            boardId: activeBoard.id,
            isArchived: false,
        };
        
        const updatedBoard = { ...activeBoard, columns: [...activeBoard.columns, newColumn] };
        setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        
        toast({ title: "List Added", description: `List "${values.title}" has been added.`});
        columnForm.reset();
        setShowAddColumnForm(false);
    };

    const handleEditColumn = (columnId: string, newTitle: string) => {
        if (!activeBoard || !newTitle) {
            setEditingColumnId(null);
            return;
        };

        const updatedColumns = activeBoard.columns.map(c => c.id === columnId ? { ...c, title: newTitle } : c);
        const updatedBoard = { ...activeBoard, columns: updatedColumns };
        
        setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        setEditingColumnId(null);
        toast({ title: "List Renamed", description: `List has been renamed to "${newTitle}".`});
    };
    
    const handleArchiveColumn = (columnId: string) => {
        if (!activeBoard) return;
        const updatedBoard = {
            ...activeBoard,
            columns: activeBoard.columns.map(c => c.id === columnId ? { ...c, isArchived: true } : c)
        };
        setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));

        const updatedTasks = tasks.map(t => t.columnId === columnId ? { ...t, isArchived: true } : t);
        setTasks(updatedTasks);
        
        toast({ title: "List Archived", description: `The list and its tasks have been archived.` });
    };

    const handleRestoreColumn = (columnId: string) => {
        if (!activeBoard) return;
         const updatedBoard = {
            ...activeBoard,
            columns: activeBoard.columns.map(c => c.id === columnId ? { ...c, isArchived: false } : c)
        };
        setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));

        const updatedTasks = tasks.map(t => t.columnId === columnId ? { ...t, isArchived: false } : t);
        setTasks(updatedTasks);
        
        toast({ title: "List Restored", description: `The list has been restored.` });
    }
    
    const handleDeleteColumnPermanently = () => {
        if (!activeBoard || !columnToDelete) return;
        
        const updatedColumns = activeBoard.columns.filter(c => c.id !== columnToDelete.id);
        const updatedBoard = { ...activeBoard, columns: updatedColumns };
        
        const remainingTasks = tasks.filter(t => t.columnId !== columnToDelete.id);
        
        setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        setTasks(remainingTasks);
        
        toast({ title: "List Deleted", description: `List "${columnToDelete.title}" and all of its tasks have been permanently deleted.`, variant: "destructive" });
        setIsDeleteColumnAlertOpen(false);
        setColumnToDelete(null);
    }

    const onCopyColumnSubmit = (values: z.infer<typeof copyColumnSchema>) => {
      if (!activeBoard || !columnToCopy) return;

      const newColumnId = `COL-${Date.now()}`;
      const newColumn: BoardColumn = {
        id: newColumnId,
        title: values.title,
        boardId: activeBoard.id,
        isArchived: false,
      };

      const tasksToCopy = tasks.filter(t => t.columnId === columnToCopy.id);
      const newTasks: Task[] = tasksToCopy.map(task => ({
        ...task,
        id: `T-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        columnId: newColumnId,
        isCompleted: false, // Reset completion status on copy
      }));

      const updatedBoard = {
        ...activeBoard,
        columns: [...activeBoard.columns, newColumn],
      };

      setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
      setTasks(prevTasks => [...prevTasks, ...newTasks]);

      toast({
        title: "List Copied",
        description: `List "${columnToCopy.title}" was copied to "${values.title}".`
      });

      handleCloseCopyColumnDialog();
    };


     const handleShareUpdate = (userId: string, role: BoardPermissionRole) => {
        if (!sharingBoard) return;
        
        let newSharedWith = [...(sharingBoard.sharedWith || [])];
        const existingShareIndex = newSharedWith.findIndex(s => s.userId === userId);

        if (existingShareIndex > -1) {
            newSharedWith[existingShareIndex].role = role;
        } else {
            newSharedWith.push({ userId, role });
        }
        
        const updatedBoard = { ...sharingBoard, sharedWith: newSharedWith };
        setSharingBoard(updatedBoard); // update state for dialog
    };
    
    const handleRemoveShare = (userId: string) => {
        if (!sharingBoard) return;
        const newSharedWith = (sharingBoard.sharedWith || []).filter(s => s.userId !== userId);
        const updatedBoard = { ...sharingBoard, sharedWith: newSharedWith };
        setSharingBoard(updatedBoard);
    };

    const saveSharingChanges = () => {
        if (!sharingBoard) return;
        setBoards(boards.map(b => b.id === sharingBoard.id ? sharingBoard : b));
        toast({ title: "Sharing Updated", description: "Board sharing settings have been saved." });
        handleCloseShareDialog();
    };


    const handleOpenDetailsSheet = (task: Task) => {
        setSelectedTaskForDetails(task);
        setIsDetailsSheetOpen(true);
    };

    const handleCloseDetailsSheet = () => {
        setSelectedTaskForDetails(null);
        setIsDetailsSheetOpen(false);
        commentForm.reset();
    };

     const onCommentSubmit = (values: z.infer<typeof commentSchema>) => {
        if (!currentUser || !selectedTaskForDetails) return;

        const newComment: Comment = {
            id: `CMT-T-${Date.now()}`,
            text: values.text,
            author: currentUser.name,
            authorId: currentUser.id,
            createdAt: new Date().toISOString(),
        };

        const updatedTask = {
            ...selectedTaskForDetails,
            comments: [...(selectedTaskForDetails.comments || []), newComment],
        };

        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        setSelectedTaskForDetails(updatedTask);
        commentForm.reset();
        toast({
            title: "Comment Added",
            description: "Your comment has been successfully posted.",
        });
    };
    
    const handleChecklistItemToggle = (taskId: string, itemId: string, completed: boolean) => {
        const updatedTasks = tasks.map(task => {
            if (task.id === taskId) {
                const updatedChecklist = task.checklist?.map(item =>
                    item.id === itemId ? { ...item, completed } : item
                );
                return { ...task, checklist: updatedChecklist };
            }
            return task;
        });
        setTasks(updatedTasks);
        
        if (selectedTaskForDetails?.id === taskId) {
             const updatedChecklist = selectedTaskForDetails.checklist?.map(item =>
                item.id === itemId ? { ...item, completed } : item
            );
            setSelectedTaskForDetails(prev => prev ? {...prev, checklist: updatedChecklist} : null);
        }
    };


    const handleToggleStatus = (task: Task) => {
        const updatedTask = { ...task, isCompleted: !task.isCompleted };
        setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
        toast({
            title: `Task ${updatedTask.isCompleted ? 'Completed' : 'Marked as Incomplete'}`,
            description: `Task "${task.title}" status has been updated.`,
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
    
     const handleConfirmMoveTask = () => {
        if (!movingTask || !moveTargetBoardId) return;

        const targetBoard = boards.find(b => b.id === moveTargetBoardId);
        if (!targetBoard || !targetBoard.columns[0]) {
            toast({ title: "Error", description: "The destination board has no columns.", variant: "destructive" });
            return;
        }

        const updatedTask = { ...movingTask, boardId: moveTargetBoardId, columnId: targetBoard.columns[0].id };
        setTasks(tasks.map(t => t.id === movingTask.id ? updatedTask : t));
        
        toast({
            title: "Task Moved",
            description: `Task "${movingTask.title}" has been moved to the "${targetBoard?.name}" board.`,
        });
        
        handleCloseMoveDialog();
    };

    const onTaskSubmit = (values: z.infer<typeof taskSchema>) => {
        if (!currentUser || !activeBoardId) return;

        const taskData = {
            title: values.title,
            description: values.description,
            unit: values.unit,
            columnId: values.columnId,
            assignees: values.assignees,
            tags: values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
            priority: values.priority,
            dueDate: values.dueDate.toISOString(),
            recurrence: {
                type: values.recurrenceType,
                time: values.time,
                dayOfWeek: values.recurrenceType === 'weekly' ? values.dayOfWeek : undefined,
                dayOfMonth: values.recurrenceType === 'monthly' ? values.dayOfMonth : undefined,
            },
            reminders: values.reminders.map(r => r.days),
            checklist: values.checklist || [],
            isArchived: false,
            isCompleted: values.isCompleted,
        };
        
        if (editingTask) {
            const updatedTask: Task = {
                ...editingTask,
                ...taskData,
                attachments: attachedFiles.length > 0 
                    ? attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })) 
                    : editingTask.attachments,
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
                attachments: attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })),
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
    
    const onWeeklyReportSubmit = (values: z.infer<typeof weeklyReportSchema>) => {
        if (!currentUser || !activeBoardId || !reportConfigType) return;
        
        const reportData = {
            boardId: activeBoardId,
            name: values.name,
            type: reportConfigType,
            schedule: {
                dayOfWeek: parseInt(values.dayOfWeek),
                time: values.time,
            },
            recipients: values.recipients.split(',').map(e => e.trim()).filter(Boolean),
            subject: values.subject,
            body: values.body,
            createdBy: currentUser.id,
        };

        if (editingReport) {
            const updatedReport = { ...editingReport, ...reportData };
            setScheduledReports(prev => prev.map(r => r.id === editingReport.id ? updatedReport : r));
            toast({ title: "Report Updated", description: `Report "${values.name}" has been updated.` });
        } else {
             const newReport: ScheduledReport = {
                id: `SR-${Date.now()}`,
                ...reportData,
            };
            setScheduledReports(prev => [...prev, newReport]);
            toast({ title: "Report Scheduled", description: `Report "${values.name}" has been scheduled.` });
        }
        handleCloseReportDialog();
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
        if (!currentUser || !activeBoardId) return [];

        let baseTasks = tasks.filter(task => task.boardId === activeBoardId && !task.isArchived);
        
        baseTasks = baseTasks.filter(task => {
            const searchMatch = !searchTerm || task.title.toLowerCase().includes(searchTerm.toLowerCase());
            const unitMatch = filters.unit === 'all' || task.unit === filters.unit;
            const tagsMatch = filters.tags.length === 0 || filters.tags.every(tag => task.tags?.includes(tag));
            const priorityMatch = filters.priority === 'all' || task.priority === filters.priority;
            return searchMatch && unitMatch && tagsMatch && priorityMatch;
        });
        
        baseTasks.sort((a, b) => {
            const field = sorting.field;
            const direction = sorting.direction === 'asc' ? 1 : -1;
            
            if (field === 'priority') {
                const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                const priorityA = priorityOrder[a.priority || 'medium'];
                const priorityB = priorityOrder[b.priority || 'medium'];
                return (priorityA - priorityB) * direction;
            }

            const valA = a[field as keyof Task];
            const valB = b[field as keyof Task];

            if (field === 'dueDate' && typeof valA === 'string' && typeof valB === 'string') {
                return (parseISO(valA).getTime() - parseISO(valB).getTime()) * direction;
            }

            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });


        return baseTasks;

    }, [tasks, currentUser, searchTerm, filters, sorting, activeBoardId]);
    
    const archivedColumns = useMemo(() => {
        if (!activeBoard) return [];
        return activeBoard.columns.filter(c => c.isArchived);
    }, [activeBoard]);

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

    // Calendar-related memos and functions
    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startingDayIndex = getDay(start);
        const placeholders = Array.from({ length: startingDayIndex }, (_, i) => ({
            date: null,
            key: `placeholder-${i}`
        }));
        return [...placeholders, ...days.map(d => ({date:d, key: format(d, 'yyyy-MM-dd')}))];
    }, [currentMonth]);

    const tasksByDate = useMemo(() => {
        const tasksForBoard = tasks.filter(task => task.boardId === activeBoardId);
        return tasksForBoard.reduce((acc, task) => {
            const dueDate = format(parseISO(task.dueDate), 'yyyy-MM-dd');
            if (!acc[dueDate]) {
                acc[dueDate] = [];
            }
            acc[dueDate].push(task);
            return acc;
        }, {} as Record<string, Task[]>);
    }, [tasks, activeBoardId]);

    const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
    const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const goToToday = () => setCurrentMonth(new Date());


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
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
        e.currentTarget.classList.add('dragging-card');
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('dragging-card');
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-primary/10');
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('bg-primary/10');
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newColumnId: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-primary/10');
        const taskId = e.dataTransfer.getData("taskId");
        const task = tasks.find(t => t.id === taskId);
        
        if (task && task.columnId !== newColumnId) {
            setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, columnId: newColumnId } : t));
            const columnName = activeBoard?.columns.find(c => c.id === newColumnId)?.title;
            toast({
                title: "Task Moved",
                description: `Task "${task.title}" moved to ${columnName}.`,
            });
        }
    };
    
    if (!currentUser) {
      return null
    }

    const renderTaskCard = (task: Task) => {
      const assignedUsers = mockUsers.filter(u => task.assignees?.includes(u.id));
      const checklistItems = task.checklist || [];
      const completedItems = checklistItems.filter(item => item.completed).length;
      const canEdit = userPermissions === 'owner' || userPermissions === 'editor';
      
      const { isCompleted } = task;

      return (
        <Card 
            key={task.id} 
            className="mb-2 cursor-pointer transition-shadow hover:shadow-md"
            draggable={canEdit}
            onDragStart={(e) => canEdit && handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
            onClick={() => handleOpenTaskDialog(task, task.columnId)}
        >
          <CardContent className="p-3">
             <div className="flex justify-between items-start gap-2">
                <Checkbox
                    id={`card-check-${task.id}`}
                    checked={isCompleted}
                    onCheckedChange={(checked) => {
                        handleToggleStatus(task)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                    disabled={!canEdit}
                />
                <label htmlFor={`card-check-${task.id}`} className={cn("flex-1 font-semibold text-sm leading-tight cursor-pointer", isCompleted && "line-through text-muted-foreground")}>{task.title}</label>
                <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleOpenTaskDialog(task, task.columnId); }} disabled={!canEdit}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleOpenDetailsSheet(task); }}><ListChecks className="mr-2 h-4 w-4" />Details</DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleOpenMoveDialog(task); }} disabled={!canEdit}>
                                <Move className="mr-2 h-4 w-4" />
                                Move Task
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleAddToCalendar(task); }}>
                                <CalendarPlus className="mr-2 h-4 w-4" />
                                Add to Calendar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(task.id); }} className="text-destructive" disabled={userPermissions !== 'owner'}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {task.tags && task.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 pl-7">
                    {task.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 pl-7">{format(new Date(task.dueDate), "MMM d, yyyy")}</p>
            <div className="flex items-center justify-between mt-3 pl-7">
               <div className="flex items-center gap-3">
                {(task.attachments?.length || 0) > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger>
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>{task.attachments?.length} attachment(s)</p>
                          </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                )}
                {(task.comments?.length || 0) > 0 && (
                     <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-xs">{task.comments?.length}</span>
                              </div>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>{task.comments?.length} comment(s)</p>
                          </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                )}
                {checklistItems.length > 0 && (
                      <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <ListChecks className="h-4 w-4" />
                                  <span className="text-xs font-semibold">{completedItems}/{checklistItems.length}</span>
                              </div>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>Checklist progress</p>
                          </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                )}
               </div>
              {assignedUsers.length > 0 && (
                <div className="flex -space-x-2 overflow-hidden">
                    {assignedUsers.map(user => (
                        <TooltipProvider key={user.id}>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Avatar className="h-7 w-7 border-2 border-background">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Assigned to {user.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <PageHeader className="pb-4">
                <div className="flex items-center justify-between">
                     <Popover open={isBoardSwitcherOpen} onOpenChange={setIsBoardSwitcherOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isBoardSwitcherOpen}
                                className="w-auto justify-between text-lg font-semibold"
                            >
                                <div className='flex items-center gap-2'>
                                {activeBoard && <div className="h-3 w-3 rounded-full" style={{ backgroundColor: activeBoard.color }} />}
                                {activeBoard ? activeBoard.name : "Select a board..."}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Search boards..." />
                                <CommandList>
                                    <CommandEmpty>No board found.</CommandEmpty>
                                    <CommandGroup>
                                        {visibleBoards.map((board) => (
                                            <CommandItem
                                                key={board.id}
                                                value={board.name}
                                                onSelect={() => {
                                                    setActiveBoardId(board.id);
                                                    setIsBoardSwitcherOpen(false);
                                                }}
                                                className="flex justify-between items-center"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: board.color }} />
                                                    {board.name}
                                                </div>
                                                 <div className='flex items-center gap-2'>
                                                    {activeBoardId === board.id && (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    )}
                                                     {currentUser.id === board.ownerId && (
                                                        <DropdownMenu onOpenChange={(e) => e.stopPropagation()}>
                                                            <DropdownMenuTrigger asChild>
                                                                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                                <DropdownMenuItem onSelect={() => {setIsBoardSwitcherOpen(false); handleOpenBoardDialog(board);}}>Edit</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={(e) => {e.stopPropagation(); setIsBoardSwitcherOpen(false);setIsDeleteAlertOpen(true)}} className="text-destructive">Delete</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                     )}
                                                 </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                                <Separator />
                                <CommandList>
                                     <CommandGroup>
                                        <CommandItem onSelect={() => {setIsBoardSwitcherOpen(false); handleOpenBoardDialog(null);}}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Create New Board
                                        </CommandItem>
                                     </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <div>
                        <PageHeaderDescription>Manage your recurring and one-time tasks.</PageHeaderDescription>
                    </div>
                </div>
            </PageHeader>
            
             <Dialog open={isBoardDialogOpen} onOpenChange={handleCloseBoardDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBoard ? 'Edit Board' : 'Create New Board'}</DialogTitle>
                        <DialogDescription>{editingBoard ? 'Update the name and color of this board.' : 'Create a new list to organize your tasks.'}</DialogDescription>
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
                                <Button type="submit">{editingBoard ? 'Save Changes' : 'Create Board'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

             <Dialog open={isShareDialogOpen} onOpenChange={handleCloseShareDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Share "{sharingBoard?.name}"</DialogTitle>
                        <DialogDescription>Manage access for other users.</DialogDescription>
                    </DialogHeader>
                     <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-6">
                        <Command className="rounded-lg border shadow-md">
                            <CommandInput placeholder="Add user by name or email..." />
                            <CommandList>
                                <CommandEmpty>No users found.</CommandEmpty>
                                <CommandGroup>
                                {mockUsers
                                    .filter(user => user.id !== currentUser.id && !(sharingBoard?.sharedWith || []).some(s => s.userId === user.id))
                                    .map(user => (
                                    <CommandItem key={user.id} onSelect={() => handleShareUpdate(user.id, 'viewer')}>
                                        <Avatar className="mr-2 h-6 w-6">
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span>{user.name}</span>
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                            <h4 className="font-medium">Shared with</h4>
                            {(sharingBoard?.sharedWith || []).map(share => {
                                const user = mockUsers.find(u => u.id === share.userId);
                                if (!user) return null;
                                return (
                                    <div key={user.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.avatar} />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select value={share.role} onValueChange={(role: BoardPermissionRole) => handleShareUpdate(user.id, role)}>
                                                <SelectTrigger className="w-[120px] h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="editor">Can edit</SelectItem>
                                                    <SelectItem value="viewer">Can view</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveShare(user.id)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                     </div>
                     <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={saveSharingChanges}>Save</Button>
                     </DialogFooter>
                </DialogContent>
             </Dialog>

             <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the board
                        and all tasks associated with it.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { if(activeBoard) handleDeleteBoard(activeBoard.id)}} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <AlertDialog open={isDeleteColumnAlertOpen} onOpenChange={setIsDeleteColumnAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Delete List Permanently?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the "{columnToDelete?.title}" list and all of its tasks. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setColumnToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteColumnPermanently} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Report Schedule?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the "{reportToDelete?.name}" report schedule. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setReportToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteReport} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isMoveTaskDialogOpen} onOpenChange={handleCloseMoveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Move Task</DialogTitle>
                        <DialogDescription>
                            Move "{movingTask?.title}" to another board.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="move-board-select">Select a destination board</Label>
                        <Select value={moveTargetBoardId} onValueChange={setMoveTargetBoardId}>
                            <SelectTrigger id="move-board-select" className="mt-2">
                                <SelectValue placeholder="Choose a board..." />
                            </SelectTrigger>
                            <SelectContent>
                                {visibleBoards
                                    .filter(board => board.id !== movingTask?.boardId)
                                    .map(board => (
                                    <SelectItem key={board.id} value={board.id}>
                                        {board.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleConfirmMoveTask} disabled={!moveTargetBoardId}>Move Task</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCopyColumnDialogOpen} onOpenChange={handleCloseCopyColumnDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Copy List</DialogTitle>
                        <DialogDescription>Create a duplicate of "{columnToCopy?.title}" and all its tasks.</DialogDescription>
                    </DialogHeader>
                    <Form {...copyColumnForm}>
                        <form onSubmit={copyColumnForm.handleSubmit(onCopyColumnSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={copyColumnForm.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New List Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="ghost">Cancel</Button>
                                </DialogClose>
                                <Button type="submit">Copy List</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isWeeklyReportDialogOpen} onOpenChange={handleCloseReportDialog}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                         <DialogTitle>{editingReport ? 'Edit' : 'Configure'} {reportConfigType === 'weekly-board-summary' ? 'Weekly Board Summary' : reportConfigType === 'weekly-my-tasks' ? 'Weekly "My Tasks" Report' : 'Weekly "In Progress" Report'}</DialogTitle>
                        <DialogDescription>Schedule a recurring email summary for the "{activeBoard?.name}" board.</DialogDescription>
                    </DialogHeader>
                    <Form {...weeklyReportForm}>
                        <form onSubmit={weeklyReportForm.handleSubmit(onWeeklyReportSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 max-h-[75vh] overflow-y-auto pr-6">
                            {/* Left Side: Configuration */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-medium">1. Details & Schedule</h3>
                                 <FormField
                                    control={weeklyReportForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Report Name</FormLabel>
                                             <FormControl><Input placeholder="e.g., Weekly IT Status" {...field} /></FormControl>
                                            <FormDescription>A name to identify this report in the manager.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                     <FormField
                                        control={weeklyReportForm.control}
                                        name="dayOfWeek"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Day of Week</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a day"/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {weekDays.map((day, i) => <SelectItem key={day} value={String(i)}>{day}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={weeklyReportForm.control}
                                        name="time"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Time</FormLabel>
                                                <FormControl><Input type="time" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <h3 className="text-lg font-medium">2. Content & Recipients</h3>
                                <FormField
                                    control={weeklyReportForm.control}
                                    name="recipients"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Recipients</FormLabel>
                                             <FormControl><Input placeholder="comma,separated@emails.com" {...field} /></FormControl>
                                            <FormDescription>Enter email addresses separated by commas.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={weeklyReportForm.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Subject</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={weeklyReportForm.control}
                                    name="body"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Introduction Text</FormLabel>
                                            <FormControl><Textarea placeholder="Add an optional message to the email body..." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Right Side: Preview */}
                             <div className="space-y-4">
                                <h3 className="text-lg font-medium">3. Preview</h3>
                                <div className="rounded-lg border bg-secondary/50 p-6 space-y-4">
                                    <div className="text-center space-y-2">
                                        {appearanceSettings?.logo && (
                                            <Image src={appearanceSettings.logo} alt="Logo" width={40} height={40} className="mx-auto" />
                                        )}
                                        <h4 className="text-xl font-semibold">{appearanceSettings?.siteName}</h4>
                                    </div>
                                    <Separator />
                                    <p className="text-sm text-muted-foreground italic">{reportBody || "No introduction text."}</p>
                                    <div className="space-y-4">
                                        {(activeBoard?.columns || []).filter(c => !c.isArchived).map(column => {
                                             let tasksToDisplay = tasks.filter(t => t.columnId === column.id);

                                            if (reportConfigType === 'weekly-my-tasks') {
                                                tasksToDisplay = tasksToDisplay.filter(t => t.assignees?.includes(currentUser.id));
                                            } else if (reportConfigType === 'weekly-in-progress') {
                                                const activeColumns = activeBoard?.columns.filter(c => !c.isArchived) || [];
                                                const firstColId = activeColumns[0]?.id;
                                                const lastColId = activeColumns[activeColumns.length - 1]?.id;
                                                const isInProgress = column.id !== firstColId && column.id !== lastColId;
                                                if (!isInProgress) return null;
                                            }

                                            if (tasksToDisplay.length === 0) return null;


                                            return (
                                            <div key={column.id}>
                                                <h5 className="font-semibold text-md mb-2 pb-1 border-b">{column.title}</h5>
                                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                                    {tasksToDisplay.length > 0 ? (
                                                        tasksToDisplay.map(task => (
                                                            <li key={task.id}>{task.title}</li>
                                                        ))
                                                    ) : (
                                                        <li className="italic">No tasks in this list.</li>
                                                    )}
                                                </ul>
                                            </div>
                                            );
                                        })}
                                    </div>
                                    <Separator />
                                    <p className="text-xs text-center text-muted-foreground">
                                        This is an automated weekly report scheduled to be sent every {weeklyReportForm.getValues('dayOfWeek') ? weekDays[parseInt(weeklyReportForm.getValues('dayOfWeek'))] : ''} at {weeklyReportForm.getValues('time')}.
                                    </p>
                                </div>
                            </div>
                           <DialogFooter className="md:col-span-2">
                                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                <Button type="submit">{editingReport ? "Save Changes" : "Save & Schedule"}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={isReportManagerOpen} onOpenChange={setIsReportManagerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>My Scheduled Reports</DialogTitle>
                        <DialogDescription>Manage your automated email reports for this board.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-2">
                            {scheduledReports.filter(r => r.boardId === activeBoardId && r.createdBy === currentUser.id).map(report => {
                                const nextRun = nextDay(new Date(), report.schedule.dayOfWeek as Day);
                                const [hours, minutes] = report.schedule.time.split(':');
                                nextRun.setHours(Number(hours), Number(minutes), 0, 0);

                                let reportTypeLabel = '';
                                switch(report.type) {
                                    case 'weekly-board-summary': reportTypeLabel = 'Board Summary'; break;
                                    case 'weekly-my-tasks': reportTypeLabel = 'My Tasks'; break;
                                    case 'weekly-in-progress': reportTypeLabel = 'In Progress'; break;
                                }

                                return (
                                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="font-semibold">{report.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Weekly {reportTypeLabel} &bull; Next on {format(nextRun, 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenReportDialog(report.type, report)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setReportToDelete(report)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>


             <div className="flex items-center justify-between gap-4 mb-4 p-2 bg-muted/50 rounded-lg min-h-[52px]">
                <div className="flex items-center gap-2">
                     <div className="flex items-center">
                        {(activeBoard?.sharedWith && activeBoard.sharedWith.length > 0) && (
                            <div className="flex items-center -space-x-2 mr-2">
                            {(activeBoard?.sharedWith || []).slice(0, 3).map(share => {
                                const user = mockUsers.find(u => u.id === share.userId);
                                return user ? (
                                    <TooltipProvider key={user.id}>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Avatar className="h-8 w-8 border-2 border-background">
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{share.role === 'editor' ? 'Can edit' : 'Can view'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : null;
                            })}

                            {(activeBoard?.sharedWith || []).length > 3 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Avatar className="h-8 w-8 border-2 border-background cursor-pointer">
                                            <AvatarFallback>+{(activeBoard?.sharedWith || []).length - 3}</AvatarFallback>
                                        </Avatar>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuLabel>All Members</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {(activeBoard?.sharedWith || []).map(share => {
                                            const user = mockUsers.find(u => u.id === share.userId);
                                            return user ? (
                                                <DropdownMenuItem key={user.id} className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={user.avatar} />
                                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium">{user.name}</p>
                                                        <p className="text-xs text-muted-foreground">{share.role}</p>
                                                    </div>
                                                </DropdownMenuItem>
                                            ) : null;
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            </div>
                        )}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => { if (activeBoard) handleOpenShareDialog(activeBoard); }} disabled={userPermissions !== 'owner'}>
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Share board</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon">
                                            <Mail className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Email Reports</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Schedule a New Report</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleOpenReportDialog('weekly-board-summary')}>Weekly - Board Summary</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleOpenReportDialog('weekly-my-tasks')}>Weekly - My Tasks</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleOpenReportDialog('weekly-in-progress')}>Weekly - In Progress Tasks</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setIsReportManagerOpen(true)}>
                                <ListVideo className="mr-2 h-4 w-4" />
                                View Scheduled Reports
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>


            {activeBoard && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                                    <List className="h-5 w-5" />
                                </Button>
                                 <Button variant={viewMode === 'board' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('board')}>
                                    <LayoutGrid className="h-5 w-5" />
                                </Button>
                                <Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('calendar')}>
                                    <CalendarViewIcon className="h-5 w-5" />
                                </Button>
                                <Button variant={viewMode === 'archived' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('archived')}>
                                    <Archive className="h-5 w-5" />
                                </Button>
                            </div>
                             <div className="flex items-center gap-2">
                                {selectedTaskIds.length > 0 && viewMode === 'list' && (
                                    <Button onClick={handleBulkExport} variant="outline">
                                        <Download className="mr-2 h-4 w-4" />
                                        Export Selected ({selectedTaskIds.length})
                                    </Button>
                                )}
                                <Button onClick={() => handleOpenTaskDialog(null)} disabled={userPermissions === 'viewer'}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add New Task
                                </Button>
                            </div>
                        </div>
                         {viewMode === 'list' && (
                            <div className="flex flex-wrap items-center gap-2 pt-4">
                                <Input
                                    placeholder="Search tasks by title..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="max-w-sm"
                                />
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
                        )}
                    </CardHeader>
                    <CardContent>
                       {viewMode === 'list' ? (
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
                                            <TableHead>
                                                 <Button variant="ghost" onClick={() => handleSort('columnId')}>
                                                    Status
                                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>
                                                <Button variant="ghost" onClick={() => handleSort('priority')}>
                                                    Priority
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
                                            <TableHead>Info</TableHead>
                                            <TableHead><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTasks.length > 0 ? (
                                            filteredTasks.map((task) => {
                                                const assignedUsers = mockUsers.filter(u => task.assignees?.includes(u.id));
                                                const checklistItems = task.checklist || [];
                                                const completedItems = checklistItems.filter(item => item.completed).length;
                                                const { isCompleted } = task;

                                                return (
                                                <TableRow key={task.id} data-state={selectedTaskIds.includes(task.id) && "selected"} className={cn(isCompleted && 'text-muted-foreground line-through')}>
                                                    <TableCell>
                                                        <Checkbox
                                                            onCheckedChange={(checked) => handleSelectRow(task.id, !!checked)}
                                                            checked={selectedTaskIds.includes(task.id)}
                                                            aria-label={`Select row for task "${task.title}"`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-2 text-center border-r">
                                                        <Checkbox
                                                            checked={isCompleted}
                                                            onCheckedChange={() => handleToggleStatus(task)}
                                                            aria-label={`Mark task "${task.title}" as completed/pending`}
                                                            className="rounded-full h-5 w-5 mx-auto"
                                                            disabled={userPermissions === 'viewer'}
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
                                                         <Badge variant={'outline'}>
                                                            {activeBoard?.columns.find(c => c.id === task.columnId)?.title || 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                     <TableCell>
                                                        <Badge variant="outline" className={cn(
                                                            task.priority === 'critical' && 'border-red-500 text-red-500',
                                                            task.priority === 'high' && 'border-orange-500 text-orange-500',
                                                            task.priority === 'medium' && 'border-yellow-500 text-yellow-500',
                                                            task.priority === 'low' && 'border-blue-500 text-blue-500',
                                                        )}>
                                                            {task.priority || 'medium'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex -space-x-2 overflow-hidden">
                                                            {assignedUsers.map(user => (
                                                                <TooltipProvider key={user.id}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <Avatar className="h-7 w-7 border-2 border-background">
                                                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                                            </Avatar>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Assigned to {user.name}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{format(new Date(task.dueDate), "PP")}</TableCell>
                                                    <TableCell>{formatRecurrence(task)}</TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <div className="flex items-center gap-2">
                                                                {(task.attachments?.length || 0) > 0 && (
                                                                     <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>{task.attachments?.length} attachment(s)</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
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
                                                                {checklistItems.length > 0 && (
                                                                     <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                                <ListChecks className="h-4 w-4" />
                                                                                <span className="text-xs font-semibold">{completedItems}/{checklistItems.length}</span>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Checklist progress</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleOpenTaskDialog(task);}} disabled={userPermissions === 'viewer'}>Edit</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleOpenDetailsSheet(task); }}>Details</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleOpenMoveDialog(task); }} disabled={userPermissions === 'viewer'}>
                                                                    <Move className="mr-2 h-4 w-4" />
                                                                    Move Task
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleAddToCalendar(task); }}>
                                                                    <CalendarPlus className="mr-2 h-4 w-4" />
                                                                    Add to Calendar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(task.id); }} className="text-destructive" disabled={userPermissions !== 'owner'}>Delete</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )})
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={10} className="h-24 text-center">
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
                        ) : viewMode === 'board' ? (
                            <div className="flex gap-4 overflow-x-auto pb-4">
                               {activeBoard?.columns.filter(c => !c.isArchived).map(column => (
                                   <div key={column.id} className="w-72 flex-shrink-0">
                                        <div 
                                            id={column.id}
                                            onDrop={(e) => handleDrop(e, column.id)}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            className="rounded-lg p-2 h-full bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between px-2 py-1 mb-2">
                                                {editingColumnId === column.id ? (
                                                    <Input
                                                        autoFocus
                                                        value={editingColumnTitle}
                                                        onChange={(e) => setEditingColumnTitle(e.target.value)}
                                                        onBlur={() => handleEditColumn(column.id, editingColumnTitle)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleEditColumn(column.id, editingColumnTitle);
                                                            if (e.key === 'Escape') setEditingColumnId(null);
                                                        }}
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    <h3
                                                        className="text-md font-semibold cursor-pointer"
                                                        onClick={() => {
                                                            if (userPermissions !== 'viewer') {
                                                                setEditingColumnId(column.id);
                                                                setEditingColumnTitle(column.title);
                                                            }
                                                        }}
                                                    >
                                                        {column.title}
                                                        <span className="text-sm font-normal text-muted-foreground ml-2">
                                                            {filteredTasks.filter(t => t.columnId === column.id).length}
                                                        </span>
                                                    </h3>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={userPermissions === 'viewer'}>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuLabel>List Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => handleOpenTaskDialog(null, column.id)}>
                                                            <PlusCircle className="mr-2 h-4 w-4" /> Add new task
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleOpenCopyColumnDialog(column)}>
                                                            <Copy className="mr-2 h-4 w-4" /> Copy list
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onSelect={() => handleArchiveColumn(column.id)}
                                                        >
                                                            <Archive className="mr-2 h-4 w-4" /> Archive list
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="space-y-2 px-1 max-h-[calc(100vh-28rem)] min-h-[24rem] overflow-y-auto">
                                                {filteredTasks.filter(t => t.columnId === column.id).map(renderTaskCard)}
                                            </div>
                                        </div>
                                   </div>
                               ))}
                                {userPermissions !== 'viewer' && (
                                <div className="w-72 flex-shrink-0">
                                    {showAddColumnForm ? (
                                        <div className="bg-muted rounded-lg p-2" ref={newColumnFormRef}>
                                            <Form {...columnForm}>
                                                <form onSubmit={columnForm.handleSubmit(handleAddColumn)}>
                                                    <FormField
                                                        control={columnForm.control}
                                                        name="title"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input autoFocus placeholder="Enter list title..." {...field} className="h-9"/>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Button type="submit" size="sm">Add list</Button>
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAddColumnForm(false)}><X className="h-4 w-4"/></Button>
                                                    </div>
                                                </form>
                                            </Form>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            className="w-full h-10 bg-primary/5 hover:bg-primary/10 text-primary justify-start"
                                            onClick={() => setShowAddColumnForm(true)}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4"/>
                                            Add another list
                                        </Button>
                                    )}
                                </div>
                                )}
                            </div>
                         ) : viewMode === 'calendar' ? (
                            <div className="border rounded-lg">
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4"/></Button>
                                        <h2 className="text-lg font-semibold w-36 text-center">{format(currentMonth, 'MMMM yyyy')}</h2>
                                        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4"/></Button>
                                    </div>
                                    <Button variant="outline" onClick={goToToday}>Today</Button>
                                </div>
                                <div className="grid grid-cols-7 border-t border-b">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">{day}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7">
                                    {calendarDays.map((dayObj) => {
                                        const tasksOnDay = dayObj.date ? tasksByDate[format(dayObj.date, 'yyyy-MM-dd')] || [] : [];
                                        return (
                                        <div key={dayObj.key} className={cn("h-48 border-r border-b p-2 overflow-y-auto", dayObj.date && !isSameMonth(dayObj.date, currentMonth) && "bg-muted/50")}>
                                            {dayObj.date && (
                                                <span className={cn("font-semibold", isToday(dayObj.date) && "bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center")}>
                                                    {format(dayObj.date, 'd')}
                                                </span>
                                            )}
                                            <div className="space-y-1 mt-1">
                                                {tasksOnDay.map(task => {
                                                    const assignedUsers = mockUsers.filter(u => task.assignees?.includes(u.id));
                                                    const checklistItems = task.checklist || [];
                                                    const completedItems = checklistItems.filter(item => item.completed).length;
                                                    return (
                                                         <Card key={task.id} onClick={() => handleOpenDetailsSheet(task)} className="cursor-pointer hover:bg-muted/80">
                                                            <CardContent className="p-2 text-xs">
                                                                 <p className="font-semibold text-primary truncate mb-1">{task.title}</p>
                                                                {task.tags && task.tags.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 mb-1">
                                                                        {task.tags.slice(0, 2).map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center justify-between text-muted-foreground">
                                                                    {checklistItems.length > 0 && (
                                                                        <div className="flex items-center gap-1">
                                                                            <ListChecks className="h-3 w-3" />
                                                                            <span className="text-xs font-semibold">{completedItems}/{checklistItems.length}</span>
                                                                        </div>
                                                                    )}
                                                                    {assignedUsers.length > 0 && (
                                                                        <div className="flex -space-x-1 overflow-hidden">
                                                                            {assignedUsers.slice(0,2).map(user => (
                                                                                 <TooltipProvider key={user.id}>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger>
                                                                                            <Avatar className="h-5 w-5 border border-background">
                                                                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                                                            </Avatar>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>
                                                                                            <p>Assigned to {user.name}</p>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                         ) : ( // Archived View
                             <div className="space-y-4">
                                {archivedColumns.length > 0 ? (
                                    archivedColumns.map(column => (
                                        <Card key={column.id} className="bg-muted/50">
                                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                                <div>
                                                    <CardTitle className="text-lg">{column.title}</CardTitle>
                                                    <CardDescription>
                                                        {tasks.filter(t => t.columnId === column.id).length} tasks in this list.
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleRestoreColumn(column.id)}>
                                                        <ArchiveRestore className="mr-2 h-4 w-4" />
                                                        Restore
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => { setColumnToDelete(column); setIsDeleteColumnAlertOpen(true); }}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Permanently
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground py-10">
                                        <Archive className="mx-auto h-12 w-12" />
                                        <p className="mt-4 font-semibold">No archived lists.</p>
                                        <p>You can archive lists from the board view.</p>
                                    </div>
                                )}
                             </div>
                         )}
                    </CardContent>
                </Card>
            )}


            <Dialog open={isTaskDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseTaskDialog()}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                        <DialogDescription>
                            Fill out the form below to create or update a task.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onTaskSubmit)} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Title</FormLabel>
                                            <FormControl><Input placeholder="e.g., Weekly Backup Check" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="columnId"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>List / Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a list" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {activeBoard?.columns.filter(c => !c.isArchived).map((col) => (
                                                    <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                    name="priority"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="critical">Critical</SelectItem>
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
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
                                    name="assignees"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Assign to</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start font-normal" disabled={usersOnBoard.length === 0}>
                                                        {field.value && field.value.length > 0
                                                            ? `${field.value.length} user(s) selected`
                                                            : "Select members..."}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search users..." />
                                                        <CommandList>
                                                            <CommandEmpty>No users found on this board.</CommandEmpty>
                                                            <CommandGroup>
                                                                {usersOnBoard.map((user) => (
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

                                <div className="space-y-4 md:col-span-2">
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
                                <div className="space-y-4 md:col-span-2">
                                    <div>
                                        <FormLabel>Checklist</FormLabel>
                                        <FormDescription className="mb-2">Break down this task into smaller steps.</FormDescription>
                                        {checklistFields.map((field, index) => (
                                            <div key={field.id} className="flex items-center gap-2 mb-2">
                                                <FormField
                                                    control={form.control}
                                                    name={`checklist.${index}.completed`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                 <FormField
                                                    control={form.control}
                                                    name={`checklist.${index}.text`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <FormControl><Input placeholder="Checklist item..." {...field} /></FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(index)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => appendChecklistItem({ id: `CL-new-${Date.now()}`, text: '', completed: false })}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add Item
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="md:col-span-2 space-y-4">
                                  <FormField
                                      control={form.control}
                                      name="attachments"
                                      render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Attachments</FormLabel>
                                          <FormControl>
                                          <div className="relative">
                                              <Button type="button" variant="outline" asChild>
                                              <label htmlFor="task-file-upload" className="cursor-pointer w-full flex items-center justify-center gap-2">
                                                  <Upload className="h-4 w-4"/>
                                                  <span>{ attachedFiles.length > 0 ? `${attachedFiles.length} file(s) selected` : 'Select Files'}</span>
                                              </label>
                                              </Button>
                                              <Input 
                                                  id="task-file-upload"
                                                  type="file" 
                                                  multiple 
                                                  onChange={handleFileChange}
                                                  className="sr-only"
                                              />
                                          </div>
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                      )}
                                  />
                                  {attachedFiles.length > 0 && (
                                      <div className="space-y-2">
                                      <p className="text-sm font-medium">New files to upload:</p>
                                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                          {attachedFiles.map((file, index) => (
                                          <li key={index} className="flex items-center gap-2">
                                              <Paperclip className="h-4 w-4" />
                                              <span>{file.name}</span>
                                              <Button 
                                                  type="button" 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="h-6 w-6 ml-auto"
                                                  onClick={() => {
                                                      const newFiles = attachedFiles.filter((_, i) => i !== index);
                                                      setAttachedFiles(newFiles);
                                                      form.setValue('attachments', newFiles);
                                                  }}
                                              >
                                                  <X className="h-4 w-4" />
                                              </Button>
                                          </li>
                                          ))}
                                      </ul>
                                      </div>
                                  )}
                                  {editingTask && editingTask.attachments && editingTask.attachments.length > 0 && (
                                     <div className="space-y-2">
                                        <p className="text-sm font-medium">Current attachments:</p>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                            {editingTask.attachments.map((file, index) => (
                                            <li key={index} className="flex items-center gap-2">
                                                <Paperclip className="h-4 w-4" />
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                                            </li>
                                            ))}
                                        </ul>
                                        <p className="text-xs text-muted-foreground">Uploading new files will replace current attachments.</p>
                                     </div>
                                  )}
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

             <Sheet open={isDetailsSheetOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDetailsSheet()}>
                <SheetContent className="flex flex-col sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Details for: {selectedTaskForDetails?.title}</SheetTitle>
                        <SheetDescription>
                            Task ID: {selectedTaskForDetails?.id}
                        </SheetDescription>
                    </SheetHeader>
                    <Tabs defaultValue="comments" className="flex-1 flex flex-col min-h-0">
                         <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="checklist">Checklist</TabsTrigger>
                            <TabsTrigger value="comments">Comments</TabsTrigger>
                            <TabsTrigger value="attachments">Attachments</TabsTrigger>
                        </TabsList>
                        <TabsContent value="checklist" className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto space-y-2 py-4">
                                {(selectedTaskForDetails?.checklist || []).length > 0 ? (
                                    <>
                                        <Progress value={
                                            ((selectedTaskForDetails?.checklist?.filter(i => i.completed).length || 0) / (selectedTaskForDetails?.checklist?.length || 1)) * 100
                                        } className="mb-4" />
                                        {(selectedTaskForDetails?.checklist || []).map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                                                <Checkbox
                                                    id={`sheet-${item.id}`}
                                                    checked={item.completed}
                                                    onCheckedChange={(checked) => handleChecklistItemToggle(selectedTaskForDetails!.id, item.id, !!checked)}
                                                    disabled={userPermissions === 'viewer'}
                                                />
                                                <label htmlFor={`sheet-${item.id}`} className={cn("flex-1 text-sm", item.completed && "line-through text-muted-foreground")}>
                                                    {item.text}
                                                </label>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="text-center text-muted-foreground py-10 h-full flex flex-col items-center justify-center">
                                        <ListChecks className="mx-auto h-12 w-12" />
                                        <p className="mt-4">No checklist items.</p>
                                        <p>You can add a checklist by editing this task.</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="comments" className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto space-y-4 py-4">
                                {(selectedTaskForDetails?.comments || []).length > 0 ? (
                                    (selectedTaskForDetails?.comments || []).map(comment => {
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
                                     <div className="text-center text-muted-foreground py-10 h-full flex flex-col items-center justify-center">
                                        <MessageSquare className="mx-auto h-12 w-12" />
                                        <p className="mt-4">No comments yet.</p>
                                        <p>Be the first to add a comment.</p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-auto pt-4 border-t sticky bottom-0 bg-background">
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
                                        <Button type="submit" disabled={userPermissions === 'viewer'}>Post</Button>
                                    </form>
                                </Form>
                            </div>
                        </TabsContent>
                         <TabsContent value="attachments" className="flex-1 flex flex-col min-h-0">
                             <div className="flex-1 overflow-y-auto space-y-2 py-4">
                                 {(selectedTaskForDetails?.attachments || []).length > 0 ? (
                                    <ul className="space-y-2">
                                        {(selectedTaskForDetails?.attachments || []).map((file, index) => (
                                            <li key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                                <div className='flex items-center gap-3'>
                                                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{file.name}</span>
                                                </div>
                                                <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                 ) : (
                                      <div className="text-center text-muted-foreground py-10 h-full flex flex-col items-center justify-center">
                                        <Paperclip className="mx-auto h-12 w-12" />
                                        <p className="mt-4">No attachments found.</p>
                                        <p>You can add files by editing this task.</p>
                                    </div>
                                 )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </SheetContent>
            </Sheet>
        </div>
    );
}


    
