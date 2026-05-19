"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Plus, Trash2 } from "lucide-react";

interface Location {
  name: string;
  percent: number;
}

interface ChannelConfig {
  channelName: string;
  channelHandle: string;
  totalFollowers: number;
  femalePercent: number;
  malePercent: number;
  age18_24Percent: number;
  age25_34Percent: number;
  age35plusPercent: number;
  topLocations: Location[];
  brandColor: string;
  tagline: string | null;
}

const DEFAULT_CONFIG: ChannelConfig = {
  channelName: "Circle Anak UPN",
  channelHandle: "@abangabanganthis",
  totalFollowers: 4134,
  femalePercent: 60,
  malePercent: 40,
  age18_24Percent: 70,
  age25_34Percent: 20,
  age35plusPercent: 10,
  topLocations: [
    { name: "Jakarta", percent: 35 },
    { name: "Depok", percent: 18 },
    { name: "Tangerang", percent: 12 },
  ],
  brandColor: "#DC2626",
  tagline: "Bridging the gap between corporate and campus culture",
};

export default function ChannelConfigPage() {
  const [config, setConfig] = useState<ChannelConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/channel-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setConfig({
            channelName: data.config.channelName,
            channelHandle: data.config.channelHandle,
            totalFollowers: data.config.totalFollowers,
            femalePercent: data.config.femalePercent,
            malePercent: data.config.malePercent,
            age18_24Percent: data.config.age18_24Percent,
            age25_34Percent: data.config.age25_34Percent,
            age35plusPercent: data.config.age35plusPercent,
            topLocations: data.config.topLocations ?? [],
            brandColor: data.config.brandColor,
            tagline: data.config.tagline,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/channel-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Channel config saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof ChannelConfig>(key: K, value: ChannelConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function updateLocation(idx: number, patch: Partial<Location>) {
    setConfig((c) => ({
      ...c,
      topLocations: c.topLocations.map((loc, i) => (i === idx ? { ...loc, ...patch } : loc)),
    }));
  }

  function addLocation() {
    setConfig((c) => ({
      ...c,
      topLocations: [...c.topLocations, { name: "", percent: 0 }],
    }));
  }

  function removeLocation(idx: number) {
    setConfig((c) => ({
      ...c,
      topLocations: c.topLocations.filter((_, i) => i !== idx),
    }));
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  const genderTotal = config.femalePercent + config.malePercent;
  const ageTotal = config.age18_24Percent + config.age25_34Percent + config.age35plusPercent;

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Channel Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Demographic data CAU. Manual input dari TikTok Studio → Analytics → Audience tab.
          Update setiap kali audience data berubah signifikan.
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Channel Name"
              value={config.channelName}
              onChange={(v) => updateField("channelName", v)}
            />
            <Field
              label="Channel Handle"
              value={config.channelHandle}
              onChange={(v) => updateField("channelHandle", v)}
            />
            <Field
              label="Total Followers"
              type="number"
              value={String(config.totalFollowers)}
              onChange={(v) => updateField("totalFollowers", parseInt(v, 10) || 0)}
            />
            <Field
              label="Tagline"
              value={config.tagline ?? ""}
              onChange={(v) => updateField("tagline", v || null)}
              placeholder="Bridging the gap between corporate and campus culture"
            />
          </CardContent>
        </Card>

        {/* Gender */}
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
            <CardDescription>
              Total: {genderTotal}% {genderTotal !== 100 && <span className="text-amber-600">(harus 100%)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Female %"
              type="number"
              value={String(config.femalePercent)}
              onChange={(v) => updateField("femalePercent", parseFloat(v) || 0)}
            />
            <Field
              label="Male %"
              type="number"
              value={String(config.malePercent)}
              onChange={(v) => updateField("malePercent", parseFloat(v) || 0)}
            />
          </CardContent>
        </Card>

        {/* Age */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
            <CardDescription>
              Total: {ageTotal}% {ageTotal !== 100 && <span className="text-amber-600">(harus 100%)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Age 18-24 %"
              type="number"
              value={String(config.age18_24Percent)}
              onChange={(v) => updateField("age18_24Percent", parseFloat(v) || 0)}
            />
            <Field
              label="Age 25-34 %"
              type="number"
              value={String(config.age25_34Percent)}
              onChange={(v) => updateField("age25_34Percent", parseFloat(v) || 0)}
            />
            <Field
              label="Age 35+ %"
              type="number"
              value={String(config.age35plusPercent)}
              onChange={(v) => updateField("age35plusPercent", parseFloat(v) || 0)}
            />
          </CardContent>
        </Card>

        {/* Top Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Top Locations</CardTitle>
            <CardDescription>Top kota/region audience CAU (max 10)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.topLocations.map((loc, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">Location</label>
                  <input
                    type="text"
                    value={loc.name}
                    onChange={(e) => updateLocation(idx, { name: e.target.value })}
                    className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Jakarta"
                  />
                </div>
                <div className="w-24">
                  <label className="text-sm font-medium">%</label>
                  <input
                    type="number"
                    value={loc.percent}
                    onChange={(e) => updateLocation(idx, { percent: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLocation(idx)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLocation}
              disabled={config.topLocations.length >= 10}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Location
            </Button>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Untuk PDF report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Brand Color</label>
              <div className="mt-1 flex gap-2 items-center">
                <input
                  type="color"
                  value={config.brandColor}
                  onChange={(e) => updateField("brandColor", e.target.value)}
                  className="h-10 w-20 rounded cursor-pointer border"
                />
                <input
                  type="text"
                  value={config.brandColor}
                  onChange={(e) => updateField("brandColor", e.target.value)}
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono"
                  placeholder="#DC2626"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Channel Config"}
        </Button>
      </div>
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