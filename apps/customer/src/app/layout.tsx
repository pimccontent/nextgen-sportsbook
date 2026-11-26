import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { IBM_Plex_Mono, Manrope, Sora } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { BrandProvider } from "@/lib/brand-context";
import { OperatorProvider } from "@/lib/operator-context";
import { SlipProvider } from "@/lib/slip-context";
import { ThemeProvider } from "@/lib/theme-context";
import { CUSTOMER_BOOT_SCRIPT } from "@/lib/boot-script";
import { SiteHeader } from "@/components/SiteHeader";
import { BottomNavigation } from "@/components/BottomNavigation";
import { CustomerShell } from "@/components/CustomerShell";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CustomerMessaging } from "@/components/CustomerMessaging";
import { SupportChat } from "@/components/SupportChat";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["500", "600", "700", "800"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "NextGen Sportsbook",
  description: "Football betting",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f6" },
    { media: "(prefers-color-scheme: dark)", color: "#090a0c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="night"
      className={`${sora.variable} ${manrope.variable} ${plex.variable}`}
      suppressHydrationWarning
    >
      <body
        className="ng-atmosphere min-h-screen"
        style={
          {
            ["--ng-font-display"]: "var(--font-sora), Sora, Segoe UI, sans-serif",
            ["--ng-font-body"]: "var(--font-manrope), Manrope, Segoe UI, sans-serif",
            ["--ng-font-mono"]: "var(--font-plex), IBM Plex Mono, ui-monospace, monospace",
          } as CSSProperties
        }
      >
        <Script id="ng-boot" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: CUSTOMER_BOOT_SCRIPT }} />
        <ThemeProvider>
          <BrandProvider>
            <MaintenanceGate>
              <AuthProvider>
                <OperatorProvider>
                  <SlipProvider>
                    <SiteHeader />
                    <Suspense fallback={<main className="min-h-[40vh] px-4 py-8 text-sm text-[var(--ng-muted)]">Loading…</main>}>
                      <CustomerShell>{children}</CustomerShell>
                    </Suspense>
                    <BottomNavigation />
                    <CustomerMessaging />
                    <ActivityFeed />
                    <SupportChat />
                  </SlipProvider>
                </OperatorProvider>
              </AuthProvider>
            </MaintenanceGate>
          </BrandProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
