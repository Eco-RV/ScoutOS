import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ScoutOS",
  description: "Rastreador de precios de laptops en tiendas de Costa Rica",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="border-b border-line bg-surface">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Scout<span className="text-accent">OS</span>
            </Link>
            <Link href="/" className="text-sm text-muted hover:text-foreground">Laptops</Link>
            <Link href="/sources" className="text-sm text-muted hover:text-foreground">Links</Link>
            <Link href="/import" className="text-sm text-muted hover:text-foreground">Importar</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
