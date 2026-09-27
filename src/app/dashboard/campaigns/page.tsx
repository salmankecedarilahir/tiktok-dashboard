"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Video, Calendar, Trash2, ExternalLink } from "lucide-react";

interface CampaignContributionPlan {
  id: string;
  title: string;
  status: string;
}

interface Campaign {
  id: string;
  brandName: string;
  brandLogoUrl: string | null;
  campaignName: string;
  packageType: string | null;
  startDate: string;
  endDate: string;
  notes: string | null;
  videoCount: number;
  createdAt: string;
  contributionPlan?: CampaignContributionPlan | null;
}

export default function CampaignsPage() {
  const { data: session } = useSession();
  const canEdit = session?.user?.role !== "VIEWER";
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [deletePlanChecked, setDeletePlanChecked] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCampaigns(data.campaigns);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCampaigns(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCampaigns]);

  function openDeleteDialog(campaign: Campaign) {
    setDeleteTarget(campaign);
    setDeletePlanChecked(!!campaign.contributionPlan);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const url = `/api/campaigns/${deleteTarget.id}?deleteContributionPlan=${deletePlanChecked}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      if (data.deletedContributionPlan) {
        toast.success("Campaign dan Contribution Plan berhasil dihapus");
      } else {
        toast.success("Campaign berhasil dihapus");
      }
      setDeleteTarget(null);
      await loadCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus campaign");
    } finally {
      setIsDeleting(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Manage brand campaigns dan generate performance reports.
          </p>
        </div>
        {canEdit && (
          <Link href="/dashboard/campaigns/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Belum ada campaign. Buat campaign pertama untuk brand client lo.
            </p>
            {canEdit && (
              <Link href="/dashboard/campaigns/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Campaign
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <Card key={c.id} className="hover:border-primary/50 transition">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {c.brandName}
                      {c.packageType && (
                        <Badge variant="secondary">{c.packageType}</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">{c.campaignName}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/campaigns/${c.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(c)}
                        disabled={isDeleting && deleteTarget?.id === c.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDate(c.startDate)} → {formatDate(c.endDate)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Video className="h-4 w-4" />
                    {c.videoCount} video{c.videoCount !== 1 ? "s" : ""}
                  </div>
                  {c.contributionPlan && (
                    <Link
                      href={`/dashboard/inhouse/contributions/${c.contributionPlan.id}`}
                      className="hover:underline"
                    >
                      <Badge
                        variant="outline"
                        className={
                          c.contributionPlan.status === "DRAFT"
                            ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px]"
                            : "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]"
                        }
                      >
                        Plan: {c.contributionPlan.status}
                      </Badge>
                    </Link>
                  )}
                </div>
                {c.notes && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{c.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Konfirmasi Hapus Campaign & Opsi Hapus Contribution Plan */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Hapus Campaign</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus campaign{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.campaignName}&quot;
              </span>{" "}
              ({deleteTarget?.brandName})? Seluruh data metrik video di dalamnya akan ikut terhapus permanen.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="rounded-lg border p-4 bg-muted/40 space-y-3 my-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deletePlanChecked}
                  onChange={(e) => setDeletePlanChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
                <div className="space-y-1">
                  <div className="text-sm font-medium leading-none">
                    Hapus juga Contribution Plan terkait
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {deleteTarget.contributionPlan ? (
                      <>
                        Plan:{" "}
                        <span className="font-medium text-foreground">
                          {deleteTarget.contributionPlan.title}
                        </span>{" "}
                        ({deleteTarget.contributionPlan.status})
                      </>
                    ) : (
                      "Contribution Plan dengan nama brand & campaign ini (jika ada)"
                    )}
                  </p>
                </div>
              </label>
              {!deletePlanChecked && (
                <p className="text-[11px] text-muted-foreground italic pl-7">
                  Catatan: Contribution Plan akan tetap aman tersimpan di menu Inhouse.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? "Menghapus..."
                : deletePlanChecked
                ? "Hapus Campaign & Plan"
                : "Hapus Campaign Saja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}