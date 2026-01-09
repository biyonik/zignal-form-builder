import { Injectable, inject } from '@angular/core';
import { I18nService, Language } from './i18n.service';
import { FormFieldDef } from '../models/form-builder.types';

export type ValidatorFn = (value: unknown, lang: Language) => string | null;

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private readonly i18n = inject(I18nService);

  /**
   * Validate a field value against its configuration
   */
  validateField(field: FormFieldDef, value: unknown): ValidationResult {
    const lang = this.i18n.lang();
    let error: string | null = null;

    // Required check
    if (field.config['required'] && this.isEmpty(value)) {
      error = this.i18n.t('fieldRequired');
      return { valid: false, error };
    }

    // Skip other validations if empty and not required
    if (this.isEmpty(value)) {
      return { valid: true, error: null };
    }

    // Type-specific validations
    switch (field.type) {
      case 'string':
      case 'textarea':
      case 'password':
        error = this.validateString(field, value as string);
        break;
      case 'email':
        error = this.validateEmail(value as string);
        break;
      case 'url':
        error = this.validateUrl(value as string);
        break;
      case 'number':
      case 'money':
      case 'percent':
      case 'slider':
        error = this.validateNumber(field, value as number);
        break;
      case 'phone':
        error = this.validatePhone(value as string);
        break;
      case 'json':
        error = this.validateJson(value as string);
        break;
      case 'multiselect':
        error = this.validateMultiselect(field, value as string[]);
        break;
    }

    // Pattern validation (applies to string types)
    if (!error && field.config['pattern'] && typeof value === 'string') {
      error = this.validatePattern(field.config['pattern'] as string, value);
    }

    return {
      valid: !error,
      error
    };
  }

  /**
   * Validate multiple fields at once
   */
  validateFields(fields: FormFieldDef[], values: Record<string, unknown>): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const field of fields) {
      const result = this.validateField(field, values[field.name]);
      if (!result.valid && result.error) {
        errors[field.name] = result.error;
      }
    }

    return errors;
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  }

  /**
   * Validate string fields (minLength, maxLength)
   */
  private validateString(field: FormFieldDef, value: string): string | null {
    const minLength = field.config['minLength'] as number | undefined;
    const maxLength = field.config['maxLength'] as number | undefined;

    if (minLength && value.length < minLength) {
      return this.i18n.t('minLengthError', { min: minLength });
    }

    if (maxLength && value.length > maxLength) {
      return this.i18n.t('maxLengthError', { max: maxLength });
    }

    return null;
  }

  /**
   * Validate email format
   */
  private validateEmail(value: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return this.i18n.t('invalidEmail');
    }
    return null;
  }

  /**
   * Validate URL format
   */
  private validateUrl(value: string): string | null {
    try {
      new URL(value);
      return null;
    } catch {
      return this.i18n.t('invalidUrl');
    }
  }

  /**
   * Validate phone format (basic)
   */
  private validatePhone(value: string): string | null {
    // Remove common formatting characters
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
    // Check if remaining is mostly digits (allowing + at start)
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(cleaned)) {
      return this.i18n.t('invalidFormat');
    }
    return null;
  }

  /**
   * Validate number fields (min, max)
   */
  private validateNumber(field: FormFieldDef, value: number): string | null {
    const min = field.config['min'] as number | undefined;
    const max = field.config['max'] as number | undefined;

    if (min !== undefined && value < min) {
      return this.i18n.t('minValueError', { min });
    }

    if (max !== undefined && value > max) {
      return this.i18n.t('maxValueError', { max });
    }

    return null;
  }

  /**
   * Validate JSON format
   */
  private validateJson(value: string): string | null {
    try {
      JSON.parse(value);
      return null;
    } catch {
      return this.i18n.t('invalidJson');
    }
  }

  /**
   * Validate multiselect (min/max selections)
   */
  private validateMultiselect(field: FormFieldDef, value: string[]): string | null {
    const min = field.config['min'] as number | undefined;
    const max = field.config['max'] as number | undefined;

    if (min !== undefined && value.length < min) {
      return this.i18n.t('minValueError', { min: `${min} secim` });
    }

    if (max !== undefined && value.length > max) {
      return this.i18n.t('maxValueError', { max: `${max} secim` });
    }

    return null;
  }

  /**
   * Validate against regex pattern
   */
  private validatePattern(pattern: string, value: string): string | null {
    try {
      const regex = new RegExp(pattern);
      if (!regex.test(value)) {
        return this.i18n.t('invalidFormat');
      }
      return null;
    } catch {
      // Invalid regex pattern, skip validation
      return null;
    }
  }

  /**
   * Validate password strength
   */
  validatePassword(value: string, config: Record<string, unknown>): string[] {
    const errors: string[] = [];
    const lang = this.i18n.lang();

    if (config['minLength'] && value.length < (config['minLength'] as number)) {
      errors.push(lang === 'tr'
        ? `En az ${config['minLength']} karakter`
        : `At least ${config['minLength']} characters`);
    }

    if (config['requireUppercase'] && !/[A-Z]/.test(value)) {
      errors.push(lang === 'tr' ? 'En az bir buyuk harf' : 'At least one uppercase letter');
    }

    if (config['requireNumber'] && !/[0-9]/.test(value)) {
      errors.push(lang === 'tr' ? 'En az bir rakam' : 'At least one number');
    }

    if (config['requireSpecial'] && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      errors.push(lang === 'tr' ? 'En az bir ozel karakter' : 'At least one special character');
    }

    return errors;
  }

  /**
   * Create a custom validator function
   */
  createValidator(
    validationFn: (value: unknown) => boolean,
    errorMessage: { tr: string; en: string }
  ): ValidatorFn {
    return (value: unknown, lang: Language) => {
      if (!validationFn(value)) {
        return errorMessage[lang];
      }
      return null;
    };
  }
}
