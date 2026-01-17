import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { AxisSummaryRow } from '@/types/axis';

interface ConversionTrendChartProps {
  summaryRows: AxisSummaryRow[];
}

const chartConfig = {
  kycConversion: {
    label: 'KYC Conversion %',
    color: 'hsl(210, 100%, 56%)',
  },
  approvalRate: {
    label: 'Approval %',
    color: 'hsl(152, 70%, 50%)',
  },
  rejectionRate: {
    label: 'Rejection %',
    color: 'hsl(0, 72%, 55%)',
  },
};

export function ConversionTrendChart({ summaryRows }: ConversionTrendChartProps) {
  const chartData = [...summaryRows]
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .map(row => ({
      month: row.month,
      kycConversion: row.kycConversionPercent,
      approvalRate: row.approvalPercent,
      rejectionRate: row.rejectionPercent,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* KYC Conversion Trend - Bar Chart */}
      <Card className="border-border">
        <CardHeader className="compact-card-header">
          <CardTitle className="compact-card-title">KYC Conversion Trend</CardTitle>
          <CardDescription className="text-xs mt-0.5">Monthly completion rate</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-3 px-3">
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                width={35}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'KYC Conversion']}
              />
              <Bar 
                dataKey="kycConversion" 
                fill="hsl(210, 100%, 56%)" 
                radius={[3, 3, 0, 0]}
                name="KYC Conversion %"
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Approval & Rejection Trends - Line Chart */}
      <Card className="border-border">
        <CardHeader className="compact-card-header">
          <CardTitle className="compact-card-title">Approval vs Rejection</CardTitle>
          <CardDescription className="text-xs mt-0.5">Post-KYC outcomes over time</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-3 px-3">
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                width={35}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`, 
                  name === 'approvalRate' ? 'Approval %' : 'Rejection %'
                ]}
              />
              <Legend 
                wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }}
                formatter={(value) => value === 'approvalRate' ? 'Approval' : 'Rejection'}
                iconSize={8}
              />
              <Line 
                type="monotone" 
                dataKey="approvalRate" 
                stroke="hsl(152, 70%, 50%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(152, 70%, 50%)', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, stroke: 'hsl(152, 70%, 50%)', strokeWidth: 2, fill: 'hsl(var(--background))' }}
                name="approvalRate"
              />
              <Line 
                type="monotone" 
                dataKey="rejectionRate" 
                stroke="hsl(0, 72%, 55%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(0, 72%, 55%)', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, stroke: 'hsl(0, 72%, 55%)', strokeWidth: 2, fill: 'hsl(var(--background))' }}
                name="rejectionRate"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
