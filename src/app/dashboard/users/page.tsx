
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, MoreHorizontal, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Form,
  FormControl,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';
import { users as mockUsers, units as mockUnits } from '@/lib/mock-data';
import type { User, Unit } from '@/lib/types';
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from '@/context/language-context';

const userSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  role: z.enum(['admin', 'super-admin']),
  unit: z.string().min(1, { message: "Unit is required" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  authType: z.literal('local'),
});

const editUserSchema = userSchema.omit({ password: true, authType: true });

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ITEMS_PER_PAGE = 10;

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ role: 'all', unit: 'all' });
  const [currentPage, setCurrentPage] = useState(1);

  const addUserForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "admin",
      unit: "",
      password: "",
      authType: 'local',
    },
  });

  const editUserForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
  });
  
  const changePasswordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: ""
    }
  });
  
  useEffect(() => {
    if (editingUser && isEditUserDialogOpen) {
      editUserForm.reset({
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        unit: editingUser.unit,
      });
    }
  }, [editingUser, isEditUserDialogOpen, editUserForm]);


  const onAddUserSubmit = (values: z.infer<typeof userSchema>) => {
    const newUser: User = {
      id: `U-${String(users.length + 1).padStart(3, '0')}`,
      ...values,
    };
    setUsers([...users, newUser]);
    toast({
        title: t('users.toast.created_title'),
        description: t('users.toast.created_desc', { name: newUser.name }),
    });
    addUserForm.reset();
    setIsAddUserDialogOpen(false);
  };
  
  const onEditUserSubmit = (values: z.infer<typeof editUserSchema>) => {
    if (!editingUser) return;
    
    setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...values } : u));
    toast({
      title: t('users.toast.updated_title'),
      description: t('users.toast.updated_desc', { name: values.name })
    });
    setIsEditUserDialogOpen(false);
    setEditingUser(null);
  };
  
  const onChangePasswordSubmit = (values: z.infer<typeof changePasswordSchema>) => {
    if (!editingUser) return;
    
    // In a real app, you'd make an API call here.
    console.log(`Password for ${editingUser.name} changed to ${values.newPassword}`);
    
    toast({
      title: t('users.toast.password_changed_title'),
      description: t('users.toast.password_changed_desc', { name: editingUser.name })
    });
    setIsChangePasswordDialogOpen(false);
    setEditingUser(null);
    changePasswordForm.reset();
  }
  
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setIsEditUserDialogOpen(true);
  }
  
  const openChangePasswordDialog = (user: User) => {
    setEditingUser(user);
    setIsChangePasswordDialogOpen(true);
  }

  const handleDelete = (userId: string) => {
      setUsers(users.filter(u => u.id !== userId));
      toast({
          title: t('users.toast.deleted_title'),
          description: t('users.toast.deleted_desc'),
          variant: "destructive"
      });
  }

  const filteredUsers = useMemo(() => {
    return users
      .filter(user => 
          (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .filter(user => filters.role === 'all' || user.role === filters.role)
      .filter(user => filters.unit === 'all' || user.unit === filters.unit);
  }, [users, searchTerm, filters]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const handleFilterChange = (filterType: 'role' | 'unit', value: string) => {
      setFilters(prev => ({ ...prev, [filterType]: value }));
      setCurrentPage(1);
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageHeaderHeading>{t('users.title')}</PageHeaderHeading>
            <PageHeaderDescription>
              {t('users.description')}
            </PageHeaderDescription>
          </div>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('users.add_button')}
                  </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                      <DialogTitle>{t('users.dialog.add_title')}</DialogTitle>
                      <DialogDescription>
                          {t('users.dialog.add_desc')}
                      </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="local" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="local">{t('users.dialog.local_user')}</TabsTrigger>
                        <TabsTrigger value="ad">{t('users.dialog.ad_user')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="local">
                         <Form {...addUserForm}>
                          <form onSubmit={addUserForm.handleSubmit(onAddUserSubmit)} className="space-y-4 py-4">
                            <FormField
                              control={addUserForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('users.dialog.name')}</FormLabel>
                                  <FormControl>
                                    <Input placeholder="John Doe" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={addUserForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('users.dialog.email')}</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={addUserForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('users.dialog.password')}</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="********" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={addUserForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('users.dialog.role')}</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('users.dialog.select_role')} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                                      <SelectItem value="super-admin">{t('users.roles.super_admin')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={addUserForm.control}
                              name="unit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('users.dialog.unit')}</FormLabel>
                                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('users.dialog.select_unit')} />
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
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost">{t('common.cancel')}</Button>
                                </DialogClose>
                                <Button type="submit">{t('users.dialog.create_button')}</Button>
                            </DialogFooter>
                          </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="ad">
                      <div className="space-y-4 py-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input placeholder={t('users.dialog.ad_search_placeholder')} className="pl-10" />
                        </div>
                        <div className="rounded-md border h-48 overflow-y-auto">
                           {/* Search results would be displayed here */}
                           <p className="p-4 text-sm text-center text-muted-foreground">{t('users.dialog.ad_no_results')}</p>
                        </div>
                        <div className="space-y-2">
                           <Label>{t('users.dialog.assign_unit')}</Label>
                           <Select>
                            <SelectTrigger>
                                <SelectValue placeholder={t('users.dialog.select_unit')} />
                            </SelectTrigger>
                            <SelectContent>
                                {mockUnits.map((unit) => (
                                <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                                ))}
                            </SelectContent>
                           </Select>
                        </div>
                         <div className="space-y-2">
                           <Label>{t('users.dialog.assign_role')}</Label>
                           <Select>
                            <SelectTrigger>
                                <SelectValue placeholder={t('users.dialog.select_role')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                                <SelectItem value="super-admin">{t('users.roles.super_admin')}</SelectItem>
                            </SelectContent>
                           </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">{t('common.cancel')}</Button>
                        </DialogClose>
                        <Button type="button">{t('users.dialog.add_selected_button')}</Button>
                      </DialogFooter>
                    </TabsContent>
                  </Tabs>
              </DialogContent>
          </Dialog>
      </div>
      </PageHeader>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.dialog.edit_title')}</DialogTitle>
            <DialogDescription>{t('users.dialog.edit_desc', { name: editingUser?.name })}</DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(onEditUserSubmit)} className="space-y-4 py-4">
              <FormField
                control={editUserForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.dialog.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={editingUser?.authType === 'ad'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.dialog.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} disabled={editingUser?.authType === 'ad'}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.dialog.role')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                        <SelectItem value="super-admin">{t('users.roles.super_admin')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.dialog.unit')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">{t('common.cancel')}</Button>
                </DialogClose>
                <Button type="submit">{t('common.save_changes')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Change Password Dialog */}
       <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.dialog.change_password_title')}</DialogTitle>
            <DialogDescription>{t('users.dialog.change_password_desc', { name: editingUser?.name })}</DialogDescription>
          </DialogHeader>
          <Form {...changePasswordForm}>
            <form onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)} className="space-y-4 py-4">
              <FormField
                control={changePasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.dialog.new_password')}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={changePasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.dialog.confirm_password')}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">{t('common.cancel')}</Button>
                </DialogClose>
                <Button type="submit">{t('users.dialog.update_password_button')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>{t('users.list_title')}</CardTitle>
          <CardDescription>{t('users.list_desc')}</CardDescription>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <div className="relative sm:max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder={t('users.search_placeholder')}
                        className="pl-10 w-full"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder={t('users.filter_role_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('users.filter_all_roles')}</SelectItem>
                        <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                        <SelectItem value="super-admin">{t('users.roles.super_admin')}</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={filters.unit} onValueChange={(value) => handleFilterChange('unit', value)}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder={t('users.filter_unit_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('users.filter_all_units')}</SelectItem>
                         {mockUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                         ))}
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">{t('users.table.name')}</TableHead>
                  <TableHead className="w-[25%]">{t('users.table.email')}</TableHead>
                  <TableHead className="w-[10%]">{t('users.table.auth_type')}</TableHead>
                  <TableHead className="w-[10%]">{t('users.table.role')}</TableHead>
                  <TableHead className="w-[20%]">{t('users.table.unit')}</TableHead>
                  <TableHead className="w-[10%] text-right">
                    <span className="sr-only">{t('common.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                            <Badge variant={user.authType === 'ad' ? 'outline' : 'default'}>
                                {user.authType.toUpperCase()}
                            </Badge>
                        </TableCell>
                        <TableCell>
                        <Badge variant={user.role === 'super-admin' ? 'destructive' : 'secondary'}>
                            {t(`users.roles.${user.role}`)}
                        </Badge>
                        </TableCell>
                        <TableCell>{user.unit}</TableCell>
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
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>{t('common.edit')}</DropdownMenuItem>
                            {user.authType === 'local' && (
                                <DropdownMenuItem onClick={() => openChangePasswordDialog(user)}>{t('users.dialog.change_password_title')}</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-destructive">
                                {t('common.delete')}
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            {t('users.no_users_found')}
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 1 && (
             <CardFooter>
                <div className="flex w-full items-center justify-end space-x-2 pt-4">
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
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
