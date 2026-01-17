import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { AxisSummaryRow } from '@/types/axis';

interface ConversionTrendChartProps {
  summaryRows: AxisSummaryRow[];
}

const chartConfig = {
  kycConversion: {
    label: 'KYC Conversion %',
    color: 'hsl(217, 91%, 45%)',
  },
  approvalRate: {
    label: 'Approval %',
    color: 'hsl(152, 60%, 42%)',
  },
  rejectionRate: {
    label: 'Rejection %',
    color: 'hsl(0, 72%, 51%)',
  },
};

export function ConversionTrendChart({ summaryRows }: ConversionTrendChartProps) {
  // Sort by date ascending for proper chart display
  const chartData = [...summaryRows]
    .sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    })
    .map(row => ({
      month: row.month,
      kycConversion: row.kycConversionPercent,
      approvalRate: row.approvalPercent,
      rejectionRate: row.rejectionPercent,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* KYC Conversion Trend - Bar Chart */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">KYC Conversion Rate Trend</CardTitle>
          <CardDescription>
            Monthly KYC completion rate for eligible leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'KYC Conversion']}
              />
              <Bar 
                dataKey="kycConversion" 
                fill="hsl(217, 91%, 45%)" 
                radius={[4, 4, 0, 0]}
                name="KYC Conversion %"
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Approval & Rejection Trends - Line Chart */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Approval vs Rejection Trends</CardTitle>
          <CardDescription>
            Post-KYC approval and rejection rates over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`, 
                  name === 'approvalRate' ? 'Approval %' : 'Rejection %'
                ]}
              />
              <Legend 
                wrapperStyle={{ fontSize: '10pt' }}
                formatter={(value) => value === 'approvalRate' ? 'Approval %' : 'Rejection %'}
              />
              <Line 
                type="monotone" 
                dataKey="approvalRate" 
                stroke="hsl(152, 60%, 42%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(152, 60%, 42%)', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
                name="approvalRate"
              />
              <Line 
                type="monotone" 
                dataKey="rejectionRate" 
                stroke="hsl(0, 72%, 51%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(0, 72%, 51%)', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
                name="rejectionRate"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
