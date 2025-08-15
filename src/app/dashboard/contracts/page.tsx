
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, FileText, Calendar as CalendarIcon, X, Paperclip, Upload, Bell, Paperclip as AttachmentIcon, Mail, Send, MessageSquare, History, Eye, ArrowUpDown, Trash2, Filter, List, Calendar as CalendarViewIcon, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format as formatDate, formatDistanceToNow, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday } from "date-fns"
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian"
import gregorian from "react-date-object/calendars/gregorian"
import { useRouter } from "next/navigation";


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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';
import { contracts as mockContracts, units as mockUnits, users as mockUsers } from '@/lib/mock-data';
import type { Contract, User, Comment, ContractVersion } from '@/lib/types';
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/context/language-context';
import { useCalendar } from '@/context/calendar-context';


const AUTH_USER_KEY = 'current_user';
const ITEMS_PER_PAGE = 10;

type SortableField = 'contractorName' | 'endDate' | 'status';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'calendar';


const reminderEmailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

const reminderPhoneSchema = z.object({
  phone: z.string(),
});

const reminderDaysSchema = z.object({
  days: z.number().min(1, "Must be at least 1 day").max(365, "Cannot be more than 365 days"),
});

const contractSchema = z.object({
  contractorName: z.string().min(1, "Contractor name is required"),
  type: z.string().min(1, "Contract type is required"),
  description: z.string().optional(),
  startDate: z.any({ required_error: "Start date is required" }),
  endDate: z.any({ required_error: "End date is required" }),
  renewal: z.enum(['auto', 'manual']),
  status: z.enum(['active', 'inactive']),
  unit: z.string().min(1, "Unit is required"),
  reminderEmails: z.array(reminderEmailSchema).min(1, "At least one reminder email is required."),
  reminderPhones: z.array(reminderPhoneSchema).optional(),
  reminders: z.array(reminderDaysSchema).min(1, "At least one reminder day is required."),
  attachments: z.any().optional(),
}).refine(data => {
    if (!data.startDate || !data.endDate) return false;
    const start = new Date(data.startDate.valueOf());
    const end = new Date(data.endDate.valueOf());
    return end > start;
}, {
    message: "End date must be after start date",
    path: ["endDate"],
});

const commentSchema = z.object({
    text: z.string().min(1, "Comment cannot be empty.").max(500, "Comment is too long."),
});


export default function ContractsPage() {
  const { t } = useLanguage();
  const { calendar, locale, format, formatDistance, differenceInDays } = useCalendar();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
       router.push("/login");
    }
  }, [router]);


  const [contracts, setContracts] = useState<Contract[]>(mockContracts);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [selectedContractForDetails, setSelectedContractForDetails] = useState<Contract | null>(null);
  
  const [isVersionViewOpen, setIsVersionViewOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ContractVersion | null>(null);
  const [sorting, setSorting] = useState<{ field: SortableField, direction: SortDirection }>({ field: 'endDate', direction: 'asc' });

  const [filters, setFilters] = useState({
    status: 'all',
    renewal: 'all',
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());


  const form = useForm<z.infer<typeof contractSchema>>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
        contractorName: "",
        type: "",
        description: "",
        renewal: "manual",
        unit: "",
        reminderEmails: [{email: ""}],
        reminderPhones: [{phone: ""}],
        reminders: [{days: 30}],
        attachments: [],
        status: "active",
    },
  });

  const commentForm = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { text: "" },
  });


  useEffect(() => {
    if (!currentUser) return;
    const defaultUnit = currentUser.role === 'admin' ? currentUser.unit : "";

    if (editingContract) {
      form.reset({
        contractorName: editingContract.contractorName,
        type: editingContract.type,
        description: editingContract.description,
        startDate: new DateObject({ date: editingContract.startDate, calendar: calendar, locale: locale }),
        endDate: new DateObject({ date: editingContract.endDate, calendar: calendar, locale: locale }),
        renewal: editingContract.renewal,
        status: editingContract.status,
        unit: editingContract.unit,
        reminderEmails: editingContract.reminderEmails.map(email => ({ email })),
        reminderPhones: editingContract.reminderPhones.map(phone => ({ phone })),
        reminders: editingContract.reminders.map(days => ({ days })),
        attachments: [], // Cannot pre-fill file inputs
      });
      setAttachedFiles([]);
    } else {
      form.reset({
        contractorName: "",
        type: "",
        description: "",
        renewal: "manual",
        status: "active",
        unit: defaultUnit,
        reminderEmails: [{email: ""}],
        reminderPhones: [{phone: ""}],
        reminders: [{days: 30}],
        attachments: [],
      });
    }
  }, [editingContract, form, currentUser, calendar, locale]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachedFiles(Array.from(event.target.files));
      form.setValue('attachments', Array.from(event.target.files));
    }
  };


  const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
    control: form.control,
    name: "reminderEmails"
  });

   const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({
    control: form.control,
    name: "reminderPhones"
  });

  const { fields: reminderDayFields, append: appendReminderDay, remove: removeReminderDay } = useFieldArray({
    control: form.control,
    name: "reminders"
  });
  
  const handleOpenDialog = (contract: Contract | null) => {
    setEditingContract(contract);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingContract(null);
    setIsDialogOpen(false);
    form.reset();
    setAttachedFiles([]);
  }

    const handleOpenDetailsSheet = (contract: Contract) => {
        setSelectedContractForDetails(contract);
        setIsDetailsSheetOpen(true);
    };

    const handleCloseDetailsSheet = () => {
        setSelectedContractForDetails(null);
        setIsDetailsSheetOpen(false);
        commentForm.reset();
    };

    const onCommentSubmit = (values: z.infer<typeof commentSchema>) => {
        if (!currentUser || !selectedContractForDetails) return;

        const newComment: Comment = {
            id: `CMT-${Date.now()}`,
            text: values.text,
            author: currentUser.name,
            authorId: currentUser.id,
            createdAt: new Date().toISOString(),
        };

        const updatedContract = {
            ...selectedContractForDetails,
            comments: [...(selectedContractForDetails.comments || []), newComment],
        };

        setContracts(contracts.map(c => c.id === updatedContract.id ? updatedContract : c));
        setSelectedContractForDetails(updatedContract);
        commentForm.reset();
        toast({
            title: t('contracts.toast.comment_added_title'),
            description: t('contracts.toast.comment_added_desc'),
        });
    };

  const handleTestEmail = () => {
    const emails = form.getValues('reminderEmails');
    const firstValidEmail = emails.find(e => e.email && !form.getFieldState(`reminderEmails.${emails.indexOf(e)}.email`).invalid)?.email;

    if (firstValidEmail) {
        toast({
            title: t('contracts.toast.test_email_sent_title'),
            description: t('contracts.toast.test_email_sent_desc', { email: firstValidEmail }),
        });
    } else {
        toast({
            title: t('contracts.toast.no_valid_email_title'),
            description: t('contracts.toast.no_valid_email_desc'),
            variant: "destructive",
        });
    }
  };

  const handleTestSms = () => {
    const phones = form.getValues('reminderPhones');
    const firstValidPhone = phones?.find(p => p.phone && !form.getFieldState(`reminderPhones.${phones.indexOf(p)}.phone`).invalid)?.phone;
    
    if (firstValidPhone) {
        toast({
            title: t('contracts.toast.test_sms_sent_title'),
            description: t('contracts.toast.test_sms_sent_desc', { phone: firstValidPhone }),
        });
    } else {
        toast({
            title: t('contracts.toast.no_valid_phone_title'),
            description: t('contracts.toast.no_valid_phone_desc'),
            variant: "destructive",
        });
    }
  };


  const onSubmit = (values: z.infer<typeof contractSchema>) => {
    if(!currentUser) return;
    
    const startDate = (values.startDate as DateObject).toDate();
    const endDate = (values.endDate as DateObject).toDate();
    
    if (editingContract) {
       // Create a version snapshot before updating
       const currentVersion: ContractVersion = {
          versionNumber: (editingContract.versions?.length || 0) + 1,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.id,
          contractorName: editingContract.contractorName,
          type: editingContract.type,
          description: editingContract.description,
          startDate: editingContract.startDate,
          endDate: editingContract.endDate,
          renewal: editingContract.renewal,
          status: editingContract.status,
          attachments: editingContract.attachments,
          reminders: editingContract.reminders,
          reminderEmails: editingContract.reminderEmails,
          reminderPhones: editingContract.reminderPhones,
          unit: editingContract.unit,
       };

      // Update existing contract
      const updatedContract: Contract = {
        ...editingContract,
        ...values,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reminders: values.reminders.map(r => r.days),
        reminderEmails: values.reminderEmails.map(e => e.email),
        reminderPhones: values.reminderPhones ? values.reminderPhones.map(p => p.phone).filter(Boolean) : [],
        attachments: attachedFiles.length > 0 ? attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })) : editingContract.attachments,
        versions: [...(editingContract.versions || []), currentVersion],
      };
      setContracts(contracts.map(c => c.id === editingContract.id ? updatedContract : c));
      toast({
        title: t('contracts.toast.updated_title'),
        description: t('contracts.toast.updated_desc', { name: updatedContract.contractorName }),
      });
    } else {
      // Create new contract
      const newContract: Contract = {
        id: `C-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(4, '0')}`,
        contractorName: values.contractorName,
        type: values.type,
        description: values.description,
        renewal: values.renewal,
        unit: values.unit,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: values.status,
        attachments: attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })),
        reminders: values.reminders.map(r => r.days),
        reminderEmails: values.reminderEmails.map(e => e.email),
        reminderPhones: values.reminderPhones ? values.reminderPhones.map(p => p.phone).filter(Boolean) : [],
        createdBy: currentUser.name,
        comments: [],
        versions: [],
      };
      setContracts([newContract, ...contracts]);
      toast({
          title: t('contracts.toast.created_title'),
          description: t('contracts.toast.created_desc', { name: newContract.contractorName }),
      });
    }

    handleCloseDialog();
  };
  
    const handleFilterChange = (filterType: 'status' | 'renewal', value: string) => {
      setFilters(prev => ({ ...prev, [filterType]: value }));
      setCurrentPage(1);
    };

    const handleSort = (field: SortableField) => {
        const newDirection = sorting.field === field && sorting.direction === 'asc' ? 'desc' : 'asc';
        setSorting({ field, direction: newDirection });
    };

    const clearFilters = () => {
        setFilters({ status: 'all', renewal: 'all' });
        setSearchTerm('');
        setCurrentPage(1);
    }

  const filteredContracts = useMemo(() => {
    if (!currentUser) return [];

    let baseContracts = currentUser.role === 'admin' 
        ? contracts.filter(c => c.unit === currentUser.unit)
        : contracts;
        
    // Apply text search
    if (searchTerm) {
        baseContracts = baseContracts.filter(
            (contract) =>
                contract.contractorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contract.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contract.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
        baseContracts = baseContracts.filter(c => c.status === filters.status);
    }

    // Apply renewal filter
    if (filters.renewal !== 'all') {
        baseContracts = baseContracts.filter(c => c.renewal === filters.renewal);
    }
    
    // Apply sorting
    baseContracts.sort((a, b) => {
        const field = sorting.field;
        const direction = sorting.direction === 'asc' ? 1 : -1;

        const valA = a[field];
        const valB = b[field];

        if (field === 'endDate') {
            return (new Date(valA).getTime() - new Date(valB).getTime()) * direction;
        }

        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
    });


    return baseContracts;
  }, [contracts, searchTerm, currentUser, filters, sorting]);

  const paginatedContracts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredContracts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredContracts, currentPage]);

  const totalPages = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };
  
  const handleDelete = (id: string) => {
    setContracts(contracts.filter(c => c.id !== id));
    toast({
        title: t('contracts.toast.deleted_title'),
        description: t('contracts.toast.deleted_desc'),
        variant: "destructive",
    });
  }

  const getDaysLeft = (endDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    return differenceInDays(end, today);
  };

  const getCreator = (creatorId: string): User | undefined => {
    return mockUsers.find(u => u.id === creatorId);
  }
  
    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startingDayIndex = getDay(start); // 0 for Sunday, 1 for Monday...
        // Create an array of empty placeholders for days before the start of the month
        const placeholders = Array.from({ length: startingDayIndex }, (_, i) => ({
            date: null,
            key: `placeholder-${i}`
        }));
        return [...placeholders, ...days.map(d => ({date:d, key: formatDate(d, 'yyyy-MM-dd')}))];
    }, [currentMonth]);

    const contractsByDate = useMemo(() => {
        return filteredContracts.reduce((acc, contract) => {
            const endDate = formatDate(new Date(contract.endDate), 'yyyy-MM-dd');
            if (!acc[endDate]) {
                acc[endDate] = [];
            }
            acc[endDate].push(contract);
            return acc;
        }, {} as Record<string, Contract[]>);
    }, [filteredContracts]);

    const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
    const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const goToToday = () => setCurrentMonth(new Date());


  if (!currentUser) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <FileText className="h-10 w-10 animate-pulse text-muted-foreground" />
                <p className="text-muted-foreground">{t('loading.dashboard')}</p>
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <PageHeaderHeading>{t('contracts.title')}</PageHeaderHeading>
        <PageHeaderDescription>
          {t('contracts.description')}
        </PageHeaderDescription>
      </PageHeader>
      
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
              <DialogTitle>{editingContract ? t('contracts.dialog.edit_title') : t('contracts.dialog.add_title')}</DialogTitle>
              <DialogDescription>
                  {editingContract ? t('contracts.dialog.edit_desc') : t('contracts.dialog.add_desc')}
              </DialogDescription>
          </DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
                  <FormField
                      control={form.control}
                      name="contractorName"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>{t('contracts.dialog.contractor_name_label')}</FormLabel>
                              <FormControl>
                                  <Input placeholder={t('contracts.dialog.contractor_name_placeholder')} {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>{t('contracts.dialog.type_label')}</FormLabel>
                              <FormControl>
                                  <Input placeholder={t('contracts.dialog.type_placeholder')} {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                          <FormItem className="flex flex-col">
                              <FormLabel>{t('contracts.dialog.start_date_label')}</FormLabel>
                              <FormControl>
                                  <DatePicker
                                      value={field.value}
                                      onChange={field.onChange}
                                      calendar={calendar}
                                      locale={locale}
                                      calendarPosition="bottom-right"
                                      render={(value: any, openCalendar: () => void) => (
                                          <Button type="button" variant="outline" onClick={openCalendar} className="w-full justify-start text-left font-normal">
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {value || <span>{t('contracts.dialog.pick_date_placeholder')}</span>}
                                          </Button>
                                      )}
                                  />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                          <FormItem className="flex flex-col">
                              <FormLabel>{t('contracts.dialog.end_date_label')}</FormLabel>
                              <FormControl>
                                  <DatePicker
                                      value={field.value}
                                      onChange={field.onChange}
                                      calendar={calendar}
                                      locale={locale}
                                      calendarPosition="bottom-right"
                                      render={(value: any, openCalendar: () => void) => (
                                          <Button type="button" variant="outline" onClick={openCalendar} className="w-full justify-start text-left font-normal">
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {value || <span>{t('contracts.dialog.pick_date_placeholder')}</span>}
                                          </Button>
                                      )}
                                  />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>{t('contracts.dialog.unit_label')}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={currentUser.role === 'admin'}>
                          <FormControl>
                              <SelectTrigger>
                              <SelectValue placeholder={t('contracts.dialog.select_unit_placeholder')} />
                              </SelectTrigger>
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
                      name="renewal"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>{t('contracts.dialog.renewal_policy_label')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                              <SelectTrigger>
                              <SelectValue placeholder={t('contracts.dialog.select_renewal_placeholder')} />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="manual">{t('contracts.renewal_types.manual')}</SelectItem>
                              <SelectItem value="auto">{t('contracts.renewal_types.auto')}</SelectItem>
                          </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <div className="md:col-span-2">
                      <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>{t('contracts.dialog.description_label')}</FormLabel>
                                  <FormControl>
                                      <Textarea placeholder={t('contracts.dialog.description_placeholder')} {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  </div>

                  <div className="md:col-span-2">
                     <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                            <FormLabel>{t('contracts.dialog.status_label')}</FormLabel>
                            <FormDescription>
                                {t('contracts.dialog.status_desc')}
                            </FormDescription>
                            </div>
                            <FormControl>
                            <Switch
                                checked={field.value === 'active'}
                                onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
                            />
                            </FormControl>
                        </FormItem>
                        )}
                    />
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
                                  <label htmlFor="file-upload" className="cursor-pointer w-full flex items-center justify-center gap-2">
                                      <Upload className="h-4 w-4"/>
                                      <span>{ attachedFiles.length > 0 ? t('contracts.dialog.files_selected', { count: attachedFiles.length }) : t('contracts.dialog.select_files_button')}</span>
                                  </label>
                                  </Button>
                                  <Input 
                                      id="file-upload"
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
                      {editingContract && editingContract.attachments.length > 0 && (
                         <div className="space-y-2">
                            <p className="text-sm font-medium">{t('contracts.dialog.current_attachments_label')}</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                {editingContract.attachments.map((file, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <AttachmentIcon className="h-4 w-4" />
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                                </li>
                                ))}
                            </ul>
                            <p className="text-xs text-muted-foreground">{t('contracts.dialog.replace_attachments_note')}</p>
                         </div>
                      )}
                  </div>

                  <div className="md:col-span-2 space-y-4">
                      <div>
                        <FormLabel>{t('contracts.dialog.reminder_emails_label')}</FormLabel>
                        <FormDescription className="mb-2">{t('contracts.dialog.reminder_emails_desc')}</FormDescription>
                        {emailFields.map((field, index) => (
                          <FormField
                            key={field.id}
                            control={form.control}
                            name={`reminderEmails.${index}.email`}
                            render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                      <FormControl>
                                          <Input {...field} placeholder={`email@example.com`} />
                                      </FormControl>
                                      {emailFields.length > 1 && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(index)}>
                                          <X className="h-4 w-4" />
                                        </Button>
                                      )}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                            )}
                          />
                        ))}
                        <div className="flex items-center gap-2 mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendEmail({ email: '' })}
                            >
                              {t('contracts.dialog.add_email_button')}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleTestEmail}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              {t('contracts.dialog.send_test_button')}
                            </Button>
                        </div>
                      </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                      <div>
                        <FormLabel>{t('contracts.dialog.reminder_phones_label')}</FormLabel>
                        <FormDescription className="mb-2">{t('contracts.dialog.reminder_phones_desc')}</FormDescription>
                        {phoneFields.map((field, index) => (
                          <FormField
                            key={field.id}
                            control={form.control}
                            name={`reminderPhones.${index}.phone`}
                            render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                      <FormControl>
                                          <Input {...field} placeholder={`e.g., +15551234567`} />
                                      </FormControl>
                                      {phoneFields.length > 1 && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removePhone(index)}>
                                          <X className="h-4 w-4" />
                                        </Button>
                                      )}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                            )}
                          />
                        ))}
                         <div className="flex items-center gap-2 mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendPhone({ phone: '' })}
                            >
                              {t('contracts.dialog.add_phone_button')}
                            </Button>
                             <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleTestSms}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              {t('contracts.dialog.send_test_button')}
                            </Button>
                        </div>
                      </div>
                  </div>
                  
                  <div className="md:col-span-2 space-y-4">
                      <div>
                        <FormLabel>{t('contracts.dialog.reminder_days_label')}</FormLabel>
                        <FormDescription className="mb-2">{t('contracts.dialog.reminder_days_desc')}</FormDescription>
                        {reminderDayFields.map((field, index) => (
                          <FormField
                            key={field.id}
                            control={form.control}
                            name={`reminders.${index}.days`}
                            render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                      <FormControl>
                                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} placeholder="e.g., 30" />
                                      </FormControl>
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
                          onClick={() => appendReminderDay({ days: 15 })}
                        >
                          {t('contracts.dialog.add_reminder_day_button')}
                        </Button>
                      </div>
                  </div>
                  <DialogFooter className="md:col-span-2">
                      <DialogClose asChild>
                          <Button type="button" variant="ghost">{t('common.cancel')}</Button>
                      </DialogClose>
                      <Button type="submit">{editingContract ? t('common.save_changes') : t('contracts.dialog.create_button')}</Button>
                  </DialogFooter>
              </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Sheet open={isDetailsSheetOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDetailsSheet()}>
        <SheetContent className="flex flex-col sm:max-w-lg">
            {selectedContractForDetails && (
                <>
                    <SheetHeader>
                        <SheetTitle>{t('contracts.details.title', { name: selectedContractForDetails.contractorName })}</SheetTitle>
                        <SheetDescription>
                            {t('contracts.details.contract_id', { id: selectedContractForDetails.id })}
                        </SheetDescription>
                    </SheetHeader>
                    <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">{t('contracts.details.tabs.details')}</TabsTrigger>
                            <TabsTrigger value="comments">{t('contracts.details.tabs.comments')}</TabsTrigger>
                            <TabsTrigger value="history">{t('contracts.details.tabs.history')}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="flex-1 overflow-y-auto">
                           <ScrollArea className="h-full">
                                <div className="space-y-4 p-4 text-sm">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                       <div className="space-y-1">
                                            <p className="font-medium text-muted-foreground">{t('contracts.details.contractor')}</p>
                                            <p>{selectedContractForDetails.contractorName}</p>
                                        </div>
                                         <div className="space-y-1">
                                            <p className="font-medium text-muted-foreground">{t('contracts.details.type')}</p>
                                            <p>{selectedContractForDetails.type}</p>
                                        </div>
                                         <div className="space-y-1">
                                            <p className="font-medium text-muted-foreground">{t('contracts.details.start_date')}</p>
                                            <p>{format(new Date(selectedContractForDetails.startDate), 'yyyy/MM/dd')}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-muted-foreground">{t('contracts.details.end_date')}</p>
                                            <p>{format(new Date(selectedContractForDetails.endDate), 'yyyy/MM/dd')}</p>
                                        </div>
                                         <div className="space-y-1">
                                            <p className="font-medium text-muted-foreground">{t('contracts.details.unit')}</p>
                                            <p>{selectedContractForDetails.unit}</p>
                                        </div>
                                         <div className="space-y-1">
                                            <p className="font-medium text-muted-foreground">{t('contracts.details.renewal')}</p>
                                            <p className="capitalize">{selectedContractForDetails.renewal}</p>
                                        </div>
                                         <div className="space-y-1">
                                            <p className="font-medium text-muted-foreground">{t('contracts.details.status')}</p>
                                            <p className="capitalize">{selectedContractForDetails.status}</p>
                                        </div>
                                         <div className="space-y-1">
                                            <p className="font-medium text-muted-foreground">{t('contracts.details.created_by')}</p>
                                            <p className="capitalize">{selectedContractForDetails.createdBy}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                       <p className="font-medium text-muted-foreground">{t('contracts.details.description')}</p>
                                       <p>{selectedContractForDetails.description || 'N/A'}</p>
                                    </div>
                                     <div className="space-y-1">
                                       <p className="font-medium text-muted-foreground">{t('contracts.details.reminder_emails')}</p>
                                       <p>{selectedContractForDetails.reminderEmails.join(', ')}</p>
                                    </div>
                                     <div className="space-y-1">
                                       <p className="font-medium text-muted-foreground">{t('contracts.details.reminder_phones')}</p>
                                       <p>{selectedContractForDetails.reminderPhones.join(', ') || 'N/A'}</p>
                                    </div>
                                     <div className="space-y-1">
                                       <p className="font-medium text-muted-foreground">{t('contracts.details.reminder_days')}</p>
                                       <p>{selectedContractForDetails.reminders.join(', ')}</p>
                                    </div>
                                     <div className="space-y-1">
                                       <p className="font-medium text-muted-foreground">{t('contracts.details.attachments')}</p>
                                       {selectedContractForDetails.attachments.length > 0 ? (
                                            <ul className="list-disc list-inside">
                                                {selectedContractForDetails.attachments.map((file, index) => (
                                                    <li key={index}>
                                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                                                    </li>
                                                ))}
                                            </ul>
                                       ) : <p>{t('contracts.details.no_attachments')}</p>}
                                    </div>

                                </div>
                           </ScrollArea>
                        </TabsContent>
                        <TabsContent value="comments" className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto pr-6 -mr-6 space-y-4 py-4">
                                {(selectedContractForDetails.comments || []).length > 0 ? (
                                    (selectedContractForDetails.comments || []).map(comment => {
                                    const creator = getCreator(comment.authorId);
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
                                                        {formatDistance(new Date(comment.createdAt))}
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
                        <TabsContent value="history" className="flex-1 overflow-y-auto">
                            {(selectedContractForDetails.versions || []).length > 0 ? (
                                <div className="space-y-4 py-4">
                                    {[...(selectedContractForDetails.versions || [])].reverse().map(version => {
                                        const creator = getCreator(version.createdBy);
                                        return (
                                        <div key={version.versionNumber} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={creator?.avatar} alt={creator?.name} />
                                                    <AvatarFallback>{creator?.name.charAt(0) || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium">{t('contracts.details.version_label', { version: version.versionNumber })}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('contracts.details.version_saved_by', { name: creator?.name || 'Unknown', date: format(new Date(version.createdAt), "PPP p")})}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => { setSelectedVersion(version); setIsVersionViewOpen(true); }}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )})}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-10">
                                    <History className="mx-auto h-12 w-12" />
                                    <p className="mt-4">{t('contracts.details.no_history_title')}</p>
                                    <p>{t('contracts.details.no_history_desc')}</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </SheetContent>
      </Sheet>

        <Dialog open={isVersionViewOpen} onOpenChange={setIsVersionViewOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('contracts.details.version_view_title', { version: selectedVersion?.versionNumber || ''})}</DialogTitle>
                    <DialogDescription>
                         {t('contracts.details.version_view_desc', { name: getCreator(selectedVersion?.createdBy || '')?.name || 'Unknown', date: selectedVersion ? format(new Date(selectedVersion.createdAt), "PPP p") : ''})}
                    </DialogDescription>
                </DialogHeader>
                {selectedVersion && (
                    <ScrollArea className="max-h-[70vh]">
                    <div className="space-y-4 p-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.contractor')}</p>
                                <p>{selectedVersion.contractorName}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.type')}</p>
                                <p>{selectedVersion.type}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.start_date')}</p>
                                <p>{format(new Date(selectedVersion.startDate), 'yyyy/MM/dd')}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.end_date')}</p>
                                <p>{format(new Date(selectedVersion.endDate), 'yyyy/MM/dd')}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.unit')}</p>
                                <p>{selectedVersion.unit}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.renewal')}</p>
                                <p className="capitalize">{selectedVersion.renewal}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.status')}</p>
                                <p className="capitalize">{selectedVersion.status}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                           <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.description')}</p>
                           <p className="text-sm">{selectedVersion.description || 'N/A'}</p>
                        </div>
                         <div className="space-y-1">
                           <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.reminder_emails')}</p>
                           <p className="text-sm">{selectedVersion.reminderEmails.join(', ')}</p>
                        </div>
                         <div className="space-y-1">
                           <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.reminder_phones')}</p>
                           <p className="text-sm">{selectedVersion.reminderPhones.join(', ') || 'N/A'}</p>
                        </div>
                         <div className="space-y-1">
                           <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.reminder_days')}</p>
                           <p className="text-sm">{selectedVersion.reminders.join(', ')}</p>
                        </div>
                         <div className="space-y-1">
                           <p className="text-sm font-medium text-muted-foreground">{t('contracts.details.attachments')}</p>
                           {selectedVersion.attachments.length > 0 ? (
                                <ul className="list-disc list-inside text-sm">
                                    {selectedVersion.attachments.map((file, index) => (
                                        <li key={index}>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                                        </li>
                                    ))}
                                </ul>
                           ) : <p className="text-sm">{t('contracts.details.no_attachments')}</p>}
                        </div>

                    </div>
                    </ScrollArea>
                )}
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsVersionViewOpen(false)}>{t('common.close')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <Card>
        <CardHeader>
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div>
                    <CardTitle>{t('contracts.list_title')}</CardTitle>
                    <CardDescription>{t('contracts.list_desc')}</CardDescription>
                 </div>
                 <Button onClick={() => handleOpenDialog(null)} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('contracts.add_button')}
                 </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-4">
                 <Input
                    placeholder={t('contracts.search_placeholder')}
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full sm:max-w-xs"
                />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                            <Filter className="mr-2 h-4 w-4" />
                            {t('contracts.filter_button')}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">{t('contracts.filter.title')}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {t('contracts.filter.desc')}
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label htmlFor="filter-status">{t('contracts.filter.status_label')}</label>
                                    <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                                        <SelectTrigger id="filter-status" className="col-span-2 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('contracts.filter.all')}</SelectItem>
                                            <SelectItem value="active">{t('contracts.status_types.active')}</SelectItem>
                                            <SelectItem value="inactive">{t('contracts.status_types.inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label htmlFor="filter-renewal">{t('contracts.filter.renewal_label')}</label>
                                    <Select value={filters.renewal} onValueChange={(v) => handleFilterChange('renewal', v)}>
                                        <SelectTrigger id="filter-renewal" className="col-span-2 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('contracts.filter.all')}</SelectItem>
                                            <SelectItem value="auto">{t('contracts.renewal_types.auto')}</SelectItem>
                                            <SelectItem value="manual">{t('contracts.renewal_types.manual')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="justify-self-start">
                                <Trash2 className="mr-2 h-4 w-4"/>
                                {t('contracts.filter.clear_button')}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
                 <div className="flex items-center gap-1 rounded-md bg-muted p-1 ml-auto">
                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                        <List className="h-4 w-4"/>
                    </Button>
                     <Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('calendar')}>
                        <CalendarViewIcon className="h-4 w-4"/>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {viewMode === 'list' ? (
                <>
                <div className="rounded-md border">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[25%]">
                            <Button variant="ghost" onClick={() => handleSort('contractorName')}>
                                {t('contracts.table.contractor')}
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="w-[15%]">{t('contracts.table.type')}</TableHead>
                        <TableHead className="w-[10%]">
                            <Button variant="ghost" onClick={() => handleSort('status')}>
                                {t('contracts.table.status')}
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="w-[15%]">
                            <Button variant="ghost" onClick={() => handleSort('endDate')}>
                                {t('contracts.table.end_date')}
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="w-[10%]">{t('contracts.table.days_left')}</TableHead>
                        <TableHead className="w-[10%]">{t('contracts.table.unit')}</TableHead>
                        <TableHead className="w-[10%]">{t('contracts.table.info')}</TableHead>
                        <TableHead className="w-[5%] text-right">
                            <span className="sr-only">{t('common.actions')}</span>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedContracts.length > 0 ? (
                        paginatedContracts.map((contract) => {
                            const daysLeft = getDaysLeft(contract.endDate);
                            const daysLeftText = daysLeft < 0 ? t('contracts.status.expired') : t('contracts.status.days_left', { count: daysLeft });
                            const daysLeftColor = daysLeft < 7 ? 'text-destructive' : daysLeft < 30 ? 'text-amber-600' : 'text-green-600';
                            return (
                                <TableRow key={contract.id} className={cn(contract.status === 'inactive' && 'opacity-50')}>
                                <TableCell className="font-medium">
                                    <div className="truncate font-semibold">{contract.contractorName}</div>
                                    <div className="text-xs text-muted-foreground">{contract.id}</div>
                                </TableCell>
                                <TableCell>{contract.type}</TableCell>
                                <TableCell>
                                    <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}
                                        className={cn(
                                            'w-20 justify-center',
                                            contract.status === 'active' 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-700' 
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                        )}
                                    >
                                        {t(`contracts.status_types.${contract.status}`)}
                                    </Badge>
                                </TableCell>
                                <TableCell>{format(new Date(contract.endDate), 'yyyy/MM/dd')}</TableCell>
                                <TableCell className={cn("font-semibold", daysLeftColor)}>
                                    {daysLeftText}
                                </TableCell>
                                <TableCell>{contract.unit}</TableCell>
                                <TableCell>
                                    <TooltipProvider>
                                        <div className="flex items-center gap-3">
                                            {(contract.comments?.length || 0) > 0 && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{t('contracts.tooltips.has_comments')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            {(contract.versions?.length || 0) > 0 && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <History className="h-4 w-4 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{t('contracts.tooltips.has_history')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            {contract.attachments.length > 0 && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <AttachmentIcon className="h-4 w-4 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{t('contracts.tooltips.attachments_count', { count: contract.attachments.length })}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            {contract.reminders.length > 0 && contract.status === 'active' && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Bell className="h-4 w-4 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{t('contracts.tooltips.email_reminders_active')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            {contract.reminderPhones && contract.reminderPhones.length > 0 && contract.status === 'active' && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{t('contracts.tooltips.sms_reminders_active')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">{t('common.toggle_menu')}</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleOpenDialog(contract)}>{t('common.edit')}</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenDetailsSheet(contract)}>{t('contracts.details.view_details')}</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDelete(contract.id)} className="text-destructive">{t('common.delete')}</DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                </TableRow>
                            )
                        })
                        ) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                                <div className="flex flex-col items-center gap-2">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                                <p className="font-semibold">{t('contracts.no_contracts_found_title')}</p>
                                <p className="text-muted-foreground text-sm">{t('contracts.no_contracts_found_desc')}</p>
                                </div>
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        {t('common.previous')}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {t('common.page_of', { current: currentPage, total: totalPages })}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        {t('common.next')}
                    </Button>
                    </div>
                )}
                </>
            ) : (
                <div className="border rounded-lg">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4"/></Button>
                            <h2 className="text-lg font-semibold w-36 text-center">{formatDate(currentMonth, 'MMMM yyyy', { locale: locale?.dateFnsLocale })}</h2>
                            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4"/></Button>
                        </div>
                        <Button variant="outline" onClick={goToToday}>{t('contracts.calendar.today_button')}</Button>
                    </div>
                    <div className="grid grid-cols-7 border-t border-b">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {calendarDays.map((dayObj) => {
                            const contractsOnDay = dayObj.date ? contractsByDate[formatDate(dayObj.date, 'yyyy-MM-dd')] || [] : [];
                            return (
                            <div key={dayObj.key} className={cn("h-40 border-r border-b p-2 overflow-y-auto", dayObj.date && !isSameMonth(dayObj.date, currentMonth) && "bg-muted/50")}>
                                {dayObj.date && (
                                    <span className={cn("font-semibold", isToday(dayObj.date) && "bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center")}>
                                        {formatDate(dayObj.date, 'd')}
                                    </span>
                                )}
                                <div className="space-y-1 mt-1">
                                    {contractsOnDay.map(contract => (
                                         <div key={contract.id} onClick={() => handleOpenDetailsSheet(contract)}>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="bg-primary/20 text-primary-foreground p-1 rounded-md text-xs cursor-pointer hover:bg-primary/30">
                                                            <p className="font-semibold text-primary truncate">{contract.contractorName}</p>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{contract.type}</p>
                                                        <p>{t('contracts.calendar.expires_on', { date: format(new Date(contract.endDate), 'yyyy/MM/dd') })}</p>
                                                        <p className="italic text-muted-foreground">{t('contracts.calendar.click_for_details')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )})}
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
