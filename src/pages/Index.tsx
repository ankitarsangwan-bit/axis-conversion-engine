import { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { DateRange } from 'react-day-picker';
import { subMonths } from 'date-fns';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { 
  FullViewSkeleton,
  QualityViewSkeleton,
  DataFreshnessSkeleton,
  TableSkeleton
} from '@/components/dashboard/DashboardSkeleton';
import { 
  getAxisSummaryByMonth, 
  getAxisTotals, 
  getQualitySummary,
  getDataFreshness,
  getConflictRecords,
  getUploadSummary,
  getMISUploadHistory,
  getCurrentMISUpload,
  getVkycFunnelMetrics,
  getVkycFunnelByMonth
} from '@/data/sampleAxisData';

// Lazy load tab components
const FullViewTab = lazy(() => import('@/components/dashboard/FullViewTab').then(m => ({ default: m.FullViewTab })));
const QualityViewTab = lazy(() => import('@/components/dashboard/QualityViewTab').then(m => ({ default: m.QualityViewTab })));
const DataFreshnessTab = lazy(() => import('@/components/dashboard/DataFreshnessTab').then(m => ({ default: m.DataFreshnessTab })));
const ConflictResolutionTab = lazy(() => import('@/components/dashboard/ConflictResolutionTab').then(m => ({ default: m.ConflictResolutionTab })));
const MISUploadTab = lazy(() => import('@/components/dashboard/MISUploadTab').then(m => ({ default: m.MISUploadTab })));
const StpkVkycTab = lazy(() => import('@/components/dashboard/StpkVkycTab').then(m => ({ default: m.StpkVkycTab })));

function Index() {
  const [activeTab, setActiveTab] = useState('full-view');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial data load
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Memoize expensive data calculations
  const summaryRows = useMemo(() => getAxisSummaryByMonth(), []);
  const totals = useMemo(() => getAxisTotals(), []);
  const qualityRows = useMemo(() => getQualitySummary(), []);
  const freshnessRows = useMemo(() => getDataFreshness(), []);
  const conflicts = useMemo(() => getConflictRecords(), []);
  const uploadSummary = useMemo(() => getUploadSummary(), []);
  const misUploadHistory = useMemo(() => getMISUploadHistory(), []);
  const currentMISUpload = useMemo(() => getCurrentMISUpload(), []);
  const vkycFunnelMetrics = useMemo(() => getVkycFunnelMetrics(), []);
  const vkycFunnelByMonth = useMemo(() => getVkycFunnelByMonth(), []);

  const getSkeleton = () => {
    switch (activeTab) {
      case 'full-view':
        return <FullViewSkeleton />;
      case 'quality-view':
        return <QualityViewSkeleton />;
      case 'data-freshness':
        return <DataFreshnessSkeleton />;
      default:
        return <TableSkeleton rows={6} />;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return getSkeleton();
    }

    return (
      <Suspense fallback={getSkeleton()}>
        {(() => {
          switch (activeTab) {
            case 'full-view':
              return <FullViewTab summaryRows={summaryRows} totals={totals} />;
            case 'quality-view':
              return <QualityViewTab qualityRows={qualityRows} />;
            case 'mis-upload':
              return <MISUploadTab currentUpload={currentMISUpload} uploadHistory={misUploadHistory} />;
            case 'data-freshness':
              return <DataFreshnessTab freshnessRows={freshnessRows} uploadSummary={uploadSummary} />;
            case 'stpk-vkyc':
              return <StpkVkycTab funnelMetrics={vkycFunnelMetrics} funnelByMonth={vkycFunnelByMonth} />;
            case 'conflicts':
              return <ConflictResolutionTab conflicts={conflicts} />;
            default:
              return <FullViewTab summaryRows={summaryRows} totals={totals} />;
          }
        })()}
      </Suspense>
    );
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      'full-view': 'Full View',
      'quality-view': 'Quality Analysis',
      'mis-upload': 'MIS Upload',
      'data-freshness': 'Data Freshness',
      'stpk-vkyc': 'STPK / VKYC Deep-Dive',
      'conflicts': 'Conflict Resolution',
    };
    return titles[activeTab] || 'Dashboard';
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <AppSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-foreground">{getPageTitle()}</h1>
            <span className="text-xs text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
            <span className="px-2 py-0.5 bg-success/20 text-success rounded text-[10px] font-medium">LIVE</span>
            <span>Axis Bank</span>
            <ThemeToggle />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default Index;
