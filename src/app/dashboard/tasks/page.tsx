
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PlusCircle, MoreHorizontal, ClipboardCheck, Calendar as CalendarIcon, X, Users as UsersIcon, MessageSquare, Download, CheckCircle, ArrowUpDown, Tag, Settings, Trash2, Edit, Share2, Paperclip, Upload, List, LayoutGrid, Archive, ArchiveRestore, Calendar as CalendarViewIcon, ChevronLeft, ChevronRight, Copy, Mail, SlidersHorizontal, ChevronsUpDown, Check, History, SmilePlus, Flag, Loader2 } from 'lucide-react';
import type { DropResult } from "react-beautiful-dnd";
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import * as ics from 'ics';
import DatePicker, { DateObject } from "react-multi-date-picker";

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
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription
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
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader, PageHeaderHeading } from '@/components/page-header';
import { tasks as mockTasks, units as mockUnits, users as mockUsers, taskBoards as mockTaskBoards, scheduledReports as mockScheduledReports } from '@/lib/mock-data';
import type { Task, User, Comment, TaskBoard, BoardPermissionRole, ChecklistItem, BoardColumn, AppearanceSettings, ScheduledReport, ScheduledReportType, ActivityLog, Label as LabelType } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/context/language-context';
import { useCalendar } from '@/context/calendar-context';
import { Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const DragDropContext = dynamic(() => import('react-beautiful-dnd').then(mod => mod.DragDropContext), { ssr: false, loading: () => <div className="flex h-64 w-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div> });
const Droppable = dynamic(() => import('react-beautiful-dnd').then(mod => mod.Droppable), { ssr: false });
const Draggable = dynamic(() => import('react-beautiful-dnd').then(mod => mod.Draggable), { ssr: false });


const AUTH_USER_KEY = 'current_user';
const APPEARANCE_SETTINGS_KEY = 'appearance-settings';
type SortableTaskField = 'title' | 'dueDate' | 'priority' | 'columnId';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'board' | 'archived' | 'calendar';

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
    checklist: z.array(checklistItemSchema).optional(),
    attachments: z.any().optional(),
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
    reportType: z.string().min(1, "Report type is required"),
});

const labelSchema = z.object({
    text: z.string().min(1, "Label text is required."),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
});


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
    const [isDeleteBoardAlertOpen, setIsDeleteBoardAlertOpen] = useState(false);
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
    const [newLabelSearch, setNewLabelSearch] = useState("");


    const { toast } = useToast();
    const [usersOnBoard, setUsersOnBoard] = useState<User[]>([]);
    
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

    const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);

    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ labelIds: [] as string[] });
    const [sorting, setSorting] = useState<{ field: SortableTaskField, direction: SortDirection }>({ field: 'dueDate', direction: 'asc' });

    const newColumnFormRef = useRef<HTMLFormElement>(null);
    
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
            checklist: [],
            attachments: [],
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
            reportType: "weekly-my-tasks",
        },
    });

    const labelForm = useForm<z.infer<typeof labelSchema>>({
        resolver: zodResolver(labelSchema),
        defaultValues: {
            text: "",
            color: defaultColors[0],
        },
    });

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
        if (currentUser.role === 'super-admin') return boards;
        return boards.filter(board => 
            board.ownerId === currentUser.id || 
            board.sharedWith?.some(s => s.userId === currentUser.id)
        );
    }, [boards, currentUser]);
    
    useEffect(() => {
        if (visibleBoards.length > 0 && !activeBoardId) {
            setActiveBoardId(visibleBoards[0]?.id);
        } else if (visibleBoards.length > 0 && activeBoardId && !visibleBoards.find(b => b.id === activeBoardId)) {
           setActiveBoardId(visibleBoards[0]?.id);
        } else if (visibleBoards.length === 0) {
            setActiveBoardId(null);
        }
    }, [visibleBoards, activeBoardId]);

    const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);
    
    const userPermissions = useMemo((): BoardPermissionRole | 'owner' | 'none' => {
        if (!currentUser || !activeBoard) return 'none';
        if (currentUser.role === 'super-admin') return 'owner';
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
                checklist: editingTask.checklist || [],
                attachments: [],
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
                checklist: [],
                attachments: [],
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
                reportType: editingReport ? editingReport.type : "weekly-my-tasks",
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
            form.setValue('columnId', columnId);
            form.setValue('unit', currentUser.unit);
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
    
    const handleOpenReportDialog = (report?: ScheduledReport) => {
        setEditingReport(report || null);
        setIsWeeklyReportDialogOpen(true);
    };

    const onTaskSubmit = (values: z.infer<typeof taskSchema>) => {
        if (!currentUser || !activeBoard) return;

        const dueDateObj = values.dueDate as DateObject;
        const finalDueDate = dueDateObj.toDate();

        if (editingTask) {
            const updatedTask: Task = {
                ...editingTask,
                ...values,
                dueDate: finalDueDate.toISOString(),
                attachments: attachedFiles.length > 0 ? attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })) : editingTask.attachments,
                labelIds: values.labelIds || [],
                logs: [...(editingTask.logs || []), createLogEntry('updated', { title: values.title })],
            };
            setTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t));

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
                createdBy: currentUser.name,
                // These fields don't exist in the new schema but are in mock data, add them for consistency
                reminders: [], 
                recurrence: { type: 'none', time: '09:00'}, 
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
        if (selectedTaskForDetails?.id === taskId) {
            setSelectedTaskForDetails(prev => prev ? {...prev, isCompleted, logs: [...(prev.logs || []), log]} : null);
        }
        toast({
            title: isCompleted ? t('tasks.toast.task_completed_title') : t('tasks.toast.task_incomplete_title'),
            description: t('tasks.toast.task_status_updated_desc', { name: task.title }),
        });
    };

    const handleDeleteTask = (taskId: string) => {
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;
        
        setTasks(tasks.filter(t => t.id !== taskId));
        
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
        handleCloseDetailsSheet();
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

        const sourceBoard = boards.find(b => b.id === movingTask.boardId)!;
        const updatedSourceBoard = {
            ...sourceBoard,
            columns: sourceBoard.columns.map(col => ({
                ...col,
                taskIds: (col.taskIds || []).filter(id => id !== movingTask.id)
            }))
        };

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

        const log = createLogEntry('moved_task', { from: sourceBoard.name, to: targetBoard.name });
        const updatedTask = { ...movingTask, boardId: targetBoard.id, columnId: targetColumn.id, logs: [...(movingTask.logs || []), log] };
        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        
        toast({ title: t('tasks.toast.task_moved_title'), description: t('tasks.toast.task_moved_desc', { task: movingTask.title, board: targetBoard.name })});
        handleCloseMoveDialog();
        handleCloseDetailsSheet();
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
        if (!boardToDelete || userPermissions !== 'owner') return;

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
        setIsBoardSwitcherOpen(false);
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
        isCompleted: false,
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
        
        setSharingBoard({ ...sharingBoard, sharedWith: newSharedWith });
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

        if (!destination || !activeBoard || (userPermissions !== 'owner' && userPermissions !== 'editor')) {
            return;
        }

        if (type === 'COLUMN') {
            const newColumnOrder = Array.from(activeBoard.columns.filter(c => !c.isArchived));
            const [reorderedItem] = newColumnOrder.splice(source.index, 1);
            newColumnOrder.splice(destination.index, 0, reorderedItem);

            const updatedBoard = { ...activeBoard, columns: [...newColumnOrder, ...activeBoard.columns.filter(c => c.isArchived)] };
            setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
            return;
        }

        const startColumn = activeBoard.columns.find(c => c.id === source.droppableId);
        const finishColumn = activeBoard.columns.find(c => c.id === destination.droppableId);

        if (!startColumn || !finishColumn) return;

        if (startColumn === finishColumn) {
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
            const updatedReport: ScheduledReport = {
                ...editingReport,
                name: values.name,
                type: values.reportType as ScheduledReportType,
                schedule: { dayOfWeek: parseInt(values.dayOfWeek, 10), time: values.time },
                recipients: recipients,
                subject: values.subject,
                body: values.body,
            };
            setScheduledReports(prev => prev.map(r => r.id === editingReport.id ? updatedReport : r));
            toast({ title: t('tasks.toast.report_updated_title'), description: t('tasks.toast.report_updated_desc', { name: values.name }) });
        } else {
            const newReport: ScheduledReport = {
                id: `SR-${Date.now()}`,
                boardId: activeBoard.id,
                name: values.name,
                type: values.reportType as ScheduledReportType,
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

    const handleCreateNewLabel = (searchText: string, field: any) => {
        if (!activeBoard || !searchText) return;
        const newLabel: LabelType = {
            id: `LBL-${Date.now()}`,
            text: searchText,
            color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
        };
        const updatedBoard = {
            ...activeBoard,
            labels: [...(activeBoard.labels || []), newLabel]
        };
        setBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        const newSelection = [...(field.value || []), newLabel.id];
        field.onChange(newSelection);
        setNewLabelSearch("");
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
                let newReactions = [...(task.reactions || [])];
                const userReactionIndex = newReactions.findIndex(r => r.userId === currentUser.id);

                if (userReactionIndex > -1) {
                    // User already has a reaction
                    if (newReactions[userReactionIndex].emoji === emoji) {
                        // It's the same emoji, so remove it (toggle off)
                        newReactions.splice(userReactionIndex, 1);
                    } else {
                        // It's a different emoji, replace the old one
                        newReactions[userReactionIndex] = { emoji, userId: currentUser.id, userName: currentUser.name };
                    }
                } else {
                    // User has no reaction, add the new one
                    newReactions.push({ emoji, userId: currentUser.id, userName: currentUser.name });
                }

                const updatedTask = { ...task, reactions: newReactions };
                if (selectedTaskForDetails?.id === taskId) {
                    setSelectedTaskForDetails(updatedTask);
                }
                return updatedTask;
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

    const renderTaskCard = (task: Task) => {
        const groupedReactions = (task.reactions || []).reduce((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return (
            <Card
                className={cn("mb-2 cursor-pointer transition-shadow hover:shadow-md bg-card group/taskcard", task.isCompleted && "bg-secondary/50 dark:bg-slate-800/50 opacity-70")}
                onClick={() => handleOpenDetailsSheet(task)}
            >
                <CardContent className="p-3 relative">
                     <div className="absolute top-1 right-1 opacity-0 group-hover/taskcard:opacity-100 transition-opacity z-10">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                             <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                 <DropdownMenuItem onClick={() => handleToggleTaskCompletion(task.id, !task.isCompleted)}>
                                    <CheckCircle className="mr-2 h-4 w-4"/>
                                    <span>{task.isCompleted ? t('tasks.toast.task_incomplete_title') : t('tasks.toast.task_completed_title')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenTaskDialog(task)}>{t('common.edit')}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenMoveDialog(task)}>{t('tasks.actions.move_task')}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportSelected()}>{t('tasks.actions.add_to_calendar')}</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTask(task.id)}>{t('common.delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                    </div>

                    {(task.labelIds && task.labelIds.length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {task.labelIds.map(labelId => {
                                const label = activeBoard?.labels?.find(l => l.id === labelId);
                                if (!label) return null;
                                return (
                                    <Badge key={label.id} style={{ backgroundColor: label.color, color: '#fff' }} className="text-xs px-2 py-0.5 border-transparent">
                                        {label.text}
                                    </Badge>
                                );
                            })}
                        </div>
                    )}

                    <p className={cn("font-semibold text-sm text-card-foreground pr-8", task.isCompleted && "line-through")}>{task.title}</p>
                    
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center -space-x-2">
                            {(task.assignees || []).map(id => {
                                const user = usersOnBoard.find(u => u.id === id);
                                if (!user) return null;
                                return (
                                    <TooltipProvider key={id}><Tooltip><TooltipTrigger>
                                        <Avatar className="h-6 w-6 border-2 border-background">
                                            <AvatarImage src={user.avatar} alt={user.name} />
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger><TooltipContent><p>{t('tasks.tooltips.assigned_to', { name: user.name })}</p></TooltipContent></Tooltip></TooltipProvider>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {(task.comments?.length || 0) > 0 && (
                                 <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{task.comments?.length}</span>
                            )}
                            {(task.attachments?.length || 0) > 0 && (
                                <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{task.attachments?.length}</span>
                            )}
                            {(task.checklist?.length || 0) > 0 && (
                                 <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{task.checklist?.filter(c => c.completed).length}/{task.checklist?.length}</span>
                            )}
                        </div>
                    </div>
                     
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                        {Object.entries(groupedReactions).map(([emoji, count]) => {
                             const userHasReacted = task.reactions?.some(r => r.userId === currentUser?.id && r.emoji === emoji);
                             return (
                                 <TooltipProvider key={emoji}><Tooltip><TooltipTrigger asChild>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleAddReaction(task.id, emoji); }} 
                                        className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", userHasReacted ? 'border-primary bg-primary/20' : 'border-border bg-transparent hover:bg-muted')}
                                    >
                                        <span>{emoji}</span>
                                        <span>{count}</span>
                                    </button>
                                 </TooltipTrigger><TooltipContent>
                                    <p>{task.reactions?.filter(r => r.emoji === emoji).map(r => r.userName).join(', ')}</p>
                                </TooltipContent></Tooltip></TooltipProvider>
                             )
                        })}
                        {appearanceSettings?.taskReactionsEnabled && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-7 w-7 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                        }}
                                    >
                                        <SmilePlus className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-1" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex gap-1">
                                        {(appearanceSettings?.allowedReactions || []).map(emoji => (
                                            <Button 
                                                key={emoji} 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleAddReaction(task.id, emoji)}
                                                className="h-8 w-8 text-lg"
                                            >
                                                {emoji}
                                            </Button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }


    const filteredTasks = useMemo(() => {
        if (!activeBoard) return [];
        let baseTasks = tasks.filter(t => t.boardId === activeBoard.id);

        if (viewMode !== 'archived') {
            baseTasks = baseTasks.filter(t => !t.isArchived);
        } else {
             baseTasks = baseTasks.filter(t => t.isArchived);
        }
        
        if (searchTerm) {
            baseTasks = baseTasks.filter(
                (task) =>
                    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
    
        if (filters.labelIds.length > 0) {
            baseTasks = baseTasks.filter(task => 
                filters.labelIds.every(labelId => (task.labelIds || []).includes(labelId))
            );
        }

        if (viewMode === 'list') {
            baseTasks.sort((a, b) => {
                const field = sorting.field;
                const direction = sorting.direction === 'asc' ? 1 : -1;
                const valA = a[field as keyof Task];
                const valB = b[field as keyof Task];

                if (field === 'dueDate') {
                    return (new Date(valA as string).getTime() - new Date(valB as string).getTime()) * direction;
                }

                if (String(valA) < String(valB)) return -1 * direction;
                if (String(valA) > String(valB)) return 1 * direction;
                return 0;
            });
        }


        return baseTasks;
  }, [tasks, searchTerm, filters, sorting, viewMode, activeBoard]);


    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startingDayIndex = getDay(start);
        const placeholders = Array.from({ length: startingDayIndex }, (_, i) => ({ date: null, key: `placeholder-${i}` }));
        return [...placeholders, ...days.map(d => ({date:d, key: format(d, 'yyyy-MM-dd')}))];
    }, [currentMonth, format]);

    const tasksByDate = useMemo(() => {
        return filteredTasks.reduce((acc, task) => {
            const dueDate = format(new Date(task.dueDate), 'yyyy-MM-dd');
            if (!acc[dueDate]) { acc[dueDate] = []; }
            acc[dueDate].push(task);
            return acc;
        }, {} as Record<string, Task[]>);
    }, [filteredTasks, format]);

    const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
    const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const goToToday = () => setCurrentMonth(new Date());


    if (!currentUser || !Droppable || !Draggable) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">{t('loading.dashboard')}</p>
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
                                    <h1 className="text-xl font-bold leading-tight tracking-tighter">{activeBoard?.name || t('tasks.select_board')}</h1>
                                </div>
                                <div className="flex items-center -space-x-2">
                                    {(activeBoard?.sharedWith || []).slice(0,3).map(share => {
                                        const user = mockUsers.find(u => u.id === share.userId);
                                        return user ? (
                                            <TooltipProvider key={user.id}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Avatar className="h-6 w-6 border-2 border-background">
                                                            <AvatarImage src={user.avatar} alt={user.name} />
                                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{t('tasks.tooltips.shared_with', { name: user.name })}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : null
                                    })}
                                    {(activeBoard?.sharedWith?.length || 0) > 3 && (
                                         <TooltipProvider><Tooltip>
                                            <TooltipTrigger asChild>
                                                <Avatar className="h-6 w-6 border-2 border-background"><AvatarFallback>+{(activeBoard?.sharedWith?.length || 0) - 3}</AvatarFallback></Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{(activeBoard?.sharedWith || []).slice(3).map(s => mockUsers.find(u => u.id === s.userId)?.name).join(', ')}</p>
                                            </TooltipContent>
                                         </Tooltip></TooltipProvider>
                                    )}
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
                                <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button></DropdownMenuTrigger>
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
                                        <Tag className="mr-2 h-4 w-4" />
                                        <span>{t('tasks.manage_labels')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Mail className="mr-2 h-4 w-4" />
                                            <span>{t('tasks.email_reports')}</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onClick={() => handleOpenReportDialog()}>
                                                    <PlusCircle className="mr-2 h-4 w-4"/>
                                                    <span>{t('tasks.dialog.new_report_label')}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setIsReportManagerOpen(true)}>
                                                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                                                    <span>{t('tasks.dialog.view_scheduled_reports')}</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteBoardAlertOpen(true)} disabled={userPermissions !== 'owner'}>
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

            <DragDropContext onDragEnd={onDragEnd}>
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
                                            {filters.labelIds.length > 0 && (
                                                <>
                                                    <Separator />
                                                    <CommandGroup>
                                                        <CommandItem onSelect={() => setFilters(prev => ({ ...prev, labelIds: [] }))} className="text-destructive justify-center">
                                                            {t('contracts.filter.clear_button')}
                                                        </CommandItem>
                                                    </CommandGroup>
                                                </>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                             {selectedTaskIds.length > 0 && (
                                <Button variant="outline" onClick={handleExportSelected}>{t('tasks.export_selected', { count: selectedTaskIds.length })}</Button>
                            )}
                        </div>
                        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                            <Button variant={viewMode === 'board' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('board')}><LayoutGrid className="h-4 w-4"/></Button>
                            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}><List className="h-4 w-4"/></Button>
                            <Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('calendar')}><CalendarViewIcon className="h-4 w-4"/></Button>
                            <Button variant={viewMode === 'archived' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('archived')}><Archive className="h-4 w-4"/></Button>
                        </div>
                    </div>

                    <div className="min-h-[60vh]">
                    {viewMode === 'list' ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead className="w-[5%]"><Checkbox
                                        checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                                        indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < filteredTasks.length}
                                        onCheckedChange={(checked) => setSelectedTaskIds(checked ? filteredTasks.map(t => t.id) : [])}
                                    /></TableHead>
                                    <TableHead className="w-[35%]">{t('tasks.table.task')}</TableHead>
                                    <TableHead className="w-[15%]">{t('tasks.table.status')}</TableHead>
                                    <TableHead className="w-[10%]">{t('tasks.table.priority')}</TableHead>
                                    <TableHead className="w-[15%]">{t('tasks.table.assigned_to')}</TableHead>
                                    <TableHead className="w-[15%]">{t('tasks.table.next_due')}</TableHead>
                                    <TableHead className="w-[5%] text-right">{t('common.actions')}</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {filteredTasks.length > 0 ? filteredTasks.map(task => {
                                        const column = activeBoard.columns.find(c => c.id === task.columnId);
                                        return (
                                            <TableRow key={task.id}>
                                                <TableCell><Checkbox
                                                    checked={selectedTaskIds.includes(task.id)}
                                                    onCheckedChange={(checked) => setSelectedTaskIds(checked ? [...selectedTaskIds, task.id] : selectedTaskIds.filter(id => id !== task.id))}
                                                /></TableCell>
                                                <TableCell><div className="font-medium">{task.title}</div></TableCell>
                                                <TableCell><Badge variant="outline">{column?.title}</Badge></TableCell>
                                                <TableCell className="capitalize">{t(`tasks.priority.${task.priority}`)}</TableCell>
                                                <TableCell><div className="flex items-center -space-x-2">
                                                    {(task.assignees || []).map(id => {
                                                        const user = usersOnBoard.find(u => u.id === id);
                                                        return user ? (<TooltipProvider key={id}><Tooltip><TooltipTrigger>
                                                            <Avatar className="h-8 w-8 border-2 border-background">
                                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                        </TooltipTrigger><TooltipContent><p>{t('tasks.tooltips.assigned_to', { name: user.name })}</p></TooltipContent></Tooltip></TooltipProvider>) : null;
                                                    })}
                                                </div></TableCell>
                                                <TableCell>{format(new Date(task.dueDate), 'yyyy/MM/dd')}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleOpenDetailsSheet(task)}>{t('tasks.details.view_details')}</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleOpenTaskDialog(task)}>{t('common.edit')}</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleOpenMoveDialog(task)}>{t('tasks.actions.move_task')}</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTask(task.id)}>{t('common.delete')}</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    }) : (
                                        <TableRow><TableCell colSpan={7} className="h-24 text-center">{t('tasks.no_tasks_found')}</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) : viewMode === 'board' ? (
                            <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="flex gap-4 items-start overflow-x-auto pb-4">
                                        {activeBoard.columns.filter(c => !c.isArchived).map((column, index) => (
                                            <Draggable key={column.id} draggableId={column.id} index={index} isDragDisabled={userPermissions === 'viewer'}>
                                                {(provided) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} className="w-80 flex-shrink-0">
                                                        <div className="bg-muted/60 dark:bg-slate-800/60 p-2 rounded-lg">
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
                                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="text-muted-foreground"/></Button></DropdownMenuTrigger>
                                                                    <DropdownMenuContent>
                                                                        <DropdownMenuItem onClick={() => handleOpenCopyColumnDialog(column)}>{t('tasks.board.copy_list')}</DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleArchiveColumn(column.id)}>{t('tasks.board.archive_list')}</DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                            <Droppable droppableId={column.id} type="TASK" isDropDisabled={userPermissions === 'viewer'}>
                                                                {(provided, snapshot) => (
                                                                    <div ref={provided.innerRef} {...provided.droppableProps} className={cn("min-h-[100px] p-2 rounded-md transition-colors", snapshot.isDraggingOver ? "bg-secondary" : "")}>
                                                                        {(column.taskIds || []).map((taskId, index) => {
                                                                            const task = tasks.find(t => t.id === taskId);
                                                                            return task && !task.isArchived ? (
                                                                                <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={userPermissions === 'viewer'}>
                                                                                    {(provided, snapshot) => (
                                                                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={cn(snapshot.isDragging && 'opacity-80 shadow-lg')}>
                                                                                            {renderTaskCard(task)}
                                                                                        </div>
                                                                                    )}
                                                                                </Draggable>
                                                                            ) : null;
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
                                                    <form ref={newColumnFormRef} onSubmit={columnForm.handleSubmit(handleAddColumn)} className="bg-muted/60 dark:bg-slate-800/60 p-2 rounded-lg space-y-2">
                                                        <Input {...columnForm.register('title')} placeholder={t('tasks.board.enter_list_title')} autoFocus />
                                                        <div className="flex items-center gap-2">
                                                            <Button type="submit">{t('tasks.board.add_list')}</Button>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => setShowAddColumnForm(false)}><X /></Button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <Button variant="ghost" className="w-full bg-muted/50 dark:bg-slate-800/50" onClick={() => setShowAddColumnForm(true)}>
                                                        <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.board.add_another_list')}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                    ) : viewMode === 'calendar' ? (
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
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => ( <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">{day}</div> ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {calendarDays.map((dayObj) => {
                                    const tasksOnDay = dayObj.date ? tasksByDate[format(dayObj.date, 'yyyy-MM-dd')] || [] : [];
                                    return (
                                    <div key={dayObj.key} className={cn("h-40 border-r border-b p-2 overflow-y-auto", dayObj.date && !isSameMonth(dayObj.date, currentMonth) && "bg-muted/50")}>
                                        {dayObj.date && (<span className={cn("font-semibold", isToday(dayObj.date) && "bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center")}>{format(dayObj.date, 'd')}</span>)}
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
            </DragDropContext>
            
            <Dialog open={isBoardDialogOpen} onOpenChange={handleCloseBoardDialog}>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBoard ? t('tasks.dialog.board_edit_title') : t('tasks.dialog.board_create_title')}</DialogTitle>
                        <DialogDescription>{editingBoard ? t('tasks.dialog.board_edit_desc') : t('tasks.dialog.board_create_desc')}</DialogDescription>
                    </DialogHeader>
                    <Form {...boardForm}>
                        <form onSubmit={boardForm.handleSubmit(onBoardSubmit)} className="space-y-4">
                             <FormField control={boardForm.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>{t('tasks.dialog.board_name')}</FormLabel><FormControl><Input {...field} placeholder={t('tasks.dialog.board_name_placeholder')} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={boardForm.control} name="color" render={({ field }) => (
                                <FormItem><FormLabel>{t('tasks.dialog.board_color')}</FormLabel><div className="flex gap-2">
                                    {defaultColors.map(color => (<button key={color} type="button" onClick={() => field.onChange(color)} className={cn("h-8 w-8 rounded-full border-2", field.value === color && "ring-2 ring-ring ring-offset-2")} style={{ backgroundColor: color }} />))}
                                </div><FormMessage /></FormItem>
                            )}/>
                             <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">{t('common.cancel')}</Button></DialogClose><Button type="submit">{t('common.save_changes')}</Button></DialogFooter>
                        </form>
                    </Form>
                 </DialogContent>
            </Dialog>

             <AlertDialog open={isDeleteBoardAlertOpen} onOpenChange={setIsDeleteBoardAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('tasks.dialog.delete_board_title')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('tasks.dialog.delete_board_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => activeBoard && handleDeleteBoard(activeBoard.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={isShareDialogOpen} onOpenChange={handleCloseShareDialog}>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>{t('tasks.dialog.share_title', { name: sharingBoard?.name || '' })}</DialogTitle>
                        <DialogDescription>{t('tasks.dialog.share_desc')}</DialogDescription>
                    </DialogHeader>
                    {sharingBoard && (<div className="space-y-4">
                        <div className="space-y-2"><Label>{t('tasks.dialog.share_with_label')}</Label><div className="space-y-2 max-h-60 overflow-y-auto">
                            {(sharingBoard.sharedWith || []).map(share => {
                                const user = mockUsers.find(u => u.id === share.userId);
                                return user ? (<div key={user.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                                        <div><p className="font-medium">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select value={share.role} onValueChange={(role) => handleShareUpdate(user.id, role as BoardPermissionRole)}>
                                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="editor">{t('tasks.permissions.editor')}</SelectItem><SelectItem value="viewer">{t('tasks.permissions.viewer')}</SelectItem></SelectContent>
                                        </Select>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveShare(user.id)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </div>) : null;
                            })}
                        </div></div>
                        <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4"/>{t('tasks.dialog.share_search_placeholder')}</Button></PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                                <CommandInput placeholder={t('tasks.dialog.share_search_placeholder')} />
                                <CommandList><CommandEmpty>{t('tasks.dialog.share_no_users_found')}</CommandEmpty><CommandGroup>
                                    {mockUsers.filter(u => u.id !== currentUser?.id && !(sharingBoard.sharedWith || []).some(s => s.userId === u.id)).map(user => (
                                        <CommandItem key={user.id} onSelect={() => handleShareUpdate(user.id, 'viewer')}>{user.name} ({user.email})</CommandItem>
                                    ))}
                                </CommandGroup></CommandList>
                            </Command></PopoverContent>
                        </Popover>
                    </div>)}
                    <DialogFooter><DialogClose asChild><Button variant="ghost">{t('common.cancel')}</Button></DialogClose><Button onClick={onSaveShare}>{t('common.save_changes')}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isTaskDialogOpen} onOpenChange={handleCloseTaskDialog}>
                 <DialogContent className="sm:max-w-xl">
                     <DialogHeader><DialogTitle>{editingTask ? t('tasks.dialog.task_edit_title') : t('tasks.dialog.task_add_title')}</DialogTitle><DialogDescription>{t('tasks.dialog.task_add_desc')}</DialogDescription></DialogHeader>
                     <Form {...form}><form onSubmit={form.handleSubmit(onTaskSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                        <FormField name="title" control={form.control} render={({field}) => (<FormItem><FormLabel>{t('tasks.dialog.title_label')}</FormLabel><FormControl><Input {...field} placeholder={t('tasks.dialog.title_placeholder')} /></FormControl><FormMessage/></FormItem>)}/>
                        <FormField name="description" control={form.control} render={({field}) => (<FormItem><FormLabel>{t('tasks.dialog.description_label')}</FormLabel><FormControl><Textarea {...field} placeholder={t('tasks.dialog.description_placeholder')} /></FormControl><FormMessage/></FormItem>)}/>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="columnId" render={({ field }) => (<FormItem><FormLabel>{t('tasks.dialog.list_status_label')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('tasks.dialog.list_status_placeholder')} /></SelectTrigger></FormControl><SelectContent>{activeBoard?.columns.filter(c => !c.isArchived).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="priority" render={({ field }) => (<FormItem><FormLabel>{t('tasks.dialog.priority_label')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="low">{t('tasks.priority.low')}</SelectItem><SelectItem value="medium">{t('tasks.priority.medium')}</SelectItem><SelectItem value="high">{t('tasks.priority.high')}</SelectItem><SelectItem value="critical">{t('tasks.priority.critical')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="assignees" render={({ field }) => (
                                <FormItem><FormLabel>{t('tasks.dialog.assign_to_label')}</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                    <Button variant="outline" className="w-full justify-start h-auto min-h-10">
                                        {field.value && field.value.length > 0 ? (
                                            <div className="flex flex-wrap items-center gap-1">
                                                {field.value.slice(0, 3).map(id => {
                                                    const user = usersOnBoard.find(u => u.id === id);
                                                    return user ? <Avatar key={id} className="h-6 w-6"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar> : null;
                                                })}
                                                {field.value.length > 3 && <span className="text-xs text-muted-foreground">+{field.value.length - 3}</span>}
                                            </div>
                                        ) : <span>{t('tasks.dialog.assign_to_placeholder')}</span>}
                                    </Button>
                                </FormControl></PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder={t('tasks.dialog.assign_to_placeholder')} />
                                <CommandList><CommandEmpty>{t('tasks.dialog.no_users_on_board')}</CommandEmpty><CommandGroup>
                                {usersOnBoard.map(user => (
                                <CommandItem key={user.id} onSelect={() => { const newSelection = field.value?.includes(user.id) ? field.value.filter(id => id !== user.id) : [...(field.value || []), user.id]; field.onChange(newSelection);}}>
                                    <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", field.value?.includes(user.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}><Check className="h-4 w-4" /></div>
                                    <span>{user.name}</span>
                                </CommandItem>
                                ))}
                                </CommandGroup></CommandList></Command></PopoverContent>
                                </Popover><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>{t('tasks.dialog.date_label')}</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} calendar={calendar} locale={locale} render={(value: any, openCalendar: () => void) => (<Button type="button" variant="outline" onClick={openCalendar} className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{value || <span>Pick a date</span>}</Button>)}/></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="unit" render={({ field }) => (<FormItem><FormLabel>{t('units.title')}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={currentUser?.role !== 'super-admin'}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{mockUnits.map(u => <SelectItem value={u.name} key={u.id}>{u.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="labelIds" render={({ field }) => (
                                <FormItem><FormLabel>{t('tasks.dialog.labels_label')}</FormLabel>
                                <Popover><PopoverTrigger asChild><FormControl>
                                <Button variant="outline" className="w-full justify-start h-auto min-h-10">
                                {field.value && field.value.length > 0 ? (<div className="flex flex-wrap gap-1">
                                    {(field.value || []).map(labelId => {
                                        const label = activeBoard?.labels?.find(l => l.id === labelId);
                                        return label ? <Badge key={label.id} style={{backgroundColor: label.color, color: '#fff'}} className="border-transparent">{label.text}</Badge> : null;
                                    })}
                                </div>
                                ) : (<span>{t('tasks.dialog.labels_placeholder')}</span>)}
                                </Button>
                                </FormControl></PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                                <CommandInput placeholder={t('tasks.dialog.labels_search_placeholder')} value={newLabelSearch} onValueChange={setNewLabelSearch} />
                                <CommandList><CommandEmpty>{t('tasks.dialog.labels_no_results')}</CommandEmpty>
                                <CommandGroup>
                                    {(activeBoard?.labels || []).filter(l => l.text.toLowerCase().includes(newLabelSearch.toLowerCase())).map(label => (
                                        <CommandItem key={label.id} onSelect={() => { const newSelection = field.value?.includes(label.id) ? field.value.filter(id => id !== label.id) : [...(field.value || []), label.id]; field.onChange(newSelection); setNewLabelSearch(""); }}>
                                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", field.value?.includes(label.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}><Check className="h-4 w-4" /></div>
                                            <div className="flex items-center"><span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: label.color }}></span>{label.text}</div>
                                        </CommandItem>
                                    ))}
                                    {newLabelSearch && !(activeBoard?.labels || []).some(l => l.text.toLowerCase() === newLabelSearch.toLowerCase()) && (
                                        <CommandItem onSelect={() => handleCreateNewLabel(newLabelSearch, field)}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            {t('tasks.dialog.labels_create_new', { name: newLabelSearch })}
                                        </CommandItem>
                                    )}
                                </CommandGroup></CommandList></Command></PopoverContent>
                                </Popover><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="checklist" render={() => (<FormItem><FormLabel>{t('tasks.dialog.checklist_label')}</FormLabel><FormDescription>{t('tasks.dialog.checklist_desc')}</FormDescription><div className="space-y-2">
                            {checklistFields.map((field, index) => (<div key={field.id} className="flex items-center gap-2">
                                <FormField control={form.control} name={`checklist.${index}.completed`} render={({ field: checkField }) => (<FormControl><Checkbox checked={checkField.value} onCheckedChange={checkField.onChange} /></FormControl>)}/>
                                <FormField control={form.control} name={`checklist.${index}.text`} render={({ field: textField }) => (<FormControl><Input {...textField} placeholder={t('tasks.dialog.checklist_item_placeholder')} /></FormControl>)}/>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(index)}><X className="h-4 w-4" /></Button>
                            </div>))}
                        </div><Button type="button" variant="outline" size="sm" onClick={() => appendChecklistItem({ id: `CL-${Date.now()}`, text: '', completed: false })}>{t('tasks.dialog.add_checklist_item_button')}</Button></FormItem>)}/>
                         <DialogFooter className="pt-4"><DialogClose asChild><Button type="button" variant="ghost">{t('common.cancel')}</Button></DialogClose><Button type="submit">{editingTask ? t('common.save_changes') : t('tasks.dialog.create_task_button')}</Button></DialogFooter>
                     </form></Form>
                 </DialogContent>
             </Dialog>

            <Dialog open={isWeeklyReportDialogOpen} onOpenChange={setIsWeeklyReportDialogOpen}>
                <DialogContent className="sm:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingReport ? t('tasks.dialog.edit_report_title') : t('tasks.dialog.configure_report_title')}
                    </DialogTitle>
                    <DialogDescription>
                      {t('tasks.dialog.report_desc', { name: activeBoard?.name })}
                    </DialogDescription>
                  </DialogHeader>
                   <Form {...weeklyReportForm}>
                    <form onSubmit={weeklyReportForm.handleSubmit(handleWeeklyReportSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                            <FormField control={weeklyReportForm.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>{t('tasks.dialog.report_name_label')}</FormLabel><FormControl><Input {...field} placeholder={t('tasks.dialog.report_name_placeholder')} /></FormControl><FormDescription>{t('tasks.dialog.report_name_desc')}</FormDescription><FormMessage/></FormItem>
                            )}/>

                            <FormField control={weeklyReportForm.control} name="reportType" render={({ field }) => (
                               <FormItem><FormLabel>{t('tasks.dialog.report_type_label')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="weekly-my-tasks">{t('tasks.report_types.weekly-my-tasks')}</SelectItem>
                                    <SelectItem value="weekly-all-tasks">{t('tasks.report_types.weekly-all-tasks')}</SelectItem>
                                    <SelectItem value="weekly-overdue">{t('tasks.report_types.weekly-overdue')}</SelectItem>
                                    <SelectItem value="weekly-due-soon">{t('tasks.report_types.weekly-due-soon')}</SelectItem>
                                </SelectContent>
                               </Select><FormMessage/></FormItem>
                            )}/>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={weeklyReportForm.control} name="dayOfWeek" render={({ field }) => (
                                <FormItem><FormLabel>{t('tasks.dialog.report_day_label')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    {[...Array(7).keys()].map(i => <SelectItem key={i} value={String(i)}>{new Date(2024, 0, i+1).toLocaleString(locale.locale, { weekday: 'long' })}</SelectItem>)}
                                </SelectContent>
                                </Select><FormMessage/></FormItem>
                                )}/>
                                <FormField control={weeklyReportForm.control} name="time" render={({ field }) => (
                                <FormItem><FormLabel>{t('tasks.dialog.time_label')}</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem>
                                )}/>
                            </div>

                             <FormField control={weeklyReportForm.control} name="recipients" render={({ field }) => (
                                <FormItem><FormLabel>{t('tasks.dialog.report_recipients_label')}</FormLabel><FormControl><Input {...field} placeholder={t('tasks.dialog.report_recipients_placeholder')} /></FormControl><FormDescription>{t('tasks.dialog.report_recipients_desc')}</FormDescription><FormMessage/></FormItem>
                            )}/>

                             <FormField control={weeklyReportForm.control} name="subject" render={({ field }) => (
                                <FormItem><FormLabel>{t('tasks.dialog.report_subject_label')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                            )}/>
                            
                            <FormField control={weeklyReportForm.control} name="body" render={({ field }) => (
                                <FormItem><FormLabel>{t('tasks.dialog.report_intro_label')}</FormLabel><FormControl><Textarea {...field} placeholder={t('tasks.dialog.report_intro_placeholder')} /></FormControl><FormMessage/></FormItem>
                            )}/>
                       </div>

                       <div className="bg-muted p-4 rounded-lg space-y-4">
                            <h4 className="font-semibold text-center">{t('tasks.dialog.report_preview_title')}</h4>
                            <div className="bg-background rounded-md shadow-sm p-4 text-sm">
                                <div className="border-b pb-2 mb-2">
                                    <p><span className="font-semibold">{t('tasks.dialog.report_preview_subject')}:</span> {weeklyReportForm.watch('subject')}</p>
                                    <p><span className="font-semibold">{t('tasks.dialog.report_preview_to')}:</span> {weeklyReportForm.watch('recipients')}</p>
                                </div>
                                <p className="italic mb-4">{weeklyReportForm.watch('body') || t('tasks.dialog.report_no_intro_text')}</p>
                                
                                <h5 className="font-semibold mb-2">{t(`tasks.report_types.${weeklyReportForm.watch('reportType') as ScheduledReportType}`)}</h5>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-2 rounded bg-secondary/50"><span>Sample Task 1</span> <Badge variant="outline">In Progress</Badge></div>
                                    <div className="flex items-center justify-between p-2 rounded bg-secondary/50"><span>Sample Task 2</span> <Badge variant="outline">To Do</Badge></div>
                                </div>

                                <p className="text-xs text-muted-foreground mt-4 text-center">{t('tasks.dialog.report_automated_note', {day: new Date(2024, 0, parseInt(weeklyReportForm.watch('dayOfWeek'),10)+1).toLocaleString(locale.locale, { weekday: 'long' }), time: weeklyReportForm.watch('time')})}</p>
                            </div>
                       </div>
                       <DialogFooter className="col-span-1 md:col-span-2">
                          <Button type="button" variant="secondary">{t('contracts.dialog.send_test_button')}</Button>
                          <div className="flex-grow"></div>
                          <DialogClose asChild><Button type="button" variant="ghost">{t('common.cancel')}</Button></DialogClose>
                          <Button type="submit">{t('tasks.dialog.report_save_button')}</Button>
                       </DialogFooter>
                    </form>
                   </Form>
                </DialogContent>
            </Dialog>

            <Sheet open={isDetailsSheetOpen} onOpenChange={handleCloseDetailsSheet}>
                <SheetContent className="flex flex-col sm:max-w-lg">
                     {selectedTaskForDetails && (
                        <>
                            <SheetHeader>
                                <SheetTitle className={cn(selectedTaskForDetails.isCompleted && "line-through")}>
                                  {t('tasks.details.title', { name: selectedTaskForDetails.title })}
                                </SheetTitle>
                                <SheetDescription>
                                    {t('tasks.details.task_in_list', { list: activeBoard?.columns.find(c => c.id === selectedTaskForDetails.columnId)?.title, board: activeBoard?.name })}
                                </SheetDescription>
                            </SheetHeader>
                             <div className="p-4 border-b">
                                <Button 
                                    onClick={() => handleToggleTaskCompletion(selectedTaskForDetails.id, !selectedTaskForDetails.isCompleted)}
                                    className="w-full"
                                    variant={selectedTaskForDetails.isCompleted ? "secondary" : "default"}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4"/>
                                    {selectedTaskForDetails.isCompleted ? t('tasks.toast.task_incomplete_title') : t('tasks.toast.task_completed_title')}
                                </Button>
                            </div>
                            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="details">{t('tasks.details.tabs.details')}</TabsTrigger>
                                    <TabsTrigger value="comments">{t('tasks.details.tabs.comments')}</TabsTrigger>
                                    <TabsTrigger value="activity">{t('tasks.details.tabs.activity')}</TabsTrigger>
                                </TabsList>
                                 <TabsContent value="details" className="flex-1 min-h-0">
                                   <ScrollArea className="h-full">
                                        <div className="space-y-4 p-4 text-sm">
                                            <div className="space-y-1">
                                               <p className="font-medium text-muted-foreground">{t('tasks.dialog.description_label')}</p>
                                               <p>{selectedTaskForDetails.description || 'N/A'}</p>
                                            </div>
                                             <Separator />
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                               <div className="space-y-1">
                                                    <p className="font-medium text-muted-foreground">{t('tasks.dialog.date_label')}</p>
                                                    <p>{format(new Date(selectedTaskForDetails.dueDate), 'yyyy/MM/dd')}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-medium text-muted-foreground">{t('tasks.dialog.priority_label')}</p>
                                                    <p className="capitalize">{t(`tasks.priority.${selectedTaskForDetails.priority}`)}</p>
                                                </div>
                                                 <div className="space-y-1">
                                                    <p className="font-medium text-muted-foreground">{t('units.title')}</p>
                                                    <p>{selectedTaskForDetails.unit}</p>
                                                </div>
                                                 <div className="space-y-1">
                                                    <p className="font-medium text-muted-foreground">{t('tasks.table.recurrence')}</p>
                                                    <p className="capitalize">{selectedTaskForDetails.recurrence.type}</p>
                                                </div>
                                                <div className="space-y-1 col-span-2">
                                                    <p className="font-medium text-muted-foreground">{t('tasks.dialog.assign_to_label')}</p>
                                                     <div className="flex items-center -space-x-2">
                                                        {(selectedTaskForDetails.assignees || []).map(id => {
                                                            const user = usersOnBoard.find(u => u.id === id);
                                                            if (!user) return null;
                                                            return (
                                                                <TooltipProvider key={id}><Tooltip><TooltipTrigger>
                                                                    <Avatar className="h-8 w-8 border-2 border-background">
                                                                        <AvatarImage src={user.avatar} alt={user.name} />
                                                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                                    </Avatar>
                                                                </TooltipTrigger><TooltipContent><p>{t('tasks.tooltips.assigned_to', { name: user.name })}</p></TooltipContent></Tooltip></TooltipProvider>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                             <Separator />
                                            {(selectedTaskForDetails.checklist || []).length > 0 && (<div>
                                                <Label className="font-medium text-base">{t('tasks.dialog.checklist_label')} ({selectedTaskForDetails.checklist?.filter(i => i.completed).length}/{selectedTaskForDetails.checklist?.length})</Label>
                                                <Progress value={((selectedTaskForDetails.checklist?.filter(i => i.completed).length || 0) / (selectedTaskForDetails.checklist?.length || 1)) * 100} className="mt-2" />
                                                <div className="space-y-2 mt-4">
                                                    {selectedTaskForDetails.checklist?.map(item => (<div key={item.id} className="flex items-center gap-2">
                                                        <Checkbox id={`details-checklist-${item.id}`} checked={item.completed} disabled />
                                                        <label htmlFor={`details-checklist-${item.id}`} className={cn("text-sm", item.completed && "line-through text-muted-foreground")}>{item.text}</label>
                                                    </div>))}
                                                </div>
                                            </div>)}
                                             <Separator />
                                             <div>
                                                <Label className="font-medium text-base">{t('tasks.details.tabs.attachments')}</Label>
                                                {(selectedTaskForDetails.attachments || []).length > 0 ? (<div className="space-y-2 mt-2">
                                                    {selectedTaskForDetails.attachments?.map((file, i) => (<a href={file.url} target="_blank" rel="noopener noreferrer" key={i} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted"><Paperclip className="h-4 w-4" /><span className="text-sm truncate">{file.name}</span></a>))}
                                                </div>) : (<p className="text-sm text-muted-foreground mt-2">{t('tasks.details.no_attachments_desc')}</p>)}
                                             </div>
                                             <Separator />
                                             <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-base">{t('tasks.details.tabs.reactions')}</h4>
                                                <Popover>
                                                    <PopoverTrigger asChild><Button size="icon" variant="ghost"><SmilePlus className="h-5 w-5 text-muted-foreground"/></Button></PopoverTrigger>
                                                    <PopoverContent className="w-auto p-2">
                                                        <div className="flex gap-1">
                                                            {(appearanceSettings?.allowedReactions || []).map(emoji => (
                                                                <Button key={emoji} variant="ghost" size="icon" onClick={() => handleAddReaction(selectedTaskForDetails.id, emoji)}>
                                                                    <span className="text-lg">{emoji}</span>
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries((selectedTaskForDetails.reactions || []).reduce((acc, r) => {
                                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                    return acc;
                                                }, {} as Record<string, number>)).map(([emoji, count]) => {
                                                    const userHasReacted = (selectedTaskForDetails.reactions || []).some(r => r.userId === currentUser?.id && r.emoji === emoji);
                                                    return (<TooltipProvider key={emoji}><Tooltip><TooltipTrigger asChild>
                                                        <Button variant={userHasReacted ? 'secondary': 'outline'} size="sm" className="rounded-full" onClick={() => handleAddReaction(selectedTaskForDetails.id, emoji)}>
                                                            <span className="mr-1">{emoji}</span> {count}
                                                        </Button>
                                                    </TooltipTrigger><TooltipContent>
                                                        {(selectedTaskForDetails.reactions || []).filter(r => r.emoji === emoji).map(r => r.userName).join(', ')}
                                                    </TooltipContent></Tooltip></TooltipProvider>)
                                                })}
                                            </div>
                                        </div>
                                   </ScrollArea>
                                </TabsContent>
                                <TabsContent value="comments" className="flex-1 flex flex-col min-h-0">
                                    <div className="flex-1 overflow-y-auto pr-6 -mr-6 space-y-4 py-4">
                                        {(selectedTaskForDetails.comments || []).length > 0 ? (
                                            (selectedTaskForDetails.comments || []).map(comment => {
                                            const creator = usersOnBoard.find(u => u.id === comment.authorId);
                                            return (
                                                <div key={comment.id} className="flex items-start gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={creator?.avatar} alt={creator?.name}/>
                                                        <AvatarFallback>{comment.author.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-semibold text-sm">{comment.author}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatDistance(new Date(comment.createdAt), new Date())}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-lg mt-1">{comment.text}</p>
                                                    </div>
                                                </div>
                                            )
                                            })
                                        ) : (
                                            <div className="text-center text-muted-foreground py-10">
                                                <MessageSquare className="mx-auto h-12 w-12" />
                                                <p className="mt-4">{t('contracts.details.no_comments_title')}</p>
                                                <p>{t('contracts.details.no_comments_desc')}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-auto pt-4 border-t">
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
                                                <Button type="submit">{t('contracts.details.post_comment_button')}</Button>
                                            </form>
                                        </Form>
                                    </div>
                                </TabsContent>
                                <TabsContent value="activity" className="flex-1 overflow-y-auto">
                                    <ScrollArea className="h-full">
                                        <div className="space-y-4 py-4">
                                            {(selectedTaskForDetails.logs || []).length > 0 ? (
                                                [...(selectedTaskForDetails.logs || [])].reverse().map(log => {
                                                    const creator = usersOnBoard.find(u => u.id === log.userId);
                                                    return (
                                                    <div key={log.id} className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={creator?.avatar} alt={creator?.name} />
                                                            <AvatarFallback>{creator?.name.charAt(0) || 'U'}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm"><span className="font-semibold">{log.userName}</span> <span className="text-muted-foreground">{t(`tasks.logs.${log.action}`, log.details)}</span></p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatDistance(new Date(log.timestamp), new Date(), {addSuffix: true})}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )})
                                            ) : (
                                                <div className="text-center text-muted-foreground py-10">
                                                    <History className="mx-auto h-12 w-12" />
                                                    <p className="mt-4">{t('tasks.details.no_activity_title')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            <Dialog open={isLabelManagerOpen} onOpenChange={setIsLabelManagerOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t('tasks.dialog.manage_labels_title', { name: activeBoard?.name || '' })}</DialogTitle><DialogDescription>{t('tasks.dialog.manage_labels_desc')}</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <Form {...labelForm}><form onSubmit={labelForm.handleSubmit(onLabelSubmit)} className="flex items-end gap-2">
                            <FormField name="text" control={labelForm.control} render={({field}) => (<FormItem className="flex-1"><FormLabel>{t('tasks.dialog.labels_label')}</FormLabel><FormControl><Input {...field} placeholder={t('tasks.dialog.label_name_placeholder')} /></FormControl></FormItem>)}/>
                            <FormField name="color" control={labelForm.control} render={({field}) => (<FormItem><FormLabel>{t('tasks.dialog.label_color')}</FormLabel><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-start"><div className="w-5 h-5 rounded-full mr-2 border" style={{ backgroundColor: field.value }}></div></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><div className="grid grid-cols-6 gap-2 p-2">{defaultColors.map(color => (<button key={color} type="button" onClick={() => field.onChange(color)} className={cn("h-6 w-6 rounded-full border-2", field.value === color && "ring-2 ring-ring ring-offset-2")} style={{ backgroundColor: color }} />))}</div></PopoverContent></Popover></FormItem>)}/>
                            <Button type="submit">{editingLabel ? t('common.save_changes') : t('tasks.dialog.add_label_button')}</Button>
                        </form></Form>
                         <div className="space-y-2">
                            {(activeBoard?.labels || []).length > 0 ? (activeBoard?.labels || []).map(label => (
                                <div key={label.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <Badge style={{ backgroundColor: label.color, color: '#fff' }} className="border-transparent">{label.text}</Badge>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingLabel(label)}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setLabelToDelete(label)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center py-4">{t('tasks.dialog.no_labels_yet')}</p>}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCopyColumnDialogOpen} onOpenChange={handleCloseCopyColumnDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('tasks.dialog.copy_list_title')}</DialogTitle>
                        <DialogDescription>{t('tasks.dialog.copy_list_desc', { name: columnToCopy?.title || '' })}</DialogDescription>
                    </DialogHeader>
                    <Form {...copyColumnForm}>
                        <form onSubmit={copyColumnForm.handleSubmit(onCopyColumnSubmit)} className="space-y-4">
                            <FormField control={copyColumnForm.control} name="title" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('tasks.dialog.copy_list_name_label')}</FormLabel>
                                    <FormControl><Input {...field} autoFocus /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">{t('common.cancel')}</Button></DialogClose>
                                <Button type="submit">{t('tasks.board.copy_list')}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            
            {labelToDelete && (
                 <AlertDialog open={!!labelToDelete} onOpenChange={() => setLabelToDelete(null)}>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('tasks.dialog.delete_label_title')}</AlertDialogTitle><AlertDialogDescription>{t('tasks.dialog.delete_label_desc', { name: labelToDelete.text })}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteLabel}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
            )}

             {columnToDelete && (
                 <AlertDialog open={isDeleteColumnAlertOpen} onOpenChange={setIsDeleteColumnAlertOpen}>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('tasks.dialog.delete_list_title')}</AlertDialogTitle><AlertDialogDescription>{t('tasks.dialog.delete_list_desc', { name: columnToDelete.title })}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel onClick={() => setColumnToDelete(null)}>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteColumnPermanently}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
