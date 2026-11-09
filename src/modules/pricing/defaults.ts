import type { PricingRules } from './calculator';
// Federal non-working public holidays; transferred days off are not added.
// Verify the calendar before public launch. No remote calendar sync is claimed.
export const initialPricingRules: PricingRules = {
  version: 'initial-owner-approved-v1', minimumNights: 1,
  weekdayKopecks: 1_200_000, weekendKopecks: 1_600_000,
  holidayKopecks: 1_600_000, saunaDayKopecks: 600_000,
  holidayMonthDays: ['01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08', '02-23', '03-08', '05-01', '05-09', '06-12', '11-04'],
  overrides: {},
};
