import { FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { AxisApplicationsTable } from '@/components/AxisApplicationsTable';
import { ConversionLogicPanel } from '@/components/ConversionLogicPanel';
import { sampleAxisApplications, getAxisStats } from '@/data/sampleAxisData';

const Index = () => {
  const stats = getAxisStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Axis Card Conversion Tracker</h1>
              <p className="text-sm text-muted-foreground">
                Lead-level, status-driven reporting • Latest status always wins
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Applications"
            value={stats.total}
            icon={FileText}
            variant="default"
          />
          <StatCard
            title="KYC Completed"
            value={stats.kycCompleted}
            icon={CheckCircle}
            variant="success"
            description={`${stats.conversionRate}% conversion`}
          />
          <StatCard
            title="KYC Pending"
            value={stats.kycPending}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Lead Quality"
            value={`${stats.qualityBreakdown.good} Good`}
            icon={TrendingUp}
            variant="info"
            description={`${stats.qualityBreakdown.average} Avg • ${stats.qualityBreakdown.rejected} Rej`}
          />
        </div>

        {/* Logic Panel */}
        <ConversionLogicPanel />

        {/* Applications Table */}
        <AxisApplicationsTable applications={sampleAxisApplications} />

        {/* Footer Note */}
        <div className="text-center py-4 text-sm text-muted-foreground">
          <p>
            ⚡ Axis reporting is driven by KYC completion, not bank auto-decline.
            <br />
            Anything without KYC completion remains <strong>KYC Pending</strong>.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
