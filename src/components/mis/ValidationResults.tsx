import { AlertCircle, AlertTriangle, CheckCircle2, FileWarning, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ValidationResult, ValidationError } from '@/types/misUpload';

interface ValidationResultsProps {
  validationResult: ValidationResult;
  onPreview: () => void;
  onBack: () => void;
}

// Determine if an error is fixable at source (MIS file) vs system-side
function getFixabilityInfo(error: ValidationError): { isFixableAtSource: boolean; action: string } {
  switch (error.type) {
    case 'missing_required':
      return {
        isFixableAtSource: true,
        action: 'Map the missing column in the Column Mapping step',
      };
    case 'invalid_format':
      if (error.column === 'application_date') {
        return {
          isFixableAtSource: true,
          action: 'Fix date format in source file or check column mapping',
        };
      }
      if (error.message.includes('NULL') || error.message.includes('empty')) {
        return {
          isFixableAtSource: true,
          action: 'Add missing value in source MIS file and re-upload',
        };
      }
      return {
        isFixableAtSource: true,
        action: 'Fix value format in source file and re-upload',
      };
    case 'duplicate_id':
      return {
        isFixableAtSource: false,
        action: 'Latest row will be used automatically (Type-1 overwrite)',
      };
    case 'schema_mismatch':
      return {
        isFixableAtSource: true,
        action: 'Ensure file matches expected Axis MIS schema',
      };
    default:
      return {
        isFixableAtSource: true,
        action: 'Review and fix in source file',
      };
  }
}

// Group errors by column for cleaner display
function groupErrorsByColumn(errors: ValidationError[]): Map<string, ValidationError[]> {
  const grouped = new Map<string, ValidationError[]>();
  errors.forEach(error => {
    const key = error.column || 'general';
    const existing = grouped.get(key) || [];
    existing.push(error);
    grouped.set(key, existing);
  });
  return grouped;
}

export function ValidationResults({ validationResult, onPreview, onBack }: ValidationResultsProps) {
  const { isValid, errors, warnings } = validationResult;
  
  const schemaErrors = errors.filter(e => e.type === 'missing_required');
  const rowErrors = errors.filter(e => e.type !== 'missing_required');
  const groupedRowErrors = groupErrorsByColumn(rowErrors);

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className={isValid ? 'border-success/30' : 'border-destructive/30'}>
        <CardHeader className="compact-card-header">
          <div className="flex items-center gap-3">
            {isValid ? (
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
            )}
            <div>
              <CardTitle className="compact-card-title">
                {isValid ? 'Validation Passed' : 'Validation Failed'}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {schemaErrors.length > 0 
                  ? `${schemaErrors.length} unmapped required columns` 
                  : rowErrors.length > 0 
                    ? `${rowErrors.length} row-level issues in ${groupedRowErrors.size} column(s)`
                    : `${errors.length} errors • ${warnings.length} warnings`
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Schema Errors (Unmapped Required Columns) */}
      {schemaErrors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="compact-card-header">
            <CardTitle className="compact-card-title flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-destructive" />
              Missing Required Columns ({schemaErrors.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Go back to Column Mapping to map these mandatory columns
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {schemaErrors.map((error, idx) => {
                const fixInfo = getFixabilityInfo(error);
                return (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-destructive/5 rounded text-xs">
                    <Badge className="text-[9px] bg-destructive/20 text-destructive border-0 shrink-0">
                      {error.column}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-foreground">{error.message}</p>
                      <p className="text-muted-foreground mt-0.5 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        {fixInfo.action}
                      </p>
                    </div>
                    <Badge className="text-[9px] bg-info/20 text-info border-0 shrink-0">
                      Fix at source
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row-Level Errors (Grouped by Column) */}
      {rowErrors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="compact-card-header">
            <CardTitle className="compact-card-title flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Row-Level Errors ({rowErrors.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Rows with NULL or unparsable mandatory columns - fix in source file
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {Array.from(groupedRowErrors.entries()).map(([column, columnErrors]) => {
                const sampleError = columnErrors[0];
                const fixInfo = getFixabilityInfo(sampleError);
                return (
                  <div key={column} className="p-2 bg-destructive/5 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className="text-[10px] bg-destructive/20 text-destructive border-0">
                        {column}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {columnErrors.length} row(s) affected
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      {columnErrors.slice(0, 3).map((error, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-muted-foreground w-16 shrink-0">Row {error.row}</span>
                          <span className="text-foreground truncate">{error.message.split(': ').pop()}</span>
                        </div>
                      ))}
                      {columnErrors.length > 3 && (
                        <p className="text-muted-foreground">+{columnErrors.length - 3} more rows</p>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-destructive/10 flex items-center gap-2 text-[10px]">
                      {fixInfo.isFixableAtSource ? (
                        <Badge className="bg-info/20 text-info border-0">Fix at source</Badge>
                      ) : (
                        <Badge className="bg-success/20 text-success border-0">Auto-handled</Badge>
                      )}
                      <span className="text-muted-foreground">{fixInfo.action}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="compact-card-header">
            <CardTitle className="compact-card-title flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Warnings ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {warnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-warning/5 rounded text-xs">
                  <Badge className="text-[9px] bg-warning/20 text-warning border-0 shrink-0">
                    {warning.type.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-foreground">{warning.message}</span>
                  {warning.row && <span className="text-muted-foreground ml-auto">Row {warning.row}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back to Mapping
        </Button>
        <Button size="sm" onClick={onPreview} disabled={!isValid}>
          Preview Changes →
        </Button>
      </div>
    </div>
  );
}
