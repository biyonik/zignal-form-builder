import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormFieldDef, FieldGroup } from '../../models/form-builder.types';
import {
  RepeatableGroupConfig,
  RepeatableGroupInstance,
  generateRepeatableId,
  DEFAULT_REPEATABLE_CONFIG
} from '../../models/repeatable.types';
import { FieldRendererComponent } from '../field-renderers/field-renderer.component';
import { ValidationService } from '../../services/validation.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-repeatable-group',
  standalone: true,
  imports: [CommonModule, FieldRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="repeatable-group">
      <div class="group-header" [style.borderColor]="getGroupColor()">
        <div class="group-title">
          <span class="group-icon" [style.background]="getGroupColor()">
            {{ getGroupIcon() }}
          </span>
          <h4>{{ getGroupName() }}</h4>
          <span class="instance-count">
            ({{ instances().length }} / {{ config.maxItems }})
          </span>
        </div>

        <button
          class="btn-add-item"
          [disabled]="instances().length >= config.maxItems"
          (click)="addInstance()"
        >
          {{ config.addButtonText[i18n.lang()] }}
        </button>
      </div>

      <div class="instances-list">
        @for (instance of instances(); track instance.id; let i = $index) {
          <div class="instance-card" [class.collapsed]="instance.collapsed">
            <div class="instance-header" (click)="toggleInstance(instance.id)">
              <span class="instance-title">
                {{ config.itemLabel?.[i18n.lang()] || 'Item' }} #{{ i + 1 }}
              </span>
              <div class="instance-actions">
                @if (instances().length > config.minItems) {
                  <button
                    class="btn-remove"
                    (click)="removeInstance(instance.id); $event.stopPropagation()"
                    [title]="config.removeButtonText[i18n.lang()]"
                  >
                    🗑️
                  </button>
                }
                <span class="collapse-icon">{{ instance.collapsed ? '▶' : '▼' }}</span>
              </div>
            </div>

            @if (!instance.collapsed) {
              <div class="instance-content">
                @for (field of fields; track field.id) {
                  <div class="repeatable-field" [class.has-error]="instance.errors[field.name]">
                    <label>
                      {{ field.label }}
                      @if (field.config['required']) {
                        <span class="required-star">*</span>
                      }
                    </label>

                    <app-field-renderer
                      [field]="field"
                      [value]="instance.values[field.name]"
                      [disabled]="false"
                      [error]="instance.errors[field.name]"
                      [lang]="i18n.lang()"
                      (valueChange)="onValueChange(instance.id, field.name, $event)"
                      (blur)="onFieldBlur(instance.id, field.name)"
                    />
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      @if (instances().length === 0) {
        <div class="no-instances">
          <p>{{ i18n.lang() === 'tr' ? 'Henuz oge eklenmedi' : 'No items added yet' }}</p>
          <button class="btn-add-first" (click)="addInstance()">
            {{ config.addButtonText[i18n.lang()] }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .repeatable-group {
      border: 2px solid var(--border, #ddd);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 20px;
    }

    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      background: var(--bg-tertiary, #f5f5f5);
      border-bottom: 2px solid;
    }

    .group-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .group-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }

    .group-title h4 {
      margin: 0;
      font-size: 1.1rem;
    }

    .instance-count {
      font-size: 0.85rem;
      color: var(--text-secondary, #666);
    }

    .btn-add-item {
      background: var(--accent, #e94560);
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .btn-add-item:hover:not(:disabled) {
      background: var(--accent-hover, #ff6b6b);
    }

    .btn-add-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .instances-list {
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .instance-card {
      border: 1px solid var(--border, #ddd);
      border-radius: 8px;
      overflow: hidden;
      background: var(--bg-secondary, #fff);
    }

    .instance-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 15px;
      background: var(--bg-tertiary, #f5f5f5);
      cursor: pointer;
      user-select: none;
    }

    .instance-header:hover {
      background: var(--bg-secondary, #eee);
    }

    .instance-title {
      font-weight: 500;
    }

    .instance-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-remove {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 4px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .btn-remove:hover {
      opacity: 1;
    }

    .collapse-icon {
      font-size: 0.8rem;
      color: var(--text-secondary, #888);
    }

    .instance-content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .repeatable-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .repeatable-field label {
      font-weight: 500;
      font-size: 0.9rem;
    }

    .required-star {
      color: var(--error, #e74c3c);
    }

    .repeatable-field.has-error {
      animation: shake 0.3s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .no-instances {
      text-align: center;
      padding: 30px;
      color: var(--text-secondary, #666);
    }

    .btn-add-first {
      margin-top: 15px;
      background: var(--accent, #e94560);
      color: #fff;
      border: none;
      padding: 10px 24px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.95rem;
    }

    .btn-add-first:hover {
      background: var(--accent-hover, #ff6b6b);
    }
  `]
})
export class RepeatableGroupComponent {
  readonly i18n = inject(I18nService);
  private readonly validation = inject(ValidationService);

  @Input() fields: FormFieldDef[] = [];
  @Input() group!: FieldGroup;
  @Input() config: RepeatableGroupConfig = DEFAULT_REPEATABLE_CONFIG;

  @Output() valuesChange = new EventEmitter<Record<string, unknown>[]>();

  readonly instances = signal<RepeatableGroupInstance[]>([]);

  ngOnInit(): void {
    // Initialize with default item count
    for (let i = 0; i < this.config.defaultItemCount; i++) {
      this.addInstance();
    }
  }

  // ✅ TYPE FIX: Now works correctly with updated FieldGroup type
  getGroupName(): string {
    if (typeof this.group.name === 'object') {
      return this.group.name[this.i18n.lang()];
    }
    // If label is also bilingual, handle it
    if (typeof this.group.label === 'object') {
      return this.group.label[this.i18n.lang()];
    }
    return this.group.label || this.group.name || this.group.id;
  }

  getGroupColor(): string {
    return (this.group as any).color || '#e94560';
  }

  getGroupIcon(): string {
    return (this.group as any).icon || '📋';
  }

  addInstance(): void {
    if (this.instances().length >= this.config.maxItems) return;

    const newInstance: RepeatableGroupInstance = {
      id: generateRepeatableId(),
      index: this.instances().length,
      values: {},
      errors: {},
      collapsed: false
    };

    this.instances.update(i => [...i, newInstance]);
    this.emitValues();
  }

  removeInstance(instanceId: string): void {
    if (this.instances().length <= this.config.minItems) return;

    if (this.config.confirmDelete) {
      const msg = this.i18n.lang() === 'tr'
        ? 'Bu ogeyi silmek istediginizden emin misiniz?'
        : 'Are you sure you want to remove this item?';
      if (!confirm(msg)) return;
    }

    this.instances.update(instances => {
      const filtered = instances.filter(i => i.id !== instanceId);
      // Re-index
      return filtered.map((inst, idx) => ({ ...inst, index: idx }));
    });
    this.emitValues();
  }

  toggleInstance(instanceId: string): void {
    this.instances.update(instances =>
      instances.map(i =>
        i.id === instanceId ? { ...i, collapsed: !i.collapsed } : i
      )
    );
  }

  onValueChange(instanceId: string, fieldName: string, value: unknown): void {
    this.instances.update(instances =>
      instances.map(i => {
        if (i.id === instanceId) {
          return {
            ...i,
            values: { ...i.values, [fieldName]: value },
            errors: { ...i.errors, [fieldName]: '' }
          };
        }
        return i;
      })
    );
    this.emitValues();
  }

  onFieldBlur(instanceId: string, fieldName: string): void {
    const instance = this.instances().find(i => i.id === instanceId);
    const field = this.fields.find(f => f.name === fieldName);
    if (!instance || !field) return;

    const result = this.validation.validateField(field, instance.values[fieldName]);
    if (!result.valid && result.error) {
      this.instances.update(instances =>
        instances.map(i => {
          if (i.id === instanceId) {
            return { ...i, errors: { ...i.errors, [fieldName]: result.error! } };
          }
          return i;
        })
      );
    }
  }

  validateAll(): boolean {
    let allValid = true;

    this.instances.update(instances =>
      instances.map(instance => {
        const errors: Record<string, string> = {};

        this.fields.forEach(field => {
          const result = this.validation.validateField(field, instance.values[field.name]);
          if (!result.valid && result.error) {
            errors[field.name] = result.error;
            allValid = false;
          }
        });

        return { ...instance, errors };
      })
    );

    return allValid;
  }

  getAllValues(): Record<string, unknown>[] {
    return this.instances().map(i => i.values);
  }

  private emitValues(): void {
    this.valuesChange.emit(this.getAllValues());
  }
}
