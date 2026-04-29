import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AppChrome from "@/components/AppChrome";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { CreditsProvider } from "@/components/providers/CreditsProvider";
import { RuntimeDebugProbe } from "@/components/RuntimeDebugProbe";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AutomateCraft — AI-Powered Business Automation",
    template: "%s | AutomateCraft",
  },
  description:
    "Build AI automations for your business in minutes. Describe workflows in plain English, connect your apps, and deploy — no code required.",
  metadataBase: new URL("https://automatecraft.ai"),
  openGraph: {
    type: "website",
    siteName: "AutomateCraft",
    title: "AutomateCraft — AI-Powered Business Automation",
    description:
      "Build AI automations for your business in minutes. No code required.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutomateCraft — AI-Powered Business Automation",
    description:
      "Build AI automations for your business in minutes. No code required.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999999] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg">
          Skip to content
        </a>
        <SupabaseProvider>
          <CreditsProvider>
            {process.env.NODE_ENV === "development" && <RuntimeDebugProbe />}
            <AppChrome navbar={<Navbar />} footer={<Footer />}>
              {children}
            </AppChrome>
          </CreditsProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
