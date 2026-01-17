import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QualitySummaryRow } from '@/types/axis';

interface QualityViewTabProps {
  qualityRows: QualitySummaryRow[];
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getQualityStyle(quality: string): string {
  switch (quality) {
    case 'Good':
      return 'text-success font-medium';
    case 'Average':
      return 'text-warning font-medium';
    case 'Rejected':
      return 'text-destructive font-medium';
    default:
      return '';
  }
}

export function QualityViewTab({ qualityRows }: QualityViewTabProps) {
  // Separate eligible (Good, Average) from Rejected for totals calculation
  const eligibleRows = qualityRows.filter(r => r.quality !== 'Rejected');
  const rejectedRow = qualityRows.find(r => r.quality === 'Rejected');
  
  // Calculate totals for eligible leads only
  const eligibleTotals = {
    totalApplications: eligibleRows.reduce((sum, r) => sum + r.totalApplications, 0),
    eligibleForKyc: eligibleRows.reduce((sum, r) => sum + r.eligibleForKyc, 0),
    kycPending: eligibleRows.reduce((sum, r) => sum + r.kycPending, 0),
    kycDone: eligibleRows.reduce((sum, r) => sum + r.kycDone, 0),
    cardsApproved: eligibleRows.reduce((sum, r) => sum + r.cardsApproved, 0),
    rejectedPostKyc: eligibleRows.reduce((sum, r) => sum + r.rejectedPostKyc, 0),
  };
  
  const eligibleConversion = eligibleTotals.eligibleForKyc > 0 
    ? (eligibleTotals.kycDone / eligibleTotals.eligibleForKyc) * 100 
    : 0;
  const eligibleApproval = eligibleTotals.kycDone > 0 
    ? (eligibleTotals.cardsApproved / eligibleTotals.kycDone) * 100 
    : 0;
  const eligibleRejection = eligibleTotals.kycDone > 0 
    ? (eligibleTotals.rejectedPostKyc / eligibleTotals.kycDone) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Quality Breakdown</CardTitle>
          <CardDescription>
            Conversion metrics split by lead quality. Good and Average are eligible for conversion; Rejected is excluded from denominator.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Quality</th>
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
                {eligibleRows.map((row) => (
                  <tr key={row.quality}>
                    <td className={getQualityStyle(row.quality)}>{row.quality}</td>
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
                
                {/* Eligible Totals Row */}
                <tr className="total-row">
                  <td>Eligible Total</td>
                  <td className="text-right tabular-nums">{eligibleTotals.totalApplications}</td>
                  <td className="text-right tabular-nums">{eligibleTotals.eligibleForKyc}</td>
                  <td className="text-right tabular-nums text-warning">{eligibleTotals.kycPending}</td>
                  <td className="text-right tabular-nums text-success">{eligibleTotals.kycDone}</td>
                  <td className="text-right tabular-nums">{formatPercent(eligibleConversion)}</td>
                  <td className="text-right tabular-nums text-success">{eligibleTotals.cardsApproved}</td>
                  <td className="text-right tabular-nums">{formatPercent(eligibleApproval)}</td>
                  <td className="text-right tabular-nums text-destructive">{eligibleTotals.rejectedPostKyc}</td>
                  <td className="text-right tabular-nums">{formatPercent(eligibleRejection)}</td>
                </tr>

                {/* Rejected Row - Separated */}
                {rejectedRow && (
                  <tr className="bg-destructive/5">
                    <td className={getQualityStyle('Rejected')}>{rejectedRow.quality} (Excluded)</td>
                    <td className="text-right tabular-nums text-muted-foreground">{rejectedRow.totalApplications}</td>
                    <td className="text-right tabular-nums text-muted-foreground">—</td>
                    <td className="text-right tabular-nums text-muted-foreground">—</td>
                    <td className="text-right tabular-nums text-muted-foreground">—</td>
                    <td className="text-right tabular-nums text-muted-foreground">N/A</td>
                    <td className="text-right tabular-nums text-muted-foreground">—</td>
                    <td className="text-right tabular-nums text-muted-foreground">N/A</td>
                    <td className="text-right tabular-nums text-muted-foreground">—</td>
                    <td className="text-right tabular-nums text-muted-foreground">N/A</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quality Distribution Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {qualityRows.map((row) => (
          <Card key={row.quality} className={row.quality === 'Rejected' ? 'border-destructive/30' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-base ${getQualityStyle(row.quality)}`}>
                {row.quality} Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applications</span>
                  <span className="font-medium tabular-nums">{row.totalApplications}</span>
                </div>
                {row.quality !== 'Rejected' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">KYC Done</span>
                      <span className="font-medium tabular-nums text-success">{row.kycDone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conversion</span>
                      <span className="font-semibold tabular-nums">{formatPercent(row.kycConversionPercent)}</span>
                    </div>
                  </>
                )}
                {row.quality === 'Rejected' && (
                  <div className="text-muted-foreground text-xs mt-2">
                    Excluded from conversion calculations
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
