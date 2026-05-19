"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

const PACKAGE_TYPES = ["Mapres", "Kating Gaul", "Cumlaude", "Custom"];

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    brandName: "",
    campaignName: "",
    packageType: "",
    startDate: "",
    endDate: "",
    brandLogoUrl: "",
    notes: "",
  });

  useEffect(() => {
    if (role === "VIEWER") {
      router.replace("/dashboard/campaigns");
    }
  }, [role, router]);

  if (role === "VIEWER") {
    return null;
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    // Validation
    if (!form.brandName.trim()) {
      toast.error("Brand name wajib diisi");
      return;
    }
    if (!form.campaignName.trim()) {
      toast.error("Campaign name wajib diisi");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Start date dan end date wajib diisi");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("End date harus setelah start date");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: form.brandName.trim(),
          campaignName: form.campaignName.trim(),
          packageType: form.packageType || null,
          startDate: form.startDate,
          endDate: form.endDate,
          brandLogoUrl: form.brandLogoUrl.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");

      toast.success("Campaign created");
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/campaigns" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to campaigns
        </Link>
        <h1 className="text-3xl font-bold">New Campaign</h1>
        <p className="text-muted-foreground mt-2">
          Bikin campaign baru untuk brand client. Setelah dibuat, lo bisa add video metrics.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Info dasar campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Brand Name *"
            value={form.brandName}
            onChange={(v) => update("brandName", v)}
            placeholder="EBI Fest, EVOS, BINUS, dll"
          />

          <Field
            label="Campaign Name *"
            value={form.campaignName}
            onChange={(v) => update("campaignName", v)}
            placeholder="EBI Fest 2026 Promo, EVOS Mobile Legend Tournament"
          />

          <div>
            <label className="text-sm font-medium">Package Type</label>
            <select
              value={form.packageType}
              onChange={(e) => update("packageType", e.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Pilih package —</option>
              {PACKAGE_TYPES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Start Date *"
              type="date"
              value={form.startDate}
              onChange={(v) => update("startDate", v)}
            />
            <Field
              label="End Date *"
              type="date"
              value={form.endDate}
              onChange={(v) => update("endDate", v)}
            />
          </div>

          <Field
            label="Brand Logo URL"
            value={form.brandLogoUrl}
            onChange={(v) => update("brandLogoUrl", v)}
            placeholder="https://example.com/logo.png (optional)"
          />

          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Catatan tambahan tentang campaign (optional)"
              rows={4}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full" size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Creating..." : "Create Campaign"}
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