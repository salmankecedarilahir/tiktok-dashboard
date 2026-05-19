import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// ============================================
// TYPES
// ============================================

export interface ProposalReportData {
  brandName: string;
  brandContact: string | null;
  campaignName: string;
  description: string | null;
  packageType: string | null;
  customPrice: number | null;
  deliverables: string | null;
  startDate: string;
  endDate: string;
  viewsGuarantee: number | null;
  requirements: string | null;

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

function formatPrice(n: number | null): string {
  if (!n) return "TBD";
  return "Rp " + n.toLocaleString("id-ID");
}

function calculateDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "1 day";
  if (days === 1) return "1 day";
  if (days < 7) return days + " days";
  if (days < 30) return Math.round(days / 7) + " weeks";
  return Math.round(days / 30) + " months";
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

  // Cover Page
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
    fontSize: 18,
    color: COLORS.white,
    opacity: 0.95,
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

  // Generic page header
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

  // Sections
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

  // Hero info box
  heroBox: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    padding: 24,
    borderRadius: 8,
    marginBottom: 18,
  },
  heroLabel: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.85,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 6,
  },

  // Stat grid
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

  // Info row (Campaign Overview)
  infoRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    width: 130,
    fontSize: 10,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Helvetica-Bold",
  },
  infoValue: {
    flex: 1,
    fontSize: 11,
    color: COLORS.text,
    lineHeight: 1.4,
  },

  // Deliverable item
  deliverableBox: {
    backgroundColor: COLORS.bgLight,
    padding: 14,
    borderRadius: 6,
    marginBottom: 10,
  },
  deliverableTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 6,
  },
  deliverableText: {
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.5,
  },

  // Demographics bar
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

  // Two column
  twoColumn: {
    flexDirection: "row",
    gap: 16,
  },
  column: {
    flex: 1,
  },

  // Why CAU
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

  // Pricing box (big number)
  pricingHero: {
    backgroundColor: COLORS.black,
    color: COLORS.white,
    padding: 30,
    borderRadius: 8,
    marginBottom: 22,
    alignItems: "center",
  },
  pricingLabel: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
  },
  pricingValue: {
    fontSize: 44,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    letterSpacing: -1,
  },
  pricingHelper: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.85,
    marginTop: 10,
  },

  // T&C list
  tcItem: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  tcBullet: {
    fontSize: 11,
    color: COLORS.primary,
    marginRight: 8,
  },
  tcText: {
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.4,
    flex: 1,
  },

  // CTA
  ctaBox: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  ctaTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    marginBottom: 6,
  },
  ctaText: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.95,
    lineHeight: 1.5,
  },

  // Footer
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
        <Text style={styles.pageHeaderLabel}>Proposal</Text>
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
        {channelName} - {channelHandle} - Proposal for {brandName}
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

export function ProposalReportPDF({ data }: { data: ProposalReportData }) {
  const cn = data.channelConfig?.channelName || "Circle Anak UPN";
  const ch = data.channelConfig?.channelHandle || "@abangabanganthis";

  const duration = calculateDuration(data.startDate, data.endDate);

  const ch365 = data.channelMetrics?.totalViews365d || 0;
  const ch30d = data.channelMetrics?.last30dViews || 0;
  const chTop = data.channelMetrics?.topViralDay;

  return (
    <Document
      title={"Proposal for " + data.brandName}
      author={cn}
      creator="CAU Proposal Generator"
    >
      {/* PAGE 1 - COVER */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHeader}>
          <Text>Campaign Proposal</Text>
          <Text>{formatDate(data.generatedAt)}</Text>
        </View>

        <View style={styles.coverMain}>
          <View style={styles.coverDivider} />
          <Text style={styles.coverFor}>Proposal Prepared for</Text>
          <Text style={styles.coverBrand}>{data.brandName}</Text>

          <Text style={styles.coverCampaign}>{data.campaignName}</Text>
          <Text style={styles.coverDate}>
            {formatDate(data.startDate)} - {formatDate(data.endDate)} - {duration}
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
              {formatNumber(ch365)} views | 365 days
            </Text>
          </View>
        </View>
      </Page>

      {/* PAGE 2 - CAMPAIGN OVERVIEW */}
      <Page size="A4" style={styles.page}>
        <PageHeader
          channelName={cn}
          channelHandle={ch}
          pageTitle="Campaign Overview"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proposed Campaign</Text>
          <Text style={styles.sectionSubtitle}>
            Detail kampanye yang kami propose untuk {data.brandName}
          </Text>

          <View style={styles.heroBox}>
            <Text style={styles.heroLabel}>Campaign</Text>
            <Text style={styles.heroValue}>{data.campaignName}</Text>
            <Text style={styles.heroSubtitle}>
              {formatDate(data.startDate)} - {formatDate(data.endDate)} ({duration})
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Brand</Text>
            <Text style={styles.infoValue}>{data.brandName}</Text>
          </View>
          {data.packageType && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Package</Text>
              <Text style={styles.infoValue}>{data.packageType}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Timeline</Text>
            <Text style={styles.infoValue}>
              {formatDate(data.startDate)} - {formatDate(data.endDate)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{duration}</Text>
          </View>
          {data.viewsGuarantee && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Views Target</Text>
              <Text style={styles.infoValue}>
                {formatNumber(data.viewsGuarantee)} views guaranteed
              </Text>
            </View>
          )}
        </View>

        {data.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign Concept</Text>
            <View style={styles.deliverableBox}>
              <Text style={styles.deliverableText}>{data.description}</Text>
            </View>
          </View>
        )}

        {data.deliverables && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deliverables</Text>
            <View style={styles.deliverableBox}>
              <Text style={styles.deliverableText}>{data.deliverables}</Text>
            </View>
          </View>
        )}

        {data.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requirements</Text>
            <View style={styles.deliverableBox}>
              <Text style={styles.deliverableText}>{data.requirements}</Text>
            </View>
          </View>
        )}

        <PageFooter
          channelName={cn}
          channelHandle={ch}
          brandName={data.brandName}
        />
      </Page>

      {/* PAGE 3 - CAU CREDENTIALS */}
      <Page size="A4" style={styles.page}>
        <PageHeader
          channelName={cn}
          channelHandle={ch}
          pageTitle="About CAU"
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

      {/* PAGE 4 - PRICING & NEXT STEPS */}
      <Page size="A4" style={styles.page}>
        <PageHeader
          channelName={cn}
          channelHandle={ch}
          pageTitle="Pricing & Next Steps"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investment</Text>
          <Text style={styles.sectionSubtitle}>
            Pricing untuk campaign ini
          </Text>

          <View style={styles.pricingHero}>
            <Text style={styles.pricingLabel}>Total Investment</Text>
            <Text style={styles.pricingValue}>{formatPrice(data.customPrice)}</Text>
            <Text style={styles.pricingHelper}>
              {data.packageType ? data.packageType + " package" : "Custom package"}
              {data.viewsGuarantee ? " - " + formatNumber(data.viewsGuarantee) + " views guaranteed" : ""}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>

          <View style={styles.tcItem}>
            <Text style={styles.tcBullet}>-</Text>
            <Text style={styles.tcText}>
              Payment 50% upfront upon proposal acceptance, 50% upon delivery completion.
            </Text>
          </View>
          <View style={styles.tcItem}>
            <Text style={styles.tcBullet}>-</Text>
            <Text style={styles.tcText}>
              Content revision: maksimal 2x revision per video sebelum publish.
            </Text>
          </View>
          <View style={styles.tcItem}>
            <Text style={styles.tcBullet}>-</Text>
            <Text style={styles.tcText}>
              Brand approval required sebelum content publish (3 hari working days untuk approval).
            </Text>
          </View>
          <View style={styles.tcItem}>
            <Text style={styles.tcBullet}>-</Text>
            <Text style={styles.tcText}>
              Performance report akan delivered dalam 7 hari setelah campaign end date.
            </Text>
          </View>
          <View style={styles.tcItem}>
            <Text style={styles.tcBullet}>-</Text>
            <Text style={styles.tcText}>
              Content tetap menjadi property CAU dengan brand attribution.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Steps</Text>

          <View style={styles.tcItem}>
            <Text style={styles.tcBullet}>1.</Text>
            <Text style={styles.tcText}>
              Review proposal ini dan konfirmasi acceptance via {data.brandContact || "brand contact"}.
            </Text>
          </View>
          <View style={styles.tcItem}>
            <Text style={styles.tcBullet}>2.</Text>
            <Text style={styles.tcText}>
              Sign-off proposal dan transfer 50% upfront payment.
            </Text>
          </View>
          <View style={styles.tcItem}>
            <Text style={styles.tcBullet}>3.</Text>
            <Text style={styles.tcText}>
              Kickoff meeting untuk align konsep konten dan timeline detail.
            </Text>
          </View>
          <View style={styles.tcItem}>
            <Text style={styles.tcBullet}>4.</Text>
            <Text style={styles.tcText}>
              Content production, brand review, publish per timeline.
            </Text>
          </View>
        </View>

        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Let&apos;s make it happen.</Text>
          <Text style={styles.ctaText}>
            Reach out langsung ke {ch} di TikTok atau via contact info yang tersedia.
            Looking forward untuk kolaborasi yang impactful bareng {data.brandName}.
          </Text>
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