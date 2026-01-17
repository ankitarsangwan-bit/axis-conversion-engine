import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SparklineData {
  value: number;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  sparklineData?: SparklineData[];
  valueColor?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}

function MiniSparkline({ data }: { data: SparklineData[] }) {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  
  const width = 60;
  const height = 20;
  const padding = 2;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');
  
  const isUp = data[data.length - 1].value >= data[0].value;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={isUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function KpiCard({ 
  label, 
  value, 
  delta, 
  deltaLabel,
  sparklineData,
  valueColor = 'default',
  className 
}: KpiCardProps) {
  const valueColorClass = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info',
  }[valueColor];

  const getDeltaIcon = () => {
    if (delta === undefined) return null;
    if (delta > 0) return <TrendingUp className="h-3 w-3" />;
    if (delta < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  return (
    <div className={cn("kpi-card", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="kpi-card-label">{label}</p>
          <p className={cn("kpi-card-value", valueColorClass)}>{value}</p>
          {delta !== undefined && (
            <div className={cn(
              "kpi-card-delta flex items-center gap-1",
              delta > 0 ? "positive" : delta < 0 ? "negative" : "text-muted-foreground"
            )}>
              {getDeltaIcon()}
              <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span>
              {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
            </div>
          )}
        </div>
        {sparklineData && (
          <div className="pt-1">
            <MiniSparkline data={sparklineData} />
          </div>
        )}
      </div>
    </div>
  );
}
