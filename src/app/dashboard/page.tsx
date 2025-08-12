
"use client"
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from "@/components/page-header"
import { FileText, Clock, Users, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { contracts as mockContracts } from "@/lib/mock-data"


export default function DashboardPage() {
    const totalContracts = mockContracts.length;
    const activeContracts = mockContracts.filter(c => c.status === 'active').length;
    const inactiveContracts = mockContracts.filter(c => c.status === 'inactive').length;
    const expiringSoon = mockContracts.filter(c => {
        if (c.status === 'inactive') return false;
        const endDate = new Date(c.endDate);
        const today = new Date();
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
    }).length;


  const stats = [
    {
      title: "Total Contracts",
      value: totalContracts,
      icon: FileText,
      description: "All contracts in the system",
    },
    {
      title: "Active Contracts",
      value: activeContracts,
      icon: CheckCircle,
      description: `${expiringSoon} expiring this month`,
    },
    {
      title: "Expiring Soon",
      value: expiringSoon,
      icon: AlertTriangle,
      description: "Within the next 30 days",
      className: "text-destructive"
    },
    {
      title: "Inactive Contracts",
      value: inactiveContracts,
      icon: XCircle,
      description: "Expired or manually disabled",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <PageHeaderHeading>Dashboard</PageHeaderHeading>
        <PageHeaderDescription>A quick overview of your contract management system.</PageHeaderDescription>
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

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>An overview of recent contract changes and user actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary p-2 rounded-full">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">New contract <span className="text-primary">#C-2024-0151</span> added</p>
                  <p className="text-sm text-muted-foreground">by John Doe in Marketing Unit - 2 hours ago</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="bg-accent/10 text-accent p-2 rounded-full">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Contract <span className="text-primary">#C-2023-0098</span> renewed automatically</p>
                  <p className="text-sm text-muted-foreground">for another year - 1 day ago</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="bg-destructive/10 text-destructive p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Reminder sent for contract <span className="text-primary">#C-2024-0012</span></p>
                  <p className="text-sm text-muted-foreground">to reminder_email@example.com - 3 days ago</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

    