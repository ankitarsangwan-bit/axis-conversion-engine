import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, UserCheck, Clock, Loader2, XCircle, ChevronRight, Ban } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KycRecordsDialog, KycCategory } from './KycRecordsDialog';

interface KycBreakdown {
  byLogin: number;
  byVkyc: number;
  finalVkycReject: number;
  totalKycDone: number;
  kycPending: number;
  notEligible: number;
}

export function KycBreakdownCard() {
  const [breakdown, setBreakdown] = useState<KycBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<KycCategory | null>(null);
  const [selectedLabel, setSelectedLabel] = useState('');

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
            .select('login_status, final_status, vkyc_status, core_non_core, blaze_output, kyc_completed')
            .range(from, from + batchSize - 1);

          if (error || !batch) break;
          
          allRecords = [...allRecords, ...batch];
          from += batchSize;
          hasMore = batch.length === batchSize;
        }

        // Compute breakdown by rule (priority order)
        // kyc_eligible: blaze_output starts with 'REJECT' -> Not Eligible
        // kyc_done: login_status matches OR vkyc_status matches
        // final_vkyc_reject: HARD_REJECT + NON-CORE (counted separately)
        // kyc_pending: eligible AND NOT done AND NOT final_vkyc_reject
        
        let byLogin = 0;
        let byVkyc = 0;
        let finalVkycReject = 0;
        let kycPending = 0;
        let notEligible = 0;

        // Updated to match actual DB values
        const VALID_LOGIN = ['LOGIN', 'LOGIN 26', 'IPA LOGIN', 'IPA 26 LOGIN'];
        const VKYC_DONE = ['APPROVED', 'REJECTED', 'HARD_ACCEPT', 'HARD_REJECT'];

        allRecords.forEach(r => {
          const loginStatus = (r.login_status || '').toUpperCase().trim();
          const vkycStatus = (r.vkyc_status || '').toUpperCase().trim();
          const coreNonCore = (r.core_non_core || '').toUpperCase().trim();
          const blazeOutput = (r.blaze_output || '').toUpperCase().trim();

          // Step 1: Determine kyc_eligible from blaze_output
          const kycEligible = !blazeOutput.startsWith('REJECT');

          if (!kycEligible) {
            notEligible++;
          } else {
            // Step 2: For eligible records, determine kyc_done (priority order)
            if (VALID_LOGIN.includes(loginStatus)) {
              byLogin++;
            } else if (VKYC_DONE.includes(vkycStatus)) {
              // Check if HARD_REJECT + NON-CORE -> Final VKYC Reject
              if (vkycStatus === 'HARD_REJECT' && coreNonCore === 'NON-CORE') {
                finalVkycReject++;
              } else {
                byVkyc++;
              }
            } else {
              // kyc_pending = eligible AND NOT done
              kycPending++;
            }
          }
        });

        const totalKycDone = byLogin + byVkyc + finalVkycReject;

        setBreakdown({
          byLogin,
          byVkyc,
          finalVkycReject,
          totalKycDone,
          kycPending,
          notEligible,
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

  const totalEligible = breakdown.totalKycDone + breakdown.kycPending;
  const grandTotal = totalEligible + breakdown.notEligible;
  const getPercent = (value: number) => totalEligible > 0 ? ((value / totalEligible) * 100).toFixed(1) : '0.0';
  const getPercentOfTotal = (value: number) => grandTotal > 0 ? ((value / grandTotal) * 100).toFixed(1) : '0.0';

  const rules: {
    label: string;
    description: string;
    count: number;
    icon: typeof XCircle;
    color: string;
    bgColor: string;
    category: KycCategory;
    isNotEligible?: boolean;
    isPending?: boolean;
    isFinalReject?: boolean;
  }[] = [
    {
      label: 'Not Eligible',
      description: 'blaze_output = Reject',
      count: breakdown.notEligible,
      icon: XCircle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      category: 'not_eligible',
      isNotEligible: true,
    },
    {
      label: 'By Login',
      description: 'login_status = Login / Login 26 / IPA Login',
      count: breakdown.byLogin,
      icon: UserCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
      category: 'by_login',
    },
    {
      label: 'By VKYC',
      description: 'vkyc_status = Approved / Hard Accept / Hard Reject (Core)',
      count: breakdown.byVkyc,
      icon: CheckCircle2,
      color: 'text-info',
      bgColor: 'bg-info/10',
      category: 'by_vkyc',
    },
    {
      label: 'Final VKYC Reject',
      description: 'Hard Reject + Non-Core (no physical fallback)',
      count: breakdown.finalVkycReject,
      icon: Ban,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      category: 'final_vkyc_reject',
      isFinalReject: true,
    },
    {
      label: 'KYC Pending',
      description: 'Eligible but no rule triggered',
      count: breakdown.kycPending,
      icon: Clock,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      category: 'kyc_pending',
      isPending: true,
    },
  ];

  const handleCategoryClick = (category: KycCategory, label: string) => {
    setSelectedCategory(category);
    setSelectedLabel(label);
  };

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
            const isNotEligible = 'isNotEligible' in rule && rule.isNotEligible;
            const isPending = 'isPending' in rule && rule.isPending;
            const percent = isNotEligible ? getPercentOfTotal(rule.count) : getPercent(rule.count);
            
            return (
              <button
                key={rule.label}
                onClick={() => handleCategoryClick(rule.category, rule.label)}
                className="flex items-center gap-3 w-full text-left hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors group"
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${rule.bgColor}`}>
                  <Icon className={`h-4 w-4 ${rule.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rule.label}</span>
                      {isNotEligible && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                          Excluded
                        </Badge>
                      )}
                      {!isPending && !isNotEligible && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          Rule {index}
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
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isPending ? 'bg-destructive' : isNotEligible ? 'bg-muted-foreground' : 'bg-primary'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-success/10">
              <div className="text-xl font-bold text-success tabular-nums">
                {breakdown.totalKycDone.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">KYC Done</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <div className="text-xl font-bold text-destructive tabular-nums">
                {breakdown.kycPending.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">KYC Pending</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-xl font-bold text-muted-foreground tabular-nums">
                {breakdown.notEligible.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Not Eligible</div>
            </div>
          </div>
        </div>
      </CardContent>

      <KycRecordsDialog
        open={selectedCategory !== null}
        onOpenChange={(open) => !open && setSelectedCategory(null)}
        category={selectedCategory}
        categoryLabel={selectedLabel}
      />
    </Card>
  );
}
