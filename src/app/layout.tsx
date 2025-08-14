
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster"
import { AppearanceSettings } from '@/lib/types';


// This function is illustrative. In a real app, you'd fetch this from a dynamic source
// or handle it in a client component after fetching from localStorage.
// Since this is a server component, we can't access localStorage directly.
// We will manage dynamic titles in a client component wrapper if needed.
export async function generateMetadata(): Promise<Metadata> {
  // For the purpose of this example, we assume a default.
  // A real implementation would involve a mechanism to get settings on the server.
  const siteName = "ContractWise";
  const description = 'Advanced Contract Management System';
  
  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: description,
  }
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
