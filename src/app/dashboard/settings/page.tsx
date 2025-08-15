
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
import { useLanguage } from "@/context/language-context"
import { Slider } from "@/components/ui/slider"

const APPEARANCE_SETTINGS_KEY = 'appearance-settings';
const defaultColors = [
    { name: 'Indigo', value: '231 48% 48%' },
    { name: 'Blue', value: '221 83% 53%' },
    { name: 'Green', value: '142 76% 36%' },
    { name: 'Orange', value: '25 95% 53%' },
    { name: 'Rose', value: '346 89% 60%' },
];

const defaultFonts = {
    en: [
        { name: "Inter", value: "Inter, sans-serif" },
        { name: "Roboto", value: "Roboto, sans-serif" },
        { name: "Open Sans", value: "'Open Sans', sans-serif" },
        { name: "Lato", value: "Lato, sans-serif" },
    ],
    fa: [
        { name: "Vazirmatn", value: "Vazirmatn, sans-serif" },
        { name: "Estedad", value: "Estedad, sans-serif" },
    ],
};


export default function SettingsPage() {
    const { t, language, setLanguage } = useLanguage();
    const { toast } = useToast();

    const [settings, setSettings] = React.useState<AppearanceSettings>({
        siteName: "ContractWise",
        loginTitle: "Welcome to ContractWise",
        loginSubtitle: "Your integrated solution for managing contracts efficiently and effectively.",
        logo: null,
        primaryColor: "231 48% 48%",
        fontFamilyEn: 'Inter, sans-serif',
        fontFamilyFa: 'Vazirmatn, sans-serif',
        fontSize: 100,
        fontColor: '#000000'
    });
    const [logoFile, setLogoFile] = React.useState<File | null>(null);
    const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

    React.useEffect(() => {
        const savedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            setSettings(prev => ({ ...prev, ...parsedSettings }));
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
                title: t('settings.toast_settings_saved_title'),
                description: t('settings.toast_appearance_saved_desc'),
            });
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
        <PageHeaderHeading>{t('settings.title')}</PageHeaderHeading>
        <PageHeaderDescription>
          {t('settings.description')}
        </PageHeaderDescription>
      </PageHeader>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="appearance">{t('settings.tabs.appearance')}</TabsTrigger>
          <TabsTrigger value="language">{t('settings.tabs.language')}</TabsTrigger>
          <TabsTrigger value="mail">{t('settings.tabs.mail')}</TabsTrigger>
          <TabsTrigger value="ad">{t('settings.tabs.ad')}</TabsTrigger>
          <TabsTrigger value="sms">{t('settings.tabs.sms')}</TabsTrigger>
          <TabsTrigger value="security">{t('settings.tabs.security')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appearance.title')}</CardTitle>
              <CardDescription>
                {t('settings.appearance.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Site-wide Settings */}
              <div className="space-y-6 p-6 border rounded-lg">
                <h3 className="text-lg font-medium">{t('settings.appearance.global_branding_title')}</h3>
                 <div className="space-y-2">
                    <Label htmlFor="siteName">{t('settings.appearance.site_name_label')}</Label>
                    <Input id="siteName" value={settings.siteName} onChange={handleInputChange} />
                    <p className="text-sm text-muted-foreground">{t('settings.appearance.site_name_desc')}</p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="logo">{t('settings.appearance.app_logo_label')}</Label>
                    <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
                    {logoPreview && <img src={logoPreview} alt="Logo Preview" className="h-16 mt-2 rounded-md object-contain bg-muted p-1" />}
                    <p className="text-sm text-muted-foreground">{t('settings.appearance.app_logo_desc')}</p>
                </div>
              </div>

               {/* Login Page Settings */}
              <div className="space-y-6 p-6 border rounded-lg">
                <h3 className="text-lg font-medium">{t('settings.appearance.login_page_title')}</h3>
                 <div className="space-y-2">
                    <Label htmlFor="loginTitle">{t('settings.appearance.login_title_label')}</Label>
                    <Input id="loginTitle" value={settings.loginTitle} onChange={handleInputChange} />
                    <p className="text-sm text-muted-foreground">{t('settings.appearance.login_title_desc')}</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="loginSubtitle">{t('settings.appearance.login_subtitle_label')}</Label>
                    <Textarea id="loginSubtitle" value={settings.loginSubtitle} onChange={handleInputChange} />
                    <p className="text-sm text-muted-foreground">{t('settings.appearance.login_subtitle_desc')}</p>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="space-y-6 p-6 border rounded-lg">
                 <h3 className="text-lg font-medium">{t('settings.appearance.theme_colors_title')}</h3>
                <div className="space-y-2">
                    <Label>{t('settings.appearance.primary_color_label')}</Label>
                    <p className="text-sm text-muted-foreground pb-2">{t('settings.appearance.primary_color_desc')}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        {defaultColors.map(color => (
                            <button key={color.name} type="button" onClick={() => handleColorChange(color.value)} className={cn("h-10 w-20 rounded-md border-2 flex items-center justify-center text-sm font-medium", settings.primaryColor === color.value ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-muted')}>
                                {t(`settings.colors.${color.name.toLowerCase()}`)}
                            </button>
                        ))}
                    </div>
                </div>
              </div>
              
              {/* Font Settings */}
                <div className="space-y-6 p-6 border rounded-lg">
                    <h3 className="text-lg font-medium">{t('settings.font.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('settings.font.description')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="font-en">{t('settings.font.en_font_label')}</Label>
                            <Select value={settings.fontFamilyEn} onValueChange={(value) => setSettings(p => ({...p, fontFamilyEn: value}))}>
                                <SelectTrigger id="font-en"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {defaultFonts.en.map(font => <SelectItem key={font.name} value={font.value}>{font.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="font-fa">{t('settings.font.fa_font_label')}</Label>
                            <Select value={settings.fontFamilyFa} onValueChange={(value) => setSettings(p => ({...p, fontFamilyFa: value}))}>
                                <SelectTrigger id="font-fa"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {defaultFonts.fa.map(font => <SelectItem key={font.name} value={font.value}>{font.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="font-size">{t('settings.font.size_label')} ({settings.fontSize}%)</Label>
                        <Slider
                            id="font-size"
                            min={80}
                            max={120}
                            step={5}
                            value={[settings.fontSize]}
                            onValueChange={(value) => setSettings(p => ({...p, fontSize: value[0]}))}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="font-color">{t('settings.font.color_label')}</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="font-color"
                                type="color"
                                value={settings.fontColor}
                                onChange={(e) => setSettings(p => ({...p, fontColor: e.target.value}))}
                                className="w-16 h-10 p-1"
                            />
                            <span className="text-sm text-muted-foreground">{settings.fontColor}</span>
                        </div>
                    </div>
                </div>

            </CardContent>
            <CardFooter>
              <Button onClick={handleAppearanceSave}>{t('settings.save_changes_button')}</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="language">
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.language.title')}</CardTitle>
                    <CardDescription>{t('settings.language.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full max-w-xs">
                        <Label htmlFor="language-select">{t('settings.language.select_label')}</Label>
                        <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'fa')}>
                            <SelectTrigger id="language-select" className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="fa">فارسی</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="mail">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.mail.title')}</CardTitle>
              <CardDescription>
                {t('settings.mail.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">{t('settings.mail.smtp_host_label')}</Label>
                  <Input id="smtp-host" placeholder="smtp.example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">{t('settings.mail.smtp_port_label')}</Label>
                  <Input id="smtp-port" placeholder="587" type="number" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">{t('settings.mail.username_label')}</Label>
                <Input id="smtp-user" placeholder="user@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">{t('settings.mail.password_label')}</Label>
                <Input id="smtp-pass" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>{t('settings.save_test_button')}</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="ad">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.ad.title')}</CardTitle>
              <CardDescription>
                {t('settings.ad.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center space-x-2">
                <Switch id="ad-enabled" />
                <Label htmlFor="ad-enabled">{t('settings.ad.enable_label')}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-host">{t('settings.ad.server_url_label')}</Label>
                <Input id="ad-host" placeholder="ldaps://ad.example.com" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="ad-basedn">{t('settings.ad.base_dn_label')}</Label>
                <Input id="ad-basedn" placeholder="dc=example,dc=com" />
                 <p className="text-sm text-muted-foreground">{t('settings.ad.base_dn_desc')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-user">{t('settings.ad.bind_dn_label')}</Label>
                <Input id="ad-user" placeholder="cn=admin,dc=example,dc=com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-pass">{t('settings.ad.bind_password_label')}</Label>
                <Input id="ad-pass" type="password" />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button>{t('settings.ad.save_sync_button')}</Button>
              <Button variant="outline">{t('settings.ad.test_connection_button')}</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.sms.title')}</CardTitle>
                    <CardDescription>
                        {t('settings.sms.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="sms-api-url">{t('settings.sms.provider_label')}</Label>
                        <Input id="sms-api-url" placeholder="e.g., KavehNegar or https://api.smsprovider.com/v1/send" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sms-apikey">{t('settings.sms.api_key_label')}</Label>
                        <Input id="sms-apikey" type="password" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sms-sender">{t('settings.sms.sender_number_label')}</Label>
                        <Input id="sms-sender" placeholder="e.g., 10008000" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button>{t('settings.sms.save_button')}</Button>
                </CardFooter>
            </Card>
        </TabsContent>


        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.security.title')}</CardTitle>
              <CardDescription>{t('settings.security.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">{t('settings.security.session_timeout_label')}</Label>
                <Input id="session-timeout" type="number" defaultValue="3600" />
                <p className="text-sm text-muted-foreground">
                    {t('settings.security.session_timeout_desc')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="my-password">{t('settings.security.change_password_label')}</Label>
                <Input id="my-password" type="password" placeholder={t('settings.security.new_password_placeholder')} />
              </div>
            </CardContent>
            <CardFooter>
              <Button>{t('settings.security.save_button')}</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
    
