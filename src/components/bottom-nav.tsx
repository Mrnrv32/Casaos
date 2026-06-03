"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ListTodo,
  CalendarDays,
  ChefHat,
  Wallet,
  FolderKanban,
  Settings2,
} from "lucide-react";

const TABS = [
  { href: "/board",    icon: LayoutGrid,   label: "Board"    },
  { href: "/tareas",   icon: ListTodo,     label: "Tareas"   },
  { href: "/calendar", icon: CalendarDays, label: "Agenda"   },
  { href: "/recetas",  icon: ChefHat,      label: "Recetas"  },
  { href: "/finances", icon: Wallet,       label: "Dinero"   },
  { href: "/projects", icon: FolderKanban, label: "Planes"   },
  { href: "/settings", icon: Settings2,    label: "Ajustes"  },
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
                className={`w-[22px] h-[22px] transition-colors ${
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
