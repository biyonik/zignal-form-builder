import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  computed,
  signal,
  effect,
  untracked,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ZgFormRendererComponent,
  FormRendererConfig,
  FormSchema,
  FormState,
  FormDataType,
} from '@biyonik/zignal';
import { ZignalFormService } from '../../services/zignal-form.service';
import { FormBuilderService } from '../../services/form-builder.service';

/**
 * Zignal Preview Component
 * Form Builder'daki formu Zignal ile render eder
 */
@Component({
  selector: 'app-zignal-preview',
  standalone: true,
  imports: [CommonModule, ZgFormRendererComponent],
  template: `
    <div class="zignal-preview" [class]="'device-' + device()">
      @if (isReady()) {
        <div class="preview-form-wrapper">
          <zg-form-renderer
            [schema]="schema()!"
            [formState]="formState()!"
            [config]="rendererConfig()"
            (submitted)="onSubmit($event)"
            (resetted)="onReset()"
          />

          <!-- ✅ FIX: Custom submit/reset buttons with proper validation -->
          <div class="custom-form-actions">
            @if (builderService.settings().showReset) {
              <button
                type="button"
                class="zg-btn zg-btn--secondary"
                (click)="handleReset()">
                {{ builderService.settings().resetButtonText[lang()] }}
              </button>
            }
            <button
              type="button"
              class="zg-btn zg-btn--primary"
              [disabled]="isSubmitDisabled()"
              (click)="handleSubmit()">
              {{ builderService.settings().submitButtonText[lang()] }}
            </button>
          </div>
        </div>
      } @else {
        <div class="preview-placeholder">
          <span class="placeholder-icon">📋</span>
          <p>{{ lang() === 'tr' ? 'Alan ekleyerek başlayın' : 'Start by adding fields' }}</p>
        </div>
      }
    </div>

    @if (showValidationSummary() && hasErrors()) {
      <div class="validation-summary">
        <h4>{{ lang() === 'tr' ? 'Doğrulama Hataları' : 'Validation Errors' }}</h4>
        <ul>
          @for (error of errorList(); track error.field) {
            <li>
              <strong>{{ error.field }}:</strong> {{ error.message }}
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .zignal-preview {
      background: var(--bg-primary, #1a1a2e);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s ease;
    }

    /* Device Frames */
    .zignal-preview.device-mobile {
      max-width: 375px;
      margin: 0 auto;
      border: 8px solid var(--border, #333);
      border-radius: 32px;
      padding: 16px;
    }

    .zignal-preview.device-tablet {
      max-width: 768px;
      margin: 0 auto;
      border: 6px solid var(--border, #333);
      border-radius: 20px;
      padding: 20px;
    }

    .zignal-preview.device-desktop {
      max-width: 100%;
      border: 1px solid var(--border, #333);
      border-radius: 8px;
    }

    .preview-placeholder {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary, #888);
    }

    .placeholder-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .validation-summary {
      margin-top: 16px;
      padding: 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--error, #ef4444);
      border-radius: 8px;
    }

    .validation-summary h4 {
      margin: 0 0 12px 0;
      color: var(--error, #ef4444);
      font-size: 0.9rem;
    }

    .validation-summary ul {
      margin: 0;
      padding-left: 20px;
    }

    .validation-summary li {
      margin-bottom: 4px;
      font-size: 0.85rem;
      color: var(--text-primary, #fff);
    }

    .validation-summary strong {
      color: var(--error, #ef4444);
    }

    /* Override Zignal default styles for dark theme */
    :host ::ng-deep .zg-form {
      --zg-bg: var(--bg-secondary, #252538);
      --zg-text: var(--text-primary, #fff);
      --zg-border: var(--border, #333);
      --zg-primary: var(--accent, #6366f1);
      --zg-error: var(--error, #ef4444);
    }

    :host ::ng-deep .zg-form-field {
      margin-bottom: 16px;
    }

    :host ::ng-deep .zg-field-label {
      color: var(--text-primary, #fff);
      font-weight: 500;
      margin-bottom: 6px;
      display: block;
    }

    :host ::ng-deep .zg-field-input,
    :host ::ng-deep .zg-field-select,
    :host ::ng-deep .zg-field-textarea {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-tertiary, #1e1e32);
      border: 1px solid var(--border, #333);
      border-radius: 6px;
      color: var(--text-primary, #fff);
      font-size: 0.95rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    :host ::ng-deep .zg-field-input:focus,
    :host ::ng-deep .zg-field-select:focus,
    :host ::ng-deep .zg-field-textarea:focus {
      outline: none;
      border-color: var(--accent, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    :host ::ng-deep .zg-field-input.has-error,
    :host ::ng-deep .zg-field-select.has-error,
    :host ::ng-deep .zg-field-textarea.has-error {
      border-color: var(--error, #ef4444);
    }

    :host ::ng-deep .zg-field-error {
      color: var(--error, #ef4444);
      font-size: 0.8rem;
      margin-top: 4px;
    }

    :host ::ng-deep .zg-btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    :host ::ng-deep .zg-btn--primary {
      background: var(--accent, #6366f1);
      color: #fff;
      border: none;
    }

    :host ::ng-deep .zg-btn--primary:hover:not(:disabled) {
      background: var(--accent-hover, #4f46e5);
      transform: translateY(-1px);
    }

    :host ::ng-deep .zg-btn--secondary {
      background: var(--bg-tertiary, #1e1e32);
      color: var(--text-primary, #fff);
      border: 1px solid var(--border, #333);
    }

    :host ::ng-deep .zg-btn--secondary:hover:not(:disabled) {
      background: var(--bg-secondary, #252538);
    }

    :host ::ng-deep .zg-form-actions {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border, #333);
    }

    /* Group styles */
    :host ::ng-deep .zg-group {
      background: var(--bg-secondary, #252538);
      border: 1px solid var(--border, #333);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    :host ::ng-deep .zg-group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border, #333);
    }

    :host ::ng-deep .zg-group-title {
      font-weight: 600;
      color: var(--text-primary, #fff);
    }

    /* Array/Repeatable styles */
    :host ::ng-deep .zg-array-item {
      background: var(--bg-tertiary, #1e1e32);
      border: 1px solid var(--border, #333);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
    }

    :host ::ng-deep .zg-array-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    /* Custom form actions */
    .custom-form-actions {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border, #333);
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .preview-form-wrapper {
      position: relative;
    }

    /* Hide Zignal's default submit/reset buttons */
    :host ::ng-deep .zg-form-actions {
      display: none !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZignalPreviewComponent implements OnInit, OnDestroy {
  private zignalService = inject(ZignalFormService);
  // ✅ FIX: Made public to access in template
  public builderService = inject(FormBuilderService);

  // Inputs
  readonly device = input<'mobile' | 'tablet' | 'desktop'>('desktop');
  readonly showValidationSummary = input(true);
  readonly enablePersistence = input(false);
  readonly persistenceKey = input('form-preview');

  // Outputs
  readonly submitted = output<Record<string, unknown>>();
  readonly valueChange = output<Record<string, unknown>>();

  // State
  private initialized = signal(false);

  // Computed
  readonly lang = computed(() => this.builderService.language());

  readonly schema = computed(() => this.zignalService.schema());
  readonly formState = computed(() => this.zignalService.formState());

  readonly isReady = computed(() =>
    this.initialized() &&
    this.zignalService.isReady() &&
    this.builderService.fields().length > 0
  );

  readonly hasErrors = computed(() => {
    const errors = this.zignalService.errors();
    return Object.values(errors).some(e => e !== null);
  });

  readonly errorList = computed(() => {
    const errors = this.zignalService.errors();
    return Object.entries(errors)
      .filter(([, error]) => error !== null)
      .map(([field, message]) => ({
        field: this.getFieldLabel(field),
        message: message!,
      }));
  });

  // ✅ FIX: Hide Zignal's default buttons - we use custom buttons with proper validation
  readonly rendererConfig = computed<FormRendererConfig>(() => {
    const settings = this.builderService.settings();

    return {
      layout: settings.layout,
      columns: settings.layout === 'grid' ? 2 : 1,
      showSubmitButton: false,  // ✅ Hide - using custom button
      showResetButton: false,   // ✅ Hide - using custom button
      submitDisabledWhenInvalid: true,
    };
  });

  // ✅ FIX: Compute submit button disabled state with proper validation
  readonly isSubmitDisabled = computed(() => {
    const formState = this.formState();
    if (!formState) return true;

    // Check if form is valid
    // This is reactive and updates when fields change
    return !formState.valid();
  });

  // Effects
  private fieldsChangeEffect = effect(() => {
    // Watch for field changes and rebuild schema
    const fields = this.builderService.fields();
    const groups = this.builderService.groups();

    if (this.initialized() && fields.length > 0) {
      this.rebuildForm();
    }
  }, { allowSignalWrites: true });

  // ✅ VALIDATION FIX: Trigger validation whenever form values change
  private validationEffect = effect(async (onCleanup) => {
    const formState = this.formState();

    if (formState && this.initialized()) {
      // Track value changes
      const values = formState.values();

      // Trigger validation on every change
      // This ensures submit button is always in correct state
      // Using setTimeout to avoid synchronous signal updates during effect
      const timeoutId = setTimeout(() => {
        this.zignalService.validateAll().catch(err => {
          console.warn('Validation error:', err);
        });
      }, 0);

      onCleanup(() => clearTimeout(timeoutId));
    }
  }, { allowSignalWrites: true });

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnDestroy(): void {
    if (this.enablePersistence()) {
      this.zignalService.disablePersistence();
    }
  }

  private initializeForm(): void {
    // Create initial form state
    this.zignalService.createFormState();

    // Enable persistence if requested
    if (this.enablePersistence()) {
      this.zignalService.enablePersistence(this.persistenceKey());
    }

    this.initialized.set(true);

    // ✅ FIX: Run initial validation to set proper form state
    // This ensures submit button is disabled if fields are required but empty
    setTimeout(() => {
      if (this.builderService.fields().length > 0) {
        this.zignalService.validateAll().catch(err => {
          console.warn('Initial validation error:', err);
        });
      }
    }, 0);
  }

  private rebuildForm(): void {
    const currentValues = this.zignalService.getValues();
    this.zignalService.createFormState(currentValues);

    // ✅ FIX: Re-validate after rebuilding to ensure correct form state
    setTimeout(() => {
      this.zignalService.validateAll().catch(err => {
        console.warn('Rebuild validation error:', err);
      });
    }, 0);
  }

  private getFieldLabel(fieldName: string): string {
    const field = this.builderService.fields().find(f => f.name === fieldName);
    return field?.label || fieldName;
  }

  // ✅ FIX: Custom submit handler with touchAll() + validation
  async handleSubmit(): Promise<void> {
    const formState = this.formState();
    if (!formState) return;

    // 1. Mark ALL fields as touched (forces validation on untouched fields)
    this.zignalService.touchAll();

    // 2. Wait a tick for signals to update
    await new Promise(resolve => setTimeout(resolve, 0));

    // 3. Run full validation including cross-field
    const isValid = await this.zignalService.validateAll();

    // 4. Only submit if valid
    if (isValid) {
      const values = formState.getValues();
      this.submitted.emit(values);
    } else {
      // Show validation errors
      console.warn('Form validation failed. Cannot submit.');
    }
  }

  // ✅ FIX: Custom reset handler
  handleReset(): void {
    this.zignalService.reset();
  }

  async onSubmit(values: Record<string, unknown>): Promise<void> {
    // This shouldn't be called anymore since Zignal's buttons are hidden
    // But keep it just in case
    await this.handleSubmit();
  }

  onReset(): void {
    this.handleReset();
  }

  // Public methods for parent component
  getValues(): Record<string, unknown> {
    return this.zignalService.getValues();
  }

  async validate(): Promise<boolean> {
    return this.zignalService.validateAll();
  }

  reset(): void {
    this.zignalService.reset();
  }
}
