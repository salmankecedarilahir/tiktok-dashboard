"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Download,
  Plus,
  Trash2,
  Users,
  UserPlus,
  RotateCcw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  calculateContribution,
  formatRupiah,
  DEFAULT_CONTRIBUTION_TASKS,
  ProductionCostItem,
  ProductionCostSplit,
} from "@/lib/contribution-template";

interface SystemUser {
  id: string;
  name: string;
  role: string;
}

interface PlanMember {
  id?: string;
  name: string;
  userId?: string | null;
  role?: string | null;
}

interface PlanTask {
  id?: string;
  orderNumber: number;
  title: string;
  weight: number;
  details?: string;
  isAllTeam: boolean;
  assignees: string[];
  notes?: string;
}

interface PlanData {
  id: string;
  title: string;
  brandName: string | null;
  totalAmount: number;
  objective: string | null;
  planType: string | null;
  howTo: string | null;
  notes: string | null;
  date: string;
  status: string;
  members: PlanMember[];
  tasks: PlanTask[];
  productionCosts?: ProductionCostItem[];
}

export function ContributionEditorClient({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [brandName, setBrandName] = useState("");
  const [totalAmount, setTotalAmount] = useState<number>(1000000);
  const [objective, setObjective] = useState("");
  const [planType, setPlanType] = useState("");
  const [howTo, setHowTo] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("ACTIVE");
  const [members, setMembers] = useState<PlanMember[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [productionCosts, setProductionCosts] = useState<ProductionCostItem[]>([]);

  // Dialog state: Add user
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [customMemberName, setCustomMemberName] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, usersRes] = await Promise.all([
        fetch(`/api/inhouse/contributions/${planId}`),
        fetch("/api/users"),
      ]);

      const planJson = await planRes.json();
      if (!planRes.ok) throw new Error(planJson.error || "Gagal memuat plan");

      const usersJson = await usersRes.json();
      if (usersRes.ok && usersJson.users) {
        setSystemUsers(usersJson.users);
      }

      const p = planJson.plan as PlanData;
      setPlan(p);
      setTitle(p.title || "");
      setBrandName(p.brandName || "");
      setTotalAmount(p.totalAmount || 0);
      setObjective(p.objective || "");
      setPlanType(p.planType || "");
      setHowTo(p.howTo || "");
      setNotes(p.notes || "");
      setStatus(p.status || "ACTIVE");
      setMembers(p.members || []);
      setTasks(p.tasks || []);
      setProductionCosts(p.productionCosts || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time calculation whenever members, tasks, productionCosts, or totalAmount change
  const calculation = useMemo(() => {
    return calculateContribution(
      totalAmount,
      members.map((m) => ({ name: m.name, userId: m.userId })),
      tasks.map((t) => ({
        title: t.title,
        weight: t.weight,
        isAllTeam: t.isAllTeam,
        assignees: t.assignees,
      })),
      productionCosts
    );
  }, [totalAmount, members, tasks, productionCosts]);

  const totalTasksWeight = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (Number(t.weight) || 0), 0);
  }, [tasks]);

  // Contributor management
  function handleAddExistingUser(user: SystemUser) {
    if (members.some((m) => m.name.toLowerCase() === user.name.toLowerCase())) {
      toast.error(`${user.name} sudah ada di daftar kontributor`);
      return;
    }
    setMembers((prev) => [
      ...prev,
      { name: user.name, userId: user.id, role: user.role },
    ]);
    toast.success(`${user.name} ditambahkan ke kontributor`);
  }

  function handleAddCustomMember() {
    const trimmed = customMemberName.trim();
    if (!trimmed) return;
    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`${trimmed} sudah ada di daftar kontributor`);
      return;
    }
    setMembers((prev) => [...prev, { name: trimmed, userId: null }]);
    setCustomMemberName("");
    setAddUserOpen(false);
    toast.success(`${trimmed} ditambahkan ke kontributor`);
  }

  function handleRemoveMember(name: string) {
    setMembers((prev) => prev.filter((m) => m.name !== name));
    // Also remove from task assignees
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        assignees: t.assignees.filter((a) => a !== name),
      }))
    );
    // Also remove this member from any production cost splits
    setProductionCosts((prev) =>
      prev.map((c) => {
        const updatedSplits = c.splits.filter((s) => s.memberName !== name);
        const totalAmount = updatedSplits.reduce(
          (sum, s) => sum + (Number(s.amount) || 0),
          0
        );
        return {
          ...c,
          splits: updatedSplits,
          totalAmount,
        };
      })
    );
    toast.info(`${name} dihapus dari daftar kontributor`);
  }

  // Production Cost management
  function handleAddProductionCostItem() {
    const newItem: ProductionCostItem = {
      notes: "",
      totalAmount: 0,
      splits:
        members.length > 0 && members[0]?.name
          ? [{ memberName: members[0].name, amount: 0, notes: "" }]
          : [],
    };
    setProductionCosts((prev) => [...prev, newItem]);
  }

  function handleRemoveProductionCostItem(index: number) {
    setProductionCosts((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleUpdateProductionCostNotes(index: number, notes: string) {
    setProductionCosts((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const next = [...prev];
      next[index] = { ...current, notes };
      return next;
    });
  }

  function handleAddSplit(itemIndex: number) {
    setProductionCosts((prev) => {
      const current = prev[itemIndex];
      if (!current) return prev;
      const next = [...prev];
      const existingMembers = current.splits.map((s) =>
        s.memberName.toLowerCase()
      );
      const available = members.find(
        (m) => !existingMembers.includes(m.name.toLowerCase())
      );
      const defaultName = available ? available.name : members[0]?.name || "";

      const updatedSplits: ProductionCostSplit[] = [
        ...current.splits,
        { memberName: defaultName, amount: 0, notes: "" },
      ];
      const totalAmount = updatedSplits.reduce(
        (sum, s) => sum + (Number(s.amount) || 0),
        0
      );
      next[itemIndex] = { ...current, splits: updatedSplits, totalAmount };
      return next;
    });
  }

  function handleRemoveSplit(itemIndex: number, splitIndex: number) {
    setProductionCosts((prev) => {
      const current = prev[itemIndex];
      if (!current) return prev;
      const next = [...prev];
      const updatedSplits = current.splits.filter((_, sIdx) => sIdx !== splitIndex);
      const totalAmount = updatedSplits.reduce(
        (sum, s) => sum + (Number(s.amount) || 0),
        0
      );
      next[itemIndex] = { ...current, splits: updatedSplits, totalAmount };
      return next;
    });
  }

  function handleUpdateSplit(
    itemIndex: number,
    splitIndex: number,
    updates: Partial<ProductionCostSplit>
  ) {
    setProductionCosts((prev) => {
      const current = prev[itemIndex];
      if (!current) return prev;
      const targetSplit = current.splits[splitIndex];
      if (!targetSplit) return prev;
      const next = [...prev];
      const updatedSplits: ProductionCostSplit[] = [...current.splits];
      updatedSplits[splitIndex] = {
        ...targetSplit,
        ...updates,
      };
      const totalAmount = updatedSplits.reduce(
        (sum, s) => sum + (Number(s.amount) || 0),
        0
      );
      next[itemIndex] = { ...current, splits: updatedSplits, totalAmount };
      return next;
    });
  }

  // Task management
  function handleUpdateTask(index: number, updates: Partial<PlanTask>) {
    setTasks((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const next = [...prev];
      next[index] = { ...current, ...updates };
      return next;
    });
  }

  function handleToggleAllTeam(index: number) {
    setTasks((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const next = [...prev];
      const isNowAllTeam = !current.isAllTeam;
      next[index] = {
        ...current,
        isAllTeam: isNowAllTeam,
        assignees: isNowAllTeam ? members.map((m) => m.name) : [],
      };
      return next;
    });
  }

  function handleToggleAssignee(index: number, memberName: string) {
    setTasks((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const next = [...prev];
      const exists = current.assignees.includes(memberName);
      const newAssignees = exists
        ? current.assignees.filter((a) => a !== memberName)
        : [...current.assignees, memberName];

      next[index] = {
        ...current,
        isAllTeam: false,
        assignees: newAssignees,
      };
      return next;
    });
  }

  function handleAddTask() {
    const nextOrder = tasks.length + 1;
    const newTask: PlanTask = {
      orderNumber: nextOrder,
      title: `Tahapan Baru #${nextOrder}`,
      weight: 5,
      details: "",
      isAllTeam: false,
      assignees: [],
      notes: "",
    };
    setTasks((prev) => [...prev, newTask]);
  }

  function handleRemoveTask(index: number) {
    setTasks((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      // Re-index order numbers
      return next.map((t, idx) => ({ ...t, orderNumber: idx + 1 }));
    });
  }

  function handleResetTemplate() {
    if (
      !window.confirm(
        "Reset seluruh tahapan kerja ke 13 template default dari CSV?"
      )
    ) {
      return;
    }

    const defaultTasks: PlanTask[] = DEFAULT_CONTRIBUTION_TASKS.map((t) => {
      let assignees: string[] = [];
      if (t.isAllTeam) {
        assignees = members.map((m) => m.name);
      } else if (t.defaultPic) {
        assignees = [t.defaultPic];
      }
      return {
        orderNumber: t.orderNumber,
        title: t.title,
        weight: t.weight,
        details: t.details,
        isAllTeam: t.isAllTeam,
        assignees,
        notes: t.notes ?? "",
      };
    });

    setTasks(defaultTasks);
    toast.success("Tahapan kerja di-reset ke template standar");
  }

  async function handleSave(newStatus?: string) {
    const targetStatus = newStatus || status;
    setSaving(true);
    try {
      const res = await fetch(`/api/inhouse/contributions/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          brandName: brandName || null,
          totalAmount,
          objective,
          planType,
          howTo,
          notes,
          status: targetStatus,
          members,
          tasks,
          productionCosts,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan perubahan");

      if (newStatus) setStatus(newStatus);
      toast.success(newStatus === "ACTIVE" ? "Contribution plan diaktifkan!" : "Contribution plan berhasil disimpan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      // First auto-save any unsaved edits so the PDF matches current inputs
      await fetch(`/api/inhouse/contributions/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          brandName: brandName || null,
          totalAmount,
          objective,
          planType,
          howTo,
          notes,
          status,
          members,
          tasks,
          productionCosts,
        }),
      });

      const res = await fetch(`/api/inhouse/contributions/${planId}/pdf`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengunduh PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.download = `${safeName || "laporan-kontribusi"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Laporan PDF berhasil di-download");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal download PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Memuat detail contribution plan...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-6 max-w-6xl space-y-8">
      {/* Top Header & Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/inhouse/contributions">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Kembali
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{title || "Contribution Plan"}</h1>
              <Badge
                variant="outline"
                className={
                  status === "DRAFT"
                    ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold"
                    : status === "ACTIVE"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold"
                    : "text-xs"
                }
              >
                {status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sesuaikan bobot job, tentukan PIC kontributor, dan hitung pembagian fee.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "DRAFT" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleSave("ACTIVE")}
              disabled={saving || exportingPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              Aktifkan Plan
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={exportingPdf || saving}
            className="gap-1.5"
          >
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export PDF
          </Button>
          <Button
            onClick={() => handleSave()}
            disabled={saving || exportingPdf}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {/* Plan Meta & Budget Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Informasi Brand & Total Kontrak</span>
            <Badge variant="outline" className="text-xs font-normal">
              {formatRupiah(totalAmount)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="plan-title">Judul Contribution Plan</Label>
            <Input
              id="plan-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Contribution Plan CAU - Brand ABC"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Nama Brand / Klien</Label>
            <Input
              id="brand-name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Somethinc, Erigo"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="total-amount">Total Brand Masuk (Rp)</Label>
            <Input
              id="total-amount"
              type="number"
              min="0"
              step="10000"
              value={totalAmount}
              onChange={(e) =>
                setTotalAmount(parseInt(e.target.value, 10) || 0)
              }
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="plan-objective">Objective (Tujuan)</Label>
            <Input
              id="plan-objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Membagi skema pembagian kerja..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-type">Skema / Type</Label>
            <Input
              id="plan-type"
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              placeholder="Type A, dll."
            />
          </div>
        </CardContent>
      </Card>

      {/* Section: Anggota Kontributor */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Daftar Tim Kontributor</span>
              <Badge variant="secondary" className="text-xs">
                {members.length} Orang
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih siapa saja tim yang berkontribusi pada rencana pembagian fee ini.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddUserOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Tambah Kontributor
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Belum ada kontributor dipilih. Klik &quot;Tambah Kontributor&quot; di atas.
              </p>
            ) : (
              members.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted/80 rounded-full text-xs font-medium border"
                >
                  <span>{m.name}</span>
                  {m.role && (
                    <span className="text-[10px] text-muted-foreground">
                      ({m.role})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.name)}
                    className="text-muted-foreground hover:text-destructive transition ml-1"
                    title="Hapus dari kontributor"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section: Biaya Produksi (Production Cost) */}
      <Card className="border-amber-500/30">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Biaya Produksi (Production Cost)</span>
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300"
                >
                  {formatRupiah(calculation.totalProductionCost)}
                </Badge>
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Biaya operasional produksi. Biaya ini mengurangi pemasukan brand, dan uang yang terlibat akan langsung ditambahkan ke kontributor terkait di luar persentase.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAddProductionCostItem}
            className="gap-1.5 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Biaya Produksi
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {productionCosts.length === 0 ? (
            <div className="py-6 text-center border border-dashed rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Belum ada biaya produksi. Klik &quot;Tambah Biaya Produksi&quot; jika proyek ini memiliki pengeluaran alat, transport, konsumsi, atau sewa.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {productionCosts.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className="p-3.5 rounded-lg border bg-card/60 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 min-w-[240px]">
                      <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                        Keterangan / Pos Biaya #{itemIdx + 1}
                      </Label>
                      <Input
                        value={item.notes}
                        onChange={(e) =>
                          handleUpdateProductionCostNotes(itemIdx, e.target.value)
                        }
                        placeholder="e.g. Sewa Kamera & Lighting, Bensin & Tol, Properti Shoot"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">
                          Total Pos Ini
                        </span>
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          {formatRupiah(item.totalAmount)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProductionCostItem(itemIdx)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Hapus pos biaya ini"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Sub-alokasi Orang Terlibat & Biaya per Orang */}
                  <div className="bg-muted/40 p-2.5 rounded-md border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Orang yang Terlibat & Biaya per Person:
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddSplit(itemIdx)}
                        className="h-6 text-[11px] px-2 gap-1 text-primary hover:text-primary"
                      >
                        <Plus className="h-3 w-3" />
                        Tambah Orang Terlibat
                      </Button>
                    </div>

                    {item.splits.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic py-1">
                        Belum ada orang dialokasikan untuk biaya ini. Klik &quot;+ Tambah Orang Terlibat&quot;.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {item.splits.map((split, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex flex-wrap items-center gap-2 text-xs"
                          >
                            {/* Member Dropdown */}
                            <select
                              value={split.memberName}
                              onChange={(e) =>
                                handleUpdateSplit(itemIdx, sIdx, {
                                  memberName: e.target.value,
                                })
                              }
                              className="h-8 px-2 text-xs rounded-md border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-44"
                            >
                              <option value="">-- Pilih Kontributor --</option>
                              {members.map((m) => (
                                <option key={m.name} value={m.name}>
                                  {m.name} {m.role ? `(${m.role})` : ""}
                                </option>
                              ))}
                              <option value="Vendor / Eksternal">
                                Vendor Eksternal / Kas Umum
                              </option>
                            </select>

                            {/* Amount Input */}
                            <div className="flex items-center gap-1 w-36">
                              <span className="text-[11px] text-muted-foreground">
                                Rp
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step="10000"
                                value={split.amount || ""}
                                onChange={(e) =>
                                  handleUpdateSplit(itemIdx, sIdx, {
                                    amount: Math.max(
                                      0,
                                      parseInt(e.target.value, 10) || 0
                                    ),
                                  })
                                }
                                placeholder="0"
                                className="h-8 text-xs font-medium"
                              />
                            </div>

                            {/* Split specific note */}
                            <Input
                              value={split.notes || ""}
                              onChange={(e) =>
                                handleUpdateSplit(itemIdx, sIdx, {
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Notes per orang (opsional)"
                              className="h-8 text-xs flex-1 min-w-[140px]"
                            />

                            {/* Remove Split */}
                            <button
                              type="button"
                              onClick={() => handleRemoveSplit(itemIdx, sIdx)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive flex items-center justify-center rounded transition"
                              title="Hapus orang ini dari pos biaya"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom calculation recap bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs">
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span>
                Total Brand Masuk:{" "}
                <strong className="text-foreground">
                  {formatRupiah(totalAmount)}
                </strong>
              </span>
              <span>
                Total Biaya Produksi:{" "}
                <strong className="text-amber-700 dark:text-amber-400">
                  - {formatRupiah(calculation.totalProductionCost)}
                </strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">
                Sisa Pemasukan Brand (Net Dibagi via Bobot Job):{" "}
              </span>
              <strong className="text-primary font-bold text-sm ml-1">
                {formatRupiah(calculation.netBrandAmount)}
              </strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section: Ringkasan Per Orang (Live Results Display) */}
      <Card className="border-primary/40 bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Ringkasan Per Orang (Hasil Pembagian Fee)</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Uang yang diterima dihitung dari akumulasi bobot job (berdasarkan sisa brand) ditambah biaya produksi masing-masing orang.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">
                Total Didistribusikan:
              </span>
              <span className="text-sm font-bold text-primary">
                {formatRupiah(calculation.totalDistributedAmount)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/70 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-4 text-left">Nama Kontributor</th>
                  <th className="py-2.5 px-4 text-center">Persentase (%)</th>
                  <th className="py-2.5 px-4 text-right">Fee Persen (Rp)</th>
                  <th className="py-2.5 px-4 text-right">Biaya Produksi (Rp)</th>
                  <th className="py-2.5 px-4 text-right">Total Diterima (Rp)</th>
                  <th className="py-2.5 px-4 text-left">Detail Kontribusi Job</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {calculation.memberResults.map((m) => (
                  <tr key={m.name} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {m.name}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-primary">
                      {m.percentage.toFixed(1).replace(".", ",")}%
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-muted-foreground">
                      {formatRupiah(m.feeFromPercentage)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {m.productionCost > 0 ? (
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          +{formatRupiah(m.productionCost)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatRupiah(m.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {m.breakdown.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            Belum ada job dialokasikan
                          </span>
                        ) : (
                          m.breakdown.map((b, bIdx) => (
                            <Badge
                              key={bIdx}
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 font-normal"
                              title={`${b.taskTitle} (${b.shareWeight.toFixed(2)}%)`}
                            >
                              {b.taskTitle.slice(0, 18)}
                              {b.taskTitle.length > 18 ? "..." : ""} (
                              {b.shareWeight.toFixed(1)}%)
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {calculation.unallocatedPercentage > 0 && (
                  <tr className="bg-amber-500/10 text-amber-900 dark:text-amber-200">
                    <td className="py-3 px-4 font-semibold">
                      Kas Tim / Unassigned
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {calculation.unallocatedPercentage
                        .toFixed(1)
                        .replace(".", ",")}
                      %
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {formatRupiah(calculation.unallocatedAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-muted-foreground text-xs">
                      -
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {formatRupiah(calculation.unallocatedAmount)}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      Bobot job yang belum dialokasikan PIC atau disimpan untuk kas tim
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section: Action Plan Table (13 Tahapan & Custom Tasks) */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">
                Tahapan Kerja (Action Plan) & Bobot
              </CardTitle>
              {totalTasksWeight === 100 ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs">
                  <CheckCircle className="h-3 w-3" />
                  Total Bobot Pas 100%
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  Total Bobot: {totalTasksWeight}% (
                  {totalTasksWeight < 100
                    ? `Kurang ${100 - totalTasksWeight}%`
                    : `Kelebihan ${totalTasksWeight - 100}%`}
                  )
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sesuaikan nama tahapan, bobot persentase, penugasan All Team vs PIC,
              serta notes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetTemplate}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Template CSV
            </Button>
            <Button size="sm" onClick={handleAddTask} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Tambah Tahapan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 font-semibold text-muted-foreground border-b">
                <tr>
                  <th className="py-2 px-3 text-left w-12">No</th>
                  <th className="py-2 px-3 text-left min-w-[180px]">
                    Tahapan (Action Plan)
                  </th>
                  <th className="py-2 px-3 text-center w-24">Bobot (%)</th>
                  <th className="py-2 px-3 text-left min-w-[260px]">
                    PIC / Kontributor
                  </th>
                  <th className="py-2 px-3 text-left min-w-[220px]">Details</th>
                  <th className="py-2 px-3 text-left min-w-[160px]">Notes</th>
                  <th className="py-2 px-3 text-center w-12">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tasks.map((task, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="py-2 px-3 font-semibold text-muted-foreground">
                      {task.orderNumber}
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        value={task.title}
                        onChange={(e) =>
                          handleUpdateTask(idx, { title: e.target.value })
                        }
                        className="h-8 text-xs font-medium"
                        placeholder="Nama tahapan..."
                      />
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 justify-center">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={task.weight}
                          onChange={(e) =>
                            handleUpdateTask(idx, {
                              weight: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 w-16 text-center text-xs font-bold"
                        />
                        <span className="text-muted-foreground font-semibold">%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={task.isAllTeam ? "default" : "outline"}
                            className="h-6 text-[11px] px-2 py-0"
                            onClick={() => handleToggleAllTeam(idx)}
                          >
                            All team ({members.length})
                          </Button>
                        </div>

                        {!task.isAllTeam && (
                          <div className="flex flex-wrap gap-1">
                            {members.map((m) => {
                              const isSelected = task.assignees.includes(m.name);
                              return (
                                <button
                                  key={m.name}
                                  type="button"
                                  onClick={() =>
                                    handleToggleAssignee(idx, m.name)
                                  }
                                  className={`text-[10px] px-2 py-0.5 rounded transition ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground font-semibold"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {m.name}
                                </button>
                              );
                            })}
                            {task.assignees.length === 0 && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                Belum ada PIC
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        value={task.details || ""}
                        onChange={(e) =>
                          handleUpdateTask(idx, { details: e.target.value })
                        }
                        className="h-8 text-xs text-muted-foreground"
                        placeholder="Keterangan detail..."
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        value={task.notes || ""}
                        onChange={(e) =>
                          handleUpdateTask(idx, { notes: e.target.value })
                        }
                        className="h-8 text-xs text-muted-foreground"
                        placeholder="Notes (mis. siapa yg gak ikut)..."
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTask(idx)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save bar */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/inhouse/contributions">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali ke Daftar
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {status === "DRAFT" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleSave("ACTIVE")}
              disabled={saving || exportingPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              Aktifkan Plan
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={exportingPdf || saving}
            className="gap-1.5"
          >
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export PDF
          </Button>
          <Button
            onClick={() => handleSave()}
            disabled={saving || exportingPdf}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {/* Modal: Tambah Kontributor */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Tambah Tim Kontributor</DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Pilih Dari User Sistem CAU:
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {systemUsers.map((u) => {
                  const already = members.some(
                    (m) => m.name.toLowerCase() === u.name.toLowerCase()
                  );
                  return (
                    <Button
                      key={u.id}
                      type="button"
                      variant={already ? "secondary" : "outline"}
                      disabled={already}
                      onClick={() => handleAddExistingUser(u)}
                      className="justify-between text-xs h-9"
                    >
                      <span className="font-semibold">{u.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {already ? "✓ Ada" : `+ ${u.role}`}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="border-t pt-3">
              <Label
                htmlFor="custom-name"
                className="text-xs font-semibold text-muted-foreground mb-1.5 block"
              >
                Atau Tambah Nama Kontributor Kustom:
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="custom-name"
                  value={customMemberName}
                  onChange={(e) => setCustomMemberName(e.target.value)}
                  placeholder="Nama anggota / talent luar..."
                  className="text-xs h-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomMember();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddCustomMember}
                  className="text-xs h-9"
                >
                  Tambah
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddUserOpen(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
