import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatRupiah } from "@/lib/contribution-template";

export interface ContributionPlanReportData {
  title: string;
  brandName?: string | null;
  totalAmount: number;
  objective?: string | null;
  planType?: string | null;
  howTo?: string | null;
  notes?: string | null;
  date: string;
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
  calculation: {
    totalAllocatedPercentage: number;
    totalAllocatedAmount: number;
    unallocatedPercentage: number;
    unallocatedAmount: number;
    memberResults: Array<{
      name: string;
      percentage: number;
      amount: number;
    }>;
  };
}

const COLORS = {
  primary: "#DC2626", // Red CAU brand
  primaryLight: "#FEE2E2",
  text: "#0F172A",
  muted: "#64748B",
  light: "#94A3B8",
  border: "#E2E8F0",
  bgLight: "#F8FAFC",
  bgAccent: "#FEF2F2",
  white: "#FFFFFF",
  success: "#16A34A",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  brandSub: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  reportBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  reportDate: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 3,
  },
  titleBlock: {
    marginBottom: 14,
  },
  planTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },
  brandNameText: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  metaGrid: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
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
  },
  highlightCard: {
    flexDirection: "row",
    backgroundColor: COLORS.bgAccent,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    justifyContent: "space-between",
    alignItems: "center",
  },
  highlightLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textTransform: "uppercase",
  },
  highlightValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  sectionHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
  },
  // Table styles
  table: {
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
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
  },
  signatureSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  signatureBox: {
    width: "40%",
    alignItems: "center",
  },
  signatureRole: {
    fontSize: 8,
    color: COLORS.muted,
    marginBottom: 44,
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
  pageNumber: {
    position: "absolute",
    fontSize: 7.5,
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: "center",
    color: COLORS.light,
  },
});

export function ContributionPlanReportPDF({
  data,
}: {
  data: ContributionPlanReportData;
}) {
  const formattedDate = new Date(data.date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document title={data.title} author="CAU Tools">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>CAU Tools</Text>
            <Text style={styles.brandSub}>
              Internal Dashboard & Contribution Distribution
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportBadge}>CONTRIBUTION PLAN</Text>
            <Text style={styles.reportDate}>{formattedDate}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.planTitle}>{data.title}</Text>
          {data.brandName && (
            <Text style={styles.brandNameText}>Brand: {data.brandName}</Text>
          )}
        </View>

        {/* Project Total Banner */}
        <View style={styles.highlightCard}>
          <View>
            <Text style={styles.highlightLabel}>Total Nilai Brand Masuk</Text>
            <Text style={{ fontSize: 8, color: COLORS.muted, marginTop: 2 }}>
              Alokasi Terbagi: {data.calculation.totalAllocatedPercentage}% (
              {formatRupiah(data.calculation.totalAllocatedAmount)})
            </Text>
          </View>
          <Text style={styles.highlightValue}>
            {formatRupiah(data.totalAmount)}
          </Text>
        </View>

        {/* Metadata & Scheme */}
        <View style={styles.metaGrid}>
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
            <View style={{ ...styles.metaRow, marginBottom: 0 }}>
              <Text style={styles.metaLabel}>Catatan</Text>
              <Text style={styles.metaValue}>{data.notes}</Text>
            </View>
          )}
        </View>

        {/* Section: Ringkasan Per Orang */}
        <Text style={styles.sectionHeader}>
          Ringkasan Pembagian Fee Kontributor
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderCell, width: "10%" }}>No</Text>
            <Text style={{ ...styles.tableHeaderCell, width: "40%" }}>
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
              Jumlah Diterima (Rp)
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
              <Text style={{ ...styles.tableCell, width: "10%" }}>
                {idx + 1}
              </Text>
              <Text style={{ ...styles.tableCellBold, width: "40%" }}>
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

          {/* Sisa / Kas Tim if any */}
          {data.calculation.unallocatedPercentage > 0 && (
            <View style={[styles.tableRow, { backgroundColor: "#FFFBEB" }]}>
              <Text style={{ ...styles.tableCell, width: "10%" }}>-</Text>
              <Text
                style={{
                  ...styles.tableCellBold,
                  width: "40%",
                  color: "#B45309",
                }}
              >
                Kas Tim / Unassigned
              </Text>
              <Text
                style={{
                  ...styles.tableCell,
                  width: "25%",
                  textAlign: "right",
                  color: "#B45309",
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
                  color: "#B45309",
                }}
              >
                {formatRupiah(data.calculation.unallocatedAmount)}
              </Text>
            </View>
          )}

          {/* Total Footer */}
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
        </View>

        {/* Section: Action Plan / Skema Detail */}
        <Text style={styles.sectionHeader}>
          Rincian Tahapan Kerja (Action Plan)
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
              Details & Notes
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

        {/* Signature */}
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

        {/* Page Footer */}
        <Text style={styles.pageNumber}>
          Dokumen ini digenerate secara otomatis oleh CAU Tools Dashboard •{" "}
          {formattedDate}
        </Text>
      </Page>
    </Document>
  );
}
