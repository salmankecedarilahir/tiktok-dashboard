"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface ImportResult {
  success: boolean;
  totalParsed: number;
  inserted: number;
  updated: number;
  dateRange: { from: string; to: string };
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) {
      toast.error("Pilih file CSV dulu");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import-overview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data);
      toast.success(`Import sukses: ${data.inserted} baru, ${data.updated} update`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Import TikTok Studio Overview</h1>
        <p className="text-muted-foreground mt-2">
          Upload <code className="text-sm bg-muted px-1.5 py-0.5 rounded">Overview.csv</code> dari TikTok Studio.
          Data daily aggregate akan disimpan untuk channel context di report.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
          <CardDescription>
            Cara dapet: TikTok Studio → Analytics → Overview → Export → Download CSV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
                setError(null);
              }}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: <span className="font-mono">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Importing..." : "Import CSV"}
          </Button>

          {result && (
            <div className="rounded-md border bg-green-50 dark:bg-green-950/20 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Import sukses
                  </p>
                  <ul className="mt-2 space-y-1 text-green-800 dark:text-green-200">
                    <li>Total parsed: <strong>{result.totalParsed}</strong> rows</li>
                    <li>Inserted: <strong>{result.inserted}</strong> new days</li>
                    <li>Updated: <strong>{result.updated}</strong> existing days</li>
                    <li>Date range: <strong>{result.dateRange.from}</strong> → <strong>{result.dateRange.to}</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border bg-red-50 dark:bg-red-950/20 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
                  <p className="mt-1 text-red-800 dark:text-red-200 font-mono text-xs">{error}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}