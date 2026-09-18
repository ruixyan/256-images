import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const fraktionSans = localFont({
  src: [
    {
      path: "./fonts/PPFraktionSans-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/PPFraktionSans-LightItalic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/PPFraktionSans-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/PPFraktionSans-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-fraktion-sans",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraktionSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}