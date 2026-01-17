export type LeadQuality = 'Good' | 'Average' | 'Rejected';

export type KycStatus = 'KYC Done' | 'KYC Pending';

export interface AxisApplication {
  application_id: string;
  blaze_output: string;
  login_status: string | null;
  final_status: string;
  lead_quality: LeadQuality;
  kyc_completed: boolean;
  kyc_status: KycStatus;
  last_updated_date: string;
  month: string;
}

// Summary row for dashboard display
export interface AxisSummaryRow {
  bank: string;
  month: string;
  quality: LeadQuality | 'All';
  totalApplications: number;
  eligibleForKyc: number;
  kycPending: number;
  kycDone: number;
  kycConversionPercent: number;
  cardsApproved: number;
  approvalPercent: number;
  rejectedPostKyc: number;
  rejectionPercent: number;
}

// Quality-level summary for diagnostic view
export interface QualitySummaryRow {
  quality: LeadQuality;
  totalApplications: number;
  eligibleForKyc: number;
  kycPending: number;
  kycDone: number;
  kycConversionPercent: number;
  cardsApproved: number;
  approvalPercent: number;
  rejectedPostKyc: number;
  rejectionPercent: number;
}

// Data freshness tracking
export interface DataFreshnessRow {
  month: string;
  lastUpdated: string;
  totalRecords: number;
  statusChanges: number;
  newApplications: number;
}

// Conflict resolution types
export type ConflictType = 
  | 'LOGIN_IPA_CONFLICT'      // Login present but status is IPA
  | 'POST_KYC_NO_LOGIN'       // Post-KYC outcome without login
  | 'REJECT_WITH_LOGIN'       // Rejected quality but has login
  | 'MULTIPLE_STATUS_SIGNALS'; // Contradictory signals

export interface ConflictRecord {
  application_id: string;
  conflictType: ConflictType;
  conflictDescription: string;
  rawSignals: {
    loginStatus: string | null;
    finalStatus: string;
    blazeOutput: string;
  };
  resolution: string;
  resolvedKycStatus: KycStatus;
  resolvedQuality: LeadQuality;
}

// Lead Quality derivation from BLAZE_OUTPUT
export function deriveLeadQuality(blazeOutput: string): LeadQuality {
  const normalized = blazeOutput?.toUpperCase()?.trim() || '';
  
  if (normalized === 'STPT' || normalized === 'STPI') {
    return 'Average';
  }
  
  if (normalized === 'REJECT') {
    return 'Rejected';
  }
  
  return 'Good';
}

// Genuine post-KYC outcomes (can ONLY happen after KYC completion)
const POST_KYC_OUTCOMES = ['APPROVED', 'DISBURSED', 'LOGGED', 'CARD DISPATCHED', 'SANCTIONED'];

// Post-KYC rejection outcomes
const POST_KYC_REJECTIONS = ['REJECTED', 'DECLINED'];

// Card approved outcomes
const CARD_APPROVED_OUTCOMES = ['APPROVED', 'DISBURSED', 'CARD DISPATCHED', 'SANCTIONED'];

// KYC Completion check
export function isKycCompleted(loginStatus: string | null, finalStatus: string): boolean {
  const hasLoginStatus = loginStatus !== null && 
    loginStatus !== '' && 
    loginStatus.toLowerCase().includes('login');
  
  if (hasLoginStatus) {
    return true;
  }
  
  const normalizedFinalStatus = finalStatus?.toUpperCase()?.trim() || '';
  const isPostKycOutcome = POST_KYC_OUTCOMES.some(outcome => 
    normalizedFinalStatus.includes(outcome)
  );
  
  return isPostKycOutcome;
}

export function getKycStatus(kycCompleted: boolean): KycStatus {
  return kycCompleted ? 'KYC Done' : 'KYC Pending';
}

export function isCardApproved(finalStatus: string): boolean {
  const normalized = finalStatus?.toUpperCase()?.trim() || '';
  return CARD_APPROVED_OUTCOMES.some(outcome => normalized.includes(outcome));
}

export function isRejectedPostKyc(finalStatus: string, kycCompleted: boolean): boolean {
  if (!kycCompleted) return false;
  const normalized = finalStatus?.toUpperCase()?.trim() || '';
  return POST_KYC_REJECTIONS.some(outcome => normalized.includes(outcome));
}

export function getMonthFromDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

// Conflict detection and resolution
export function detectConflict(
  loginStatus: string | null,
  finalStatus: string,
  blazeOutput: string
): ConflictType | null {
  const hasLogin = loginStatus !== null && loginStatus !== '' && loginStatus.toLowerCase().includes('login');
  const normalizedFinal = finalStatus?.toUpperCase()?.trim() || '';
  const quality = deriveLeadQuality(blazeOutput);
  
  const isIPA = normalizedFinal === 'IPA';
  const isPostKycOutcome = POST_KYC_OUTCOMES.some(o => normalizedFinal.includes(o));
  
  // Login present but status shows IPA (pre-KYC stage)
  if (hasLogin && isIPA) {
    return 'LOGIN_IPA_CONFLICT';
  }
  
  // Post-KYC outcome without login recorded
  if (isPostKycOutcome && !hasLogin) {
    return 'POST_KYC_NO_LOGIN';
  }
  
  // Rejected quality lead somehow has login
  if (quality === 'Rejected' && hasLogin) {
    return 'REJECT_WITH_LOGIN';
  }
  
  return null;
}

export function resolveConflict(conflictType: ConflictType): { 
  resolution: string; 
  kycCompleted: boolean;
} {
  switch (conflictType) {
    case 'LOGIN_IPA_CONFLICT':
      return {
        resolution: 'Login presence takes precedence. KYC marked as Done per rule: Login present = KYC Completed.',
        kycCompleted: true,
      };
    case 'POST_KYC_NO_LOGIN':
      return {
        resolution: 'Post-KYC outcome confirms KYC completion. Login field may have data quality issue.',
        kycCompleted: true,
      };
    case 'REJECT_WITH_LOGIN':
      return {
        resolution: 'Lead quality remains Rejected (frozen at derivation). KYC is Done but excluded from conversion denominator.',
        kycCompleted: true,
      };
    case 'MULTIPLE_STATUS_SIGNALS':
      return {
        resolution: 'Latest status signal used per rolling logic. Final status takes precedence.',
        kycCompleted: false,
      };
    default:
      return {
        resolution: 'No conflict detected.',
        kycCompleted: false,
      };
  }
}
