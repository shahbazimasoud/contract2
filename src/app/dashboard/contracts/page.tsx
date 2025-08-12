
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, FileText, Calendar as CalendarIcon, X, Paperclip, Upload, Bell, Paperclip as AttachmentIcon, Phone } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns"
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import PersianCalendar from "react-date-object/calendars/persian"
import { format as formatPersian, differenceInDays } from "date-fns-jalali";

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
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';
import { contracts as mockContracts, units as mockUnits } from '@/lib/mock-data';
import type { Contract } from '@/lib/types';
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ITEMS_PER_PAGE = 10;

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


export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>(mockContracts);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const { toast } = useToast();

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
    },
  });

  useEffect(() => {
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
        unit: "",
        reminderEmails: [{email: ""}],
        reminderPhones: [],
        reminders: [{days: 30}],
        attachments: [],
      });
    }
  }, [editingContract, form]);
  
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

  const onSubmit = (values: z.infer<typeof contractSchema>) => {
    if (editingContract) {
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
      };
      setContracts(contracts.map(c => c.id === editingContract.id ? updatedContract : c));
      toast({
        title: "Contract Updated",
        description: `Contract for "${updatedContract.contractorName}" has been successfully updated.`,
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
        status: 'active',
        attachments: attachedFiles.map(file => ({ name: file.name, url: URL.createObjectURL(file) })),
        reminders: values.reminders.map(r => r.days),
        reminderEmails: values.reminderEmails.map(e => e.email),
        reminderPhones: values.reminderPhones ? values.reminderPhones.map(p => p.phone) : [],
        createdBy: 'Super Admin', // In real app, get from user session
      };
      setContracts([newContract, ...contracts]);
      toast({
          title: "Contract Created",
          description: `Contract for "${newContract.contractorName}" has been successfully created.`,
      });
    }

    handleCloseDialog();
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter(
      (contract) =>
        contract.contractorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contracts, searchTerm]);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <div className="flex items-center justify-between">
            <div>
                <PageHeaderHeading>Contracts</PageHeaderHeading>
                <PageHeaderDescription>
                Manage, view, and organize all your contracts.
                </PageHeaderDescription>
            </div>
            <Button onClick={() => handleOpenDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Contract
            </Button>
        </div>
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
                              <Select onValueChange={field.onChange} value={field.value}>
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => appendEmail({ email: '' })}
                        >
                          Add Email
                        </Button>
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => appendPhone({ phone: '' })}
                        >
                          Add Phone Number
                        </Button>
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

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                 <CardTitle>Contract List</CardTitle>
                <div className="w-full max-w-sm">
                    <Input
                        placeholder="Search by contractor, ID, or type..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>
            <CardDescription>A list of all contracts in your system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Info</TableHead>
                  <TableHead>
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
                        <TableRow key={contract.id}>
                        <TableCell className="font-medium">
                            <div>{contract.contractorName}</div>
                            <div className="text-xs text-muted-foreground">{contract.id}</div>
                        </TableCell>
                        <TableCell>{contract.type}</TableCell>
                        <TableCell>{formatPersian(new Date(contract.endDate), 'yyyy/MM/dd')}</TableCell>
                        <TableCell className={cn("font-semibold", daysLeftColor)}>
                            {daysLeftText}
                        </TableCell>
                        <TableCell>{contract.unit}</TableCell>
                        <TableCell>
                            <TooltipProvider>
                                <div className="flex items-center gap-2">
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
                                    {contract.reminders.length > 0 && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Bell className="h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Email reminders active</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                     {contract.reminderPhones && contract.reminderPhones.length > 0 && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Phone className="h-4 w-4 text-muted-foreground" />
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
                                <DropdownMenuItem onClick={() => handleDelete(contract.id)} className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                           <FileText className="h-8 w-8 text-muted-foreground" />
                           <p className="font-semibold">No contracts found.</p>
                           <p className="text-muted-foreground text-sm">Try adjusting your search or add a new contract.</p>
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
