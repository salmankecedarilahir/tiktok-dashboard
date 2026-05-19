import { NextRequest, NextResponse } from "next/server";
import { parseOverviewCsv, importDailyMetrics } from "@/lib/csv-overview-import";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "api/import-overview" });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "File harus .csv" }, { status: 400 });
    }

    const csvContent = await file.text();
    const rows = parseOverviewCsv(csvContent);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found" }, { status: 400 });
    }

    const result = await importDailyMetrics(rows);

    log.info({ ...result, totalParsed: rows.length }, "Import success");

    return NextResponse.json({
      success: true,
      totalParsed: rows.length,
      inserted: result.inserted,
      updated: result.updated,
      dateRange: {
        from: rows[0]!.date.toISOString().slice(0, 10),
        to: rows[rows.length - 1]!.date.toISOString().slice(0, 10),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Import failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}