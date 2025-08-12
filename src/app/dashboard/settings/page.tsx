
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

const APPEARANCE_SETTINGS_KEY = 'appearance-settings';

export default function SettingsPage() {
    const { toast } = useToast();

    // State for Appearance Tab
    const [welcomeText, setWelcomeText] = React.useState("Welcome to ContractWise");
    const [bgType, setBgType] = React.useState<"gradient" | "image">("image");
    const [gradientStart, setGradientStart] = React.useState("#3F51B5");
    const [gradientEnd, setGradientEnd] = React.useState("#2196F3");
    const [bgImage, setBgImage] = React.useState<File | null>(null);
    const [logo, setLogo] = React.useState<File | null>(null);
    const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

    React.useEffect(() => {
        const savedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            setWelcomeText(settings.welcomeText || "Welcome to ContractWise");
            setBgType(settings.bgType || "image");
            setGradientStart(settings.gradientStart || "#3F51B5");
            setGradientEnd(settings.gradientEnd || "#2196F3");
            if (settings.logo) {
                setLogoPreview(settings.logo);
            }
        }
    }, []);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAppearanceSave = () => {
        const reader = new FileReader();
        const saveSettings = (logoDataUrl: string | null) => {
            const settings = { 
                welcomeText, 
                bgType, 
                gradientStart, 
                gradientEnd,
                logo: logoDataUrl,
             };
            localStorage.setItem(APPEARANCE_SETTINGS_KEY, JSON.stringify(settings));
            toast({
                title: "Settings Saved",
                description: "Your appearance settings have been updated.",
            });
             // Force a reload of the page to update the sidebar logo
            window.location.reload();
        }

        if (logo) {
             reader.onloadend = () => {
                saveSettings(reader.result as string);
            };
            reader.readAsDataURL(logo);
        } else {
             const savedSettings = JSON.parse(localStorage.getItem(APPEARANCE_SETTINGS_KEY) || "{}");
             saveSettings(savedSettings.logo || null);
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
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application, including the login page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="space-y-2">
                <Label htmlFor="logo">Application Logo</Label>
                <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
                {logoPreview && <img src={logoPreview} alt="Logo Preview" className="h-16 w-16 mt-2 rounded-md object-contain" />}
                <p className="text-sm text-muted-foreground">Upload your company logo (Recommended: square, max 512x512px).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcome-text">Login Page Welcome Text</Label>
                <Textarea id="welcome-text" value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} />
                 <p className="text-sm text-muted-foreground">This text appears on the right side of the login screen.</p>
              </div>
              <div className="space-y-2">
                <Label>Login Page Background</Label>
                <Select value={bgType} onValueChange={(value: "gradient" | "image") => setBgType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select background type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="gradient-start">Gradient Start Color</Label>
                    <Input id="gradient-start" type="color" value={gradientStart} onChange={(e) => setGradientStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="gradient-end">Gradient End Color</Label>
                    <Input id="gradient-end" type="color" value={gradientEnd} onChange={(e) => setGradientEnd(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                 <Label htmlFor="bg-image">Background Image</Label>
                 <Input id="bg-image" type="file" disabled={bgType !== 'image'} onChange={(e) => setBgImage(e.target.files ? e.target.files[0] : null)} />
                 <p className="text-sm text-muted-foreground">Upload an image for the login screen background (if Image is selected).</p>
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
