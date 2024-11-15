import { CmeGuidelines, StateKeys } from "../lib/types";

// Sample CME guidelines data with defined state keys
export const cmeGuidelines: Record<StateKeys, CmeGuidelines> = {
  CA: { cmeHoursRequired: 50, renewalCycleYears: 2 },
  NY: { cmeHoursRequired: 30, renewalCycleYears: 3 },
  TX: { cmeHoursRequired: 48, renewalCycleYears: 2 },
  // Add more states as necessary
};
