import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AgentShell } from "@/components/AgentShell";

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

export const metadata: Metadata = {
  title: "NextGen Agent",
  description: "Agent referral portal",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="night"
      suppressHydrationWarning
      className={`${sora.variable} ${manrope.variable}`}
    >
      <body className="ng-atmosphere min-h-screen font-body">
        <ThemeProvider>
          <AuthProvider>
            <AgentShell>{children}</AgentShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
