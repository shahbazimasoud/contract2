
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PlusCircle, MoreHorizontal, ClipboardCheck, Calendar as CalendarIcon, X, Users as UsersIcon, MessageSquare, CalendarPlus, Download, CheckCircle, ArrowUpDown, Tag, Palette, Settings, Trash2, Edit, Share2, ListChecks, Paperclip, Upload, Move, List, LayoutGrid, Archive, ArchiveRestore, Calendar as CalendarViewIcon, ChevronLeft, ChevronRight, Copy, Mail, SlidersHorizontal, ListVideo, PencilRuler, ChevronsUpDown, Check, SortAsc, SortDesc, History, SmilePlus } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday, nextDay, Day } from 'date-fns';
import * as ics from 'ics';
import { useRouter } from "next/navigation";
import Link from "next/link";
import DatePicker, { DateObject } from "react-multi-date-picker"
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";


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
import type { Task, User, Comment, TaskBoard, BoardShare, BoardPermissionRole, ChecklistItem, BoardColumn, AppearanceSettings, ScheduledReport, ScheduledReportType, ActivityLog, Reaction, Label as LabelType } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"
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
import { useCalendar } from '@/context/calendar-context';
import { Search } from 'lucide-react';


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
    labelIds: z.array(z.string()).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    dueDate: z.any({ required_error: "Date is required" }),
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

const labelSchema = z.object({
    text: z.string().min(1, "Label text is required."),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
});


const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultColors = ["#3b82f6", "#ef4444", "#10b981", "#eab308", "#8b5cf6", "#f97316"];


export default function TasksPage() {
    const { t } = useLanguage();
    const { calendar, locale, format, formatDistance, dateFnsLocale } = useCalendar();
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
    const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
    
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
    
    const [editingLabel, setEditingLabel] = useState<LabelType | null>(null);
    const [labelToDelete, setLabelToDelete] = useState<LabelType | null>(null);

    const { toast } = useToast();
    const [usersOnBoard, setUsersOnBoard] = useState<User[]>([]);
    
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [taskLabelInput, setTaskLabelInput] = useState('');

    const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);

    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    
    // Filtering and Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', unit: 'all', labelIds: [] as string[], priority: 'all' });
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
            labelIds: [],
            priority: 'medium',
            dueDate: new Date(),
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

    const labelForm = useForm<z.infer<typeof labelSchema>>({
        resolver: zodResolver(labelSchema),
        defaultValues: {
            text: "",
            color: defaultColors[0],
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
        const defaultUnit = currentUser?.unit || "";
        const activeColumns = activeBoard.columns.filter(c => !c.isArchived);

        if (editingTask) {
            form.reset({
                title: editingTask.title,
                description: editingTask.description,
                unit: editingTask.unit,
                columnId: editingTask.columnId,
                assignees: editingTask.assignees,
                labelIds: editingTask.labelIds || [],
                priority: editingTask.priority || 'medium',
                dueDate: new DateObject({ date: editingTask.dueDate, calendar: calendar, locale: locale }),
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
                labelIds: [],
                priority: 'medium',
                dueDate: new DateObject({ calendar, locale }),
                recurrenceType: 'none',
                time: "09:00",
                reminders: [{ days: 1 }],
                checklist: [],
                attachments: [],
                isCompleted: false,
            });
        }
    }, [editingTask, form, currentUser, activeBoard, calendar, locale]);

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
        if (isLabelManagerOpen && editingLabel) {
            labelForm.reset({
                text: editingLabel.text,
                color: editingLabel.color,
            });
        } else {
            labelForm.reset({
                text: "",
                color: defaultColors[0],
            });
        }
    }, [isLabelManagerOpen, editingLabel, labelForm]);


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
    }, [newColumnFormRef]);

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
        if (!task && columnId && activeBoard && currentUser) {
            const defaultUnit = currentUser?.unit || "";
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

    const onTaskSubmit = (values: z.infer<typeof taskSchema>) => {
        if (!currentUser || !activeBoard) return;

        const dueDateObj = values.dueDate as DateObject;
        const [hours, minutes] = values.time.split(':').map(Number);
        const finalDueDate = dueDateObj.toDate();
        finalDueDate.setHours(hours, minutes);

        if (editingTask) {
            const updatedTask: Task = {
                ...editingTask,
                ...values,
                dueDate: finalDueDate.toISOString(),
                reminders: values.reminders.map(r => r.days),
                recurrence: {
                    type: values.recurrenceType,
                    time: values.time,
                    dayOfWeek: values.dayOfWeek,
                    dayOfMonth: values.dayOfMonth,
                },
                attachments: attachedFiles.length > 0 ? attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })) : editingTask.attachments,
                labelIds: values.labelIds || [],
                logs: [...(editingTask.logs || []), createLogEntry('updated', { title: values.title })],
            };
            setTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t));

            // If column changed, update board columns
            if (editingTask.columnId !== values.columnId) {
                const updatedBoards = boards.map(b => {
                    if (b.id === activeBoard.id) {
                        const newColumns = b.columns.map(col => {
                            if (col.id === editingTask.columnId) {
                                return { ...col, taskIds: (col.taskIds || []).filter(id => id !== editingTask.id) };
                            }
                            if (col.id === values.columnId) {
                                return { ...col, taskIds: [...(col.taskIds || []), editingTask.id] };
                            }
                            return col;
                        });
                        return { ...b, columns: newColumns };
                    }
                    return b;
                });
                setBoards(updatedBoards);
            }

            toast({ title: t('tasks.toast.task_updated_title'), description: t('tasks.toast.task_updated_desc', { name: updatedTask.title }) });
        } else {
             const newTaskId = `T-${Date.now()}`;
             const newTask: Task = {
                id: newTaskId,
                boardId: activeBoard.id,
                ...values,
                dueDate: finalDueDate.toISOString(),
                reminders: values.reminders.map(r => r.days),
                createdBy: currentUser.name,
                recurrence: {
                    type: values.recurrenceType,
                    time: values.time,
                    dayOfWeek: values.dayOfWeek,
                    dayOfMonth: values.dayOfMonth,
                },
                attachments: attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })),
                isArchived: false,
                isCompleted: false,
                comments: [],
                checklist: values.checklist || [],
                logs: [createLogEntry('created', { title: values.title })],
                reactions: [],
                labelIds: values.labelIds || [],
            };
            setTasks([newTask, ...tasks]);
            
            const updatedBoard = {
                ...activeBoard,
                columns: activeBoard.columns.map(col => 
                    col.id === values.columnId ? { ...col, taskIds: [newTaskId, ...(col.taskIds || [])] } : col
                )
            };
            setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));

            toast({ title: t('tasks.toast.task_created_title'), description: t('tasks.toast.task_created_desc', { name: newTask.title }) });
        }
        handleCloseTaskDialog();
    };
    
    const handleToggleTaskCompletion = (taskId: string, isCompleted: boolean) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task || !currentUser) return;
        
        const log = createLogEntry(isCompleted ? 'completed_task' : 'uncompleted_task', { title: task.title });
        const updatedTasks = tasks.map(t =>
            t.id === taskId ? { ...t, isCompleted, logs: [...(t.logs || []), log] } : t
        );
        setTasks(updatedTasks);
        toast({
            title: isCompleted ? t('tasks.toast.task_completed_title') : t('tasks.toast.task_incomplete_title'),
            description: t('tasks.toast.task_status_updated_desc', { name: task.title }),
        });
    };

    const handleDeleteTask = (taskId: string) => {
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;
        
        setTasks(tasks.filter(t => t.id !== taskId));
        
        // Remove task id from its column
        const updatedBoards = boards.map(b => {
            if (b.id === taskToDelete.boardId) {
                return {
                    ...b,
                    columns: b.columns.map(col => ({
                        ...col,
                        taskIds: (col.taskIds || []).filter(id => id !== taskId)
                    }))
                };
            }
            return b;
        });
        setBoards(updatedBoards);
        
        toast({
            title: t('tasks.toast.task_deleted_title'),
            description: t('tasks.toast.task_deleted_desc'),
            variant: "destructive"
        });
        setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    };
    
    const handleMoveTask = () => {
        if (!movingTask || !moveTargetBoardId) return;
        
        const targetBoard = boards.find(b => b.id === moveTargetBoardId);
        if (!targetBoard) return;
        
        const targetColumn = targetBoard.columns.find(c => !c.isArchived);
        if (!targetColumn) {
            toast({ title: t('common.error'), description: t('tasks.toast.move_no_columns_error'), variant: 'destructive'});
            return;
        }

        // 1. Remove task from old board's column
        const sourceBoard = boards.find(b => b.id === movingTask.boardId)!;
        const updatedSourceBoard = {
            ...sourceBoard,
            columns: sourceBoard.columns.map(col => ({
                ...col,
                taskIds: (col.taskIds || []).filter(id => id !== movingTask.id)
            }))
        };

        // 2. Add task to new board's first column
        const updatedTargetBoard = {
            ...targetBoard,
            columns: targetBoard.columns.map(col => 
                col.id === targetColumn.id ? { ...col, taskIds: [movingTask.id, ...(col.taskIds || [])] } : col
            )
        };
        
        setBoards(boards.map(b => {
            if (b.id === sourceBoard.id) return updatedSourceBoard;
            if (b.id === targetBoard.id) return updatedTargetBoard;
            return b;
        }));

        // 3. Update the task itself
        const log = createLogEntry('moved_task', { from: sourceBoard.name, to: targetBoard.name });
        const updatedTask = { ...movingTask, boardId: targetBoard.id, columnId: targetColumn.id, logs: [...(movingTask.logs || []), log] };
        setTasks(tasks.map(t => t.id === movingTask.id ? updatedTask : t));
        
        toast({ title: t('tasks.toast.task_moved_title'), description: t('tasks.toast.task_moved_desc', { task: movingTask.title, board: targetBoard.name })});
        handleCloseMoveDialog();
    };

    const handleExportSelected = () => {
        if (selectedTaskIds.length === 0) {
            toast({ title: t('tasks.toast.no_tasks_selected_title'), description: t('tasks.toast.no_tasks_selected_desc'), variant: "destructive" });
            return;
        }

        const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
        const events = selectedTasks.map(task => {
            const date = parseISO(task.dueDate);
            return {
                title: task.title,
                description: task.description,
                start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()] as ics.DateArray,
                duration: { hours: 1 },
                status: 'CONFIRMED' as const,
                organizer: { name: currentUser?.name || 'ContractWise', email: currentUser?.email || 'noreply@contractwise.com' },
                attendees: (task.assignees || []).map(id => {
                    const user = mockUsers.find(u => u.id === id);
                    return { name: user?.name, email: user?.email || '', rsvp: true };
                }).filter(u => u.email),
            };
        });

        const { error, value } = ics.createEvents(events);

        if (error) {
            toast({ title: t('common.error'), description: t('tasks.toast.ics_error_desc'), variant: "destructive" });
            return;
        }

        const blob = new Blob([value || ''], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'tasks.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const onBoardSubmit = (values: z.infer<typeof boardSchema>) => {
      if(!currentUser) return;

      if (editingBoard) {
        const updatedBoard = { ...editingBoard, ...values };
        setBoards(boards.map(b => b.id === editingBoard.id ? updatedBoard : b));
        toast({ title: t('tasks.toast.board_updated_title'), description: t('tasks.toast.board_updated_desc', { name: updatedBoard.name }) });
      } else {
         const newBoardId = `TB-${Date.now()}`;
         const newBoard: TaskBoard = {
            id: newBoardId,
            name: values.name,
            color: values.color,
            ownerId: currentUser.id,
            sharedWith: [],
            columns: [
                { id: `COL-${Date.now()}-1`, title: t('tasks.column_titles.todo'), boardId: newBoardId, isArchived: false, taskIds: [] },
                { id: `COL-${Date.now()}-2`, title: t('tasks.column_titles.in_progress'), boardId: newBoardId, isArchived: false, taskIds: [] },
                { id: `COL-${Date.now()}-3`, title: t('tasks.column_titles.done'), boardId: newBoardId, isArchived: false, taskIds: [] },
            ],
            labels: [],
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
            taskIds: [],
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
      const tasksToCopy = tasks.filter(t => t.columnId === columnToCopy.id);
      
      const newTasks: Task[] = tasksToCopy.map(task => ({
        ...task,
        id: `T-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        columnId: newColumnId,
        isCompleted: false, // Reset completion status on copy
      }));

      const newColumn: BoardColumn = {
        id: newColumnId,
        title: values.title,
        boardId: activeBoard.id,
        isArchived: false,
        taskIds: newTasks.map(t => t.id),
      };

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
        
        setSharingBoard({ ...sharingBoard, sharedWith: newSharedWith }); // Update local state for immediate UI feedback
    };

    const handleRemoveShare = (userId: string) => {
        if (!sharingBoard) return;
        const newSharedWith = (sharingBoard.sharedWith || []).filter(s => s.userId !== userId);
        setSharingBoard({ ...sharingBoard, sharedWith: newSharedWith });
    };
    
    const onSaveShare = () => {
        if (!sharingBoard) return;
        setBoards(boards.map(b => b.id === sharingBoard.id ? sharingBoard : b));
        toast({ title: t('tasks.toast.sharing_updated_title'), description: t('tasks.toast.sharing_updated_desc') });
        handleCloseShareDialog();
    };

    const onCommentSubmit = (values: z.infer<typeof commentSchema>) => {
        if (!currentUser || !selectedTaskForDetails) return;

        const newComment: Comment = {
            id: `CMT-${Date.now()}`,
            text: values.text,
            author: currentUser.name,
            authorId: currentUser.id,
            createdAt: new Date().toISOString(),
        };

        const updatedTask = {
            ...selectedTaskForDetails,
            comments: [...(selectedTaskForDetails.comments || []), newComment],
            logs: [...(selectedTaskForDetails.logs || []), createLogEntry('commented', { text: values.text })],
        };

        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        setSelectedTaskForDetails(updatedTask);
        commentForm.reset();
        toast({
            title: t('tasks.toast.comment_added_title'),
            description: t('tasks.toast.comment_added_desc'),
        });
    };
    
    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId, type } = result;

        if (!destination || !activeBoard) {
            return;
        }

        if (type === 'COLUMN') {
            const newColumnOrder = Array.from(activeBoard.columns);
            const [reorderedItem] = newColumnOrder.splice(source.index, 1);
            newColumnOrder.splice(destination.index, 0, reorderedItem);

            const updatedBoard = { ...activeBoard, columns: newColumnOrder };
            setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
            return;
        }

        const startColumn = activeBoard.columns.find(c => c.id === source.droppableId);
        const finishColumn = activeBoard.columns.find(c => c.id === destination.droppableId);

        if (!startColumn || !finishColumn) return;

        if (startColumn === finishColumn) {
            // Moving within the same column
            const newTaskIds = Array.from(startColumn.taskIds || []);
            const [reorderedItem] = newTaskIds.splice(source.index, 1);
            newTaskIds.splice(destination.index, 0, reorderedItem);

            const newColumn = { ...startColumn, taskIds: newTaskIds };
            const newBoard = {
                ...activeBoard,
                columns: activeBoard.columns.map(c => c.id === newColumn.id ? newColumn : c)
            };
            setBoards(boards.map(b => b.id === newBoard.id ? newBoard : b));
            return;
        }

        // Moving from one column to another
        const startTaskIds = Array.from(startColumn.taskIds || []);
        startTaskIds.splice(source.index, 1);
        const newStartColumn = { ...startColumn, taskIds: startTaskIds };

        const finishTaskIds = Array.from(finishColumn.taskIds || []);
        finishTaskIds.splice(destination.index, 0, draggableId);
        const newFinishColumn = { ...finishColumn, taskIds: finishTaskIds };

        const newBoard = {
            ...activeBoard,
            columns: activeBoard.columns.map(c => {
                if (c.id === newStartColumn.id) return newStartColumn;
                if (c.id === newFinishColumn.id) return newFinishColumn;
                return c;
            })
        };
        setBoards(boards.map(b => b.id === newBoard.id ? newBoard : b));

        // Update the task itself
        const task = tasks.find(t => t.id === draggableId);
        if (task) {
            const log = createLogEntry('moved_column', { from: startColumn.title, to: finishColumn.title });
            const updatedTask = { ...task, columnId: finishColumn.id, logs: [...(task.logs || []), log] };
            setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        }
    };
    
     const handleWeeklyReportSubmit = (values: z.infer<typeof weeklyReportSchema>) => {
        if (!activeBoard || !currentUser) return;
        const recipients = values.recipients.split(',').map(e => e.trim());
        if (editingReport) {
            // Update
            const updatedReport: ScheduledReport = {
                ...editingReport,
                name: values.name,
                schedule: { dayOfWeek: parseInt(values.dayOfWeek, 10), time: values.time },
                recipients: recipients,
                subject: values.subject,
                body: values.body,
            };
            setScheduledReports(prev => prev.map(r => r.id === editingReport.id ? updatedReport : r));
            toast({ title: t('tasks.toast.report_updated_title'), description: t('tasks.toast.report_updated_desc', { name: values.name }) });
        } else {
            // Create
            const newReport: ScheduledReport = {
                id: `SR-${Date.now()}`,
                boardId: activeBoard.id,
                name: values.name,
                type: reportConfigType!,
                schedule: { dayOfWeek: parseInt(values.dayOfWeek, 10), time: values.time },
                recipients: recipients,
                subject: values.subject,
                body: values.body,
                createdBy: currentUser.id,
            };
            setScheduledReports(prev => [...prev, newReport]);
            toast({ title: t('tasks.toast.report_scheduled_title'), description: t('tasks.toast.report_scheduled_desc', { name: values.name }) });
        }
        setIsWeeklyReportDialogOpen(false);
    };

    const handleDeleteReport = () => {
        if (!reportToDelete) return;
        setScheduledReports(prev => prev.filter(r => r.id !== reportToDelete.id));
        toast({ title: t('tasks.toast.report_deleted_title'), description: t('tasks.toast.report_deleted_desc', { name: reportToDelete.name }) });
        setReportToDelete(null);
    }
    
     const onLabelSubmit = (values: z.infer<typeof labelSchema>) => {
        if (!activeBoard) return;
        
        let updatedLabels = [...(activeBoard.labels || [])];
        if (editingLabel) {
            updatedLabels = updatedLabels.map(l => l.id === editingLabel.id ? { ...l, ...values } : l);
            toast({ title: t('tasks.toast.label_updated', { name: values.text }) });
        } else {
            const newLabel: LabelType = { id: `LBL-${Date.now()}`, ...values };
            updatedLabels.push(newLabel);
            toast({ title: t('tasks.toast.label_created', { name: values.text }) });
        }
        
        const updatedBoard = { ...activeBoard, labels: updatedLabels };
        setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        setEditingLabel(null);
        labelForm.reset({ text: '', color: defaultColors[0] });
    };

    const handleDeleteLabel = () => {
        if (!labelToDelete || !activeBoard) return;

        const updatedBoard = {
            ...activeBoard,
            labels: (activeBoard.labels || []).filter(l => l.id !== labelToDelete.id),
        };
        setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));

        const updatedTasks = tasks.map(task => ({
            ...task,
            labelIds: (task.labelIds || []).filter(id => id !== labelToDelete.id)
        }));
        setTasks(updatedTasks);
        
        toast({ title: t('tasks.toast.label_deleted') });
        setLabelToDelete(null);
    };
    
    const handleAddReaction = (taskId: string, emoji: string) => {
        if (!currentUser) return;
        setTasks(prevTasks => prevTasks.map(task => {
            if (task.id === taskId) {
                const existingReactionIndex = (task.reactions || []).findIndex(r => r.userId === currentUser.id && r.emoji === emoji);
                let newReactions = [...(task.reactions || [])];
                
                if (existingReactionIndex > -1) {
                    // User is removing their existing reaction
                    newReactions.splice(existingReactionIndex, 1);
                } else {
                    // Add new reaction
                    newReactions.push({ emoji, userId: currentUser.id, userName: currentUser.name });
                }
                return { ...task, reactions: newReactions };
            }
            return task;
        }));
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

    const renderTaskCard = (task: Task) => (
        <Card
            className="mb-2 cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => handleOpenDetailsSheet(task)}
        >
            <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{task.title}</p>
                    <Checkbox
                        checked={task.isCompleted}
                        onCheckedChange={(checked) => handleToggleTaskCompletion(task.id, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 w-5"
                    />
                </div>
                {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                
                <div className="flex flex-wrap gap-1 mt-2">
                    {(task.labelIds || []).map(labelId => {
                        const label = activeBoard?.labels?.find(l => l.id === labelId);
                        if (!label) return null;
                        return (
                             <Badge key={label.id} style={{ backgroundColor: label.color, color: '#fff' }} className="text-xs px-2 py-0.5 border-transparent">
                                {label.text}
                            </Badge>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center -space-x-2">
                        {(task.assignees || []).map(id => {
                            const user = usersOnBoard.find(u => u.id === id);
                            if (!user) return null;
                            return (
                                <TooltipProvider key={id}>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Avatar className="h-6 w-6 border-2 border-background">
                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t('tasks.tooltips.assigned_to', { name: user.name })}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {(task.comments?.length || 0) > 0 && (
                             <span className="flex items-center gap-1">
                                 <MessageSquare className="h-3 w-3" />
                                 {task.comments?.length}
                             </span>
                        )}
                        {(task.attachments?.length || 0) > 0 && (
                            <span className="flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                {task.attachments?.length}
                            </span>
                        )}
                        {(task.checklist?.length || 0) > 0 && (
                             <span className="flex items-center gap-1">
                                 <ListChecks className="h-3 w-3" />
                                 {task.checklist?.filter(c => c.completed).length}/{task.checklist?.length}
                             </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );


    const filteredTasks = useMemo(() => {
        if (!activeBoard) return [];
        let baseTasks = tasks.filter(t => t.boardId === activeBoard.id);

        if (viewMode !== 'archived') {
            baseTasks = baseTasks.filter(t => !t.isArchived);
        } else {
             baseTasks = baseTasks.filter(t => t.isArchived);
        }
        
        // Apply text search
        if (searchTerm) {
            baseTasks = baseTasks.filter(
                (task) =>
                    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
    
        // Apply label filter
        if (filters.labelIds.length > 0) {
            baseTasks = baseTasks.filter(task => 
                filters.labelIds.every(labelId => (task.labelIds || []).includes(labelId))
            );
        }

        // Apply priority filter
        if (filters.priority !== 'all') {
            baseTasks = baseTasks.filter(c => c.priority === filters.priority);
        }
    
        // Apply sorting for list view
        if (viewMode === 'list') {
            baseTasks.sort((a, b) => {
                const field = sorting.field;
                const direction = sorting.direction === 'asc' ? 1 : -1;
                
                const valA = a[field as keyof Task];
                const valB = b[field as keyof Task];

                if (field === 'dueDate') {
                    return (new Date(valA as string).getTime() - new Date(valB as string).getTime()) * direction;
                }

                if (valA! < valB!) return -1 * direction;
                if (valA! > valB!) return 1 * direction;
                return 0;
            });
        }


        return baseTasks;
  }, [tasks, searchTerm, filters, sorting, viewMode, activeBoard]);


    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startingDayIndex = getDay(start); // 0 for Sunday, 1 for Monday...
        const placeholders = Array.from({ length: startingDayIndex }, (_, i) => ({
            date: null,
            key: `placeholder-${i}`
        }));
        return [...placeholders, ...days.map(d => ({date:d, key: format(d, 'yyyy-MM-dd')}))];
    }, [currentMonth]);

    const tasksByDate = useMemo(() => {
        return filteredTasks.reduce((acc, task) => {
            const dueDate = format(new Date(task.dueDate), 'yyyy-MM-dd');
            if (!acc[dueDate]) {
                acc[dueDate] = [];
            }
            acc[dueDate].push(task);
            return acc;
        }, {} as Record<string, Task[]>);
    }, [filteredTasks]);

    const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
    const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const goToToday = () => setCurrentMonth(new Date());


    if (!currentUser) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <ClipboardCheck className="h-10 w-10 animate-pulse text-muted-foreground" />
                    <p className="text-muted-foreground">Loading Tasks...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <PageHeader className="pb-4">
                <div className="flex items-center justify-between">
                     <Popover open={isBoardSwitcherOpen} onOpenChange={setIsBoardSwitcherOpen}>
                        <PopoverTrigger asChild>
                            <div className="flex items-center gap-3 cursor-pointer">
                                <span className="w-8 h-8 rounded-full" style={{ backgroundColor: activeBoard?.color || '#ccc' }}></span>
                                <div>
                                    <h1 className="text-2xl font-bold">{activeBoard?.name || t('tasks.select_board')}</h1>
                                    <p className="text-sm text-muted-foreground">{activeBoard ? `${t('tasks.board.list_actions')}...` : t('tasks.no_board_found')}</p>
                                </div>
                                <ChevronsUpDown className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0">
                             <Command>
                                <CommandInput placeholder={t('tasks.dialog.board_search_placeholder')} />
                                <CommandList>
                                    <CommandEmpty>{t('tasks.no_board_found')}</CommandEmpty>
                                    <CommandGroup>
                                        {visibleBoards.map((board) => (
                                            <CommandItem
                                                key={board.id}
                                                onSelect={() => {
                                                    setActiveBoardId(board.id);
                                                    setIsBoardSwitcherOpen(false);
                                                }}
                                                className="flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-2">
                                                     <span className="w-4 h-4 rounded-full" style={{ backgroundColor: board.color }}></span>
                                                     <span>{board.name}</span>
                                                </div>
                                                {board.id === activeBoardId && <Check className="h-4 w-4" />}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    <Separator />
                                     <CommandGroup>
                                         <CommandItem onSelect={() => { handleOpenBoardDialog(null); setIsBoardSwitcherOpen(false); }}>
                                             <PlusCircle className="mr-2 h-4 w-4" />
                                             {t('tasks.add_new_board')}
                                         </CommandItem>
                                     </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <div className="flex items-center gap-2">
                         {activeBoard && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>{activeBoard.name}</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleOpenBoardDialog(activeBoard)} disabled={userPermissions === 'viewer'}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        <span>{t('common.edit')}</span>
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleOpenShareDialog(activeBoard)} disabled={userPermissions !== 'owner'}>
                                        <Share2 className="mr-2 h-4 w-4"/>
                                        <span>{t('tasks.share_board')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsLabelManagerOpen(true)} disabled={userPermissions === 'viewer'}>
                                        <PencilRuler className="mr-2 h-4 w-4" />
                                        <span>{t('tasks.manage_labels')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Mail className="mr-2 h-4 w-4" />
                                            <span>{t('tasks.email_reports')}</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onClick={() => handleOpenReportDialog('weekly-board-summary')}>
                                                    <ListVideo className="mr-2 h-4 w-4" />
                                                    <span>{t('tasks.report_types.weekly-board-summary')}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setIsReportManagerOpen(true)}>
                                                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                                                    <span>{t('tasks.my_reports_desc')}</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteAlertOpen(true)} disabled={userPermissions !== 'owner'}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>{t('common.delete')}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button onClick={() => handleOpenTaskDialog(null)} disabled={!activeBoard || userPermissions === 'viewer'}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('tasks.add_new_task')}
                        </Button>
                    </div>
                </div>
            </PageHeader>

            {activeBoard ? (
                <>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('tasks.search_placeholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline">
                                        <Tag className="mr-2 h-4 w-4"/>
                                        <span>{t('tasks.filter_by_tags')}</span>
                                        {filters.labelIds.length > 0 && <span className="ml-2 rounded-full bg-primary px-2 text-xs text-primary-foreground">{filters.labelIds.length}</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent>
                                     <Command>
                                        <CommandInput placeholder={t('tasks.filter_tags_placeholder')} />
                                        <CommandList>
                                            <CommandEmpty>{t('tasks.no_tags_found')}</CommandEmpty>
                                            <CommandGroup>
                                                {(activeBoard.labels || []).map((label) => (
                                                    <CommandItem
                                                        key={label.id}
                                                        onSelect={() => {
                                                            const newSelection = filters.labelIds.includes(label.id)
                                                                ? filters.labelIds.filter(id => id !== label.id)
                                                                : [...filters.labelIds, label.id];
                                                            setFilters(prev => ({...prev, labelIds: newSelection }));
                                                        }}
                                                    >
                                                        <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", filters.labelIds.includes(label.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                                            <Check className="h-4 w-4" />
                                                        </div>
                                                        <span className="h-4 w-4 rounded-full mr-2" style={{ backgroundColor: label.color }}></span>
                                                        <span>{label.text}</span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                             {selectedTaskIds.length > 0 && (
                                <Button variant="outline" onClick={handleExportSelected}>{t('tasks.export_selected', { count: selectedTaskIds.length })}</Button>
                            )}
                        </div>
                        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                            <Button variant={viewMode === 'board' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('board')}>
                                <LayoutGrid className="h-4 w-4"/>
                            </Button>
                             <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                                <List className="h-4 w-4"/>
                            </Button>
                             <Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('calendar')}>
                                <CalendarViewIcon className="h-4 w-4"/>
                            </Button>
                             <Button variant={viewMode === 'archived' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('archived')}>
                                <Archive className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>

                    <div className="min-h-[60vh]">
                    {viewMode === 'list' ? (
                        // List View
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                     <TableRow>
                                        <TableHead padding="checkbox" className="w-[5%]">
                                            <Checkbox
                                                checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                                                indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < filteredTasks.length}
                                                onCheckedChange={(checked) => {
                                                    setSelectedTaskIds(checked ? filteredTasks.map(t => t.id) : []);
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[35%]">{t('tasks.table.task')}</TableHead>
                                        <TableHead className="w-[15%]">{t('tasks.table.status')}</TableHead>
                                        <TableHead className="w-[10%]">{t('tasks.table.priority')}</TableHead>
                                        <TableHead className="w-[15%]">{t('tasks.table.assigned_to')}</TableHead>
                                        <TableHead className="w-[15%]">{t('tasks.table.next_due')}</TableHead>
                                        <TableHead className="w-[5%] text-right">{t('common.actions')}</TableHead>
                                     </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTasks.length > 0 ? filteredTasks.map(task => {
                                        const column = activeBoard.columns.find(c => c.id === task.columnId);
                                        return (
                                            <TableRow key={task.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedTaskIds.includes(task.id)}
                                                        onCheckedChange={(checked) => {
                                                            setSelectedTaskIds(
                                                                checked
                                                                    ? [...selectedTaskIds, task.id]
                                                                    : selectedTaskIds.filter(id => id !== task.id)
                                                            );
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{task.title}</div>
                                                    <div className="text-sm text-muted-foreground">{activeBoard.name}</div>
                                                </TableCell>
                                                <TableCell><Badge variant="outline">{column?.title}</Badge></TableCell>
                                                <TableCell className="capitalize">{t(`tasks.priority.${task.priority}`)}</TableCell>
                                                <TableCell>
                                                     <div className="flex items-center -space-x-2">
                                                        {(task.assignees || []).map(id => {
                                                            const user = usersOnBoard.find(u => u.id === id);
                                                            if (!user) return null;
                                                            return (
                                                                <TooltipProvider key={id}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <Avatar className="h-8 w-8 border-2 border-background">
                                                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                                            </Avatar>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>{t('tasks.tooltips.assigned_to', { name: user.name })}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            );
                                                        })}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{format(new Date(task.dueDate), 'yyyy/MM/dd')}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleOpenTaskDialog(task)}>{t('common.edit')}</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleOpenMoveDialog(task)}>{t('tasks.actions.move_task')}</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleExportSelected()}>{t('tasks.actions.add_to_calendar')}</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTask(task.id)}>{t('common.delete')}</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                {t('tasks.no_tasks_found')}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) : viewMode === 'board' ? (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="flex gap-4 items-start overflow-x-auto pb-4"
                                    >
                                        {activeBoard.columns.filter(c => !c.isArchived).map((column, index) => (
                                            <Draggable key={column.id} draggableId={column.id} index={index} isDragDisabled={userPermissions === 'viewer'}>
                                                {(provided) => (
                                                    <div
                                                        {...provided.draggableProps}
                                                        ref={provided.innerRef}
                                                        className="w-80 flex-shrink-0"
                                                    >
                                                        <div className="bg-muted p-2 rounded-lg">
                                                            <div {...provided.dragHandleProps} className="flex items-center justify-between p-2 cursor-grab">
                                                                {editingColumnId === column.id ? (
                                                                    <Input
                                                                        autoFocus
                                                                        value={editingColumnTitle}
                                                                        onChange={(e) => setEditingColumnTitle(e.target.value)}
                                                                        onBlur={() => handleEditColumn(column.id, editingColumnTitle)}
                                                                        onKeyDown={(e) => e.key === 'Enter' && handleEditColumn(column.id, editingColumnTitle)}
                                                                    />
                                                                ) : (
                                                                    <h3 className="font-semibold" onClick={() => {
                                                                        if (userPermissions !== 'viewer') {
                                                                            setEditingColumnId(column.id);
                                                                            setEditingColumnTitle(column.title);
                                                                        }
                                                                    }}>{column.title}</h3>
                                                                )}
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent>
                                                                        <DropdownMenuItem onClick={() => handleOpenCopyColumnDialog(column)}>{t('tasks.board.copy_list')}</DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleArchiveColumn(column.id)}>{t('tasks.board.archive_list')}</DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                            <Droppable droppableId={column.id} type="TASK" isDropDisabled={userPermissions === 'viewer'}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.droppableProps}
                                                                        className={cn("min-h-[100px] p-2 rounded-md transition-colors", snapshot.isDraggingOver ? "bg-secondary" : "")}
                                                                    >
                                                                        {(column.taskIds || []).map((taskId, index) => {
                                                                            const task = tasks.find(t => t.id === taskId);
                                                                            if (!task || task.isArchived) return null;
                                                                            return (
                                                                                <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={userPermissions === 'viewer'}>
                                                                                    {(provided, snapshot) => (
                                                                                        <div
                                                                                            ref={provided.innerRef}
                                                                                            {...provided.draggableProps}
                                                                                            {...provided.dragHandleProps}
                                                                                            className={cn(snapshot.isDragging && 'opacity-80 shadow-lg')}
                                                                                        >
                                                                                            {renderTaskCard(task)}
                                                                                        </div>
                                                                                    )}
                                                                                </Draggable>
                                                                            );
                                                                        })}
                                                                        {provided.placeholder}
                                                                    </div>
                                                                )}
                                                            </Droppable>
                                                            <Button variant="ghost" className="w-full justify-start mt-2" onClick={() => handleOpenTaskDialog(null, column.id)} disabled={userPermissions === 'viewer'}>
                                                                <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.board.add_new_task')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                        {userPermissions !== 'viewer' && (
                                            <div className="w-80 flex-shrink-0">
                                                {showAddColumnForm ? (
                                                    <form ref={newColumnFormRef} onSubmit={columnForm.handleSubmit(handleAddColumn)} className="bg-muted p-2 rounded-lg space-y-2">
                                                        <Input {...columnForm.register('title')} placeholder={t('tasks.board.enter_list_title')} autoFocus />
                                                        <div className="flex items-center gap-2">
                                                            <Button type="submit">{t('tasks.board.add_list')}</Button>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => setShowAddColumnForm(false)}><X /></Button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <Button variant="ghost" className="w-full bg-muted/50" onClick={() => setShowAddColumnForm(true)}>
                                                        <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.board.add_another_list')}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    ) : viewMode === 'calendar' ? (
                        // Calendar View
                         <div className="border rounded-lg">
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4"/></Button>
                                    <h2 className="text-lg font-semibold w-36 text-center">{format(currentMonth, 'MMMM yyyy', { locale: dateFnsLocale })}</h2>
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
                                    <div key={dayObj.key} className={cn("h-40 border-r border-b p-2 overflow-y-auto", dayObj.date && !isSameMonth(dayObj.date, currentMonth) && "bg-muted/50")}>
                                        {dayObj.date && (
                                            <span className={cn("font-semibold", isToday(dayObj.date) && "bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center")}>
                                                {format(dayObj.date, 'd')}
                                            </span>
                                        )}
                                        <div className="space-y-1 mt-1">
                                            {tasksOnDay.map(task => (
                                                <div key={task.id} onClick={() => handleOpenDetailsSheet(task)} className="bg-primary/20 text-primary-foreground p-1 rounded-md text-xs cursor-pointer hover:bg-primary/30">
                                                    <p className="font-semibold text-primary truncate">{task.title}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    ) : (
                         // Archived View
                        <div className="space-y-4">
                        {(activeBoard.columns.filter(c => c.isArchived)).length > 0 ? (
                            activeBoard.columns.filter(c => c.isArchived).map(column => (
                                <Card key={column.id} className="bg-muted/50">
                                    <CardHeader className="flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>{column.title}</CardTitle>
                                            <CardDescription>{t('tasks.archived.tasks_in_list', { count: (column.taskIds || []).length })}</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => handleRestoreColumn(column.id)}><ArchiveRestore className="mr-2 h-4 w-4"/> {t('tasks.archived.restore_button')}</Button>
                                            <Button variant="destructive" onClick={() => { setColumnToDelete(column); setIsDeleteColumnAlertOpen(true);}}><Trash2 className="mr-2 h-4 w-4"/> {t('tasks.archived.delete_permanently_button')}</Button>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))
                        ) : (
                             <div className="text-center py-16">
                                <Archive className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">{t('tasks.archived.no_archived_lists_title')}</h3>
                                <p className="mt-2 text-sm text-muted-foreground">{t('tasks.archived.no_archived_lists_desc')}</p>
                            </div>
                        )}
                        </div>
                    )}
                    </div>
                </>
            ) : (
                 <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <LayoutGrid className="h-16 w-16 text-muted-foreground" />
                    <h2 className="mt-4 text-2xl font-semibold">{t('tasks.no_board_found')}</h2>
                    <p className="mt-2 text-muted-foreground">{t('tasks.select_board')}</p>
                    <Button onClick={() => handleOpenBoardDialog(null)} className="mt-6">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('tasks.add_new_board')}
                    </Button>
                </div>
            )}
            
            {/* Dialogs */}
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
                                    <FormControl>
                                        <Input {...field} placeholder={t('tasks.dialog.board_name_placeholder')} />
                                    </FormControl>
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
                                     <div className="flex gap-2">
                                        {defaultColors.map(color => (
                                            <button key={color} type="button" onClick={() => field.onChange(color)} className={cn("h-8 w-8 rounded-full border-2", field.value === color && "ring-2 ring-ring ring-offset-2")} style={{ backgroundColor: color }} />
                                        ))}
                                     </div>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">{t('common.cancel')}</Button></DialogClose>
                                <Button type="submit">{t('common.save_changes')}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                 </DialogContent>
            </Dialog>

             <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('tasks.dialog.delete_board_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('tasks.dialog.delete_board_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => activeBoard && handleDeleteBoard(activeBoard.id)}>{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={isShareDialogOpen} onOpenChange={handleCloseShareDialog}>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('tasks.dialog.share_title', { name: sharingBoard?.name || '' })}</DialogTitle>
                        <DialogDescription>{t('tasks.dialog.share_desc')}</DialogDescription>
                    </DialogHeader>
                    {/* ... Share Dialog Content ... */}
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">{t('common.cancel')}</Button></DialogClose>
                        <Button onClick={onSaveShare}>{t('common.save_changes')}</Button>
                    </DialogFooter>
                 </DialogContent>
            </Dialog>

             <Dialog open={isTaskDialogOpen} onOpenChange={handleCloseTaskDialog}>
                 <DialogContent className="sm:max-w-2xl">
                     <DialogHeader aria-label="Task Details Dialog">
                         <DialogTitle>{editingTask ? t('tasks.dialog.task_edit_title') : t('tasks.dialog.task_add_title')}</DialogTitle>
                         <DialogDescription>{t('tasks.dialog.task_add_desc')}</DialogDescription>
                     </DialogHeader>
                     <Form {...form}>
                         <form onSubmit={form.handleSubmit(onTaskSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto pr-6 -mr-2">
                             <div className="md:col-span-2 space-y-4">
                               {/* ... Main Task Fields ... */}
                                <FormField name="title" control={form.control} render={({field}) => (
                                    <FormItem>
                                        <FormLabel>{t('tasks.dialog.title_label')}</FormLabel>
                                        <FormControl><Input {...field} placeholder={t('tasks.dialog.title_placeholder')} /></FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}/>
                                 <FormField name="description" control={form.control} render={({field}) => (
                                    <FormItem>
                                        <FormLabel>{t('tasks.dialog.description_label')}</FormLabel>
                                        <FormControl><Textarea {...field} placeholder={t('tasks.dialog.description_placeholder')} /></FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}/>
                                  <FormField
                                    control={form.control}
                                    name="checklist"
                                    render={() => (
                                        <FormItem>
                                            <FormLabel>{t('tasks.dialog.checklist_label')}</FormLabel>
                                            <FormDescription>{t('tasks.dialog.checklist_desc')}</FormDescription>
                                            <div className="space-y-2">
                                                {checklistFields.map((field, index) => (
                                                    <div key={field.id} className="flex items-center gap-2">
                                                        <FormField
                                                            control={form.control}
                                                            name={`checklist.${index}.completed`}
                                                            render={({ field: checkField }) => (
                                                                <FormControl>
                                                                    <Checkbox checked={checkField.value} onCheckedChange={checkField.onChange} />
                                                                </FormControl>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name={`checklist.${index}.text`}
                                                            render={({ field: textField }) => (
                                                                <FormControl>
                                                                    <Input {...textField} placeholder={t('tasks.dialog.checklist_item_placeholder')} />
                                                                </FormControl>
                                                            )}
                                                        />
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(index)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={() => appendChecklistItem({ id: `CL-${Date.now()}`, text: '', completed: false })}>
                                                {t('tasks.dialog.add_checklist_item_button')}
                                            </Button>
                                        </FormItem>
                                    )}
                                />
                             </div>
                              <div className="md:col-span-1 space-y-4">
                                {/* ... Sidebar Fields ... */}
                              </div>
                               <DialogFooter className="md:col-span-3">
                                <DialogClose asChild><Button type="button" variant="ghost">{t('common.cancel')}</Button></DialogClose>
                                <Button type="submit">{editingTask ? t('common.save_changes') : t('tasks.dialog.create_task_button')}</Button>
                            </DialogFooter>
                         </form>
                     </Form>
                 </DialogContent>
             </Dialog>

            <Dialog open={isWeeklyReportDialogOpen} onOpenChange={setIsWeeklyReportDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-y-1">
                                <DialogTitle>
                                    {editingReport ? t('tasks.dialog.edit_report_title') : t('tasks.dialog.configure_report_title')} {t(`tasks.report_types.${reportConfigType}` as any)}
                                </DialogTitle>
                                <DialogDescription>{t('tasks.dialog.report_desc', { name: activeBoard?.name })}</DialogDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setIsReportManagerOpen(true)}>
                                {t('tasks.my_reports_desc')}
                            </Button>
                        </div>
                    </DialogHeader>
                    {/* ... Weekly Report Dialog Content ... */}
                </DialogContent>
            </Dialog>

            <Sheet open={isDetailsSheetOpen} onOpenChange={handleCloseDetailsSheet}>
                <SheetContent className="sm:max-w-lg flex flex-col">
                     {/* ... Details Sheet ... */}
                </SheetContent>
            </Sheet>

            <Dialog open={isLabelManagerOpen} onOpenChange={setIsLabelManagerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('tasks.dialog.manage_labels_title', { name: activeBoard?.name || '' })}</DialogTitle>
                        <DialogDescription>{t('tasks.dialog.manage_labels_desc')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Form {...labelForm}>
                            <form onSubmit={labelForm.handleSubmit(onLabelSubmit)} className="flex items-end gap-2">
                                <FormField name="text" control={labelForm.control} render={({field}) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>{t('tasks.dialog.labels_label')}</FormLabel>
                                        <FormControl><Input {...field} placeholder={t('tasks.dialog.label_name_placeholder')} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField name="color" control={labelForm.control} render={({field}) => (
                                     <FormItem>
                                        <FormLabel>{t('tasks.dialog.label_color')}</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button type="button" variant="outline" className="w-full justify-start">
                                                    <div className="w-5 h-5 rounded-full mr-2 border" style={{ backgroundColor: field.value }}></div>
                                                    {field.value}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <div className="grid grid-cols-6 gap-2 p-2">
                                                    {defaultColors.map(color => (
                                                        <button key={color} type="button" onClick={() => field.onChange(color)} className={cn("h-8 w-8 rounded-full border-2", field.value === color && "ring-2 ring-ring ring-offset-2")} style={{ backgroundColor: color }} />
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </FormItem>
                                )}/>
                                <Button type="submit">{editingLabel ? t('common.save_changes') : t('tasks.dialog.add_label_button')}</Button>
                            </form>
                        </Form>
                         <div className="space-y-2">
                            {(activeBoard?.labels || []).length > 0 ? (activeBoard?.labels || []).map(label => (
                                <div key={label.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <Badge style={{ backgroundColor: label.color }} className="text-white">{label.text}</Badge>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingLabel(label)}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setLabelToDelete(label)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center py-4">{t('tasks.dialog.no_labels_yet')}</p>}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            
            {labelToDelete && (
                 <AlertDialog open={!!labelToDelete} onOpenChange={() => setLabelToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('tasks.dialog.delete_label_title')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('tasks.dialog.delete_label_desc', { name: labelToDelete.text })}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteLabel}>{t('common.delete')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

             {columnToDelete && (
                 <AlertDialog open={isDeleteColumnAlertOpen} onOpenChange={setIsDeleteColumnAlertOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('tasks.dialog.delete_list_title')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('tasks.dialog.delete_list_desc', { name: columnToDelete.title })}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setColumnToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteColumnPermanently}>{t('common.delete')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
