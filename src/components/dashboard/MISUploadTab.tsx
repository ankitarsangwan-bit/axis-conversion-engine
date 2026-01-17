import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MISUpload } from '@/types/axis';
import { KpiCard } from '@/components/KpiCard';
import { ExportButton } from '@/components/ExportButton';

interface MISUploadTabProps {
  currentUpload: MISUpload | undefined;
  uploadHistory: MISUpload[];
}

export function MISUploadTab({ currentUpload, uploadHistory }: MISUploadTabProps) {
  const exportData = uploadHistory.map(u => ({
    'Upload ID': u.uploadId,
    'Date': u.uploadDate,
    'Time': u.uploadTime,
    'Records': u.recordCount,
    'New': u.newRecords,
    'Updated': u.updatedRecords,
    'Source': u.uploadedBy,
    'Status': u.status,
  }));

  const avgRecords = Math.round(uploadHistory.reduce((sum, u) => sum + u.recordCount, 0) / uploadHistory.length);
  const totalNew = uploadHistory.reduce((sum, u) => sum + u.newRecords, 0);

  return (
    <div className="space-y-4">
      {/* Current Upload KPIs */}
      <div className="data-grid grid-cols-2 md:grid-cols-5">
        <KpiCard 
          label="Current Upload" 
          value={currentUpload?.uploadDate ? new Date(currentUpload.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
        />
        <KpiCard label="Total Records" value={currentUpload?.recordCount || 0} />
        <KpiCard label="New Records" value={currentUpload?.newRecords || 0} valueColor="success" />
        <KpiCard label="Updated" value={currentUpload?.updatedRecords || 0} valueColor="info" />
        <KpiCard label="Upload Count (30d)" value={uploadHistory.length} />
      </div>

      {/* Current Upload Details */}
      {currentUpload && (
        <Card className="border-primary/30">
          <CardHeader className="compact-card-header">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="compact-card-title">Current Snapshot</CardTitle>
                <CardDescription className="text-xs mt-0.5">Active data version</CardDescription>
              </div>
              <Badge className="bg-success/20 text-success border-0 text-[10px]">ACTIVE</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>ID: <span className="font-mono text-foreground">{currentUpload.uploadId}</span></p>
              <p>Source: <span className="text-foreground">{currentUpload.uploadedBy}</span></p>
              <p>Time: <span className="text-foreground">{currentUpload.uploadTime}</span></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload History */}
      <Card className="border-border">
        <CardHeader className="compact-card-header flex-row items-center justify-between">
          <div>
            <CardTitle className="compact-card-title">Upload History</CardTitle>
            <CardDescription className="text-xs mt-0.5">Historical uploads tracked</CardDescription>
          </div>
          <ExportButton data={exportData} filename="axis_mis_upload_history" />
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
                    <td className="font-mono">{upload.uploadId}</td>
                    <td>{new Date(upload.uploadDate).toLocaleDateString('en-US', { 
                      month: 'short', day: 'numeric' 
                    })}</td>
                    <td className="text-muted-foreground">{upload.uploadTime}</td>
                    <td className="text-right tabular-nums">{upload.recordCount}</td>
                    <td className="text-right tabular-nums text-success">{upload.newRecords}</td>
                    <td className="text-right tabular-nums text-info">{upload.updatedRecords}</td>
                    <td className="text-muted-foreground">{upload.uploadedBy}</td>
                    <td>
                      <Badge 
                        variant="secondary"
                        className={upload.status === 'Current' ? 'bg-success/20 text-success border-0' : 'bg-muted text-muted-foreground border-0'}
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

      {/* Data Pipeline Info */}
      <Card className="border-border">
        <CardHeader className="compact-card-header">
          <CardTitle className="compact-card-title">Pipeline Configuration</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-accent rounded">
              <p className="font-medium mb-1">Schedule</p>
              <p className="text-muted-foreground">Daily 09:00 AM IST</p>
            </div>
            <div className="p-3 bg-accent rounded">
              <p className="font-medium mb-1">Retention</p>
              <p className="text-muted-foreground">90 days history</p>
            </div>
            <div className="p-3 bg-accent rounded">
              <p className="font-medium mb-1">Validation</p>
              <p className="text-muted-foreground">Schema + Duplicates</p>
            </div>
            <div className="p-3 bg-accent rounded">
              <p className="font-medium mb-1">Rollback</p>
              <p className="text-muted-foreground">24h window</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
