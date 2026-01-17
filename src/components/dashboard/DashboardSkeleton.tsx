import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function KpiCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="border-border">
      <CardHeader className="py-3 px-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48 mt-1" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1 p-4">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="border-border">
      <CardHeader className="py-3 px-4">
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

export function FullViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Chart */}
      <ChartSkeleton />
      
      {/* Table */}
      <TableSkeleton rows={6} />
    </div>
  );
}

export function QualityViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={4} />
    </div>
  );
}

export function DataFreshnessSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={5} />
    </div>
  );
}
