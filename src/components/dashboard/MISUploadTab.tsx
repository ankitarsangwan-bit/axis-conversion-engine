import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MISUpload } from '@/types/axis';

interface MISUploadTabProps {
  currentUpload: MISUpload | undefined;
  uploadHistory: MISUpload[];
}

export function MISUploadTab({ currentUpload, uploadHistory }: MISUploadTabProps) {
  return (
    <div className="space-y-6">
      {/* Current Upload Summary */}
      {currentUpload && (
        <Card className="border-primary/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Current MIS Upload</CardTitle>
                <CardDescription>Latest data snapshot in use</CardDescription>
              </div>
              <Badge className="bg-success text-success-foreground">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-muted-foreground text-sm">Upload Date</p>
                <p className="font-semibold text-lg">{new Date(currentUpload.uploadDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Upload Time</p>
                <p className="font-semibold text-lg">{currentUpload.uploadTime}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total Records</p>
                <p className="font-semibold text-lg tabular-nums">{currentUpload.recordCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">New / Updated</p>
                <p className="font-semibold text-lg tabular-nums">
                  <span className="text-success">{currentUpload.newRecords}</span>
                  {' / '}
                  <span className="text-info">{currentUpload.updatedRecords}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Upload ID: <span className="font-mono">{currentUpload.uploadId}</span>
                <span className="mx-2">|</span>
                Source: {currentUpload.uploadedBy}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload History */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">MIS Upload History</CardTitle>
          <CardDescription>
            Historical uploads with record counts and changes tracked
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Upload ID</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th className="text-right">Records</th>
                  <th className="text-right">New</th>
                  <th className="text-right">Updated</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.map((upload) => (
                  <tr key={upload.uploadId}>
                    <td className="font-mono text-sm">{upload.uploadId}</td>
                    <td>{new Date(upload.uploadDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}</td>
                    <td>{upload.uploadTime}</td>
                    <td className="text-right tabular-nums">{upload.recordCount}</td>
                    <td className="text-right tabular-nums text-success">{upload.newRecords}</td>
                    <td className="text-right tabular-nums text-info">{upload.updatedRecords}</td>
                    <td className="text-sm">{upload.uploadedBy}</td>
                    <td>
                      <Badge 
                        variant={upload.status === 'Current' ? 'default' : 'secondary'}
                        className={upload.status === 'Current' ? 'bg-success text-success-foreground' : ''}
                      >
                        {upload.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Uploads (Last 30 Days)</CardDescription>
            <CardTitle className="text-xl tabular-nums">{uploadHistory.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Records per Upload</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {Math.round(uploadHistory.reduce((sum, u) => sum + u.recordCount, 0) / uploadHistory.length)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upload Frequency</CardDescription>
            <CardTitle className="text-xl">Daily (Automated)</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Data Pipeline Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Data Pipeline Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Upload Schedule</h4>
              <p className="text-muted-foreground">
                Axis MIS files are automatically synced daily at 09:00 AM IST.
                Manual uploads can be triggered on-demand.
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Data Retention</h4>
              <p className="text-muted-foreground">
                Upload history retained for 90 days. Only current snapshot used for reporting.
                Historical data available for audit purposes.
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Validation Rules</h4>
              <p className="text-muted-foreground">
                All uploads validated for schema compliance, duplicate detection, 
                and conflict resolution before activation.
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Rollback Policy</h4>
              <p className="text-muted-foreground">
                Previous upload can be restored within 24 hours if data quality 
                issues detected post-activation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
