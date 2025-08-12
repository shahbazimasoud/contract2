
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const APPEARANCE_SETTINGS_KEY = 'appearance-settings';

export default function LoginPage() {
  const router = useRouter();
  
  const [loginSplashProps, setLoginSplashProps] = React.useState({
    welcomeText: "Welcome to ContractWise",
    subText: "Your integrated solution for managing contracts efficiently and effectively.",
    bgType: "image" as "gradient" | "image",
    bgValue: "/login-splash.jpg", // Default image
    gradientStart: "#3F51B5",
    gradientEnd: "#2196F3",
    logo: null as string | null,
  });
  
  React.useEffect(() => {
      const savedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
      if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setLoginSplashProps(prev => ({
              ...prev,
              welcomeText: settings.welcomeText || prev.welcomeText,
              bgType: settings.bgType || prev.bgType,
              gradientStart: settings.gradientStart || prev.gradientStart,
              gradientEnd: settings.gradientEnd || prev.gradientEnd,
              logo: settings.logo || null,
          }));
      }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  const backgroundStyle = loginSplashProps.bgType === 'gradient' 
    ? { background: `linear-gradient(to bottom right, ${loginSplashProps.gradientStart}, ${loginSplashProps.gradientEnd})` }
    : {};

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <Card className="mx-auto w-full max-w-md shadow-2xl">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                 {loginSplashProps.logo ? (
                    <Image src={loginSplashProps.logo} alt="Company Logo" width={40} height={40} className="h-10 w-10" />
                 ) : (
                    <Building className="h-10 w-10 text-primary" />
                 )}
              </div>
              <CardTitle className="text-3xl font-bold font-headline">ContractWise</CardTitle>
              <CardDescription>
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="admin@example.com" required className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                        <Link href="#" className="ml-auto inline-block text-sm underline">
                            Forgot your password?
                        </Link>
                    </div>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input id="password" type="password" required className="pl-10" defaultValue="password" />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="remember-me" />
                    <Label htmlFor="remember-me" className="text-sm font-normal">Remember me</Label>
                </div>
                <Button type="submit" className="w-full !mt-8" size="lg">
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
      </div>
      <div className="hidden bg-muted lg:block relative" style={backgroundStyle}>
        {loginSplashProps.bgType === 'image' && (
          <Image
            src={loginSplashProps.bgValue}
            alt="Login splash image"
            width="1920"
            height="1080"
            className="h-full w-full object-cover"
            data-ai-hint="office building"
          />
        )}
        <div className="absolute inset-0 bg-primary/60" />
        <div className="absolute inset-0 flex items-center justify-center text-white text-center p-12">
          <div>
            <h2 className="text-5xl font-bold font-headline mb-4">
              {loginSplashProps.welcomeText}
            </h2>
            <p className="text-xl opacity-90">
              {loginSplashProps.subText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
