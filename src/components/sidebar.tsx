"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Megaphone,
  Inbox,
  Settings,
  Upload,
  Sparkles,
  LogOut,
  KeyRound,
  BarChart2,
} from "lucide-react";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/dashboard/change-password-dialog";

interface BriefStats {
  active: number;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
}

function initialsFromName(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function roleBadgeVariant(role: Role): "default" | "secondary" | "outline" {
  if (role === "ADMIN") return "default";
  if (role === "EDITOR") return "secondary";
  return "outline";
}

export function Sidebar({ user }: { user: Session["user"] }) {
  const pathname = usePathname();
  const [briefStats, setBriefStats] = useState<BriefStats>({ active: 0 });
  const [pwDialogOpen, setPwDialogOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/briefs/stats", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.active === "number") {
          setBriefStats({ active: d.active });
        }
      })
      .catch((err: unknown) => {
        // Silent: AbortError dari unmount/route-change atau network fail
        if (err instanceof DOMException && err.name === "AbortError") return;
      });
    return () => controller.abort();
  }, [pathname]);

  const allNavItems: NavItem[] = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    {
      label: "Briefs",
      href: "/dashboard/briefs",
      icon: Inbox,
      badge: briefStats.active > 0 ? briefStats.active : undefined,
    },
    { label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
    { label: "Inhouse", href: "/dashboard/inhouse", icon: BarChart2 },
    { label: "Channel", href: "/dashboard/channel", icon: Settings, adminOnly: true },
    { label: "Import", href: "/dashboard/import", icon: Upload, adminOnly: true },
  ];

  const navItems = allNavItems.filter(
    (item) => !item.adminOnly || user.role === "ADMIN"
  );

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

      <div className="border-t p-3 space-y-2">
        <div className="flex items-center gap-3 px-1 pb-1">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
            {initialsFromName(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user.name ?? "User"}</div>
            <div className="mt-0.5">
              <Badge variant={roleBadgeVariant(user.role)} className="text-[10px]">
                {user.role}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setPwDialogOpen(true)}
        >
          <KeyRound className="size-3.5" />
          Ganti Password
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-3.5" />
          Logout
        </Button>
      </div>

      <ChangePasswordDialog open={pwDialogOpen} onOpenChange={setPwDialogOpen} />
    </aside>
  );
}
