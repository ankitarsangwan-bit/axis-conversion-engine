import { useState, Suspense, lazy, useCallback, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { subMonths } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { QualityFilter, QualityLevel } from '@/components/QualityFilter';
import { useDashboardData } from '@/hooks/useDashboardData';
import { 
  FullViewSkeleton,
  QualityViewSkeleton,
  DataFreshnessSkeleton,
  TableSkeleton
} from '@/components/dashboard/DashboardSkeleton';

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
  const [qualityFilter, setQualityFilter] = useState<QualityLevel>('all');

  // Use the dashboard data hook with date range filter
  const { data, isLoading, refresh } = useDashboardData(dateRange);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

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

  // Filter summary rows by quality
  const filteredData = useMemo(() => {
    if (!data || qualityFilter === 'all') return data;
    
    // Find the quality row matching the filter
    const qualityRow = data.qualityRows.find(q => q.quality === qualityFilter);
    
    if (!qualityRow) return data;
    
    // Create filtered summary rows from quality data
    const filteredSummaryRows = data.summaryRows.map(row => ({
      ...row,
      // We'll need to recalculate based on quality - for now use quality totals
    }));
    
    // Use quality row data as the filtered totals
    const filteredTotals = {
      ...data.totals,
      totalApplications: qualityRow.totalApplications,
      eligibleForKyc: qualityRow.eligibleForKyc,
      kycPending: qualityRow.kycPending,
      kycDone: qualityRow.kycDone,
      kycConversionPercent: qualityRow.kycConversionPercent,
      cardsApproved: qualityRow.cardsApproved,
      approvalPercent: qualityRow.approvalPercent,
      rejectedPostKyc: qualityRow.rejectedPostKyc,
      rejectionPercent: qualityRow.rejectionPercent,
    };
    
    return {
      ...data,
      totals: filteredTotals,
    };
  }, [data, qualityFilter]);

  const renderContent = () => {
    if (isLoading || !filteredData) {
      return getSkeleton();
    }

    return (
      <Suspense fallback={getSkeleton()}>
        {(() => {
          switch (activeTab) {
            case 'full-view':
              return <FullViewTab summaryRows={filteredData.summaryRows} totals={filteredData.totals} />;
            case 'quality-view':
              return <QualityViewTab qualityRows={filteredData.qualityRows} />;
            case 'mis-upload':
              return (
                <MISUploadTab 
                  currentUpload={filteredData.currentMISUpload} 
                  uploadHistory={filteredData.misUploadHistory} 
                  onViewDashboard={() => {
                    handleRefresh();
                    setActiveTab('full-view');
                  }} 
                />
              );
            case 'data-freshness':
              return <DataFreshnessTab freshnessRows={filteredData.freshnessRows} uploadSummary={filteredData.uploadSummary} />;
            case 'stpk-vkyc':
              return <StpkVkycTab funnelMetrics={filteredData.vkycFunnelMetrics} funnelByMonth={filteredData.vkycFunnelByMonth} />;
            case 'conflicts':
              return <ConflictResolutionTab conflicts={filteredData.conflicts} />;
            default:
              return <FullViewTab summaryRows={filteredData.summaryRows} totals={filteredData.totals} />;
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
              Last updated: {data?.currentMISUpload?.uploadDate 
                ? new Date(data.currentMISUpload.uploadDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                : 'Loading...'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="h-7 px-2 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            {activeTab === 'full-view' && (
              <QualityFilter value={qualityFilter} onChange={setQualityFilter} />
            )}
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
