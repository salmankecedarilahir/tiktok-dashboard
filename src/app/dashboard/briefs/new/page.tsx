"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

const SOURCES = ["TikTok DM", "Instagram DM", "Email", "WhatsApp", "Referral", "Other"];

export default function NewBriefPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const today = new Date().toISOString().split("T")[0] ?? "";

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brandName: "",
    brandContact: "",
    inquiryDate: today,
    source: "",
    assignedTo: "",
    internalNotes: "",
  });

  useEffect(() => {
    if (role === "VIEWER") {
      router.replace("/dashboard/briefs");
    }
  }, [role, router]);

  if (role === "VIEWER") {
    return null;
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.brandName.trim()) {
      toast.error("Brand name wajib diisi");
      return;
    }
    if (!form.inquiryDate) {
      toast.error("Inquiry date wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: form.brandName.trim(),
          brandContact: form.brandContact.trim() || null,
          inquiryDate: form.inquiryDate,
          source: form.source || null,
          status: "INQUIRY",
          assignedTo: form.assignedTo.trim() || null,
          internalNotes: form.internalNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");

      toast.success("Brief created");
      router.push("/dashboard/briefs/" + data.brief.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/briefs"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to briefs
        </Link>
        <h1 className="text-3xl font-bold">New Brief</h1>
        <p className="text-muted-foreground mt-2">
          Catat brand inquiry baru. Detail campaign bisa diisi setelah negosiasi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inquiry Details</CardTitle>
          <CardDescription>Info dasar brand yang nge-DM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Brand Name *"
            value={form.brandName}
            onChange={(v) => update("brandName", v)}
            placeholder="EBI Fest, EVOS, BINUS, dll"
          />

          <Field
            label="Brand Contact"
            value={form.brandContact}
            onChange={(v) => update("brandContact", v)}
            placeholder="Nama PIC + nomor / email (optional)"
          />

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Inquiry Date *"
              type="date"
              value={form.inquiryDate}
              onChange={(v) => update("inquiryDate", v)}
            />

            <div>
              <label className="text-sm font-medium">Source</label>
              <select
                value={form.source}
                onChange={(e) => update("source", e.target.value)}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Pilih source —</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <Field
            label="Assigned To"
            value={form.assignedTo}
            onChange={(v) => update("assignedTo", v)}
            placeholder="Salman, Aqza, Irfan, Juan (optional)"
          />

          <div>
            <label className="text-sm font-medium">Internal Notes</label>
            <textarea
              value={form.internalNotes}
              onChange={(e) => update("internalNotes", e.target.value)}
              placeholder="Catatan internal team (optional)"
              rows={3}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full" size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Creating..." : "Create Brief"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}