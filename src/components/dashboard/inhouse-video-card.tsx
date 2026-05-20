"use client";

import { ExternalLink, Pencil, Trash2, Calendar } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export interface InhouseVideoWithEngagement {
  id: string;
  tiktokUrl: string;
  tiktokVideoId: string;
  caption: string | null;
  weekNumber: number;
  month: number;
  year: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  evaluation: string | null;
  postedAt: string | null;
  weeklyReportId: string | null;
  engagementRate: number;
}

function engagementVariant(
  rate: number
): "default" | "secondary" | "outline" | "destructive" {
  if (rate > 5) return "default"; // hijau-ish primary
  if (rate >= 2) return "secondary";
  return "destructive";
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function InhouseVideoCard({
  video,
  onEdit,
  onDelete,
}: {
  video: InhouseVideoWithEngagement;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const caption =
    video.caption && video.caption.trim().length > 0
      ? video.caption
      : "Untitled Video";

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold text-sm leading-snug line-clamp-2 flex-1"
            title={caption}
          >
            {caption}
          </h3>
          <a
            href={video.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground shrink-0"
            title="Buka di TikTok"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {video.postedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Diposting {formatDateShort(video.postedAt)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border bg-muted/30 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Views
            </div>
            <div className="font-semibold">{formatNumber(video.views)}</div>
          </div>
          <div className="rounded-md border bg-muted/30 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Likes
            </div>
            <div className="font-semibold">{formatNumber(video.likes)}</div>
          </div>
          <div className="rounded-md border bg-muted/30 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Comments
            </div>
            <div className="font-semibold">{formatNumber(video.comments)}</div>
          </div>
          <div className="rounded-md border bg-muted/30 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Shares
            </div>
            <div className="font-semibold">{formatNumber(video.shares)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Engagement</span>
          <Badge variant={engagementVariant(video.engagementRate)}>
            {video.engagementRate.toFixed(2)}%
          </Badge>
        </div>

        {video.evaluation && video.evaluation.trim().length > 0 && (
          <p
            className="text-xs italic text-muted-foreground line-clamp-2"
            title={video.evaluation}
          >
            {video.evaluation}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1 border-t -mx-4 -mb-4 px-4 py-2 mt-1 bg-muted/20 rounded-b-xl">
          <Button variant="ghost" size="sm" onClick={onEdit} className="flex-1">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="flex-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
