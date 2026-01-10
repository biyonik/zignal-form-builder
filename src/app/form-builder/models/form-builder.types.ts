/**
 * TR: Form Builder için tip tanımlamaları
 * EN: Type definitions for Form Builder
 */

/**
 * TR: Form alanı tanımı
 * EN: Form field definition
 */
export interface FormFieldDef {
  id: string;
  type: string;
  name: string;
  label: string;
  config: FieldConfig;
  groupId?: string; // Hangi gruba ait
  order: number;
}

/**
 * TR: Alan konfigürasyonu
 * EN: Field configuration
 */
export interface FieldConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  placeholder?: string;
  hint?: string;
  options?: SelectOption[];
  rows?: number;
  accept?: string;
  maxSize?: number;
  currency?: string;
  integer?: boolean;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
  // Conditional logic
  showWhen?: ConditionalRule;
  hideWhen?: ConditionalRule;
  disableWhen?: ConditionalRule;
  // Custom
  [key: string]: unknown;
}

/**
 * TR: Select seçeneği
 * EN: Select option
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * TR: Koşullu görünürlük kuralı
 * EN: Conditional visibility rule
 */
export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
  value?: string | number | boolean;
}

/**
 * TR: Alan grubu tanımı
 * EN: Field group definition
 * ✅ TYPE FIX: Support bilingual labels and names
 */
export interface FieldGroup {
  id: string;
  name: string | { tr: string; en: string };
  label: string | { tr: string; en: string };
  description?: string | { tr: string; en: string };
  collapsible?: boolean;
  collapsed?: boolean;
  order: number;
}

/**
 * TR: Form tanımı
 * EN: Form definition
 */
export interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  fields: FormFieldDef[];
  groups: FieldGroup[];
  settings: FormSettings;
  crossValidators: CrossValidatorDef[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TR: Form ayarları
 * EN: Form settings
 */
/**
 * ✅ TYPE FIX: Align layout options with Zignal FormRendererConfig
 */
export interface FormSettings {
  submitButtonText: { tr: string; en: string };
  resetButtonText: { tr: string; en: string };
  showReset: boolean;
  validateOnBlur: boolean;
  validateOnChange: boolean;
  persistDraft: boolean;
  persistKey?: string;
  layout: 'vertical' | 'horizontal' | 'grid';  // Changed: 'inline' → 'grid' for Zignal compatibility
  labelPosition: 'top' | 'left' | 'floating';
  size: 'small' | 'medium' | 'large';
}

/**
 * TR: Cross-field validator tanımı
 * EN: Cross-field validator definition
 */
export interface CrossValidatorDef {
  id: string;
  name: string;
  type: 'fieldsMatch' | 'atLeastOne' | 'custom';
  fields: string[];
  message: { tr: string; en: string };
  customExpression?: string;
}

/**
 * TR: Undo/Redo için state snapshot
 * EN: State snapshot for Undo/Redo
 */
export interface FormStateSnapshot {
  fields: FormFieldDef[];
  groups: FieldGroup[];
  settings: FormSettings;
  crossValidators: CrossValidatorDef[];
  timestamp: number;
}

/**
 * TR: Kayıtlı form
 * EN: Saved form
 */
export interface SavedForm {
  id: string;
  name: string;
  description?: string;
  data: FormDefinition;
  savedAt: Date;
}

/**
 * TR: Tema
 * EN: Theme
 */
export type Theme = 'dark' | 'light';

/**
 * TR: Dil
 * EN: Language
 */
export type Language = 'tr' | 'en';

/**
 * TR: Aktif tab
 * EN: Active tab
 */
export type ActiveTab = 'config' | 'preview' | 'json' | 'settings' | 'conditions' | 'cross-validators';

/**
 * TR: Export formatı
 * EN: Export format
 */
export type ExportFormat = 'json' | 'typescript';

/**
 * TR: Varsayılan form ayarları
 * EN: Default form settings
 */
export const DEFAULT_FORM_SETTINGS: FormSettings = {
  submitButtonText: { tr: 'Gönder', en: 'Submit' },
  resetButtonText: { tr: 'Sıfırla', en: 'Reset' },
  showReset: true,
  validateOnBlur: true,
  validateOnChange: false,
  persistDraft: false,
  layout: 'vertical',
  labelPosition: 'top',
  size: 'medium',
};

/**
 * TR: Boş form tanımı oluştur
 * EN: Create empty form definition
 */
export function createEmptyForm(id?: string): FormDefinition {
  return {
    id: id || generateId(),
    name: 'Yeni Form / New Form',
    description: '',
    fields: [],
    groups: [],
    settings: { ...DEFAULT_FORM_SETTINGS },
    crossValidators: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * TR: Benzersiz ID oluştur
 * EN: Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

/**
 * TR: Operatör etiketleri
 * EN: Operator labels
 */
export const OPERATOR_LABELS: Record<ConditionalRule['operator'], { tr: string; en: string }> = {
  equals: { tr: 'Eşittir', en: 'Equals' },
  notEquals: { tr: 'Eşit Değildir', en: 'Not Equals' },
  contains: { tr: 'İçerir', en: 'Contains' },
  greaterThan: { tr: 'Büyüktür', en: 'Greater Than' },
  lessThan: { tr: 'Küçüktür', en: 'Less Than' },
  isEmpty: { tr: 'Boş', en: 'Is Empty' },
  isNotEmpty: { tr: 'Boş Değil', en: 'Is Not Empty' },
};
