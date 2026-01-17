import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FullViewTab } from '@/components/dashboard/FullViewTab';
import { QualityViewTab } from '@/components/dashboard/QualityViewTab';
import { DataFreshnessTab } from '@/components/dashboard/DataFreshnessTab';
import { ConflictResolutionTab } from '@/components/dashboard/ConflictResolutionTab';
import { 
  getAxisSummaryByMonth, 
  getAxisTotals, 
  getQualitySummary,
  getDataFreshness,
  getConflictRecords,
  getUploadSummary
} from '@/data/sampleAxisData';

function Index() {
  const summaryRows = getAxisSummaryByMonth();
  const totals = getAxisTotals();
  const qualityRows = getQualitySummary();
  const freshnessRows = getDataFreshness();
  const conflicts = getConflictRecords();
  const uploadSummary = getUploadSummary();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Axis Bank Card Conversion</h1>
          <p className="text-muted-foreground mt-1">
            KYC-driven conversion tracking with quality-level analysis
          </p>
        </header>

        {/* Tabbed Dashboard */}
        <Tabs defaultValue="full-view" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="full-view">Full View</TabsTrigger>
            <TabsTrigger value="quality-view">Quality Analysis</TabsTrigger>
            <TabsTrigger value="data-freshness">Data Freshness</TabsTrigger>
            <TabsTrigger value="conflicts">Conflict Resolution</TabsTrigger>
          </TabsList>

          <TabsContent value="full-view">
            <FullViewTab summaryRows={summaryRows} totals={totals} />
          </TabsContent>

          <TabsContent value="quality-view">
            <QualityViewTab qualityRows={qualityRows} />
          </TabsContent>

          <TabsContent value="data-freshness">
            <DataFreshnessTab freshnessRows={freshnessRows} uploadSummary={uploadSummary} />
          </TabsContent>

          <TabsContent value="conflicts">
            <ConflictResolutionTab conflicts={conflicts} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Index;
