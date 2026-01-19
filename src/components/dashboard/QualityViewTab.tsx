import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QualitySummaryRow } from '@/types/axis';
import { KpiCard } from '@/components/KpiCard';
import { ExportButton } from '@/components/ExportButton';

interface MonthQualityData {
  month: string;
  quality: string;
  apps: number;
  contributionPercent: number;
}

interface QualityViewTabProps {
  qualityRows: QualitySummaryRow[];
  monthlyQualityData?: MonthQualityData[];
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function QualityViewTab({ qualityRows, monthlyQualityData = [] }: QualityViewTabProps) {
  // Derive months from the passed data
  const months = useMemo(() => {
    const uniqueMonths = [...new Set(monthlyQualityData.map(d => d.month))];
    return uniqueMonths
      .filter(m => m !== 'Unknown' && !m.includes('1899'))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [monthlyQualityData]);

  // Calculate overall contribution percentages
  const totalApps = qualityRows.reduce((sum, r) => sum + r.totalApplications, 0);
  const goodApps = qualityRows.find(r => r.quality === 'Good')?.totalApplications || 0;
  const avgApps = qualityRows.find(r => r.quality === 'Average')?.totalApplications || 0;
  const rejApps = qualityRows.find(r => r.quality === 'Rejected')?.totalApplications || 0;

  const goodContribution = totalApps > 0 ? (goodApps / totalApps) * 100 : 0;
  const avgContribution = totalApps > 0 ? (avgApps / totalApps) * 100 : 0;
  const rejContribution = totalApps > 0 ? (rejApps / totalApps) * 100 : 0;

  // Prepare month-wise export data
  const monthlyExportData = monthlyQualityData.map(row => ({
    Month: row.month,
    Quality: row.quality,
    'Applications': row.apps,
    'Contribution %': row.contributionPercent.toFixed(1),
  }));

  const hasMonthlyData = monthlyQualityData.length > 0;

  return (
    <div className="space-y-4">
      {/* Quality Contribution KPI Cards */}
      <div className="data-grid grid-cols-4">
        <KpiCard 
          label={`Good Quality (${goodApps.toLocaleString()} apps)`}
          value={formatPercent(goodContribution)}
          valueColor="success"
        />
        <KpiCard 
          label={`Average Quality (${avgApps.toLocaleString()} apps)`}
          value={formatPercent(avgContribution)}
          valueColor="warning"
        />
        <KpiCard 
          label={`Rejected Quality (${rejApps.toLocaleString()} apps)`}
          value={formatPercent(rejContribution)}
          valueColor="destructive"
        />
        <KpiCard 
          label="Total Applications (Denominator)"
          value={totalApps.toLocaleString()}
          valueColor="info"
        />
      </div>

      {/* Month-wise Quality Contribution */}
      <Card className="border-border">
        <CardHeader className="compact-card-header flex-row items-center justify-between">
          <div>
            <CardTitle className="compact-card-title">Month-wise Quality Contribution %</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Contribution % = (Quality Apps / Total Monthly Apps) × 100. Purely descriptive, no conversion metrics.
            </CardDescription>
          </div>
          <ExportButton data={monthlyExportData} filename="quality_contribution_monthly" />
        </CardHeader>
        <CardContent className="p-0">
          {!hasMonthlyData ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              No monthly data available for selected date range
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="text-right">Good Apps</th>
                    <th className="text-right">Good %</th>
                    <th className="text-right">Avg Apps</th>
                    <th className="text-right">Avg %</th>
                    <th className="text-right">Rej Apps</th>
                    <th className="text-right">Rej %</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(month => {
                    const goodData = monthlyQualityData.find(d => d.month === month && d.quality === 'Good');
                    const avgData = monthlyQualityData.find(d => d.month === month && d.quality === 'Average');
                    const rejData = monthlyQualityData.find(d => d.month === month && d.quality === 'Rejected');
                    
                    const monthTotal = (goodData?.apps || 0) + (avgData?.apps || 0) + (rejData?.apps || 0);
                    
                    return (
                      <tr key={month}>
                        <td className="font-medium">{month}</td>
                        <td className="text-right tabular-nums text-success">{(goodData?.apps || 0).toLocaleString()}</td>
                        <td className="text-right tabular-nums font-semibold text-success">{formatPercent(goodData?.contributionPercent || 0)}</td>
                        <td className="text-right tabular-nums text-warning">{(avgData?.apps || 0).toLocaleString()}</td>
                        <td className="text-right tabular-nums font-semibold text-warning">{formatPercent(avgData?.contributionPercent || 0)}</td>
                        <td className="text-right tabular-nums text-destructive">{(rejData?.apps || 0).toLocaleString()}</td>
                        <td className="text-right tabular-nums font-semibold text-destructive">{formatPercent(rejData?.contributionPercent || 0)}</td>
                        <td className="text-right tabular-nums font-medium">{monthTotal.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
