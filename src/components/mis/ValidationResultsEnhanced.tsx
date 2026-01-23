import { AlertCircle, AlertTriangle, CheckCircle2, FileWarning, RefreshCw, Trash2, Upload, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ValidationResult, ColumnErrorSummary } from '@/types/misUpload';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ValidationResultsEnhancedProps {
  validationResult: ValidationResult;
  droppedRowCount: number;
  onPreview: () => void;
  onBack: () => void;
  onReupload: () => void;
  onDropInvalidRows: (rowNumbers: number[]) => void;
  onClearDropped: () => void;
}

function getErrorTypeLabel(errorType: ColumnErrorSummary['errorType']): string {
  switch (errorType) {
    case 'unmapped': return 'Unmapped Column';
    case 'blank': return 'Blank/NULL Value';
    case 'invalid_format': return 'Invalid Format';
    case 'missing': return 'Missing Value';
    default: return 'Error';
  }
}

function getFixActionLabel(fixAction: ColumnErrorSummary['fixAction']): { label: string; icon: typeof RefreshCw } {
  switch (fixAction) {
    case 'remap': return { label: 'Go back to re-map column', icon: ArrowLeft };
    case 'reupload': return { label: 'Fix in source file & re-upload', icon: Upload };
    case 'drop': return { label: 'Drop affected rows', icon: Trash2 };
    default: return { label: 'Fix required', icon: RefreshCw };
  }
}

export function ValidationResultsEnhanced({
  validationResult,
  droppedRowCount,
  onPreview,
  onBack,
  onReupload,
  onDropInvalidRows,
  onClearDropped,
}: ValidationResultsEnhancedProps) {
  const { isValid, errors, warnings, totalRows, validRows, invalidRows, errorSummary } = validationResult;
  const [showDropConfirm, setShowDropConfirm] = useState(false);

  const schemaErrors = errorSummary.filter(e => e.errorType === 'unmapped');
  const rowErrors = errorSummary.filter(e => e.errorType !== 'unmapped');

  // Get all invalid row numbers for drop action
  const allInvalidRows = Array.from(
    new Set(errors.filter(e => e.row).map(e => e.row!))
  );

  const canProceedWithDrop = droppedRowCount > 0 && invalidRows === 0;
  const effectiveValidRows = validRows + (canProceedWithDrop ? 0 : 0);

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total Rows</div>
          <div className="text-xl font-bold">{totalRows.toLocaleString()}</div>
        </Card>
        <Card className={`p-3 ${validRows > 0 ? 'border-success/30' : ''}`}>
          <div className="text-xs text-muted-foreground">Valid</div>
          <div className="text-xl font-bold text-success">{validRows.toLocaleString()}</div>
        </Card>
        <Card className={`p-3 ${invalidRows > 0 ? 'border-destructive/30' : ''}`}>
          <div className="text-xs text-muted-foreground">Invalid</div>
          <div className="text-xl font-bold text-destructive">{invalidRows.toLocaleString()}</div>
        </Card>
        {droppedRowCount > 0 && (
          <Card className="p-3 border-warning/30">
            <div className="text-xs text-muted-foreground">Dropped</div>
            <div className="text-xl font-bold text-warning">{droppedRowCount.toLocaleString()}</div>
          </Card>
        )}
      </div>

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
            <div className="flex-1">
              <CardTitle className="compact-card-title">
                {isValid ? 'Validation Passed' : 'Validation Blocked'}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {isValid
                  ? `All ${validRows} rows are valid and ready for upload`
                  : `${errorSummary.length} column(s) have issues affecting ${invalidRows} row(s)`
                }
              </CardDescription>
            </div>
            {!isValid && (
              <Badge variant="destructive" className="text-xs">
                Upload Blocked
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Schema Errors (Unmapped Required Columns) - Must be fixed by re-mapping */}
      {schemaErrors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="compact-card-header">
            <CardTitle className="compact-card-title flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-destructive" />
              Unmapped Required Columns ({schemaErrors.length})
            </CardTitle>
            <CardDescription className="text-xs">
              These columns must be mapped before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {schemaErrors.map((error, idx) => {
              const fixInfo = getFixActionLabel(error.fixAction);
              return (
                <div key={idx} className="flex items-center justify-between p-2 bg-destructive/5 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] bg-destructive/20 text-destructive border-0">
                      {error.column}
                    </Badge>
                    <span className="text-muted-foreground">
                      Affects all {totalRows} rows
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onBack}>
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    Re-map
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Row-Level Errors - Can be fixed by re-upload or dropped */}
      {rowErrors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="compact-card-header">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="compact-card-title flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  Row-Level Errors ({rowErrors.reduce((sum, e) => sum + e.errorCount, 0)} issues)
                </CardTitle>
                <CardDescription className="text-xs">
                  {invalidRows} row(s) have blank or invalid mandatory values
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {rowErrors.map((error, idx) => (
              <div key={idx} className="p-3 bg-destructive/5 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] bg-destructive/20 text-destructive border-0">
                      {error.column}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {getErrorTypeLabel(error.errorType)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {error.errorCount} row(s)
                    </span>
                  </div>
                </div>
                
                {/* Sample errors */}
                <div className="text-xs space-y-1 border-l-2 border-destructive/20 pl-2">
                  {error.sampleErrors.slice(0, 3).map((sample, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-14 shrink-0">Row {sample.row}</span>
                      {sample.value ? (
                        <span className="truncate text-foreground">"{sample.value}"</span>
                      ) : (
                        <span className="italic">NULL/Empty</span>
                      )}
                    </div>
                  ))}
                  {error.sampleErrors.length > 3 && (
                    <div className="text-muted-foreground">
                      +{error.errorCount - 3} more rows
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Fix Options */}
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium">How to fix:</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onReupload}>
                  <Upload className="w-3 h-3 mr-1" />
                  Fix in source file & re-upload
                </Button>
                
                <AlertDialog open={showDropConfirm} onOpenChange={setShowDropConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs border-warning/50 text-warning hover:bg-warning/10">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Drop {invalidRows} invalid row(s)
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Drop Invalid Rows</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          You are about to permanently exclude <strong>{allInvalidRows.length} rows</strong> from this upload.
                        </p>
                        <p className="text-warning">
                          ⚠️ These rows will NOT be uploaded to the database. This cannot be undone for this upload session.
                        </p>
                        <p>
                          Only <strong>{validRows} valid rows</strong> will proceed.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-warning text-warning-foreground hover:bg-warning/90"
                        onClick={() => {
                          onDropInvalidRows(allInvalidRows);
                          setShowDropConfirm(false);
                        }}
                      >
                        Yes, drop {allInvalidRows.length} rows
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              {droppedRowCount > 0 && (
                <div className="flex items-center gap-2 p-2 bg-warning/10 rounded text-xs">
                  <Badge variant="outline" className="bg-warning/20 text-warning border-0">
                    {droppedRowCount} rows marked for drop
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClearDropped}>
                    Undo
                  </Button>
                </div>
              )}
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
        <Button
          size="sm"
          onClick={onPreview}
          disabled={!isValid && !canProceedWithDrop}
        >
          {isValid ? 'Preview Changes →' : 'Fix Errors to Continue'}
        </Button>
      </div>
    </div>
  );
}
