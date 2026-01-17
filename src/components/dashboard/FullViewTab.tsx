import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AxisSummaryRow } from '@/types/axis';

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
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Leadership Summary</CardTitle>
          <CardDescription>
            Monthly conversion metrics across all eligible leads. Rejected quality leads excluded from conversion calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold whitespace-nowrap">Bank</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap">Month</TableHead>
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
                {summaryRows.map((row, index) => (
                  <TableRow key={`${row.month}-${index}`} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{row.bank}</TableCell>
                    <TableCell>{row.month}</TableCell>
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
                <TableRow className="bg-muted/70 font-semibold hover:bg-muted/70 border-t-2">
                  <TableCell>{totals.bank}</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.totalApplications}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.eligibleForKyc}</TableCell>
                  <TableCell className="text-right tabular-nums text-warning">{totals.kycPending}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">{totals.kycDone}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(totals.kycConversionPercent)}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">{totals.cardsApproved}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(totals.approvalPercent)}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">{totals.rejectedPostKyc}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(totals.rejectionPercent)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
