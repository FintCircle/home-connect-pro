/** Pangisa fee rules. Shared by the UI and the server functions. */

export const LISTING_FEE_PERCENT = 5;
export const UNITS_DISCOUNT_PERCENT = 15;
export const REFERRAL_PERCENT = 3;
export const MIN_WITHDRAWAL_UGX = 5000;
export const MIN_ACCESS_FEE_UGX = 1000;

/** Tenant access fee percentage, smaller for higher rents. */
export function accessFeePercent(rentUgx: number): number {
  if (rentUgx < 300_000) return 0.5;
  if (rentUgx < 1_000_000) return 0.25;
  if (rentUgx < 3_000_000) return 0.2;
  return 0.15;
}

function roundTo100(value: number): number {
  return Math.round(value / 100) * 100;
}

/** What a tenant pays once to unlock the landlord's contact + exact location. */
export function accessFee(rentUgx: number): number {
  const raw = (rentUgx * accessFeePercent(rentUgx)) / 100;
  return Math.max(MIN_ACCESS_FEE_UGX, roundTo100(raw));
}

/** What a landlord pays to make a listing live. Per unit, discounted for multi-unit. */
export function listingFee(
  rentUgx: number,
  hasUnits: boolean,
  totalUnits: number,
): { total: number; perUnit: number; units: number; discountPercent: number } {
  const perUnit = roundTo100((rentUgx * LISTING_FEE_PERCENT) / 100);
  const units = hasUnits ? Math.max(1, totalUnits) : 1;
  const discountPercent = hasUnits && units > 1 ? UNITS_DISCOUNT_PERCENT : 0;
  const total = roundTo100(perUnit * units * (1 - discountPercent / 100));
  return { total, perUnit, units, discountPercent };
}

export function referralShare(feeUgx: number): number {
  return roundTo100((feeUgx * REFERRAL_PERCENT) / 100);
}

export function formatUgx(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `UGX ${new Intl.NumberFormat("en-UG").format(amount)}`;
}
