"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";

export function RefreshButton({ userRole }: { userRole: Role }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  if (userRole === "VIEWER") return null;

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Refresh failed");
      }

      toast.success("Data refreshed", {
        description: `${data.videosFound} videos, ${data.snapshotsAdded} snapshots`,
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      toast.error("Refresh failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const busy = isLoading || isPending;

  return (
    <Button onClick={handleRefresh} disabled={busy} variant="outline" size="sm">
      <RefreshCw className={`h-4 w-4 mr-2 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Refreshing..." : "Refresh"}
    </Button>
  );
}
