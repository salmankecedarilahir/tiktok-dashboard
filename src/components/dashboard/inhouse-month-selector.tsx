"use client";

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const YEARS = [2024, 2025, 2026, 2027];

export function InhouseMonthSelector({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (next: { month: number; year: number }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) =>
          onChange({ month: Number(e.target.value), year })
        }
        className="h-8 rounded-md border bg-background px-2.5 text-sm"
        aria-label="Bulan"
      >
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) =>
          onChange({ month, year: Number(e.target.value) })
        }
        className="h-8 rounded-md border bg-background px-2.5 text-sm"
        aria-label="Tahun"
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
