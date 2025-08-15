

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PlusCircle, MoreHorizontal, ClipboardCheck, Calendar as CalendarIcon, X, Users as UsersIcon, MessageSquare, CalendarPlus, Download, CheckCircle, ArrowUpDown, Tag, Palette, Settings, Trash2, Edit, Share2, ListChecks, Paperclip, Upload, Move, List, LayoutGrid, Archive, ArchiveRestore, Calendar as CalendarViewIcon, ChevronLeft, ChevronRight, Copy, Mail, SlidersHorizontal, ListVideo, PencilRuler, ChevronsUpDown, Check, SortAsc, SortDesc, History } from 'lucide-react';
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import type { Task, User, Comment, TaskBoard, BoardShare, BoardPermissionRole, ChecklistItem, BoardColumn, AppearanceSettings, ScheduledReport, ScheduledReportType, ActivityLog } from '@/lib/types';
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
import { useLanguage } from '@/context/language-context';


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
    const { t } = useLanguage();
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
    const [columnSorting, setColumnSorting] = useState<Record<string, { field: SortableTaskField, direction: SortDirection }>>({});

    const newColumnFormRef = useRef<HTMLFormElement>(null);
    
    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Drag and Drop state
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);

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

    const createLogEntry = (action: string, details: Record<string, any>): ActivityLog => {
        if (!currentUser) throw new Error("User not found");
        return {
            id: `LOG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            action,
            details,
        };
    };

    const handleOpenTaskDialog = (task: Task | null, columnId?: string) => {
        setEditingTask(task);
        if (!task && columnId && activeBoard) {
            const defaultUnit = currentUser?.role === 'admin' ? currentUser.unit : "";
            const activeColumns = activeBoard.columns.filter(c => !c.isArchived);
            form.setValue('columnId', columnId);
            form.setValue('unit', defaultUnit);
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
        toast({ title: t('tasks.toast.report_deleted_title'), description: t('tasks.toast.report_deleted_desc', { name: reportToDelete.name }) });
        setReportToDelete(null);
    }

    const onBoardSubmit = (values: z.infer<typeof boardSchema>) => {
      if(!currentUser) return;

      if (editingBoard) {
        const updatedBoard = { ...editingBoard, ...values };
        setBoards(boards.map(b => b.id === editingBoard.id ? updatedBoard : b));
        toast({
            title: t('tasks.toast.board_updated_title'),
            description: t('tasks.toast.board_updated_desc', { name: updatedBoard.name })
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
                { id: `COL-${Date.now()}-1`, title: t('tasks.column_titles.todo'), boardId: newBoardId, isArchived: false },
                { id: `COL-${Date.now()}-2`, title: t('tasks.column_titles.in_progress'), boardId: newBoardId, isArchived: false },
                { id: `COL-${Date.now()}-3`, title: t('tasks.column_titles.done'), boardId: newBoardId, isArchived: false },
            ],
        };
        setBoards(prev => [...prev, newBoard]);
        setActiveBoardId(newBoard.id);
        toast({
            title: t('tasks.toast.board_created_title'),
            description: t('tasks.toast.board_created_desc', { name: newBoard.name })
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
            title: t('tasks.toast.board_deleted_title'),
            description: t('tasks.toast.board_deleted_desc', { name: boardToDelete.name }),
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
        
        toast({ title: t('tasks.toast.list_added_title'), description: t('tasks.toast.list_added_desc', { name: values.title })});
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
        toast({ title: t('tasks.toast.list_renamed_title'), description: t('tasks.toast.list_renamed_desc', { name: newTitle })});
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
        
        toast({ title: t('tasks.toast.list_archived_title'), description: t('tasks.toast.list_archived_desc') });
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
        
        toast({ title: t('tasks.toast.list_restored_title'), description: t('tasks.toast.list_restored_desc') });
    }
    
    const handleDeleteColumnPermanently = () => {
        if (!activeBoard || !columnToDelete) return;
        
        const updatedColumns = activeBoard.columns.filter(c => c.id !== columnToDelete.id);
        const updatedBoard = { ...activeBoard, columns: updatedColumns };
        
        const remainingTasks = tasks.filter(t => t.columnId !== columnToDelete.id);
        
        setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        setTasks(remainingTasks);
        
        toast({ title: t('tasks.toast.list_deleted_title'), description: t('tasks.toast.list_deleted_desc', { name: columnToDelete.title }), variant: "destructive" });
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
        title: t('tasks.toast.list_copied_title'),
        description: t('tasks.toast.list_copied_desc', { from: columnToCopy.title, to: values.title })
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
        toast({ title: t('tasks.toast.sharing_updated_title'), description: t('tasks.toast.sharing_updated_desc') });
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

        const newLog = createLogEntry('commented', { text: values.text });

        const updatedTask = {
            ...selectedTaskForDetails,
            comments: [...(selectedTaskForDetails.comments || []), newComment],
            logs: [...(selectedTaskForDetails.logs || []), newLog],
        };

        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        setSelectedTaskForDetails(updatedTask);
        commentForm.reset();
        toast({
            title: t('tasks.toast.comment_added_title'),
            description: t('tasks.toast.comment_added_desc'),
        });
    };
    
    const handleChecklistItemToggle = (taskId: string, itemId: string, completed: boolean) => {
        let updatedTask: Task | undefined;
        const updatedTasks = tasks.map(task => {
            if (task.id === taskId) {
                const item = task.checklist?.find(i => i.id === itemId);
                if (!item) return task;

                const newLog = createLogEntry(
                    completed ? 'completed_checklist_item' : 'uncompleted_checklist_item',
                    { text: item.text }
                );
                
                const updatedChecklist = task.checklist?.map(i =>
                    i.id === itemId ? { ...i, completed } : i
                );

                updatedTask = { ...task, checklist: updatedChecklist, logs: [...(task.logs || []), newLog] };
                return updatedTask;
            }
            return task;
        });
        setTasks(updatedTasks);
        
        if (selectedTaskForDetails?.id === taskId && updatedTask) {
            setSelectedTaskForDetails(updatedTask);
        }
    };


    const handleToggleStatus = (task: Task) => {
        const newLog = createLogEntry(
            !task.isCompleted ? 'completed_task' : 'uncompleted_task',
            { title: task.title }
        );
        const updatedTask = { ...task, isCompleted: !task.isCompleted, logs: [...(task.logs || []), newLog] };
        setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
        toast({
            title: t(updatedTask.isCompleted ? 'tasks.toast.task_completed_title' : 'tasks.toast.task_incomplete_title'),
            description: t('tasks.toast.task_status_updated_desc', { name: task.title }),
        });
    };
    
    const handleDelete = (id: string) => {
      setTasks(tasks.filter(t => t.id !== id));
      toast({
          title: t('tasks.toast.task_deleted_title'),
          description: t('tasks.toast.task_deleted_desc'),
          variant: "destructive",
      });
    }
    
     const handleConfirmMoveTask = () => {
        if (!movingTask || !moveTargetBoardId) return;

        const targetBoard = boards.find(b => b.id === moveTargetBoardId);
        if (!targetBoard || !targetBoard.columns[0]) {
            toast({ title: t('common.error'), description: t('tasks.toast.move_no_columns_error'), variant: "destructive" });
            return;
        }

        const newLog = createLogEntry('moved_task', { from: activeBoard?.name, to: targetBoard.name });

        const updatedTask = { ...movingTask, boardId: moveTargetBoardId, columnId: targetBoard.columns[0].id, logs: [...(movingTask.logs || []), newLog] };
        setTasks(tasks.map(t => t.id === movingTask.id ? updatedTask : t));
        
        toast({
            title: t('tasks.toast.task_moved_title'),
            description: t('tasks.toast.task_moved_desc', { task: movingTask.title, board: targetBoard?.name }),
        });
        
        handleCloseMoveDialog();
    };

    const onTaskSubmit = (values: z.infer<typeof taskSchema>) => {
        if (!currentUser || !activeBoardId) return;
        
        if (editingTask) {
            const newLogs: ActivityLog[] = [];
            // Compare and create logs
            if (editingTask.title !== values.title) {
                newLogs.push(createLogEntry('updated_title', { from: editingTask.title, to: values.title }));
            }
            if (editingTask.description !== values.description) {
                newLogs.push(createLogEntry('updated_description', {}));
            }
            if (editingTask.dueDate !== values.dueDate.toISOString()) {
                newLogs.push(createLogEntry('updated_dueDate', { from: format(new Date(editingTask.dueDate), 'P'), to: format(values.dueDate, 'P') }));
            }
            if (editingTask.columnId !== values.columnId) {
                const fromColumn = activeBoard?.columns.find(c => c.id === editingTask.columnId)?.title;
                const toColumn = activeBoard?.columns.find(c => c.id === values.columnId)?.title;
                newLogs.push(createLogEntry('moved_column', { from: fromColumn, to: toColumn }));
            }
            
            // Checklist changes
            const oldChecklist = editingTask.checklist || [];
            const newChecklist = values.checklist || [];
            oldChecklist.forEach(oldItem => {
                if (!newChecklist.find(newItem => newItem.id === oldItem.id)) {
                    newLogs.push(createLogEntry('removed_checklist_item', { text: oldItem.text }));
                }
            });
             newChecklist.forEach(newItem => {
                if (!oldChecklist.find(oldItem => oldItem.id === newItem.id)) {
                    newLogs.push(createLogEntry('added_checklist_item', { text: newItem.text }));
                }
            });


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

            const updatedTask: Task = {
                ...editingTask,
                ...taskData,
                attachments: attachedFiles.length > 0 
                    ? attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })) 
                    : editingTask.attachments,
                logs: [...(editingTask.logs || []), ...newLogs],
            };
            setTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t));
            toast({
                title: t('tasks.toast.task_updated_title'),
                description: t('tasks.toast.task_updated_desc', { name: updatedTask.title }),
            });
        } else {
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
            
            const newLog = createLogEntry('created', { title: values.title });
            const newTask: Task = {
                id: `T-${Date.now()}`,
                boardId: activeBoardId,
                createdBy: currentUser.name,
                ...taskData,
                attachments: attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })),
                comments: [],
                logs: [newLog],
            };
            setTasks([newTask, ...tasks]);
            toast({
                title: t('tasks.toast.task_created_title'),
                description: t('tasks.toast.task_created_desc', { name: newTask.title }),
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
            toast({ title: t('tasks.toast.report_updated_title'), description: t('tasks.toast.report_updated_desc', { name: values.name }) });
        } else {
             const newReport: ScheduledReport = {
                id: `SR-${Date.now()}`,
                ...reportData,
            };
            setScheduledReports(prev => [...prev, newReport]);
            toast({ title: t('tasks.toast.report_scheduled_title'), description: t('tasks.toast.report_scheduled_desc', { name: values.name }) });
        }
        handleCloseReportDialog();
    };


    const handleBulkExport = () => {
        const tasksToExport = tasks.filter(task => selectedTaskIds.includes(task.id));
        if (tasksToExport.length === 0) {
            toast({
                title: t('tasks.toast.no_tasks_selected_title'),
                description: t('tasks.toast.no_tasks_selected_desc'),
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
                    title: t('common.error'),
                    description: t('tasks.toast.ics_error_desc'),
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
                    title: t('common.error'),
                    description: t('tasks.toast.ics_error_desc'),
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

    const handleColumnSort = (columnId: string, field: SortableTaskField) => {
        setColumnSorting(prev => {
            const currentSort = prev[columnId];
            const newDirection = currentSort?.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';
            return {
                ...prev,
                [columnId]: { field, direction: newDirection }
            };
        });
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
                return t('tasks.recurrence_types.none');
            case 'daily':
                return t('tasks.recurrence_types.daily', { time });
            case 'weekly':
                return t('tasks.recurrence_types.weekly', { day: weekDays[recurrence.dayOfWeek!], time });
            case 'monthly':
                return t('tasks.recurrence_types.monthly', { day: recurrence.dayOfMonth, time });
            case 'yearly':
                return t('tasks.recurrence_types.yearly', { date: format(new Date(task.dueDate), 'MMM d'), time });
            default:
                return 'N/A';
        }
    }

    const getCommentAuthor = (authorId: string): User | undefined => {
        return mockUsers.find(u => u.id === authorId);
    }
    
    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        setDraggedTaskId(taskId);
        e.currentTarget.classList.add('dragging-card');
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('dragging-card');
        setDraggedTaskId(null);
        setDragOverTaskId(null);
        setDropPosition(null);
    };

    const handleDragOverColumn = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-primary/10');
    };

    const handleDragLeaveColumn = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('bg-primary/10');
    };

    const handleDropOnColumn = (e: React.DragEvent<HTMLDivElement>, newColumnId: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-primary/10');
        if (!draggedTaskId) return;

        const task = tasks.find(t => t.id === draggedTaskId);
        if (task && task.columnId !== newColumnId) {
            const oldColumnName = activeBoard?.columns.find(c => c.id === task.columnId)?.title;
            const newColumnName = activeBoard?.columns.find(c => c.id === newColumnId)?.title;
            const newLog = createLogEntry('moved_column', { from: oldColumnName, to: newColumnName });

            setTasks(prevTasks => prevTasks.map(t => t.id === draggedTaskId ? { ...t, columnId: newColumnId, logs: [...(t.logs || []), newLog] } : t));
            
            toast({
                title: t('tasks.toast.task_moved_title'),
                description: `Task "${task.title}" moved to ${newColumnName}.`,
            });
        }
    };
    
    const handleDragOverTask = (e: React.DragEvent, targetTaskId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedTaskId === targetTaskId) return;
        setDragOverTaskId(targetTaskId);

        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const middleY = rect.top + rect.height / 2;
        setDropPosition(e.clientY < middleY ? 'top' : 'bottom');
    };

    const handleDragLeaveTask = (e: React.DragEvent) => {
        e.stopPropagation();
        setDragOverTaskId(null);
        setDropPosition(null);
    };

    const handleDropOnTask = (e: React.DragEvent, targetTask: Task) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedTaskId || draggedTaskId === targetTask.id) {
            handleDragEnd(e as any);
            return;
        }

        const currentTasks = [...tasks];
        const draggedIndex = currentTasks.findIndex(t => t.id === draggedTaskId);
        let targetIndex = currentTasks.findIndex(t => t.id === targetTask.id);

        if (draggedIndex === -1 || targetIndex === -1) {
            handleDragEnd(e as any);
            return;
        }

        const [draggedItem] = currentTasks.splice(draggedIndex, 1);
        draggedItem.columnId = targetTask.columnId;

        // If the column changed, add a log entry
        if (draggedItem.columnId !== tasks[draggedIndex].columnId) {
             const oldColumnName = activeBoard?.columns.find(c => c.id === tasks[draggedIndex].columnId)?.title;
             const newColumnName = activeBoard?.columns.find(c => c.id === targetTask.columnId)?.title;
             const newLog = createLogEntry('moved_column', { from: oldColumnName, to: newColumnName });
             draggedItem.logs = [...(draggedItem.logs || []), newLog];
        }


        // Re-find target index in the modified array
        targetIndex = currentTasks.findIndex(t => t.id === targetTask.id);

        if (dropPosition === 'top') {
            currentTasks.splice(targetIndex, 0, draggedItem);
        } else {
            currentTasks.splice(targetIndex + 1, 0, draggedItem);
        }

        setTasks(currentTasks);
        handleDragEnd(e as any);
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
        <div 
            key={task.id}
            className="relative"
            onDragOver={(e) => canEdit && handleDragOverTask(e, task.id)}
            onDragLeave={handleDragLeaveTask}
            onDrop={(e) => canEdit && handleDropOnTask(e, task)}
        >
            {dragOverTaskId === task.id && dropPosition === 'top' && (
                 <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-full -mt-1 z-10" />
            )}
            <Card 
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
                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">{t('common.toggle_menu')}</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenTaskDialog(task, task.columnId); }} disabled={!canEdit}><Edit className="mr-2 h-4 w-4" />{t('common.edit')}</DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenDetailsSheet(task); }}><ListChecks className="mr-2 h-4 w-4" />{t('tasks.details.view_details')}</DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenMoveDialog(task); }} disabled={!canEdit}>
                                    <Move className="mr-2 h-4 w-4" />
                                    {t('tasks.actions.move_task')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToCalendar(task); }}>
                                    <CalendarPlus className="mr-2 h-4 w-4" />
                                    {t('tasks.actions.add_to_calendar')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(task.id); }} className="text-destructive" disabled={userPermissions !== 'owner'}><Trash2 className="mr-2 h-4 w-4" />{t('common.delete')}</DropdownMenuItem>
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
                                  <p>{t('tasks.tooltips.attachments_count', {count: task.attachments?.length})}</p>
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
                                  <p>{t('tasks.tooltips.comments_count', {count: task.comments?.length})}</p>
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
                                  <p>{t('tasks.tooltips.checklist_progress')}</p>
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
                                        <p>{t('tasks.tooltips.assigned_to', { name: user.name })}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
             {dragOverTaskId === task.id && dropPosition === 'bottom' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full z-10" />
            )}
        </div>
      );
    }

    const renderLog = (log: ActivityLog) => {
        let text;
        switch (log.action) {
            case 'created':
                text = t('tasks.logs.created', { title: log.details.title });
                break;
            case 'updated_title':
                text = t('tasks.logs.updated_title', { from: log.details.from, to: log.details.to });
                break;
            case 'updated_description':
                text = t('tasks.logs.updated_description');
                break;
             case 'updated_dueDate':
                text = t('tasks.logs.updated_dueDate', { from: log.details.from, to: log.details.to });
                break;
            case 'completed_checklist_item':
                text = t('tasks.logs.completed_checklist_item', { text: log.details.text });
                break;
            case 'uncompleted_checklist_item':
                text = t('tasks.logs.uncompleted_checklist_item', { text: log.details.text });
                break;
            case 'added_checklist_item':
                text = t('tasks.logs.added_checklist_item', { text: log.details.text });
                break;
            case 'removed_checklist_item':
                text = t('tasks.logs.removed_checklist_item', { text: log.details.text });
                break;
            case 'commented':
                text = t('tasks.logs.commented', { text: log.details.text });
                break;
             case 'completed_task':
                text = t('tasks.logs.completed_task', { title: log.details.title });
                break;
            case 'uncompleted_task':
                text = t('tasks.logs.uncompleted_task', { title: log.details.title });
                break;
            case 'moved_column':
                 text = t('tasks.logs.moved_column', { from: log.details.from, to: log.details.to });
                 break;
             case 'moved_task':
                 text = t('tasks.logs.moved_task', { from: log.details.from, to: log.details.to });
                 break;
            default:
                text = `performed action: ${log.action}`;
        }

        return (
            <div key={log.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={log.userAvatar} alt={log.userName}/>
                    <AvatarFallback>{log.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="text-sm">
                        <span className="font-semibold">{log.userName}</span> {text}
                    </p>
                     <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </p>
                </div>
            </div>
        )
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
                                {activeBoard ? activeBoard.name : t('tasks.select_board')}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder={t('tasks.dialog.board_search_placeholder')} />
                                <CommandList>
                                    <CommandEmpty>{t('tasks.no_board_found')}</CommandEmpty>
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
                                                         <DropdownMenu onOpenChange={(e) => {}}>
                                                             <DropdownMenuTrigger asChild>
                                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
                                                             </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                                <DropdownMenuItem onSelect={() => {setIsBoardSwitcherOpen(false); handleOpenBoardDialog(board);}}>{t('common.edit')}</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => {setIsDeleteAlertOpen(true)}} className="text-destructive">{t('common.delete')}</DropdownMenuItem>
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
                                            {t('tasks.add_new_board')}
                                        </CommandItem>
                                     </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <div>
                        <PageHeaderDescription>{t('tasks.description')}</PageHeaderDescription>
                    </div>
                </div>
            </PageHeader>
            
             <Dialog open={isBoardDialogOpen} onOpenChange={handleCloseBoardDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBoard ? t('tasks.dialog.board_edit_title') : t('tasks.dialog.board_create_title')}</DialogTitle>
                        <DialogDescription>{editingBoard ? t('tasks.dialog.board_edit_desc') : t('tasks.dialog.board_create_desc')}</DialogDescription>
                    </DialogHeader>
                    <Form {...boardForm}>
                        <form onSubmit={boardForm.handleSubmit(onBoardSubmit)} className="space-y-4">
                                <FormField
                                control={boardForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('tasks.dialog.board_name')}</FormLabel>
                                        <FormControl><Input placeholder={t('tasks.dialog.board_name_placeholder')} {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                                <FormField
                                control={boardForm.control}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('tasks.dialog.board_color')}</FormLabel>
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
                                <DialogClose asChild><Button variant="ghost">{t('common.cancel')}</Button></DialogClose>
                                <Button type="submit">{editingBoard ? t('common.save_changes') : t('tasks.dialog.board_create_button')}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

             <Dialog open={isShareDialogOpen} onOpenChange={handleCloseShareDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('tasks.dialog.share_title', { name: sharingBoard?.name })}</DialogTitle>
                        <DialogDescription>{t('tasks.dialog.share_desc')}</DialogDescription>
                    </DialogHeader>
                     <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-6">
                        <Command className="rounded-lg border shadow-md">
                            <CommandInput placeholder={t('tasks.dialog.share_search_placeholder')} />
                            <CommandList>
                                <CommandEmpty>{t('tasks.dialog.share_no_users_found')}</CommandEmpty>
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
                            <h4 className="font-medium">{t('tasks.dialog.share_with_label')}</h4>
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
                                                    <SelectItem value="editor">{t('tasks.permissions.editor')}</SelectItem>
                                                    <SelectItem value="viewer">{t('tasks.permissions.viewer')}</SelectItem>
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
                        <DialogClose asChild><Button variant="ghost">{t('common.cancel')}</Button></DialogClose>
                        <Button onClick={saveSharingChanges}>{t('common.save_changes')}</Button>
                     </DialogFooter>
                </DialogContent>
             </Dialog>

             <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>{t('tasks.dialog.delete_board_title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('tasks.dialog.delete_board_desc')}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { if(activeBoard) handleDeleteBoard(activeBoard.id)}} className="bg-destructive hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <AlertDialog open={isDeleteColumnAlertOpen} onOpenChange={setIsDeleteColumnAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>{t('tasks.dialog.delete_list_title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('tasks.dialog.delete_list_desc', { name: columnToDelete?.title })}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setColumnToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteColumnPermanently} className="bg-destructive hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('tasks.dialog.delete_report_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('tasks.dialog.delete_report_desc', { name: reportToDelete?.name })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setReportToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteReport} className="bg-destructive hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isMoveTaskDialogOpen} onOpenChange={handleCloseMoveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('tasks.dialog.move_task_title')}</DialogTitle>
                        <DialogDescription>
                            {t('tasks.dialog.move_task_desc', { task: movingTask?.title })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="move-board-select">{t('tasks.dialog.move_task_select_label')}</Label>
                        <Select value={moveTargetBoardId} onValueChange={setMoveTargetBoardId}>
                            <SelectTrigger id="move-board-select" className="mt-2">
                                <SelectValue placeholder={t('tasks.dialog.move_task_select_placeholder')} />
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
                        <DialogClose asChild><Button variant="ghost">{t('common.cancel')}</Button></DialogClose>
                        <Button onClick={handleConfirmMoveTask} disabled={!moveTargetBoardId}>{t('tasks.dialog.move_task_button')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCopyColumnDialogOpen} onOpenChange={handleCloseCopyColumnDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('tasks.dialog.copy_list_title')}</DialogTitle>
                        <DialogDescription>{t('tasks.dialog.copy_list_desc', { name: columnToCopy?.title })}</DialogDescription>
                    </DialogHeader>
                    <Form {...copyColumnForm}>
                        <form onSubmit={copyColumnForm.handleSubmit(onCopyColumnSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={copyColumnForm.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('tasks.dialog.copy_list_name_label')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="ghost">{t('common.cancel')}</Button>
                                </DialogClose>
                                <Button type="submit">{t('tasks.board.copy_list')}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isWeeklyReportDialogOpen} onOpenChange={handleCloseReportDialog}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                         <DialogTitle>{editingReport ? t('tasks.dialog.edit_report_title') : t('tasks.dialog.configure_report_title')} {t(`tasks.report_types.${reportConfigType}`)}</DialogTitle>
                        <DialogDescription>{t('tasks.dialog.report_desc', { name: activeBoard?.name })}</DialogDescription>
                    </DialogHeader>
                    <Form {...weeklyReportForm}>
                        <form onSubmit={weeklyReportForm.handleSubmit(onWeeklyReportSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 max-h-[75vh] overflow-y-auto pr-6">
                            {/* Left Side: Configuration */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-medium">{t('tasks.dialog.report_step1')}</h3>
                                 <FormField
                                    control={weeklyReportForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('tasks.dialog.report_name_label')}</FormLabel>
                                             <FormControl><Input placeholder={t('tasks.dialog.report_name_placeholder')} {...field} /></FormControl>
                                            <FormDescription>{t('tasks.dialog.report_name_desc')}</FormDescription>
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
                                                <FormLabel>{t('tasks.dialog.report_day_label')}</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder={t('tasks.dialog.report_day_placeholder')}/></SelectTrigger></FormControl>
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
                                                <FormLabel>{t('tasks.dialog.report_time_label')}</FormLabel>
                                                <FormControl><Input type="time" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <h3 className="text-lg font-medium">{t('tasks.dialog.report_step2')}</h3>
                                <FormField
                                    control={weeklyReportForm.control}
                                    name="recipients"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('tasks.dialog.report_recipients_label')}</FormLabel>
                                             <FormControl><Input placeholder={t('tasks.dialog.report_recipients_placeholder')} {...field} /></FormControl>
                                            <FormDescription>{t('tasks.dialog.report_recipients_desc')}</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={weeklyReportForm.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('tasks.dialog.report_subject_label')}</FormLabel>
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
                                            <FormLabel>{t('tasks.dialog.report_intro_label')}</FormLabel>
                                            <FormControl><Textarea placeholder={t('tasks.dialog.report_intro_placeholder')} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Right Side: Preview */}
                             <div className="space-y-4">
                                <h3 className="text-lg font-medium">{t('tasks.dialog.report_step3')}</h3>
                                <div className="rounded-lg border bg-secondary/50 p-6 space-y-4">
                                    <div className="text-center space-y-2">
                                        {appearanceSettings?.logo && (
                                            <Image src={appearanceSettings.logo} alt="Logo" width={40} height={40} className="mx-auto" />
                                        )}
                                        <h4 className="text-xl font-semibold">{appearanceSettings?.siteName}</h4>
                                    </div>
                                    <Separator />
                                    <p className="text-sm text-muted-foreground italic">{reportBody || t('tasks.dialog.report_no_intro_text')}</p>
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
                                                        <li className="italic">{t('tasks.dialog.report_no_tasks_in_list')}</li>
                                                    )}
                                                </ul>
                                            </div>
                                            );
                                        })}
                                    </div>
                                    <Separator />
                                    <p className="text-xs text-center text-muted-foreground">
                                        {t('tasks.dialog.report_automated_note', { day: weeklyReportForm.getValues('dayOfWeek') ? weekDays[parseInt(weeklyReportForm.getValues('dayOfWeek'))] : '', time: weeklyReportForm.getValues('time') })}
                                    </p>
                                </div>
                            </div>
                           <DialogFooter className="md:col-span-2">
                                <DialogClose asChild><Button type="button" variant="ghost">{t('common.cancel')}</Button></DialogClose>
                                <Button type="submit">{editingReport ? t('common.save_changes') : t('tasks.dialog.report_save_button')}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={isReportManagerOpen} onOpenChange={setIsReportManagerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('tasks.dialog.my_reports_title')}</DialogTitle>
                        <DialogDescription>{t('tasks.dialog.my_reports_desc')}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-2">
                            {scheduledReports.filter(r => r.boardId === activeBoardId && r.createdBy === currentUser.id).map(report => {
                                const nextRun = nextDay(new Date(), report.schedule.dayOfWeek as Day);
                                const [hours, minutes] = report.schedule.time.split(':');
                                nextRun.setHours(Number(hours), Number(minutes), 0, 0);

                                return (
                                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="font-semibold">{report.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('tasks.report_types.weekly')} {t(`tasks.report_types.${report.type}`)} &bull; {t('tasks.dialog.my_reports_next_run', { date: format(nextRun, 'MMM d, yyyy')})}
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
                                                <p className="text-xs text-muted-foreground">{t(`tasks.permissions.${share.role}`)}</p>
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
                                        <DropdownMenuLabel>{t('tasks.dialog.all_members')}</DropdownMenuLabel>
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
                                                        <p className="text-xs text-muted-foreground">{t(`tasks.permissions.${share.role}`)}</p>
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
                                    <p>{t('tasks.share_board')}</p>
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
                            <p>{t('tasks.email_reports')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('tasks.dialog.new_report_label')}</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleOpenReportDialog('weekly-board-summary')}>{t('tasks.report_types.weekly-board-summary')}</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleOpenReportDialog('weekly-my-tasks')}>{t('tasks.report_types.weekly-my-tasks')}</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleOpenReportDialog('weekly-in-progress')}>{t('tasks.report_types.weekly-in-progress')}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setIsReportManagerOpen(true)}>
                                <ListVideo className="mr-2 h-4 w-4" />
                                {t('tasks.dialog.view_scheduled_reports')}
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
                                        {t('tasks.export_selected', { count: selectedTaskIds.length })}
                                    </Button>
                                )}
                                <Button onClick={() => handleOpenTaskDialog(null)} disabled={userPermissions === 'viewer'}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    {t('tasks.add_new_task')}
                                </Button>
                            </div>
                        </div>
                         {viewMode === 'list' && (
                            <div className="flex flex-wrap items-center gap-2 pt-4">
                                <Input
                                    placeholder={t('tasks.search_placeholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="max-w-sm"
                                />
                                {currentUser.role === 'super-admin' && (
                                    <Select value={filters.unit} onValueChange={(value) => setFilters(prev => ({ ...prev, unit: value }))}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder={t('users.filter_unit_placeholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('users.filter_all_units')}</SelectItem>
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
                                            {t('tasks.filter_by_tags')}
                                            {filters.tags.length > 0 && <span className="ml-2 rounded-full bg-primary px-2 text-xs text-primary-foreground">{filters.tags.length}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-0">
                                        <Command>
                                            <CommandInput placeholder={t('tasks.filter_tags_placeholder')} />
                                            <CommandList>
                                                <CommandEmpty>{t('tasks.no_tags_found')}</CommandEmpty>
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
                                            <TableHead className="w-[60px] text-center border-r">{t('tasks.table.done')}</TableHead>
                                            <TableHead>
                                                <Button variant="ghost" onClick={() => handleSort('title')}>
                                                    {t('tasks.table.task')}
                                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>
                                                 <Button variant="ghost" onClick={() => handleSort('columnId')}>
                                                    {t('tasks.table.status')}
                                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>
                                                <Button variant="ghost" onClick={() => handleSort('priority')}>
                                                    {t('tasks.table.priority')}
                                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>{t('tasks.table.assigned_to')}</TableHead>
                                            <TableHead>
                                                <Button variant="ghost" onClick={() => handleSort('dueDate')}>
                                                    {t('tasks.table.next_due')}
                                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </TableHead>
                                            <TableHead>{t('tasks.table.recurrence')}</TableHead>
                                            <TableHead>{t('tasks.table.info')}</TableHead>
                                            <TableHead><span className="sr-only">{t('common.actions')}</span></TableHead>
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
                                                <TableRow key={task.id} data-state={selectedTaskIds.includes(task.id)} className={cn(isCompleted && 'text-muted-foreground line-through')}>
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
                                                                            <p>{t('tasks.tooltips.assigned_to', { name: user.name })}</p>
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
                                                                            <p>{t('tasks.tooltips.attachments_count', { count: task.attachments?.length })}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                                {(task.comments?.length || 0) > 0 && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>{t('tasks.tooltips.has_comments')}</p>
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
                                                                            <p>{t('tasks.tooltips.checklist_progress')}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">{t('common.toggle_menu')}</span></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                                                <DropdownMenuItem onSelect={() => { handleOpenTaskDialog(task);}} disabled={userPermissions === 'viewer'}>{t('common.edit')}</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => { handleOpenDetailsSheet(task); }}>{t('tasks.details.view_details')}</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => { handleOpenMoveDialog(task); }} disabled={userPermissions === 'viewer'}>
                                                                    <Move className="mr-2 h-4 w-4" />
                                                                    {t('tasks.actions.move_task')}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => { handleAddToCalendar(task); }}>
                                                                    <CalendarPlus className="mr-2 h-4 w-4" />
                                                                    {t('tasks.actions.add_to_calendar')}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onSelect={() => { handleDelete(task.id); }} className="text-destructive" disabled={userPermissions !== 'owner'}>{t('common.delete')}</DropdownMenuItem>
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
                                                        <p className="font-semibold">{t('tasks.no_tasks_found')}</p>
                                                        <p className="text-muted-foreground text-sm">{t('tasks.no_tasks_found_desc')}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : viewMode === 'board' ? (
                            <div className="flex gap-4 overflow-x-auto pb-4">
                               {activeBoard?.columns.filter(c => !c.isArchived).map(column => {
                                   const columnSort = columnSorting[column.id];
                                   let tasksInColumn = filteredTasks.filter(t => t.columnId === column.id);

                                    if (columnSort) {
                                        tasksInColumn.sort((a, b) => {
                                            const { field, direction } = columnSort;
                                            const dir = direction === 'asc' ? 1 : -1;

                                            if (field === 'priority') {
                                                const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                                                const priorityA = priorityOrder[a.priority || 'medium'];
                                                const priorityB = priorityOrder[b.priority || 'medium'];
                                                return (priorityA - priorityB) * dir;
                                            }

                                            if (field === 'dueDate') {
                                                return (parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()) * dir;
                                            }

                                            // Default to title sort
                                            return a.title.localeCompare(b.title) * dir;
                                        });
                                    }

                                   return (
                                   <div key={column.id} className="w-72 flex-shrink-0">
                                        <div 
                                            id={column.id}
                                            onDrop={(e) => handleDropOnColumn(e, column.id)}
                                            onDragOver={handleDragOverColumn}
                                            onDragLeave={handleDragLeaveColumn}
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
                                                    <div className='flex items-center gap-2'>
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
                                                        </h3>
                                                        <span className="text-sm font-normal text-muted-foreground">
                                                                {tasksInColumn.length}
                                                        </span>
                                                        {columnSort && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        {columnSort.direction === 'asc' ? <SortAsc className="h-4 w-4 text-muted-foreground" /> : <SortDesc className="h-4 w-4 text-muted-foreground" />}
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{t('tasks.tooltips.sorted_by', { field: t(`tasks.board.sort_${columnSort.field}`), direction: columnSort.direction })}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={userPermissions === 'viewer'}>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuLabel>{t('tasks.board.list_actions')}</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => handleOpenTaskDialog(null, column.id)}>
                                                            <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.board.add_new_task')}
                                                        </DropdownMenuItem>
                                                         <DropdownMenuSub>
                                                            <DropdownMenuSubTrigger>
                                                                <SortAsc className="mr-2 h-4 w-4" />
                                                                <span>{t('tasks.board.sort_by')}</span>
                                                            </DropdownMenuSubTrigger>
                                                            <DropdownMenuPortal>
                                                                <DropdownMenuSubContent>
                                                                    <DropdownMenuRadioGroup 
                                                                        value={columnSort?.field} 
                                                                        onValueChange={(field) => handleColumnSort(column.id, field as SortableTaskField)}
                                                                    >
                                                                        <DropdownMenuRadioItem value="dueDate">{t('tasks.board.sort_due_date')}</DropdownMenuRadioItem>
                                                                        <DropdownMenuRadioItem value="priority">{t('tasks.board.sort_priority')}</DropdownMenuRadioItem>
                                                                        <DropdownMenuRadioItem value="title">{t('tasks.board.sort_title')}</DropdownMenuRadioItem>
                                                                    </DropdownMenuRadioGroup>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuPortal>
                                                        </DropdownMenuSub>
                                                        <DropdownMenuItem onSelect={() => handleOpenCopyColumnDialog(column)}>
                                                            <Copy className="mr-2 h-4 w-4" /> {t('tasks.board.copy_list')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onSelect={() => handleArchiveColumn(column.id)}
                                                        >
                                                            <Archive className="mr-2 h-4 w-4" /> {t('tasks.board.archive_list')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="space-y-2 px-1 max-h-[calc(100vh-28rem)] min-h-[24rem] overflow-y-auto">
                                                {tasksInColumn.map(renderTaskCard)}
                                            </div>
                                        </div>
                                   </div>
                                )})}
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
                                                                    <Input autoFocus placeholder={t('tasks.board.enter_list_title')} {...field} className="h-9"/>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Button type="submit" size="sm">{t('tasks.board.add_list')}</Button>
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
                                            {t('tasks.board.add_another_list')}
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
                                    <Button variant="outline" onClick={goToToday}>{t('tasks.calendar.today_button')}</Button>
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
                                                                                            <p>{t('tasks.tooltips.assigned_to', { name: user.name })}</p>
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
                                                        {t('tasks.archived.tasks_in_list', { count: tasks.filter(t => t.columnId === column.id).length })}
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleRestoreColumn(column.id)}>
                                                        <ArchiveRestore className="mr-2 h-4 w-4" />
                                                        {t('tasks.archived.restore_button')}
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => { setColumnToDelete(column); setIsDeleteColumnAlertOpen(true); }}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {t('tasks.archived.delete_permanently_button')}
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground py-10">
                                        <Archive className="mx-auto h-12 w-12" />
                                        <p className="mt-4 font-semibold">{t('tasks.archived.no_archived_lists_title')}</p>
                                        <p>{t('tasks.archived.no_archived_lists_desc')}</p>
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
                        <DialogTitle>{editingTask ? t('tasks.dialog.task_edit_title') : t('tasks.dialog.task_add_title')}</DialogTitle>
                        <DialogDescription>
                            {t('tasks.dialog.task_add_desc')}
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
                                            <FormLabel>{t('tasks.dialog.title_label')}</FormLabel>
                                            <FormControl><Input placeholder={t('tasks.dialog.title_placeholder')} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="columnId"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('tasks.dialog.list_status_label')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder={t('tasks.dialog.list_status_placeholder')} /></SelectTrigger>
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
                                            <FormLabel>{t('tasks.dialog.tags_label')}</FormLabel>
                                            <FormControl><Input placeholder={t('tasks.dialog.tags_placeholder')} {...field} /></FormControl>
                                            <FormDescription>
                                                {t('tasks.dialog.tags_desc')}
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
                                        <FormLabel>{t('tasks.dialog.priority_label')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="low">{t('tasks.priority.low')}</SelectItem>
                                            <SelectItem value="medium">{t('tasks.priority.medium')}</SelectItem>
                                            <SelectItem value="high">{t('tasks.priority.high')}</SelectItem>
                                            <SelectItem value="critical">{t('tasks.priority.critical')}</SelectItem>
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
                                            <FormLabel>{t('tasks.dialog.description_label')}</FormLabel>
                                            <FormControl><Textarea placeholder={t('tasks.dialog.description_placeholder')} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('users.dialog.unit')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={currentUser.role === 'admin'}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder={t('users.dialog.select_unit')} /></SelectTrigger>
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
                                            <FormLabel>{t('tasks.dialog.assign_to_label')}</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start font-normal" disabled={usersOnBoard.length === 0}>
                                                        {field.value && field.value.length > 0
                                                            ? t('tasks.dialog.users_selected', { count: field.value.length })
                                                            : t('tasks.dialog.assign_to_placeholder')}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command>
                                                        <CommandInput placeholder={t('users.search_placeholder')} />
                                                        <CommandList>
                                                            <CommandEmpty>{t('tasks.dialog.no_users_on_board')}</CommandEmpty>
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
                                        <FormLabel>{t('tasks.dialog.recurrence_label')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">{t('tasks.recurrence_types.none')}</SelectItem>
                                            <SelectItem value="daily">{t('tasks.recurrence_types.daily_short')}</SelectItem>
                                            <SelectItem value="weekly">{t('tasks.recurrence_types.weekly_short')}</SelectItem>
                                            <SelectItem value="monthly">{t('tasks.recurrence_types.monthly_short')}</SelectItem>
                                            <SelectItem value="yearly">{t('tasks.recurrence_types.yearly_short')}</SelectItem>
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
                                                {recurrenceType === 'none' ? t('tasks.dialog.date_label') : t('tasks.dialog.start_date_label')}
                                            </FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP") : <span>{t('contracts.dialog.pick_date_placeholder')}</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormDescription>
                                                {t('tasks.dialog.start_date_desc')}
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
                                                <FormLabel>{t('tasks.dialog.day_of_week_label')}</FormLabel>
                                                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value)}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder={t('tasks.dialog.day_of_week_placeholder')}/></SelectTrigger></FormControl>
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
                                                <FormLabel>{t('tasks.dialog.day_of_month_label')}</FormLabel>
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
                                            <FormLabel>{t('tasks.dialog.time_label')}</FormLabel>
                                            <FormControl><Input type="time" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4 md:col-span-2">
                                    <div>
                                        <FormLabel>{t('tasks.dialog.reminders_label')}</FormLabel>
                                        <FormDescription className="mb-2">{t('tasks.dialog.reminders_desc')}</FormDescription>
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
                                                    <span className="text-sm text-muted-foreground">{t('tasks.dialog.days_before')}</span>
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
                                        {t('tasks.dialog.add_reminder_button')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-4 md:col-span-2">
                                    <div>
                                        <FormLabel>{t('tasks.dialog.checklist_label')}</FormLabel>
                                        <FormDescription className="mb-2">{t('tasks.dialog.checklist_desc')}</FormDescription>
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
                                                            <FormControl><Input placeholder={t('tasks.dialog.checklist_item_placeholder')} {...field} /></FormControl>
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
                                            {t('tasks.dialog.add_checklist_item_button')}
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="md:col-span-2 space-y-4">
                                  <FormField
                                      control={form.control}
                                      name="attachments"
                                      render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>{t('contracts.dialog.attachments_label')}</FormLabel>
                                          <FormControl>
                                          <div className="relative">
                                              <Button type="button" variant="outline" asChild>
                                              <label htmlFor="task-file-upload" className="cursor-pointer w-full flex items-center justify-center gap-2">
                                                  <Upload className="h-4 w-4"/>
                                                  <span>{ attachedFiles.length > 0 ? t('contracts.dialog.files_selected', { count: attachedFiles.length }) : t('contracts.dialog.select_files_button')}</span>
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
                                      <p className="text-sm font-medium">{t('contracts.dialog.new_files_label')}</p>
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
                                        <p className="text-sm font-medium">{t('contracts.dialog.current_attachments_label')}</p>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                            {editingTask.attachments.map((file, index) => (
                                            <li key={index} className="flex items-center gap-2">
                                                <Paperclip className="h-4 w-4" />
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                                            </li>
                                            ))}
                                        </ul>
                                        <p className="text-xs text-muted-foreground">{t('contracts.dialog.replace_attachments_note')}</p>
                                     </div>
                                  )}
                              </div>

                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">{t('common.cancel')}</Button></DialogClose>
                                <Button type="submit">{editingTask ? t('common.save_changes') : t('tasks.dialog.create_task_button')}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

             <Sheet open={isDetailsSheetOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDetailsSheet()}>
                <SheetContent className="flex flex-col sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>{t('tasks.details.title', { name: selectedTaskForDetails?.title })}</SheetTitle>
                        <SheetDescription>
                            {t('tasks.details.task_id', { id: selectedTaskForDetails?.id })}
                        </SheetDescription>
                    </SheetHeader>
                    <Tabs defaultValue="comments" className="flex-1 flex flex-col min-h-0">
                         <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="checklist">{t('tasks.details.tabs.checklist')}</TabsTrigger>
                            <TabsTrigger value="comments">{t('tasks.details.tabs.comments')}</TabsTrigger>
                            <TabsTrigger value="attachments">{t('tasks.details.tabs.attachments')}</TabsTrigger>
                             <TabsTrigger value="activity">{t('tasks.details.tabs.activity')}</TabsTrigger>
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
                                        <p className="mt-4">{t('tasks.details.no_checklist_title')}</p>
                                        <p>{t('tasks.details.no_checklist_desc')}</p>
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
                                        <p className="mt-4">{t('contracts.details.no_comments_title')}</p>
                                        <p>{t('contracts.details.no_comments_desc')}</p>
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
                                                <Textarea placeholder={t('contracts.details.comment_placeholder')} {...field} className="min-h-[60px]" />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                        <Button type="submit" disabled={userPermissions === 'viewer'}>{t('contracts.details.post_comment_button')}</Button>
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
                                        <p className="mt-4">{t('tasks.details.no_attachments_title')}</p>
                                        <p>{t('tasks.details.no_attachments_desc')}</p>
                                    </div>
                                 )}
                            </div>
                        </TabsContent>
                        <TabsContent value="activity" className="flex-1 overflow-y-auto">
                           <div className="space-y-4 py-4">
                                {(selectedTaskForDetails?.logs || []).length > 0 ? (
                                    [...(selectedTaskForDetails?.logs || [])].reverse().map(renderLog)
                                ) : (
                                    <div className="text-center text-muted-foreground py-10 h-full flex flex-col items-center justify-center">
                                        <History className="mx-auto h-12 w-12" />
                                        <p className="mt-4">{t('tasks.details.no_activity_title')}</p>
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


    




    
