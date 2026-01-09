import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormFieldDef } from '../../models/form-builder.types';
import { SelectOption, getCurrencySymbol, slugify } from './field-renderer.model';

@Component({
  selector: 'app-field-renderer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field-renderer" [class.has-error]="error" [class.disabled]="disabled">
      @switch (field.type) {
        <!-- Text-based inputs -->
        @case ('string') {
          <input
            type="text"
            [value]="stringValue()"
            [placeholder]="placeholder"
            [disabled]="disabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
          />
        }
        @case ('email') {
          <input
            type="email"
            [value]="stringValue()"
            placeholder="email@example.com"
            [disabled]="disabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
          />
        }
        @case ('password') {
          <input
            type="password"
            [value]="stringValue()"
            placeholder="********"
            [disabled]="disabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
          />
        }
        @case ('url') {
          <input
            type="url"
            [value]="stringValue()"
            placeholder="https://"
            [disabled]="disabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
          />
        }
        @case ('phone') {
          <input
            type="tel"
            [value]="stringValue()"
            placeholder="+90 5XX XXX XX XX"
            [disabled]="disabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
          />
        }
        @case ('slug') {
          <input
            type="text"
            [value]="stringValue()"
            placeholder="url-slug-ornegi"
            [disabled]="disabled"
            (input)="onSlugInput($event)"
            (blur)="onBlur()"
          />
        }

        <!-- Textarea -->
        @case ('textarea') {
          <textarea
            [value]="stringValue()"
            [rows]="rows"
            [disabled]="disabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
          ></textarea>
        }
        @case ('json') {
          <textarea
            [value]="stringValue()"
            rows="4"
            class="json-textarea"
            [placeholder]="'{' + '\"key\": \"value\"' + '}'"
            [disabled]="disabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
          ></textarea>
        }

        <!-- Number inputs -->
        @case ('number') {
          <input
            type="number"
            [value]="stringValue()"
            [min]="min"
            [max]="max"
            [step]="step"
            [disabled]="disabled"
            (input)="onNumberInput($event)"
            (blur)="onBlur()"
          />
        }
        @case ('money') {
          <div class="money-input">
            <span class="currency-symbol">{{ currencySymbol }}</span>
            <input
              type="number"
              [value]="stringValue()"
              [min]="min"
              [max]="max"
              step="0.01"
              [disabled]="disabled"
              (input)="onNumberInput($event)"
              (blur)="onBlur()"
            />
          </div>
        }
        @case ('percent') {
          <div class="percent-input">
            <input
              type="number"
              [value]="stringValue()"
              [min]="min ?? 0"
              [max]="max ?? 100"
              [disabled]="disabled"
              (input)="onNumberInput($event)"
              (blur)="onBlur()"
            />
            <span class="percent-symbol">%</span>
          </div>
        }
        @case ('slider') {
          <div class="slider-input">
            <input
              type="range"
              [value]="numberValue()"
              [min]="min ?? 0"
              [max]="max ?? 100"
              [step]="step ?? 1"
              [disabled]="disabled"
              (input)="onNumberInput($event)"
            />
            @if (showSliderValue) {
              <span class="slider-value">{{ numberValue() }}{{ sliderUnit }}</span>
            }
          </div>
        }

        <!-- Select -->
        @case ('select') {
          <select
            [value]="stringValue()"
            [disabled]="disabled"
            (change)="onInput($event)"
            (blur)="onBlur()"
          >
            <option value="">{{ lang === 'tr' ? 'Sec' : 'Select' }}...</option>
            @for (opt of options; track opt.value) {
              <option [value]="opt.value" [selected]="stringValue() === opt.value">
                {{ opt.label }}
              </option>
            }
          </select>
        }

        <!-- Multiselect -->
        @case ('multiselect') {
          <div class="multiselect-preview">
            @for (opt of options; track opt.value) {
              <label class="multiselect-option">
                <input
                  type="checkbox"
                  [checked]="isOptionSelected(opt.value)"
                  [disabled]="disabled"
                  (change)="onMultiselectChange(opt.value, $event)"
                />
                {{ opt.label }}
              </label>
            }
          </div>
        }

        <!-- Boolean/Checkbox -->
        @case ('boolean') {
          <input
            type="checkbox"
            [checked]="booleanValue()"
            [disabled]="disabled"
            (change)="onCheckboxChange($event)"
          />
        }

        <!-- Date & Time -->
        @case ('date') {
          <input
            type="date"
            [value]="stringValue()"
            [disabled]="disabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
          />
        }
        @case ('time') {
          <input
            type="time"
            [value]="stringValue()"
            [disabled]="disabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
          />
        }

        <!-- Color -->
        @case ('color') {
          <input
            type="color"
            [value]="stringValue() || '#000000'"
            [disabled]="disabled"
            (input)="onInput($event)"
          />
        }

        <!-- File -->
        @case ('file') {
          <input
            type="file"
            [accept]="accept"
            [disabled]="disabled"
            (change)="onFileChange($event)"
          />
        }

        <!-- Rating -->
        @case ('rating') {
          <div class="rating-preview" [class.disabled]="disabled">
            @for (star of starsArray(); track star) {
              <span
                class="star"
                [class.filled]="star < (numberValue() || 0)"
                (click)="!disabled && onRatingClick(star + 1)"
              >{{ star < (numberValue() || 0) ? '★' : '☆' }}</span>
            }
          </div>
        }

        <!-- Tags -->
        @case ('tags') {
          <div class="tags-input">
            <div class="tags-list">
              @for (tag of tagsArray(); track tag) {
                <span class="tag">
                  {{ tag }}
                  <button type="button" (click)="removeTag(tag)" [disabled]="disabled">×</button>
                </span>
              }
            </div>
            <input
              type="text"
              [placeholder]="lang === 'tr' ? 'Etiket ekle (Enter)' : 'Add tag (Enter)'"
              [disabled]="disabled"
              (keydown.enter)="addTag($event)"
            />
          </div>
        }

        <!-- Calculated -->
        @case ('calculated') {
          <div class="calculated-field">
            <input
              type="text"
              [value]="stringValue()"
              disabled
              class="calculated-value"
            />
            @if (formula) {
              <span class="formula-indicator" [title]="formula">fx</span>
            }
          </div>
        }

        <!-- Default -->
        @default {
          <input
            type="text"
            [value]="stringValue()"
            [placeholder]="placeholder"
            [disabled]="disabled"
            (input)="onInput($event)"
            (blur)="onBlur()"
          />
        }
      }

      <!-- Hint -->
      @if (hint && !error) {
        <span class="hint">{{ hint }}</span>
      }

      <!-- Error Message -->
      @if (error) {
        <span class="error-message">{{ error }}</span>
      }
    </div>
  `,
  styles: [`
    .field-renderer {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    input, select, textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border, #ddd);
      border-radius: 5px;
      background: var(--bg-tertiary, #f5f5f5);
      color: var(--text-primary, #333);
      font-size: 0.9rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--accent, #e94560);
      box-shadow: 0 0 0 2px rgba(233, 69, 96, 0.1);
    }

    input:disabled, select:disabled, textarea:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .has-error input, .has-error select, .has-error textarea {
      border-color: var(--error, #e74c3c);
    }

    .hint {
      font-size: 0.75rem;
      color: var(--text-secondary, #666);
    }

    .error-message {
      font-size: 0.8rem;
      color: var(--error, #e74c3c);
      font-weight: 500;
    }

    /* Money Input */
    .money-input, .percent-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .currency-symbol, .percent-symbol {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-secondary, #666);
    }

    .money-input input, .percent-input input {
      flex: 1;
    }

    /* Slider */
    .slider-input {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .slider-input input[type="range"] {
      flex: 1;
      padding: 0;
      height: 6px;
      cursor: pointer;
    }

    .slider-value {
      min-width: 60px;
      text-align: right;
      font-weight: 500;
    }

    /* Multiselect */
    .multiselect-preview {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .multiselect-option {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .multiselect-option input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    /* Rating */
    .rating-preview {
      font-size: 1.5rem;
      cursor: pointer;
    }

    .rating-preview .star {
      color: var(--text-secondary, #888);
      transition: color 0.2s;
    }

    .rating-preview .star.filled {
      color: var(--warning, #f39c12);
    }

    .rating-preview.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Tags */
    .tags-input {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tags-list .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--accent, #e94560);
      color: #fff;
      padding: 4px 8px;
      border-radius: 15px;
      font-size: 0.85rem;
    }

    .tags-list .tag button {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 1rem;
      padding: 0;
      line-height: 1;
    }

    /* JSON */
    .json-textarea {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.85rem;
    }

    /* Calculated */
    .calculated-field {
      position: relative;
    }

    .calculated-value {
      padding-right: 30px;
      font-weight: 500;
    }

    .formula-indicator {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.75rem;
      font-weight: bold;
      color: var(--accent, #e94560);
      cursor: help;
    }
  `]
})
export class FieldRendererComponent {
  @Input({ required: true }) field!: FormFieldDef;
  @Input() value: unknown = '';
  @Input() disabled = false;
  @Input() error?: string;
  @Input() lang: 'tr' | 'en' = 'tr';

  @Output() valueChange = new EventEmitter<unknown>();
  @Output() blur = new EventEmitter<void>();

  // Computed values
  stringValue = signal<string>('');
  numberValue = signal<number | null>(null);
  booleanValue = signal<boolean>(false);
  arrayValue = signal<string[]>([]);

  // Field config helpers
  get placeholder(): string {
    return (this.field.config['placeholder'] as string) || '';
  }

  get hint(): string {
    return (this.field.config['hint'] as string) || '';
  }

  get rows(): number {
    return (this.field.config['rows'] as number) || 4;
  }

  get min(): number | undefined {
    return this.field.config['min'] as number | undefined;
  }

  get max(): number | undefined {
    return this.field.config['max'] as number | undefined;
  }

  get step(): number | undefined {
    return this.field.config['step'] as number | undefined;
  }

  get options(): SelectOption[] {
    return (this.field.config['options'] as SelectOption[]) || [];
  }

  get accept(): string {
    return (this.field.config['accept'] as string) || '*';
  }

  get maxStars(): number {
    return (this.field.config['max'] as number) || 5;
  }

  get currencySymbol(): string {
    const currency = (this.field.config['currency'] as string) || 'TRY';
    return getCurrencySymbol(currency);
  }

  get showSliderValue(): boolean {
    return (this.field.config['showValue'] as boolean) !== false;
  }

  get sliderUnit(): string {
    return (this.field.config['unit'] as string) || '';
  }

  get formula(): string {
    return (this.field.config['formula'] as string) || '';
  }

  starsArray = computed(() => Array.from({ length: this.maxStars }, (_, i) => i));

  tagsArray = computed(() => {
    if (Array.isArray(this.value)) {
      return this.value as string[];
    }
    return [];
  });

  ngOnChanges(): void {
    this.updateInternalValues();
  }

  private updateInternalValues(): void {
    if (this.value === null || this.value === undefined) {
      this.stringValue.set('');
      this.numberValue.set(null);
      this.booleanValue.set(false);
      this.arrayValue.set([]);
      return;
    }

    this.stringValue.set(String(this.value));
    this.numberValue.set(typeof this.value === 'number' ? this.value : null);
    this.booleanValue.set(this.value === true);
    this.arrayValue.set(Array.isArray(this.value) ? this.value : []);
  }

  // Event handlers
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.valueChange.emit(value);
  }

  onNumberInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.valueChange.emit(value ? Number(value) : null);
  }

  onSlugInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.valueChange.emit(slugify(value));
  }

  onCheckboxChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.valueChange.emit(checked);
  }

  onBlur(): void {
    this.blur.emit();
  }

  isOptionSelected(optionValue: string): boolean {
    if (Array.isArray(this.value)) {
      return this.value.includes(optionValue);
    }
    return false;
  }

  onMultiselectChange(optionValue: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    let current = Array.isArray(this.value) ? [...this.value] : [];

    if (checked) {
      if (!current.includes(optionValue)) {
        current.push(optionValue);
      }
    } else {
      current = current.filter(v => v !== optionValue);
    }

    this.valueChange.emit(current);
  }

  onRatingClick(rating: number): void {
    this.valueChange.emit(rating);
  }

  onFileChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      this.valueChange.emit(files[0]);
    }
  }

  addTag(event: Event): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const tag = input.value.trim();

    if (tag) {
      const current = Array.isArray(this.value) ? [...this.value] : [];
      if (!current.includes(tag)) {
        current.push(tag);
        this.valueChange.emit(current);
      }
      input.value = '';
    }
  }

  removeTag(tag: string): void {
    if (Array.isArray(this.value)) {
      const newTags = this.value.filter(t => t !== tag);
      this.valueChange.emit(newTags);
    }
  }
}
