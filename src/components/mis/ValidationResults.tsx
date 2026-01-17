import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ValidationResult } from '@/types/misUpload';

interface ValidationResultsProps {
  validationResult: ValidationResult;
  onPreview: () => void;
  onBack: () => void;
}

export function ValidationResults({ validationResult, onPreview, onBack }: ValidationResultsProps) {
  const { isValid, errors, warnings } = validationResult;

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
                {errors.length} errors • {warnings.length} warnings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="compact-card-header">
            <CardTitle className="compact-card-title flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Errors ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {errors.map((error, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-destructive/5 rounded text-xs">
                  <Badge className="text-[9px] bg-destructive/20 text-destructive border-0 shrink-0">
                    {error.type.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-foreground">{error.message}</span>
                  {error.row && <span className="text-muted-foreground ml-auto">Row {error.row}</span>}
                </div>
              ))}
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
