
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PlusCircle, MoreHorizontal, ClipboardCheck, Calendar as CalendarIcon, X, Users as UsersIcon, MessageSquare, Download, CheckCircle, ArrowUpDown, Tag, Settings, Trash2, Edit, Share2, Paperclip, Upload, Archive, ArchiveRestore, Calendar as CalendarViewIcon, ChevronLeft, ChevronRight, Copy, Mail, SlidersHorizontal, ChevronsUpDown, Check, History, SmilePlus, Flag, Loader2, ArrowLeft, ArrowRight, ChevronDown, Mic, Pause, Play, StopCircle, Send, LayoutGrid, Filter } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from "react-beautiful-dnd";
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
import type { Task, User, Comment, TaskBoard, BoardPermissionRole, ChecklistItem, BoardColumn, AppearanceSettings, ScheduledReport, ScheduledReportType, ActivityLog, Label as LabelType, Reaction } from '@/lib/types';
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
import Image from 'next/image';

const AUTH_USER_KEY = 'current_user';
const APPEARANCE_SETTINGS_KEY = 'appearance-settings';
const TASKS_KEY = 'tasks_data';
const BOARDS_KEY = 'boards_data';

type SortableTaskField = 'title' | 'dueDate' | 'priority' | 'columnId';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'board' | 'calendar' | 'archive';


const checklistItemSchema = z.object({
    id: z.string(),
    text: z.string().min(1, "Checklist item cannot be empty"),
    completed: z.boolean(),
});

const taskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    isCompleted: z.boolean(),
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
    text: z.string().optional(),
    attachment: z.object({
      url: z.string(),
      type: z.enum(['audio']),
      meta: z.object({ duration: z.number() }).optional(),
    }).optional(),
}).refine(data => !!data.text?.trim() || !!data.attachment, {
    message: "Comment cannot be empty.",
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

export default function TasksPage() {
    const { t } = useLanguage();
    const { calendar, locale, format, formatDistance, dateFnsLocale, differenceInDays } = useCalendar();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [boards, setBoards] = useState<TaskBoard[]>([]);
    const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(mockScheduledReports);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings | null>(null);

    const [isBoardSwitcherOpen, setIsBoardSwitcherOpen] = useState(false);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [isBoardDialogOpen, setIsBoardDialogOpen] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isDeleteBoardAlertOpen, setIsDeleteBoardAlertOpen] = useState(false);
    const [boardToDelete, setBoardToDelete] = useState<TaskBoard | null>(null);
    const [isDeleteColumnAlertOpen, setIsDeleteColumnAlertOpen] = useState(false);
    const [columnToDelete, setColumnToDelete] = useState<BoardColumn | null>(null);
    const [isMoveColumnDialogOpen, setIsMoveColumnDialogOpen] = useState(false);
    const [isCopyColumnDialogOpen, setIsCopyColumnDialogOpen] = useState(false);
    const [columnToCopy, setColumnToCopy] = useState<BoardColumn | null>(null);
    const [isWeeklyReportDialogOpen, setIsWeeklyReportDialogOpen] = useState(false);
    const [isReportManagerOpen, setIsReportManagerOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<ScheduledReport | null>(null);
    const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
    
    const [isRecording, setIsRecording] = useState(false);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [audioWave, setAudioWave] = useState<number[]>([]);
    
    const [mentionQuery, setMentionQuery] = useState('');
    const [isMentionPopoverOpen, setIsMentionPopoverOpen] = useState(false);
    const [isRestoreTaskDialogOpen, setIsRestoreTaskDialogOpen] = useState(false);
    const [taskToRestore, setTaskToRestore] = useState<Task | null>(null);
    const [isRestoreColumnDialogOpen, setIsRestoreColumnDialogOpen] = useState(false);
    const [columnToRestore, setColumnToRestore] = useState<BoardColumn | null>(null);
    const [tasksToRestoreWithColumn, setTasksToRestoreWithColumn] = useState<string[]>([]);
    
    const [columnToMove, setColumnToMove] = useState<BoardColumn | null>(null);
    const [showAddColumnForm, setShowAddColumnForm] = useState(false);
    const [moveColumnTargetId, setMoveColumnTargetId] = useState<string | null>(null);
    const [moveColumnPosition, setMoveColumnPosition] = useState<'before' | 'after'>('after');
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
    const [editingColumnTitle, setEditingColumnTitle] = useState('');


    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editingBoard, setEditingBoard] = useState<TaskBoard | null>(null);
    const [sharingBoard, setSharingBoard] = useState<TaskBoard | null>(null);
    
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
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ includeCompleted: true, assignedToMe: false });
    const [sorting, setSorting] = useState<{ field: SortableTaskField, direction: SortDirection }>({ field: 'dueDate', direction: 'asc' });

    const newColumnFormRef = useRef<HTMLFormElement>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    
    const [currentMonth, setCurrentMonth] = useState(new Date());


    const form = useForm<z.infer<typeof taskSchema>>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            title: "",
            isCompleted: false,
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
        defaultValues: { text: "", attachment: undefined },
    });
    
    const boardForm = useForm<z.infer<typeof boardSchema>>({
      resolver: zodResolver(boardSchema),
      defaultValues: {
        name: "",
        color: "#3b82f6",
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
            color: "#3b82f6",
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

        try {
            const storedTasks = localStorage.getItem(TASKS_KEY);
            setTasks(storedTasks ? JSON.parse(storedTasks) : mockTasks);

            const storedBoards = localStorage.getItem(BOARDS_KEY);
            setBoards(storedBoards ? JSON.parse(storedBoards) : mockTaskBoards);
        } catch (error) {
            console.error("Failed to parse data from localStorage", error);
            setTasks(mockTasks);
            setBoards(mockTaskBoards);
        }

    }, []);

    const updateTasks = (newTasks: Task[]) => {
        setTasks(newTasks);
        if(typeof window !== "undefined") localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));
    };

    const updateBoards = (newBoards: TaskBoard[]) => {
        setBoards(newBoards);
        if(typeof window !== "undefined") localStorage.setItem(BOARDS_KEY, JSON.stringify(newBoards));
    };
    
    const userBoards = useMemo(() => {
        if (!currentUser) return [];
        return boards.filter(board => 
            !board.isArchived &&
            (currentUser.role === 'super-admin' || board.ownerId === currentUser.id || board.sharedWith?.some(s => s.userId === currentUser.id))
        );
    }, [boards, currentUser]);

    const archivedBoards = useMemo(() => {
        if (!currentUser) return [];
        return boards.filter(board => board.isArchived && (currentUser.role === 'super-admin' || board.ownerId === currentUser.id));
    }, [boards, currentUser]);
    
    useEffect(() => {
        if (userBoards.length > 0 && (!activeBoardId || !userBoards.find(b => b.id === activeBoardId))) {
            setActiveBoardId(userBoards[0].id);
        } else if (userBoards.length === 0 && archivedBoards.length > 0) {
            setActiveBoardId(null);
        } else if (userBoards.length === 0 && archivedBoards.length === 0) {
            setActiveBoardId(null);
        }
    }, [userBoards, archivedBoards, activeBoardId]);


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
                isCompleted: editingTask.isCompleted,
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
                isCompleted: false,
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
        if (isBoardDialogOpen) {
            if (editingBoard) {
                boardForm.reset({
                    name: editingBoard.name,
                    color: editingBoard.color,
                });
            } else {
                boardForm.reset({
                    name: "",
                    color: "#3b82f6",
                });
            }
        }
    }, [isBoardDialogOpen, editingBoard, boardForm]);
    
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
        if (isLabelManagerOpen) {
            if(editingLabel) {
                 labelForm.reset({
                    text: editingLabel.text,
                    color: editingLabel.color,
                });
            } else {
                 labelForm.reset({
                    text: "",
                    color: "#3b82f6",
                });
            }
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
            form.setValue('isCompleted', false);
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
    
    const handleOpenMoveColumnDialog = (column: BoardColumn) => {
        setColumnToMove(column);
        setMoveColumnTargetId(null);
        setMoveColumnPosition('after');
        setIsMoveColumnDialogOpen(true);
    };

    const handleCloseMoveColumnDialog = () => {
        setColumnToMove(null);
        setIsMoveColumnDialogOpen(false);
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
            updateTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t));

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
                updateBoards(updatedBoards);
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
                reminders: [], 
                recurrence: { type: 'none', time: '09:00'}, 
                attachments: attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })),
                isArchived: false,
                comments: [],
                checklist: values.checklist || [],
                logs: [createLogEntry('created', { title: values.title })],
                reactions: [],
                labelIds: values.labelIds || [],
            };
            updateTasks([newTask, ...tasks]);
            
            const updatedBoard = {
                ...activeBoard,
                columns: activeBoard.columns.map(col => 
                    col.id === values.columnId ? { ...col, taskIds: [newTaskId, ...(col.taskIds || [])] } : col
                )
            };
            updateBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));

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
        updateTasks(updatedTasks);

        if (selectedTaskForDetails?.id === taskId) {
            setSelectedTaskForDetails(prev => prev ? {...prev, isCompleted, logs: [...(prev.logs || []), log]} : null);
        }
    };

    const handleDeleteTask = (taskId: string, fromArchive = false) => {
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;
        
        updateTasks(tasks.filter(t => t.id !== taskId));
        
        if (!fromArchive) {
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
            updateBoards(updatedBoards);
        }
        
        toast({
            title: t('tasks.toast.task_deleted_title'),
            description: t('tasks.toast.task_deleted_desc'),
            variant: "destructive"
        });
        if (isDetailsSheetOpen && selectedTaskForDetails?.id === taskId) {
            handleCloseDetailsSheet();
        }
    };
    
    const handleArchiveTask = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        updateTasks(tasks.map(t => t.id === taskId ? { ...t, isArchived: true } : t));
        
        const updatedBoards = boards.map(b => {
            if (b.id === task.boardId) {
                return {
                    ...b,
                    columns: b.columns.map(col => ({
                        ...col,
                        taskIds: col.taskIds.filter(id => id !== taskId)
                    }))
                };
            }
            return b;
        });
        updateBoards(updatedBoards);
    };

    const handleRestoreTask = (targetColumnId?: string) => {
        if (!taskToRestore) return;
        
        if (userBoards.length === 0) {
            toast({
                title: t('common.error'),
                description: t('tasks.toast.no_active_board_for_restore'),
                variant: 'destructive',
            });
            return;
        }

        const targetBoard = boards.find(b => b.id === (activeBoardId || taskToRestore.boardId));
         if(!targetBoard || targetBoard.columns.filter(c => !c.isArchived).length === 0){
            toast({
                title: t('common.error'),
                description: t('tasks.toast.no_active_columns_for_restore'),
                variant: 'destructive',
            });
            return;
        }

        const finalColumnId = targetColumnId || taskToRestore.columnId;

        // Add task back to the column's task list
        const updatedBoards = boards.map(board => {
            if (board.id === (activeBoardId || taskToRestore.boardId)) {
                const newColumns = board.columns.map(col => {
                    if (col.id === finalColumnId) {
                        return { ...col, taskIds: [...(col.taskIds || []), taskToRestore.id] };
                    }
                    return col;
                });
                return { ...board, columns: newColumns };
            }
            return board;
        });
        updateBoards(updatedBoards);

        // Update task state
        updateTasks(tasks.map(task => 
            task.id === taskToRestore.id ? { ...task, isArchived: false, columnId: finalColumnId } : task
        ));
        
        toast({ title: t('tasks.toast.task_restored') });
        setTaskToRestore(null);
        setIsRestoreTaskDialogOpen(false);
    };

    const onArchiveTaskClick = (task: Task) => {
        setTaskToRestore(task);
        setIsRestoreTaskDialogOpen(true);
    }
    
    const onBoardSubmit = (values: z.infer<typeof boardSchema>) => {
      if(!currentUser) return;

      if (editingBoard) {
        const updatedBoard = { ...editingBoard, ...values };
        updateBoards(boards.map(b => b.id === editingBoard.id ? updatedBoard : b));
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
            isArchived: false,
        };
        updateBoards([...boards, newBoard]);
        setActiveBoardId(newBoard.id);
        toast({
            title: t('tasks.toast.board_created_title'),
            description: t('tasks.toast.board_created_desc', { name: newBoard.name })
        });
      }
      handleCloseBoardDialog();
    };
    
    const handleArchiveBoard = (boardId: string) => {
        updateBoards(boards.map(b => b.id === boardId ? { ...b, isArchived: true } : b));
        setActiveBoardId(null);
        toast({ title: t('tasks.toast.board_archived_title') });
    };

    const handleRestoreBoard = (boardId: string) => {
        updateBoards(boards.map(b => b.id === boardId ? { ...b, isArchived: false } : b));
        setViewMode('board');
        setActiveBoardId(boardId);
        toast({ title: t('tasks.toast.board_restored_title') });
    };

    const handleDeleteBoardPermanently = (boardId: string) => {
        const boardToDelete = boards.find(b => b.id === boardId);
        if (!boardToDelete) return;

        updateBoards(boards.filter(b => b.id !== boardId));
        updateTasks(tasks.filter(t => t.boardId !== boardId));

        if (activeBoardId === boardId) {
            const nextBoard = archivedBoards.find(b => b.id !== boardId) || userBoards[0];
            setActiveBoardId(nextBoard?.id || null);
        }
        
        toast({
            title: t('tasks.toast.board_deleted_title'),
            description: t('tasks.toast.board_deleted_desc', { name: boardToDelete.name }),
            variant: "destructive"
        });
        setBoardToDelete(null);
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
        updateBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        
        toast({ title: t('tasks.toast.list_added_title'), description: t('tasks.toast.list_added_desc', { name: values.title })});
        columnForm.reset();
        setShowAddColumnForm(false);
    };

    const handleMoveColumn = () => {
        if (!activeBoard || !columnToMove || !moveColumnTargetId) return;
    
        const columns = [...activeBoard.columns];
        const sourceIndex = columns.findIndex(c => c.id === columnToMove.id);
        const targetIndex = columns.findIndex(c => c.id === moveColumnTargetId);
    
        if (sourceIndex === -1 || targetIndex === -1) return;
    
        const [movedColumn] = columns.splice(sourceIndex, 1);
        const newTargetIndexAfterSplice = columns.findIndex(c => c.id === moveColumnTargetId);
    
        if (moveColumnPosition === 'before') {
            columns.splice(newTargetIndexAfterSplice, 0, movedColumn);
        } else {
            columns.splice(newTargetIndexAfterSplice + 1, 0, movedColumn);
        }
    
        const updatedBoard = { ...activeBoard, columns };
        updateBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        
        toast({ title: t('tasks.toast.list_moved_title') });
        handleCloseMoveColumnDialog();
    };
    
    const handleArchiveColumn = (columnId: string) => {
        if (!activeBoard) return;
        const updatedBoard = {
            ...activeBoard,
            columns: activeBoard.columns.map(c => c.id === columnId ? { ...c, isArchived: true } : c)
        };
        updateBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        
        toast({ title: t('tasks.toast.list_archived_title'), description: t('tasks.toast.list_archived_desc') });
    };

    const onRestoreColumnClick = (column: BoardColumn) => {
         if (userBoards.length === 0) {
            toast({
                title: t('common.error'),
                description: t('tasks.toast.no_active_board_for_restore'),
                variant: 'destructive',
            });
            return;
        }

        setColumnToRestore(column);
        setTasksToRestoreWithColumn(
            tasks
                .filter(t => t.columnId === column.id && t.isArchived)
                .map(t => t.id)
        );
        setIsRestoreColumnDialogOpen(true);
    };

    const handleRestoreColumn = () => {
        if (!columnToRestore) return;

        const updatedBoard = {
            ...boards.find(b => b.id === columnToRestore.boardId)!,
            columns: boards.find(b => b.id === columnToRestore.boardId)!.columns.map(c => c.id === columnToRestore.id ? { ...c, isArchived: false } : c)
        };
        updateBoards(boards.map(b => b.id === updatedBoard.id ? updatedBoard : b));

        const updatedTasks = tasks.map(t => 
            tasksToRestoreWithColumn.includes(t.id) ? { ...t, isArchived: false } : t
        );
        updateTasks(updatedTasks);
        
        toast({ title: t('tasks.toast.list_restored_title'), description: t('tasks.toast.list_restored_desc') });
        setIsRestoreColumnDialogOpen(false);
        setColumnToRestore(null);
        setTasksToRestoreWithColumn([]);
    }
    
    const handleDeleteColumnPermanently = () => {
        if (!activeBoard || !columnToDelete) return;
        
        const updatedColumns = activeBoard.columns.filter(c => c.id !== columnToDelete.id);
        const updatedBoard = { ...activeBoard, columns: updatedColumns };
        
        const remainingTasks = tasks.filter(t => t.columnId !== columnToDelete.id);
        
        updateBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        updateTasks(remainingTasks);
        
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

      updateBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
      updateTasks([...tasks, ...newTasks]);

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
        updateBoards(boards.map(b => b.id === sharingBoard.id ? sharingBoard : b));
        toast({ title: t('tasks.toast.sharing_updated_title'), description: t('tasks.toast.sharing_updated_desc') });
        handleCloseShareDialog();
    };

    const handleInsertText = (text: string) => {
        if (commentInputRef.current) {
            const { selectionStart, selectionEnd, value } = commentInputRef.current;
            const newText =
                value.substring(0, selectionStart) +
                text +
                value.substring(selectionEnd);
            commentForm.setValue("text", newText, { shouldDirty: true });
            commentInputRef.current.focus();
            setTimeout(() => {
                commentInputRef.current?.setSelectionRange(selectionStart + text.length, selectionStart + text.length);
            }, 0);
        }
    };


    const onCommentSubmit = (values: z.infer<typeof commentSchema>) => {
        if (!currentUser || !selectedTaskForDetails) return;
        if (!values.text?.trim() && !values.attachment) {
            commentForm.setError("text", { message: "Comment cannot be empty." });
            return;
        };

        const newComment: Comment = {
            id: `CMT-${Date.now()}`,
            text: values.text,
            author: currentUser.name,
            authorId: currentUser.id,
            createdAt: new Date().toISOString(),
            attachment: values.attachment,
        };

        const updatedTask = {
            ...selectedTaskForDetails,
            comments: [...(selectedTaskForDetails.comments || []), newComment],
            logs: [...(selectedTaskForDetails.logs || []), createLogEntry('commented', { text: values.text || "Sent a voice message" })],
        };

        updateTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        setSelectedTaskForDetails(updatedTask);
        commentForm.reset({text: "", attachment: undefined});
    };

    const handleDeleteComment = (commentId: string) => {
        if (!selectedTaskForDetails) return;
        
        const commentToDelete = (selectedTaskForDetails.comments || []).find(c => c.id === commentId);
        if (!commentToDelete || (currentUser?.id !== commentToDelete.authorId && currentUser?.role !== 'super-admin')) {
             toast({ title: t('common.error'), description: "You don't have permission to delete this comment.", variant: 'destructive'});
             return;
        }

        const updatedTask = {
            ...selectedTaskForDetails,
            comments: (selectedTaskForDetails.comments || []).filter(c => c.id !== commentId)
        };
        setSelectedTaskForDetails(updatedTask);
        updateTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        toast({ title: t('tasks.toast.comment_deleted_title') });
    }
    
    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId, type } = result;
    
        if (!destination || !activeBoard) {
            return;
        }
    
        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }
    
        if (type === 'COLUMN') {
            const newColumnOrder = Array.from(activeBoard.columns);
            const [reorderedItem] = newColumnOrder.splice(source.index, 1);
            newColumnOrder.splice(destination.index, 0, reorderedItem);
    
            const updatedBoard = {
              ...activeBoard,
              columns: newColumnOrder,
            };
            updateBoards(boards.map(b => (b.id === updatedBoard.id ? updatedBoard : b)));
            return;
        }
    
        const startColumn = activeBoard.columns.find(col => col.id === source.droppableId);
        const finishColumn = activeBoard.columns.find(col => col.id === destination.droppableId);
    
        if (!startColumn || !finishColumn) return;

        if (startColumn === finishColumn) {
            const newTaskIds = Array.from(startColumn.taskIds);
            const [reorderedItem] = newTaskIds.splice(source.index, 1);
            newTaskIds.splice(destination.index, 0, reorderedItem);
        
            const newColumn = {
                ...startColumn,
                taskIds: newTaskIds,
            };
        
            const newBoard = {
                ...activeBoard,
                columns: activeBoard.columns.map(c => c.id === newColumn.id ? newColumn : c),
            };
        
            updateBoards(boards.map(b => (b.id === newBoard.id ? newBoard : b)));
        } else {
            const startTaskIds = Array.from(startColumn.taskIds);
            startTaskIds.splice(source.index, 1);
            const newStartColumn = {
              ...startColumn,
              taskIds: startTaskIds,
            };
        
            const finishTaskIds = Array.from(finishColumn.taskIds);
            finishTaskIds.splice(destination.index, 0, draggableId);
            const newFinishColumn = {
              ...finishColumn,
              taskIds: finishTaskIds,
            };

            const newBoard = {
                ...activeBoard,
                columns: activeBoard.columns.map(c => {
                  if (c.id === newStartColumn.id) return newStartColumn;
                  if (c.id === newFinishColumn.id) return newFinishColumn;
                  return c;
                }),
            };
            updateBoards(boards.map(b => (b.id === newBoard.id ? newBoard : b)));

            const updatedTasks = tasks.map(t => {
                if (t.id === draggableId) {
                     const log = createLogEntry('moved_column', { from: startColumn.title, to: finishColumn.title });
                    return { ...t, columnId: finishColumn.id, logs: [...(t.logs || []), log] };
                }
                return t;
            });
            updateTasks(updatedTasks);
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
        updateBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        setEditingLabel(null);
        labelForm.reset({ text: '', color: '#3b82f6' });
    };

    const handleCreateNewLabel = (searchText: string, field: any) => {
        if (!activeBoard || !searchText) return;
        const newLabel: LabelType = {
            id: `LBL-${Date.now()}`,
            text: searchText,
            color: "#3b82f6",
        };
        const updatedBoard = {
            ...activeBoard,
            labels: [...(activeBoard.labels || []), newLabel]
        };
        updateBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
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
        updateBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));

        const updatedTasks = tasks.map(task => ({
            ...task,
            labelIds: (task.labelIds || []).filter(id => id !== labelToDelete.id)
        }));
        updateTasks(updatedTasks);
        
        toast({ title: t('tasks.toast.label_deleted') });
        setLabelToDelete(null);
    };
    
    const handleAddReaction = (taskId: string, emoji: string) => {
        if (!currentUser) return;
        const newTasks = tasks.map(task => {
            if (task.id === taskId) {
                let newReactions = [...(task.reactions || [])];
                const userReactionIndex = newReactions.findIndex(r => r.userId === currentUser.id);

                if (userReactionIndex > -1) {
                    if (newReactions[userReactionIndex].emoji === emoji) {
                        newReactions.splice(userReactionIndex, 1);
                    } else {
                        newReactions[userReactionIndex].emoji = emoji;
                    }
                } else {
                    newReactions.push({ emoji, userId: currentUser.id, userName: currentUser.name });
                }

                const updatedTask = { ...task, reactions: newReactions };
                if (selectedTaskForDetails?.id === taskId) {
                    setSelectedTaskForDetails(updatedTask);
                }
                return updatedTask;
            }
            return task;
        });
        updateTasks(newTasks);
    };
    
    const handleAddCommentReaction = (commentId: string, emoji: string) => {
        if (!currentUser || !selectedTaskForDetails) return;

        const updatedComments = (selectedTaskForDetails.comments || []).map(comment => {
            if (comment.id === commentId) {
                let newReactions = [...(comment.reactions || [])];
                const userReactionIndex = newReactions.findIndex(r => r.userId === currentUser.id);

                 if (userReactionIndex > -1) {
                    if (newReactions[userReactionIndex].emoji === emoji) {
                        newReactions.splice(userReactionIndex, 1);
                    } else {
                        newReactions[userReactionIndex].emoji = emoji;
                    }
                } else {
                    newReactions.push({ emoji, userId: currentUser.id, userName: currentUser.name });
                }
                return { ...comment, reactions: newReactions };
            }
            return comment;
        });
        
        const updatedTask = { ...selectedTaskForDetails, comments: updatedComments };
        setSelectedTaskForDetails(updatedTask);
        updateTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    };

    const handleDeleteCommentReaction = (commentId: string, reaction: Reaction) => {
        if (!selectedTaskForDetails || currentUser?.role !== 'super-admin') return;
        const updatedComments = (selectedTaskForDetails.comments || []).map(comment => {
            if (comment.id === commentId) {
                const newReactions = (comment.reactions || []).filter(r => !(r.userId === reaction.userId && r.emoji === reaction.emoji));
                return { ...comment, reactions: newReactions };
            }
            return comment;
        });
        const updatedTask = { ...selectedTaskForDetails, comments: updatedComments };
        setSelectedTaskForDetails(updatedTask);
        updateTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    }
    
    const handleOpenDetailsSheet = (task: Task) => {
        setSelectedTaskForDetails(task);
        setIsDetailsSheetOpen(true);
    };
    
     const handleCloseDetailsSheet = () => {
        setSelectedTaskForDetails(null);
        setIsDetailsSheetOpen(false);
        commentForm.reset();
        if (isRecording) {
            handleCancelRecording();
        }
    };
    
    const activeBoardTasks = useMemo(() => {
        if (!activeBoardId) return [];
        return tasks.filter(t => t.boardId === activeBoardId && !t.isArchived);
    }, [tasks, activeBoardId]);


    const filteredTasks = useMemo(() => {
        let baseTasks = activeBoardTasks;
        
        if (searchTerm) {
             baseTasks = baseTasks.filter(task => {
                const searchLower = searchTerm.toLowerCase();
                return task.title.toLowerCase().includes(searchLower) ||
                    task.description?.toLowerCase().includes(searchLower);
            });
        }

        if (!filters.includeCompleted) {
            baseTasks = baseTasks.filter(task => !task.isCompleted);
        }
    
        if (filters.assignedToMe && currentUser) {
            baseTasks = baseTasks.filter(task => (task.assignees || []).includes(currentUser.id));
        }

        return baseTasks;
    }, [activeBoardTasks, searchTerm, filters, currentUser]);

    const calendarTasks = useMemo(() => {
        if (!activeBoardId) return [];
        const baseTasks = tasks.filter(t => t.boardId === activeBoardId && !t.isArchived);
        if (searchTerm) {
             return baseTasks.filter(task => {
                const searchLower = searchTerm.toLowerCase();
                return task.title.toLowerCase().includes(searchLower) ||
                    task.description?.toLowerCase().includes(searchLower);
            });
        }
        return baseTasks;
    }, [tasks, activeBoardId, searchTerm]);


    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startingDayIndex = getDay(start);
        const placeholders = Array.from({ length: startingDayIndex }, (_, i) => ({ date: null, key: `placeholder-${i}` }));
        return [...placeholders, ...days.map(d => ({date:d, key: format(d, 'yyyy-MM-dd')}))];
    }, [currentMonth, format]);

    const tasksByDate = useMemo(() => {
        return calendarTasks.reduce((acc, task) => {
            const dueDate = format(new Date(task.dueDate), 'yyyy-MM-dd');
            if (!acc[dueDate]) { acc[dueDate] = []; }
            acc[dueDate].push(task);
            return acc;
        }, {} as Record<string, Task[]>);
    }, [calendarTasks, format]);

    const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
    const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const goToToday = () => setCurrentMonth(new Date());

    const handleToggleVoiceRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.pause();
            if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            setIsRecording(false);
            return;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsRecording(true);
            recordingIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
            return;
        } 
            
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const draw = () => {
                if (mediaRecorderRef.current?.state !== 'recording') return;
                requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);
                const waveSlice = Array.from(dataArray).slice(0, 32).map(d => d / 255 * 100);
                setAudioWave(waveSlice);
            };

            mediaRecorderRef.current.ondataavailable = (event) => {
                setAudioChunks((prev) => [...prev, event.data]);
            };
            mediaRecorderRef.current.onstart = draw;
            mediaRecorderRef.current.start(100); // Collect data every 100ms
            setIsRecording(true);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            setRecordingTime(0);
            recordingIntervalRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            toast({ title: t('common.error'), description: t('tasks.toast.mic_error'), variant: 'destructive' });
            return;
        }
    };

    const handleSendRecording = () => {
        if (!mediaRecorderRef.current) return;
        
        const onStop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            commentForm.setValue('attachment', {
                url: audioUrl,
                type: 'audio',
                meta: { duration: recordingTime }
            });
            onCommentSubmit(commentForm.getValues());
            // Cleanup
            setAudioChunks([]);
            setRecordingTime(0);
            setAudioWave([]);
            if (mediaRecorderRef.current?.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            mediaRecorderRef.current = null;
        }

        if (mediaRecorderRef.current.state === 'inactive') {
            onStop();
        } else {
             mediaRecorderRef.current.onstop = onStop;
             mediaRecorderRef.current.stop();
        }
        if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        setIsRecording(false);
    }

    const handleCancelRecording = () => {
        if (!mediaRecorderRef.current) return;
        
        if (mediaRecorderRef.current.state !== 'inactive') {
             mediaRecorderRef.current.stop();
        }
       
        if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        setIsRecording(false);
        
        setTimeout(() => {
             setAudioChunks([]);
             setRecordingTime(0);
             setAudioWave([]);
              if (mediaRecorderRef.current?.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
              }
              mediaRecorderRef.current = null;
              commentForm.reset({ text: commentForm.getValues().text, attachment: undefined });
        }, 100);
    }
    
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    const handleEditColumnTitle = (columnId: string, currentTitle: string) => {
        setEditingColumnId(columnId);
        setEditingColumnTitle(currentTitle);
    };

    const handleSaveColumnTitle = (columnId: string) => {
        if (!activeBoard || !editingColumnTitle) {
            setEditingColumnId(null);
            return;
        }
        
        const updatedBoard = {
            ...activeBoard,
            columns: activeBoard.columns.map(c => 
                c.id === columnId ? { ...c, title: editingColumnTitle } : c
            )
        };
        updateBoards(boards.map(b => b.id === activeBoard.id ? updatedBoard : b));
        setEditingColumnId(null);
        toast({ title: t('tasks.toast.list_renamed_title'), description: t('tasks.toast.list_renamed_desc', { name: editingColumnTitle }) });
    };

    const commentTextValue = commentForm.watch('text');

    const noBoardsExist = boards.length === 0;
    const allBoardsArchived = !noBoardsExist && userBoards.length === 0 && archivedBoards.length > 0;

    const renderEmptyState = () => {
        if (noBoardsExist) {
            return (
                <div className="text-center">
                    <LayoutGrid className="mx-auto h-16 w-16 text-muted-foreground" />
                    <h2 className="mt-4 text-2xl font-semibold">{t('tasks.no_board_found')}</h2>
                    <p className="mt-2 text-muted-foreground">{t('tasks.empty_state.create_first_board')}</p>
                    <Button onClick={() => handleOpenBoardDialog(null)} className="mt-6">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('tasks.add_new_board')}
                    </Button>
                </div>
            )
        }
        if (allBoardsArchived) {
             return (
                <div className="text-center">
                    <Archive className="mx-auto h-16 w-16 text-muted-foreground" />
                    <h2 className="mt-4 text-2xl font-semibold">{t('tasks.empty_state.all_archived_title')}</h2>
                    <p className="mt-2 text-muted-foreground">{t('tasks.empty_state.all_archived_desc')}</p>
                    <Button onClick={() => {setViewMode('archive'); setActiveBoardId(null);}} className="mt-6">
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                      {t('tasks.archived.view_archived_items')}
                    </Button>
                </div>
            )
        }
        return (
             <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">{t('loading.dashboard')}</p>
                </div>
            </div>
        );
    }

    const renderTaskCard = (task: Task) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const dueDate = new Date(task.dueDate);
        const daysToDue = differenceInDays(dueDate, today);

        let dueDateColor = "text-muted-foreground";
        if (!task.isCompleted) {
            if (daysToDue < 0) dueDateColor = "text-red-500";
            else if (daysToDue < 7) dueDateColor = "text-orange-500";
        }
        
        const assigneesToShow = task.assignees?.slice(0, 3) || [];
        const hiddenAssigneesCount = (task.assignees?.length || 0) - assigneesToShow.length;

        return (
            <Card
                className={cn(
                    "mb-2 cursor-pointer transition-shadow hover:shadow-md bg-card group/taskcard relative",
                    task.isCompleted && "border-l-4 border-green-500 opacity-70"
                )}
                onClick={() => handleOpenDetailsSheet(task)}
            >
                <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTaskCompletion(task.id, !task.isCompleted);
                            }}
                            className={cn(
                                "mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
                                task.isCompleted ? "bg-green-500 border-green-700" : "border-muted-foreground/50 hover:border-primary"
                            )}
                        >
                            <Check className={cn("h-4 w-4 text-white transform transition-transform", task.isCompleted ? "animate-check-pop scale-100" : "scale-0")} />
                        </button>

                        <div className="flex-1 min-w-0">
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
                            <p className="font-semibold text-sm text-card-foreground break-words">{task.title}</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTaskDialog(task, task.columnId);
                            }}
                            className="absolute top-1 right-1 h-7 w-7 rounded-md flex items-center justify-center transition-opacity opacity-0 group-hover/taskcard:opacity-100 hover:bg-muted"
                        >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>

                    
                    <div className="flex items-end justify-between mt-3 pl-8">
                        <div className="flex items-center -space-x-2">
                            <TooltipProvider>
                                {assigneesToShow.map(id => {
                                    const user = usersOnBoard.find(u => u.id === id);
                                    return user ? (
                                        <Tooltip key={id}><TooltipTrigger asChild>
                                            <Avatar className="h-6 w-6 border-2 border-background">
                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger><TooltipContent><p>{t('tasks.tooltips.assigned_to', { name: user.name })}</p></TooltipContent></Tooltip>
                                    ) : null;
                                })}
                                {hiddenAssigneesCount > 0 && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Avatar className="h-6 w-6 border-2 border-background">
                                                <AvatarFallback>+{hiddenAssigneesCount}</AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{(task.assignees || []).slice(3).map(id => usersOnBoard.find(u => u.id === id)?.name).join(', ')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </TooltipProvider>
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
                            <span className={cn("flex items-center gap-1", dueDateColor)}>
                                <CalendarIcon className="h-3 w-3" />
                                {format(new Date(task.dueDate), 'MMM d')}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
             <PageHeader className="pb-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                     <Popover open={isBoardSwitcherOpen} onOpenChange={setIsBoardSwitcherOpen}>
                        <PopoverTrigger asChild>
                             <Button variant="outline" className="gap-2 text-base font-semibold w-full md:w-auto justify-between border-2 border-border p-2 pr-3 h-auto">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md" style={{ backgroundColor: activeBoard?.color || '#ccc' }}></span>
                                  <span>{activeBoard?.name || t('tasks.select_board')}</span>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                             <Command>
                                <CommandInput placeholder={t('tasks.dialog.board_search_placeholder')} />
                                <CommandList>
                                    <CommandEmpty>{t('tasks.no_board_found')}</CommandEmpty>
                                    <CommandGroup heading={t('tasks.view_modes.active_boards')}>
                                        {userBoards.map((board) => (
                                            <CommandItem
                                                key={board.id}
                                                onSelect={() => {
                                                    setActiveBoardId(board.id);
                                                    setIsBoardSwitcherOpen(false);
                                                }}
                                                className="flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-2">
                                                     <span className="w-4 h-4 rounded-md" style={{ backgroundColor: board.color }}></span>
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
                    <div className="flex items-center gap-2 ml-auto">
                        {activeBoard && (
                            <>
                             <div className="flex items-center -space-x-2">
                                {usersOnBoard.slice(0,3).map(user => (
                                        <TooltipProvider key={user.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Avatar className="h-8 w-8 border-2 border-background">
                                                        <AvatarImage src={user.avatar} alt={user.name} />
                                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t('tasks.tooltips.shared_with', { name: user.name })}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                {usersOnBoard.length > 3 && (
                                     <TooltipProvider><Tooltip>
                                        <TooltipTrigger asChild>
                                            <Avatar className="h-8 w-8 border-2 border-background"><AvatarFallback>+{usersOnBoard.length - 3}</AvatarFallback></Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{usersOnBoard.slice(3).map(u => u.name).join(', ')}</p>
                                        </TooltipContent>
                                     </Tooltip></TooltipProvider>
                                )}
                            </div>
                            <Button variant="outline" onClick={() => handleOpenShareDialog(activeBoard)} disabled={userPermissions !== 'owner'}>
                               <Share2 className="mr-2 h-4 w-4"/>
                               <span>{t('tasks.share_board')}</span>
                            </Button>
                            </>
                        )}
                         <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                            <Button variant={viewMode === 'board' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('board')}><ClipboardCheck className="h-4 w-4"/></Button>
                            <Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('calendar')}><CalendarViewIcon className="h-4 w-4"/></Button>
                            <Button variant={viewMode === 'archive' ? 'secondary' : 'ghost'} size="icon" onClick={() => {setViewMode('archive'); setActiveBoardId(null);}}><Archive className="h-4 w-4" /></Button>
                        </div>
                        
                         {activeBoard && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>{activeBoard.name}</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleOpenBoardDialog(activeBoard)} disabled={userPermissions === 'viewer'}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        <span>{t('common.edit')}</span>
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
                                    <DropdownMenuItem className="text-amber-600 focus:bg-amber-100 focus:text-amber-700 dark:focus:bg-amber-900/40" onClick={() => handleArchiveBoard(activeBoard.id)} disabled={userPermissions !== 'owner'}>
                                        <Archive className="mr-2 h-4 w-4" />
                                        <span>{t('tasks.board.archive_board')}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </PageHeader>
             {viewMode !== 'archive' && activeBoard ? (
                 <>
                    <Card className="mb-4">
                        <CardContent className="p-2 flex flex-wrap items-center gap-2">
                             <div className="relative flex-grow">
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
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        <Filter className="mr-2 h-4 w-4" />
                                        {t('contracts.filter_button')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent>
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">{t('contracts.filter.title')}</h4>
                                        </div>
                                         <div className="grid gap-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="include-completed"
                                                    checked={filters.includeCompleted}
                                                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeCompleted: !!checked }))}
                                                />
                                                <Label htmlFor="include-completed" className="text-sm font-normal">{t('tasks.search.include_completed')}</Label>
                                            </div>
                                             <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="assigned-to-me"
                                                    checked={filters.assignedToMe}
                                                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, assignedToMe: !!checked }))}
                                                />
                                                <Label htmlFor="assigned-to-me" className="text-sm font-normal">{t('tasks.search.assigned_to_me')}</Label>
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </CardContent>
                    </Card>

                    <div className="min-h-[60vh]">
                    {viewMode === 'board' ? (
                         <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN" isDropDisabled={userPermissions === 'viewer'}>
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="flex gap-4 items-start overflow-x-auto pb-4">
                                        {activeBoard.columns.filter(c => !c.isArchived).map((column, index) => (
                                            <Draggable key={column.id} draggableId={column.id} index={index} isDragDisabled={userPermissions === 'viewer'}>
                                                {(provided) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} className="w-80 flex-shrink-0">
                                                        <div className="bg-muted/60 dark:bg-slate-800/60 p-2 rounded-lg">
                                                            <div {...provided.dragHandleProps} className="flex items-center justify-between p-2 cursor-grab" onDoubleClick={() => handleEditColumnTitle(column.id, column.title)}>
                                                                {editingColumnId === column.id ? (
                                                                    <Input 
                                                                        value={editingColumnTitle}
                                                                        onChange={(e) => setEditingColumnTitle(e.target.value)}
                                                                        onBlur={() => handleSaveColumnTitle(column.id)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleSaveColumnTitle(column.id);
                                                                            if (e.key === 'Escape') setEditingColumnId(null);
                                                                        }}
                                                                        autoFocus
                                                                        className="h-8"
                                                                    />
                                                                ) : (
                                                                    <h3 className="font-semibold">{column.title}</h3>
                                                                )}
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="text-muted-foreground"/></Button></DropdownMenuTrigger>
                                                                    <DropdownMenuContent>
                                                                        <DropdownMenuItem onClick={() => handleOpenCopyColumnDialog(column)}>{t('tasks.board.copy_list')}</DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleOpenMoveColumnDialog(column)} disabled={activeBoard.columns.filter(c => !c.isArchived).length <= 1}>{t('tasks.board.move_list')}</DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleArchiveColumn(column.id)}>{t('tasks.board.archive_list')}</DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                            <Droppable droppableId={column.id} type="TASK" isDropDisabled={userPermissions === 'viewer'}>
                                                                {(provided, snapshot) => (
                                                                    <div ref={provided.innerRef} {...provided.droppableProps} className={cn("min-h-[100px] p-2 rounded-md transition-colors", snapshot.isDraggingOver ? "bg-secondary" : "")}>
                                                                        {(column.taskIds || []).map((taskId, index) => {
                                                                            const task = filteredTasks.find(t => t.id === taskId);
                                                                            if (!task) return null;
                                                                            return (
                                                                                <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={userPermissions === 'viewer'} >
                                                                                    {(provided, snapshot) => (
                                                                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={cn(snapshot.isDragging && 'opacity-80 shadow-lg')}>
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
                                                    <form ref={newColumnFormRef} onSubmit={columnForm.handleSubmit(handleAddColumn)} className="bg-muted/60 dark:bg-slate-800/60 p-2 rounded-lg space-y-2">
                                                        <Input {...columnForm.register('title')} placeholder={t('tasks.board.enter_list_title')} autoFocus />
                                                        <div className="flex items-center gap-2">
                                                            <Button type="submit">{t('tasks.board.add_list')}</Button>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => setShowAddColumnForm(false)}><X className="h-4 w-4" /></Button>
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
                        </DragDropContext>
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
                    ) : null }
                    </div>
                </>
            ) : viewMode === 'archive' ? (
                 <Card>
                    <CardHeader>
                        <CardTitle>{t('tasks.archived.view_archived_items')}</CardTitle>
                        <CardDescription>{t('tasks.archived.manager_desc_global')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="boards" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="boards">{t('tasks.archived.archived_boards_title')}</TabsTrigger>
                                <TabsTrigger value="tasks">{t('tasks.archived.archived_tasks_title')}</TabsTrigger>
                                <TabsTrigger value="lists">{t('tasks.board.lists')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="boards">
                                <div className="space-y-2 max-h-96 overflow-y-auto mt-4 border rounded-lg p-2">
                                     {archivedBoards.length > 0 ? archivedBoards.map(board => (
                                         <div key={board.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                            <p className="font-medium">{board.name}</p>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleRestoreBoard(board.id)}> <ArchiveRestore className="mr-2 h-4 w-4" /> {t('tasks.archived.restore_button')}</Button>
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setBoardToDelete(board); setIsDeleteBoardAlertOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />{t('tasks.archived.delete_permanently_button')}</Button>
                                            </div>
                                        </div>
                                     )) : <p className="text-center text-muted-foreground py-4">{t('tasks.archived.no_archived_boards')}</p>}
                                 </div>
                            </TabsContent>
                            <TabsContent value="tasks">
                                <div className="space-y-2 max-h-96 overflow-y-auto mt-4 border rounded-lg p-2">
                                    {tasks.filter(t => t.isArchived).map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                            <p className="font-medium line-through">{task.title}</p>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => onArchiveTaskClick(task)}> <ArchiveRestore className="mr-2 h-4 w-4" /> {t('tasks.archived.restore_button')}</Button>
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTask(task.id, true)}><Trash2 className="mr-2 h-4 w-4" />{t('tasks.archived.delete_permanently_button')}</Button>
                                            </div>
                                        </div>
                                    ))}
                                    {tasks.filter(t => t.isArchived).length === 0 && <p className="text-center text-muted-foreground py-4">{t('tasks.archived.no_archived_tasks_title')}</p>}
                                </div>
                            </TabsContent>
                            <TabsContent value="lists">
                                <div className="space-y-2 max-h-96 overflow-y-auto mt-4 border rounded-lg p-2">
                                    {boards.flatMap(b => b.columns).filter(c => c.isArchived).map(column => (
                                        <div key={column.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                            <div>
                                                <p className="font-medium line-through">{column.title}</p>
                                                <p className="text-xs text-muted-foreground">{t('tasks.archived.from_board')} {boards.find(b => b.id === column.boardId)?.name}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => onRestoreColumnClick(column)}><ArchiveRestore className="mr-2 h-4 w-4"/> {t('tasks.archived.restore_button')}</Button>
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setColumnToDelete(column); setIsDeleteColumnAlertOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />{t('tasks.archived.delete_permanently_button')}</Button>
                                            </div>
                                        </div>
                                    ))}
                                    {(boards.flatMap(b => b.columns).filter(c => c.isArchived) || []).length === 0 && <p className="text-center text-muted-foreground py-4">{t('tasks.archived.no_archived_lists_title')}</p>}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex items-center justify-center h-[60vh]">
                     {renderEmptyState()}
                </div>
            )}
            
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
                                <FormItem>
                                    <FormLabel>{t('tasks.dialog.board_color')}</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input type="color" {...field} className="w-16 h-10 p-1" />
                                            <span className="text-sm text-muted-foreground">{field.value}</span>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
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
                    <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => boardToDelete && handleDeleteBoardPermanently(boardToDelete.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
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
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder={t('tasks.dialog.share_search_placeholder')} />
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
                        <FormField control={form.control} name="isCompleted" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>{t('tasks.dialog.mark_as_complete')}</FormLabel></FormItem>)}/>
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
                            <div className="bg-background rounded-md shadow-sm text-sm" style={{border: '1px solid #e5e7eb'}}>
                                <table cellPadding="0" cellSpacing="0" border={0} width="100%">
                                <tbody>
                                    <tr>
                                        <td style={{padding: '20px', textAlign: 'center', backgroundColor: '#f9fafb'}}>
                                            {appearanceSettings?.logo && <Image src={appearanceSettings.logo} alt="Logo" width={40} height={40} style={{ margin: '0 auto', objectFit: 'contain' }} />}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{padding: '20px'}}>
                                            <p style={{marginBottom: '16px'}}>
                                               <span style={{fontWeight: 600}}>{t('tasks.dialog.report_preview_subject')}:</span> {weeklyReportForm.watch('subject')}
                                            </p>
                                            <p><span style={{fontWeight: 600}}>{t('tasks.dialog.report_preview_to')}:</span> {weeklyReportForm.watch('recipients')}</p>
                                        </td>
                                    </tr>
                                     <tr><td style={{padding: '0 20px'}}><div style={{height: '1px', backgroundColor: '#e5e7eb'}}></div></td></tr>
                                    <tr>
                                        <td style={{padding: '20px'}}>
                                            <p style={{fontStyle: 'italic', color: '#6b7280', marginBottom: '16px'}}>{weeklyReportForm.watch('body') || t('tasks.dialog.report_no_intro_text')}</p>
                                            <h5 style={{fontWeight: 600, marginBottom: '8px'}}>{t(`tasks.report_types.${weeklyReportForm.watch('reportType') as ScheduledReportType}`)}</h5>
                                             <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '4px', backgroundColor: '#f3f4f6'}}><span>Sample Task 1</span> <Badge variant="outline">In Progress</Badge></div>
                                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '4px', backgroundColor: '#f3f4f6'}}><span>Sample Task 2</span> <Badge variant="outline">To Do</Badge></div>
                                            </div>
                                        </td>
                                    </tr>
                                     <tr>
                                        <td style={{padding: '20px', textAlign: 'center', fontSize: '12px', color: '#6b7280'}}>
                                           <p>{t('tasks.dialog.report_automated_note', {day: new Date(2024, 0, parseInt(weeklyReportForm.watch('dayOfWeek'),10)+1).toLocaleString(locale.locale, { weekday: 'long' }), time: weeklyReportForm.watch('time')})}</p>
                                        </td>
                                    </tr>
                                </tbody>
                                </table>
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
                                <SheetTitle>
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
                                                <div key={comment.id} className="flex items-start gap-3 group/comment">
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
                                                        <div className="text-sm text-muted-foreground bg-secondary p-3 rounded-lg mt-1 space-y-2">
                                                             {comment.text && <p className="whitespace-pre-wrap">{comment.text}</p>}
                                                            {comment.attachment?.type === 'audio' && (
                                                                <AudioPlayer src={comment.attachment.url} duration={comment.attachment.meta?.duration || 0} />
                                                            )}
                                                             <div className="flex items-center gap-1 border-t pt-2 -mx-3 px-3">
                                                                {Object.entries((comment.reactions || []).reduce((acc, r) => {
                                                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                                    return acc;
                                                                }, {} as Record<string, number>)).map(([emoji, count]) => {
                                                                    const userHasReacted = (comment.reactions || []).some(r => r.userId === currentUser?.id && r.emoji === emoji);
                                                                    return (<TooltipProvider key={emoji}><Tooltip><TooltipTrigger asChild>
                                                                        <button onClick={() => handleAddCommentReaction(comment.id, emoji)} className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", userHasReacted ? 'border-primary bg-primary/20' : 'border-border bg-transparent hover:bg-muted')}>
                                                                            <span>{emoji}</span> <span>{count}</span>
                                                                        </button>
                                                                    </TooltipTrigger><TooltipContent>
                                                                       <div className="flex flex-col gap-1">
                                                                            {(comment.reactions || []).filter(r => r.emoji === emoji).map(r => (
                                                                                <div key={r.userId} className="flex items-center justify-between">
                                                                                    <span>{r.userName}</span>
                                                                                    {currentUser?.role === 'super-admin' && (
                                                                                        <Button variant="ghost" size="icon" className="h-4 w-4 ml-2 text-destructive opacity-50 hover:opacity-100" onClick={() => handleDeleteCommentReaction(comment.id, r)}><Trash2 className="h-3 w-3"/></Button>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </TooltipContent></Tooltip></TooltipProvider>)
                                                                })}
                                                                <Popover>
                                                                    <PopoverTrigger asChild><Button size="icon" variant="ghost" className="h-6 w-6 rounded-full"><SmilePlus className="h-3 w-3"/></Button></PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-1"><div className="flex gap-1">
                                                                        {(appearanceSettings?.allowedReactions || []).map(emoji => ( <Button key={emoji} variant="ghost" size="icon" onClick={() => handleAddCommentReaction(comment.id, emoji)} className="h-8 w-8 text-lg">{emoji}</Button>))}
                                                                    </div></PopoverContent>
                                                                </Popover>
                                                                {currentUser?.role === 'super-admin' && (
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto rounded-full opacity-0 group-hover/comment:opacity-100 text-destructive" onClick={() => handleDeleteComment(comment.id)}><Trash2 className="h-3 w-3"/></Button>
                                                                )}
                                                            </div>
                                                        </div>
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
                                        {(isRecording || audioChunks.length > 0) ? (
                                            <div className="flex items-center gap-2">
                                                 <Button variant="ghost" size="icon" className="text-destructive" onClick={handleCancelRecording}><Trash2 className="h-4 w-4" /></Button>
                                                 <div className="flex-1 bg-muted rounded-full h-8 flex items-center px-3 gap-2">
                                                    {isRecording && mediaRecorderRef.current?.state !== 'paused' ?
                                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> :
                                                        <Play className="h-4 w-4 text-muted-foreground" />
                                                    }
                                                    <p className="text-sm font-mono flex-1">{formatTime(recordingTime)}</p>
                                                    <div className="flex items-end h-4 gap-px">
                                                        {audioWave.map((h, i) => <div key={i} className="w-0.5 bg-primary rounded-full" style={{ height: `${Math.max(h, 5)}%`}}></div>)}
                                                    </div>
                                                </div>
                                                 <Button size="icon" variant={isRecording ? "secondary" : "default"} onClick={handleToggleVoiceRecording}>
                                                    {isRecording ? <Pause className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                                </Button>
                                                <Button size="icon" onClick={handleSendRecording}>
                                                    <Send className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        ) : (
                                        <Form {...commentForm}>
                                            <form onSubmit={commentForm.handleSubmit(onCommentSubmit)}>
                                                <div className="relative">
                                                     <Textarea
                                                        {...commentForm.register("text")}
                                                        ref={commentInputRef}
                                                        placeholder={t('contracts.details.comment_placeholder')}
                                                        className="min-h-[60px] pr-20"
                                                         onKeyDown={(e) => {
                                                            if (e.key === "Enter" && !e.shiftKey) {
                                                                e.preventDefault();
                                                                commentForm.handleSubmit(onCommentSubmit)();
                                                            }
                                                        }}
                                                    />
                                                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                                         <Popover>
                                                            <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon"><SmilePlus className="h-4 w-4" /></Button></PopoverTrigger>
                                                             <PopoverContent className="w-auto p-1"><div className="flex gap-1">
                                                                {(appearanceSettings?.allowedReactions || []).map(emoji => ( <Button key={emoji} variant="ghost" size="icon" onClick={() => handleInsertText(emoji)} className="h-8 w-8 text-lg">{emoji}</Button>))}
                                                            </div></PopoverContent>
                                                         </Popover>
                                                         <Button type="button" size="icon" variant="ghost" onClick={commentTextValue?.trim() ? commentForm.handleSubmit(onCommentSubmit) : handleToggleVoiceRecording}>
                                                            {commentTextValue?.trim() ? <Send className="h-4 w-4" /> : <Mic className="h-4 w-4"/>}
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 px-1">{t('tasks.comment_shortcut_hint')}</p>
                                                <FormMessage className="text-xs">{commentForm.formState.errors.root?.message || commentForm.formState.errors.text?.message}</FormMessage>
                                            </form>
                                        </Form>
                                        )}
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
                            <FormField control={labelForm.control} name="color" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('tasks.dialog.label_color')}</FormLabel>
                                    <FormControl>
                                        <Input type="color" {...field} className="w-16 h-10 p-1" />
                                    </FormControl>
                                </FormItem>
                            )}/>
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
            
            <Dialog open={isReportManagerOpen} onOpenChange={setIsReportManagerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('tasks.dialog.my_reports_title')}</DialogTitle>
                        <DialogDescription>{t('tasks.dialog.my_reports_desc', { name: activeBoard?.name })}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {scheduledReports.filter(r => r.boardId === activeBoardId && (currentUser?.role === 'super-admin' || r.createdBy === currentUser?.id)).map(report => (
                            <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                <div>
                                    <p className="font-semibold">{report.name}</p>
                                    <p className="text-sm text-muted-foreground">{t(`tasks.report_types.${report.type}`)} - {t('tasks.dialog.my_reports_next_run', { date: format(new Date(), "PP")})}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => { setIsReportManagerOpen(false); handleOpenReportDialog(report); }}><Edit className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setReportToDelete(report)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isMoveColumnDialogOpen} onOpenChange={handleCloseMoveColumnDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('tasks.board.move_list_title')}</DialogTitle>
                        <DialogDescription>{t('tasks.board.move_list_desc', { name: columnToMove?.title })}</DialogDescription>
                    </DialogHeader>
                     <div className="space-y-4 py-4">
                        <div className="space-y-2">
                           <Label>{t('tasks.board.move_list_target_label')}</Label>
                           <Select onValueChange={setMoveColumnTargetId} value={moveColumnTargetId || ""}>
                               <SelectTrigger><SelectValue placeholder={t('tasks.board.move_list_select_placeholder')} /></SelectTrigger>
                               <SelectContent>
                                   {activeBoard?.columns.filter(c => !c.isArchived && c.id !== columnToMove?.id).map(c => (
                                       <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('tasks.board.move_list_position_label')}</Label>
                             <Select onValueChange={(v) => setMoveColumnPosition(v as 'before' | 'after')} value={moveColumnPosition}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="before">{t('tasks.board.move_before')}</SelectItem>
                                    <SelectItem value="after">{t('tasks.board.move_after')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={handleCloseMoveColumnDialog}>{t('common.cancel')}</Button>
                        <Button onClick={handleMoveColumn} disabled={!moveColumnTargetId}>{t('tasks.board.move_list')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {reportToDelete && (
                <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('tasks.dialog.delete_report_title')}</AlertDialogTitle><AlertDialogDescription>{t('tasks.dialog.delete_report_desc', { name: reportToDelete.name })}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteReport}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
            )}

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
             <Dialog open={isRestoreTaskDialogOpen} onOpenChange={() => setIsRestoreTaskDialogOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('tasks.archived.restore_task_title')}</DialogTitle>
                        <DialogDescription>{t('tasks.archived.restore_task_desc', { task: taskToRestore?.title || '' })}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>{t('tasks.archived.select_list_for_restore')}</Label>
                        <Select onValueChange={(value) => handleRestoreTask(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('tasks.dialog.list_status_placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {boards.find(b => b.id === taskToRestore?.boardId)?.columns.filter(c => !c.isArchived).map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isRestoreColumnDialogOpen} onOpenChange={() => setIsRestoreColumnDialogOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('tasks.archived.restore_list_title')}</DialogTitle>
                        <DialogDescription>{t('tasks.archived.restore_list_desc', { list: columnToRestore?.title || '' })}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p>{t('tasks.archived.restore_list_tasks_prompt')}</p>
                        <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                             {tasks.filter(t => t.columnId === columnToRestore?.id && t.isArchived).map(task => (
                                <div key={task.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`restore-task-${task.id}`}
                                        checked={tasksToRestoreWithColumn.includes(task.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setTasksToRestoreWithColumn([...tasksToRestoreWithColumn, task.id]);
                                            } else {
                                                setTasksToRestoreWithColumn(tasksToRestoreWithColumn.filter(id => id !== task.id));
                                            }
                                        }}
                                    />
                                    <label htmlFor={`restore-task-${task.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {task.title}
                                    </label>
                                </div>
                            ))}
                            {tasks.filter(t => t.columnId === columnToRestore?.id && t.isArchived).length === 0 && (
                                <p className="text-sm text-center text-muted-foreground">{t('tasks.archived.no_archived_tasks_in_list')}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRestoreColumnDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleRestoreColumn}>{t('tasks.archived.restore_button')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const AudioPlayer = ({ src, duration }: { src: string, duration: number }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };
    
    useEffect(() => {
        const audio = audioRef.current;
        const updateProgress = () => {
            if (audio) {
                setProgress((audio.currentTime / audio.duration) * 100);
                setCurrentTime(audio.currentTime);
            }
        };
        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };

        audio?.addEventListener('timeupdate', updateProgress);
        audio?.addEventListener('ended', handleEnded);
        return () => {
            audio?.removeEventListener('timeupdate', updateProgress);
            audio?.removeEventListener('ended', handleEnded);
        }
    }, []);

    const formatTime = (seconds: number) => {
        const totalSeconds = Math.floor(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${minutes.toString().padStart(1, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 w-full bg-background/50 p-2 rounded-md">
            <audio ref={audioRef} src={src} preload="metadata"></audio>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="w-full bg-muted rounded-full h-1.5 relative">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="text-xs font-mono w-24 text-right">{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
    );
};
