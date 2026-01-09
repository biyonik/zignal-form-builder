import { EventEmitter } from '@angular/core';
import { FormFieldDef } from '../../models/form-builder.types';

/**
 * Base interface for all field renderer components
 */
export interface FieldRendererConfig {
  field: FormFieldDef;
  value: unknown;
  disabled: boolean;
  error?: string;
  hint?: string;
  lang: 'tr' | 'en';
}

/**
 * Events emitted by field renderers
 */
export interface FieldRendererEvents {
  valueChange: EventEmitter<unknown>;
  blur: EventEmitter<void>;
}

/**
 * Helper type for select options
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Configuration for calculated fields
 */
export interface CalculatedFieldConfig {
  formula: string;
  dependsOn: string[];
  format?: 'number' | 'currency' | 'percent';
  decimals?: number;
}

/**
 * Configuration for slider fields
 */
export interface SliderFieldConfig {
  min: number;
  max: number;
  step: number;
  showValue: boolean;
  showMinMax: boolean;
  unit?: string;
}

/**
 * Field type to component mapping
 */
export const FIELD_TYPE_COMPONENTS: Record<string, string> = {
  string: 'TextRenderer',
  email: 'TextRenderer',
  password: 'TextRenderer',
  url: 'TextRenderer',
  phone: 'TextRenderer',
  textarea: 'TextareaRenderer',
  number: 'NumberRenderer',
  select: 'SelectRenderer',
  multiselect: 'MultiselectRenderer',
  boolean: 'CheckboxRenderer',
  date: 'DateRenderer',
  time: 'TimeRenderer',
  color: 'ColorRenderer',
  rating: 'RatingRenderer',
  money: 'MoneyRenderer',
  percent: 'PercentRenderer',
  file: 'FileRenderer',
  tags: 'TagsRenderer',
  slug: 'SlugRenderer',
  json: 'JsonRenderer',
  slider: 'SliderRenderer',
  calculated: 'CalculatedRenderer',
};

/**
 * Currency symbols mapping
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Get currency symbol from code
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Slugify a string (URL-friendly)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
