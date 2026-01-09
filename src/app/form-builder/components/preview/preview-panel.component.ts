import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormFieldDef, ConditionalRule, FormSettings } from '../../models/form-builder.types';
import { FieldRendererComponent } from '../field-renderers/field-renderer.component';
import { ValidationService } from '../../services/validation.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [CommonModule, FieldRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-panel">
      <div class="preview-header">
        <h4>{{ i18n.t('formPreview') }}</h4>
        <button class="btn-action" (click)="openFullscreen.emit()">
          {{ i18n.t('fullscreen') }}
        </button>
      </div>

      @if (fields.length > 0) {
        <div class="preview-form" [class.layout-horizontal]="settings.layout === 'horizontal'">
          @for (field of fields; track field.id) {
            @if (isFieldVisible(field)) {
              <div
                class="preview-field"
                [class.has-error]="errors()[field.name]"
                [class.field-disabled]="isFieldDisabled(field)"
              >
                <label>
                  {{ field.label }}
                  @if (field.config['required']) {
                    <span class="required-star">*</span>
                  }
                </label>

                <app-field-renderer
                  [field]="field"
                  [value]="values()[field.name]"
                  [disabled]="isFieldDisabled(field)"
                  [error]="errors()[field.name]"
                  [lang]="i18n.lang()"
                  (valueChange)="onValueChange(field.name, $event)"
                  (blur)="onFieldBlur(field.name)"
                />
              </div>
            }
          }

          <div class="preview-buttons">
            <button class="btn-submit" type="button" (click)="onSubmit()">
              {{ settings.submitButtonText[i18n.lang()] }}
            </button>
            @if (settings.showReset) {
              <button class="btn-reset" type="button" (click)="onReset()">
                {{ settings.resetButtonText[i18n.lang()] }}
              </button>
            }
          </div>
        </div>
      } @else {
        <div class="no-fields">
          <p>{{ i18n.t('addFieldsToPreview') }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .preview-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .preview-header h4 {
      margin: 0;
      font-size: 1rem;
    }

    .btn-action {
      background: var(--bg-tertiary, #e0e0e0);
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      color: var(--text-primary, #333);
    }

    .btn-action:hover {
      background: var(--accent, #e94560);
      color: #fff;
    }

    .preview-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
      flex: 1;
      overflow-y: auto;
    }

    .preview-form.layout-horizontal .preview-field {
      flex-direction: row;
      align-items: center;
    }

    .preview-form.layout-horizontal .preview-field label {
      width: 150px;
      flex-shrink: 0;
    }

    .preview-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .preview-field label {
      font-size: 0.9rem;
      font-weight: 500;
    }

    .required-star {
      color: var(--error, #e74c3c);
      margin-left: 4px;
    }

    .preview-field.has-error {
      animation: shake 0.3s ease-in-out;
    }

    .preview-field.field-disabled {
      opacity: 0.6;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .preview-buttons {
      display: flex;
      gap: 10px;
      margin-top: 10px;
      padding-top: 15px;
      border-top: 1px solid var(--border, #ddd);
    }

    .btn-submit {
      flex: 1;
      background: var(--accent, #e94560);
      color: #fff;
      border: none;
      padding: 12px;
      border-radius: 5px;
      font-size: 0.95rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-submit:hover {
      background: var(--accent-hover, #ff6b6b);
    }

    .btn-reset {
      background: var(--bg-secondary, #f0f0f0);
      color: var(--text-primary, #333);
      border: 1px solid var(--border, #ddd);
      padding: 12px 20px;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-reset:hover {
      background: var(--bg-tertiary, #e0e0e0);
    }

    .no-fields {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--text-secondary, #666);
      font-style: italic;
    }
  `]
})
export class PreviewPanelComponent {
  readonly i18n = inject(I18nService);
  private readonly validation = inject(ValidationService);

  @Input() fields: FormFieldDef[] = [];
  @Input() settings!: FormSettings;

  @Output() openFullscreen = new EventEmitter<void>();
  @Output() submit = new EventEmitter<Record<string, unknown>>();

  // Internal state
  readonly values = signal<Record<string, unknown>>({});
  readonly errors = signal<Record<string, string>>({});

  /**
   * Handle value change from field renderer
   */
  onValueChange(fieldName: string, value: unknown): void {
    this.values.update(v => ({ ...v, [fieldName]: value }));
    // Clear error on input
    this.errors.update(e => ({ ...e, [fieldName]: '' }));

    // Recalculate calculated fields
    this.updateCalculatedFields();
  }

  /**
   * Handle field blur - validate
   */
  onFieldBlur(fieldName: string): void {
    const field = this.fields.find(f => f.name === fieldName);
    if (!field) return;

    const result = this.validation.validateField(field, this.values()[fieldName]);
    if (!result.valid && result.error) {
      this.errors.update(e => ({ ...e, [fieldName]: result.error! }));
    }
  }

  /**
   * Check if field should be visible based on conditions
   */
  isFieldVisible(field: FormFieldDef): boolean {
    const currentValues = this.values();

    // Check hideWhen condition
    if (field.config['hideWhen']) {
      const condition = field.config['hideWhen'] as ConditionalRule;
      if (this.evaluateCondition(condition, currentValues)) {
        return false;
      }
    }

    // Check showWhen condition
    if (field.config['showWhen']) {
      const condition = field.config['showWhen'] as ConditionalRule;
      if (!this.evaluateCondition(condition, currentValues)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if field should be disabled based on conditions
   */
  isFieldDisabled(field: FormFieldDef): boolean {
    const currentValues = this.values();

    if (field.config['disableWhen']) {
      const condition = field.config['disableWhen'] as ConditionalRule;
      return this.evaluateCondition(condition, currentValues);
    }

    return false;
  }

  /**
   * Evaluate a conditional rule
   */
  private evaluateCondition(condition: ConditionalRule, values: Record<string, unknown>): boolean {
    if (!condition?.field || !condition?.operator) {
      return false;
    }

    const fieldValue = values[condition.field];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue || String(fieldValue) === String(conditionValue);
      case 'notEquals':
        return fieldValue !== conditionValue && String(fieldValue) !== String(conditionValue);
      case 'contains':
        if (typeof fieldValue === 'string' && typeof conditionValue === 'string') {
          return fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
        }
        return false;
      case 'greaterThan':
        return Number(fieldValue) > Number(conditionValue);
      case 'lessThan':
        return Number(fieldValue) < Number(conditionValue);
      case 'isEmpty':
        return fieldValue === '' || fieldValue === null || fieldValue === undefined;
      case 'isNotEmpty':
        return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }

  /**
   * Update calculated fields based on current values
   */
  private updateCalculatedFields(): void {
    const calculatedFields = this.fields.filter(f => f.type === 'calculated');

    for (const field of calculatedFields) {
      const formula = field.config['formula'] as string;
      if (formula) {
        const result = this.evaluateFormula(formula, this.values());
        this.values.update(v => ({ ...v, [field.name]: result }));
      }
    }
  }

  /**
   * Evaluate a formula string
   * Example: "{price} * {quantity}" or "{total} * 0.18"
   */
  private evaluateFormula(formula: string, values: Record<string, unknown>): number | string {
    try {
      // Replace field references with actual values
      let expression = formula;
      const fieldRefs = formula.match(/\{([^}]+)\}/g) || [];

      for (const ref of fieldRefs) {
        const fieldName = ref.slice(1, -1);
        const value = values[fieldName];
        const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        expression = expression.replace(ref, String(numValue));
      }

      // Safely evaluate the expression (basic math only)
      // eslint-disable-next-line no-eval
      const result = Function(`"use strict"; return (${expression})`)();

      if (typeof result === 'number' && !isNaN(result)) {
        // Round to 2 decimal places
        return Math.round(result * 100) / 100;
      }

      return result;
    } catch {
      return 'Hata';
    }
  }

  /**
   * Handle submit button click
   */
  onSubmit(): void {
    // Validate all fields
    const allErrors = this.validation.validateFields(this.fields, this.values());

    if (Object.keys(allErrors).length > 0) {
      this.errors.set(allErrors);
      return;
    }

    this.submit.emit(this.values());
  }

  /**
   * Handle reset button click
   */
  onReset(): void {
    this.values.set({});
    this.errors.set({});
  }

  /**
   * Get current values (for external access)
   */
  getValues(): Record<string, unknown> {
    return this.values();
  }

  /**
   * Set values programmatically
   */
  setValues(newValues: Record<string, unknown>): void {
    this.values.set(newValues);
  }
}
