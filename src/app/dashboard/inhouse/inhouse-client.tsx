"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getWeekDateRange } from "@/lib/utils";

import { InhouseMonthSelector } from "@/components/dashboard/inhouse-month-selector";
import {
  InhouseSummaryCard,
  type MonthlyTotals,
} from "@/components/dashboard/inhouse-summary-card";
import {
  InhouseVideoCard,
  type InhouseVideoWithEngagement,
} from "@/components/dashboard/inhouse-video-card";
import { InhouseAddVideoDialog } from "@/components/dashboard/inhouse-add-video-dialog";
import { InhouseEditVideoDialog } from "@/components/dashboard/inhouse-edit-video-dialog";
import {
  InhouseWeekSummaryDialog,
  type InhouseWeeklyReportSummary,
} from "@/components/dashboard/inhouse-week-summary-dialog";

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

const MONTH_SLUGS = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
];

interface WeekData {
  weekNumber: number;
  weeklyReport: InhouseWeeklyReportSummary | null;
  videos: InhouseVideoWithEngagement[];
}

interface InhouseResponse {
  month: number;
  year: number;
  weeks: Record<string, WeekData>;
  monthlyTotals: MonthlyTotals;
}

export function InhouseClient({
  initialMonth,
  initialYear,
}: {
  initialMonth: number;
  initialYear: number;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<InhouseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdfFor, setGeneratingPdfFor] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<InhouseVideoWithEngagement | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] =
    useState<InhouseVideoWithEngagement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [summaryTarget, setSummaryTarget] = useState<{
    report: InhouseWeeklyReportSummary;
    weekNumber: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inhouse?month=${month}&year=${year}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat data");
      setData(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGeneratePdf(report: InhouseWeeklyReportSummary) {
    setGeneratingPdfFor(report.id);
    try {
      const res = await fetch(`/api/inhouse/weekly-report/${report.id}/pdf`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal generate PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const monthSlug = MONTH_SLUGS[report.month - 1] ?? String(report.month);
      a.download =
        "inhouse-week-" +
        report.weekNumber +
        "-" +
        monthSlug +
        "-" +
        report.year +
        ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF berhasil di-generate");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal generate PDF");
    } finally {
      setGeneratingPdfFor(null);
    }
  }

  async function confirmDelete() {
    // Re-entrance guard: cegah double-fire (mis. user double-click "Hapus"
    // sebelum React sempat update disabled state).
    if (!deleteTarget || deleting) return;
    const targetId = deleteTarget.id;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inhouse/${targetId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Gagal menghapus video");
      toast.success("Video dihapus");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  const monthName = MONTH_NAMES[month - 1] ?? "";

  return (
    <div className="container mx-auto py-8 px-6 max-w-6xl">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-2xl font-bold">Inhouse</h1>
        <p className="text-sm text-muted-foreground">
          Tracker performa konten TikTok produksi sendiri, diorganisir per week.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <InhouseMonthSelector
          month={month}
          year={year}
          onChange={(next) => {
            setMonth(next.month);
            setYear(next.year);
          }}
        />
        <div className="text-sm text-muted-foreground">
          {monthName} {year}
        </div>
      </div>

      <div className="mb-6">
        {data ? (
          <InhouseSummaryCard totals={data.monthlyTotals} />
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              {loading ? "Memuat..." : "Tidak ada data."}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        {[1, 2, 3, 4].map((weekNumber) => {
          const week = data?.weeks[String(weekNumber)];
          const range = getWeekDateRange(weekNumber, month, year);
          const rangeLabel =
            range.start + "-" + range.end + " " + monthName + " " + year;
          const report = week?.weeklyReport ?? null;
          const videos = week?.videos ?? [];

          return (
            <div key={weekNumber} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">
                    Week {weekNumber}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      — {rangeLabel}
                    </span>
                  </h2>
                  {report?.generatedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      PDF terakhir di-generate:{" "}
                      {new Date(report.generatedAt).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!report}
                    onClick={() =>
                      report &&
                      setSummaryTarget({ report, weekNumber })
                    }
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Evaluasi Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!report || generatingPdfFor === report?.id}
                    onClick={() => report && handleGeneratePdf(report)}
                  >
                    {generatingPdfFor === report?.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Generate PDF
                  </Button>
                  <InhouseAddVideoDialog
                    weekNumber={weekNumber}
                    month={month}
                    year={year}
                    onSuccess={load}
                  />
                </div>
              </div>

              {videos.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Belum ada video di week ini. Klik "Tambah Video" untuk mulai.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {videos.map((v) => (
                    <InhouseVideoCard
                      key={v.id}
                      video={v}
                      onEdit={() => setEditTarget(v)}
                      onDelete={() => setDeleteTarget(v)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editTarget && (
        <InhouseEditVideoDialog
          video={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          onSuccess={load}
        />
      )}

      {summaryTarget && (
        <InhouseWeekSummaryDialog
          weeklyReport={summaryTarget.report}
          weekNumber={summaryTarget.weekNumber}
          month={month}
          year={year}
          open={!!summaryTarget}
          onOpenChange={(o) => !o && setSummaryTarget(null)}
          onSuccess={load}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus video?</AlertDialogTitle>
            <AlertDialogDescription>
              Video "
              {deleteTarget?.caption?.trim() || "Untitled Video"}" akan dihapus
              permanen. Aksi ini tidak bisa dibatalkan.
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
              className="bg-destructive/90 hover:bg-destructive"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
