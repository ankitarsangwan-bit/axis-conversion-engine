import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QualitySummaryRow } from '@/types/axis';
import { KpiCard } from '@/components/KpiCard';
import { ExportButton } from '@/components/ExportButton';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface QualityViewTabProps {
  qualityRows: QualitySummaryRow[];
}

interface MonthQualityData {
  month: string;
  quality: string;
  apps: number;
  contributionPercent: number;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getQualityStyle(quality: string): string {
  switch (quality) {
    case 'Good': return 'text-success font-medium';
    case 'Average': return 'text-warning font-medium';
    case 'Rejected': return 'text-destructive font-medium';
    default: return '';
  }
}

export function QualityViewTab({ qualityRows }: QualityViewTabProps) {
  const [monthlyData, setMonthlyData] = useState<MonthQualityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [months, setMonths] = useState<string[]>([]);

  useEffect(() => {
    async function fetchMonthlyQualityData() {
      setIsLoading(true);
      try {
        // Fetch all records in batches
        let allRecords: any[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('mis_records')
            .select('month, lead_quality')
            .range(from, from + batchSize - 1);

          if (error) break;
          if (data && data.length > 0) {
            allRecords = [...allRecords, ...data];
            from += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        // Group by month and quality - count distinct applications
        const monthQualityMap = new Map<string, Map<string, number>>();
        const monthTotals = new Map<string, number>();

        allRecords.forEach(record => {
          const month = record.month || 'Unknown';
          const quality = record.lead_quality || 'Unknown';
          
          if (!monthQualityMap.has(month)) {
            monthQualityMap.set(month, new Map());
          }
          
          const qualityMap = monthQualityMap.get(month)!;
          qualityMap.set(quality, (qualityMap.get(quality) || 0) + 1);
          monthTotals.set(month, (monthTotals.get(month) || 0) + 1);
        });

        // Convert to array with calculated contribution percentages
        const result: MonthQualityData[] = [];
        const sortedMonths: string[] = [];
        
        monthQualityMap.forEach((qualityMap, month) => {
          // Skip invalid months
          if (month === 'Unknown' || month.includes('1899')) return;
          
          sortedMonths.push(month);
          const monthTotal = monthTotals.get(month) || 1;
          
          ['Good', 'Average', 'Rejected'].forEach(quality => {
            const apps = qualityMap.get(quality) || 0;
            result.push({
              month,
              quality,
              apps,
              contributionPercent: (apps / monthTotal) * 100,
            });
          });
        });

        // Sort months chronologically
        sortedMonths.sort((a, b) => {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return dateA.getTime() - dateB.getTime();
        });

        setMonths(sortedMonths);
        setMonthlyData(result);
      } catch (err) {
        console.error('Error fetching monthly quality data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMonthlyQualityData();
  }, []);

  // Calculate overall contribution percentages
  const totalApps = qualityRows.reduce((sum, r) => sum + r.totalApplications, 0);
  const goodApps = qualityRows.find(r => r.quality === 'Good')?.totalApplications || 0;
  const avgApps = qualityRows.find(r => r.quality === 'Average')?.totalApplications || 0;
  const rejApps = qualityRows.find(r => r.quality === 'Rejected')?.totalApplications || 0;

  const goodContribution = totalApps > 0 ? (goodApps / totalApps) * 100 : 0;
  const avgContribution = totalApps > 0 ? (avgApps / totalApps) * 100 : 0;
  const rejContribution = totalApps > 0 ? (rejApps / totalApps) * 100 : 0;

  // Prepare month-wise export data
  const monthlyExportData = monthlyData.map(row => ({
    Month: row.month,
    Quality: row.quality,
    'Applications': row.apps,
    'Contribution %': row.contributionPercent.toFixed(1),
  }));

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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
                    const goodData = monthlyData.find(d => d.month === month && d.quality === 'Good');
                    const avgData = monthlyData.find(d => d.month === month && d.quality === 'Average');
                    const rejData = monthlyData.find(d => d.month === month && d.quality === 'Rejected');
                    
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
