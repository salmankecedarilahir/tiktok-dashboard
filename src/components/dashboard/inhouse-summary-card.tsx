"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export interface MonthlyTotals {
  videoCount: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  avgEngagement: number;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

export function InhouseSummaryCard({ totals }: { totals: MonthlyTotals }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
          Monthly Totals — {totals.videoCount} video
          {totals.videoCount !== 1 ? "s" : ""}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Views" value={formatNumber(totals.views)} />
          <Stat label="Likes" value={formatNumber(totals.likes)} />
          <Stat label="Comments" value={formatNumber(totals.comments)} />
          <Stat label="Shares" value={formatNumber(totals.shares)} />
          <Stat
            label="Avg Engagement"
            value={totals.avgEngagement.toFixed(2) + "%"}
          />
        </div>
      </CardContent>
    </Card>
  );
}
