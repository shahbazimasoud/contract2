
"use client"
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from "@/components/page-header"
import { FileText, CheckCircle, AlertTriangle, XCircle, Users, ClipboardCheck, MessageSquare, Plus, Edit } from "lucide-react"
import { contracts as mockContracts, users as mockUsers, tasks as mockTasks } from "@/lib/mock-data"
import type { User, Contract, Task, Comment } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const AUTH_USER_KEY = 'current_user';

type Activity = {
    type: 'new_contract' | 'new_task' | 'new_comment' | 'task_status';
    item: Contract | Task | (Comment & { parentTitle: string, parentId: string, parentType: 'contract' | 'task' });
    user: User;
    timestamp: Date;
}

export default function DashboardPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [stats, setStats] = useState<any[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [myTasks, setMyTasks] = useState<Task[]>([]);
    const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);

    useEffect(() => {
        const storedUser = localStorage.getItem(AUTH_USER_KEY);
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        // Determine which items to show based on role
        const isSuperAdmin = currentUser.role === 'super-admin';

        const visibleContracts = isSuperAdmin
            ? mockContracts
            : mockContracts.filter(c => c.unit === currentUser.unit);

        const visibleTasks = isSuperAdmin
            ? mockTasks
            : mockTasks.filter(t => {
                  const isAssigned = t.assignedTo === currentUser.id;
                  const isShared = t.sharedWith?.includes(currentUser.id);
                  const inSameUnit = t.unit === currentUser.unit;
                  return isAssigned || isShared || inSameUnit;
              });
        
        const visibleUsers = isSuperAdmin
            ? mockUsers
            : mockUsers.filter(u => u.unit === currentUser.unit);

        // Calculate stats
        const totalContracts = visibleContracts.length;
        const activeContracts = visibleContracts.filter(c => c.status === 'active').length;
        const expiringSoon = visibleContracts.filter(c => {
            if (c.status === 'inactive') return false;
            const endDate = new Date(c.endDate);
            const today = new Date();
            const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
        }).length;
        const totalTasks = visibleTasks.length;
        const pendingTasks = visibleTasks.filter(t => t.status === 'pending').length;
        const totalUsers = visibleUsers.length;

        const baseStats = [
            { title: "Total Contracts", value: totalContracts, icon: FileText, description: `${activeContracts} active` },
            { title: "Expiring Soon", value: expiringSoon, icon: AlertTriangle, description: "In the next 30 days", className: "text-destructive" },
            { title: "Total Tasks", value: totalTasks, icon: ClipboardCheck, description: `${pendingTasks} pending` },
        ];
        
        if (isSuperAdmin) {
            baseStats.push({ title: "Total Users", value: totalUsers, icon: Users, description: "Across all units" });
        } else {
             baseStats.push({ title: "Users in Unit", value: totalUsers, icon: Users, description: `In ${currentUser.unit}` });
        }
        
        setStats(baseStats);

        // Aggregate and sort activities
        const allActivities: Activity[] = [];

        visibleContracts.forEach(contract => {
            const creator = mockUsers.find(u => u.name === contract.createdBy);
            if (creator) {
                // Heuristic: For demo, assume creation date is close to start date
                const timestamp = new Date(contract.startDate);
                timestamp.setDate(timestamp.getDate() - 5);
                allActivities.push({ type: 'new_contract', item: contract, user: creator, timestamp });
            }
            contract.comments?.forEach(comment => {
                const author = mockUsers.find(u => u.id === comment.authorId);
                if (author) {
                     allActivities.push({
                        type: 'new_comment',
                        item: { ...comment, parentTitle: contract.contractorName, parentId: contract.id, parentType: 'contract' },
                        user: author,
                        timestamp: new Date(comment.createdAt)
                    });
                }
            });
        });

        visibleTasks.forEach(task => {
            const creator = mockUsers.find(u => u.name === task.createdBy);
            if(creator) {
                 // Heuristic: For demo, assume creation date is close to due date
                 const timestamp = new Date(task.dueDate);
                 timestamp.setDate(timestamp.getDate() - 2);
                 allActivities.push({ type: 'new_task', item: task, user: creator, timestamp });
            }
            task.comments?.forEach(comment => {
                 const author = mockUsers.find(u => u.id === comment.authorId);
                 if (author) {
                     allActivities.push({
                        type: 'new_comment',
                        item: { ...comment, parentTitle: task.title, parentId: task.id, parentType: 'task' },
                        user: author,
                        timestamp: new Date(comment.createdAt)
                    });
                 }
            });
        });

        setActivities(allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5));

        // Set My Tasks (tasks specifically assigned to me)
        setMyTasks(mockTasks.filter(t => t.assignedTo === currentUser.id && t.status === 'pending').slice(0, 5));

        // Set Expiring Contracts (already filtered by unit for non-super-admins)
        setExpiringContracts(visibleContracts.filter(c => {
             if (c.status === 'inactive') return false;
            const endDate = new Date(c.endDate);
            const today = new Date();
            const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
        }).sort((a,b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()));


    }, [currentUser]);

    const renderActivity = (activity: Activity) => {
        const { type, item, user, timestamp } = activity;
        let icon, title, link;

        switch (type) {
            case 'new_contract':
                icon = <Plus className="h-5 w-5" />;
                title = <>created contract <span className="font-semibold text-primary">{(item as Contract).contractorName}</span></>;
                link = '/dashboard/contracts';
                break;
            case 'new_task':
                icon = <ClipboardCheck className="h-5 w-5" />;
                title = <>created task <span className="font-semibold text-primary">{(item as Task).title}</span></>;
                link = '/dashboard/tasks';
                break;
            case 'new_comment':
                 const comment = item as Comment & { parentTitle: string, parentId: string, parentType: 'contract' | 'task' };
                 icon = <MessageSquare className="h-5 w-5" />;
                 title = <>commented on {comment.parentType} <span className="font-semibold text-primary">{comment.parentTitle}</span></>;
                 link = `/dashboard/${comment.parentType}s`;
                 break;
            case 'task_status':
                 icon = <Edit className="h-5 w-5" />;
                 title = <>updated status for <span className="font-semibold text-primary">{(item as Task).title}</span></>;
                 link = '/dashboard/tasks';
                 break;
        }

        return (
            <li key={`${type}-${item.id}-${timestamp}`} className="flex items-start gap-4">
                 <Avatar className="h-9 w-9 border-2 border-white dark:border-zinc-800">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="text-sm">
                        <span className="font-semibold">{user.name}</span> {title}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(timestamp, { addSuffix: true })}</p>
                </div>
            </li>
        )
    }
    
    if (!currentUser) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <PageHeaderHeading>Welcome, {currentUser.name}!</PageHeaderHeading>
        <PageHeaderDescription>Here's a quick overview of what's happening.</PageHeaderDescription>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.className || ''}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>An overview of recent actions across the system.</CardDescription>
            </CardHeader>
            <CardContent>
                {activities.length > 0 ? (
                    <ul className="space-y-4">
                        {activities.map(renderActivity)}
                    </ul>
                ) : (
                    <div className="text-center text-muted-foreground py-6">
                        <p>No recent activity to display.</p>
                    </div>
                )}
            </CardContent>
            </Card>
        </div>

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>My Pending Tasks</CardTitle>
                     <CardDescription>Tasks assigned directly to you.</CardDescription>
                </CardHeader>
                <CardContent>
                     {myTasks.length > 0 ? (
                        <ul className="space-y-3">
                            {myTasks.map(task => (
                                <li key={task.id} className="flex items-center justify-between text-sm">
                                    <span className="font-medium truncate pr-2">{task.title}</span>
                                    <Badge variant="outline" className="flex-shrink-0">{task.recurrence.type}</Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">You have no pending tasks.</p>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Expiring Contracts</CardTitle>
                    <CardDescription>Contracts expiring in the next 30 days.</CardDescription>
                </CardHeader>
                <CardContent>
                     {expiringContracts.length > 0 ? (
                        <ul className="space-y-3">
                            {expiringContracts.map(contract => {
                                const daysLeft = Math.ceil((new Date(contract.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                return (
                                    <li key={contract.id} className="flex items-center justify-between text-sm">
                                        <div className="truncate pr-2">
                                            <p className="font-medium">{contract.contractorName}</p>
                                            <p className="text-xs text-muted-foreground">{contract.unit}</p>
                                        </div>
                                        <span className={cn("font-semibold text-xs flex-shrink-0", daysLeft < 7 ? 'text-destructive' : 'text-amber-600')}>
                                            {daysLeft} days left
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">No contracts are expiring soon.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
