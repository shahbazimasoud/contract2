
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
import type { User, AppearanceSettings } from '@/lib/types';
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const APPEARANCE_SETTINGS_KEY = 'appearance-settings';
const AUTH_USER_KEY = 'current_user';


function CustomSidebarTrigger() {
  const { state, toggleSidebar, isMobile } = useSidebar();

  if (isMobile) return null;

  return (
    <Button variant="ghost" className="w-full justify-start" onClick={toggleSidebar}>
      {state === 'expanded' ? <PanelLeftClose /> : <PanelLeft />}
      <span className="group-data-[collapsible=icon]:hidden">Collapse</span>
    </Button>
  );
}


export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: any
}) {
  const pathname = usePathname()
  const router = useRouter();
  const isActive = (path: string) => pathname === path;
  
  const [appearanceSettings, setAppearanceSettings] = React.useState<AppearanceSettings>({
      siteName: 'ContractWise',
      loginTitle: '',
      loginSubtitle: '',
      logo: null,
      primaryColor: ''
  });
  const [user, setUser] = React.useState<User | null>(null);
  const [isClient, setIsClient] = React.useState(false);


  React.useEffect(() => {
    setIsClient(true);
    const savedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setAppearanceSettings(settings);
        if (settings.primaryColor) {
            document.documentElement.style.setProperty('--primary-hsl', settings.primaryColor);
        }
    }

    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (storedUser) {
        setUser(JSON.parse(storedUser));
    } else {
        router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_USER_KEY);
    router.push('/login');
  }

  if (!isClient || !user) {
    // Render a skeleton or loading state on the server and initial client render
    // to prevent hydration mismatch.
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Building className="h-10 w-10 animate-pulse text-muted-foreground" />
                <p className="text-muted-foreground">Loading Dashboard...</p>
            </div>
        </div>
    );
  }


  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            {appearanceSettings.logo ? (
                <Image src={appearanceSettings.logo} alt="Company Logo" width={32} height={32} className="w-8 h-8" />
            ) : (
                <Building className="w-8 h-8 text-primary" />
            )}
            <span className="text-xl font-semibold font-headline group-data-[collapsible=icon]:hidden">{appearanceSettings.siteName}</span>
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
            <SidebarSeparator />
             <SidebarMenuItem>
               <CustomSidebarTrigger />
            </SidebarMenuItem>
            <SidebarMenuItem>
               <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <SidebarMenuButton tooltip="Logout">
                          <LogOut />
                          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                      </SidebarMenuButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                      <AlertDialogDescription>
                          You will be returned to the login page.
                      </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLogout}>Log Out</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
