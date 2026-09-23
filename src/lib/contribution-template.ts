export interface DefaultTaskTemplate {
  orderNumber: number;
  title: string;
  weight: number;
  details: string;
  isAllTeam: boolean;
  defaultPic?: string;
  notes?: string;
}

export const DEFAULT_CONTRIBUTION_TASKS: DefaultTaskTemplate[] = [
  {
    orderNumber: 1,
    title: "Komunikasi dengan Client",
    weight: 2.0,
    details: "Menerima brief awal dan merespons pertanyaan dasar.",
    isAllTeam: false,
    defaultPic: "Juan",
  },
  {
    orderNumber: 2,
    title: "Nego harga dengan Team",
    weight: 5.0,
    details: "Menentukan harga, deadline, dan batasan kerja yang disepakati.",
    isAllTeam: false,
    defaultPic: "Juan",
  },
  {
    orderNumber: 3,
    title: "Scripting & Konsep Video",
    weight: 15.0,
    details:
      "Proses kreatif memeras otak meracik ide, hook, dan jalan cerita yang sesuai brief.",
    isAllTeam: false,
    defaultPic: "Aqza",
  },
  {
    orderNumber: 4,
    title: "Fixasi Script Video",
    weight: 5.0,
    details:
      "Tahap persetujuan naskah (baik secara internal maupun ke pihak brand) agar tidak ada salah arah sebelum shoot.",
    isAllTeam: true,
    defaultPic: "All team",
  },
  {
    orderNumber: 5,
    title: "Take Content (Shooting)",
    weight: 35.0,
    details:
      "Tahap paling menguras energi fisik, mengatur alat, menyesuaikan mood, dan berakting.",
    isAllTeam: true,
    defaultPic: "All team",
  },
  {
    orderNumber: 6,
    title: "Editing Content",
    weight: 20.0,
    details:
      "Membutuhkan ketelitian tinggi untuk transisi, color grading, subtitle, dan memastikan video enak ditonton.",
    isAllTeam: false,
  },
  {
    orderNumber: 7,
    title: "Komunikasi After Video Selesai",
    weight: 2.0,
    details: "Mengirimkan draft video (watermarked) ke klien untuk direview.",
    isAllTeam: false,
    defaultPic: "Juan",
  },
  {
    orderNumber: 8,
    title: "Pembagian Uang",
    weight: 2.0,
    details:
      "Proses administrasi pencairan invoice dan mendistribusikan profit sesuai kesepakatan persentase.",
    isAllTeam: false,
    defaultPic: "Juan",
  },
  {
    orderNumber: 9,
    title: "Weekly Contribution (Bonus)",
    weight: 10.0,
    details: "Minimal Per orang harus buat 1 video / weekly",
    isAllTeam: true,
    defaultPic: "All team",
  },
  {
    orderNumber: 10,
    title: "Sharing Jadwal & Make Sure team",
    weight: 1.0,
    details:
      "(Poin Tambahan) Pengecekan internal sebelum video dikirim, dan melayani permintaan revisi (biasanya minor) dari klien.",
    isAllTeam: false,
    defaultPic: "Juan",
  },
  {
    orderNumber: 11,
    title: "Internal Revision & Insight Content (Weekly Report)",
    weight: 1.0,
    details: "Revisi Mingguan",
    isAllTeam: false,
    defaultPic: "Juan",
  },
  {
    orderNumber: 12,
    title: "Maintaining Web CAU",
    weight: 1.0,
    details: "-",
    isAllTeam: false,
    defaultPic: "Juan",
  },
  {
    orderNumber: 13,
    title: "Make Sure content Posted to 2 Media (tiktok & instagram)",
    weight: 1.0,
    details: "-",
    isAllTeam: false,
    defaultPic: "Juan",
  },
];

export const DEFAULT_OBJECTIVE =
  "Membagi skema pembagian kerja di CAU, jika ada brand masuk untuk menghasilkan hasil yang transparan & sesuai dengan kontribusi dalam pembuatan video";

export const DEFAULT_PLAN_TYPE =
  "Type A: Brand Masuk tanpa pitching (chat lewat manager Juan)";

export const DEFAULT_HOW_TO = "Based On Kesepakatan";

export interface ProductionCostSplit {
  memberName: string;
  amount: number;
  notes?: string;
}

export interface ProductionCostItem {
  id?: string;
  notes: string;
  totalAmount: number;
  splits: ProductionCostSplit[];
}

export interface MemberCalculation {
  name: string;
  userId?: string | null;
  percentage: number;
  feeFromPercentage: number;
  productionCost: number;
  amount: number; // total = feeFromPercentage + productionCost
  breakdown: Array<{
    taskTitle: string;
    taskWeight: number;
    shareWeight: number;
  }>;
}

export interface ContributionCalculationResult {
  totalAmount: number;
  totalProductionCost: number;
  netBrandAmount: number;
  totalAllocatedPercentage: number;
  totalAllocatedAmount: number;
  unallocatedPercentage: number;
  unallocatedAmount: number;
  totalDistributedAmount: number;
  memberResults: MemberCalculation[];
}

export function calculateContribution(
  totalAmount: number,
  members: Array<{ name: string; userId?: string | null }>,
  tasks: Array<{
    title: string;
    weight: number;
    isAllTeam: boolean;
    assignees: string[];
  }>,
  productionCosts?: Array<{
    notes?: string | null;
    totalAmount?: number | bigint;
    splits?: Array<{ memberName: string; amount: number; notes?: string }> | unknown;
  }>
): ContributionCalculationResult {
  const memberMap = new Map<
    string,
    {
      name: string;
      userId?: string | null;
      percentage: number;
      productionCost: number;
      breakdown: Array<{
        taskTitle: string;
        taskWeight: number;
        shareWeight: number;
      }>;
    }
  >();

  for (const m of members) {
    const key = m.name.trim().toLowerCase();
    memberMap.set(key, {
      name: m.name.trim(),
      userId: m.userId,
      percentage: 0,
      productionCost: 0,
      breakdown: [],
    });
  }

  // 1. Calculate Production Costs and per-member allocation
  let totalProductionCost = 0;
  if (Array.isArray(productionCosts)) {
    for (const cost of productionCosts) {
      const rawSplits = Array.isArray(cost.splits) ? cost.splits : [];
      if (rawSplits.length > 0) {
        for (const s of rawSplits) {
          const splitAmount = Math.max(0, Math.round(Number(s.amount) || 0));
          totalProductionCost += splitAmount;
          const sKey = (s.memberName || "").trim().toLowerCase();
          const target = memberMap.get(sKey);
          if (target) {
            target.productionCost += splitAmount;
          }
        }
      } else {
        const itemAmount = Math.max(
          0,
          Math.round(Number(cost.totalAmount) || 0)
        );
        totalProductionCost += itemAmount;
      }
    }
  }

  // Net brand amount distributed based on task percentage
  const netBrandAmount = Math.max(0, totalAmount - totalProductionCost);

  const memberCount = members.length;

  // 2. Distribute task percentages
  for (const task of tasks) {
    const taskWeight = Number(task.weight) || 0;
    if (taskWeight <= 0) continue;

    if (task.isAllTeam) {
      if (memberCount > 0) {
        const share = taskWeight / memberCount;
        for (const m of members) {
          const key = m.name.trim().toLowerCase();
          const target = memberMap.get(key);
          if (target) {
            target.percentage += share;
            target.breakdown.push({
              taskTitle: task.title,
              taskWeight,
              shareWeight: share,
            });
          }
        }
      }
    } else {
      // Find matching assignees among plan members
      const activeAssignees = (task.assignees || [])
        .map((a) => a.trim().toLowerCase())
        .filter((a) => a && memberMap.has(a));

      if (activeAssignees.length > 0) {
        const share = taskWeight / activeAssignees.length;
        for (const aKey of activeAssignees) {
          const target = memberMap.get(aKey);
          if (target) {
            target.percentage += share;
            target.breakdown.push({
              taskTitle: task.title,
              taskWeight,
              shareWeight: share,
            });
          }
        }
      }
    }
  }

  // 3. Compile member results with exact balanced allocation (Largest Remainder Method)
  const rawPercentages = members.map((m) => {
    const key = m.name.trim().toLowerCase();
    const item = memberMap.get(key);
    return item ? item.percentage : 0;
  });

  const totalRawPercentage = rawPercentages.reduce((a, b) => a + b, 0);
  const targetAllocatedPercentage =
    Math.round(totalRawPercentage * 100) / 100;

  // Allocate percentage in basis points (hundredths of a percent) so sum matches targetAllocatedPercentage exactly
  const hundredths = allocateIntegers(
    Math.round(targetAllocatedPercentage * 100),
    rawPercentages
  );
  const roundedPercentages = hundredths.map((h) => h / 100);

  // Allocate netBrandAmount among members so sum(feeFromPercentage) matches targetAllocatedAmount exactly
  const targetAllocatedAmount = Math.round(
    (targetAllocatedPercentage / 100) * netBrandAmount
  );
  const allocatedFees = allocateIntegers(
    targetAllocatedAmount,
    rawPercentages
  );

  const memberResults: MemberCalculation[] = [];
  let totalAllocatedPercentage = 0;
  let totalAllocatedAmount = 0;

  members.forEach((m, idx) => {
    const key = m.name.trim().toLowerCase();
    const item = memberMap.get(key);
    const percentage = roundedPercentages[idx] ?? 0;
    const feeFromPercentage = allocatedFees[idx] ?? 0;
    const prodCost = item ? item.productionCost : 0;
    const amount = feeFromPercentage + prodCost;

    totalAllocatedPercentage += percentage;
    totalAllocatedAmount += feeFromPercentage;

    memberResults.push({
      name: m.name.trim(),
      userId: m.userId,
      percentage,
      feeFromPercentage,
      productionCost: prodCost,
      amount,
      breakdown: item?.breakdown ?? [],
    });
  });

  totalAllocatedPercentage = Math.round(totalAllocatedPercentage * 100) / 100;
  const unallocatedPercentage = Math.max(
    0,
    Math.round((100 - totalAllocatedPercentage) * 100) / 100
  );
  const unallocatedAmount = Math.max(
    0,
    netBrandAmount - totalAllocatedAmount
  );

  const totalDistributedAmount = totalAllocatedAmount + totalProductionCost;

  return {
    totalAmount,
    totalProductionCost,
    netBrandAmount,
    totalAllocatedPercentage,
    totalAllocatedAmount,
    unallocatedPercentage,
    unallocatedAmount,
    totalDistributedAmount,
    memberResults,
  };
}

/**
 * Largest Remainder Method (Hare-Niemeyer) for distributing an integer total
 * proportionally according to weights without rounding accumulation errors.
 */
function allocateIntegers(total: number, weights: number[]): number[] {
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights === 0 || total === 0) return weights.map(() => 0);

  const exacts = weights.map((w) => (w / sumWeights) * total);
  const floors = exacts.map((e) => Math.floor(e));
  const remainders = exacts.map((e, i) => ({ index: i, rem: e - (floors[i] ?? 0) }));

  let diff = total - floors.reduce((a, b) => a + b, 0);

  // Distribute the remaining units to the largest fractional remainders
  remainders.sort((a, b) => b.rem - a.rem);

  const result = [...floors];
  for (let i = 0; i < diff && i < remainders.length; i++) {
    const targetIdx = remainders[i]?.index;
    if (targetIdx !== undefined && result[targetIdx] !== undefined) {
      result[targetIdx]++;
    }
  }

  return result;
}

export function formatRupiah(n: number | bigint): string {
  const val = typeof n === "bigint" ? Number(n) : n;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}
