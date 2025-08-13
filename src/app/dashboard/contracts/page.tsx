
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, FileText, Calendar as CalendarIcon, X, Paperclip, Upload, Bell, Paperclip as AttachmentIcon, Mail, Send, MessageSquare, History, Eye, ArrowUpDown, Trash2, Filter } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, formatDistanceToNow } from "date-fns"
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian"
import PersianCalendar from "react-date-object/calendars/persian"
import { format as formatPersian, differenceInDays } from "date-fns-jalali";
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


const AUTH_USER_KEY = 'current_user';
const ITEMS_PER_PAGE = 10;

type SortableField = 'contractorName' | 'endDate' | 'status';
type SortDirection = 'asc' | 'desc';

const reminderEmailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

const reminderPhoneSchema = z.object({
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
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


  const form = useForm<z.infer<typeof contractSchema>>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
        contractorName: "",
        type: "",
        description: "",
        renewal: "manual",
        unit: "",
        reminderEmails: [{email: ""}],
        reminderPhones: [],
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
      const [sy, sm, sd] = editingContract.startDate.split('-').map(Number);
      const [ey, em, ed] = editingContract.endDate.split('-').map(Number);

      form.reset({
        contractorName: editingContract.contractorName,
        type: editingContract.type,
        description: editingContract.description,
        startDate: new DateObject({ year: sy, month: sm, day: sd, calendar: persian }),
        endDate: new DateObject({ year: ey, month: em, day: ed, calendar: persian }),
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
  }, [editingContract, form, currentUser]);
  
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
            title: "Comment Added",
            description: "Your comment has been successfully posted.",
        });
    };

  const handleTestEmail = () => {
    const emails = form.getValues('reminderEmails');
    const firstValidEmail = emails.find(e => e.email && !form.getFieldState(`reminderEmails.${emails.indexOf(e)}.email`).invalid)?.email;

    if (firstValidEmail) {
        toast({
            title: "Test Email Sent",
            description: `A test notification has been sent to ${firstValidEmail}.`,
        });
    } else {
        toast({
            title: "No Valid Email",
            description: "Please enter at least one valid email address to send a test.",
            variant: "destructive",
        });
    }
  };

  const handleTestSms = () => {
    const phones = form.getValues('reminderPhones');
    const firstValidPhone = phones?.find(p => p.phone && !form.getFieldState(`reminderPhones.${phones.indexOf(p)}.phone`).invalid)?.phone;
    
    if (firstValidPhone) {
        toast({
            title: "Test SMS Sent",
            description: `A test SMS has been sent to ${firstValidPhone}.`,
        });
    } else {
        toast({
            title: "No Valid Phone Number",
            description: "Please enter at least one valid phone number to send a test.",
            variant: "destructive",
        });
    }
  };


  const onSubmit = (values: z.infer<typeof contractSchema>) => {
    if(!currentUser) return;
    
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
        startDate: format(new Date(values.startDate.valueOf()), "yyyy-MM-dd"),
        endDate: format(new Date(values.endDate.valueOf()), "yyyy-MM-dd"),
        reminders: values.reminders.map(r => r.days),
        reminderEmails: values.reminderEmails.map(e => e.email),
        reminderPhones: values.reminderPhones ? values.reminderPhones.map(p => p.phone) : [],
        attachments: attachedFiles.length > 0 ? attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })) : editingContract.attachments,
        versions: [...(editingContract.versions || []), currentVersion],
      };
      setContracts(contracts.map(c => c.id === editingContract.id ? updatedContract : c));
      toast({
        title: "Contract Updated",
        description: `Contract for "${updatedContract.contractorName}" has been successfully updated. A new version has been saved.`,
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
        startDate: format(new Date(values.startDate.valueOf()), "yyyy-MM-dd"),
        endDate: format(new Date(values.endDate.valueOf()), "yyyy-MM-dd"),
        status: values.status,
        attachments: attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })),
        reminders: values.reminders.map(r => r.days),
        reminderEmails: values.reminderEmails.map(e => e.email),
        reminderPhones: values.reminderPhones ? values.reminderPhones.map(p => p.phone) : [],
        createdBy: currentUser.name,
        comments: [],
        versions: [],
      };
      setContracts([newContract, ...contracts]);
      toast({
          title: "Contract Created",
          description: `Contract for "${newContract.contractorName}" has been successfully created.`,
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
        title: "Contract Deleted",
        description: `The contract has been successfully deleted.`,
        variant: "destructive",
    });
  }

  const getDaysLeft = (endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    return differenceInDays(end, today);
  };

  const getCreator = (creatorId: string): User | undefined => {
    return mockUsers.find(u => u.id === creatorId);
  }

  if (!currentUser) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <PageHeaderHeading>Contracts</PageHeaderHeading>
        <PageHeaderDescription>
          Manage, view, and organize all your contracts.
        </PageHeaderDescription>
      </PageHeader>
      
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
              <DialogTitle>{editingContract ? 'Edit Contract' : 'Add New Contract'}</DialogTitle>
              <DialogDescription>
                  {editingContract ? 'Update the details of the existing contract.' : 'Fill out the form below to create a new contract.'}
              </DialogDescription>
          </DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
                  <FormField
                      control={form.control}
                      name="contractorName"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Contractor Name</FormLabel>
                              <FormControl>
                                  <Input placeholder="e.g., Innovate Solutions Ltd." {...field} />
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
                              <FormLabel>Contract Type</FormLabel>
                              <FormControl>
                                  <Input placeholder="e.g., Service Agreement" {...field} />
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
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                  <DatePicker
                                      value={field.value}
                                      onChange={field.onChange}
                                      calendar={persian}
                                      format="YYYY/MM/DD"
                                      render={(value: any, openCalendar: () => void) => (
                                          <Button type="button" variant="outline" onClick={openCalendar} className="w-full justify-start text-left font-normal">
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {value || <span>Pick a date</span>}
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
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                  <DatePicker
                                      value={field.value}
                                      onChange={field.onChange}
                                      calendar={persian}
                                      format="YYYY/MM/DD"
                                      render={(value: any, openCalendar: () => void) => (
                                          <Button type="button" variant="outline" onClick={openCalendar} className="w-full justify-start text-left font-normal">
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {value || <span>Pick a date</span>}
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
                          <FormLabel>Unit</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={currentUser.role === 'admin'}>
                          <FormControl>
                              <SelectTrigger>
                              <SelectValue placeholder="Select an organizational unit" />
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
                          <FormLabel>Renewal Policy</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                              <SelectTrigger>
                              <SelectValue placeholder="Select renewal policy" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="manual">Manual</SelectItem>
                              <SelectItem value="auto">Automatic</SelectItem>
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
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                      <Textarea placeholder="Briefly describe the contract..." {...field} />
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
                            <FormLabel>Contract Status</FormLabel>
                            <FormDescription>
                                An inactive contract will not send any reminders.
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
                              <FormLabel>Attachments</FormLabel>
                              <FormControl>
                              <div className="relative">
                                  <Button type="button" variant="outline" asChild>
                                  <label htmlFor="file-upload" className="cursor-pointer w-full flex items-center justify-center gap-2">
                                      <Upload className="h-4 w-4"/>
                                      <span>{ attachedFiles.length > 0 ? `${attachedFiles.length} file(s) selected` : 'Select Files'}</span>
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
                      {editingContract && editingContract.attachments.length > 0 && (
                         <div className="space-y-2">
                            <p className="text-sm font-medium">Current attachments:</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                {editingContract.attachments.map((file, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <AttachmentIcon className="h-4 w-4" />
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                                </li>
                                ))}
                            </ul>
                            <p className="text-xs text-muted-foreground">Uploading new files will replace current attachments.</p>
                         </div>
                      )}
                  </div>

                  <div className="md:col-span-2 space-y-4">
                      <div>
                        <FormLabel>Reminder Emails</FormLabel>
                        <FormDescription className="mb-2">Emails for notifications.</FormDescription>
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
                              Add Email
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleTestEmail}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send Test
                            </Button>
                        </div>
                      </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                      <div>
                        <FormLabel>Reminder Phone Numbers</FormLabel>
                        <FormDescription className="mb-2">Phone numbers for SMS notifications.</FormDescription>
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
                              Add Phone Number
                            </Button>
                             <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleTestSms}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send Test
                            </Button>
                        </div>
                      </div>
                  </div>
                  
                  <div className="md:col-span-2 space-y-4">
                      <div>
                        <FormLabel>Reminder Days</FormLabel>
                        <FormDescription className="mb-2">Days before expiration to send reminders.</FormDescription>
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
                          Add Reminder Day
                        </Button>
                      </div>
                  </div>
                  <DialogFooter className="md:col-span-2">
                      <DialogClose asChild>
                          <Button type="button" variant="ghost">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">{editingContract ? 'Save Changes' : 'Create Contract'}</Button>
                  </DialogFooter>
              </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Sheet open={isDetailsSheetOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDetailsSheet()}>
        <SheetContent className="flex flex-col sm:max-w-lg">
            <SheetHeader>
                <SheetTitle>Details for {selectedContractForDetails?.contractorName}</SheetTitle>
                <SheetDescription>
                    Contract ID: {selectedContractForDetails?.id}
                </SheetDescription>
            </SheetHeader>
             <Tabs defaultValue="comments" className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="comments">Comments</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="comments" className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto pr-6 -mr-6 space-y-4 py-4">
                        {(selectedContractForDetails?.comments || []).length > 0 ? (
                            (selectedContractForDetails?.comments || []).map(comment => {
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
                                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
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
                                <p className="mt-4">No comments yet.</p>
                                <p>Be the first to add a comment.</p>
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
                </TabsContent>
                 <TabsContent value="history" className="flex-1 overflow-y-auto">
                    {(selectedContractForDetails?.versions || []).length > 0 ? (
                        <div className="space-y-4 py-4">
                            {[...(selectedContractForDetails?.versions || [])].reverse().map(version => {
                                const creator = getCreator(version.createdBy);
                                return (
                                <div key={version.versionNumber} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={creator?.avatar} alt={creator?.name} />
                                            <AvatarFallback>{creator?.name.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">Version {version.versionNumber}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Saved by {creator?.name || 'Unknown'} on {format(new Date(version.createdAt), "PPP p")}
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
                            <p className="mt-4">No version history.</p>
                            <p>Edits to this contract will be tracked here.</p>
                        </div>
                    )}
                 </TabsContent>
            </Tabs>
        </SheetContent>
      </Sheet>

        <Dialog open={isVersionViewOpen} onOpenChange={setIsVersionViewOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Contract Version {selectedVersion?.versionNumber}</DialogTitle>
                    <DialogDescription>
                        Read-only view of a past contract version. Saved by {getCreator(selectedVersion?.createdBy || '')?.name} on {selectedVersion ? format(new Date(selectedVersion.createdAt), "PPP p") : ''}.
                    </DialogDescription>
                </DialogHeader>
                {selectedVersion && (
                    <ScrollArea className="max-h-[70vh]">
                    <div className="space-y-4 p-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Contractor Name</p>
                                <p>{selectedVersion.contractorName}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Contract Type</p>
                                <p>{selectedVersion.type}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                                <p>{formatPersian(new Date(selectedVersion.startDate), 'yyyy/MM/dd')}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">End Date</p>
                                <p>{formatPersian(new Date(selectedVersion.endDate), 'yyyy/MM/dd')}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Unit</p>
                                <p>{selectedVersion.unit}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Renewal Policy</p>
                                <p className="capitalize">{selectedVersion.renewal}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <p className="capitalize">{selectedVersion.status}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                           <p className="text-sm font-medium text-muted-foreground">Description</p>
                           <p className="text-sm">{selectedVersion.description || 'N/A'}</p>
                        </div>
                         <div className="space-y-1">
                           <p className="text-sm font-medium text-muted-foreground">Reminder Emails</p>
                           <p className="text-sm">{selectedVersion.reminderEmails.join(', ')}</p>
                        </div>
                         <div className="space-y-1">
                           <p className="text-sm font-medium text-muted-foreground">Reminder Phones</p>
                           <p className="text-sm">{selectedVersion.reminderPhones.join(', ') || 'N/A'}</p>
                        </div>
                         <div className="space-y-1">
                           <p className="text-sm font-medium text-muted-foreground">Reminder Days</p>
                           <p className="text-sm">{selectedVersion.reminders.join(', ')}</p>
                        </div>
                         <div className="space-y-1">
                           <p className="text-sm font-medium text-muted-foreground">Attachments</p>
                           {selectedVersion.attachments.length > 0 ? (
                                <ul className="list-disc list-inside text-sm">
                                    {selectedVersion.attachments.map((file, index) => (
                                        <li key={index}>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                                        </li>
                                    ))}
                                </ul>
                           ) : <p className="text-sm">No attachments</p>}
                        </div>

                    </div>
                    </ScrollArea>
                )}
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsVersionViewOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>Contract List</CardTitle>
                    <CardDescription>A list of all contracts in your system.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                     <Input
                        placeholder="Search by contractor, ID, or type..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full sm:w-auto"
                    />
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto">
                                <Filter className="mr-2 h-4 w-4" />
                                Filter & Sort
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Filters</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Refine the contracts shown in the list.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label htmlFor="filter-status">Status</label>
                                        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                                            <SelectTrigger id="filter-status" className="col-span-2 h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label htmlFor="filter-renewal">Renewal</label>
                                        <Select value={filters.renewal} onValueChange={(v) => handleFilterChange('renewal', v)}>
                                            <SelectTrigger id="filter-renewal" className="col-span-2 h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="auto">Automatic</SelectItem>
                                                <SelectItem value="manual">Manual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="justify-self-start">
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Clear Filters
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                     <Button onClick={() => handleOpenDialog(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Contract
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">
                    <Button variant="ghost" onClick={() => handleSort('contractorName')}>
                        Contractor
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[15%]">Type</TableHead>
                  <TableHead className="w-[10%]">
                     <Button variant="ghost" onClick={() => handleSort('status')}>
                        Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[15%]">
                     <Button variant="ghost" onClick={() => handleSort('endDate')}>
                        End Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[10%]">Days Left</TableHead>
                  <TableHead className="w-[10%]">Unit</TableHead>
                  <TableHead className="w-[10%]">Info</TableHead>
                  <TableHead className="w-[5%]">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedContracts.length > 0 ? (
                  paginatedContracts.map((contract) => {
                    const daysLeft = getDaysLeft(contract.endDate);
                    const daysLeftText = daysLeft < 0 ? 'Expired' : `${daysLeft} days`;
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
                                {contract.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                        </TableCell>
                        <TableCell>{formatPersian(new Date(contract.endDate), 'yyyy/MM/dd')}</TableCell>
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
                                                <p>Has comments</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                     {(contract.versions?.length || 0) > 0 && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <History className="h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Has version history</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                    {contract.attachments.length > 0 && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <AttachmentIcon className="h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{contract.attachments.length} attachment(s)</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                    {contract.reminders.length > 0 && contract.status === 'active' && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Bell className="h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Email reminders active</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                     {contract.reminderPhones && contract.reminderPhones.length > 0 && contract.status === 'active' && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>SMS reminders active</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                            </TooltipProvider>
                        </TableCell>
                        <TableCell>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenDialog(contract)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenDetailsSheet(contract)}>Details</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(contract.id)} className="text-destructive">Delete</DropdownMenuItem>
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
                           <p className="font-semibold">No contracts found.</p>
                           <p className="text-muted-foreground text-sm">Try adjusting your filters or add a new contract.</p>
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
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    