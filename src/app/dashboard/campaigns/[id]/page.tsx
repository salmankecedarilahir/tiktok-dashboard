"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  ArrowLeft,
  Inbox,
  Calendar,
  Video,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  FileText,
  Users,
} from "lucide-react";

interface CampaignVideo {
  id: string;
  videoTitle: string;
  videoUrl: string | null;
  postedAt: string;
  durationSeconds: number | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTimeAvgSec: number | null;
  notes: string | null;
}

interface CampaignBrief {
  id: string;
  brandName: string;
  status: string;
  inquiryDate: string;
}

interface CampaignContributionPlan {
  id: string;
  title: string;
  status: string;
  totalAmount: number;
}

interface CampaignDetail {
  id: string;
  brandName: string;
  brandLogoUrl: string | null;
  campaignName: string;
  packageType: string | null;
  startDate: string;
  endDate: string;
  notes: string | null;
  videos: CampaignVideo[];
  brief?: CampaignBrief | null;
  contributionPlan?: CampaignContributionPlan | null;
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const canEdit = session?.user?.role !== "VIEWER";
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePlanChecked, setDeletePlanChecked] = useState(true);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);

  async function confirmDeleteCampaign() {
    if (!campaign) return;
    setIsDeletingCampaign(true);
    try {
      const url = `/api/campaigns/${id}?deleteContributionPlan=${deletePlanChecked}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus campaign");

      if (data.deletedContributionPlan) {
        toast.success("Campaign dan Contribution Plan berhasil dihapus");
      } else {
        toast.success("Campaign berhasil dihapus");
      }
      router.push("/dashboard/campaigns");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus campaign");
    } finally {
      setIsDeletingCampaign(false);
    }
  }

  const [form, setForm] = useState({
    videoTitle: "",
    videoUrl: "",
    postedAt: "",
    durationSeconds: "",
    views: "",
    likes: "",
    comments: "",
    shares: "",
    saves: "",
    watchTimeAvgSec: "",
    notes: "",
  });

  function resetForm() {
    setForm({
      videoTitle: "",
      videoUrl: "",
      postedAt: "",
      durationSeconds: "",
      views: "",
      likes: "",
      comments: "",
      shares: "",
      saves: "",
      watchTimeAvgSec: "",
      notes: "",
    });
  }

  function updateForm<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function loadCampaign() {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (data.campaign) setCampaign(data.campaign);
      else toast.error(data.error || "Campaign not found");
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaign();
  }, [id]);

  async function handleAddVideo() {
    if (!form.videoTitle.trim()) {
      toast.error("Video title wajib diisi");
      return;
    }
    if (!form.postedAt) {
      toast.error("Posted date wajib diisi");
      return;
    }
    if (!form.views || !form.likes || !form.comments || !form.shares) {
      toast.error("Views, likes, comments, shares wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoTitle: form.videoTitle.trim(),
          videoUrl: form.videoUrl.trim() || null,
          postedAt: form.postedAt,
          durationSeconds: form.durationSeconds ? parseInt(form.durationSeconds, 10) : null,
          views: parseInt(form.views, 10),
          likes: parseInt(form.likes, 10),
          comments: parseInt(form.comments, 10),
          shares: parseInt(form.shares, 10),
          saves: form.saves ? parseInt(form.saves, 10) : 0,
          watchTimeAvgSec: form.watchTimeAvgSec ? parseFloat(form.watchTimeAvgSec) : null,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");

      toast.success("Video added");
      resetForm();
      setShowForm(false);
      await loadCampaign();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVideo(videoId: string, title: string) {
    if (!confirm(`Delete video "${title}"?`)) return;

    setDeletingId(videoId);
    try {
      const res = await fetch(`/api/campaign-videos/${videoId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Video deleted");
      await loadCampaign();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatNumber(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  if (loading) return <div className="container mx-auto py-8">Loading...</div>;
  if (!campaign) return <div className="container mx-auto py-8">Campaign not found</div>;

  const totalViews = campaign.videos.reduce((s, v) => s + v.views, 0);
  const totalLikes = campaign.videos.reduce((s, v) => s + v.likes, 0);
  const totalComments = campaign.videos.reduce((s, v) => s + v.comments, 0);
  const totalShares = campaign.videos.reduce((s, v) => s + v.shares, 0);
  const engagementRate = totalViews
    ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
    : 0;

  const reportUrl = "/api/campaigns/" + id + "/report";

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to campaigns
      </Link>

      {campaign?.brief && (
        <div className="mb-6 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">
                Originated from Brief
              </div>
              <div className="text-xs text-muted-foreground">
                Inquiry:{" "}
                {new Date(campaign.brief.inquiryDate).toLocaleDateString(
                  "id-ID",
                  { day: "numeric", month: "short", year: "numeric" }
                )}
              </div>
            </div>
          </div>
          <Link href={"/dashboard/briefs/" + campaign.brief.id}>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Brief
            </Button>
          </Link>
        </div>
      )}

      {campaign?.contributionPlan && (
        <div className="mb-6 rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Draft Contribution Plan Tim</span>
                <Badge
                  variant="outline"
                  className={
                    campaign.contributionPlan.status === "DRAFT"
                      ? "border-amber-400 bg-amber-100 text-amber-800 text-[10px]"
                      : "border-emerald-400 bg-emerald-100 text-emerald-800 text-[10px]"
                  }
                >
                  {campaign.contributionPlan.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {campaign.contributionPlan.title}
                {campaign.contributionPlan.totalAmount > 0 &&
                  ` • Rp ${campaign.contributionPlan.totalAmount.toLocaleString("id-ID")}`}
              </div>
            </div>
          </div>
          <Link href={`/dashboard/inhouse/contributions/${campaign.contributionPlan.id}`}>
            <Button variant="outline" size="sm" className="border-amber-400/50 hover:bg-amber-100/50">
              <ExternalLink className="mr-2 h-4 w-4" />
              Buka Contribution Plan
            </Button>
          </Link>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                {campaign.brandName}
                {campaign.packageType && (
                  <Badge variant="secondary">{campaign.packageType}</Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1 text-base">
                {campaign.campaignName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && campaign.videos.length > 0 && (
                <a href={reportUrl} target="_blank" rel="noopener">
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </a>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeletePlanChecked(!!campaign.contributionPlan);
                    setDeleteOpen(true);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus Campaign
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(campaign.startDate) + " -> " + formatDate(campaign.endDate)}
            </div>
            <div className="flex items-center gap-1.5">
              <Video className="h-4 w-4" />
              {campaign.videos.length} video
              {campaign.videos.length !== 1 ? "s" : ""}
            </div>
          </div>
          {campaign.notes && (
            <p className="mt-4 text-sm text-muted-foreground">{campaign.notes}</p>
          )}
        </CardContent>
      </Card>

      {campaign.videos.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Campaign Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat label="Views" value={formatNumber(totalViews)} icon={<Eye className="h-4 w-4" />} />
              <Stat label="Likes" value={formatNumber(totalLikes)} icon={<Heart className="h-4 w-4" />} />
              <Stat label="Comments" value={formatNumber(totalComments)} icon={<MessageCircle className="h-4 w-4" />} />
              <Stat label="Shares" value={formatNumber(totalShares)} icon={<Share2 className="h-4 w-4" />} />
              <Stat label="Engagement" value={engagementRate.toFixed(2) + "%"} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Videos</CardTitle>
              <CardDescription>Manual input metrics dari TikTok Studio per video.</CardDescription>
            </div>
            {canEdit && !showForm && (
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Video
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="border rounded-lg p-4 mb-6 bg-muted/30">
              <h3 className="font-semibold mb-4">Add Video Metrics</h3>
              <div className="space-y-4">
                <FormField label="Video Title *" value={form.videoTitle} onChange={(v) => updateForm("videoTitle", v)} placeholder="3 Alasan Harus Hindari Anak Teknik" />
                <FormField label="Video URL" value={form.videoUrl} onChange={(v) => updateForm("videoUrl", v)} placeholder="https://www.tiktok.com/@abangabanganthis/video/..." />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Posted Date *" type="date" value={form.postedAt} onChange={(v) => updateForm("postedAt", v)} />
                  <FormField label="Duration (sec)" type="number" value={form.durationSeconds} onChange={(v) => updateForm("durationSeconds", v)} placeholder="45" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FormField label="Views *" type="number" value={form.views} onChange={(v) => updateForm("views", v)} placeholder="67300" />
                  <FormField label="Likes *" type="number" value={form.likes} onChange={(v) => updateForm("likes", v)} placeholder="4200" />
                  <FormField label="Comments *" type="number" value={form.comments} onChange={(v) => updateForm("comments", v)} placeholder="89" />
                  <FormField label="Shares *" type="number" value={form.shares} onChange={(v) => updateForm("shares", v)} placeholder="312" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Saves" type="number" value={form.saves} onChange={(v) => updateForm("saves", v)} placeholder="120" />
                  <FormField label="Watch Time Avg (sec)" type="number" value={form.watchTimeAvgSec} onChange={(v) => updateForm("watchTimeAvgSec", v)} placeholder="12.4" />
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} rows={2} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y" placeholder="Catatan tambahan (optional)" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
                  <Button onClick={handleAddVideo} disabled={saving}>{saving ? "Saving..." : "Save Video"}</Button>
                </div>
              </div>
            </div>
          )}

          {campaign.videos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Belum ada video di campaign ini.</p>
              {canEdit && (
                <p className="text-sm mt-2">Klik Add Video untuk mulai input metrics.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {campaign.videos.map((v) => {
                const engRate = v.views ? ((v.likes + v.comments + v.shares) / v.views) * 100 : 0;
                return (
                  <div key={v.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold">{v.videoTitle}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Posted {formatDate(v.postedAt)}
                          {v.durationSeconds && " - " + v.durationSeconds + "s"}
                          {v.watchTimeAvgSec && " - Avg watch " + v.watchTimeAvgSec + "s"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {v.videoUrl && (
                          <a href={v.videoUrl} target="_blank" rel="noopener">
                            <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                          </a>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteVideo(v.id, v.videoTitle)} disabled={deletingId === v.id} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                      <Metric icon={<Eye className="h-3.5 w-3.5" />} label="Views" value={formatNumber(v.views)} />
                      <Metric icon={<Heart className="h-3.5 w-3.5" />} label="Likes" value={formatNumber(v.likes)} />
                      <Metric icon={<MessageCircle className="h-3.5 w-3.5" />} label="Comments" value={formatNumber(v.comments)} />
                      <Metric icon={<Share2 className="h-3.5 w-3.5" />} label="Shares" value={formatNumber(v.shares)} />
                      <Metric icon={<Bookmark className="h-3.5 w-3.5" />} label="Saves" value={formatNumber(v.saves)} />
                      <Metric label="Eng. Rate" value={engRate.toFixed(2) + "%"} />
                    </div>
                    {v.notes && <p className="mt-3 text-xs text-muted-foreground italic">{v.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Konfirmasi Hapus Campaign & Opsi Hapus Contribution Plan */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Hapus Campaign</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus campaign{" "}
              <span className="font-semibold text-foreground">
                &quot;{campaign?.campaignName}&quot;
              </span>{" "}
              ({campaign?.brandName})? Seluruh data metrik video di dalamnya akan ikut terhapus permanen.
            </DialogDescription>
          </DialogHeader>

          {campaign && (
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
                    {campaign.contributionPlan ? (
                      <>
                        Plan:{" "}
                        <span className="font-medium text-foreground">
                          {campaign.contributionPlan.title}
                        </span>{" "}
                        ({campaign.contributionPlan.status})
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
              onClick={() => setDeleteOpen(false)}
              disabled={isDeletingCampaign}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCampaign}
              disabled={isDeletingCampaign}
            >
              {isDeletingCampaign
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

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span className="text-xs">{label}:</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" />
    </div>
  );
}