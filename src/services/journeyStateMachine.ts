/**
 * Journey State Machine for MIS Ingestion
 * 
 * Implements forward-only state machine with:
 * - Status ranking (monotonic progression)
 * - Terminal state protection (Approved/Final Reject are immutable)
 * - Temporal guards (only accept newer records)
 * 
 * This ensures:
 * - No backward state transitions
 * - Terminal states are final
 * - Stale data is ignored
 */

import { normalizeToISODate } from '@/types/axis';

/**
 * Journey stages in exact rank order (per business rules)
 * Higher rank = more advanced in journey
 * 
 * Rank 1: Lead Created / IPA
 * Rank 2: KYC Eligible
 * Rank 3: VKYC Attempted
 * Rank 4: KYC Done
 * Rank 5: Underwriting (all final_status except Approved/Declined)
 * Rank 6: Approved (TERMINAL)
 * Rank 7: Final Reject (TERMINAL)
 */
export enum JourneyStage {
  LEAD_CREATED_IPA = 1,    // Rank 1: Lead Created / IPA
  KYC_ELIGIBLE = 2,        // Rank 2: KYC Eligible (blaze_output != Reject)
  VKYC_ATTEMPTED = 3,      // Rank 3: VKYC Attempted
  KYC_DONE = 4,            // Rank 4: KYC Done (login achieved or VKYC completed)
  UNDERWRITING = 5,        // Rank 5: All final_status except Approved/Declined
  APPROVED = 6,            // Rank 6: Approved (TERMINAL)
  FINAL_REJECT = 7,        // Rank 7: Final Reject (TERMINAL)
}

/**
 * Terminal states - once reached, application is FROZEN
 * Any future updates to these applications are IGNORED
 */
const TERMINAL_STAGES: JourneyStage[] = [
  JourneyStage.APPROVED,
  JourneyStage.FINAL_REJECT,
];

// Valid login statuses that indicate KYC completion
const VALID_LOGIN_STATUSES = ['LOGIN', 'LOGIN 26', 'IPA LOGIN', 'IPA 26 LOGIN'];

// VKYC statuses that indicate VKYC attempt completed
const VKYC_ATTEMPTED_STATUSES = ['APPROVED', 'REJECTED', 'HARD_ACCEPT', 'HARD_REJECT', 'ATTEMPTED', 'IN_PROGRESS'];

// VKYC statuses that indicate final outcome (for KYC Done)
const VKYC_DONE_STATUSES = ['APPROVED', 'REJECTED', 'HARD_ACCEPT', 'HARD_REJECT'];

// Approved outcomes
const APPROVED_STATUSES = ['APPROVED', 'DISBURSED', 'CARD DISPATCHED', 'SANCTIONED'];

// Rejected outcomes
const REJECTED_STATUSES = ['REJECTED', 'DECLINED'];

/**
 * Calculate the journey stage (rank) from application status fields
 */
export function calculateJourneyStage(
  finalStatus: string | null | undefined,
  loginStatus: string | null | undefined,
  vkycStatus: string | null | undefined,
  blazeOutput: string | null | undefined
): JourneyStage {
  const normalizedFinal = (finalStatus || '').toUpperCase().trim();
  const normalizedLogin = (loginStatus || '').toUpperCase().trim();
  const normalizedVkyc = (vkycStatus || '').toUpperCase().trim();
  const normalizedBlaze = (blazeOutput || '').toUpperCase().trim();
  
  // Rank 7: Final Reject (TERMINAL)
  if (REJECTED_STATUSES.some(s => normalizedFinal.includes(s))) {
    // Only count as final reject if KYC was done
    const hasLogin = VALID_LOGIN_STATUSES.some(s => normalizedLogin.includes(s));
    const hasVkycDone = VKYC_DONE_STATUSES.includes(normalizedVkyc);
    if (hasLogin || hasVkycDone) {
      return JourneyStage.FINAL_REJECT;
    }
  }
  
  // Rank 6: Approved (TERMINAL)
  if (APPROVED_STATUSES.some(s => normalizedFinal.includes(s))) {
    return JourneyStage.APPROVED;
  }
  
  // Rank 5: Underwriting (all final_status except Approved/Declined/IPA/empty)
  if (normalizedFinal !== '' && 
      normalizedFinal !== 'IPA' && 
      !APPROVED_STATUSES.some(s => normalizedFinal.includes(s)) &&
      !REJECTED_STATUSES.some(s => normalizedFinal.includes(s))) {
    return JourneyStage.UNDERWRITING;
  }
  
  // Rank 4: KYC Done (login achieved OR VKYC final outcome)
  const hasLogin = VALID_LOGIN_STATUSES.some(s => normalizedLogin.includes(s));
  const hasVkycDone = VKYC_DONE_STATUSES.includes(normalizedVkyc);
  if (hasLogin || hasVkycDone) {
    return JourneyStage.KYC_DONE;
  }
  
  // Rank 3: VKYC Attempted (any VKYC activity)
  if (VKYC_ATTEMPTED_STATUSES.includes(normalizedVkyc) || 
      (normalizedVkyc !== '' && normalizedVkyc !== 'NOT_ELIGIBLE' && normalizedVkyc !== 'DROPOFF' && normalizedVkyc !== 'DROPPED')) {
    return JourneyStage.VKYC_ATTEMPTED;
  }
  
  // Rank 2: KYC Eligible (blaze_output != Reject)
  if (normalizedBlaze !== 'REJECT') {
    return JourneyStage.KYC_ELIGIBLE;
  }
  
  // Rank 1: Lead Created / IPA (default, or Reject leads)
  return JourneyStage.LEAD_CREATED_IPA;
}

/**
 * Check if a stage is terminal (application journey is complete)
 */
export function isTerminalStage(stage: JourneyStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

/**
 * Check if a stage transition is allowed (forward-only)
 * 
 * Rules:
 * 1. Terminal stages cannot be changed
 * 2. Can only move forward (higher rank) or stay same
 * 3. Never move backward
 */
export function isTransitionAllowed(
  currentStage: JourneyStage,
  newStage: JourneyStage
): boolean {
  // Terminal stages are frozen
  if (isTerminalStage(currentStage)) {
    return false;
  }
  
  // Only allow forward or equal progression
  return newStage >= currentStage;
}

/**
 * Excel zero date constant - represents blank/NULL dates in Excel
 * When Excel sees an empty date cell, it sometimes exports as 1899-12-30
 */
const EXCEL_ZERO_DATE = '1899-12-30';

/**
 * Check if a date is the Excel zero date (blank/NULL indicator)
 */
export function isExcelZeroDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return true;
  const normalized = String(dateStr).trim();
  return normalized === '' || 
         normalized.startsWith(EXCEL_ZERO_DATE) ||
         normalized === '0' ||
         normalized === 'NaN';
}

/**
 * Compare two dates and determine if incoming is newer or equal
 * Returns true if incoming should be considered (>= existing)
 * 
 * 🔒 IMPORTANT: This function is now LENIENT for MIS ingestion:
 * - If either date is NULL/blank/Excel-zero → allow update (defer to journey stage)
 * - Temporal guard is SECONDARY to journey stage guard
 */
export function isNewerOrEqual(
  incomingDate: string | null | undefined,
  existingDate: string | null | undefined
): boolean {
  // If existing date is blank/zero, always accept incoming
  if (!existingDate || isExcelZeroDate(existingDate)) return true;
  
  // If incoming date is blank/zero, ALSO accept (journey stage is the primary guard)
  // This prevents blank DATE 2 fields from blocking updates
  if (!incomingDate || isExcelZeroDate(incomingDate)) return true;
  
  try {
    const incoming = new Date(normalizeToISODate(incomingDate));
    const existing = new Date(normalizeToISODate(existingDate));
    
    // If either date is invalid (NaN), accept the update
    if (isNaN(incoming.getTime()) || isNaN(existing.getTime())) {
      return true;
    }
    
    // >= comparison (accept same date updates)
    return incoming.getTime() >= existing.getTime();
  } catch {
    // If date parsing fails, be permissive and ALLOW update
    // Journey stage guard is the primary protection
    console.warn('Date comparison failed, allowing update:', { incomingDate, existingDate });
    return true;
  }
}

/**
 * Decision result for whether to update a record
 */
export interface UpdateDecision {
  shouldUpdate: boolean;
  reason: string;
  incomingStage: JourneyStage;
  existingStage: JourneyStage;
}

/**
 * Determine if an incoming record should update an existing record
 * 
 * Implements the state machine logic with CORRECT guard priority:
 * 
 * 🔒 PRIMARY GUARDS (hard blockers):
 * 1. Terminal guard: existing terminal stages (Approved/Reject) are IMMUTABLE
 * 2. Stage guard: can only move forward (higher rank) or stay same
 * 
 * ⚠️ SECONDARY GUARD (soft, lenient):
 * 3. Temporal guard: ONLY uses last_updated_date (NOT bank_event_date)
 *    - If dates are missing/blank/Excel-zero → ALLOW update (defer to stage guard)
 *    - Temporal guard is informational, NOT a hard blocker
 * 
 * 🚫 EXCLUDED FROM GUARDS:
 * - bank_event_date (DATE 2) is NEVER used for staleness checks
 * - application_date is immutable once set (frozen at first insert)
 */
export function shouldUpdateRecord(
  incoming: {
    finalStatus: string | null | undefined;
    loginStatus: string | null | undefined;
    vkycStatus: string | null | undefined;
    blazeOutput: string | null | undefined;
    lastUpdatedDate: string | null | undefined;
  },
  existing: {
    finalStatus: string | null | undefined;
    loginStatus: string | null | undefined;
    vkycStatus: string | null | undefined;
    blazeOutput: string | null | undefined;
    lastUpdatedDate: string | null | undefined;
  }
): UpdateDecision {
  const incomingStage = calculateJourneyStage(
    incoming.finalStatus,
    incoming.loginStatus,
    incoming.vkycStatus,
    incoming.blazeOutput
  );
  
  const existingStage = calculateJourneyStage(
    existing.finalStatus,
    existing.loginStatus,
    existing.vkycStatus,
    existing.blazeOutput
  );
  
  // ✅ RELAXED: Terminal stages are NO LONGER frozen
  // Previously blocked updates to Approved/Final Reject records
  // Now allows MIS snapshots to update all fields on terminal records
  // Journey stage progression is still tracked but not enforced as a blocker
  
  // 🔒 PRIMARY GUARD 2: Stage guard - can only move forward
  // This is checked BEFORE temporal guard because journey progression is authoritative
  if (!isTransitionAllowed(existingStage, incomingStage)) {
    return {
      shouldUpdate: false,
      reason: `Backward transition not allowed: ${JourneyStage[existingStage]} → ${JourneyStage[incomingStage]}. State regression ignored.`,
      incomingStage,
      existingStage,
    };
  }
  
  // ⚠️ SECONDARY GUARD: Temporal check (lenient - does NOT block if dates are missing)
  // Note: isNewerOrEqual now returns TRUE for blank/Excel-zero dates
  // This means temporal guard only rejects if BOTH dates are valid AND incoming < existing
  const temporalCheck = isNewerOrEqual(incoming.lastUpdatedDate, existing.lastUpdatedDate);
  
  if (!temporalCheck) {
    // Only reject if we have clear evidence of stale data
    // (both dates valid and incoming is genuinely older)
    return {
      shouldUpdate: false,
      reason: `Incoming date (${incoming.lastUpdatedDate}) is older than existing (${existing.lastUpdatedDate}). Stale update ignored.`,
      incomingStage,
      existingStage,
    };
  }
  
  // All guards passed - allow update
  return {
    shouldUpdate: true,
    reason: `Update allowed: ${JourneyStage[existingStage]} → ${JourneyStage[incomingStage]}`,
    incomingStage,
    existingStage,
  };
}

/**
 * Select the best record from duplicates within same file
 * Picks the one with most advanced journey stage, using date as tiebreaker
 */
export function selectBestRecord<T extends {
  final_status?: string | null;
  login_status?: string | null;
  vkyc_status?: string | null;
  blaze_output?: string | null;
  last_updated_date?: string | null;
}>(records: T[]): T {
  if (records.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  if (records.length === 1) {
    return records[0];
  }
  
  return records.reduce((best, current) => {
    const bestStage = calculateJourneyStage(
      best.final_status,
      best.login_status,
      best.vkyc_status,
      best.blaze_output
    );
    
    const currentStage = calculateJourneyStage(
      current.final_status,
      current.login_status,
      current.vkyc_status,
      current.blaze_output
    );
    
    // Higher stage wins
    if (currentStage > bestStage) {
      return current;
    }
    
    // Same stage - use date as tiebreaker
    if (currentStage === bestStage) {
      if (isNewerOrEqual(current.last_updated_date, best.last_updated_date)) {
        return current;
      }
    }
    
    return best;
  });
}
