import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatRupiah } from "@/lib/contribution-template";

// ============================================
// TYPES
// ============================================

export interface ContributionPlanReportData {
  title: string;
  brandName?: string | null;
  totalAmount: number;
  objective?: string | null;
  planType?: string | null;
  howTo?: string | null;
  notes?: string | null;
  date: string;
  status?: string | null;
  channelConfig?: {
    channelName: string;
    channelHandle: string;
  } | null;
  members: Array<{
    name: string;
    role?: string | null;
  }>;
  tasks: Array<{
    orderNumber: number;
    title: string;
    weight: number;
    details?: string | null;
    isAllTeam: boolean;
    assignees: string[];
    notes?: string | null;
  }>;
  productionCosts?: Array<{
    notes?: string | null;
    totalAmount: number;
    splits: Array<{
      memberName: string;
      amount: number;
      notes?: string;
    }>;
  }>;
  calculation: {
    totalProductionCost?: number;
    netBrandAmount?: number;
    totalAllocatedPercentage: number;
    totalAllocatedAmount: number;
    unallocatedPercentage: number;
    unallocatedAmount: number;
    totalDistributedAmount?: number;
    memberResults: Array<{
      name: string;
      percentage: number;
      feeFromPercentage?: number;
      productionCost?: number;
      amount: number;
    }>;
  };
}

// ============================================
// COLORS (Aligned with CampaignReport)
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
  warningBg: "#fffbeb",
  warningText: "#b45309",
};

// ============================================
// STYLES (Aligned with CampaignReport)
// ============================================

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.text,
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 36,
  },

  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    padding: 50,
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
    marginBottom: 24,
  },
  coverFor: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.8,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  coverBrand: {
    fontSize: 42,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    marginBottom: 16,
    letterSpacing: -1,
  },
  coverCampaign: {
    fontSize: 18,
    color: COLORS.white,
    opacity: 0.95,
    marginBottom: 8,
  },
  coverDate: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
  },
  coverFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.25)",
    paddingTop: 16,
  },
  coverChannel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  coverHandle: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.85,
    marginTop: 2,
  },

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  pageHeaderLeft: {
    flexDirection: "column",
  },
  pageHeaderBrand: {
    fontSize: 13,
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
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 10,
    lineHeight: 1.3,
  },

  heroStat: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    padding: 16,
    borderRadius: 6,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroStatLeft: {
    flexDirection: "column",
  },
  heroStatLabel: {
    fontSize: 9,
    color: COLORS.white,
    opacity: 0.85,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  heroStatValue: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  heroStatRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  heroStatTag: {
    fontSize: 9,
    color: COLORS.white,
    opacity: 0.95,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    fontFamily: "Helvetica-Bold",
  },

  statGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    padding: 10,
    backgroundColor: COLORS.bgLight,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  statLabel: {
    fontSize: 7.5,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },

  metaBox: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  metaRowLast: {
    flexDirection: "row",
    paddingVertical: 3,
  },
  metaLabel: {
    width: "22%",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.muted,
    textTransform: "uppercase",
  },
  metaValue: {
    width: "78%",
    fontSize: 8.5,
    color: COLORS.text,
    lineHeight: 1.3,
  },

  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#FAFBFD",
  },
  tableCell: {
    fontSize: 8,
    color: COLORS.text,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },
  tableFooterRow: {
    flexDirection: "row",
    backgroundColor: COLORS.bgLight,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },

  insightBox: {
    backgroundColor: COLORS.bgAccent,
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginTop: 6,
  },
  insightLabel: {
    fontSize: 8,
    color: COLORS.primary,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  insightText: {
    fontSize: 8.5,
    color: COLORS.text,
    lineHeight: 1.3,
  },

  signatureSection: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  signatureBox: {
    width: "42%",
    alignItems: "center",
  },
  signatureRole: {
    fontSize: 8,
    color: COLORS.muted,
    marginBottom: 36,
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLORS.light,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  footerText: {
    color: COLORS.muted,
  },
  footerPage: {
    color: COLORS.muted,
    fontFamily: "Helvetica-Bold",
  },
});

// ============================================
// SUB-COMPONENTS (Aligned with CampaignReport)
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
        <Text style={styles.pageHeaderLabel}>Contribution Plan</Text>
        <Text style={styles.pageHeaderTitle}>{pageTitle}</Text>
      </View>
    </View>
  );
}

function PageFooter({
  channelName,
  channelHandle,
}: {
  channelName: string;
  channelHandle: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {channelName} • {channelHandle} • Internal Fee Distribution
      </Text>
      <Text
        style={styles.footerPage}
        render={({ pageNumber, totalPages }) =>
          `Halaman ${pageNumber} dari ${totalPages}`
        }
      />
    </View>
  );
}

// ============================================
// MAIN REPORT COMPONENT
// ============================================

export function ContributionPlanReportPDF({
  data,
}: {
  data: ContributionPlanReportData;
}) {
  const cn = data.channelConfig?.channelName || "Circle Anak UPN";
  const ch = data.channelConfig?.channelHandle || "@abangabanganthis";

  const formattedDate = new Date(data.date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={data.title}
      author={cn}
      creator="CAU Contribution Plan Generator"
    >
      {/* ============================================
          PAGE 1 - COVER (Exact same styling as CampaignReport)
         ============================================ */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHeader}>
          <Text>Contribution Plan Report</Text>
          <Text>{formattedDate}</Text>
        </View>

        <View style={styles.coverMain}>
          <View style={styles.coverDivider} />
          <Text style={styles.coverFor}>Internal Allocation Plan</Text>
          <Text style={styles.coverBrand}>
            {data.brandName ? data.brandName.toUpperCase() : "CAU TEAM"}
          </Text>

          <Text style={styles.coverCampaign}>{data.title}</Text>
          <Text style={styles.coverDate}>
            Total Nilai: {formatRupiah(data.totalAmount)} • {data.tasks.length} Tahapan Kerja
          </Text>
        </View>

        <View style={styles.coverFooter}>
          <View>
            <Text style={styles.coverChannel}>{cn}</Text>
            <Text style={styles.coverHandle}>{ch}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.coverHandle}>
              {data.members.length} Kontributor • Status: {data.status || "ACTIVE"}
            </Text>
          </View>
        </View>
      </Page>

      {/* ============================================
          PAGE 2 - EXECUTIVE SUMMARY & FEE DISTRIBUTION
         ============================================ */}
      <Page size="A4" style={styles.page}>
        <PageHeader
          channelName={cn}
          channelHandle={ch}
          pageTitle="Ringkasan Alokasi & Skema"
        />

        {/* Section: Total Contract & Allocation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total Nilai & Alokasi Brand</Text>
          <Text style={styles.sectionSubtitle}>
            Skema pembagian fee tim berdasarkan kontribusi nyata pengerjaan proyek {data.brandName || ""}
          </Text>

          {/* Hero Stat Box */}
          <View style={styles.heroStat}>
            <View style={styles.heroStatLeft}>
              <Text style={styles.heroStatLabel}>Total Brand Masuk</Text>
              <Text style={styles.heroStatValue}>{formatRupiah(data.totalAmount)}</Text>
            </View>
            <View style={styles.heroStatRight}>
              <Text style={styles.heroStatTag}>
                {data.calculation.totalAllocatedPercentage}% Terdistribusi
              </Text>
              {(data.calculation.totalProductionCost || 0) > 0 && (
                <Text style={{ fontSize: 9, color: COLORS.white, opacity: 0.9, marginTop: 4 }}>
                  Biaya Produksi: -{formatRupiah(data.calculation.totalProductionCost || 0)}
                </Text>
              )}
            </View>
          </View>

          {/* 4 Stat Cards */}
          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Fee Dialokasikan</Text>
              <Text style={styles.statValue}>
                {formatRupiah(data.calculation.totalAllocatedAmount)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Sisa / Kas Tim</Text>
              <Text style={styles.statValue}>
                {formatRupiah(data.calculation.unallocatedAmount)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                {(data.calculation.totalProductionCost || 0) > 0
                  ? "Biaya Produksi"
                  : "Kontributor"}
              </Text>
              <Text style={styles.statValue}>
                {(data.calculation.totalProductionCost || 0) > 0
                  ? formatRupiah(data.calculation.totalProductionCost || 0)
                  : `${data.members.length} Orang`}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                {(data.calculation.totalProductionCost || 0) > 0
                  ? "Sisa Brand Bersih"
                  : "Tahapan Kerja"}
              </Text>
              <Text style={styles.statValue}>
                {(data.calculation.totalProductionCost || 0) > 0
                  ? formatRupiah(
                      data.calculation.netBrandAmount ??
                        data.totalAmount - (data.calculation.totalProductionCost || 0)
                    )
                  : `${data.tasks.length} Tahap`}
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Skema & Metadata */}
        {(data.objective || data.planType || data.howTo || data.notes) && (
          <View style={styles.metaBox}>
            {data.objective && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Objective</Text>
                <Text style={styles.metaValue}>{data.objective}</Text>
              </View>
            )}
            {data.planType && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Skema / Type</Text>
                <Text style={styles.metaValue}>{data.planType}</Text>
              </View>
            )}
            {data.howTo && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>How To</Text>
                <Text style={styles.metaValue}>{data.howTo}</Text>
              </View>
            )}
            {data.notes && (
              <View style={styles.metaRowLast}>
                <Text style={styles.metaLabel}>Catatan</Text>
                <Text style={styles.metaValue}>{data.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Section: Rincian Biaya Produksi (Jika ada) */}
        {data.productionCosts && data.productionCosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Rincian Biaya Produksi (Production Cost)
            </Text>
            <Text style={styles.sectionSubtitle}>
              Biaya operasional yang mengurangi pemasukan brand dan langsung diberikan ke orang yang terlibat
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.tableHeaderCell, width: "6%" }}>No</Text>
                <Text style={{ ...styles.tableHeaderCell, width: "36%" }}>
                  Keterangan Pos Biaya
                </Text>
                <Text style={{ ...styles.tableHeaderCell, width: "38%" }}>
                  Orang yang Terlibat & Rincian
                </Text>
                <Text
                  style={{
                    ...styles.tableHeaderCell,
                    width: "20%",
                    textAlign: "right",
                  }}
                >
                  Subtotal (Rp)
                </Text>
              </View>

              {data.productionCosts.map((c, cIdx) => (
                <View
                  key={cIdx}
                  style={[
                    styles.tableRow,
                    cIdx % 2 === 1 ? styles.tableRowAlt : {},
                  ]}
                >
                  <Text style={{ ...styles.tableCell, width: "6%" }}>
                    {cIdx + 1}
                  </Text>
                  <Text style={{ ...styles.tableCellBold, width: "36%" }}>
                    {c.notes || `Pos Biaya #${cIdx + 1}`}
                  </Text>
                  <Text style={{ ...styles.tableCell, width: "38%" }}>
                    {c.splits && c.splits.length > 0
                      ? c.splits
                          .map(
                            (s) =>
                              `${s.memberName || "Eksternal"}: ${formatRupiah(
                                s.amount
                              )}`
                          )
                          .join(", ")
                      : "-"}
                  </Text>
                  <Text
                    style={{
                      ...styles.tableCellBold,
                      width: "20%",
                      textAlign: "right",
                      color: COLORS.primary,
                    }}
                  >
                    {formatRupiah(c.totalAmount)}
                  </Text>
                </View>
              ))}

              <View style={styles.tableFooterRow}>
                <Text style={{ ...styles.tableHeaderCell, width: "80%" }}>
                  Total Biaya Produksi
                </Text>
                <Text
                  style={{
                    ...styles.tableHeaderCell,
                    width: "20%",
                    textAlign: "right",
                    color: COLORS.primary,
                  }}
                >
                  {formatRupiah(data.calculation.totalProductionCost || 0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Section: Ringkasan Fee Kontributor Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan Pembagian Fee Kontributor</Text>
          <Text style={styles.sectionSubtitle}>
            Persentase dan estimasi hak pembagian fee per individu
          </Text>

          <View style={styles.table}>
            {(data.calculation.totalProductionCost || 0) > 0 ? (
              <>
                <View style={styles.tableHeader}>
                  <Text style={{ ...styles.tableHeaderCell, width: "6%" }}>No</Text>
                  <Text style={{ ...styles.tableHeaderCell, width: "30%" }}>
                    Nama Kontributor
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "16%",
                      textAlign: "center",
                    }}
                  >
                    Persentase (%)
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "16%",
                      textAlign: "right",
                    }}
                  >
                    Fee Persen
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "16%",
                      textAlign: "right",
                    }}
                  >
                    Biaya Prod.
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "16%",
                      textAlign: "right",
                    }}
                  >
                    Total Diterima
                  </Text>
                </View>

                {data.calculation.memberResults.map((m, idx) => (
                  <View
                    key={m.name}
                    style={[
                      styles.tableRow,
                      idx % 2 === 1 ? styles.tableRowAlt : {},
                    ]}
                  >
                    <Text style={{ ...styles.tableCell, width: "6%" }}>
                      {idx + 1}
                    </Text>
                    <Text style={{ ...styles.tableCellBold, width: "30%" }}>
                      {m.name}
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCell,
                        width: "16%",
                        textAlign: "center",
                      }}
                    >
                      {m.percentage.toFixed(1).replace(".", ",")}%
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCell,
                        width: "16%",
                        textAlign: "right",
                      }}
                    >
                      {formatRupiah(m.feeFromPercentage ?? 0)}
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCell,
                        width: "16%",
                        textAlign: "right",
                      }}
                    >
                      {(m.productionCost || 0) > 0
                        ? `+${formatRupiah(m.productionCost || 0)}`
                        : "-"}
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCellBold,
                        width: "16%",
                        textAlign: "right",
                        color: COLORS.primary,
                      }}
                    >
                      {formatRupiah(m.amount)}
                    </Text>
                  </View>
                ))}

                {/* Unallocated / Kas Tim row */}
                {data.calculation.unallocatedPercentage > 0 && (
                  <View style={[styles.tableRow, { backgroundColor: COLORS.warningBg }]}>
                    <Text style={{ ...styles.tableCell, width: "6%" }}>-</Text>
                    <Text
                      style={{
                        ...styles.tableCellBold,
                        width: "30%",
                        color: COLORS.warningText,
                      }}
                    >
                      Kas Tim / Unassigned
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCell,
                        width: "16%",
                        textAlign: "center",
                        color: COLORS.warningText,
                      }}
                    >
                      {data.calculation.unallocatedPercentage
                        .toFixed(1)
                        .replace(".", ",")}
                      %
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCell,
                        width: "16%",
                        textAlign: "right",
                        color: COLORS.warningText,
                      }}
                    >
                      {formatRupiah(data.calculation.unallocatedAmount)}
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCell,
                        width: "16%",
                        textAlign: "right",
                        color: COLORS.warningText,
                      }}
                    >
                      -
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCellBold,
                        width: "16%",
                        textAlign: "right",
                        color: COLORS.warningText,
                      }}
                    >
                      {formatRupiah(data.calculation.unallocatedAmount)}
                    </Text>
                  </View>
                )}

                {/* Table Footer Total */}
                <View style={styles.tableFooterRow}>
                  <Text style={{ ...styles.tableHeaderCell, width: "36%" }}>
                    Total Keseluruhan
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "16%",
                      textAlign: "center",
                    }}
                  >
                    100%
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "16%",
                      textAlign: "right",
                    }}
                  >
                    {formatRupiah(data.calculation.totalAllocatedAmount)}
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "16%",
                      textAlign: "right",
                    }}
                  >
                    +{formatRupiah(data.calculation.totalProductionCost || 0)}
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "16%",
                      textAlign: "right",
                      color: COLORS.primary,
                    }}
                  >
                    {formatRupiah(data.calculation.totalDistributedAmount || data.totalAmount)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.tableHeader}>
                  <Text style={{ ...styles.tableHeaderCell, width: "8%" }}>No</Text>
                  <Text style={{ ...styles.tableHeaderCell, width: "42%" }}>
                    Nama Kontributor
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "25%",
                      textAlign: "right",
                    }}
                  >
                    Persentase (%)
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "25%",
                      textAlign: "right",
                    }}
                  >
                    Fee Diterima (Rp)
                  </Text>
                </View>

                {data.calculation.memberResults.map((m, idx) => (
                  <View
                    key={m.name}
                    style={[
                      styles.tableRow,
                      idx % 2 === 1 ? styles.tableRowAlt : {},
                    ]}
                  >
                    <Text style={{ ...styles.tableCell, width: "8%" }}>
                      {idx + 1}
                    </Text>
                    <Text style={{ ...styles.tableCellBold, width: "42%" }}>
                      {m.name}
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCell,
                        width: "25%",
                        textAlign: "right",
                      }}
                    >
                      {m.percentage.toFixed(1).replace(".", ",")}%
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCellBold,
                        width: "25%",
                        textAlign: "right",
                        color: COLORS.primary,
                      }}
                    >
                      {formatRupiah(m.amount)}
                    </Text>
                  </View>
                ))}

                {/* Unallocated / Kas Tim row */}
                {data.calculation.unallocatedPercentage > 0 && (
                  <View style={[styles.tableRow, { backgroundColor: COLORS.warningBg }]}>
                    <Text style={{ ...styles.tableCell, width: "8%" }}>-</Text>
                    <Text
                      style={{
                        ...styles.tableCellBold,
                        width: "42%",
                        color: COLORS.warningText,
                      }}
                    >
                      Kas Tim / Unassigned
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCell,
                        width: "25%",
                        textAlign: "right",
                        color: COLORS.warningText,
                      }}
                    >
                      {data.calculation.unallocatedPercentage
                        .toFixed(1)
                        .replace(".", ",")}
                      %
                    </Text>
                    <Text
                      style={{
                        ...styles.tableCellBold,
                        width: "25%",
                        textAlign: "right",
                        color: COLORS.warningText,
                      }}
                    >
                      {formatRupiah(data.calculation.unallocatedAmount)}
                    </Text>
                  </View>
                )}

                {/* Table Footer Total */}
                <View style={styles.tableFooterRow}>
                  <Text style={{ ...styles.tableHeaderCell, width: "50%" }}>
                    Total Keseluruhan
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "25%",
                      textAlign: "right",
                    }}
                  >
                    100%
                  </Text>
                  <Text
                    style={{
                      ...styles.tableHeaderCell,
                      width: "25%",
                      textAlign: "right",
                      color: COLORS.primary,
                    }}
                  >
                    {formatRupiah(data.totalAmount)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Key Principle Box */}
        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>Prinsip Kontribusi</Text>
          <Text style={styles.insightText}>
            Skema pembagian fee di atas dihitung proporsional sesuai dengan bobot tahapan kerja yang disepakati bersama. Setiap kontributor bertanggung jawab menyelesaikan tahapan kerja yang telah dialokasikan.
          </Text>
        </View>

        <PageFooter channelName={cn} channelHandle={ch} />
      </Page>

      {/* ============================================
          PAGE 3 - ACTION PLAN & APPROVAL
         ============================================ */}
      <Page size="A4" style={styles.page}>
        <PageHeader
          channelName={cn}
          channelHandle={ch}
          pageTitle="Rincian Tahapan Kerja"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            13 Tahapan Kerja Standar CAU (Action Plan)
          </Text>
          <Text style={styles.sectionSubtitle}>
            Rincian bobot kerja, penanggung jawab (PIC), dan detail operasional setiap tahapan
          </Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableHeaderCell, width: "6%" }}>No</Text>
              <Text style={{ ...styles.tableHeaderCell, width: "30%" }}>
                Tahapan (Action Plan)
              </Text>
              <Text
                style={{
                  ...styles.tableHeaderCell,
                  width: "12%",
                  textAlign: "center",
                }}
              >
                Bobot
              </Text>
              <Text style={{ ...styles.tableHeaderCell, width: "18%" }}>
                PIC
              </Text>
              <Text style={{ ...styles.tableHeaderCell, width: "34%" }}>
                Rincian & Catatan
              </Text>
            </View>

            {data.tasks.map((t, idx) => {
              const picLabel = t.isAllTeam
                ? "All team"
                : t.assignees.length > 0
                ? t.assignees.join(", ")
                : "-";

              const detailAndNotes = [t.details, t.notes]
                .filter(Boolean)
                .join(" | ");

              return (
                <View
                  key={t.orderNumber}
                  style={[
                    styles.tableRow,
                    idx % 2 === 1 ? styles.tableRowAlt : {},
                  ]}
                >
                  <Text style={{ ...styles.tableCell, width: "6%" }}>
                    {t.orderNumber}
                  </Text>
                  <Text style={{ ...styles.tableCellBold, width: "30%" }}>
                    {t.title}
                  </Text>
                  <Text
                    style={{
                      ...styles.tableCell,
                      width: "12%",
                      textAlign: "center",
                    }}
                  >
                    {t.weight}%
                  </Text>
                  <Text style={{ ...styles.tableCellBold, width: "18%" }}>
                    {picLabel}
                  </Text>
                  <Text
                    style={{
                      ...styles.tableCell,
                      width: "34%",
                      color: COLORS.muted,
                    }}
                  >
                    {detailAndNotes || "-"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Approval Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRole}>Dibuat & Dikoordinasikan</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Manager / PIC Proyek</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRole}>Disetujui Bersama</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Tim Kontributor CAU</Text>
          </View>
        </View>

        <PageFooter channelName={cn} channelHandle={ch} />
      </Page>
    </Document>
  );
}
