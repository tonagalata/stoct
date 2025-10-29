import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PasscodeProvider } from "@/components/PasscodeProvider";

export const metadata: Metadata = {
  title: "Stoct - Card Manager",
  description: "A simple card manager for storing card information locally",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stoct",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Stoct" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/logo.png" />
      </head>
        <body>
          <ServiceWorkerProvider />
          <ThemeProvider>
            <ToastProvider>
              <PasscodeProvider>
                {children}
              </PasscodeProvider>
            </ToastProvider>
          </ThemeProvider>
        </body>
    </html>
  );
}
