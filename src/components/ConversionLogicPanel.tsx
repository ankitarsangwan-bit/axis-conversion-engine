import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export function ConversionLogicPanel() {
  return (
    <Card className="animate-fade-in border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="h-5 w-5 text-primary" />
          Axis Conversion Logic
        </CardTitle>
        <CardDescription>
          KYC is considered completed if either condition is met
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            KYC Completed When:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6">
            <li>• LOGIN STATUS is present (Login / Login 26)</li>
            <li>• OR FINAL STATUS ≠ IPA</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            NOT Conversion:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6">
            <li>• VKYC Rejected alone</li>
            <li>• Bank auto-decline after 25 days</li>
            <li>• IPA stage only</li>
          </ul>
        </div>

        <div className="pt-2 border-t">
          <h4 className="font-semibold text-sm mb-2">Lead Quality Mapping:</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="status-badge quality-average">STPT/STPI</span>
              <span className="text-muted-foreground">→ Average</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-badge quality-rejected">Reject</span>
              <span className="text-muted-foreground">→ Rejected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-badge quality-good">Others</span>
              <span className="text-muted-foreground">→ Good</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
