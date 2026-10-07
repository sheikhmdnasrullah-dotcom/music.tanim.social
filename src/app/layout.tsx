import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { Providers } from "@/state/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
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

export default function RootLayout({ children }: React.PropsWithChildren<Record<string, unknown>>) {
  return (
    <html
      lang="en"
      className={cn(geistSans.variable, geistMono.variable, instrumentSerif.variable, "h-full antialiased")}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
