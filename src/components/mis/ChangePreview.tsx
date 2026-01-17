import { Plus, RefreshCw, Minus, ArrowRight, CheckCircle2 } from 'lucide-react';
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
  const { newRecords, updatedRecords, unchangedCount, totalIncoming } = changePreview;

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="data-grid grid-cols-2 md:grid-cols-4">
        <KpiCard label="Total Incoming" value={totalIncoming} />
        <KpiCard label="New Records" value={newRecords.length} valueColor="success" />
        <KpiCard label="Updates" value={updatedRecords.length} valueColor="info" />
        <KpiCard label="Unchanged" value={unchangedCount} />
      </div>

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
              Existing records with changed values (Type-1 overwrite)
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
            <p className="text-xs text-muted-foreground">All {unchangedCount} records are identical to existing data</p>
          </CardContent>
        </Card>
      )}

      {/* Overwrite Logic Note */}
      <div className="p-3 bg-accent rounded-md text-xs">
        <p className="font-medium mb-1">Type-1 Overwrite Logic</p>
        <p className="text-muted-foreground">
          For each <code className="px-1 bg-muted rounded">application_id</code>, only the latest record 
          (by <code className="px-1 bg-muted rounded">last_updated_date</code>) is kept. This is not history tracking—current state overwrites previous.
        </p>
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
