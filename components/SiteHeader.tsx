"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NavFavorites from "@/components/NavFavorites";
import NavSearch from "@/components/NavSearch";
import { POPOVER_EVENT, closeOthers } from "@/lib/popover";

const LINKS = [
  { href: "/", label: "Laptops" },
  { href: "/bajadas", label: "Bajadas" },
  { href: "/favoritos", label: "Favoritos" },
  { href: "/comparisons", label: "Comparaciones" },
  { href: "/sources", label: "Tiendas" },
  { href: "/import", label: "Importar" },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-on-accent">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M4 17 L10 11 L14 15 L20 7" />
        </svg>
      </span>
      <span>
        Scout<span className="text-gradient">OS</span>
      </span>
    </Link>
  );
}

/** Sticky NavBar: page links, live search, saved favorites with a count, and a menu on small screens. */
export default function SiteHeader() {
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  // Remember the path the menu was opened on: navigating changes the path, so the menu closes without an effect.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuPath(null);
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== "menu") setMenuPath(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(POPOVER_EVENT, onOther);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(POPOVER_EVENT, onOther);
    };
  }, []);

  function toggleMenu() {
    if (menuOpen) return setMenuPath(null);
    closeOthers("menu");
    setMenuPath(pathname);
  }

  return (
    <header className={`site-header sticky top-0 z-40 ${solid ? "site-header--solid" : ""}`}>
      <nav aria-label="Principal" className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-4">
          <Logo />
          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="nav-link text-sm" aria-current={isActive(pathname, l.href) ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="ml-auto hidden w-64 md:block xl:w-80">
            <NavSearch name="desktop" />
          </div>
          <NavFavorites />
          <button
            type="button"
            className="btn-ghost grid size-10 place-items-center p-0 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={toggleMenu}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-nav" className="menu-enter space-y-3 border-t border-line pb-4 pt-3 lg:hidden">
            <div className="md:hidden">
              <NavSearch name="mobile" />
            </div>
            <ul className="grid gap-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setMenuPath(null)}
                    className="block rounded-lg px-3 py-2.5 text-sm hover:bg-surface-2"
                    aria-current={isActive(pathname, l.href) ? "page" : undefined}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
