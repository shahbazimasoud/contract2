
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, User as UserIcon, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';
import { useToast } from "@/hooks/use-toast";
import type { User } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { avatars, users as mockUsers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';


const AUTH_USER_KEY = 'current_user';
const USERS_KEY = 'mock_users';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});


export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(undefined);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setSelectedAvatar(user.avatar);
    } else {
       router.push("/login");
    }
  }, [router]);

  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    },
  });

  const onPasswordSubmit = (values: z.infer<typeof changePasswordSchema>) => {
    console.log("Password change requested for:", currentUser?.email, "with new password:", values.newPassword);
    toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
    });
    form.reset();
  };

  const handleAvatarSave = () => {
    if (!currentUser || !selectedAvatar) return;

    const updatedUser = { ...currentUser, avatar: selectedAvatar };
    setCurrentUser(updatedUser);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));

    // Also update the master list in localStorage if it exists
    const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || JSON.stringify(mockUsers));
    const updatedUsers = allUsers.map((u: User) => u.id === currentUser.id ? updatedUser : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    
    toast({
      title: "Avatar Updated",
      description: "Your new avatar has been saved.",
    });
    window.location.reload(); // Force reload to update header avatar
  };


  if (!currentUser) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <PageHeaderHeading>My Profile</PageHeaderHeading>
        <PageHeaderDescription>
          View your account information and manage your settings.
        </PageHeaderDescription>
      </PageHeader>
      
      <div className="grid gap-8 md:grid-cols-1">
        <Card>
            <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Your personal, organizational, and display information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium">{currentUser.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{currentUser.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Building className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Unit</p>
                                <p className="font-medium">{currentUser.unit}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <KeyRound className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Authentication</p>
                                <p className="font-medium capitalize">{currentUser.authType}</p>
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <Label>Choose Your Avatar</Label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 mt-2">
                            {avatars.map((avatar, index) => (
                                <button key={index} onClick={() => setSelectedAvatar(avatar.url)} className={cn(
                                    "rounded-full ring-2 ring-transparent hover:ring-primary focus:ring-primary focus:outline-none transition-all",
                                    selectedAvatar === avatar.url && "ring-primary ring-offset-2"
                                )}>
                                    <Image 
                                        src={avatar.url} 
                                        alt={`Avatar ${index + 1}`}
                                        width={80}
                                        height={80}
                                        className="rounded-full bg-secondary p-1"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleAvatarSave}>Save Avatar</Button>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your login password.</CardDescription>
            </CardHeader>
            <CardContent>
                {currentUser.authType === 'local' ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Enter your current password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Enter your new password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Confirm your new password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                                <Button type="submit">Update Password</Button>
                        </form>
                    </Form>
                ) : (
                    <Alert>
                        <KeyRound className="h-4 w-4" />
                        <AlertTitle>Active Directory Account</AlertTitle>
                        <AlertDescription>
                            Your password is managed by Active Directory. Please contact your system administrator to change your password.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
