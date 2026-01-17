import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QualitySummaryRow } from '@/types/axis';
import { KpiCard } from '@/components/KpiCard';
import { ExportButton } from '@/components/ExportButton';

interface QualityViewTabProps {
  qualityRows: QualitySummaryRow[];
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getQualityStyle(quality: string): string {
  switch (quality) {
    case 'Good': return 'text-success font-medium';
    case 'Average': return 'text-warning font-medium';
    case 'Rejected': return 'text-destructive font-medium';
    default: return '';
  }
}

export function QualityViewTab({ qualityRows }: QualityViewTabProps) {
  const eligibleRows = qualityRows.filter(r => r.quality !== 'Rejected');
  const rejectedRow = qualityRows.find(r => r.quality === 'Rejected');
  
  const eligibleTotals = {
    totalApplications: eligibleRows.reduce((sum, r) => sum + r.totalApplications, 0),
    eligibleForKyc: eligibleRows.reduce((sum, r) => sum + r.eligibleForKyc, 0),
    kycPending: eligibleRows.reduce((sum, r) => sum + r.kycPending, 0),
    kycDone: eligibleRows.reduce((sum, r) => sum + r.kycDone, 0),
    cardsApproved: eligibleRows.reduce((sum, r) => sum + r.cardsApproved, 0),
    rejectedPostKyc: eligibleRows.reduce((sum, r) => sum + r.rejectedPostKyc, 0),
  };
  
  const eligibleConversion = eligibleTotals.eligibleForKyc > 0 
    ? (eligibleTotals.kycDone / eligibleTotals.eligibleForKyc) * 100 : 0;
  const eligibleApproval = eligibleTotals.kycDone > 0 
    ? (eligibleTotals.cardsApproved / eligibleTotals.kycDone) * 100 : 0;
  const eligibleRejection = eligibleTotals.kycDone > 0 
    ? (eligibleTotals.rejectedPostKyc / eligibleTotals.kycDone) * 100 : 0;

  const exportData = qualityRows.map(row => ({
    Quality: row.quality,
    'Total Applications': row.totalApplications,
    'Eligible for KYC': row.eligibleForKyc,
    'KYC Pending': row.kycPending,
    'KYC Done': row.kycDone,
    'KYC Conversion %': row.kycConversionPercent,
    'Cards Approved': row.cardsApproved,
    'Approval %': row.approvalPercent,
  }));

  return (
    <div className="space-y-4">
      {/* Quality KPI Cards */}
      <div className="data-grid grid-cols-3">
        {qualityRows.map((row) => (
          <KpiCard 
            key={row.quality}
            label={`${row.quality} Quality`}
            value={row.totalApplications}
            valueColor={row.quality === 'Good' ? 'success' : row.quality === 'Average' ? 'warning' : 'destructive'}
            delta={row.quality !== 'Rejected' ? row.kycConversionPercent - 50 : undefined}
            deltaLabel={row.quality !== 'Rejected' ? 'conv' : undefined}
          />
        ))}
      </div>

      {/* Quality Breakdown Table */}
      <Card className="border-border">
        <CardHeader className="compact-card-header flex-row items-center justify-between">
          <div>
            <CardTitle className="compact-card-title">Quality Breakdown</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Good and Average are eligible; Rejected excluded from conversion.
            </CardDescription>
          </div>
          <ExportButton data={exportData} filename="axis_quality_breakdown" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Quality</th>
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
                {eligibleRows.map((row) => (
                  <tr key={row.quality}>
                    <td className={getQualityStyle(row.quality)}>{row.quality}</td>
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
                  <td>Eligible Total</td>
                  <td className="text-right tabular-nums">{eligibleTotals.totalApplications}</td>
                  <td className="text-right tabular-nums">{eligibleTotals.eligibleForKyc}</td>
                  <td className="text-right tabular-nums text-warning">{eligibleTotals.kycPending}</td>
                  <td className="text-right tabular-nums text-success">{eligibleTotals.kycDone}</td>
                  <td className="text-right tabular-nums text-info">{formatPercent(eligibleConversion)}</td>
                  <td className="text-right tabular-nums text-success">{eligibleTotals.cardsApproved}</td>
                  <td className="text-right tabular-nums">{formatPercent(eligibleApproval)}</td>
                  <td className="text-right tabular-nums text-destructive">{eligibleTotals.rejectedPostKyc}</td>
                  <td className="text-right tabular-nums">{formatPercent(eligibleRejection)}</td>
                </tr>
                {rejectedRow && (
                  <tr className="opacity-50">
                    <td className={getQualityStyle('Rejected')}>{rejectedRow.quality} (Excluded)</td>
                    <td className="text-right tabular-nums">{rejectedRow.totalApplications}</td>
                    <td className="text-right tabular-nums">—</td>
                    <td className="text-right tabular-nums">—</td>
                    <td className="text-right tabular-nums">—</td>
                    <td className="text-right tabular-nums">N/A</td>
                    <td className="text-right tabular-nums">—</td>
                    <td className="text-right tabular-nums">N/A</td>
                    <td className="text-right tabular-nums">—</td>
                    <td className="text-right tabular-nums">N/A</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
