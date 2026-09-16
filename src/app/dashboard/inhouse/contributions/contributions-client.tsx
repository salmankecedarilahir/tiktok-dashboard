"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Download,
  Trash2,
  ExternalLink,
  Users,
  CheckCircle2,
  Loader2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InhouseNavTabs } from "@/components/dashboard/inhouse-nav-tabs";
import { formatRupiah } from "@/lib/contribution-template";

interface PlanItem {
  id: string;
  title: string;
  brandName?: string | null;
  totalAmount: number;
  date: string;
  status: string;
  members: Array<{ id: string; name: string; role?: string | null }>;
  tasks: Array<{ id: string; title: string; weight: number }>;
  createdAt: string;
}

export function ContributionsClient() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // New plan modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("Contribution Plan CAU");
  const [newBrand, setNewBrand] = useState("");
  const [newAmount, setNewAmount] = useState("1000000");

  // Delete plan state
  const [deleteTarget, setDeleteTarget] = useState<PlanItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inhouse/contributions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat contribution plans");
      setPlans(data.plans || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const parsedAmount = parseInt(newAmount.replace(/\D/g, ""), 10) || 0;
      const res = await fetch("/api/inhouse/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle || "Contribution Plan CAU",
          brandName: newBrand || null,
          totalAmount: parsedAmount,
          useDefaultTemplate: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat contribution plan");

      toast.success("Contribution plan berhasil dibuat");
      setCreateOpen(false);
      router.push(`/dashboard/inhouse/contributions/${data.plan.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat plan");
    } finally {
      setCreating(false);
    }
  }

  async function handleDownloadPdf(plan: PlanItem) {
    setDownloadingId(plan.id);
    try {
      const res = await fetch(`/api/inhouse/contributions/${plan.id}/pdf`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengunduh PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.download = `${safeName || "contribution-plan"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF berhasil di-download");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunduh PDF");
    } finally {
      setDownloadingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inhouse/contributions/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menghapus plan");

      toast.success("Contribution plan dihapus");
      setDeleteTarget(null);
      await fetchPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus plan");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container mx-auto py-8 px-6 max-w-6xl">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-2xl font-bold">Inhouse</h1>
        <p className="text-sm text-muted-foreground">
          Pengelolaan konten inhouse dan skema pembagian gaji/fee brand.
        </p>
      </div>

      <InhouseNavTabs />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold">Contribution Plans</h2>
          <p className="text-sm text-muted-foreground">
            Daftar skema pembagian kerja dan alokasi fee brand yang masuk.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Buat Plan Baru
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Memuat contribution plans...</span>
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <DollarSign className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">Belum Ada Contribution Plan</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
              Buat rencana kontribusi baru untuk menghitung pembagian gaji tim dari brand
              masuk berdasarkan 13 tahapan kerja standar CAU.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Buat Plan Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p) => {
            const formattedDate = new Date(p.date || p.createdAt).toLocaleDateString(
              "id-ID",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              }
            );

            return (
              <Card
                key={p.id}
                className="hover:border-primary/50 transition-colors flex flex-col justify-between"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">{p.title}</h3>
                        {p.status && (
                          <Badge variant="outline" className="text-[10px]">
                            {p.status}
                          </Badge>
                        )}
                      </div>
                      {p.brandName && (
                        <p className="text-xs text-primary font-medium mt-0.5">
                          Brand: {p.brandName}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-foreground">
                        {formatRupiah(p.totalAmount)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Total Brand Masuk
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground my-3 pt-3 border-t">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formattedDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {p.members.length} Kontributor
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {p.tasks.length} Tahapan Kerja
                    </span>
                  </div>

                  {p.members.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.members.map((m) => (
                        <Badge
                          key={m.id}
                          variant="secondary"
                          className="text-[11px] font-normal"
                        >
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Hapus
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingId === p.id}
                        onClick={() => handleDownloadPdf(p)}
                      >
                        {downloadingId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5 mr-1" />
                        )}
                        Export PDF
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/dashboard/inhouse/contributions/${p.id}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Buka / Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Buat Contribution Plan Baru */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleCreatePlan}>
            <DialogHeader>
              <DialogTitle>Buat Contribution Plan Baru</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="plan-title">Judul Plan</Label>
                <Input
                  id="plan-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Contribution Plan CAU - Brand ABC"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="brand-name">Nama Brand (Opsional)</Label>
                <Input
                  id="brand-name"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="e.g. Erigo, Somethinc, dsb."
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="total-amount">Total Nilai Brand Masuk (Rp)</Label>
                <Input
                  id="total-amount"
                  type="number"
                  min="0"
                  step="10000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="1000000"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Preview: {formatRupiah(parseInt(newAmount || "0", 10))}
                </p>
              </div>

              <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">
                  Template Otomatis CSV CAU:
                </p>
                <p>
                  • Memuat 13 tahapan kerja (Action Plan) dengan total bobot 100%.
                </p>
                <p>• Otomatis menyertakan anggota tim aktif dari sistem.</p>
                <p>• Bobot, pembagian PIC, dan anggota dapat disesuaikan setelah dibuat.</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Batal
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Membuat...
                  </>
                ) : (
                  "Buat & Buka Plan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog: Confirm Delete */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Contribution Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Plan "{deleteTarget?.title}" akan dihapus permanen. Aksi ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
