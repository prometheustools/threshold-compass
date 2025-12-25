/**
 * Medication Interaction Constants
 *
 * Drug lists and contraindication levels for psychedelic safety.
 * Based on harm reduction guidelines.
 */

export type ContraindicationLevel = 'block' | 'warn' | 'info';

export interface DrugClass {
  name: string;
  level: ContraindicationLevel;
  keywords: string[];
  message: string;
  effectModifier?: number; // Multiplier for effective dose (e.g., 0.7 = 30% reduction)
}

/**
 * Drug classes with contraindication info
 * Order matters - checked in sequence, first match wins
 */
export const DRUG_CLASSES: DrugClass[] = [
  // ABSOLUTE CONTRAINDICATIONS (block)
  {
    name: 'Lithium',
    level: 'block',
    keywords: ['lithium', 'lithobid', 'eskalith'],
    message: 'Lithium combined with psychedelics can cause severe, potentially fatal reactions including seizures. Do NOT proceed.',
  },
  {
    name: 'MAOIs',
    level: 'block',
    keywords: [
      'maoi', 'mao inhibitor',
      'phenelzine', 'nardil',
      'tranylcypromine', 'parnate',
      'isocarboxazid', 'marplan',
      'selegiline', 'emsam', 'zelapar',
      'moclobemide', 'manerix',
    ],
    message: 'MAOIs combined with psychedelics can cause serotonin syndrome, a potentially fatal condition. Do NOT proceed.',
  },
  {
    name: 'Tramadol',
    level: 'block',
    keywords: ['tramadol', 'ultram', 'conzip'],
    message: 'Tramadol combined with psychedelics significantly increases seizure risk. Do NOT proceed.',
  },

  // RELATIVE CONTRAINDICATIONS (warn)
  {
    name: 'SSRIs',
    level: 'warn',
    keywords: [
      'ssri',
      'sertraline', 'zoloft',
      'fluoxetine', 'prozac',
      'paroxetine', 'paxil',
      'escitalopram', 'lexapro',
      'citalopram', 'celexa',
      'fluvoxamine', 'luvox',
      'vilazodone', 'viibryd',
    ],
    message: 'SSRIs reduce psychedelic effects due to 5-HT2A receptor competition. Effects may be diminished or unpredictable. Proceed with caution.',
    effectModifier: 0.7, // 30% reduction in perceived effect
  },
  {
    name: 'SNRIs',
    level: 'warn',
    keywords: [
      'snri',
      'venlafaxine', 'effexor',
      'duloxetine', 'cymbalta',
      'desvenlafaxine', 'pristiq',
      'levomilnacipran', 'fetzima',
    ],
    message: 'SNRIs can reduce psychedelic effects and may increase serotonin-related risks. Proceed with caution.',
    effectModifier: 0.75,
  },
  {
    name: 'Antipsychotics',
    level: 'warn',
    keywords: [
      'antipsychotic',
      'risperidone', 'risperdal',
      'quetiapine', 'seroquel',
      'olanzapine', 'zyprexa',
      'aripiprazole', 'abilify',
      'haloperidol', 'haldol',
      'clozapine', 'clozaril',
    ],
    message: 'Antipsychotics block the receptors psychedelics act on, significantly reducing or eliminating effects. They may also cause unpredictable interactions.',
    effectModifier: 0.3, // Major reduction
  },
  {
    name: 'Tricyclic Antidepressants',
    level: 'warn',
    keywords: [
      'tricyclic', 'tca',
      'amitriptyline', 'elavil',
      'nortriptyline', 'pamelor',
      'imipramine', 'tofranil',
      'desipramine', 'norpramin',
    ],
    message: 'Tricyclic antidepressants may interact with psychedelics. Effects may be altered. Proceed with caution.',
    effectModifier: 0.8,
  },

  // INFORMATIONAL (info)
  {
    name: 'Benzodiazepines',
    level: 'info',
    keywords: [
      'benzodiazepine', 'benzo',
      'alprazolam', 'xanax',
      'lorazepam', 'ativan',
      'diazepam', 'valium',
      'clonazepam', 'klonopin',
    ],
    message: 'Benzodiazepines can reduce psychedelic effects. They are sometimes used as "trip killers" but should not be combined routinely.',
    effectModifier: 0.6,
  },
  {
    name: 'Blood Pressure Medications',
    level: 'info',
    keywords: [
      'lisinopril', 'losartan', 'amlodipine',
      'metoprolol', 'atenolol', 'propranolol',
    ],
    message: 'Some blood pressure medications may affect psychedelic experience. Monitor for dizziness or blood pressure changes.',
  },
];

/**
 * Check user medications against known contraindications
 */
export function checkMedicationContraindications(medications: string[]): {
  level: ContraindicationLevel | 'none';
  matches: Array<{ medication: string; drugClass: string; level: ContraindicationLevel; message: string }>;
  effectModifier: number;
  summary: string;
} {
  const matches: Array<{
    medication: string;
    drugClass: string;
    level: ContraindicationLevel;
    message: string;
    effectModifier?: number;
  }> = [];

  let highestLevel: ContraindicationLevel | 'none' = 'none';
  let combinedModifier = 1.0;

  for (const med of medications) {
    const medLower = med.toLowerCase();

    for (const drugClass of DRUG_CLASSES) {
      const isMatch = drugClass.keywords.some(keyword =>
        medLower.includes(keyword.toLowerCase())
      );

      if (isMatch) {
        matches.push({
          medication: med,
          drugClass: drugClass.name,
          level: drugClass.level,
          message: drugClass.message,
          effectModifier: drugClass.effectModifier,
        });

        // Track highest severity level
        if (drugClass.level === 'block') {
          highestLevel = 'block';
        } else if (drugClass.level === 'warn' && highestLevel !== 'block') {
          highestLevel = 'warn';
        } else if (drugClass.level === 'info' && highestLevel === 'none') {
          highestLevel = 'info';
        }

        // Combine effect modifiers (multiplicative)
        if (drugClass.effectModifier) {
          combinedModifier *= drugClass.effectModifier;
        }

        break; // Only match first drug class per medication
      }
    }
  }

  // Generate summary message
  let summary = '';
  if (highestLevel === 'block') {
    summary = `STOP: ${matches.filter(m => m.level === 'block').map(m => m.drugClass).join(', ')} detected. Do not proceed with dosing.`;
  } else if (highestLevel === 'warn') {
    const warnings = matches.filter(m => m.level === 'warn').map(m => m.drugClass);
    summary = `Warning: ${warnings.join(', ')} may affect your experience. Effects may be reduced by ~${Math.round((1 - combinedModifier) * 100)}%.`;
  } else if (highestLevel === 'info') {
    summary = `Note: ${matches.map(m => m.drugClass).join(', ')} detected. Be aware of potential interactions.`;
  }

  return {
    level: highestLevel,
    matches,
    effectModifier: combinedModifier,
    summary,
  };
}
