
"use client";

import React, { useState, useEffect } from 'react';
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
} from '@/components/ui/card';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';
import { users as mockUsers, units as mockUnits } from '@/lib/mock-data';
import type { User, Unit } from '@/lib/types';
import { useToast } from "@/hooks/use-toast"

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


export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

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
        title: "User Created",
        description: `User ${newUser.name} has been successfully created.`,
    });
    addUserForm.reset();
    setIsAddUserDialogOpen(false);
  };
  
  const onEditUserSubmit = (values: z.infer<typeof editUserSchema>) => {
    if (!editingUser) return;
    
    setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...values } : u));
    toast({
      title: "User Updated",
      description: `User ${values.name} has been successfully updated.`
    });
    setIsEditUserDialogOpen(false);
    setEditingUser(null);
  };
  
  const onChangePasswordSubmit = (values: z.infer<typeof changePasswordSchema>) => {
    if (!editingUser) return;
    
    // In a real app, you'd make an API call here.
    console.log(`Password for ${editingUser.name} changed to ${values.newPassword}`);
    
    toast({
      title: "Password Changed",
      description: `Password for ${editingUser.name} has been successfully changed.`
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
          title: "User Deleted",
          description: "The user has been successfully deleted.",
          variant: "destructive"
      });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageHeaderHeading>Users</PageHeaderHeading>
            <PageHeaderDescription>
              Manage all users, their roles, and units.
            </PageHeaderDescription>
          </div>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New User
                  </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                          Create a local user or add one from Active Directory.
                      </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="local" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="local">Local User</TabsTrigger>
                        <TabsTrigger value="ad">From Active Directory</TabsTrigger>
                    </TabsList>
                    <TabsContent value="local">
                         <Form {...addUserForm}>
                          <form onSubmit={addUserForm.handleSubmit(onAddUserSubmit)} className="space-y-4 py-4">
                            <FormField
                              control={addUserForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
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
                                  <FormLabel>Email</FormLabel>
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
                                  <FormLabel>Password</FormLabel>
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
                                  <FormLabel>Role</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="super-admin">Super Admin</SelectItem>
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
                                  <FormLabel>Unit</FormLabel>
                                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a unit" />
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
                                    <Button type="button" variant="ghost">Cancel</Button>
                                </DialogClose>
                                <Button type="submit">Create User</Button>
                            </DialogFooter>
                          </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="ad">
                      <div className="space-y-4 py-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input placeholder="Search for user in Active Directory..." className="pl-10" />
                        </div>
                        <div className="rounded-md border h-48 overflow-y-auto">
                           {/* Search results would be displayed here */}
                           <p className="p-4 text-sm text-center text-muted-foreground">No users found. Try another search.</p>
                        </div>
                        <div className="space-y-2">
                           <Label>Assign to Unit</Label>
                           <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a unit" />
                            </SelectTrigger>
                            <SelectContent>
                                {mockUnits.map((unit) => (
                                <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                                ))}
                            </SelectContent>
                           </Select>
                        </div>
                         <div className="space-y-2">
                           <Label>Assign Role</Label>
                           <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super-admin">Super Admin</SelectItem>
                            </SelectContent>
                           </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="button">Add Selected User</Button>
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
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update the details for {editingUser?.name}.</DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(onEditUserSubmit)} className="space-y-4 py-4">
              <FormField
                control={editUserForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
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
                    <FormLabel>Email</FormLabel>
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
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super-admin">Super Admin</SelectItem>
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
                    <FormLabel>Unit</FormLabel>
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
                  <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Change Password Dialog */}
       <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Set a new password for {editingUser?.name}.</DialogDescription>
          </DialogHeader>
          <Form {...changePasswordForm}>
            <form onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)} className="space-y-4 py-4">
              <FormField
                control={changePasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
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
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit">Update Password</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Auth Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
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
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.unit}</TableCell>
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
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>Edit User</DropdownMenuItem>
                          {user.authType === 'local' && (
                            <DropdownMenuItem onClick={() => openChangePasswordDialog(user)}>Change Password</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-destructive">
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
