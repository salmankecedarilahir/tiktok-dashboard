"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateEngagement, extractTikTokVideoId } from "@/lib/utils";

interface FormState {
  tiktokUrl: string;
  caption: string;
  postedAt: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  evaluation: string;
}

const EMPTY: FormState = {
  tiktokUrl: "",
  caption: "",
  postedAt: "",
  views: "",
  likes: "",
  comments: "",
  shares: "",
  evaluation: "",
};

export function InhouseAddVideoDialog({
  weekNumber,
  month,
  year,
  onSuccess,
}: {
  weekNumber: number;
  month: number;
  year: number;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY);
      setError(null);
    }
  }, [open]);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const extractedId = extractTikTokVideoId(form.tiktokUrl);
  const views = Number(form.views) || 0;
  const likes = Number(form.likes) || 0;
  const comments = Number(form.comments) || 0;
  const shares = Number(form.shares) || 0;
  const engagement = calculateEngagement(views, likes, comments, shares);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!form.tiktokUrl.trim()) {
      setError("Link TikTok wajib diisi");
      return;
    }
    if (!extractedId) {
      setError("Tidak bisa extract video ID. Pastikan URL format /video/<id>.");
      return;
    }
    if (form.views === "" || form.likes === "" || form.comments === "" || form.shares === "") {
      setError("Semua metrik wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/inhouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiktokUrl: form.tiktokUrl.trim(),
          caption: form.caption.trim() || null,
          weekNumber,
          month,
          year,
          views: Number(form.views),
          likes: Number(form.likes),
          comments: Number(form.comments),
          shares: Number(form.shares),
          evaluation: form.evaluation.trim() || null,
          postedAt: form.postedAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menambahkan video");
        return;
      }
      toast.success("Video berhasil ditambahkan");
      setOpen(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" />
          Tambah Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Video — Week {weekNumber}</DialogTitle>
          <DialogDescription>
            Input link TikTok dan metrik dari TikTok Studio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="inhouse-url">Link Video TikTok *</Label>
            <Input
              id="inhouse-url"
              type="url"
              value={form.tiktokUrl}
              onChange={(e) => update("tiktokUrl", e.target.value)}
              placeholder="https://www.tiktok.com/@username/video/1234567890"
              disabled={loading}
              required
            />
            <div className="text-xs text-muted-foreground">
              {form.tiktokUrl
                ? extractedId
                  ? <>Video ID: <span className="font-mono">{extractedId}</span></>
                  : <span className="text-red-600">Format URL belum valid.</span>
                : "Contoh: https://www.tiktok.com/@username/video/1234567890"}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inhouse-caption">Caption / Judul Video</Label>
            <textarea
              id="inhouse-caption"
              value={form.caption}
              onChange={(e) => update("caption", e.target.value)}
              rows={2}
              disabled={loading}
              className="block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
              placeholder="Opsional"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inhouse-posted">Tanggal Upload</Label>
            <Input
              id="inhouse-posted"
              type="date"
              value={form.postedAt}
              onChange={(e) => update("postedAt", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inhouse-views">Views *</Label>
              <Input
                id="inhouse-views"
                type="number"
                min={0}
                value={form.views}
                onChange={(e) => update("views", e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inhouse-likes">Likes *</Label>
              <Input
                id="inhouse-likes"
                type="number"
                min={0}
                value={form.likes}
                onChange={(e) => update("likes", e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inhouse-comments">Comments *</Label>
              <Input
                id="inhouse-comments"
                type="number"
                min={0}
                value={form.comments}
                onChange={(e) => update("comments", e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inhouse-shares">Shares *</Label>
              <Input
                id="inhouse-shares"
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
            <Label htmlFor="inhouse-eval">Evaluasi Video</Label>
            <textarea
              id="inhouse-eval"
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
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? "Menyimpan..." : "Simpan Video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
