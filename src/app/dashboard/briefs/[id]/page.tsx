"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Building2,
  Calendar,
  Tag,
  User,
  FileText,
  Rocket,
  ExternalLink,
  Download,
} from "lucide-react";

type BriefStatus = "INQUIRY" | "NEGOTIATING" | "CONFIRMED" | "ACTIVE" | "DONE" | "ARCHIVED";

interface BriefDetail {
  id: string;
  brandName: string;
  brandContact: string | null;
  inquiryDate: string;
  source: string | null;
  status: BriefStatus;

  campaignName: string | null;
  description: string | null;
  packageType: string | null;
  customPrice: number | null;
  deliverables: string | null;
  startDate: string | null;
  endDate: string | null;
  viewsGuarantee: number | null;
  requirements: string | null;

  assignedTo: string | null;
  internalNotes: string | null;
  brandNotes: string | null;

  campaignId: string | null;
  campaign: {
    id: string;
    campaignName: string;
    brandName: string;
    startDate: string;
    endDate: string;
  } | null;

  createdAt: string;
  updatedAt: string;
}

const STATUSES: { value: BriefStatus; label: string; color: string }[] = [
  { value: "INQUIRY", label: "Inquiry", color: "bg-blue-100 text-blue-700" },
  { value: "NEGOTIATING", label: "Negotiating", color: "bg-amber-100 text-amber-700" },
  { value: "CONFIRMED", label: "Confirmed", color: "bg-purple-100 text-purple-700" },
  { value: "ACTIVE", label: "Active", color: "bg-green-100 text-green-700" },
  { value: "DONE", label: "Done", color: "bg-slate-100 text-slate-700" },
  { value: "ARCHIVED", label: "Archived", color: "bg-gray-100 text-gray-500" },
];

const PACKAGE_TYPES = ["Mapres", "Kating Gaul", "Cumlaude", "Custom"];

const SOURCES = ["TikTok DM", "Instagram DM", "Email", "WhatsApp", "Referral", "Other"];

export default function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [form, setForm] = useState<Partial<BriefDetail>>({});

  async function loadBrief() {
    try {
      const res = await fetch("/api/briefs/" + id);
      const data = await res.json();
      if (data.brief) {
        setBrief(data.brief);
        setForm(data.brief);
      } else {
        toast.error(data.error || "Brief not found");
      }
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBrief();
  }, [id]);

  function update<K extends keyof BriefDetail>(key: K, value: BriefDetail[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toDateInput(iso: string | null | undefined): string {
    if (!iso) return "";
    return new Date(iso).toISOString().split("T")[0] ?? "";
  }

  async function handleSave() {
    if (!brief) return;
    if (!form.brandName?.trim()) {
      toast.error("Brand name wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        brandName: form.brandName?.trim(),
        brandContact: form.brandContact?.trim() || null,
        source: form.source || null,
        status: form.status,
        campaignName: form.campaignName?.trim() || null,
        description: form.description?.trim() || null,
        packageType: form.packageType || null,
        customPrice: form.customPrice || null,
        deliverables: form.deliverables?.trim() || null,
        viewsGuarantee: form.viewsGuarantee || null,
        requirements: form.requirements?.trim() || null,
        assignedTo: form.assignedTo?.trim() || null,
        internalNotes: form.internalNotes?.trim() || null,
        brandNotes: form.brandNotes?.trim() || null,
      };

      if (form.inquiryDate) {
        payload.inquiryDate = toDateInput(form.inquiryDate);
      }
      if (form.startDate) {
        payload.startDate = toDateInput(form.startDate);
      } else if (form.startDate === null || form.startDate === "") {
        payload.startDate = null;
      }
      if (form.endDate) {
        payload.endDate = toDateInput(form.endDate);
      } else if (form.endDate === null || form.endDate === "") {
        payload.endDate = null;
      }

      const res = await fetch("/api/briefs/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      toast.success("Brief saved");
      await loadBrief();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleConvert() {
    if (!brief) return;
    if (!form.campaignName || !form.startDate || !form.endDate) {
      toast.error("Campaign name, start date, end date wajib diisi sebelum convert. Save dulu.");
      return;
    }

    if (!confirm("Convert brief ini ke Campaign? Brief akan masuk status ACTIVE dan linked ke campaign baru.")) {
      return;
    }

    setConverting(true);
    try {
      const res = await fetch("/api/briefs/" + id + "/convert-to-campaign", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Convert failed");

      toast.success("Brief converted to Campaign");
      router.push("/dashboard/campaigns/" + data.campaign.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Convert failed");
    } finally {
      setConverting(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) return <div className="container mx-auto py-8">Loading...</div>;
  if (!brief) return <div className="container mx-auto py-8">Brief not found</div>;

  const proposalUrl = "/api/briefs/" + brief.id + "/proposal";

  const currentStatus = STATUSES.find((s) => s.value === (form.status || brief.status));
  const canConvert =
    !brief.campaignId &&
    !!form.campaignName?.trim() &&
    !!form.startDate &&
    !!form.endDate;

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Link
        href="/dashboard/briefs"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to briefs
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl flex items-center gap-2 flex-wrap">
                <Building2 className="h-5 w-5" />
                {brief.brandName}
                {currentStatus && (
                  <Badge className={currentStatus.color + " border-0 font-medium"}>
                    {currentStatus.label}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Inquiry sejak {formatDate(brief.inquiryDate)}
                {brief.source ? " - via " + brief.source : ""}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {brief.campaign && (
                <Link href={"/dashboard/campaigns/" + brief.campaign.id}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Campaign
                  </Button>
                </Link>
              )}
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Status Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="text-sm font-medium">Current Status</label>
            <select
              value={form.status || brief.status}
              onChange={(e) => update("status", e.target.value as BriefStatus)}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Klik &quot;Save Changes&quot; untuk apply.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Brand Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-4 w-4" />
            Brand Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Brand Name *"
            value={form.brandName || ""}
            onChange={(v) => update("brandName", v)}
          />
          <Field
            label="Brand Contact"
            value={form.brandContact || ""}
            onChange={(v) => update("brandContact", v)}
            placeholder="PIC nama + nomor / email"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Inquiry Date"
              type="date"
              value={toDateInput(form.inquiryDate)}
              onChange={(v) => update("inquiryDate", v)}
            />
            <div>
              <label className="text-sm font-medium">Source</label>
              <select
                value={form.source || ""}
                onChange={(e) => update("source", e.target.value)}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Pilih —</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <Field
            label="Assigned To"
            value={form.assignedTo || ""}
            onChange={(v) => update("assignedTo", v)}
            placeholder="Salman, Aqza, Irfan, Juan"
          />
        </CardContent>
      </Card>

      {/* Campaign Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Campaign Details
          </CardTitle>
          <CardDescription>
            Isi setelah negosiasi disetujui brand. Wajib lengkap sebelum convert ke campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Campaign Name"
            value={form.campaignName || ""}
            onChange={(v) => update("campaignName", v)}
            placeholder="EBI Fest 2026 Promo Campaign"
          />

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description || ""}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="Konsep, key message, brand goals..."
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Package Type</label>
              <select
                value={form.packageType || ""}
                onChange={(e) => update("packageType", e.target.value)}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Pilih —</option>
                {PACKAGE_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Field
              label="Custom Price (Rp)"
              type="number"
              value={form.customPrice ? String(form.customPrice) : ""}
              onChange={(v) => update("customPrice", v ? parseInt(v, 10) : null)}
              placeholder="400000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Start Date"
              type="date"
              value={toDateInput(form.startDate)}
              onChange={(v) => update("startDate", v)}
            />
            <Field
              label="End Date"
              type="date"
              value={toDateInput(form.endDate)}
              onChange={(v) => update("endDate", v)}
            />
          </div>

          <Field
            label="Views Guarantee"
            type="number"
            value={form.viewsGuarantee ? String(form.viewsGuarantee) : ""}
            onChange={(v) => update("viewsGuarantee", v ? parseInt(v, 10) : null)}
            placeholder="20000"
          />

          <div>
            <label className="text-sm font-medium">Deliverables</label>
            <textarea
              value={form.deliverables || ""}
              onChange={(e) => update("deliverables", e.target.value)}
              rows={3}
              placeholder="2 TikTok video, 1 story, 1 reels..."
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Special Requirements</label>
            <textarea
              value={form.requirements || ""}
              onChange={(e) => update("requirements", e.target.value)}
              rows={2}
              placeholder="Tags, do/don't, brand assets..."
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Internal Notes (team only)</label>
            <textarea
              value={form.internalNotes || ""}
              onChange={(e) => update("internalNotes", e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Brand Notes (potential brand-facing)</label>
            <textarea
              value={form.brandNotes || ""}
              onChange={(e) => update("brandNotes", e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>
        </CardContent>
      </Card>

      {/* Generate Proposal PDF */}
      {form.status === "CONFIRMED" && form.campaignName && form.startDate && form.endDate ? (
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Proposal PDF
            </CardTitle>
            <CardDescription>
              Brief sudah CONFIRMED dan field lengkap. Generate proposal PDF untuk dikirim ke brand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href={proposalUrl} target="_blank" rel="noopener">
              <Button className="w-full" size="lg">
                <Download className="mr-2 h-4 w-4" />
                Generate Proposal PDF
              </Button>
            </a>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Pastikan semua data sudah di-save dulu sebelum generate.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Convert to Campaign */}
      {!brief.campaignId && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Convert to Campaign
            </CardTitle>
            <CardDescription>
              Setelah brand approve deal, convert brief ini jadi Campaign untuk track delivery.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleConvert}
              disabled={!canConvert || converting}
              className="w-full"
              size="lg"
            >
              <Rocket className="mr-2 h-4 w-4" />
              {converting ? "Converting..." : "Convert to Campaign"}
            </Button>
            {!canConvert && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Lengkapi Campaign Name, Start Date, End Date dan SAVE dulu.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {brief.campaign && (
        <Card className="border-green-500/50 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Rocket className="h-4 w-4 text-green-700" />
              Linked Campaign
            </CardTitle>
            <CardDescription>
              Brief ini sudah converted ke campaign &quot;{brief.campaign.campaignName}&quot;
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={"/dashboard/campaigns/" + brief.campaign.id}>
              <Button variant="outline" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
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