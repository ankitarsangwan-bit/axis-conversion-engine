import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, Sankey, FunnelChart, Funnel, LabelList } from 'recharts';
import { VkycFunnelMetrics } from '@/types/axis';

interface StpkVkycTabProps {
  funnelMetrics: VkycFunnelMetrics;
  funnelByMonth: Array<VkycFunnelMetrics & { month: string }>;
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

const chartConfig = {
  vkycApproved: { label: 'VKYC Approved', color: 'hsl(152, 60%, 42%)' },
  vkycRejected: { label: 'VKYC Rejected', color: 'hsl(0, 72%, 51%)' },
  vkycDropped: { label: 'VKYC Dropped', color: 'hsl(38, 92%, 50%)' },
};

export function StpkVkycTab({ funnelMetrics, funnelByMonth }: StpkVkycTabProps) {
  const m = funnelMetrics;
  
  // Funnel data for visualization
  const funnelData = [
    { name: 'Total STPK', value: m.totalStpk, fill: 'hsl(217, 91%, 45%)' },
    { name: 'VKYC Eligible', value: m.vkycEligible, fill: 'hsl(217, 91%, 55%)' },
    { name: 'VKYC Approved', value: m.vkycApproved, fill: 'hsl(152, 60%, 42%)' },
  ];
  
  // VKYC Outcomes chart data
  const vkycOutcomesData = [
    { name: 'Approved', value: m.vkycApproved, fill: 'hsl(152, 60%, 42%)' },
    { name: 'Rejected', value: m.vkycRejected, fill: 'hsl(0, 72%, 51%)' },
    { name: 'Dropped', value: m.vkycDropped, fill: 'hsl(38, 92%, 50%)' },
  ];

  // Cards approved paths
  const cardsApprovedPaths = [
    { path: 'VKYC Approved (Pure Digital)', count: m.cardsFromVkycApproved, color: 'hsl(152, 60%, 42%)' },
    { path: 'VKYC Rejected → Physical Login', count: m.cardsFromVkycRejectedPhysical, color: 'hsl(199, 89%, 48%)' },
    { path: 'No VKYC → Physical Login', count: m.cardsFromNoVkycPhysical, color: 'hsl(217, 91%, 45%)' },
  ];
  
  const totalCardsApproved = cardsApprovedPaths.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="space-y-6">
      {/* Diagnostic Note */}
      <Card className="border-info/30 bg-info/5">
        <CardContent className="py-4">
          <p className="text-sm text-info">
            <strong>Diagnostic View:</strong> This analysis covers STPK leads only and is for diagnostic purposes. 
            It does not affect main conversion KPIs.
          </p>
        </CardContent>
      </Card>

      {/* Top-Level Funnel Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total STPK</CardDescription>
            <CardTitle className="text-xl tabular-nums">{m.totalStpk}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>VKYC Eligible</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {m.vkycEligible}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({formatPercent(m.vkycEligible, m.totalStpk)})
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-success/30">
          <CardHeader className="pb-2">
            <CardDescription>VKYC Approved</CardDescription>
            <CardTitle className="text-xl tabular-nums text-success">
              {m.vkycApproved}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({formatPercent(m.vkycApproved, m.vkycEligible)})
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardDescription>VKYC Rejected</CardDescription>
            <CardTitle className="text-xl tabular-nums text-destructive">
              {m.vkycRejected}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({formatPercent(m.vkycRejected, m.vkycEligible)})
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-warning/30">
          <CardHeader className="pb-2">
            <CardDescription>VKYC Dropped</CardDescription>
            <CardTitle className="text-xl tabular-nums text-warning">
              {m.vkycDropped}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({formatPercent(m.vkycDropped, m.vkycEligible)})
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* VKYC Outcomes Chart & Core/Non-Core Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">VKYC Outcomes Distribution</CardTitle>
            <CardDescription>Approved / Rejected / Dropped breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={vkycOutcomesData} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {vkycOutcomesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Core vs Non-Core Split</CardTitle>
            <CardDescription>VKYC outcomes by customer segment</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th className="text-right">VKYC Approved</th>
                  <th className="text-right">VKYC Rejected</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Core</td>
                  <td className="text-right tabular-nums text-success">{m.vkycApprovedCore}</td>
                  <td className="text-right tabular-nums text-destructive">{m.vkycRejectedCore}</td>
                  <td className="text-right tabular-nums font-semibold">{m.vkycApprovedCore + m.vkycRejectedCore}</td>
                </tr>
                <tr>
                  <td className="font-medium">Non-Core</td>
                  <td className="text-right tabular-nums text-success">{m.vkycApprovedNonCore}</td>
                  <td className="text-right tabular-nums text-destructive">{m.vkycRejectedNonCore}</td>
                  <td className="text-right tabular-nums font-semibold">{m.vkycApprovedNonCore + m.vkycRejectedNonCore}</td>
                </tr>
                <tr className="total-row">
                  <td>Total</td>
                  <td className="text-right tabular-nums text-success">{m.vkycApproved}</td>
                  <td className="text-right tabular-nums text-destructive">{m.vkycRejected}</td>
                  <td className="text-right tabular-nums">{m.vkycApproved + m.vkycRejected}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Cards Approved Paths */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Cards Approved - Path Analysis</CardTitle>
          <CardDescription>
            How cards were approved: Pure digital (VKYC) vs Physical login recovery paths
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="professional-table">
            <thead>
              <tr>
                <th>Approval Path</th>
                <th className="text-right">Cards Approved</th>
                <th className="text-right">% of Total</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {cardsApprovedPaths.map((path) => (
                <tr key={path.path}>
                  <td className="font-medium">{path.path}</td>
                  <td className="text-right tabular-nums text-success">{path.count}</td>
                  <td className="text-right tabular-nums">{formatPercent(path.count, totalCardsApproved)}</td>
                  <td className="text-sm text-muted-foreground">
                    {path.path.includes('Pure Digital') && 'Full digital journey, no physical touchpoint'}
                    {path.path.includes('VKYC Rejected') && 'VKYC failed, recovered via branch/physical KYC'}
                    {path.path.includes('No VKYC') && 'Not VKYC eligible or dropped, direct physical KYC'}
                  </td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Total Cards Approved</td>
                <td className="text-right tabular-nums text-success">{totalCardsApproved}</td>
                <td className="text-right tabular-nums">100%</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Physical Drop-offs */}
      <Card className="border-warning/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Physical Drop-offs</CardTitle>
          <CardDescription>
            STPK leads that failed VKYC (rejected/dropped) and did not complete physical login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-warning/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Drop-off Count</p>
              <p className="text-2xl font-bold tabular-nums text-warning">{m.physicalDropoffs}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">% of VKYC Failed</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatPercent(m.physicalDropoffs, m.vkycRejected + m.vkycDropped)}
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Recovery Opportunity</p>
              <p className="text-lg font-semibold">
                {m.physicalDropoffs} leads can be targeted for physical KYC outreach
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">STPK/VKYC Funnel by Month</CardTitle>
          <CardDescription>Monthly diagnostic breakdown</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="text-right">STPK Total</th>
                  <th className="text-right">VKYC Eligible</th>
                  <th className="text-right">VKYC Approved</th>
                  <th className="text-right">VKYC Rejected</th>
                  <th className="text-right">VKYC Dropped</th>
                  <th className="text-right">Cards (Digital)</th>
                  <th className="text-right">Cards (Physical)</th>
                  <th className="text-right">Drop-offs</th>
                </tr>
              </thead>
              <tbody>
                {funnelByMonth.map((row) => (
                  <tr key={row.month}>
                    <td className="font-medium">{row.month}</td>
                    <td className="text-right tabular-nums">{row.totalStpk}</td>
                    <td className="text-right tabular-nums">{row.vkycEligible}</td>
                    <td className="text-right tabular-nums text-success">{row.vkycApproved}</td>
                    <td className="text-right tabular-nums text-destructive">{row.vkycRejected}</td>
                    <td className="text-right tabular-nums text-warning">{row.vkycDropped}</td>
                    <td className="text-right tabular-nums">{row.cardsFromVkycApproved}</td>
                    <td className="text-right tabular-nums">{row.cardsFromVkycRejectedPhysical + row.cardsFromNoVkycPhysical}</td>
                    <td className="text-right tabular-nums text-warning">{row.physicalDropoffs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Definitions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">STPK/VKYC Definitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">STPK Lead</h4>
              <p className="text-muted-foreground">
                Straight-Through Processing with KYC - leads eligible for digital-first KYC journey via VKYC.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">VKYC Eligible</h4>
              <p className="text-muted-foreground">
                STPK leads that meet criteria for Video KYC: document quality, connectivity, time slot availability.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">VKYC Dropped</h4>
              <p className="text-muted-foreground">
                VKYC eligible leads where VKYC was neither approved nor rejected - typically abandoned mid-process.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Physical Drop-off</h4>
              <p className="text-muted-foreground">
                Leads that failed VKYC (rejected or dropped) and have not completed physical branch login.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
