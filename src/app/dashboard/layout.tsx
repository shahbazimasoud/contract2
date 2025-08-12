
"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Building,
  FileText,
  Home,
  LogOut,
  PanelLeft,
  Settings,
  Users,
} from "lucide-react"

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { usePathname } from "next/navigation"
import type { User } from '@/lib/types';

const APPEARANCE_SETTINGS_KEY = 'appearance-settings';

// This is a mock user object. In a real app, you'd get this from your auth provider.
// To test different roles, change this object.
// Super Admin: { id: "U-001", name: "Super Admin", email: "admin@contractwise.com", role: "super-admin", unit: "System" }
// Regular Admin: { id: "U-002", name: "John Doe", email: "john.doe@contractwise.com", role: "admin", unit: "IT Department" }
const user: User = {
  id: "U-001",
  name: "Super Admin",
  email: "admin@contractwise.com",
  role: "super-admin",
  unit: "System"
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = (path: string) => pathname === path
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const savedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.logo) {
            setLogoUrl(settings.logo);
        }
    }
  }, []);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            {logoUrl ? (
                <Image src={logoUrl} alt="Company Logo" width={32} height={32} className="w-8 h-8" />
            ) : (
                <Building className="w-8 h-8 text-primary" />
            )}
            <span className="text-xl font-semibold font-headline">ContractWise</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard")}>
                <Link href="/dashboard">
                  <Home />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/dashboard/contracts")}
              >
                <Link href="/dashboard/contracts">
                  <FileText />
                  <span>Contracts</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {user.role === 'super-admin' && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/dashboard/users")}
                  >
                    <Link href="/dashboard/users">
                      <Users />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/dashboard/units")}
                  >
                    <Link href="/dashboard/units">
                      <Building />
                      <span>Units</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            {user.role === "super-admin" && (
              <>
                <SidebarMenuItem>
                    <SidebarSeparator />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/dashboard/settings")}
                  >
                    <Link href="/dashboard/settings">
                      <Settings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/login">
                  <LogOut />
                  Logout
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header user={user} />
        <main className="p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
