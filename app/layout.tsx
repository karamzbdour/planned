import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { Toaster } from "@/components/ui/toaster";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Planned — Home education, done for you",
    template: "%s | Planned",
  },
  description:
    "The AI-powered homeschool planning app for UK families. Generate personalised lesson plans, track progress, celebrate milestones with Bloom, and keep a beautiful learning journal.",
  keywords: [
    "homeschool",
    "home education",
    "UK homeschool",
    "lesson planning",
    "AI lesson plans",
    "homeschool curriculum",
    "homeschool planner",
    "British National Curriculum",
    "Montessori",
    "unschooling",
  ],
  authors: [{ name: "Planned" }],
  creator: "Planned",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://getplanned.app"
  ),
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "Planned — Home education, done for you",
    description:
      "AI-powered homeschool planning for UK families. Personalised lesson plans, progress tracking, and a beautiful learning journal.",
    siteName: "Planned",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planned — Home education, done for you",
    description:
      "AI-powered homeschool planning for UK families. Personalised lesson plans, progress tracking, and a beautiful learning journal.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${fraunces.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
