import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AxisSummaryRow } from '@/types/axis';
import { ConversionTrendChart } from './ConversionTrendChart';

interface FullViewTabProps {
  summaryRows: AxisSummaryRow[];
  totals: AxisSummaryRow;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function FullViewTab({ summaryRows, totals }: FullViewTabProps) {
  return (
    <div className="space-y-6">
      {/* Trend Charts */}
      <ConversionTrendChart summaryRows={summaryRows} />

      {/* Leadership Summary Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Leadership Summary</CardTitle>
          <CardDescription>
            Monthly conversion metrics across all eligible leads. Rejected quality leads excluded from conversion calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Month</th>
                  <th className="text-right">Total Applications</th>
                  <th className="text-right">Eligible for KYC</th>
                  <th className="text-right">KYC Pending</th>
                  <th className="text-right">KYC Done</th>
                  <th className="text-right">KYC Conversion %</th>
                  <th className="text-right">Cards Approved</th>
                  <th className="text-right">Approval %</th>
                  <th className="text-right">Rejected (Post-KYC)</th>
                  <th className="text-right">Rejection %</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, index) => (
                  <tr key={`${row.month}-${index}`}>
                    <td className="font-medium">{row.bank}</td>
                    <td>{row.month}</td>
                    <td className="text-right tabular-nums">{row.totalApplications}</td>
                    <td className="text-right tabular-nums">{row.eligibleForKyc}</td>
                    <td className="text-right tabular-nums text-warning">{row.kycPending}</td>
                    <td className="text-right tabular-nums text-success">{row.kycDone}</td>
                    <td className="text-right tabular-nums font-semibold">{formatPercent(row.kycConversionPercent)}</td>
                    <td className="text-right tabular-nums text-success">{row.cardsApproved}</td>
                    <td className="text-right tabular-nums">{formatPercent(row.approvalPercent)}</td>
                    <td className="text-right tabular-nums text-destructive">{row.rejectedPostKyc}</td>
                    <td className="text-right tabular-nums">{formatPercent(row.rejectionPercent)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>{totals.bank}</td>
                  <td>Total</td>
                  <td className="text-right tabular-nums">{totals.totalApplications}</td>
                  <td className="text-right tabular-nums">{totals.eligibleForKyc}</td>
                  <td className="text-right tabular-nums text-warning">{totals.kycPending}</td>
                  <td className="text-right tabular-nums text-success">{totals.kycDone}</td>
                  <td className="text-right tabular-nums">{formatPercent(totals.kycConversionPercent)}</td>
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
