import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Anvil.pr — Prompt Engineering",
  description: "Manage, version, and evaluate your prompts with Anvil.pr",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Top navigation bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl flex h-14 items-center px-6 gap-6">
            <Link
              href="/projects"
              className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
            >
              {/* Anvil icon */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M2 17h20v4H2z" />
                <path d="M16 8V4H8v4" />
                <path d="M4 17V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8" />
              </svg>
              <span>Anvil.pr</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm text-muted-foreground">
              <Link
                href="/projects"
                className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors"
              >
                Projects
              </Link>
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
