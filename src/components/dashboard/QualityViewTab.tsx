import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
          <CardTitle className="text-lg font-semibold">Quality Breakdown</CardTitle>
          <CardDescription>
            Conversion metrics split by lead quality. Good and Average are eligible for conversion; Rejected is excluded from denominator.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold whitespace-nowrap">Quality</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">Total Applications</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">Eligible for KYC</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">KYC Pending</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">KYC Done</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">KYC Conversion %</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">Cards Approved</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">Approval %</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">Rejected (Post-KYC)</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">Rejection %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eligibleRows.map((row) => (
                  <TableRow key={row.quality} className="hover:bg-muted/30">
                    <TableCell className={getQualityStyle(row.quality)}>{row.quality}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.totalApplications}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.eligibleForKyc}</TableCell>
                    <TableCell className="text-right tabular-nums text-warning">{row.kycPending}</TableCell>
                    <TableCell className="text-right tabular-nums text-success">{row.kycDone}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatPercent(row.kycConversionPercent)}</TableCell>
                    <TableCell className="text-right tabular-nums text-success">{row.cardsApproved}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(row.approvalPercent)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{row.rejectedPostKyc}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(row.rejectionPercent)}</TableCell>
                  </TableRow>
                ))}
                
                {/* Eligible Totals Row */}
                <TableRow className="bg-muted/70 font-semibold hover:bg-muted/70 border-t-2">
                  <TableCell>Eligible Total</TableCell>
                  <TableCell className="text-right tabular-nums">{eligibleTotals.totalApplications}</TableCell>
                  <TableCell className="text-right tabular-nums">{eligibleTotals.eligibleForKyc}</TableCell>
                  <TableCell className="text-right tabular-nums text-warning">{eligibleTotals.kycPending}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">{eligibleTotals.kycDone}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(eligibleConversion)}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">{eligibleTotals.cardsApproved}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(eligibleApproval)}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">{eligibleTotals.rejectedPostKyc}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(eligibleRejection)}</TableCell>
                </TableRow>

                {/* Rejected Row - Separated */}
                {rejectedRow && (
                  <TableRow className="bg-destructive/5 hover:bg-destructive/10 border-t">
                    <TableCell className={getQualityStyle('Rejected')}>{rejectedRow.quality} (Excluded)</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{rejectedRow.totalApplications}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">N/A</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">N/A</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">N/A</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
