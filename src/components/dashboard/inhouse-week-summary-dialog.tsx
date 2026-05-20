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
import { Label } from "@/components/ui/label";
import { getWeekDateRange } from "@/lib/utils";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export interface InhouseWeeklyReportSummary {
  id: string;
  weekNumber: number;
  month: number;
  year: number;
  weekSummary: string | null;
  generatedAt: string | null;
}

export function InhouseWeekSummaryDialog({
  weeklyReport,
  weekNumber,
  month,
  year,
  open,
  onOpenChange,
  onSuccess,
}: {
  weeklyReport: InhouseWeeklyReportSummary;
  weekNumber: number;
  month: number;
  year: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [summary, setSummary] = useState(weeklyReport.weekSummary ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSummary(weeklyReport.weekSummary ?? "");
      setError(null);
    }
  }, [open, weeklyReport.weekSummary]);

  const range = getWeekDateRange(weekNumber, month, year);
  const monthName = MONTH_NAMES[month - 1] ?? "";
  const rangeLabel =
    range.start + "-" + range.end + " " + monthName + " " + year;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/inhouse/weekly-report/${weeklyReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekSummary: summary }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan evaluasi");
        return;
      }
      toast.success("Evaluasi tersimpan");
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
          <DialogTitle>
            Evaluasi Week {weekNumber} — {rangeLabel}
          </DialogTitle>
          <DialogDescription>
            Evaluasi keseluruhan week ini. Tampil di bagian "Evaluasi Mingguan" pada PDF report.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="week-summary">Evaluasi Mingguan</Label>
            <textarea
              id="week-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              disabled={loading}
              className="block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
              placeholder="Tulis evaluasi keseluruhan untuk week ini... Contoh: Week ini performa konten di atas rata-rata, video dengan hook pertanyaan mendapat engagement tertinggi."
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
              {loading ? "Menyimpan..." : "Simpan Evaluasi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
