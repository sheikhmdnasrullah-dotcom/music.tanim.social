import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/state/Providers";
import { AppNav } from "@/components/ui/AppNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Before I Learned the Words — Practice Studio",
  description:
    "An honest practice studio for one song: guide vocals, line-by-line singing, and a beginner-first guitar path (capo 2).",
  metadataBase: new URL("https://music.tanim.social"),
  openGraph: {
    title: "Before I Learned the Words — Practice Studio",
    description: "Learn this song by line and by chord, with progress that means something.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: React.PropsWithChildren<{}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <AppNav />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-4">
            <div className="max-w-6xl mx-auto px-4 text-center text-xs text-muted-foreground">
              Personal practice studio — guide vocals, melody contours, and a beginner guitar
              path. Progress is stored only on this device.
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
