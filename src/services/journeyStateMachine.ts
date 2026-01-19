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
 * Compare two dates and determine if incoming is newer or equal
 * Returns true if incoming should be considered (>= existing)
 */
export function isNewerOrEqual(
  incomingDate: string | null | undefined,
  existingDate: string | null | undefined
): boolean {
  if (!existingDate) return true; // No existing date, always accept
  if (!incomingDate) return false; // No incoming date, reject
  
  try {
    const incoming = new Date(normalizeToISODate(incomingDate));
    const existing = new Date(normalizeToISODate(existingDate));
    
    // >= comparison (accept same date updates)
    return incoming.getTime() >= existing.getTime();
  } catch {
    // If date parsing fails, be conservative and reject
    console.warn('Date comparison failed:', { incomingDate, existingDate });
    return false;
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
 * Implements the full state machine logic:
 * 1. Temporal guard: incoming.last_updated_date >= existing.last_updated_date
 * 2. Stage guard: incoming.stage >= existing.stage
 * 3. Terminal guard: existing terminal stages are immutable
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
  
  // Terminal guard: existing terminal stages are immutable
  if (isTerminalStage(existingStage)) {
    return {
      shouldUpdate: false,
      reason: `Application in terminal state (${JourneyStage[existingStage]}). No updates allowed.`,
      incomingStage,
      existingStage,
    };
  }
  
  // Temporal guard: incoming date must be >= existing date
  if (!isNewerOrEqual(incoming.lastUpdatedDate, existing.lastUpdatedDate)) {
    return {
      shouldUpdate: false,
      reason: `Incoming date (${incoming.lastUpdatedDate}) is older than existing (${existing.lastUpdatedDate}). Stale update ignored.`,
      incomingStage,
      existingStage,
    };
  }
  
  // Stage guard: can only move forward
  if (!isTransitionAllowed(existingStage, incomingStage)) {
    return {
      shouldUpdate: false,
      reason: `Backward transition not allowed: ${JourneyStage[existingStage]} → ${JourneyStage[incomingStage]}. State regression ignored.`,
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
