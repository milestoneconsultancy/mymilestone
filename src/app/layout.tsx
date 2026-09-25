import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { LoadingProvider } from "@/components/layout/TopProgressBar";
import { SplashScreen } from "@/components/layout/SplashScreen";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Milestone ERP",
  description: "Enterprise recruitment, interview tracking, and offer letter automation",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A2E5A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased min-h-screen bg-[#F3F5F9] text-gray-900 selection:bg-[#F5741A] selection:text-white">
        <LoadingProvider>
          <AuthProvider>
            <SplashScreen />
            {children}
          </AuthProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}
