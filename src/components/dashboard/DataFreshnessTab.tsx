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
            <CardTitle className="text-lg">{uploadSummary.lastUploadDate}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Records</CardDescription>
            <CardTitle className="text-lg tabular-nums">{uploadSummary.totalRecords}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Date Range</CardDescription>
            <CardTitle className="text-lg">{uploadSummary.dateRange.from} – {uploadSummary.dateRange.to}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={uploadSummary.conflictCount > 0 ? 'border-warning/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Data Conflicts</CardDescription>
            <CardTitle className={`text-lg tabular-nums ${uploadSummary.conflictCount > 0 ? 'text-warning' : 'text-success'}`}>
              {uploadSummary.conflictCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Monthly Freshness Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Data Freshness by Month</CardTitle>
          <CardDescription>
            MIS recency and status change tracking. Rolling logic ensures latest status is always used.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Last Updated</th>
                  <th className="text-right">Total Records</th>
                  <th className="text-right">Status Changes</th>
                  <th className="text-right">New Applications</th>
                </tr>
              </thead>
              <tbody>
                {freshnessRows.map((row) => (
                  <tr key={row.month}>
                    <td className="font-medium">{row.month}</td>
                    <td>{row.lastUpdated}</td>
                    <td className="text-right tabular-nums">{row.totalRecords}</td>
                    <td className="text-right tabular-nums">{row.statusChanges}</td>
                    <td className="text-right tabular-nums">{row.newApplications}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Data Rules Explanation */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Data Handling Rules</CardTitle>
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
