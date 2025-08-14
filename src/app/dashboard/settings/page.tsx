
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from "@/components/page-header"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { AppearanceSettings } from "@/lib/types"

const APPEARANCE_SETTINGS_KEY = 'appearance-settings';
const defaultColors = [
    { name: 'Indigo', value: '231 48% 48%' },
    { name: 'Blue', value: '221 83% 53%' },
    { name: 'Green', value: '142 76% 36%' },
    { name: 'Orange', value: '25 95% 53%' },
    { name: 'Rose', value: '346 89% 60%' },
];


export default function SettingsPage() {
    const { toast } = useToast();

    const [settings, setSettings] = React.useState<AppearanceSettings>({
        siteName: "ContractWise",
        loginTitle: "Welcome to ContractWise",
        loginSubtitle: "Your integrated solution for managing contracts efficiently and effectively.",
        logo: null,
        primaryColor: "231 48% 48%", // Default to Indigo
    });
    const [logoFile, setLogoFile] = React.useState<File | null>(null);
    const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

    React.useEffect(() => {
        const savedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            setSettings(parsedSettings);
            if (parsedSettings.logo) {
                setLogoPreview(parsedSettings.logo);
            }
             if (parsedSettings.primaryColor) {
                document.documentElement.style.setProperty('--primary-hsl', parsedSettings.primaryColor);
            }
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({ ...prev, [id]: value }));
    };
    
    const handleColorChange = (value: string) => {
        setSettings(prev => ({ ...prev, primaryColor: value }));
        document.documentElement.style.setProperty('--primary-hsl', value);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAppearanceSave = () => {
        const saveSettings = (logoDataUrl: string | null) => {
             const finalSettings = { 
                ...settings,
                logo: logoDataUrl,
             };
            localStorage.setItem(APPEARANCE_SETTINGS_KEY, JSON.stringify(finalSettings));
            toast({
                title: "Settings Saved",
                description: "Your appearance settings have been updated.",
            });
             // Force a reload of the page to update all components
            window.location.reload();
        }

        if (logoFile) {
             const reader = new FileReader();
             reader.onloadend = () => {
                saveSettings(reader.result as string);
            };
            reader.readAsDataURL(logoFile);
        } else {
             saveSettings(settings.logo || null);
        }
    };


  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <PageHeaderHeading>Settings</PageHeaderHeading>
        <PageHeaderDescription>
          Manage your system settings. This page is only visible to Super Admins.
        </PageHeaderDescription>
      </PageHeader>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="mail">Mail Server</TabsTrigger>
          <TabsTrigger value="ad">Active Directory</TabsTrigger>
          <TabsTrigger value="sms">SMS Panel</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Branding</CardTitle>
              <CardDescription>
                Customize the look, feel, and branding of the entire application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Site-wide Settings */}
              <div className="space-y-6 p-6 border rounded-lg">
                <h3 className="text-lg font-medium">Global Branding</h3>
                 <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input id="siteName" value={settings.siteName} onChange={handleInputChange} />
                    <p className="text-sm text-muted-foreground">This name appears in the browser tab and sidebar header.</p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="logo">Application Logo</Label>
                    <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
                    {logoPreview && <img src={logoPreview} alt="Logo Preview" className="h-16 mt-2 rounded-md object-contain bg-muted p-1" />}
                    <p className="text-sm text-muted-foreground">Used on the login page and in the sidebar. Recommended: square, max 512x512px.</p>
                </div>
              </div>

               {/* Login Page Settings */}
              <div className="space-y-6 p-6 border rounded-lg">
                <h3 className="text-lg font-medium">Login Page Customization</h3>
                 <div className="space-y-2">
                    <Label htmlFor="loginTitle">Login Page Title</Label>
                    <Input id="loginTitle" value={settings.loginTitle} onChange={handleInputChange} />
                    <p className="text-sm text-muted-foreground">The main headline on the login screen's splash panel.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="loginSubtitle">Login Page Subtitle</Label>
                    <Textarea id="loginSubtitle" value={settings.loginSubtitle} onChange={handleInputChange} />
                    <p className="text-sm text-muted-foreground">The descriptive text below the main headline.</p>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="space-y-6 p-6 border rounded-lg">
                 <h3 className="text-lg font-medium">Theme & Colors</h3>
                <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <p className="text-sm text-muted-foreground pb-2">Sets the main color for buttons, links, and highlights across the app.</p>
                    <div className="flex flex-wrap items-center gap-2">
                        {defaultColors.map(color => (
                            <button key={color.name} type="button" onClick={() => handleColorChange(color.value)} className={cn("h-10 w-20 rounded-md border-2 flex items-center justify-center text-sm font-medium", settings.primaryColor === color.value ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-muted')}>
                                {color.name}
                            </button>
                        ))}
                    </div>
                </div>
              </div>

            </CardContent>
            <CardFooter>
              <Button onClick={handleAppearanceSave}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="mail">
          <Card>
            <CardHeader>
              <CardTitle>Mail Server (SMTP)</CardTitle>
              <CardDescription>
                Configure the SMTP server for sending email notifications and reminders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input id="smtp-host" placeholder="smtp.example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input id="smtp-port" placeholder="587" type="number" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Username</Label>
                <Input id="smtp-user" placeholder="user@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">Password</Label>
                <Input id="smtp-pass" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save & Test Connection</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="ad">
          <Card>
            <CardHeader>
              <CardTitle>Active Directory</CardTitle>
              <CardDescription>
                Configure Active Directory integration for user and group synchronization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center space-x-2">
                <Switch id="ad-enabled" />
                <Label htmlFor="ad-enabled">Enable Active Directory Integration</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-host">Server URL</Label>
                <Input id="ad-host" placeholder="ldaps://ad.example.com" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="ad-basedn">Base DN</Label>
                <Input id="ad-basedn" placeholder="dc=example,dc=com" />
                 <p className="text-sm text-muted-foreground">The starting point for directory searches.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-user">Bind DN / Username</Label>
                <Input id="ad-user" placeholder="cn=admin,dc=example,dc=com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-pass">Bind Password</Label>
                <Input id="ad-pass" type="password" />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button>Save & Sync</Button>
              <Button variant="outline">Test Connection</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
            <Card>
                <CardHeader>
                    <CardTitle>SMS Panel</CardTitle>
                    <CardDescription>
                        Configure your SMS provider to send notifications.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="sms-api-url">Provider Name / API URL</Label>
                        <Input id="sms-api-url" placeholder="e.g., KavehNegar or https://api.smsprovider.com/v1/send" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sms-apikey">API Key</Label>
                        <Input id="sms-apikey" type="password" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sms-sender">Sender Number</Label>
                        <Input id="sms-sender" placeholder="e.g., 10008000" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button>Save SMS Settings</Button>
                </CardFooter>
            </Card>
        </TabsContent>


        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage security settings for the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (seconds)</Label>
                <Input id="session-timeout" type="number" defaultValue="3600" />
                <p className="text-sm text-muted-foreground">
                    Time in seconds before a user is automatically logged out due to inactivity.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="my-password">Change Your Password</Label>
                <Input id="my-password" type="password" placeholder="New Password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Security Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
