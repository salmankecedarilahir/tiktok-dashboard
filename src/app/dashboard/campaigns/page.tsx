"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Video, Calendar, Trash2, ExternalLink } from "lucide-react";

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
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadCampaigns() {
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
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function handleDelete(id: string, brandName: string) {
    if (!confirm(`Delete campaign untuk ${brandName}? Semua video data akan ikut terhapus.`)) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Campaign deleted");
      await loadCampaigns();
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

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Manage brand campaigns dan generate performance reports.
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Belum ada campaign. Buat campaign pertama untuk brand client lo.
            </p>
            <Link href="/dashboard/campaigns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Campaign
              </Button>
            </Link>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(c.id, c.brandName)}
                      disabled={deleting === c.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDate(c.startDate)} → {formatDate(c.endDate)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Video className="h-4 w-4" />
                    {c.videoCount} video{c.videoCount !== 1 ? "s" : ""}
                  </div>
                </div>
                {c.notes && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{c.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}