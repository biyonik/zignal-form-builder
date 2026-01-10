import { Injectable, signal, computed, inject } from '@angular/core';
import {
  // Core
  FormSchema,
  FormState,
  IField,
  FormDataType,

  // Fields
  StringField,
  NumberField,
  BooleanField,
  DateField,
  SelectField,
  TextareaField,
  MultiselectField,
  EmailField,
  PasswordField,
  PhoneField,
  UrlField,
  ColorField,
  FileField,
  GroupField,
  RatingField,
  SlugField,
  TagsField,
  TimeField,
  JsonField,
  SelectOption,

  // i18n
  setLocale,
  getLocale,
  t,

  // Validators
  tcknSchema,
  vknSchema,
  turkishIbanSchema,
  turkishPhoneSchema,
  isValidTCKN,
  isValidVKN,
  isValidTurkishIBAN,
  isValidTurkishPhone,
  isValidTurkishPlate,
  isValidTurkishPostalCode,

  // Cross Validators
  CrossValidators,
  CrossValidationRunner,
  CrossFieldValidatorDef,

  // Form Persistence
  createFormPersistence,
  FormPersistence,
} from '@biyonik/zignal';

import { FormBuilderService } from './form-builder.service';
import { FormFieldDef, FieldGroup, CrossValidatorDef } from '../models/form-builder.types';

/**
 * Zignal Form Service
 * Form Builder'daki alanları Zignal field'larına dönüştürür
 * ve FormSchema/FormState yönetimi sağlar
 */
@Injectable({ providedIn: 'root' })
export class ZignalFormService {
  private builderService = inject(FormBuilderService);

  // Current Zignal schema and state
  private _schema = signal<FormSchema<FormDataType> | null>(null);
  private _formState = signal<FormState<FormDataType> | null>(null);
  private _persistence = signal<FormPersistence<FormDataType> | null>(null);

  readonly schema = this._schema.asReadonly();
  readonly formState = this._formState.asReadonly();

  // Computed: Are we ready to render?
  readonly isReady = computed(() => this._schema() !== null && this._formState() !== null);

  // Computed: Form validity
  readonly isValid = computed(() => this._formState()?.valid() ?? false);

  // Computed: Form values
  readonly values = computed(() => this._formState()?.getValues() ?? {});

  // Computed: Form errors
  readonly errors = computed(() => {
    const state = this._formState();
    if (!state) return {};

    const errors: Record<string, string | null> = {};
    const fields = state.fields as Record<string, { error: () => string | null }>;

    for (const [key, field] of Object.entries(fields)) {
      errors[key] = field.error();
    }

    return errors;
  });

  constructor() {
    // Sync language with Zignal i18n
    this.syncLanguage();
  }

  /**
   * Sync builder language with Zignal
   */
  private syncLanguage(): void {
    const lang = this.builderService.language();
    setLocale(lang);
  }

  /**
   * Convert FormFieldDef to Zignal IField
   */
  private convertField(field: FormFieldDef): IField<unknown> | null {
    const { type, name, label, config } = field;

    // Extract common config values with proper typing
    const required = Boolean(config['required']);
    const minLength = typeof config['minLength'] === 'number' ? config['minLength'] : undefined;
    const maxLength = typeof config['maxLength'] === 'number' ? config['maxLength'] : undefined;
    const min = typeof config['min'] === 'number' ? config['min'] : undefined;
    const max = typeof config['max'] === 'number' ? config['max'] : undefined;
    const placeholder = typeof config['placeholder'] === 'string' ? config['placeholder'] : undefined;

    switch (type) {
      case 'string':
      case 'text':
        return new StringField(name, label, {
          required,
          minLength,
          maxLength,
          placeholder,
        });

      case 'email':
        return new EmailField(name, label, {
          required,
        });

      case 'password':
        return new PasswordField(name, label, {
          required,
          minLength: minLength || 8,
        });

      case 'number':
        return new NumberField(name, label, {
          required,
          min,
          max,
          integer: Boolean(config['integer']),
        });

      case 'boolean':
      case 'checkbox':
        return new BooleanField(name, label, {
          required,
        });

      case 'date':
        return new DateField(name, label, {
          required,
        });

      case 'time':
        return new TimeField(name, label, {
          required,
        });

      case 'select':
      case 'dropdown':
        const selectOptions: SelectOption[] = (config['options'] || []).map((opt: { value: string; label: string }) => ({
          value: opt.value,
          label: opt.label,
        }));
        return new SelectField(name, label, {
          required,
          options: selectOptions,
        });

      case 'multiselect':
        const multiOptions: SelectOption[] = (config['options'] || []).map((opt: { value: string; label: string }) => ({
          value: opt.value,
          label: opt.label,
        }));
        return new MultiselectField(name, label, {
          required,
          options: multiOptions,
        });

      case 'textarea':
        const rows = typeof config['rows'] === 'number' ? config['rows'] : 4;
        return new TextareaField(name, label, {
          required,
          minLength,
          maxLength,
          rows,
        });

      case 'phone':
        return new PhoneField(name, label, {
          required,
        });

      case 'turkishPhone':
        return new PhoneField(name, label, {
          required,
          customValidator: (value: unknown) => {
            if (!value || typeof value !== 'string') return null;
            const normalized = value.replace(/\s/g, '');
            if (!isValidTurkishPhone(normalized)) return 'Geçersiz Türk telefon numarası';
            return null;
          },
        });

      case 'url':
        return new UrlField(name, label, {
          required,
        });

      case 'color':
        return new ColorField(name, label, {
          required,
        });

      case 'file':
        return new FileField(name, label, {
          required,
        });

      case 'rating':
        const maxRating = typeof config['max'] === 'number' ? config['max'] : 5;
        return new RatingField(name, label, {
          required,
          max: maxRating,
        });

      case 'slug':
        return new SlugField(name, label, {
          required,
          maxLength,
        });

      case 'tags':
        return new TagsField(name, label, {
          required,
        });

      case 'json':
        return new JsonField(name, label, {
          required,
        });

      // Turkish validator fields - use StringField with appropriate settings
      case 'tckn':
        return new StringField(name, label, {
          required,
          minLength: 11,
          maxLength: 11,
          pattern: /^\d{11}$/,
          customValidator: (value: unknown) => {
            if (!value || typeof value !== 'string') return null;
            if (!/^\d{11}$/.test(value)) return 'TCKN 11 haneli rakam olmalıdır';
            if (!isValidTCKN(value)) return 'Geçersiz TC Kimlik Numarası';
            return null;
          },
        });

      case 'vkn':
        return new StringField(name, label, {
          required,
          minLength: 10,
          maxLength: 10,
          pattern: /^\d{10}$/,
          customValidator: (value: unknown) => {
            if (!value || typeof value !== 'string') return null;
            if (!/^\d{10}$/.test(value)) return 'VKN 10 haneli rakam olmalıdır';
            if (!isValidVKN(value)) return 'Geçersiz Vergi Kimlik Numarası';
            return null;
          },
        });

      case 'iban':
        return new StringField(name, label, {
          required,
          minLength: 26,
          maxLength: 26,
          pattern: /^TR\d{24}$/i,
          customValidator: (value: unknown) => {
            if (!value || typeof value !== 'string') return null;
            const normalized = value.toUpperCase().replace(/\s/g, '');
            if (!/^TR\d{24}$/.test(normalized)) return 'IBAN TR ile başlamalı ve 26 karakter olmalıdır';
            if (!isValidTurkishIBAN(normalized)) return 'Geçersiz Türk IBAN';
            return null;
          },
        });

      case 'turkishPlate':
        return new StringField(name, label, {
          required,
          pattern: /^\d{2}\s?[A-Z]{1,3}\s?\d{2,4}$/i,
          customValidator: (value: unknown) => {
            if (!value || typeof value !== 'string') return null;
            const normalized = value.toUpperCase().replace(/\s/g, '');
            if (!isValidTurkishPlate(normalized)) return 'Geçersiz Türk plaka formatı';
            return null;
          },
        });

      case 'postalCode':
        return new StringField(name, label, {
          required,
          pattern: /^\d{5}$/,
          customValidator: (value: unknown) => {
            if (!value || typeof value !== 'string') return null;
            if (!/^\d{5}$/.test(value)) return 'Posta kodu 5 haneli rakam olmalıdır';
            if (!isValidTurkishPostalCode(value)) return 'Geçersiz posta kodu';
            return null;
          },
        });

      default:
        // Default to string field
        return new StringField(name, label, {
          required,
        });
    }
  }

  /**
   * Convert FieldGroup to Zignal GroupField
   */
  private convertGroup(group: FieldGroup, fields: FormFieldDef[]): GroupField | null {
    const groupFields: IField<unknown>[] = [];

    for (const field of fields) {
      const converted = this.convertField(field);
      if (converted) {
        groupFields.push(converted);
      }
    }

    if (groupFields.length === 0) {
      return null;
    }

    const lang = this.builderService.language();
    const label = typeof group.label === 'string' ? group.label : group.label[lang];

    // Create GroupField with nested fields
    return new GroupField(group.id, label, groupFields, {
      collapsible: group.collapsible || false,
      collapsed: group.collapsed || false,
      showTitle: true,
    });
  }

  /**
   * Convert CrossValidatorDef to Zignal CrossFieldValidatorDef
   */
  private convertCrossValidator(validator: CrossValidatorDef): CrossFieldValidatorDef<FormDataType> | null {
    const lang = this.builderService.language();
    const message = validator.message[lang] || validator.message.tr;

    switch (validator.type) {
      case 'fieldsMatch':
        if (validator.fields.length >= 2) {
          return CrossValidators.fieldsMatch<FormDataType>(
            validator.fields[0],
            validator.fields[1],
            message
          );
        }
        return null;

      case 'atLeastOne':
        return CrossValidators.atLeastOne<FormDataType>(
          validator.fields,
          message
        );

      case 'custom':
        if (validator.customExpression) {
          return CrossValidators.custom<FormDataType>(
            validator.name,
            validator.fields,
            (values: FormDataType) => {
              try {
                const fn = new Function('values', `return ${validator.customExpression}`);
                return fn(values) === true ? null : message;
              } catch {
                return message;
              }
            }
          );
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Build Zignal FormSchema from current form builder state
   */
  buildSchema(): FormSchema<FormDataType> {
    const fields = this.builderService.fields();
    const groups = this.builderService.groups();

    const zignalFields: IField<unknown>[] = [];
    const processedFieldIds = new Set<string>();

    // Process grouped fields first
    for (const group of groups) {
      const groupFields = fields.filter(f => f.groupId === group.id);

      if (groupFields.length > 0) {
        const groupField = this.convertGroup(group, groupFields);
        if (groupField) {
          zignalFields.push(groupField);
        }

        // Mark these fields as processed
        groupFields.forEach(f => processedFieldIds.add(f.id));
      }
    }

    // Process ungrouped fields
    for (const field of fields) {
      if (!processedFieldIds.has(field.id)) {
        const converted = this.convertField(field);
        if (converted) {
          zignalFields.push(converted);
        }
      }
    }

    return new FormSchema(zignalFields);
  }

  /**
   * Create form state with initial values
   */
  createFormState(initialValues?: Record<string, unknown>): FormState<FormDataType> {
    const schema = this.buildSchema();
    this._schema.set(schema);

    const formState = schema.createForm(initialValues || {});
    this._formState.set(formState);

    return formState;
  }

  /**
   * Update form state with new values
   */
  updateFormState(): void {
    const currentValues = this._formState()?.getValues() || {};
    this.createFormState(currentValues);
  }

  /**
   * Enable form persistence
   */
  enablePersistence(formId: string, options?: { storage?: 'local' | 'session'; exclude?: string[] }): void {
    const persistence = createFormPersistence<FormDataType>(formId, {
      storage: options?.storage || 'local',
      exclude: options?.exclude || [],
      debounce: 500,
    });

    this._persistence.set(persistence);

    // Load saved data if exists
    const saved = persistence.load();
    if (saved && this._formState()) {
      this._formState()!.patchValues(saved);
    }

    // Enable auto-save
    const formState = this._formState();
    if (formState) {
      persistence.enableAutoSave(formState.values);
    }
  }

  /**
   * Disable form persistence
   */
  disablePersistence(): void {
    this._persistence()?.clear();
    this._persistence.set(null);
  }

  /**
   * Validate with Turkish validators
   */
  validateTurkishField(type: 'tckn' | 'vkn' | 'iban' | 'phone', value: string): { valid: boolean; error?: string } {
    const lang = this.builderService.language();

    switch (type) {
      case 'tckn':
        const tcknResult = tcknSchema.safeParse(value);
        return {
          valid: tcknResult.success,
          error: tcknResult.success ? undefined : (lang === 'tr' ? 'Geçersiz TC Kimlik No' : 'Invalid Turkish ID'),
        };

      case 'vkn':
        const vknResult = vknSchema.safeParse(value);
        return {
          valid: vknResult.success,
          error: vknResult.success ? undefined : (lang === 'tr' ? 'Geçersiz Vergi No' : 'Invalid Tax ID'),
        };

      case 'iban':
        const ibanResult = turkishIbanSchema.safeParse(value);
        return {
          valid: ibanResult.success,
          error: ibanResult.success ? undefined : (lang === 'tr' ? 'Geçersiz IBAN' : 'Invalid IBAN'),
        };

      case 'phone':
        const phoneResult = turkishPhoneSchema.safeParse(value);
        return {
          valid: phoneResult.success,
          error: phoneResult.success ? undefined : (lang === 'tr' ? 'Geçersiz telefon numarası' : 'Invalid phone number'),
        };

      default:
        return { valid: true };
    }
  }

  /**
   * Run cross-field validation
   */
  async runCrossValidation(): Promise<{ valid: boolean; errors: Record<string, string> }> {
    const crossValidators = this.builderService.crossValidators();
    const values = this._formState()?.getValues() || {};

    const validatorDefs: CrossFieldValidatorDef<FormDataType>[] = [];
    for (const cv of crossValidators) {
      const converted = this.convertCrossValidator(cv);
      if (converted) {
        validatorDefs.push(converted);
      }
    }

    if (validatorDefs.length === 0) {
      return { valid: true, errors: {} };
    }

    const runner = new CrossValidationRunner<FormDataType>(validatorDefs);
    const result = runner.validate(values as FormDataType);

    return {
      valid: result.valid,
      errors: result.errors,
    };
  }

  /**
   * Full form validation including cross-field
   */
  async validateAll(): Promise<boolean> {
    const formState = this._formState();
    if (!formState) return false;

    // Run field-level validation
    const fieldValid = await formState.validateAll();

    // Run cross-field validation
    const crossResult = await this.runCrossValidation();

    return fieldValid && crossResult.valid;
  }

  /**
   * Get form values
   */
  getValues(): Record<string, unknown> {
    return this._formState()?.getValues() || {};
  }

  /**
   * Set field value
   */
  setValue(fieldName: string, value: unknown): void {
    this._formState()?.setValue(fieldName as never, value as never);
  }

  /**
   * Reset form
   */
  reset(): void {
    this._formState()?.reset();
  }

  /**
   * Export form schema as Zignal-compatible JSON
   */
  exportZignalSchema(): string {
    const fields = this.builderService.fields();
    const groups = this.builderService.groups();
    const settings = this.builderService.settings();
    const crossValidators = this.builderService.crossValidators();

    const schema = {
      name: this.builderService.currentForm().name,
      description: this.builderService.currentForm().description,
      fields: fields.map(f => ({
        type: f.type,
        name: f.name,
        label: f.label,
        config: f.config,
        groupId: f.groupId,
      })),
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        label: g.label,
        collapsible: g.collapsible,
        collapsed: g.collapsed,
      })),
      settings: {
        layout: settings.layout,
        labelPosition: settings.labelPosition,
        size: settings.size,
        validateOnBlur: settings.validateOnBlur,
        validateOnChange: settings.validateOnChange,
        showReset: settings.showReset,
        submitButtonText: settings.submitButtonText,
        resetButtonText: settings.resetButtonText,
      },
      crossValidators: crossValidators.map(cv => ({
        name: cv.name,
        type: cv.type,
        fields: cv.fields,
        message: cv.message,
        customExpression: cv.customExpression,
      })),
      _zignal: {
        version: '0.1.2',
        generatedAt: new Date().toISOString(),
      },
    };

    return JSON.stringify(schema, null, 2);
  }

  /**
   * Get translation using Zignal i18n
   */
  translate(key: string, params?: Record<string, unknown>): string {
    return t(key as never, params as never);
  }

  /**
   * Set language
   */
  setLanguage(lang: 'tr' | 'en'): void {
    setLocale(lang);
    this.builderService.setLanguage(lang);
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return getLocale();
  }
}
