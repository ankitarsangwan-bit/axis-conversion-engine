import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  error: string | null;
}

export function FileUploadZone({ onFileSelect, isProcessing, error }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && isValidFileType(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFileType(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          isProcessing && 'opacity-50 pointer-events-none'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mb-4',
            isDragging ? 'bg-primary/20' : 'bg-muted'
          )}>
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className={cn('w-7 h-7', isDragging ? 'text-primary' : 'text-muted-foreground')} />
            )}
          </div>

          <h3 className="text-sm font-medium mb-1">
            {isProcessing ? 'Parsing file...' : 'Drop your MIS file here'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            CSV, XLS, or XLSX formats supported
          </p>

          <label htmlFor="file-upload">
            <Button variant="outline" size="sm" asChild disabled={isProcessing}>
              <span>
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                Browse Files
              </span>
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFileInput}
            className="hidden"
            disabled={isProcessing}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-xs text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Expected columns:</p>
        <div className="flex flex-wrap gap-1">
          {['application_id', 'blaze_output', 'login_status', 'final_status', 'last_updated_date'].map(col => (
            <span key={col} className="px-1.5 py-0.5 bg-muted rounded font-mono">{col}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function isValidFileType(file: File): boolean {
  const validTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const validExtensions = ['.csv', '.xls', '.xlsx'];
  
  return validTypes.includes(file.type) || 
         validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}
