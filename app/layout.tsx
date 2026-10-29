import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "StudPrep — AI-Powered CBT Exam Preparation",
    template: "%s | StudPrep",
  },
  description:
    "Prepare for JAMB, WAEC, NECO, ICAN and more with AI-generated practice exams tailored to your study materials.",
  keywords: ["CBT", "exam preparation", "JAMB", "WAEC", "NECO", "AI", "study"],
  authors: [{ name: "StudPrep" }],
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "StudPrep",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
