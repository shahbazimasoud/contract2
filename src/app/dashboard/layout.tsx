
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
  User as UserIcon,
  Users,
  ClipboardCheck,
  PanelLeftClose,
  PanelRightClose
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
  useSidebar
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { usePathname, useRouter } from "next/navigation"
import type { User } from '@/lib/types';

const APPEARANCE_SETTINGS_KEY = 'appearance-settings';
const AUTH_USER_KEY = 'current_user';


function CustomSidebarTrigger() {
  const { state, toggleSidebar } = useSidebar();

  return (
    <Button variant="ghost" className="w-full justify-start" onClick={toggleSidebar}>
      {state === 'expanded' ? <PanelLeftClose /> : <PanelLeft />}
      <span className="group-data-[collapsible=icon]:hidden">Collapse</span>
    </Button>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter();
  const isActive = (path: string) => pathname === path
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    const savedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.logo) {
            setLogoUrl(settings.logo);
        }
    }

    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (storedUser) {
        setUser(JSON.parse(storedUser));
    } else {
        router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_USER_KEY);
    router.push('/login');
  }

  if (!user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            {logoUrl ? (
                <Image src={logoUrl} alt="Company Logo" width={32} height={32} className="w-8 h-8" />
            ) : (
                <Building className="w-8 h-8 text-primary" />
            )}
            <span className="text-xl font-semibold font-headline group-data-[collapsible=icon]:hidden">ContractWise</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard")} tooltip="Dashboard">
                <Link href="/dashboard">
                  <Home />
                  <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/dashboard/contracts")}
                tooltip="Contracts"
              >
                <Link href="/dashboard/contracts">
                  <FileText />
                  <span className="group-data-[collapsible=icon]:hidden">Contracts</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/dashboard/tasks")}
                 tooltip="Tasks"
              >
                <Link href="/dashboard/tasks">
                  <ClipboardCheck />
                  <span className="group-data-[collapsible=icon]:hidden">Tasks</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {user.role === 'super-admin' && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/dashboard/users")}
                    tooltip="Users"
                  >
                    <Link href="/dashboard/users">
                      <Users />
                      <span className="group-data-[collapsible=icon]:hidden">Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/dashboard/units")}
                    tooltip="Units"
                  >
                    <Link href="/dashboard/units">
                      <Building />
                      <span className="group-data-[collapsible=icon]:hidden">Units</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            
            <SidebarMenuItem>
                <SidebarSeparator />
            </SidebarMenuItem>

            <SidebarMenuItem>
                <SidebarMenuButton
                asChild
                isActive={isActive("/dashboard/profile")}
                tooltip="Profile"
                >
                <Link href="/dashboard/profile">
                    <UserIcon />
                    <span className="group-data-[collapsible=icon]:hidden">Profile</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            
            {user.role === "super-admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/dashboard/settings")}
                    tooltip="Settings"
                  >
                    <Link href="/dashboard/settings">
                      <Settings />
                      <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
             <SidebarMenuItem>
               <CustomSidebarTrigger />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                  <LogOut />
                  <span className="group-data-[collapsible=icon]:hidden">Logout</span>
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
