import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataFreshnessRow } from '@/types/axis';

interface DataFreshnessTabProps {
  freshnessRows: DataFreshnessRow[];
  uploadSummary: {
    lastUploadDate: string;
    totalRecords: number;
    dateRange: { from: string; to: string };
    conflictCount: number;
  };
}

export function DataFreshnessTab({ freshnessRows, uploadSummary }: DataFreshnessTabProps) {
  return (
    <div className="space-y-6">
      {/* Upload Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last MIS Upload</CardDescription>
            <CardTitle className="text-xl">{uploadSummary.lastUploadDate}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Records</CardDescription>
            <CardTitle className="text-xl tabular-nums">{uploadSummary.totalRecords}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Date Range</CardDescription>
            <CardTitle className="text-xl">{uploadSummary.dateRange.from} – {uploadSummary.dateRange.to}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={uploadSummary.conflictCount > 0 ? 'border-warning/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Data Conflicts</CardDescription>
            <CardTitle className={`text-xl tabular-nums ${uploadSummary.conflictCount > 0 ? 'text-warning' : 'text-success'}`}>
              {uploadSummary.conflictCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Monthly Freshness Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Data Freshness by Month</CardTitle>
          <CardDescription>
            MIS recency and status change tracking. Rolling logic ensures latest status is always used.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold whitespace-nowrap">Month</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap">Last Updated</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">Total Records</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">Status Changes</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap text-right">New Applications</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {freshnessRows.map((row) => (
                  <TableRow key={row.month} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell>{row.lastUpdated}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.totalRecords}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.statusChanges}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.newApplications}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Data Rules Explanation */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Data Handling Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Rolling Status Logic</h4>
                <p className="text-muted-foreground">
                  For each application_id, only the latest record (by last_updated_date) is considered the current truth. 
                  Month boundaries are ignored; status is not month-frozen.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Type-1 Overwrite</h4>
                <p className="text-muted-foreground">
                  Each MIS upload overwrites previous status. No historical tracking—current state only. 
                  application_id is the unique key.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Quality Frozen</h4>
                <p className="text-muted-foreground">
                  Lead Quality derived from BLAZE_OUTPUT is frozen once assigned. 
                  Subsequent status changes do not alter quality.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Daily Upload Cadence</h4>
                <p className="text-muted-foreground">
                  Axis MIS uploaded daily. Reports always reflect the latest available status, 
                  irrespective of original application month.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
