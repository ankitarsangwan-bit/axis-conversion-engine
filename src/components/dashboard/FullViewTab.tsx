import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AxisSummaryRow } from '@/types/axis';
import { ConversionTrendChart } from './ConversionTrendChart';
import { KpiCard } from '@/components/KpiCard';
import { ExportButton } from '@/components/ExportButton';
import { KycBreakdownCard } from './KycBreakdownCard';

interface FullViewTabProps {
  summaryRows: AxisSummaryRow[];
  totals: AxisSummaryRow;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function FullViewTab({ summaryRows, totals }: FullViewTabProps) {
  // Generate sparkline data from monthly data
  const sortedRows = [...summaryRows].sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  );
  
  const kycSparkline = sortedRows.map(r => ({ value: r.kycConversionPercent }));
  const approvalSparkline = sortedRows.map(r => ({ value: r.approvalPercent }));
  const pendingSparkline = sortedRows.map(r => ({ value: r.kycPending }));

  // Calculate delta from previous month
  const currentMonth = sortedRows[sortedRows.length - 1];
  const prevMonth = sortedRows[sortedRows.length - 2];
  const kycDelta = prevMonth ? currentMonth.kycConversionPercent - prevMonth.kycConversionPercent : 0;
  const approvalDelta = prevMonth ? currentMonth.approvalPercent - prevMonth.approvalPercent : 0;

  // Export data format
  const exportData = summaryRows.map(row => ({
    Bank: row.bank,
    Month: row.month,
    'Total Applications': row.totalApplications,
    'Eligible for KYC': row.eligibleForKyc,
    'KYC Pending': row.kycPending,
    'KYC Done': row.kycDone,
    'KYC Conversion %': row.kycConversionPercent,
    'Cards Approved': row.cardsApproved,
    'Approval %': row.approvalPercent,
    'Rejected Post-KYC': row.rejectedPostKyc,
    'Rejection %': row.rejectionPercent,
  }));

  return (
    <div className="space-y-4">
      {/* KPI Cards with Sparklines */}
      <div className="data-grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <KpiCard 
          label="Total Applications" 
          value={totals.totalApplications}
          sparklineData={sortedRows.map(r => ({ value: r.totalApplications }))}
        />
        <KpiCard 
          label="Eligible for KYC" 
          value={totals.eligibleForKyc}
          sparklineData={sortedRows.map(r => ({ value: r.eligibleForKyc }))}
        />
        <KpiCard 
          label="KYC Pending" 
          value={totals.kycPending}
          valueColor="warning"
          sparklineData={pendingSparkline}
        />
        <KpiCard 
          label="KYC Done" 
          value={totals.kycDone}
          valueColor="success"
          sparklineData={sortedRows.map(r => ({ value: r.kycDone }))}
        />
        <KpiCard 
          label="KYC Conversion" 
          value={formatPercent(totals.kycConversionPercent)}
          valueColor="info"
          delta={kycDelta}
          deltaLabel="vs prev"
          sparklineData={kycSparkline}
        />
        <KpiCard 
          label="Approval Rate" 
          value={formatPercent(totals.approvalPercent)}
          valueColor="success"
          delta={approvalDelta}
          deltaLabel="vs prev"
          sparklineData={approvalSparkline}
        />
      </div>

      {/* KYC Breakdown + Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KycBreakdownCard />
        <div className="lg:col-span-2">
          <ConversionTrendChart summaryRows={summaryRows} />
        </div>
      </div>

      {/* Leadership Summary Table */}
      <Card className="border-border">
        <CardHeader className="compact-card-header flex-row items-center justify-between">
          <div>
            <CardTitle className="compact-card-title">Leadership Summary</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Monthly conversion metrics. Rejected leads excluded from conversion.
            </CardDescription>
          </div>
          <ExportButton data={exportData} filename="axis_leadership_summary" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Month</th>
                  <th className="text-right">Apps</th>
                  <th className="text-right">Eligible</th>
                  <th className="text-right">Pending</th>
                  <th className="text-right">Done</th>
                  <th className="text-right">Conv %</th>
                  <th className="text-right">Approved</th>
                  <th className="text-right">Appr %</th>
                  <th className="text-right">Rejected</th>
                  <th className="text-right">Rej %</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, index) => (
                  <tr key={`${row.month}-${index}`}>
                    <td className="font-medium">{row.bank}</td>
                    <td className="font-mono text-muted-foreground">{row.month}</td>
                    <td className="text-right tabular-nums">{row.totalApplications}</td>
                    <td className="text-right tabular-nums">{row.eligibleForKyc}</td>
                    <td className="text-right tabular-nums text-warning">{row.kycPending}</td>
                    <td className="text-right tabular-nums text-success">{row.kycDone}</td>
                    <td className="text-right tabular-nums font-semibold text-info">{formatPercent(row.kycConversionPercent)}</td>
                    <td className="text-right tabular-nums text-success">{row.cardsApproved}</td>
                    <td className="text-right tabular-nums">{formatPercent(row.approvalPercent)}</td>
                    <td className="text-right tabular-nums text-destructive">{row.rejectedPostKyc}</td>
                    <td className="text-right tabular-nums">{formatPercent(row.rejectionPercent)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>{totals.bank}</td>
                  <td className="font-mono">Total</td>
                  <td className="text-right tabular-nums">{totals.totalApplications}</td>
                  <td className="text-right tabular-nums">{totals.eligibleForKyc}</td>
                  <td className="text-right tabular-nums text-warning">{totals.kycPending}</td>
                  <td className="text-right tabular-nums text-success">{totals.kycDone}</td>
                  <td className="text-right tabular-nums text-info">{formatPercent(totals.kycConversionPercent)}</td>
                  <td className="text-right tabular-nums text-success">{totals.cardsApproved}</td>
                  <td className="text-right tabular-nums">{formatPercent(totals.approvalPercent)}</td>
                  <td className="text-right tabular-nums text-destructive">{totals.rejectedPostKyc}</td>
                  <td className="text-right tabular-nums">{formatPercent(totals.rejectionPercent)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
