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
  kycDone: number;
  cardsApproved: number;
  contributionPercent: number;
  directCardoutConversion: number;
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
            .select('month, lead_quality, kyc_completed, final_status')
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

        // Group by month and quality
        const monthQualityMap = new Map<string, Map<string, { apps: number; kycDone: number; cardsApproved: number }>>();
        const monthTotals = new Map<string, number>();

        allRecords.forEach(record => {
          const month = record.month || 'Unknown';
          const quality = record.lead_quality || 'Unknown';
          
          if (!monthQualityMap.has(month)) {
            monthQualityMap.set(month, new Map());
          }
          
          const qualityMap = monthQualityMap.get(month)!;
          if (!qualityMap.has(quality)) {
            qualityMap.set(quality, { apps: 0, kycDone: 0, cardsApproved: 0 });
          }
          
          const stats = qualityMap.get(quality)!;
          stats.apps++;
          if (record.kyc_completed) stats.kycDone++;
          
          const finalStatus = (record.final_status || '').toUpperCase();
          if (finalStatus.includes('APPROVED') || finalStatus.includes('DISBURSED') || 
              finalStatus.includes('SANCTIONED') || finalStatus.includes('CARD DISPATCH')) {
            stats.cardsApproved++;
          }
          
          monthTotals.set(month, (monthTotals.get(month) || 0) + 1);
        });

        // Convert to array with calculated percentages
        const result: MonthQualityData[] = [];
        const sortedMonths: string[] = [];
        
        monthQualityMap.forEach((qualityMap, month) => {
          // Skip invalid months
          if (month === 'Unknown' || month.includes('1899')) return;
          
          sortedMonths.push(month);
          const monthTotal = monthTotals.get(month) || 1;
          
          ['Good', 'Average', 'Rejected'].forEach(quality => {
            const stats = qualityMap.get(quality) || { apps: 0, kycDone: 0, cardsApproved: 0 };
            result.push({
              month,
              quality,
              apps: stats.apps,
              kycDone: stats.kycDone,
              cardsApproved: stats.cardsApproved,
              contributionPercent: (stats.apps / monthTotal) * 100,
              directCardoutConversion: stats.apps > 0 ? (stats.cardsApproved / stats.apps) * 100 : 0,
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

  const eligibleRows = qualityRows.filter(r => r.quality !== 'Rejected');
  const rejectedRow = qualityRows.find(r => r.quality === 'Rejected');
  
  const eligibleTotals = {
    totalApplications: eligibleRows.reduce((sum, r) => sum + r.totalApplications, 0),
    eligibleForKyc: eligibleRows.reduce((sum, r) => sum + r.eligibleForKyc, 0),
    kycPending: eligibleRows.reduce((sum, r) => sum + r.kycPending, 0),
    kycDone: eligibleRows.reduce((sum, r) => sum + r.kycDone, 0),
    cardsApproved: eligibleRows.reduce((sum, r) => sum + r.cardsApproved, 0),
    rejectedPostKyc: eligibleRows.reduce((sum, r) => sum + r.rejectedPostKyc, 0),
  };
  
  const eligibleConversion = eligibleTotals.eligibleForKyc > 0 
    ? (eligibleTotals.kycDone / eligibleTotals.eligibleForKyc) * 100 : 0;
  const eligibleApproval = eligibleTotals.kycDone > 0 
    ? (eligibleTotals.cardsApproved / eligibleTotals.kycDone) * 100 : 0;
  const eligibleRejection = eligibleTotals.kycDone > 0 
    ? (eligibleTotals.rejectedPostKyc / eligibleTotals.kycDone) * 100 : 0;

  // Calculate direct cardout conversion for summary
  const totalApps = qualityRows.reduce((sum, r) => sum + r.totalApplications, 0);
  const totalCards = qualityRows.reduce((sum, r) => sum + r.cardsApproved, 0);
  const directCardoutOverall = totalApps > 0 ? (totalCards / totalApps) * 100 : 0;

  const exportData = qualityRows.map(row => ({
    Quality: row.quality,
    'Total Applications': row.totalApplications,
    'Eligible for KYC': row.eligibleForKyc,
    'KYC Pending': row.kycPending,
    'KYC Done': row.kycDone,
    'KYC Conversion %': row.kycConversionPercent,
    'Cards Approved': row.cardsApproved,
    'Approval %': row.approvalPercent,
  }));

  // Prepare month-wise export data
  const monthlyExportData = monthlyData.map(row => ({
    Month: row.month,
    Quality: row.quality,
    Applications: row.apps,
    'Contribution %': row.contributionPercent.toFixed(1),
    'KYC Done': row.kycDone,
    'Cards Approved': row.cardsApproved,
    'Direct Cardout %': row.directCardoutConversion.toFixed(1),
  }));

  return (
    <div className="space-y-4">
      {/* Quality KPI Cards */}
      <div className="data-grid grid-cols-4">
        {qualityRows.map((row) => (
          <KpiCard 
            key={row.quality}
            label={`${row.quality} Quality`}
            value={row.totalApplications}
            valueColor={row.quality === 'Good' ? 'success' : row.quality === 'Average' ? 'warning' : 'destructive'}
            delta={row.quality !== 'Rejected' ? row.kycConversionPercent - 50 : undefined}
            deltaLabel={row.quality !== 'Rejected' ? 'conv' : undefined}
          />
        ))}
        <KpiCard 
          label="Direct Cardout"
          value={formatPercent(directCardoutOverall)}
          valueColor="info"
        />
      </div>

      {/* Month-wise Contribution & Direct Cardout */}
      <Card className="border-border">
        <CardHeader className="compact-card-header flex-row items-center justify-between">
          <div>
            <CardTitle className="compact-card-title">Month-wise Quality Contribution & Direct Cardout</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Contribution % shows quality mix per month. Direct Cardout = Cards Approved / Total Apps.
            </CardDescription>
          </div>
          <ExportButton data={monthlyExportData} filename="quality_monthly_analysis" />
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
                    <th className="text-right">Good Cardout</th>
                    <th className="text-right">Avg Apps</th>
                    <th className="text-right">Avg %</th>
                    <th className="text-right">Avg Cardout</th>
                    <th className="text-right">Rej Apps</th>
                    <th className="text-right">Rej %</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Total Cardout</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(month => {
                    const goodData = monthlyData.find(d => d.month === month && d.quality === 'Good');
                    const avgData = monthlyData.find(d => d.month === month && d.quality === 'Average');
                    const rejData = monthlyData.find(d => d.month === month && d.quality === 'Rejected');
                    
                    const monthTotal = (goodData?.apps || 0) + (avgData?.apps || 0) + (rejData?.apps || 0);
                    const monthCards = (goodData?.cardsApproved || 0) + (avgData?.cardsApproved || 0) + (rejData?.cardsApproved || 0);
                    const monthCardout = monthTotal > 0 ? (monthCards / monthTotal) * 100 : 0;
                    
                    return (
                      <tr key={month}>
                        <td className="font-medium">{month}</td>
                        <td className="text-right tabular-nums text-success">{goodData?.apps || 0}</td>
                        <td className="text-right tabular-nums text-success">{formatPercent(goodData?.contributionPercent || 0)}</td>
                        <td className="text-right tabular-nums font-semibold text-success">{formatPercent(goodData?.directCardoutConversion || 0)}</td>
                        <td className="text-right tabular-nums text-warning">{avgData?.apps || 0}</td>
                        <td className="text-right tabular-nums text-warning">{formatPercent(avgData?.contributionPercent || 0)}</td>
                        <td className="text-right tabular-nums font-semibold text-warning">{formatPercent(avgData?.directCardoutConversion || 0)}</td>
                        <td className="text-right tabular-nums text-destructive">{rejData?.apps || 0}</td>
                        <td className="text-right tabular-nums text-destructive">{formatPercent(rejData?.contributionPercent || 0)}</td>
                        <td className="text-right tabular-nums font-medium">{monthTotal.toLocaleString()}</td>
                        <td className="text-right tabular-nums font-semibold text-info">{formatPercent(monthCardout)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Breakdown Table */}
      <Card className="border-border">
        <CardHeader className="compact-card-header flex-row items-center justify-between">
          <div>
            <CardTitle className="compact-card-title">Quality Breakdown (Overall)</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Good and Average are eligible; Rejected excluded from conversion.
            </CardDescription>
          </div>
          <ExportButton data={exportData} filename="axis_quality_breakdown" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Quality</th>
                  <th className="text-right">Apps</th>
                  <th className="text-right">Eligible</th>
                  <th className="text-right">Pending</th>
                  <th className="text-right">Done</th>
                  <th className="text-right">Conv %</th>
                  <th className="text-right">Approved</th>
                  <th className="text-right">Appr %</th>
                  <th className="text-right">Rejected</th>
                  <th className="text-right">Rej %</th>
                </tr>
              </thead>
              <tbody>
                {eligibleRows.map((row) => (
                  <tr key={row.quality}>
                    <td className={getQualityStyle(row.quality)}>{row.quality}</td>
                    <td className="text-right tabular-nums">{row.totalApplications}</td>
                    <td className="text-right tabular-nums">{row.eligibleForKyc}</td>
                    <td className="text-right tabular-nums text-warning">{row.kycPending}</td>
                    <td className="text-right tabular-nums text-success">{row.kycDone}</td>
                    <td className="text-right tabular-nums font-semibold text-info">{formatPercent(row.kycConversionPercent)}</td>
                    <td className="text-right tabular-nums text-success">{row.cardsApproved}</td>
                    <td className="text-right tabular-nums">{formatPercent(row.approvalPercent)}</td>
                    <td className="text-right tabular-nums text-destructive">{row.rejectedPostKyc}</td>
                    <td className="text-right tabular-nums">{formatPercent(row.rejectionPercent)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Eligible Total</td>
                  <td className="text-right tabular-nums">{eligibleTotals.totalApplications}</td>
                  <td className="text-right tabular-nums">{eligibleTotals.eligibleForKyc}</td>
                  <td className="text-right tabular-nums text-warning">{eligibleTotals.kycPending}</td>
                  <td className="text-right tabular-nums text-success">{eligibleTotals.kycDone}</td>
                  <td className="text-right tabular-nums text-info">{formatPercent(eligibleConversion)}</td>
                  <td className="text-right tabular-nums text-success">{eligibleTotals.cardsApproved}</td>
                  <td className="text-right tabular-nums">{formatPercent(eligibleApproval)}</td>
                  <td className="text-right tabular-nums text-destructive">{eligibleTotals.rejectedPostKyc}</td>
                  <td className="text-right tabular-nums">{formatPercent(eligibleRejection)}</td>
                </tr>
                {rejectedRow && (
                  <tr className="opacity-50">
                    <td className={getQualityStyle('Rejected')}>{rejectedRow.quality} (Excluded)</td>
                    <td className="text-right tabular-nums">{rejectedRow.totalApplications}</td>
                    <td className="text-right tabular-nums">—</td>
                    <td className="text-right tabular-nums">—</td>
                    <td className="text-right tabular-nums">—</td>
                    <td className="text-right tabular-nums">N/A</td>
                    <td className="text-right tabular-nums">—</td>
                    <td className="text-right tabular-nums">N/A</td>
                    <td className="text-right tabular-nums">—</td>
                    <td className="text-right tabular-nums">N/A</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
