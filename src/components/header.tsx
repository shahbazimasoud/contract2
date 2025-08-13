
"use client"

import Link from "next/link"
import { Building, LogOut, PanelLeft, Settings, User } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SidebarTrigger, useSidebar } from "./ui/sidebar"
import { ModeToggle } from "./mode-toggle"
import type { User as UserType } from "@/lib/types"

const AUTH_USER_KEY = 'current_user';

interface HeaderProps {
  user: UserType
}

export function Header({ user }: HeaderProps) {
    const { isMobile } = useSidebar();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem(AUTH_USER_KEY);
        router.push('/login');
    }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex w-full items-center justify-between gap-4">
        <SidebarTrigger className="hidden md:flex" />
        <div className="flex items-center gap-4">
            <ModeToggle />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                variant="outline"
                size="icon"
                className="overflow-hidden rounded-full"
                >
                <Avatar>
                    <AvatarImage
                    src={user.avatar}
                    alt={user.name}
                    data-ai-hint="person avatar"
                    />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                <p>{user.name}</p>
                <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === 'super-admin' && (
                    <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
