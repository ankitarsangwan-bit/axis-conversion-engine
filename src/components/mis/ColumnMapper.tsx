import { ArrowRight, Check, AlertTriangle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ColumnMapping, REQUIRED_COLUMNS, OPTIONAL_COLUMNS, ParsedMISFile } from '@/types/misUpload';
import { cn } from '@/lib/utils';

interface ColumnMapperProps {
  parsedFile: ParsedMISFile;
  columnMappings: ColumnMapping[];
  onUpdateMapping: (sourceColumn: string, targetColumn: string | null) => void;
  onValidate: () => void;
  onBack: () => void;
}

export function ColumnMapper({
  parsedFile,
  columnMappings,
  onUpdateMapping,
  onValidate,
  onBack,
}: ColumnMapperProps) {
  const allTargets = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
  const mappedTargets = columnMappings.filter(m => m.isMapped).map(m => m.targetColumn);
  const unmappedRequired = REQUIRED_COLUMNS.filter(col => !mappedTargets.includes(col));
  const canProceed = unmappedRequired.length === 0;

  return (
    <div className="space-y-4">
      {/* File Info */}
      <Card className="border-primary/30">
        <CardHeader className="compact-card-header pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="compact-card-title">{parsedFile.fileName}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {parsedFile.rows.length.toLocaleString()} rows • {parsedFile.columns.length} columns • {formatFileSize(parsedFile.fileSize)}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-[10px]">
              PARSED
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Mapping Status */}
      {unmappedRequired.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-md text-xs text-warning">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Required columns not mapped: {unmappedRequired.join(', ')}</span>
        </div>
      )}

      {/* Column Mappings */}
      <Card className="border-border">
        <CardHeader className="compact-card-header">
          <CardTitle className="compact-card-title">Column Mapping</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Map your file columns to the expected schema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Source Column</th>
                  <th className="w-10"></th>
                  <th>Target Column</th>
                  <th>Status</th>
                  <th>Sample Value</th>
                </tr>
              </thead>
              <tbody>
                {columnMappings.map((mapping) => {
                  const sampleValue = parsedFile.rows[0]?.[mapping.sourceColumn];
                  const isRequired = mapping.targetColumn && REQUIRED_COLUMNS.includes(mapping.targetColumn as any);

                  return (
                    <tr key={mapping.sourceColumn}>
                      <td className="font-mono text-xs">{mapping.sourceColumn}</td>
                      <td className="text-center">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
                      </td>
                      <td>
                        <Select
                          value={mapping.targetColumn || '__none__'}
                          onValueChange={(val) => onUpdateMapping(mapping.sourceColumn, val === '__none__' ? null : val)}
                        >
                          <SelectTrigger className="h-7 text-xs w-full">
                            <SelectValue placeholder="Select mapping..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">— Not mapped —</span>
                            </SelectItem>
                            {allTargets.map(target => {
                              const alreadyMapped = mappedTargets.includes(target) && mapping.targetColumn !== target;
                              return (
                                <SelectItem key={target} value={target} disabled={alreadyMapped}>
                                  <span className={cn(alreadyMapped && 'text-muted-foreground')}>
                                    {target}
                                    {REQUIRED_COLUMNS.includes(target as any) && ' *'}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </td>
                      <td>
                        {mapping.isMapped ? (
                          <Badge className={cn(
                            'text-[10px] border-0',
                            isRequired ? 'bg-success/20 text-success' : 'bg-info/20 text-info'
                          )}>
                            <Check className="w-3 h-3 mr-1" />
                            {isRequired ? 'Required' : 'Optional'}
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-muted text-muted-foreground border-0">
                            <X className="w-3 h-3 mr-1" />
                            Skipped
                          </Badge>
                        )}
                      </td>
                      <td className="text-xs text-muted-foreground font-mono max-w-[150px] truncate">
                        {sampleValue !== null && sampleValue !== undefined ? String(sampleValue) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <Button size="sm" onClick={onValidate} disabled={!canProceed}>
          Validate Data →
        </Button>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
