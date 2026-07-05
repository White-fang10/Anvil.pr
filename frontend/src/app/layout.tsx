import type { Metadata } from "next";
import { Space_Grotesk, Cinzel } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${spaceGrotesk.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground relative">
        {/* Background logo texture */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center opacity-[0.02]">
          <Image
            src="/logo.png"
            alt=""
            width={800}
            height={800}
            className="object-contain transform -rotate-12 scale-150 blur-[2px]"
            priority
          />
        </div>

        {/* Top navigation bar — glass nav */}
        <header className="glass-nav sticky top-0 z-40">
          <div className="mx-auto max-w-7xl flex h-16 items-center px-6 gap-6">
            <Link
              href="/projects"
              className="flex items-center gap-3 group"
            >
              <div className="relative w-8 h-8 flex items-center justify-center logo-float logo-glow rounded-md">
                <Image
                  src="/logo.png"
                  alt="Anvil.pr logo"
                  width={32}
                  height={32}
                  className="object-contain rounded-md transition-opacity duration-300"
                  priority
                />
              </div>
              <span
                className="font-display text-base tracking-widest text-white/80 group-hover:text-white transition-colors duration-200 uppercase"
                style={{ fontFamily: "var(--font-cinzel), serif", letterSpacing: "0.15em" }}
              >
                Anvil<span className="text-white/40">.pr</span>
              </span>
            </Link>

            <div className="h-5 w-px bg-white/10" />

            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/projects"
                className="px-4 py-1.5 rounded-full text-white/50 hover:text-white/90 hover:bg-white/06 transition-all duration-200 tracking-wide text-xs uppercase font-medium"
              >
                Projects
              </Link>
            </nav>

            {/* Right decorative element */}
            <div className="ml-auto flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500/60 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <span className="text-xs text-white/30 tracking-widest uppercase font-medium">Live</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-10 animate-page-in">
          {children}
        </main>
      </body>
    </html>
  );
}
