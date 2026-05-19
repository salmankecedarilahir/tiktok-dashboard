import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Line,
  Circle,
} from "@react-pdf/renderer";

// ============================================
// TYPES
// ============================================

export interface CampaignReportData {
  brandName: string;
  campaignName: string;
  packageType: string | null;
  startDate: string;
  endDate: string;
  notes: string | null;
  videos: Array<{
    id: string;
    videoTitle: string;
    videoUrl: string | null;
    postedAt: string;
    durationSeconds: number | null;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    watchTimeAvgSec: number | null;
  }>;
  channelConfig: {
    channelName: string;
    channelHandle: string;
    totalFollowers: number;
    brandColor: string;
    tagline: string | null;
    femalePercent: number;
    malePercent: number;
    age18_24Percent: number;
    age25_34Percent: number;
    age35plusPercent: number;
  } | null;
  channelMetrics: {
    totalViews365d: number;
    last30dViews: number;
    avgViewsPerDay: number;
    topViralDay: {
      date: string;
      views: number;
    } | null;
    sparklineData: Array<{
      date: string;
      views: number;
    }>;
  } | null;
  generatedAt: string;
}

// ============================================
// HELPERS
// ============================================

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function calculateEngagement(v: {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}): number {
  if (!v.views) return 0;
  return ((v.likes + v.comments + v.shares + v.saves) / v.views) * 100;
}

// ============================================
// COLORS
// ============================================

const COLORS = {
  primary: "#DC2626",
  primaryDark: "#991B1B",
  primaryLight: "#FCA5A5",
  black: "#0a0a0a",
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

  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    padding: 60,
    height: "100%",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  coverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 10,
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  coverMain: {
    flexDirection: "column",
  },
  coverDivider: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.white,
    marginBottom: 30,
  },
  coverFor: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  coverBrand: {
    fontSize: 52,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    marginBottom: 20,
    letterSpacing: -1,
  },
  coverCampaign: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 6,
  },
  coverDate: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.7,
  },
  coverFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  coverChannel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  coverHandle: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 2,
  },

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  pageHeaderLeft: {
    flexDirection: "column",
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
  pageHeaderRight: {
    flexDirection: "column",
    alignItems: "flex-end",
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
  },

  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 14,
    lineHeight: 1.4,
  },

  heroStat: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    padding: 24,
    borderRadius: 8,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroStatLeft: {
    flexDirection: "column",
  },
  heroStatLabel: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.85,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  heroStatValue: {
    fontSize: 44,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    marginTop: 4,
    letterSpacing: -1,
  },
  heroStatRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  heroStatTag: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.95,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    fontFamily: "Helvetica-Bold",
  },

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: 100,
    padding: 14,
    backgroundColor: COLORS.bgLight,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  statLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  statValue: {
    fontSize: 19,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  statHelper: {
    fontSize: 8,
    color: COLORS.light,
    marginTop: 4,
  },

  insightBox: {
    backgroundColor: COLORS.bgAccent,
    padding: 16,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginTop: 14,
  },
  insightLabel: {
    fontSize: 9,
    color: COLORS.primary,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  insightText: {
    fontSize: 11,
    color: COLORS.text,
    lineHeight: 1.5,
  },

  videoCard: {
    padding: 14,
    backgroundColor: COLORS.bgLight,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  videoTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    lineHeight: 1.3,
  },
  videoMeta: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 10,
  },
  videoMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  videoMetric: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    width: "30%",
    marginBottom: 4,
  },
  videoMetricLabel: {
    fontSize: 9,
    color: COLORS.muted,
  },
  videoMetricValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },

  // Sparkline container
  sparklineBox: {
    backgroundColor: COLORS.bgLight,
    padding: 16,
    borderRadius: 6,
    marginBottom: 16,
  },
  sparklineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sparklineTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },
  sparklineSubtitle: {
    fontSize: 9,
    color: COLORS.muted,
  },
  sparklineFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sparklineFooterText: {
    fontSize: 8,
    color: COLORS.light,
  },

  demoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  demoLabel: {
    fontSize: 10,
    color: COLORS.muted,
    width: 70,
  },
  demoBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.bgLight,
    borderRadius: 2,
    marginRight: 10,
  },
  demoBarFill: {
    height: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  demoValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    width: 40,
    textAlign: "right",
  },

  twoColumn: {
    flexDirection: "row",
    gap: 16,
  },
  column: {
    flex: 1,
  },

  whyBox: {
    backgroundColor: COLORS.bgLight,
    padding: 16,
    borderRadius: 6,
  },
  whyItem: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  whyBullet: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginRight: 8,
    width: 12,
  },
  whyText: {
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.45,
    flex: 1,
  },

  ctaHero: {
    backgroundColor: COLORS.black,
    color: COLORS.white,
    padding: 40,
    borderRadius: 8,
    marginBottom: 22,
  },
  ctaLabel: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
  },
  ctaTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    lineHeight: 1.2,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  ctaText: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.9,
    lineHeight: 1.5,
  },

  packageGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  packageBox: {
    flex: 1,
    padding: 14,
    backgroundColor: COLORS.bgLight,
    borderRadius: 6,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
  },
  packageName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  packageDetail: {
    fontSize: 8,
    color: COLORS.muted,
    lineHeight: 1.5,
  },

  contactBox: {
    padding: 16,
    backgroundColor: COLORS.bgLight,
    borderRadius: 6,
  },
  contactRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  contactLabel: {
    fontSize: 10,
    color: COLORS.muted,
    width: 70,
  },
  contactValue: {
    fontSize: 10,
    color: COLORS.text,
    fontFamily: "Helvetica-Bold",
    flex: 1,
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
// SPARKLINE COMPONENT
// ============================================

interface SparklineProps {
  data: Array<{ date: string; views: number }>;
  width: number;
  height: number;
}

function Sparkline({ data, width, height }: SparklineProps) {
  if (data.length < 2) {
    return (
      <View>
        <Text style={{ fontSize: 9, color: COLORS.light }}>
          Not enough data for trend
        </Text>
      </View>
    );
  }

  // Padding inside SVG for axis labels
  const padTop = 10;
  const padBottom = 18;
  const padLeft = 0;
  const padRight = 0;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  const values = data.map((d) => d.views);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // Generate points
  const points = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * chartWidth;
    const y = padTop + chartHeight - ((d.views - min) / range) * chartHeight;
    return { x, y, views: d.views, date: d.date };
  });

  // Build SVG path
  let pathD = "M " + points[0]!.x + "," + points[0]!.y;
  for (let i = 1; i < points.length; i++) {
    pathD += " L " + points[i]!.x + "," + points[i]!.y;
  }

  // Area fill path (line + bottom corners)
  const areaPathD =
    pathD +
    " L " +
    points[points.length - 1]!.x +
    "," +
    (padTop + chartHeight) +
    " L " +
    points[0]!.x +
    "," +
    (padTop + chartHeight) +
    " Z";

  // Find peak point
  const peakIdx = values.indexOf(max);
  const peakPoint = points[peakIdx]!;

  // Find latest point
  const latestPoint = points[points.length - 1]!;

  return (
    <Svg width={width} height={height} viewBox={"0 0 " + width + " " + height}>
      {/* Area fill */}
      <Path d={areaPathD} fill={COLORS.primaryLight} fillOpacity={0.25} />

      {/* Line */}
      <Path
        d={pathD}
        stroke={COLORS.primary}
        strokeWidth={2}
        fill="none"
      />

      {/* Baseline (avg line) */}
      <Line
        x1={padLeft}
        y1={padTop + chartHeight}
        x2={padLeft + chartWidth}
        y2={padTop + chartHeight}
        stroke={COLORS.border}
        strokeWidth={1}
      />

      {/* Peak marker */}
      <Circle
        cx={peakPoint.x}
        cy={peakPoint.y}
        r={3}
        fill={COLORS.primary}
        stroke={COLORS.white}
        strokeWidth={1.5}
      />

      {/* Latest marker */}
      <Circle
        cx={latestPoint.x}
        cy={latestPoint.y}
        r={2.5}
        fill={COLORS.primaryDark}
      />
    </Svg>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function PageHeader({
  channelName,
  channelHandle,
  pageTitle,
}: {
  channelName: string;
  channelHandle: string;
  pageTitle: string;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderLeft}>
        <Text style={styles.pageHeaderBrand}>{channelName}</Text>
        <Text style={styles.pageHeaderHandle}>{channelHandle}</Text>
      </View>
      <View style={styles.pageHeaderRight}>
        <Text style={styles.pageHeaderLabel}>Performance Report</Text>
        <Text style={styles.pageHeaderTitle}>{pageTitle}</Text>
      </View>
    </View>
  );
}

function PageFooter({
  channelName,
  channelHandle,
  brandName,
}: {
  channelName: string;
  channelHandle: string;
  brandName: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {channelName} - {channelHandle} - For {brandName}
      </Text>
      <Text
        style={styles.footerPage}
        render={({ pageNumber, totalPages }) =>
          "Page " + pageNumber + " / " + totalPages
        }
      />
    </View>
  );
}

function DemoBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.demoRow}>
      <Text style={styles.demoLabel}>{label}</Text>
      <View style={styles.demoBarTrack}>
        <View style={[styles.demoBarFill, { width: pct + "%" }]} />
      </View>
      <Text style={styles.demoValue}>{pct.toFixed(0)}%</Text>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CampaignReportPDF({ data }: { data: CampaignReportData }) {
  const cn = data.channelConfig?.channelName || "Circle Anak UPN";
  const ch = data.channelConfig?.channelHandle || "@abangabanganthis";

  const totalViews = data.videos.reduce((s, v) => s + v.views, 0);
  const totalLikes = data.videos.reduce((s, v) => s + v.likes, 0);
  const totalComments = data.videos.reduce((s, v) => s + v.comments, 0);
  const totalShares = data.videos.reduce((s, v) => s + v.shares, 0);
  const totalSaves = data.videos.reduce((s, v) => s + v.saves, 0);
  const engRate =
    totalViews > 0
      ? ((totalLikes + totalComments + totalShares + totalSaves) / totalViews) *
        100
      : 0;

  let takeaway = "";
  if (engRate >= 5) {
    takeaway =
      "Engagement rate " +
      engRate.toFixed(2) +
      "% sangat tinggi - audience CAU resonate kuat dengan campaign ini, mengindikasikan brand fit yang baik dan potensi conversion above average.";
  } else if (engRate >= 3) {
    takeaway =
      "Engagement rate " +
      engRate.toFixed(2) +
      "% solid - audience CAU aktif berinteraksi dengan konten campaign, menunjukkan delivery yang efektif dan visibility yang baik.";
  } else {
    takeaway =
      "Total " +
      formatNumber(totalViews) +
      " views delivered - jangkauan campaign berhasil menjangkau audience target dengan reach yang konsisten.";
  }

  const ch365 = data.channelMetrics?.totalViews365d || 0;
  const ch30d = data.channelMetrics?.last30dViews || 0;
  const chTop = data.channelMetrics?.topViralDay;
  const sparklineData = data.channelMetrics?.sparklineData || [];

  // Sparkline stats
  const sparklineMax =
    sparklineData.length > 0
      ? Math.max(...sparklineData.map((d) => d.views))
      : 0;
  const sparklineMin =
    sparklineData.length > 0
      ? Math.min(...sparklineData.map((d) => d.views))
      : 0;
  const sparklineFirstDate =
    sparklineData.length > 0 ? sparklineData[0]!.date : "";
  const sparklineLastDate =
    sparklineData.length > 0
      ? sparklineData[sparklineData.length - 1]!.date
      : "";

  return (
    <Document
      title={data.brandName + " - Performance Report"}
      author={cn}
      creator="CAU Performance Report Generator"
    >
      {/* PAGE 1 - COVER */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHeader}>
          <Text>Performance Report</Text>
          <Text>{formatDate(data.generatedAt)}</Text>
        </View>

        <View style={styles.coverMain}>
          <View style={styles.coverDivider} />
          <Text style={styles.coverFor}>Prepared for</Text>
          <Text style={styles.coverBrand}>{data.brandName}</Text>

          <Text style={styles.coverCampaign}>{data.campaignName}</Text>
          <Text style={styles.coverDate}>
            {formatDate(data.startDate)} - {formatDate(data.endDate)}
            {data.packageType ? " - " + data.packageType : ""}
          </Text>
        </View>

        <View style={styles.coverFooter}>
          <View>
            <Text style={styles.coverChannel}>{cn}</Text>
            <Text style={styles.coverHandle}>{ch}</Text>
          </View>
          <View>
            <Text style={styles.coverHandle}>
              {data.videos.length} video
              {data.videos.length !== 1 ? "s" : ""} delivered
            </Text>
          </View>
        </View>
      </Page>

      {/* PAGE 2 - EXECUTIVE SUMMARY */}
      <Page size="A4" style={styles.page}>
        <PageHeader
          channelName={cn}
          channelHandle={ch}
          pageTitle="Executive Summary"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Performance</Text>
          <Text style={styles.sectionSubtitle}>
            Total impact dari {data.videos.length} video untuk {data.brandName}
          </Text>

          <View style={styles.heroStat}>
            <View style={styles.heroStatLeft}>
              <Text style={styles.heroStatLabel}>Total Views Delivered</Text>
              <Text style={styles.heroStatValue}>{formatNumber(totalViews)}</Text>
            </View>
            <View style={styles.heroStatRight}>
              <Text style={styles.heroStatTag}>
                {engRate.toFixed(2)}% engagement
              </Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Likes</Text>
              <Text style={styles.statValue}>{formatNumber(totalLikes)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Comments</Text>
              <Text style={styles.statValue}>{formatNumber(totalComments)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Shares</Text>
              <Text style={styles.statValue}>{formatNumber(totalShares)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Saves</Text>
              <Text style={styles.statValue}>{formatNumber(totalSaves)}</Text>
            </View>
          </View>

          <View style={styles.insightBox}>
            <Text style={styles.insightLabel}>Key Takeaway</Text>
            <Text style={styles.insightText}>{takeaway}</Text>
          </View>
        </View>

        <PageFooter
          channelName={cn}
          channelHandle={ch}
          brandName={data.brandName}
        />
      </Page>

      {/* PAGE 3 - VIDEO BREAKDOWN */}
      <Page size="A4" style={styles.page}>
        <PageHeader
          channelName={cn}
          channelHandle={ch}
          pageTitle="Video Breakdown"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Per-Video Performance ({data.videos.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            Detail metrics setiap video dalam campaign
          </Text>

          {data.videos.map((v) => {
            const eng = calculateEngagement(v);
            return (
              <View key={v.id} style={styles.videoCard}>
                <Text style={styles.videoTitle}>{v.videoTitle}</Text>
                <Text style={styles.videoMeta}>
                  Posted {formatDate(v.postedAt)}
                  {v.durationSeconds ? " - " + v.durationSeconds + "s" : ""}
                  {v.watchTimeAvgSec
                    ? " - Avg watch " + v.watchTimeAvgSec + "s"
                    : ""}
                </Text>
                <View style={styles.videoMetricsGrid}>
                  <View style={styles.videoMetric}>
                    <Text style={styles.videoMetricValue}>
                      {formatNumber(v.views)}
                    </Text>
                    <Text style={styles.videoMetricLabel}>views</Text>
                  </View>
                  <View style={styles.videoMetric}>
                    <Text style={styles.videoMetricValue}>
                      {formatNumber(v.likes)}
                    </Text>
                    <Text style={styles.videoMetricLabel}>likes</Text>
                  </View>
                  <View style={styles.videoMetric}>
                    <Text style={styles.videoMetricValue}>
                      {formatNumber(v.comments)}
                    </Text>
                    <Text style={styles.videoMetricLabel}>comments</Text>
                  </View>
                  <View style={styles.videoMetric}>
                    <Text style={styles.videoMetricValue}>
                      {formatNumber(v.shares)}
                    </Text>
                    <Text style={styles.videoMetricLabel}>shares</Text>
                  </View>
                  <View style={styles.videoMetric}>
                    <Text style={styles.videoMetricValue}>
                      {formatNumber(v.saves)}
                    </Text>
                    <Text style={styles.videoMetricLabel}>saves</Text>
                  </View>
                  <View style={styles.videoMetric}>
                    <Text style={styles.videoMetricValue}>
                      {eng.toFixed(2)}%
                    </Text>
                    <Text style={styles.videoMetricLabel}>engagement</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <PageFooter
          channelName={cn}
          channelHandle={ch}
          brandName={data.brandName}
        />
      </Page>

      {/* PAGE 4 - CHANNEL CONTEXT */}
      <Page size="A4" style={styles.page}>
        <PageHeader
          channelName={cn}
          channelHandle={ch}
          pageTitle="Channel Context"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About {cn}</Text>
          <Text style={styles.sectionSubtitle}>
            {data.channelConfig?.tagline ||
              "Bridging the gap between corporate and campus culture"}
          </Text>

          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>365-Day Reach</Text>
              <Text style={styles.statValue}>{formatNumber(ch365)}</Text>
              <Text style={styles.statHelper}>total views</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Last 30 Days</Text>
              <Text style={styles.statValue}>{formatNumber(ch30d)}</Text>
              <Text style={styles.statHelper}>recent reach</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Followers</Text>
              <Text style={styles.statValue}>
                {formatNumber(data.channelConfig?.totalFollowers || 0)}
              </Text>
              <Text style={styles.statHelper}>active community</Text>
            </View>
            {chTop && (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Peak Day</Text>
                <Text style={styles.statValue}>{formatNumber(chTop.views)}</Text>
                <Text style={styles.statHelper}>{formatDate(chTop.date)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* SPARKLINE - 30 day trend */}
        {sparklineData.length >= 2 && (
          <View style={styles.sparklineBox}>
            <View style={styles.sparklineHeader}>
              <Text style={styles.sparklineTitle}>30-Day View Trend</Text>
              <Text style={styles.sparklineSubtitle}>
                Peak {formatNumber(sparklineMax)} - Daily reach
              </Text>
            </View>

            <Sparkline data={sparklineData} width={500} height={70} />

            <View style={styles.sparklineFooter}>
              <Text style={styles.sparklineFooterText}>
                {formatDateShort(sparklineFirstDate)}
              </Text>
              <Text style={styles.sparklineFooterText}>
                Low {formatNumber(sparklineMin)}
              </Text>
              <Text style={styles.sparklineFooterText}>
                {formatDateShort(sparklineLastDate)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Audience</Text>
            <Text style={styles.sectionSubtitle}>Gen Z and Millennials</Text>

            <View>
              <DemoBar
                label="Female"
                value={data.channelConfig?.femalePercent || 0}
              />
              <DemoBar
                label="Male"
                value={data.channelConfig?.malePercent || 0}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <DemoBar
                label="18-24"
                value={data.channelConfig?.age18_24Percent || 0}
              />
              <DemoBar
                label="25-34"
                value={data.channelConfig?.age25_34Percent || 0}
              />
              <DemoBar
                label="35+"
                value={data.channelConfig?.age35plusPercent || 0}
              />
            </View>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Why CAU</Text>

            <View style={styles.whyBox}>
              <View style={styles.whyItem}>
                <Text style={styles.whyBullet}>1.</Text>
                <Text style={styles.whyText}>
                  Edutainment niche - audience yang care, bukan passive
                  scroller. Comment depth lebih tinggi dari rata-rata
                  entertainment account.
                </Text>
              </View>
              <View style={styles.whyItem}>
                <Text style={styles.whyBullet}>2.</Text>
                <Text style={styles.whyText}>
                  Authentic campus voice - 4 hosts dari UPNVJ, organik
                  representasi mahasiswa Indonesia.
                </Text>
              </View>
              <View style={styles.whyItem}>
                <Text style={styles.whyBullet}>3.</Text>
                <Text style={styles.whyText}>
                  Track record viral - {formatNumber(ch365)} views dalam 365
                  hari, dengan capability spike{" "}
                  {chTop ? formatNumber(chTop.views) : "viral"} di single day.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <PageFooter
          channelName={cn}
          channelHandle={ch}
          brandName={data.brandName}
        />
      </Page>

      {/* PAGE 5 - CONTACT & CTA */}
      <Page size="A4" style={styles.page}>
        <PageHeader
          channelName={cn}
          channelHandle={ch}
          pageTitle="Next Steps"
        />

        <View style={styles.ctaHero}>
          <Text style={styles.ctaLabel}>Ready for the next campaign?</Text>
          <Text style={styles.ctaTitle}>
            Let's create more impact together.
          </Text>
          <Text style={styles.ctaText}>
            Setiap brand butuh storytelling yang authentic untuk reach Gen Z.
            CAU bantu brand lo connect dengan campus audience lewat content
            yang relatable, engaging, dan terbukti viral.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Get In Touch</Text>
        <View style={styles.contactBox}>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>TikTok</Text>
            <Text style={styles.contactValue}>{ch}</Text>
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Hosts</Text>
            <Text style={styles.contactValue}>
              @rafi.aqza - @mirfanirawan - @salmanrraf - @juu.ann_
            </Text>
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Brand</Text>
            <Text style={styles.contactValue}>{cn}</Text>
          </View>
        </View>

        <PageFooter
          channelName={cn}
          channelHandle={ch}
          brandName={data.brandName}
        />
      </Page>
    </Document>
  );
}