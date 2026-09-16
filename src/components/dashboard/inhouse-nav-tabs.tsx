"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

export function InhouseNavTabs() {
  const pathname = usePathname();

  const isContributions = pathname.startsWith("/dashboard/inhouse/contributions");
  const isVideos = !isContributions && pathname.startsWith("/dashboard/inhouse");

  const tabs = [
    {
      label: "Video Tracker",
      href: "/dashboard/inhouse",
      icon: Film,
      active: isVideos,
    },
    {
      label: "Contribution Plan",
      href: "/dashboard/inhouse/contributions",
      icon: Calculator,
      active: isContributions,
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b mb-6 pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
              tab.active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
