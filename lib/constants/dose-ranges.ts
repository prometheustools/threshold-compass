/**
 * Dose Validation Constants
 *
 * Safety-critical ranges for microdosing substances.
 * Based on harm reduction guidelines and The Threshold Method protocol.
 */

export type Substance = 'psilocybin' | 'lsd';
export type WarningLevel = 'info' | 'warning' | 'critical';

export interface DoseRange {
  min: number;
  typicalLow: number;
  typicalHigh: number;
  max: number;
  danger: number;
  unit: string;
  unitLabel: string;
  step: number;
  defaultDose: number;
}

export interface DoseWarning {
  level: WarningLevel;
  title: string;
  message: string;
  allowContinue: boolean;
}

export const DOSE_RANGES: Record<Substance, DoseRange> = {
  psilocybin: {
    min: 0.01,
    typicalLow: 0.05,
    typicalHigh: 0.2,
    max: 0.3,
    danger: 0.5,
    unit: 'g',
    unitLabel: 'grams',
    step: 0.01,
    defaultDose: 0.1,
  },
  lsd: {
    min: 5,
    typicalLow: 10,
    typicalHigh: 20,
    max: 25,
    danger: 50,
    unit: 'µg',
    unitLabel: 'micrograms',
    step: 1,
    defaultDose: 10,
  },
};

export const SUBSTANCE_LABELS: Record<Substance, string> = {
  psilocybin: 'Psilocybin',
  lsd: 'LSD',
};

/**
 * Validate a dose and return appropriate warning if needed
 */
export function validateDose(
  substance: Substance,
  amount: number
): DoseWarning | null {
  const range = DOSE_RANGES[substance];

  if (amount <= 0) {
    return {
      level: 'info',
      title: 'Invalid Dose',
      message: 'Please enter a positive dose amount.',
      allowContinue: false,
    };
  }

  if (amount < range.min) {
    return {
      level: 'info',
      title: 'Very Low Dose',
      message: `${amount}${range.unit} is below the typical microdose range (${range.typicalLow}-${range.typicalHigh}${range.unit}). This dose may not produce noticeable effects.`,
      allowContinue: true,
    };
  }

  if (amount >= range.danger) {
    return {
      level: 'critical',
      title: 'Dangerous Dose',
      message: `${amount}${range.unit} exceeds safe microdosing limits. This is a full psychedelic dose and NOT suitable for microdosing. The Threshold Method protocol does not support doses above ${range.max}${range.unit}.`,
      allowContinue: false,
    };
  }

  if (amount > range.max) {
    return {
      level: 'warning',
      title: 'High Dose Warning',
      message: `${amount}${range.unit} is above the recommended microdose range (${range.typicalLow}-${range.typicalHigh}${range.unit}). This may cause perceptual effects beyond the threshold range.`,
      allowContinue: true,
    };
  }

  if (amount > range.typicalHigh) {
    return {
      level: 'info',
      title: 'Upper Range',
      message: `${amount}${range.unit} is at the upper end of the microdose range. Consider starting lower if this is your first dose.`,
      allowContinue: true,
    };
  }

  return null; // No warning needed
}

/**
 * Get display format for a dose
 */
export function formatDose(substance: Substance, amount: number): string {
  const range = DOSE_RANGES[substance];
  return `${amount}${range.unit}`;
}

/**
 * Get the tier classification for a dose
 */
export function getDoseTier(
  substance: Substance,
  amount: number
): 'sub' | 'threshold' | 'above' | 'danger' {
  const range = DOSE_RANGES[substance];

  if (amount >= range.danger) return 'danger';
  if (amount > range.max) return 'above';
  if (amount >= range.typicalLow && amount <= range.typicalHigh) return 'threshold';
  return 'sub';
}
