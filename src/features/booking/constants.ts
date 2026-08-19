import type { BookingSchedule } from './types';

/** Length of one bookable slot, in minutes. */
export const DEFAULT_SLOT_MINUTES = 90;

export const MIN_SLOT_MINUTES = 15;
export const MAX_SLOT_MINUTES = 8 * 60;

/** Slot lengths offered in the booking settings. */
export const SLOT_MINUTE_PRESETS = [30, 45, 60, 90, 120] as const;

/**
 * Default bookable start times, indexed by weekday (0 = Sunday … 6 = Saturday).
 * Editable in the booking settings.
 */
export const DEFAULT_SCHEDULE: BookingSchedule = [
  [], // Sunday
  ['12:00', '13:30', '15:00', '16:30', '18:00'], // Monday
  ['10:30', '12:00', '13:30', '15:00', '16:30', '18:00'], // Tuesday
  ['09:00', '10:30'], // Wednesday
  ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'], // Thursday
  ['12:00', '13:30', '15:00', '16:30'], // Friday
  [], // Saturday
];

/**
 * Preset reasons offered when blocking a slot. `custom` lets the user type a
 * free-text title instead; the ids map to i18n keys under `booking.reasons`.
 */
export const BLOCK_REASON_IDS = ['sport', 'vacation', 'sick', 'custom'] as const;

export type BlockReasonId = (typeof BLOCK_REASON_IDS)[number];
