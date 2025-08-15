
"use client";

import * as React from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, Building, KeyRound, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { users as mockUsers } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import type { AppearanceSettings } from '@/lib/types';
// Note: We are NOT importing useLanguage here, so this page remains in the default language.

const APPEARANCE_SETTINGS_KEY = 'appearance-settings';
const AUTH_USER_KEY = 'current_user';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  // Using a static translation for the login page
  const t = (key: string, options?: { [key: string]: string | number }) => {
    const translations: Record<string, string> = {
        'login.title': 'Login',
        'login.header_desc': 'Enter your credentials to access your dashboard',
        'login.email_label': 'Email',
        'login.password_label': 'Password',
        'login.forgot_password': 'Forgot your password?',
        'login.remember_me': 'Remember me',
        'login.signin_button': 'Sign In',
        'login.demo_users_note': 'Use `super@contractwise.com` or `john.doe@contractwise.com`',
        'login.toast.success_title': 'Login Successful',
        'login.toast.success_desc': 'Welcome back, {{name}}!',
        'login.toast.failed_title': 'Login Failed',
        'login.toast.failed_desc': 'No user found with that email address.',
    };
    let translation = translations[key] || key;
     if (options) {
        Object.keys(options).forEach((k) => {
            const value = options[k];
            if (value !== undefined) {
                translation = translation.replace(new RegExp(`{{${k}}}`, 'g'), String(value));
            }
        });
    }
    return translation;
  };
  const [email, setEmail] = React.useState("");

  const [appearanceSettings, setAppearanceSettings] = React.useState<AppearanceSettings>({
    siteName: "ContractWise",
    loginTitle: "Welcome to ContractWise",
    loginSubtitle: "Your integrated solution for managing contracts efficiently and effectively.",
    logo: null,
    primaryColor: "231 48% 48%",
  });

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
      
      // Clear any existing user session on login page load
      localStorage.removeItem(AUTH_USER_KEY);
  }, []);

  React.useEffect(() => {
    if (appearanceSettings.siteName) {
      document.title = `${t('login.title')} | ${appearanceSettings.siteName}`;
    }
  }, [appearanceSettings.siteName, t]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (user) {
        // NOTE: In a real app, you would validate the password here.
        // For this demo, we'll just accept any password.
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        toast({
            title: t('login.toast.success_title'),
            description: t('login.toast.success_desc', { name: user.name }),
        });
        router.push("/dashboard");
    } else {
        toast({
            title: t('login.toast.failed_title'),
            description: t('login.toast.failed_desc'),
            variant: "destructive",
        });
    }
  };

  const backgroundStyle = { 
    background: 'hsl(var(--background))',
    backgroundImage: 'url(/login-splash.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
   };

  if (!isClient) {
    return null; // or a skeleton loader
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <Card className="mx-auto w-full max-w-md shadow-2xl">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                 {appearanceSettings.logo ? (
                    <Image src={appearanceSettings.logo} alt="Company Logo" width={40} height={40} className="h-10 w-10" />
                 ) : (
                    <Building className="h-10 w-10 text-primary" />
                 )}
              </div>
              <CardTitle className="text-3xl font-bold font-headline">{appearanceSettings.siteName}</CardTitle>
              <CardDescription>
                {t('login.header_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('login.email_label')}</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="admin@example.com" 
                      required 
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center">
                        <Label htmlFor="password">{t('login.password_label')}</Label>
                        <Link href="#" className="ml-auto inline-block text-sm underline">
                            {t('login.forgot_password')}
                        </Link>
                    </div>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input id="password" type="password" required className="pl-10" defaultValue="password" />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="remember-me" />
                    <Label htmlFor="remember-me" className="text-sm font-normal">{t('login.remember_me')}</Label>
                </div>
                <Button type="submit" className="w-full !mt-8" size="lg">
                  <LogIn className="mr-2 h-5 w-5" />
                  {t('login.signin_button')}
                </Button>
              </form>
            </CardContent>
             <CardFooter className="text-center text-sm text-muted-foreground justify-center">
                <p>{t('login.demo_users_note')}</p>
             </CardFooter>
          </Card>
      </div>
      <div className="hidden bg-muted lg:block relative" style={backgroundStyle}>
        <div className="absolute inset-0 bg-primary/60" />
        <div className="absolute inset-0 flex items-center justify-center text-white text-center p-12">
          <div>
            <h2 className="text-5xl font-bold font-headline mb-4">
              {appearanceSettings.loginTitle}
            </h2>
            <p className="text-xl opacity-90">
              {appearanceSettings.loginSubtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
