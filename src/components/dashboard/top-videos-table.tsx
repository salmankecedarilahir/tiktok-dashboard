"use client";

import type { TopVideo } from "@/lib/ranking";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ExternalLink } from "lucide-react";

interface Props {
  videos: TopVideo[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function scoreColor(score: number): "default" | "secondary" | "outline" {
  if (score >= 8) return "default";
  if (score >= 4) return "secondary";
  return "outline";
}

export function TopVideosTable({ videos }: Props) {
  if (videos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Belum ada video yang memenuhi threshold. Coba run{" "}
        <code className="bg-muted px-1 py-0.5 rounded">pnpm scrape</code> dulu.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Video</TableHead>
            <TableHead className="w-24 text-center">Score</TableHead>
            <TableHead className="w-24 text-right">Views</TableHead>
            <TableHead className="w-24 text-right">Likes</TableHead>
            <TableHead className="w-24 text-right">Comments</TableHead>
            <TableHead className="w-24 text-right">Shares</TableHead>
            <TableHead className="w-32">Posted</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-mono font-semibold">{v.rank}</TableCell>
              <TableCell>
                <div className="max-w-md">
                  <p className="font-medium line-clamp-2">
                    {v.caption ?? <span className="text-muted-foreground italic">No caption</span>}
                  </p>
                  {v.hashtags.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {v.hashtags.slice(0, 5).join(" ")}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={scoreColor(v.relevanceScore)} className="font-mono">
                  {v.relevanceScore.toFixed(2)}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatNumber(v.metrics.views)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatNumber(v.metrics.likes)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatNumber(v.metrics.comments)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatNumber(v.metrics.shares)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDistanceToNow(v.postedAt, {
                  addSuffix: true,
                  locale: idLocale,
                })}
              </TableCell>
              <TableCell>
                {v.videoUrl && (
                  <a
                    href={v.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
