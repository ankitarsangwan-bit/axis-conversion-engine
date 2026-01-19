import { Plus, RefreshCw, Minus, ArrowRight, CheckCircle2, ShieldX, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChangePreview as ChangePreviewType } from '@/types/misUpload';
import { KpiCard } from '@/components/KpiCard';
import { cn } from '@/lib/utils';

interface ChangePreviewProps {
  changePreview: ChangePreviewType;
  onApply: () => void;
  onBack: () => void;
  isProcessing: boolean;
}

export function ChangePreview({ changePreview, onApply, onBack, isProcessing }: ChangePreviewProps) {
  const { newRecords, updatedRecords, unchangedCount, totalIncoming, skippedRecords = [] } = changePreview;

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="data-grid grid-cols-2 md:grid-cols-5">
        <KpiCard label="Total Incoming" value={totalIncoming} />
        <KpiCard label="New Records" value={newRecords.length} valueColor="success" />
        <KpiCard label="Updates" value={updatedRecords.length} valueColor="info" />
        <KpiCard label="Unchanged" value={unchangedCount} />
        {skippedRecords.length > 0 && (
          <KpiCard label="Skipped (Guards)" value={skippedRecords.length} valueColor="warning" />
        )}
      </div>

      {/* Skipped Records (State Machine Guards) */}
      {skippedRecords.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="compact-card-header">
            <CardTitle className="compact-card-title flex items-center gap-2">
              <ShieldX className="w-4 h-4 text-warning" />
              Skipped Records ({skippedRecords.length})
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Updates rejected by state machine guards (terminal state, backward transition, or stale date)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-48">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Guard</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {skippedRecords.slice(0, 10).map((record) => (
                    <tr key={record.application_id}>
                      <td className="font-mono text-xs">{record.application_id}</td>
                      <td>
                        <Badge className="text-[9px] bg-warning/20 text-warning border-0">
                          {record.reason.includes('terminal') ? 'Terminal State' :
                           record.reason.includes('Backward') ? 'Backward Transition' :
                           record.reason.includes('older') || record.reason.includes('Stale') ? 'Stale Date' :
                           'State Guard'}
                        </Badge>
                      </td>
                      <td className="text-xs text-muted-foreground max-w-xs truncate" title={record.details}>
                        {record.details || record.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {skippedRecords.length > 10 && (
                <div className="p-2 text-center text-xs text-muted-foreground border-t">
                  +{skippedRecords.length - 10} more skipped records
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Records */}
      {newRecords.length > 0 && (
        <Card className="border-success/30">
          <CardHeader className="compact-card-header">
            <CardTitle className="compact-card-title flex items-center gap-2">
              <Plus className="w-4 h-4 text-success" />
              New Records ({newRecords.length})
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              These application IDs don't exist in current data
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-48">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Blaze Output</th>
                    <th>Login Status</th>
                    <th>Final Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {newRecords.slice(0, 10).map((record) => (
                    <tr key={record.application_id}>
                      <td className="font-mono text-xs">{record.application_id}</td>
                      <td>{String(record.newValues.blaze_output || '—')}</td>
                      <td className="text-muted-foreground">{String(record.newValues.login_status || '—')}</td>
                      <td>{String(record.newValues.final_status || '—')}</td>
                      <td className="text-muted-foreground">{String(record.newValues.last_updated_date || '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {newRecords.length > 10 && (
                <div className="p-2 text-center text-xs text-muted-foreground border-t">
                  +{newRecords.length - 10} more new records
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Updated Records */}
      {updatedRecords.length > 0 && (
        <Card className="border-info/30">
          <CardHeader className="compact-card-header">
            <CardTitle className="compact-card-title flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-info" />
              Updated Records ({updatedRecords.length})
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Existing records with changed values (forward-only progression)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-64">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Changed Fields</th>
                    <th>Before</th>
                    <th className="w-8"></th>
                    <th>After</th>
                  </tr>
                </thead>
                <tbody>
                  {updatedRecords.slice(0, 10).map((record) => (
                    <tr key={record.application_id}>
                      <td className="font-mono text-xs">{record.application_id}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {record.changedFields?.map(field => (
                            <Badge key={field} className="text-[9px] bg-info/20 text-info border-0">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="text-xs">
                        <div className="space-y-0.5">
                          {record.changedFields?.map(field => (
                            <div key={field} className="flex items-center gap-1">
                              <span className="text-muted-foreground w-20 truncate">{field}:</span>
                              <span className="text-destructive line-through">
                                {String(record.oldValues?.[field] || '—')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="text-center">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
                      </td>
                      <td className="text-xs">
                        <div className="space-y-0.5">
                          {record.changedFields?.map(field => (
                            <div key={field} className="flex items-center gap-1">
                              <span className="text-muted-foreground w-20 truncate">{field}:</span>
                              <span className="text-success">
                                {String(record.newValues[field] || '—')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {updatedRecords.length > 10 && (
                <div className="p-2 text-center text-xs text-muted-foreground border-t">
                  +{updatedRecords.length - 10} more updated records
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Changes */}
      {newRecords.length === 0 && updatedRecords.length === 0 && (
        <Card className="border-muted">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No changes detected</p>
            <p className="text-xs text-muted-foreground">
              All {unchangedCount} records are identical or blocked by state machine guards
            </p>
          </CardContent>
        </Card>
      )}

      {/* State Machine Logic Note */}
      <div className="p-3 bg-accent rounded-md text-xs space-y-2">
        <p className="font-medium">State-Aware Type-1 SCD (Forward-Only Journey)</p>
        <div className="text-muted-foreground space-y-1">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full"></span>
            <strong>Temporal Guard:</strong> Only accept if <code className="px-1 bg-muted rounded">incoming.date ≥ existing.date</code>
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 bg-info rounded-full"></span>
            <strong>Stage Guard:</strong> Journey can only move <em>forward</em> (higher stage rank)
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 bg-warning rounded-full"></span>
            <strong>Terminal Guard:</strong> Approved/Rejected/Disbursed are <em>immutable</em>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isProcessing}>
          ← Back
        </Button>
        <Button 
          size="sm" 
          onClick={onApply} 
          disabled={isProcessing || (newRecords.length === 0 && updatedRecords.length === 0)}
          className={cn(
            (newRecords.length > 0 || updatedRecords.length > 0) && 'bg-success hover:bg-success/90'
          )}
        >
          {isProcessing ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
              Applying...
            </>
          ) : (
            <>
              Apply {newRecords.length + updatedRecords.length} Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
