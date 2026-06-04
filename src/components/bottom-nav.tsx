"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  CalendarDays,
  ChefHat,
  Wallet,
  FolderKanban,
  ShoppingCart,
} from "lucide-react";

const TABS = [
  { href: "/board",    icon: LayoutGrid,   label: "Inicio"   },
  { href: "/calendar", icon: CalendarDays, label: "Agenda"   },
  { href: "/recetas",  icon: ChefHat,      label: "Recetas"  },
  { href: "/compras",  icon: ShoppingCart, label: "Compras"  },
  { href: "/finances", icon: Wallet,       label: "Finanzas" },
  { href: "/projects", icon: FolderKanban, label: "Proyectos"},
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex-shrink-0 bg-[#111111] border-t border-white/[0.06]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-[3px]"
            >
              <Icon
                className={`w-6 h-6 transition-colors ${
                  active ? "text-amber-400" : "text-white/30"
                }`}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span
                className={`text-[9px] font-medium tracking-wide leading-none transition-colors ${
                  active ? "text-amber-400" : "text-white/25"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
