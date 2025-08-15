
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
import { LanguageProvider, useLanguage } from "@/context/language-context"
import { CalendarProvider } from "@/context/calendar-context"


const APPEARANCE_SETTINGS_KEY = 'appearance-settings';
const AUTH_USER_KEY = 'current_user';

// This is a new component that wraps the main content and handles language direction.
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    
    // Apply global appearance settings from localStorage
    const savedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
    if (savedSettings) {
        const settings: AppearanceSettings = JSON.parse(savedSettings);

        const applyCustomFont = (fontData: { name: string, url: string } | null, fontVarName: string) => {
            if (fontData) {
                const styleEl = document.createElement('style');
                styleEl.innerHTML = `
                    @font-face {
                        font-family: '${fontData.name}';
                        src: url(${fontData.url});
                    }
                `;
                document.head.appendChild(styleEl);
                 document.documentElement.style.setProperty(fontVarName, `"${fontData.name}"`);
            } else {
                 document.documentElement.style.removeProperty(fontVarName);
            }
        };

        if (settings.fontFamilyEn) {
            document.documentElement.style.setProperty('--font-family-en', settings.fontFamilyEn);
        }
         if (settings.customFontEn) {
            applyCustomFont(settings.customFontEn, '--font-family-en');
        }

        if (settings.fontFamilyFa) {
            document.documentElement.style.setProperty('--font-family-fa', settings.fontFamilyFa);
        }
         if (settings.customFontFa) {
            applyCustomFont(settings.customFontFa, '--font-family-fa');
        }


        if (settings.fontSize) {
            document.documentElement.style.setProperty('--font-size', `${settings.fontSize}%`);
        }
        if (settings.fontColor) {
            document.documentElement.style.setProperty('--font-color', settings.fontColor);
        }
    }

  }, []);


  React.useEffect(() => {
    if (isClient) {
      document.documentElement.lang = language;
      if (language === 'fa') {
        document.body.classList.add('font-vazir');
      } else {
        document.body.classList.remove('font-vazir');
      }
    }
  }, [language, isClient]);

  if (!isClient) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Building className="h-10 w-10 animate-pulse text-muted-foreground" />
                <p className="text-muted-foreground">Loading Dashboard...</p> 
            </div>
        </div>
    );
  }


  return <>{children}</>;
}


function CustomSidebarTrigger() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const { t } = useLanguage();

  if (isMobile) return null;

  return (
    <Button variant="ghost" className="w-full justify-start" onClick={toggleSidebar}>
      {state === 'expanded' ? <PanelLeftClose /> : <PanelLeft />}
      <span className="group-data-[collapsible=icon]:hidden">{t('sidebar.collapse')}</span>
    </Button>
  );
}


function DashboardLayoutComponent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter();
  const isActive = (path: string) => pathname === path;
  const { t } = useLanguage();
  
  const [appearanceSettings, setAppearanceSettings] = React.useState<AppearanceSettings>({
      siteName: 'ContractWise',
      loginTitle: '',
      loginSubtitle: '',
      logo: null,
      primaryColor: '',
      fontFamilyEn: 'Inter',
      fontFamilyFa: 'Vazirmatn',
      fontSize: 100,
      fontColor: '#000000',
      customFontEn: null,
      customFontFa: null,
      calendarSystem: 'gregorian',
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
              <SidebarMenuButton asChild isActive={isActive("/dashboard")} tooltip={t('sidebar.dashboard')}>
                <Link href="/dashboard">
                  <Home />
                  <span className="group-data-[collapsible=icon]:hidden">{t('sidebar.dashboard')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/dashboard/contracts")}
                tooltip={t('sidebar.contracts')}
              >
                <Link href="/dashboard/contracts">
                  <FileText />
                  <span className="group-data-[collapsible=icon]:hidden">{t('sidebar.contracts')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/dashboard/tasks")}
                 tooltip={t('sidebar.tasks')}
              >
                <Link href="/dashboard/tasks">
                  <ClipboardCheck />
                  <span className="group-data-[collapsible=icon]:hidden">{t('sidebar.tasks')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {user.role === 'super-admin' && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/dashboard/users")}
                    tooltip={t('sidebar.users')}
                  >
                    <Link href="/dashboard/users">
                      <Users />
                      <span className="group-data-[collapsible=icon]:hidden">{t('sidebar.users')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/dashboard/units")}
                    tooltip={t('sidebar.units')}
                  >
                    <Link href="/dashboard/units">
                      <Building />
                      <span className="group-data-[collapsible=icon]:hidden">{t('sidebar.units')}</span>
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
                tooltip={t('sidebar.profile')}
                >
                <Link href="/dashboard/profile">
                    <UserIcon />
                    <span className="group-data-[collapsible=icon]:hidden">{t('sidebar.profile')}</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            
            {user.role === "super-admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/dashboard/settings")}
                    tooltip={t('sidebar.settings')}
                  >
                    <Link href="/dashboard/settings">
                      <Settings />
                      <span className="group-data-[collapsible=icon]:hidden">{t('sidebar.settings')}</span>
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
                      <SidebarMenuButton tooltip={t('sidebar.logout')}>
                          <LogOut />
                          <span className="group-data-[collapsible=icon]:hidden">{t('sidebar.logout')}</span>
                      </SidebarMenuButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                      <AlertDialogTitle>{t('logout_alert.title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                          {t('logout_alert.description')}
                      </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                      <AlertDialogCancel>{t('logout_alert.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLogout}>{t('logout_alert.confirm')}</AlertDialogAction>
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


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LanguageProvider>
        <CalendarProvider>
            <DashboardContent>
                <DashboardLayoutComponent>
                {children}
                </DashboardLayoutComponent>
            </DashboardContent>
        </CalendarProvider>
    </LanguageProvider>
  )
}
