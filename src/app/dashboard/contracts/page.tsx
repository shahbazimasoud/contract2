
"use client";

import React, { useState, useMemo } from 'react';
import { PlusCircle, MoreHorizontal, FileText, Calendar as CalendarIcon, X } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns"
import DatePicker from "react-multi-date-picker";
import { Calendar as PersianCalendar } from "react-date-object/calendars/persian";
import { format as formatPersian } from "date-fns-jalali";

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

const ITEMS_PER_PAGE = 10;

const reminderEmailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
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
  reminders: z.array(reminderDaysSchema).min(1, "At least one reminder day is required."),
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
        reminders: [{days: 30}],
    },
  });

  const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
    control: form.control,
    name: "reminderEmails"
  });

  const { fields: reminderDayFields, append: appendReminderDay, remove: removeReminderDay } = useFieldArray({
    control: form.control,
    name: "reminders"
  });

  const onSubmit = (values: z.infer<typeof contractSchema>) => {
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
      attachments: [],
      reminders: values.reminders.map(r => r.days),
      reminderEmails: values.reminderEmails.map(e => e.email),
      createdBy: 'Super Admin', // In real app, get from user session
    };
    setContracts([newContract, ...contracts]);
    toast({
        title: "Contract Created",
        description: `Contract for "${newContract.contractorName}" has been successfully created.`,
    });
    form.reset();
    setIsDialogOpen(false);
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
            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) form.reset();
                setIsDialogOpen(isOpen);
            }}>
              <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Contract
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Add New Contract</DialogTitle>
                    <DialogDescription>
                        Fill out the form below to create a new contract.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4">
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
                                            calendar={PersianCalendar}
                                            format="YYYY/MM/DD"
                                            render={(value, openCalendar) => (
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
                                            calendar={PersianCalendar}
                                            format="YYYY/MM/DD"
                                            render={(value, openCalendar) => (
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                           <div>
                             <FormLabel>Reminder Emails</FormLabel>
                             <FormDescription className="mb-2">Emails for notifications.</FormDescription>
                             {emailFields.map((field, index) => (
                                <FormField
                                  key={field.id}
                                  control={form.control}
                                  name={`reminderEmails.${index}`}
                                  render={({ field }) => (
                                     <FormItem>
                                        <div className="flex items-center gap-2">
                                           <FormControl>
                                                <Input {...field} placeholder={`email@example.com`} onChange={e => field.onChange({ email: e.target.value })} value={field.value.email} />
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
                            <Button type="submit">Create Contract</Button>
                        </DialogFooter>
                    </form>
                </Form>
              </DialogContent>
            </Dialog>
        </div>
      </PageHeader>

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
                  <TableHead>Contract ID</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedContracts.length > 0 ? (
                  paginatedContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.id}</TableCell>
                      <TableCell>{contract.contractorName}</TableCell>
                      <TableCell>{contract.type}</TableCell>
                      <TableCell>
                        <Badge variant={contract.status === 'active' ? 'default' : 'secondary'} className={contract.status === 'active' ? 'bg-green-500' : ''}>
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPersian(new Date(contract.endDate), 'yyyy/MM/dd')}</TableCell>
                      <TableCell>{contract.unit}</TableCell>
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
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(contract.id)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
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
