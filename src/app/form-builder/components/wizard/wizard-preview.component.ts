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
import { FormFieldDef, FormSettings } from '../../models/form-builder.types';
import { WizardConfig, WizardStep } from '../../models/wizard.types';
import { FieldRendererComponent } from '../field-renderers/field-renderer.component';
import { ValidationService } from '../../services/validation.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-wizard-preview',
  standalone: true,
  imports: [CommonModule, FieldRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wizard-preview">
      <!-- Progress Bar -->
      @if (config.showProgress) {
        <div class="wizard-progress">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressPercent()"></div>
          </div>
          <div class="progress-text">
            {{ currentStep() + 1 }} / {{ config.steps.length }}
          </div>
        </div>
      }

      <!-- Step Indicators -->
      <div class="step-indicators">
        @for (step of config.steps; track step.id; let i = $index) {
          <div
            class="step-indicator"
            [class.active]="i === currentStep()"
            [class.completed]="completedSteps().includes(i)"
            [class.clickable]="canNavigateToStep(i)"
            (click)="navigateToStep(i)"
          >
            @if (config.showStepNumbers) {
              <span class="step-number">
                @if (completedSteps().includes(i)) {
                  ✓
                } @else {
                  {{ i + 1 }}
                }
              </span>
            }
            <span class="step-title">{{ getStepTitle(step) }}</span>
          </div>
          @if (i < config.steps.length - 1) {
            <div class="step-connector" [class.completed]="completedSteps().includes(i)"></div>
          }
        }
      </div>

      <!-- Current Step Content -->
      @if (currentStepData()) {
        <div class="step-content">
          <div class="step-header">
            <h3>{{ getStepTitle(currentStepData()!) }}</h3>
            @if (currentStepData()!.description) {
              <p class="step-description">{{ getStepDescription(currentStepData()!) }}</p>
            }
          </div>

          <div class="step-fields">
            @for (field of currentStepFields(); track field.id) {
              <div class="wizard-field" [class.has-error]="errors()[field.name]">
                <label>
                  {{ field.label }}
                  @if (field.config['required']) {
                    <span class="required-star">*</span>
                  }
                </label>

                <app-field-renderer
                  [field]="field"
                  [value]="values()[field.name]"
                  [disabled]="false"
                  [error]="errors()[field.name]"
                  [lang]="i18n.lang()"
                  (valueChange)="onValueChange(field.name, $event)"
                  (blur)="onFieldBlur(field.name)"
                />
              </div>
            }
          </div>

          <!-- Step Navigation -->
          <div class="step-navigation">
            <button
              class="btn-prev"
              [disabled]="currentStep() === 0"
              (click)="previousStep()"
            >
              {{ config.navigation.prevText[i18n.lang()] }}
            </button>

            @if (currentStep() < config.steps.length - 1) {
              <button class="btn-next" (click)="nextStep()">
                {{ config.navigation.nextText[i18n.lang()] }}
              </button>
            } @else {
              <button class="btn-finish" (click)="finish()">
                {{ config.navigation.finishText[i18n.lang()] }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Completion Message -->
      @if (isCompleted()) {
        <div class="completion-message">
          <div class="completion-icon">🎉</div>
          <h3>{{ config.completionMessage?.[i18n.lang()] }}</h3>
          <button class="btn-restart" (click)="restart()">
            {{ i18n.lang() === 'tr' ? 'Yeniden Baslat' : 'Start Over' }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .wizard-preview {
      padding: 20px;
      max-width: 700px;
      margin: 0 auto;
    }

    /* Progress Bar */
    .wizard-progress {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background: var(--bg-tertiary, #e0e0e0);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary, #666);
    }

    /* Step Indicators */
    .step-indicators {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }

    .step-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 10px 15px;
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    .step-indicator.active {
      opacity: 1;
    }

    .step-indicator.completed {
      opacity: 0.8;
    }

    .step-indicator.clickable {
      cursor: pointer;
    }

    .step-indicator.clickable:hover {
      opacity: 1;
    }

    .step-number {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      background: var(--bg-tertiary, #e0e0e0);
      color: var(--text-secondary, #666);
      transition: all 0.2s;
    }

    .step-indicator.active .step-number {
      background: var(--accent, #e94560);
      color: #fff;
      transform: scale(1.1);
    }

    .step-indicator.completed .step-number {
      background: #4CAF50;
      color: #fff;
    }

    .step-title {
      font-size: 0.8rem;
      font-weight: 500;
      text-align: center;
      max-width: 100px;
    }

    .step-connector {
      width: 40px;
      height: 2px;
      background: var(--bg-tertiary, #e0e0e0);
      margin: 0 -5px;
      margin-bottom: 30px;
    }

    .step-connector.completed {
      background: #4CAF50;
    }

    /* Step Content */
    .step-content {
      background: var(--bg-secondary, #fff);
      border: 1px solid var(--border, #ddd);
      border-radius: 12px;
      padding: 25px;
    }

    .step-header {
      text-align: center;
      margin-bottom: 25px;
    }

    .step-header h3 {
      margin: 0 0 10px;
      font-size: 1.3rem;
      color: var(--accent, #e94560);
    }

    .step-description {
      margin: 0;
      color: var(--text-secondary, #666);
      font-size: 0.95rem;
    }

    .step-fields {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .wizard-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .wizard-field label {
      font-weight: 500;
      font-size: 0.95rem;
    }

    .required-star {
      color: var(--error, #e74c3c);
    }

    .wizard-field.has-error {
      animation: shake 0.3s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    /* Navigation */
    .step-navigation {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid var(--border, #ddd);
    }

    .btn-prev, .btn-next, .btn-finish {
      padding: 12px 30px;
      border-radius: 6px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-prev {
      background: var(--bg-tertiary, #e0e0e0);
      border: none;
      color: var(--text-primary, #333);
    }

    .btn-prev:hover:not(:disabled) {
      background: var(--bg-secondary, #d0d0d0);
    }

    .btn-prev:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-next {
      background: var(--accent, #e94560);
      border: none;
      color: #fff;
    }

    .btn-next:hover {
      background: var(--accent-hover, #ff6b6b);
    }

    .btn-finish {
      background: linear-gradient(135deg, #4CAF50, #8BC34A);
      border: none;
      color: #fff;
    }

    .btn-finish:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
    }

    /* Completion */
    .completion-message {
      text-align: center;
      padding: 50px 20px;
    }

    .completion-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    .completion-message h3 {
      margin: 0 0 25px;
      font-size: 1.5rem;
      color: #4CAF50;
    }

    .btn-restart {
      background: var(--bg-tertiary, #e0e0e0);
      border: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-size: 0.95rem;
      cursor: pointer;
    }

    .btn-restart:hover {
      background: var(--bg-secondary, #d0d0d0);
    }
  `]
})
export class WizardPreviewComponent {
  readonly i18n = inject(I18nService);
  private readonly validation = inject(ValidationService);

  @Input() fields: FormFieldDef[] = [];
  @Input() config!: WizardConfig;
  @Input() settings!: FormSettings;

  @Output() complete = new EventEmitter<Record<string, unknown>>();

  readonly values = signal<Record<string, unknown>>({});
  readonly errors = signal<Record<string, string>>({});
  readonly currentStep = signal(0);
  readonly completedSteps = signal<number[]>([]);
  readonly isCompleted = signal(false);

  readonly progressPercent = computed(() => {
    const completed = this.completedSteps().length;
    const total = this.config?.steps?.length || 1;
    return (completed / total) * 100;
  });

  readonly currentStepData = computed(() => {
    return this.config?.steps?.[this.currentStep()];
  });

  readonly currentStepFields = computed(() => {
    const step = this.currentStepData();
    if (!step) return [];
    return this.fields.filter(f => step.fields.includes(f.name));
  });

  getStepTitle(step: WizardStep): string {
    return step.title[this.i18n.lang()];
  }

  getStepDescription(step: WizardStep): string {
    return step.description?.[this.i18n.lang()] || '';
  }

  onValueChange(fieldName: string, value: unknown): void {
    this.values.update(v => ({ ...v, [fieldName]: value }));
    this.errors.update(e => ({ ...e, [fieldName]: '' }));
  }

  onFieldBlur(fieldName: string): void {
    const field = this.fields.find(f => f.name === fieldName);
    if (!field) return;

    const result = this.validation.validateField(field, this.values()[fieldName]);
    if (!result.valid && result.error) {
      this.errors.update(e => ({ ...e, [fieldName]: result.error! }));
    }
  }

  validateCurrentStep(): boolean {
    const stepFields = this.currentStepFields();
    const stepErrors = this.validation.validateFields(stepFields, this.values());

    if (Object.keys(stepErrors).length > 0) {
      this.errors.update(e => ({ ...e, ...stepErrors }));
      return false;
    }
    return true;
  }

  canNavigateToStep(stepIndex: number): boolean {
    if (this.config.allowSkip) return true;
    if (stepIndex <= this.currentStep()) return true;
    return this.completedSteps().includes(stepIndex - 1);
  }

  navigateToStep(stepIndex: number): void {
    if (this.canNavigateToStep(stepIndex)) {
      this.currentStep.set(stepIndex);
    }
  }

  nextStep(): void {
    if (this.config.steps[this.currentStep()].validation !== 'none') {
      if (!this.validateCurrentStep()) return;
    }

    const current = this.currentStep();
    if (!this.completedSteps().includes(current)) {
      this.completedSteps.update(s => [...s, current]);
    }

    if (current < this.config.steps.length - 1) {
      this.currentStep.set(current + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
    }
  }

  finish(): void {
    if (!this.validateCurrentStep()) return;

    const current = this.currentStep();
    if (!this.completedSteps().includes(current)) {
      this.completedSteps.update(s => [...s, current]);
    }

    this.isCompleted.set(true);
    this.complete.emit(this.values());
  }

  restart(): void {
    this.values.set({});
    this.errors.set({});
    this.currentStep.set(0);
    this.completedSteps.set([]);
    this.isCompleted.set(false);
  }
}
