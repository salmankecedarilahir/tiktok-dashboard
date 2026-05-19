"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Calendar,
  Trash2,
  ExternalLink,
  Building2,
  Inbox,
  MessageSquare,
  CheckCircle2,
  Rocket,
  Archive as ArchiveIcon,
  CircleCheck,
} from "lucide-react";

type BriefStatus = "INQUIRY" | "NEGOTIATING" | "CONFIRMED" | "ACTIVE" | "DONE" | "ARCHIVED";

interface Brief {
  id: string;
  brandName: string;
  brandContact: string | null;
  inquiryDate: string;
  source: string | null;
  status: BriefStatus;
  campaignName: string | null;
  packageType: string | null;
  customPrice: number | null;
  startDate: string | null;
  endDate: string | null;
  assignedTo: string | null;
  campaignId: string | null;
  campaign: { id: string; campaignName: string; brandName: string } | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<BriefStatus, { label: string; color: string; icon: React.ElementType }> = {
  INQUIRY: { label: "Inquiry", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Inbox },
  NEGOTIATING: { label: "Negotiating", color: "bg-amber-100 text-amber-700 border-amber-200", icon: MessageSquare },
  CONFIRMED: { label: "Confirmed", color: "bg-purple-100 text-purple-700 border-purple-200", icon: CheckCircle2 },
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700 border-green-200", icon: Rocket },
  DONE: { label: "Done", color: "bg-slate-100 text-slate-700 border-slate-200", icon: CircleCheck },
  ARCHIVED: { label: "Archived", color: "bg-gray-100 text-gray-500 border-gray-200", icon: ArchiveIcon },
};

const STATUS_ORDER: BriefStatus[] = ["INQUIRY", "NEGOTIATING", "CONFIRMED", "ACTIVE", "DONE", "ARCHIVED"];

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadBriefs() {
    try {
      const res = await fetch("/api/briefs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setBriefs(data.briefs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBriefs();
  }, []);

  async function handleDelete(id: string, brandName: string) {
    if (!confirm("Delete brief untuk " + brandName + "?")) return;

    setDeleting(id);
    try {
      const res = await fetch("/api/briefs/" + id, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Brief deleted");
      await loadBriefs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // Group briefs by status
  const grouped: Record<BriefStatus, Brief[]> = {
    INQUIRY: [],
    NEGOTIATING: [],
    CONFIRMED: [],
    ACTIVE: [],
    DONE: [],
    ARCHIVED: [],
  };
  briefs.forEach((b) => grouped[b.status].push(b));

  const totalActive = briefs.filter((b) => b.status !== "ARCHIVED" && b.status !== "DONE").length;

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Brief Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Track brand inquiry hingga campaign delivery. {totalActive} active deal{totalActive !== 1 ? "s" : ""}.
          </p>
        </div>
        <Link href="/dashboard/briefs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Brief
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : briefs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">
              Belum ada brief. Mulai track brand inquiry pertama lo.
            </p>
            <Link href="/dashboard/briefs/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Brief
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {STATUS_ORDER.map((status) => {
            const briefsInStatus = grouped[status];
            if (briefsInStatus.length === 0) return null;

            const config = STATUS_CONFIG[status];
            const Icon = config.icon;

            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {config.label}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    ({briefsInStatus.length})
                  </span>
                </div>
                <div className="grid gap-3">
                  {briefsInStatus.map((b) => (
                    <Card key={b.id} className="hover:border-primary/50 transition">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="flex items-center gap-2 flex-wrap text-lg">
                              <Building2 className="h-4 w-4 shrink-0" />
                              {b.brandName}
                              {b.packageType && (
                                <Badge variant="secondary" className="font-normal">
                                  {b.packageType}
                                </Badge>
                              )}
                              {b.campaign && (
                                <Badge variant="outline" className="font-normal">
                                  Linked to campaign
                                </Badge>
                              )}
                            </CardTitle>
                            {b.campaignName && (
                              <CardDescription className="mt-1">{b.campaignName}</CardDescription>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Link href={"/dashboard/briefs/" + b.id}>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(b.id, b.brandName)}
                              disabled={deleting === b.id}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Inquiry: {formatDate(b.inquiryDate)}
                          </div>
                          {b.source && (
                            <div>
                              Source: <span className="font-medium text-foreground">{b.source}</span>
                            </div>
                          )}
                          {b.assignedTo && (
                            <div>
                              Assigned: <span className="font-medium text-foreground">{b.assignedTo}</span>
                            </div>
                          )}
                          {b.customPrice && (
                            <div>
                              Price: <span className="font-medium text-foreground">Rp {b.customPrice.toLocaleString("id-ID")}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}