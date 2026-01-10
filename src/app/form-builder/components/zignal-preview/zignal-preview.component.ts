import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  computed,
  signal,
  effect,
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
        <zg-form-renderer
          [schema]="schema()!"
          [formState]="formState()!"
          [config]="rendererConfig()"
          (submitted)="onSubmit($event)"
          (resetted)="onReset()"
        />
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZignalPreviewComponent implements OnInit, OnDestroy {
  private zignalService = inject(ZignalFormService);
  private builderService = inject(FormBuilderService);

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

  // ✅ TYPE FIX: FormSettings layout now matches FormRendererConfig
  readonly rendererConfig = computed<FormRendererConfig>(() => {
    const settings = this.builderService.settings();
    const lang = this.lang();

    return {
      layout: settings.layout,  // Direct mapping - types now match!
      columns: settings.layout === 'grid' ? 2 : 1,  // Use 2 columns for grid layout
      showSubmitButton: true,
      showResetButton: settings.showReset,
      submitText: settings.submitButtonText[lang],
      resetText: settings.resetButtonText[lang],
      submitDisabledWhenInvalid: true,
    };
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
  }

  private rebuildForm(): void {
    const currentValues = this.zignalService.getValues();
    this.zignalService.createFormState(currentValues);
  }

  private getFieldLabel(fieldName: string): string {
    const field = this.builderService.fields().find(f => f.name === fieldName);
    return field?.label || fieldName;
  }

  async onSubmit(values: Record<string, unknown>): Promise<void> {
    // Run full validation including cross-field
    const isValid = await this.zignalService.validateAll();

    if (isValid) {
      this.submitted.emit(values);
    }
  }

  onReset(): void {
    this.zignalService.reset();
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
