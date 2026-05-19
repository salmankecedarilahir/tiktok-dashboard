"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Megaphone,
  Inbox,
  Settings,
  Upload,
  Sparkles,
} from "lucide-react";

interface BriefStats {
  active: number;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const [briefStats, setBriefStats] = useState<BriefStats>({ active: 0 });

  useEffect(() => {
    fetch("/api/briefs/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.active === "number") {
          setBriefStats({ active: d.active });
        }
      })
      .catch(() => {});
  }, [pathname]);

  const navItems: NavItem[] = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Briefs",
      href: "/dashboard/briefs",
      icon: Inbox,
      badge: briefStats.active > 0 ? briefStats.active : undefined,
    },
    {
      label: "Campaigns",
      href: "/dashboard/campaigns",
      icon: Megaphone,
    },
    {
      label: "Channel",
      href: "/dashboard/channel",
      icon: Settings,
    },
    {
      label: "Import",
      href: "/dashboard/import",
      icon: Upload,
    },
  ];

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-64 shrink-0 border-r bg-background flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-sm">CAU Tools</div>
            <div className="text-xs text-muted-foreground">Brand Workspace</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm transition " +
                (active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={
                    "text-xs font-semibold px-2 py-0.5 rounded-full " +
                    (active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary")
                  }
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          Circle Anak UPN
        </div>
        <div className="text-xs text-muted-foreground/60">
          @abangabanganthis
        </div>
      </div>
    </aside>
  );
}