// LOCKED: Quality buckets - derived ONLY from blaze_output, frozen at entry
export type LeadQuality = 'Good' | 'Average' | 'Rejected' | 'Blank';

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

// MIS Upload history
export interface MISUpload {
  uploadId: string;
  uploadDate: string;
  uploadTime: string;
  recordCount: number;
  newRecords: number;
  updatedRecords: number;
  status: 'Current' | 'Historical';
  uploadedBy: string;
}

// STPK/VKYC Deep-Dive Types
export type VkycStatus = 'Approved' | 'Rejected' | 'Dropped' | 'Not Eligible';
export type CoreNonCore = 'Core' | 'Non-Core';

export interface StpkApplication {
  application_id: string;
  blaze_output: string; // STPK
  login_status: string | null;
  final_status: string;
  vkyc_eligible: boolean;
  vkyc_status: VkycStatus;
  core_non_core: CoreNonCore;
  physical_login_achieved: boolean;
  card_approved: boolean;
  last_updated_date: string;
}

export interface VkycFunnelMetrics {
  // Top of funnel
  totalStpk: number;
  vkycEligible: number;
  
  // VKYC Outcomes
  vkycApproved: number;
  vkycRejected: number;
  vkycDropped: number; // Neither approved nor rejected
  
  // Core vs Non-Core split
  vkycApprovedCore: number;
  vkycApprovedNonCore: number;
  vkycRejectedCore: number;
  vkycRejectedNonCore: number;
  
  // Cards approved paths
  cardsFromVkycApproved: number; // Pure digital
  cardsFromVkycRejectedPhysical: number; // VKYC rejected → physical login
  cardsFromNoVkycPhysical: number; // No VKYC → physical login
  
  // Physical drop-offs
  physicalDropoffs: number; // VKYC not approved/rejected AND no login
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

/**
 * 🔒 LOCKED QUALITY DEFINITION - FINAL SOURCE OF TRUTH
 * 
 * Quality is an entry-level, descriptive tag derived ONLY from blaze_output.
 * It is computed once and NEVER changes. No other field influences Quality.
 * 
 * Mapping Rules (Order Matters):
 * 1. BLANK  = blaze_output IS NULL OR empty
 * 2. REJECT = blaze_output contains 'REJECT'
 * 3. AVERAGE = blaze_output contains 'STPT' or 'STPI'
 * 4. GOOD   = everything else
 * 
 * ❌ MUST NOT USE: KYC status, VKYC status, IPA, Underwriting, Decline/approval, 
 *                  any later bank status, any business inference
 */
export function deriveLeadQuality(blazeOutput: string | null | undefined): LeadQuality {
  // Rule 1: BLANK - null or empty
  const normalized = blazeOutput?.toUpperCase()?.trim() || '';
  if (normalized === '') {
    return 'Blank';
  }
  
  // Rule 2: REJECT - contains 'REJECT'
  if (normalized.includes('REJECT')) {
    return 'Rejected';
  }
  
  // Rule 3: AVERAGE - contains 'STPT' or 'STPI'
  if (normalized.includes('STPT') || normalized.includes('STPI')) {
    return 'Average';
  }
  
  // Rule 4: GOOD - everything else
  return 'Good';
}

// Normalize blaze_output - default empty to STPK
export function normalizeBlazeOutput(blazeOutput: string | null | undefined): string {
  const val = blazeOutput?.toUpperCase()?.trim() || '';
  return val === '' ? 'STPK' : val;
}

// Normalize core_non_core - default empty to Core
export function normalizeCoreNonCore(coreNonCore: string | null | undefined): CoreNonCore {
  const val = coreNonCore?.trim() || '';
  if (val === '' || val.toLowerCase() === 'core') {
    return 'Core';
  }
  return 'Non-Core';
}

// Genuine post-KYC outcomes (can ONLY happen after KYC completion)
const POST_KYC_OUTCOMES = ['APPROVED', 'DISBURSED', 'LOGGED', 'CARD DISPATCHED', 'SANCTIONED'];

// Post-KYC rejection outcomes
const POST_KYC_REJECTIONS = ['REJECTED', 'DECLINED'];

// Card approved outcomes
const CARD_APPROVED_OUTCOMES = ['APPROVED', 'DISBURSED', 'CARD DISPATCHED', 'SANCTIONED'];

// Auto-decline reasons that should NOT count as KYC Done
const AUTO_DECLINE_REASONS = ['IPA NON RESOLVED', 'TIME EXPIRED', 'AUTO DECLINE', 'AUTO-DECLINE'];

// Valid login statuses that indicate KYC completion
// Actual values in DB: 'IPA LOGIN', 'IPA 26 LOGIN'
const VALID_LOGIN_STATUSES = ['LOGIN', 'LOGIN 26', 'IPA LOGIN', 'IPA 26 LOGIN'];

// VKYC statuses that indicate VKYC is Done (reached final outcome)
// Actual values in DB: 'HARD_ACCEPT', 'HARD_REJECT'
const VKYC_DONE_STATUSES = ['APPROVED', 'REJECTED', 'HARD_ACCEPT', 'HARD_REJECT'];

// VKYC statuses that allow re-attempt
const VKYC_REDO_ALLOWED_STATUSES = ['DROPPED', 'PENDING', '', 'DROPOFF', 'INTIMATION'];

/**
 * VKYC Done Flag
 * Definition: Digital KYC attempt reached a final outcome
 * 
 * VKYC_Done = Y IF vkyc_status IN ('Approved','Rejected')
 * ELSE VKYC_Done = N
 */
export function isVkycDone(vkycStatus: string | null | undefined): boolean {
  const normalized = vkycStatus?.toUpperCase()?.trim() || '';
  return VKYC_DONE_STATUSES.includes(normalized);
}

/**
 * VKYC Re-attempt Allowed Flag
 * 
 * VKYC_Redo_Allowed = Y IF vkyc_status IS NULL OR vkyc_status IN ('Dropped','Pending')
 * ELSE VKYC_Redo_Allowed = N
 */
export function isVkycRedoAllowed(vkycStatus: string | null | undefined): boolean {
  const normalized = vkycStatus?.toUpperCase()?.trim() || '';
  return normalized === '' || VKYC_REDO_ALLOWED_STATUSES.includes(normalized);
}

/**
 * Check if login status indicates KYC completion
 * login_status IN ('Login','Login 26')
 */
function hasValidLogin(loginStatus: string | null | undefined): boolean {
  const normalized = loginStatus?.toUpperCase()?.trim() || '';
  return VALID_LOGIN_STATUSES.includes(normalized);
}

/**
 * Check if this is an auto-decline (should NOT count as KYC Done)
 * decline_reason IN ('IPA Non Resolved','Time Expired','Auto Decline')
 */
function isAutoDecline(declineReason: string | null | undefined): boolean {
  const normalized = declineReason?.toUpperCase()?.trim() || '';
  return AUTO_DECLINE_REASONS.some(reason => normalized.includes(reason));
}

/**
 * KYC Done Flag - Final Logic (Overall)
 * 
 * Definition: KYC journey is closed, either because:
 * - KYC attempt happened (digital or physical), OR
 * - KYC is not possible (non-core city)
 * 
 * KYC_Done = Y IF ANY ONE of the following is true:
 * 
 * Rule 1: Login achieved - login_status IN ('Login','Login 26')
 * Rule 2: VKYC attempt completed - vkyc_status IN ('Approved','Rejected')
 * Rule 3: Physical KYC completed - physical_pickup_completed = Y OR physical_login = Y
 * Rule 4: Final status progressed beyond IPA (excluding auto-declines)
 *         final_status != 'IPA' AND decline_reason NOT IN auto-decline list
 * Rule 5: Non-Core City (FORCED CLOSURE) - core_non_core = 'Non-Core'
 * 
 * CRITICAL: Auto-decline after 25 days without KYC attempt = KYC Pending
 */
export function isKycCompleted(
  loginStatus: string | null | undefined,
  finalStatus: string | null | undefined,
  vkycStatus?: string | null | undefined,
  coreNonCore?: string | null | undefined,
  declineReason?: string | null | undefined,
  physicalPickupCompleted?: boolean,
  physicalLogin?: boolean
): boolean {
  const normalizedFinalStatus = finalStatus?.toUpperCase()?.trim() || '';
  const normalizedCoreNonCore = coreNonCore?.toUpperCase()?.trim() || 'CORE';
  
  // Rule 1: Login achieved
  if (hasValidLogin(loginStatus)) {
    return true;
  }
  
  // Rule 2: VKYC attempt completed (Approved or Rejected)
  if (isVkycDone(vkycStatus)) {
    return true;
  }
  
  // Rule 3: Physical KYC completed (if fields are available)
  if (physicalPickupCompleted === true || physicalLogin === true) {
    return true;
  }
  
  // Rule 5: Non-Core City (FORCED CLOSURE)
  // For non-core cases, KYC is not serviceable → must be marked KYC Done
  if (normalizedCoreNonCore === 'NON-CORE') {
    return true;
  }
  
  // Rule 4: Final status progressed beyond IPA (excluding auto-declines)
  // CRITICAL EDGE CASE: Auto-decline after 25 days without KYC attempt = KYC Pending
  if (normalizedFinalStatus !== '' && normalizedFinalStatus !== 'IPA') {
    // Check if this is an auto-decline without any KYC attempt
    if (isAutoDecline(declineReason)) {
      // Auto-decline without login/VKYC attempt = still KYC Pending
      // We already checked login and VKYC above, so if we're here, no KYC attempt was made
      return false;
    }
    // Not an auto-decline and status progressed beyond IPA
    return true;
  }
  
  // Default: KYC is NOT done (genuine KYC Pending)
  return false;
}

/**
 * Legacy compatibility wrapper - uses old signature
 * @deprecated Use isKycCompleted with all parameters for accurate results
 */
export function isKycCompletedLegacy(loginStatus: string | null, finalStatus: string): boolean {
  return isKycCompleted(loginStatus, finalStatus);
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

/**
 * Safely parse date strings that may contain non-standard timezone formats
 * like "GMT+0530" which JavaScript doesn't recognize
 */
export function parseExcelDate(dateStr: string | null | undefined): Date {
  if (!dateStr) {
    return new Date();
  }
  
  // Clean up the date string - remove problematic timezone formats
  let cleaned = String(dateStr).trim();
  
  // Remove "GMT+XXXX" or "GMT-XXXX" patterns (non-standard format)
  cleaned = cleaned.replace(/\s*GMT[+-]\d{4}\s*/gi, ' ');
  
  // Also handle "GMT+XX:XX" format
  cleaned = cleaned.replace(/\s*GMT[+-]\d{2}:\d{2}\s*/gi, ' ');
  
  // Try to parse the cleaned date
  const parsed = new Date(cleaned.trim());
  
  // If parsing failed, return current date
  if (isNaN(parsed.getTime())) {
    console.warn('Failed to parse date:', dateStr, '-> using current date');
    return new Date();
  }
  
  return parsed;
}

/**
 * Convert date to ISO string, handling problematic timezone formats
 */
export function normalizeToISODate(dateStr: string | null | undefined): string {
  return parseExcelDate(dateStr).toISOString();
}

export function getMonthFromDate(dateStr: string): string {
  const date = parseExcelDate(dateStr);
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
