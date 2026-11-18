import type { ClauseType } from "./analysis/contract";

// Plain-English titles for each clause type, shown on a flag.
export const CLAUSE_TITLES: Record<ClauseType, string> = {
  auto_renewal: "Automatic renewal",
  price_increase: "Price increase",
  minimum_commitment: "Minimum commitment or exit fee",
  termination: "Ending the agreement",
  indemnity: "Covering the vendor's losses",
  liability: "Limits on what the vendor owes you",
  unilateral_change: "Vendor can change the terms",
  payment: "Payment terms",
  data: "Your data",
  boilerplate: "Standard one-sided clause",
  other: "Other clause",
};
