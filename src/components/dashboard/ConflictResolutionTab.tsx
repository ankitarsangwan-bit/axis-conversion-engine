import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConflictRecord } from '@/types/axis';

interface ConflictResolutionTabProps {
  conflicts: ConflictRecord[];
}

function getConflictTypeLabel(type: string): string {
  switch (type) {
    case 'LOGIN_IPA_CONFLICT':
      return 'Login + IPA';
    case 'POST_KYC_NO_LOGIN':
      return 'Post-KYC No Login';
    case 'REJECT_WITH_LOGIN':
      return 'Rejected + Login';
    case 'MULTIPLE_STATUS_SIGNALS':
      return 'Multiple Signals';
    default:
      return type;
  }
}

export function ConflictResolutionTab({ conflicts }: ConflictResolutionTabProps) {
  return (
    <div className="space-y-6">
      {/* Conflict Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Conflicts Detected</CardDescription>
            <CardTitle className={`text-lg tabular-nums ${conflicts.length > 0 ? 'text-warning' : 'text-success'}`}>
              {conflicts.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Auto-Resolved</CardDescription>
            <CardTitle className="text-lg tabular-nums text-success">{conflicts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Manual Review Required</CardDescription>
            <CardTitle className="text-lg tabular-nums">0</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Conflicts Table */}
      {conflicts.length > 0 ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Conflict Records</CardTitle>
            <CardDescription>
              Applications with conflicting raw signals, resolved using defined business rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Conflict Type</th>
                    <th>Login Status</th>
                    <th>Final Status</th>
                    <th>Blaze Output</th>
                    <th>Resolved KYC</th>
                    <th>Resolved Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {conflicts.map((conflict) => (
                    <tr key={conflict.application_id}>
                      <td className="font-medium">{conflict.application_id}</td>
                      <td>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-warning/10 text-warning">
                          {getConflictTypeLabel(conflict.conflictType)}
                        </span>
                      </td>
                      <td className="font-mono text-sm">
                        {conflict.rawSignals.loginStatus || '—'}
                      </td>
                      <td className="font-mono text-sm">{conflict.rawSignals.finalStatus}</td>
                      <td className="font-mono text-sm">{conflict.rawSignals.blazeOutput}</td>
                      <td>
                        <span className={`font-medium ${conflict.resolvedKycStatus === 'KYC Done' ? 'text-success' : 'text-warning'}`}>
                          {conflict.resolvedKycStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`font-medium ${
                          conflict.resolvedQuality === 'Good' ? 'text-success' : 
                          conflict.resolvedQuality === 'Average' ? 'text-warning' : 
                          'text-destructive'
                        }`}>
                          {conflict.resolvedQuality}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No conflicts detected in current dataset.</p>
          </CardContent>
        </Card>
      )}

      {/* Resolution Details */}
      {conflicts.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Resolution Details</CardTitle>
            <CardDescription>
              How each conflict was resolved using business rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <div key={conflict.application_id} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-medium">{conflict.application_id}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{conflict.conflictDescription}</p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-warning/10 text-warning shrink-0">
                      {getConflictTypeLabel(conflict.conflictType)}
                    </span>
                  </div>
                  <div className="mt-3 p-3 bg-success/5 border border-success/20 rounded text-sm">
                    <span className="font-medium text-success">Resolution: </span>
                    <span className="text-foreground">{conflict.resolution}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Rules Reference */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Conflict Resolution Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Login + IPA Conflict</h4>
                <p className="text-muted-foreground">
                  When Login Status is present but Final Status shows IPA: Login presence takes precedence. 
                  KYC is marked as Done.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Post-KYC Without Login</h4>
                <p className="text-muted-foreground">
                  When a post-KYC outcome (Approved, Disbursed) exists without Login: 
                  Post-KYC outcome confirms completion. Login field has data quality issue.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Rejected Quality + Login</h4>
                <p className="text-muted-foreground">
                  When Rejected quality lead has Login: Quality remains Rejected (frozen). 
                  KYC is Done but excluded from conversion denominator.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Priority Order</h4>
                <p className="text-muted-foreground">
                  1. Login Status present = KYC Done<br />
                  2. Post-KYC outcome = KYC Done<br />
                  3. Otherwise = KYC Pending
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
