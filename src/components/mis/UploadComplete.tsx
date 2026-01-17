import { CheckCircle2, RotateCcw, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChangePreview } from '@/types/misUpload';

interface UploadCompleteProps {
  changePreview: ChangePreview;
  onReset: () => void;
}

export function UploadComplete({ changePreview, onReset }: UploadCompleteProps) {
  const { newRecords, updatedRecords } = changePreview;
  const totalChanges = newRecords.length + updatedRecords.length;

  return (
    <Card className="border-success/30">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        
        <h3 className="text-lg font-semibold mb-1">Upload Complete</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          Successfully applied {totalChanges} changes
          <br />
          <span className="text-success">{newRecords.length} new</span>
          {' • '}
          <span className="text-info">{updatedRecords.length} updated</span>
        </p>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Upload Another File
          </Button>
          <Button size="sm" asChild>
            <a href="#full-view">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View Dashboard
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
