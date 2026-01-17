import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AxisApplication } from '@/types/axis';
import { Badge } from '@/components/ui/badge';

interface AxisApplicationsTableProps {
  applications: AxisApplication[];
}

function LeadQualityBadge({ quality }: { quality: AxisApplication['lead_quality'] }) {
  const styles = {
    Good: 'quality-good',
    Average: 'quality-average',
    Rejected: 'quality-rejected',
  };

  return (
    <span className={`status-badge ${styles[quality]}`}>
      {quality}
    </span>
  );
}

function KycStatusBadge({ status, completed }: { status: AxisApplication['kyc_status_display']; completed: 'Y' | 'N' }) {
  return (
    <span className={`status-badge ${completed === 'Y' ? 'status-completed' : 'status-pending'}`}>
      {status}
    </span>
  );
}

export function AxisApplicationsTable({ applications }: AxisApplicationsTableProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Axis Bank Applications</CardTitle>
        <CardDescription>
          Sample output showing 10 applications with derived lead quality and KYC status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Application ID</TableHead>
                <TableHead className="font-semibold">BLAZE Output</TableHead>
                <TableHead className="font-semibold">Login Status</TableHead>
                <TableHead className="font-semibold">Final Status</TableHead>
                <TableHead className="font-semibold">Lead Quality</TableHead>
                <TableHead className="font-semibold text-center">KYC Completed</TableHead>
                <TableHead className="font-semibold">KYC Status Display</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app, index) => (
                <TableRow 
                  key={app.application_id}
                  className="hover:bg-muted/30 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-mono font-medium text-primary">
                    {app.application_id}
                  </TableCell>
                  <TableCell>{app.blaze_output}</TableCell>
                  <TableCell>
                    {app.login_status || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{app.final_status}</TableCell>
                  <TableCell>
                    <LeadQualityBadge quality={app.lead_quality} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={app.kyc_completed === 'Y' ? 'default' : 'secondary'}>
                      {app.kyc_completed}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <KycStatusBadge status={app.kyc_status_display} completed={app.kyc_completed} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
