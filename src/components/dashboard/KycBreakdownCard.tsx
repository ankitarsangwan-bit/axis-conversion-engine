import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, UserCheck, FileCheck, MapPin, Clock, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface KycBreakdown {
  byLogin: number;
  byVkyc: number;
  byFinalStatus: number;
  byNonCore: number;
  totalKycDone: number;
  kycPending: number;
}

export function KycBreakdownCard() {
  const [breakdown, setBreakdown] = useState<KycBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBreakdown() {
      setIsLoading(true);
      try {
        // Fetch all records to compute breakdown
        let allRecords: any[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: batch, error } = await supabase
            .from('mis_records')
            .select('login_status, final_status, vkyc_status, core_non_core, rejection_reason, kyc_completed')
            .range(from, from + batchSize - 1);

          if (error || !batch) break;
          
          allRecords = [...allRecords, ...batch];
          from += batchSize;
          hasMore = batch.length === batchSize;
        }

        // Compute breakdown by rule (priority order as in logic)
        let byLogin = 0;
        let byVkyc = 0;
        let byFinalStatus = 0;
        let byNonCore = 0;
        let kycPending = 0;
        let byAutoDecline = 0; // Auto-declines that remain as pending

        const VALID_LOGIN = ['LOGIN', 'LOGIN 26'];
        const VKYC_DONE = ['APPROVED', 'REJECTED'];
        const AUTO_DECLINE_REASONS = ['IPA NON RESOLVED', 'TIME EXPIRED', 'AUTO DECLINE', 'AUTO-DECLINE'];

        allRecords.forEach(r => {
          const loginStatus = (r.login_status || '').toUpperCase().trim();
          const vkycStatus = (r.vkyc_status || '').toUpperCase().trim();
          const finalStatus = (r.final_status || '').toUpperCase().trim();
          const coreNonCore = (r.core_non_core || '').toUpperCase().trim();
          const declineReason = (r.rejection_reason || '').toUpperCase().trim();

          // Check if auto-decline
          const isAutoDecline = AUTO_DECLINE_REASONS.some(reason => declineReason.includes(reason));

          // Check rules in priority order (same as isKycCompleted)
          if (VALID_LOGIN.includes(loginStatus)) {
            byLogin++;
          } else if (VKYC_DONE.includes(vkycStatus)) {
            byVkyc++;
          } else if (coreNonCore === 'NON-CORE') {
            byNonCore++;
          } else if (finalStatus !== '' && finalStatus !== 'IPA') {
            // Rule 4: Check for auto-decline exclusion
            if (isAutoDecline) {
              // Auto-decline without login/VKYC = KYC Pending
              byAutoDecline++;
              kycPending++;
            } else {
              byFinalStatus++;
            }
          } else {
            kycPending++;
          }
        });

        const totalKycDone = byLogin + byVkyc + byFinalStatus + byNonCore;

        setBreakdown({
          byLogin,
          byVkyc,
          byFinalStatus,
          byNonCore,
          totalKycDone,
          kycPending,
        });
      } catch (err) {
        console.error('Error computing KYC breakdown:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBreakdown();
  }, []);

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!breakdown) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  const total = breakdown.totalKycDone + breakdown.kycPending;
  const getPercent = (value: number) => total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

  const rules = [
    {
      label: 'By Login',
      description: 'login_status = Login / Login 26',
      count: breakdown.byLogin,
      icon: UserCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'By VKYC',
      description: 'vkyc_status = Approved / Rejected',
      count: breakdown.byVkyc,
      icon: CheckCircle2,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      label: 'By Final Status',
      description: 'final_status ≠ IPA',
      count: breakdown.byFinalStatus,
      icon: FileCheck,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'By Non-Core',
      description: 'core_non_core = Non-Core',
      count: breakdown.byNonCore,
      icon: MapPin,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'KYC Pending',
      description: 'No rule triggered',
      count: breakdown.kycPending,
      icon: Clock,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="compact-card-header">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="compact-card-title">KYC Breakdown by Rule</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              How KYC Done is determined (priority order)
            </CardDescription>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {breakdown.totalKycDone.toLocaleString()} Done / {breakdown.kycPending.toLocaleString()} Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {rules.map((rule, index) => {
            const Icon = rule.icon;
            const percent = getPercent(rule.count);
            const isPending = rule.label === 'KYC Pending';
            
            return (
              <div key={rule.label} className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${rule.bgColor}`}>
                  <Icon className={`h-4 w-4 ${rule.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rule.label}</span>
                      {!isPending && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          Rule {index + 1}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold tabular-nums ${rule.color}`}>
                        {rule.count.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                        {percent}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isPending ? 'bg-destructive' : 'bg-primary'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-success/10">
              <div className="text-2xl font-bold text-success tabular-nums">
                {breakdown.totalKycDone.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total KYC Done</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <div className="text-2xl font-bold text-destructive tabular-nums">
                {breakdown.kycPending.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">KYC Pending</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
