"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateEngagement } from "@/lib/utils";
import type { InhouseVideoWithEngagement } from "@/components/dashboard/inhouse-video-card";

interface FormState {
  caption: string;
  postedAt: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  evaluation: string;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function InhouseEditVideoDialog({
  video,
  open,
  onOpenChange,
  onSuccess,
}: {
  video: InhouseVideoWithEngagement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => ({
    caption: video.caption ?? "",
    postedAt: toDateInput(video.postedAt),
    views: String(video.views),
    likes: String(video.likes),
    comments: String(video.comments),
    shares: String(video.shares),
    evaluation: video.evaluation ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        caption: video.caption ?? "",
        postedAt: toDateInput(video.postedAt),
        views: String(video.views),
        likes: String(video.likes),
        comments: String(video.comments),
        shares: String(video.shares),
        evaluation: video.evaluation ?? "",
      });
      setError(null);
    }
  }, [open, video]);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const views = Number(form.views) || 0;
  const likes = Number(form.likes) || 0;
  const comments = Number(form.comments) || 0;
  const shares = Number(form.shares) || 0;
  const engagement = calculateEngagement(views, likes, comments, shares);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const res = await fetch(`/api/inhouse/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: form.caption.trim() || null,
          postedAt: form.postedAt || null,
          views: Number(form.views),
          likes: Number(form.likes),
          comments: Number(form.comments),
          shares: Number(form.shares),
          evaluation: form.evaluation.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan perubahan");
        return;
      }
      toast.success("Perubahan disimpan");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
          <DialogDescription>
            Update metrik, caption, atau evaluasi video.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Link Video TikTok</Label>
            <Input value={video.tiktokUrl} readOnly className="bg-muted/40" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-caption">Caption / Judul Video</Label>
            <textarea
              id="edit-caption"
              value={form.caption}
              onChange={(e) => update("caption", e.target.value)}
              rows={2}
              disabled={loading}
              className="block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
              placeholder="Opsional"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-posted">Tanggal Upload</Label>
            <Input
              id="edit-posted"
              type="date"
              value={form.postedAt}
              onChange={(e) => update("postedAt", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-views">Views *</Label>
              <Input
                id="edit-views"
                type="number"
                min={0}
                value={form.views}
                onChange={(e) => update("views", e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-likes">Likes *</Label>
              <Input
                id="edit-likes"
                type="number"
                min={0}
                value={form.likes}
                onChange={(e) => update("likes", e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-comments">Comments *</Label>
              <Input
                id="edit-comments"
                type="number"
                min={0}
                value={form.comments}
                onChange={(e) => update("comments", e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-shares">Shares *</Label>
              <Input
                id="edit-shares"
                type="number"
                min={0}
                value={form.shares}
                onChange={(e) => update("shares", e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Engagement Rate</span>
            <span className="font-semibold text-sm">{engagement.toFixed(2)}%</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-eval">Evaluasi Video</Label>
            <textarea
              id="edit-eval"
              value={form.evaluation}
              onChange={(e) => update("evaluation", e.target.value)}
              rows={3}
              disabled={loading}
              className="block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
              placeholder="Tulis evaluasi atau catatan untuk video ini..."
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
