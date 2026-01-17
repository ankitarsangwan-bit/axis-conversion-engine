import { FileText } from 'lucide-react';
import { AxisConversionDashboard } from '@/components/AxisConversionDashboard';
import { ConversionLogicPanel } from '@/components/ConversionLogicPanel';
import { getAxisSummaryByMonth, getAxisTotals } from '@/data/sampleAxisData';

const Index = () => {
  const summaryRows = getAxisSummaryByMonth();
  const totals = getAxisTotals();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Axis Card Conversion Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Lead-level, status-driven reporting
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <AxisConversionDashboard summaryRows={summaryRows} totals={totals} />
        <ConversionLogicPanel />
      </main>
    </div>
  );
};

export default Index;
