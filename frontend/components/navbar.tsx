"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Sparkles } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" }
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090b12]/80 backdrop-blur">
      <div className="mx-auto flex w-[min(1200px,94vw)] items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 p-2 text-black">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>SmartQueue</span>
        </Link>
        <nav className="flex items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "rounded-full px-4 py-2 text-sm transition-all",
                pathname === link.href
                  ? "bg-cyan-400/20 text-cyan-200"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
