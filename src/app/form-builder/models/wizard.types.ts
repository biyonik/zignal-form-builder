/**
 * Multi-Step Wizard Types
 */

export interface WizardStep {
  id: string;
  title: { tr: string; en: string };
  description?: { tr: string; en: string };
  icon?: string;
  fields: string[]; // Field names in this step
  groupId?: string; // Optional: link to a group
  validation?: 'onNext' | 'onComplete' | 'none';
  order: number;
}

export interface WizardConfig {
  enabled: boolean;
  steps: WizardStep[];
  allowSkip: boolean;
  showProgress: boolean;
  showStepNumbers: boolean;
  completionMessage?: { tr: string; en: string };
  navigation: {
    nextText: { tr: string; en: string };
    prevText: { tr: string; en: string };
    finishText: { tr: string; en: string };
  };
}

export interface WizardState {
  currentStep: number;
  completedSteps: number[];
  stepErrors: Record<number, string[]>;
}

export const DEFAULT_WIZARD_CONFIG: WizardConfig = {
  enabled: false,
  steps: [],
  allowSkip: false,
  showProgress: true,
  showStepNumbers: true,
  completionMessage: {
    tr: 'Form basariyla tamamlandi!',
    en: 'Form completed successfully!'
  },
  navigation: {
    nextText: { tr: 'Sonraki', en: 'Next' },
    prevText: { tr: 'Onceki', en: 'Previous' },
    finishText: { tr: 'Tamamla', en: 'Finish' }
  }
};
