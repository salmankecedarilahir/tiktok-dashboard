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

export interface MemberCalculation {
  name: string;
  userId?: string | null;
  percentage: number;
  amount: number;
  breakdown: Array<{
    taskTitle: string;
    taskWeight: number;
    shareWeight: number;
  }>;
}

export interface ContributionCalculationResult {
  totalAmount: number;
  totalAllocatedPercentage: number;
  totalAllocatedAmount: number;
  unallocatedPercentage: number;
  unallocatedAmount: number;
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
  }>
): ContributionCalculationResult {
  const memberMap = new Map<
    string,
    {
      name: string;
      userId?: string | null;
      percentage: number;
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
      breakdown: [],
    });
  }

  const memberCount = members.length;

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

  const memberResults: MemberCalculation[] = [];
  let totalAllocatedPercentage = 0;
  let totalAllocatedAmount = 0;

  for (const m of members) {
    const key = m.name.trim().toLowerCase();
    const item = memberMap.get(key);
    const rawPct = item ? item.percentage : 0;
    // Round percentage to 2 decimal places
    const percentage = Math.round(rawPct * 100) / 100;
    const amount = Math.round((percentage / 100) * totalAmount);

    totalAllocatedPercentage += percentage;
    totalAllocatedAmount += amount;

    memberResults.push({
      name: m.name.trim(),
      userId: m.userId,
      percentage,
      amount,
      breakdown: item?.breakdown ?? [],
    });
  }

  totalAllocatedPercentage = Math.round(totalAllocatedPercentage * 100) / 100;
  const unallocatedPercentage = Math.max(
    0,
    Math.round((100 - totalAllocatedPercentage) * 100) / 100
  );
  const unallocatedAmount = Math.max(0, totalAmount - totalAllocatedAmount);

  return {
    totalAmount,
    totalAllocatedPercentage,
    totalAllocatedAmount,
    unallocatedPercentage,
    unallocatedAmount,
    memberResults,
  };
}

export function formatRupiah(n: number | bigint): string {
  const val = typeof n === "bigint" ? Number(n) : n;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}
