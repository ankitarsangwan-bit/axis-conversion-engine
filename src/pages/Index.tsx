import { useState } from 'react';
import { FullViewTab } from '@/components/dashboard/FullViewTab';
import { QualityViewTab } from '@/components/dashboard/QualityViewTab';
import { DataFreshnessTab } from '@/components/dashboard/DataFreshnessTab';
import { ConflictResolutionTab } from '@/components/dashboard/ConflictResolutionTab';
import { MISUploadTab } from '@/components/dashboard/MISUploadTab';
import { StpkVkycTab } from '@/components/dashboard/StpkVkycTab';
import { AppSidebar } from '@/components/AppSidebar';
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

function Index() {
  const [activeTab, setActiveTab] = useState('full-view');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const summaryRows = getAxisSummaryByMonth();
  const totals = getAxisTotals();
  const qualityRows = getQualitySummary();
  const freshnessRows = getDataFreshness();
  const conflicts = getConflictRecords();
  const uploadSummary = getUploadSummary();
  const misUploadHistory = getMISUploadHistory();
  const currentMISUpload = getCurrentMISUpload();
  const vkycFunnelMetrics = getVkycFunnelMetrics();
  const vkycFunnelByMonth = getVkycFunnelByMonth();

  const renderContent = () => {
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 bg-success/20 text-success rounded text-[10px] font-medium">LIVE</span>
            <span>Axis Bank</span>
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
