/**
 * 🔒 DATA INVARIANT VALIDATION
 * 
 * These checks enforce data integrity rules that must ALWAYS hold.
 * The dashboard should block/warn if any invariant fails.
 */

export interface InvariantCheckResult {
  passed: boolean;
  message: string;
  severity: 'error' | 'warning';
}

export interface InvariantValidation {
  allPassed: boolean;
  results: InvariantCheckResult[];
}

export interface QualityTotals {
  good: number;
  average: number;
  rejected: number;
  blank: number;
  total: number;
}

/**
 * 🔒 INVARIANT 1: Quality buckets must sum to total
 * GOOD + AVERAGE + REJECT + BLANK === TOTAL
 */
export function validateQualitySum(qualityTotals: QualityTotals): InvariantCheckResult {
  const qualitySum = qualityTotals.good + qualityTotals.average + qualityTotals.rejected + qualityTotals.blank;
  const passed = qualitySum === qualityTotals.total;
  
  return {
    passed,
    message: passed 
      ? `Quality sum validated: ${qualitySum} = ${qualityTotals.total}`
      : `QUALITY SUM MISMATCH: ${qualitySum} ≠ ${qualityTotals.total} (Good: ${qualityTotals.good}, Avg: ${qualityTotals.average}, Rej: ${qualityTotals.rejected}, Blank: ${qualityTotals.blank})`,
    severity: 'error',
  };
}

/**
 * 🔒 INVARIANT 2: No NULL application_date allowed
 * Every record must have a valid application_date
 */
export function validateNoNullApplicationDate(nullCount: number): InvariantCheckResult {
  const passed = nullCount === 0;
  
  return {
    passed,
    message: passed 
      ? 'All records have valid application_date'
      : `DATA QUALITY: ${nullCount} records have NULL application_date`,
    severity: 'error',
  };
}

/**
 * 🔒 INVARIANT 3: Month-wise totals should not change after upload
 * (This is a warning - totals can change if new records added to that month)
 */
export function validateMonthTotalsStable(
  previousMonthTotals: Map<string, number>,
  currentMonthTotals: Map<string, number>
): InvariantCheckResult {
  const changes: string[] = [];
  
  previousMonthTotals.forEach((prevCount, month) => {
    const currCount = currentMonthTotals.get(month) || 0;
    if (currCount < prevCount) {
      // Totals should never decrease (records don't get deleted)
      changes.push(`${month}: ${prevCount} → ${currCount} (decreased!)`);
    }
  });
  
  const passed = changes.length === 0;
  
  return {
    passed,
    message: passed 
      ? 'Month-wise totals stable'
      : `MONTH TOTAL CHANGES: ${changes.join(', ')}`,
    severity: 'warning',
  };
}

/**
 * 🔒 INVARIANT 4: Validate expected months are present
 * Check that Nov 2025, Dec 2025, Jan 2026 are all represented
 */
export function validateExpectedMonthsPresent(
  months: string[],
  expectedMonths: string[] = ['Nov 2025', 'Dec 2025', 'Jan 2026']
): InvariantCheckResult {
  const missingMonths = expectedMonths.filter(em => !months.includes(em));
  const passed = missingMonths.length === 0;
  
  return {
    passed,
    message: passed 
      ? `All expected months present: ${expectedMonths.join(', ')}`
      : `MISSING MONTHS: ${missingMonths.join(', ')}`,
    severity: 'warning',
  };
}

/**
 * Run all invariant checks and return consolidated result
 */
export function runAllInvariantChecks(params: {
  qualityTotals: QualityTotals;
  nullApplicationDateCount: number;
  presentMonths: string[];
  expectedMonths?: string[];
}): InvariantValidation {
  const results: InvariantCheckResult[] = [
    validateQualitySum(params.qualityTotals),
    validateNoNullApplicationDate(params.nullApplicationDateCount),
    validateExpectedMonthsPresent(params.presentMonths, params.expectedMonths),
  ];
  
  const allPassed = results.every(r => r.passed);
  
  return {
    allPassed,
    results,
  };
}

/**
 * 🔒 AUTHORITATIVE QUALITY MAPPING
 * 
 * This is the SINGLE SOURCE OF TRUTH for quality derivation.
 * NO "else = Good" rule - unmapped values go to Blank.
 */
export const QUALITY_WHITELIST = {
  GOOD: ['ACCEPT', 'BQS_MATCH', 'REFER WITH FI', 'REFER-PAN', 'STPK'] as readonly string[],
  AVERAGE: ['STPI', 'STPT'] as readonly string[],
  REJECT_PATTERN: 'REJECT', // Any value containing this
} as const;

export type QualityLevel = 'Good' | 'Average' | 'Rejected' | 'Blank';

/**
 * Derive quality from blaze_output using authoritative whitelist
 * NO DEFAULT TO GOOD - unmapped values → Blank
 */
export function deriveQualityFromBlazeOutput(blazeOutput: string | null | undefined): QualityLevel {
  const normalized = blazeOutput?.toString().toUpperCase()?.trim() || '';
  
  // Rule 1: BLANK - null, empty, or "0"
  if (normalized === '' || normalized === '0') {
    return 'Blank';
  }
  
  // Rule 2: REJECT - contains 'REJECT'
  if (normalized.includes(QUALITY_WHITELIST.REJECT_PATTERN)) {
    return 'Rejected';
  }
  
  // Rule 3: AVERAGE - exact match
  if (QUALITY_WHITELIST.AVERAGE.includes(normalized)) {
    return 'Average';
  }
  
  // Rule 4: GOOD - exact match to whitelist
  if (QUALITY_WHITELIST.GOOD.includes(normalized)) {
    return 'Good';
  }
  
  // Rule 5: BLANK - any unmapped value (NO DEFAULT TO GOOD!)
  return 'Blank';
}
