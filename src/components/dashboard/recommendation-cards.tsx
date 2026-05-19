"use client";

import type {
  PostingTimeRec,
  HashtagRec,
  DurationRec,
  CaptionPatternRec,
} from "@/lib/recommendations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Hash, Timer, Sparkles } from "lucide-react";

interface Props {
  data: {
    postingTimes: PostingTimeRec[];
    hashtags: HashtagRec[];
    durations: DurationRec[];
    captionPatterns: CaptionPatternRec[];
  };
}

const EMPTY_MESSAGE = "Belum cukup data untuk insight ini";

export function RecommendationCards({ data }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Posting Time */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <CardTitle>Best Posting Time</CardTitle>
          </div>
          <CardDescription>Top performer time slots (last 90 days)</CardDescription>
        </CardHeader>
        <CardContent>
          {data.postingTimes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{EMPTY_MESSAGE}</p>
          ) : (
            <ul className="space-y-2">
              {data.postingTimes.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="font-mono shrink-0">
                    {String(rec.hour).padStart(2, "0")}:00
                  </Badge>
                  <span>{rec.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Hashtags */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-purple-500" />
            <CardTitle>Winning Hashtags</CardTitle>
          </div>
          <CardDescription>Hashtags with highest like rate</CardDescription>
        </CardHeader>
        <CardContent>
          {data.hashtags.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{EMPTY_MESSAGE}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.hashtags.slice(0, 8).map((rec, i) => (
                <Badge key={i} variant="secondary" className="font-mono">
                  {rec.hashtag}{" "}
                  <span className="ml-1 text-muted-foreground">
                    {rec.avgLikeRatePct.toFixed(1)}%
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-green-500" />
            <CardTitle>Sweet Spot Duration</CardTitle>
          </div>
          <CardDescription>Video length vs engagement</CardDescription>
        </CardHeader>
        <CardContent>
          {data.durations.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{EMPTY_MESSAGE}</p>
          ) : (
            <ul className="space-y-2">
              {data.durations.map((rec, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {rec.bucket}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      ({rec.sampleSize} video)
                    </span>
                  </span>
                  <span className="font-mono">{rec.avgLikeRatePct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Caption Pattern */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle>Repeat Winners</CardTitle>
          </div>
          <CardDescription>Caption patterns from top 10</CardDescription>
        </CardHeader>
        <CardContent>
          {data.captionPatterns.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{EMPTY_MESSAGE}</p>
          ) : (
            <ul className="space-y-2">
              {data.captionPatterns.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0 font-mono">
                    {rec.occurrences}x
                  </Badge>
                  <span>{rec.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
