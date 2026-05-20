import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";

// ============================================
// TYPES
// ============================================

export interface InhouseWeeklyReportData {
  weekNumber: number;
  month: number;
  year: number;
  weekSummary: string | null;
  generatedAt: string;
  videos: Array<{
    id: string;
    tiktokUrl: string;
    tiktokVideoId: string;
    caption: string | null;
    postedAt: string | null;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    evaluation: string | null;
  }>;
  channelConfig: {
    channelName: string;
    channelHandle: string;
  } | null;
}

// ============================================
// HELPERS
// ============================================

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatNumber(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calculateEngagement(v: {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}): number {
  if (!v.views) return 0;
  return ((v.likes + v.comments + v.shares) / v.views) * 100;
}

function getWeekDateRange(
  weekNumber: number,
  month: number,
  year: number
): { start: number; end: number } {
  const lastDay = new Date(year, month, 0).getDate();
  switch (weekNumber) {
    case 1:
      return { start: 1, end: 7 };
    case 2:
      return { start: 8, end: 14 };
    case 3:
      return { start: 15, end: 21 };
    case 4:
      return { start: 22, end: lastDay };
    default:
      return { start: 1, end: lastDay };
  }
}

// ============================================
// COLORS
// ============================================

const COLORS = {
  primary: "#DC2626",
  primaryDark: "#991B1B",
  text: "#1a1a1a",
  muted: "#666666",
  light: "#999999",
  border: "#e5e5e5",
  bgLight: "#f9fafb",
  bgAccent: "#fef2f2",
  white: "#ffffff",
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: COLORS.text,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  pageHeaderBrand: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },
  pageHeaderHandle: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 1,
  },
  pageHeaderLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  pageHeaderTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginTop: 2,
    textAlign: "right",
  },

  titleBlock: {
    marginBottom: 22,
  },
  titleMain: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  titleSub: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 4,
    fontFamily: "Helvetica-Bold",
  },
  titleMeta: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 6,
  },

  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  summaryBox: {
    backgroundColor: COLORS.bgLight,
    padding: 16,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  summaryCell: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 90,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginTop: 2,
    letterSpacing: -0.3,
  },

  evalBox: {
    backgroundColor: COLORS.bgAccent,
    padding: 14,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  evalText: {
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.5,
  },
  evalEmpty: {
    fontSize: 10,
    color: COLORS.light,
    fontStyle: "italic",
  },

  videoCard: {
    padding: 12,
    backgroundColor: COLORS.bgLight,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  videoHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  videoNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    width: 22,
  },
  videoTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    flex: 1,
    lineHeight: 1.3,
  },
  videoUrl: {
    fontSize: 8,
    color: COLORS.muted,
    marginLeft: 22,
    textDecoration: "underline",
  },
  videoMeta: {
    fontSize: 8,
    color: COLORS.muted,
    marginLeft: 22,
    marginTop: 2,
  },
  videoStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
    marginLeft: 22,
  },
  videoStat: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  videoStatValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },
  videoStatLabel: {
    fontSize: 8,
    color: COLORS.muted,
  },
  engBadge: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  videoEvalLabel: {
    fontSize: 8,
    color: COLORS.primary,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
    marginLeft: 22,
  },
  videoEvalText: {
    fontSize: 9,
    color: COLORS.text,
    marginLeft: 22,
    marginTop: 3,
    lineHeight: 1.45,
  },
  videoEvalEmpty: {
    fontSize: 9,
    color: COLORS.light,
    marginLeft: 22,
    marginTop: 3,
    fontStyle: "italic",
  },

  emptyState: {
    padding: 30,
    textAlign: "center",
    fontSize: 11,
    color: COLORS.muted,
    backgroundColor: COLORS.bgLight,
    borderRadius: 6,
  },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: COLORS.light,
  },
  footerPage: {
    fontSize: 8,
    color: COLORS.light,
    fontFamily: "Helvetica-Bold",
  },
});

// ============================================
// MAIN COMPONENT
// ============================================

export function InhouseWeeklyReportPDF({
  data,
}: {
  data: InhouseWeeklyReportData;
}) {
  const cn = data.channelConfig?.channelName || "CAU Tools";
  const ch = data.channelConfig?.channelHandle || "";

  const range = getWeekDateRange(data.weekNumber, data.month, data.year);
  const monthName = MONTH_NAMES[data.month - 1] ?? "";
  const rangeLabel =
    range.start + "-" + range.end + " " + monthName + " " + data.year;

  const totalViews = data.videos.reduce((s, v) => s + v.views, 0);
  const totalLikes = data.videos.reduce((s, v) => s + v.likes, 0);
  const totalComments = data.videos.reduce((s, v) => s + v.comments, 0);
  const totalShares = data.videos.reduce((s, v) => s + v.shares, 0);
  const avgEng =
    data.videos.length === 0
      ? 0
      : data.videos.reduce((s, v) => s + calculateEngagement(v), 0) /
        data.videos.length;

  return (
    <Document
      title={cn + " - Inhouse Week " + data.weekNumber + " Report"}
      author={cn}
      creator="Inhouse Weekly Report Generator"
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageHeaderBrand}>{cn}</Text>
            {ch ? <Text style={styles.pageHeaderHandle}>{ch}</Text> : null}
          </View>
          <View>
            <Text style={styles.pageHeaderLabel}>Inhouse Report</Text>
            <Text style={styles.pageHeaderTitle}>Week {data.weekNumber}</Text>
          </View>
        </View>

        {/* TITLE BLOCK */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleMain}>Inhouse Weekly Report</Text>
          <Text style={styles.titleSub}>
            Week {data.weekNumber} — {rangeLabel}
          </Text>
          <Text style={styles.titleMeta}>
            Generated: {formatDate(data.generatedAt)}
          </Text>
        </View>

        {/* SUMMARY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Total Videos</Text>
                <Text style={styles.summaryValue}>{data.videos.length}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Total Views</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(totalViews)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Total Likes</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(totalLikes)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Total Comments</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(totalComments)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Total Shares</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(totalShares)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Avg Engagement</Text>
                <Text style={styles.summaryValue}>{avgEng.toFixed(2)}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* WEEK SUMMARY / EVALUASI KESELURUHAN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evaluasi Mingguan</Text>
          <View style={styles.evalBox}>
            {data.weekSummary && data.weekSummary.trim().length > 0 ? (
              <Text style={styles.evalText}>{data.weekSummary}</Text>
            ) : (
              <Text style={styles.evalEmpty}>-</Text>
            )}
          </View>
        </View>

        {/* VIDEO LIST */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Daftar Video ({data.videos.length})
          </Text>

          {data.videos.length === 0 ? (
            <Text style={styles.emptyState}>
              Belum ada video di week ini.
            </Text>
          ) : (
            data.videos.map((v, idx) => {
              const eng = calculateEngagement(v);
              return (
                <View key={v.id} style={styles.videoCard} wrap={false}>
                  <View style={styles.videoHeader}>
                    <Text style={styles.videoNumber}>{idx + 1}.</Text>
                    <Text style={styles.videoTitle}>
                      {v.caption && v.caption.trim().length > 0
                        ? v.caption
                        : "Untitled Video"}
                    </Text>
                  </View>
                  <Link src={v.tiktokUrl} style={styles.videoUrl}>
                    {v.tiktokUrl}
                  </Link>
                  {v.postedAt ? (
                    <Text style={styles.videoMeta}>
                      Diposting {formatDate(v.postedAt)}
                    </Text>
                  ) : null}

                  <View style={styles.videoStats}>
                    <View style={styles.videoStat}>
                      <Text style={styles.videoStatValue}>
                        {formatNumber(v.views)}
                      </Text>
                      <Text style={styles.videoStatLabel}>views</Text>
                    </View>
                    <View style={styles.videoStat}>
                      <Text style={styles.videoStatValue}>
                        {formatNumber(v.likes)}
                      </Text>
                      <Text style={styles.videoStatLabel}>likes</Text>
                    </View>
                    <View style={styles.videoStat}>
                      <Text style={styles.videoStatValue}>
                        {formatNumber(v.comments)}
                      </Text>
                      <Text style={styles.videoStatLabel}>comments</Text>
                    </View>
                    <View style={styles.videoStat}>
                      <Text style={styles.videoStatValue}>
                        {formatNumber(v.shares)}
                      </Text>
                      <Text style={styles.videoStatLabel}>shares</Text>
                    </View>
                    <Text style={styles.engBadge}>
                      {eng.toFixed(2)}% engagement
                    </Text>
                  </View>

                  <Text style={styles.videoEvalLabel}>Evaluasi</Text>
                  {v.evaluation && v.evaluation.trim().length > 0 ? (
                    <Text style={styles.videoEvalText}>{v.evaluation}</Text>
                  ) : (
                    <Text style={styles.videoEvalEmpty}>-</Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Confidential — {cn} Internal Report
          </Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) =>
              "Page " + pageNumber + " / " + totalPages
            }
          />
        </View>
      </Page>
    </Document>
  );
}
