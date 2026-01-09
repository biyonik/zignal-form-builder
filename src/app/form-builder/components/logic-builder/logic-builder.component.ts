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
import { FormsModule } from '@angular/forms';
import { FormFieldDef, ConditionalRule } from '../../models/form-builder.types';
import { I18nService } from '../../services/i18n.service';

export type ConditionType = 'showWhen' | 'hideWhen' | 'disableWhen';

export interface LogicRule {
  id: string;
  type: ConditionType;
  targetField: string;
  condition: ConditionalRule;
}

@Component({
  selector: 'app-logic-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="logic-builder">
      <div class="logic-header">
        <h3>{{ i18n.t('conditionalLogic') }}</h3>
        <button class="btn-add" (click)="addRule()">
          + {{ i18n.t('add') }}
        </button>
      </div>

      @if (rules().length === 0) {
        <div class="no-rules">
          <p>{{ i18n.lang() === 'tr' ? 'Henuz kural eklenmedi' : 'No rules added yet' }}</p>
          <p class="hint">
            {{ i18n.lang() === 'tr'
              ? 'Kosullu mantik ile alanlari dinamik olarak gosterebilir, gizleyebilir veya devre disi birakabilirsiniz.'
              : 'Use conditional logic to dynamically show, hide, or disable fields.' }}
          </p>
        </div>
      } @else {
        <div class="rules-list">
          @for (rule of rules(); track rule.id; let i = $index) {
            <div class="rule-card" [class.expanded]="expandedRule() === rule.id">
              <div class="rule-header" (click)="toggleRule(rule.id)">
                <div class="rule-summary">
                  <span class="rule-type" [class]="rule.type">
                    {{ getTypeLabel(rule.type) }}
                  </span>
                  <span class="rule-target">{{ getFieldLabel(rule.targetField) }}</span>
                  <span class="rule-condition">
                    {{ i18n.lang() === 'tr' ? 'eger' : 'when' }}
                    <strong>{{ getFieldLabel(rule.condition.field) }}</strong>
                    {{ getOperatorLabel(rule.condition.operator) }}
                    @if (rule.condition.value !== undefined) {
                      <strong>"{{ rule.condition.value }}"</strong>
                    }
                  </span>
                </div>
                <div class="rule-actions">
                  <button class="btn-icon" (click)="deleteRule(rule.id); $event.stopPropagation()" title="Sil">
                    🗑️
                  </button>
                  <span class="expand-icon">{{ expandedRule() === rule.id ? '▼' : '▶' }}</span>
                </div>
              </div>

              @if (expandedRule() === rule.id) {
                <div class="rule-body">
                  <div class="rule-row">
                    <label>{{ i18n.lang() === 'tr' ? 'Islem' : 'Action' }}</label>
                    <select [(ngModel)]="rule.type" (ngModelChange)="updateRule(rule)">
                      <option value="showWhen">{{ i18n.t('showWhen') }}</option>
                      <option value="hideWhen">{{ i18n.t('hideWhen') }}</option>
                      <option value="disableWhen">{{ i18n.t('disableWhen') }}</option>
                    </select>
                  </div>

                  <div class="rule-row">
                    <label>{{ i18n.lang() === 'tr' ? 'Hedef Alan' : 'Target Field' }}</label>
                    <select [(ngModel)]="rule.targetField" (ngModelChange)="updateRule(rule)">
                      @for (field of fields; track field.id) {
                        <option [value]="field.name">{{ field.label }}</option>
                      }
                    </select>
                  </div>

                  <div class="condition-section">
                    <label>{{ i18n.lang() === 'tr' ? 'Kosul' : 'Condition' }}</label>

                    <div class="condition-row">
                      <select [(ngModel)]="rule.condition.field" (ngModelChange)="updateRule(rule)">
                        <option value="">{{ i18n.lang() === 'tr' ? 'Alan Sec' : 'Select Field' }}</option>
                        @for (field of getAvailableFields(rule.targetField); track field.id) {
                          <option [value]="field.name">{{ field.label }}</option>
                        }
                      </select>

                      <select [(ngModel)]="rule.condition.operator" (ngModelChange)="updateRule(rule)">
                        <option value="equals">{{ i18n.t('equals') }}</option>
                        <option value="notEquals">{{ i18n.t('notEquals') }}</option>
                        <option value="contains">{{ i18n.t('contains') }}</option>
                        <option value="greaterThan">{{ i18n.t('greaterThan') }}</option>
                        <option value="lessThan">{{ i18n.t('lessThan') }}</option>
                        <option value="isEmpty">{{ i18n.t('isEmpty') }}</option>
                        <option value="isNotEmpty">{{ i18n.t('isNotEmpty') }}</option>
                      </select>

                      @if (!isUnaryOperator(rule.condition.operator)) {
                        <input
                          type="text"
                          [(ngModel)]="rule.condition.value"
                          (ngModelChange)="updateRule(rule)"
                          [placeholder]="i18n.lang() === 'tr' ? 'Deger' : 'Value'"
                        />
                      }
                    </div>
                  </div>

                  <!-- Visual Preview -->
                  <div class="rule-preview">
                    <div class="preview-label">{{ i18n.lang() === 'tr' ? 'Onizleme' : 'Preview' }}</div>
                    <div class="preview-text">
                      <span class="action-badge" [class]="rule.type">
                        {{ getTypeLabel(rule.type) }}
                      </span>
                      "{{ getFieldLabel(rule.targetField) }}"
                      {{ i18n.lang() === 'tr' ? 'alani' : 'field' }}
                      <span class="when-text">
                        {{ i18n.lang() === 'tr' ? 'eger' : 'when' }}
                      </span>
                      "{{ getFieldLabel(rule.condition.field) }}"
                      {{ getOperatorLabel(rule.condition.operator) }}
                      @if (rule.condition.value !== undefined && !isUnaryOperator(rule.condition.operator)) {
                        <span class="value-badge">"{{ rule.condition.value }}"</span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Visualization Graph -->
      @if (rules().length > 0) {
        <div class="logic-graph">
          <h4>{{ i18n.lang() === 'tr' ? 'Bagimliilik Grafigi' : 'Dependency Graph' }}</h4>
          <div class="graph-container">
            @for (field of fields; track field.id) {
              <div class="graph-node" [class.has-rules]="hasRules(field.name)">
                <span class="node-label">{{ field.label }}</span>
                @if (getDependencies(field.name).length > 0) {
                  <div class="node-deps">
                    @for (dep of getDependencies(field.name); track dep) {
                      <span class="dep-badge" [class]="dep.type">
                        ← {{ getFieldLabel(dep.sourceField) }}
                      </span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .logic-builder {
      padding: 15px;
    }

    .logic-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .logic-header h3 {
      margin: 0;
      font-size: 1.1rem;
    }

    .btn-add {
      background: var(--accent, #e94560);
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .btn-add:hover {
      background: var(--accent-hover, #ff6b6b);
    }

    .no-rules {
      text-align: center;
      padding: 30px;
      color: var(--text-secondary, #666);
    }

    .no-rules .hint {
      font-size: 0.85rem;
      margin-top: 10px;
    }

    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .rule-card {
      border: 1px solid var(--border, #ddd);
      border-radius: 8px;
      overflow: hidden;
      background: var(--bg-secondary, #fff);
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 15px;
      cursor: pointer;
      background: var(--bg-tertiary, #f5f5f5);
    }

    .rule-header:hover {
      background: var(--bg-secondary, #eee);
    }

    .rule-summary {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .rule-type {
      font-size: 0.75rem;
      padding: 3px 8px;
      border-radius: 3px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .rule-type.showWhen { background: #4CAF50; color: #fff; }
    .rule-type.hideWhen { background: #f44336; color: #fff; }
    .rule-type.disableWhen { background: #ff9800; color: #fff; }

    .rule-target {
      font-weight: 500;
    }

    .rule-condition {
      font-size: 0.85rem;
      color: var(--text-secondary, #666);
    }

    .rule-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 4px;
    }

    .expand-icon {
      font-size: 0.8rem;
      color: var(--text-secondary, #888);
    }

    .rule-body {
      padding: 15px;
      border-top: 1px solid var(--border, #ddd);
    }

    .rule-row {
      margin-bottom: 12px;
    }

    .rule-row label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 5px;
      color: var(--text-secondary, #666);
    }

    .rule-row select, .rule-row input {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--border, #ddd);
      border-radius: 4px;
      font-size: 0.9rem;
      background: var(--bg-tertiary, #f5f5f5);
      color: var(--text-primary, #333);
    }

    .condition-section {
      background: var(--bg-tertiary, #f5f5f5);
      padding: 12px;
      border-radius: 6px;
      margin-top: 10px;
    }

    .condition-section > label {
      display: block;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .condition-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }

    .rule-preview {
      margin-top: 15px;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 6px;
      color: #fff;
    }

    .preview-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      opacity: 0.8;
      margin-bottom: 8px;
    }

    .preview-text {
      font-size: 0.9rem;
      line-height: 1.6;
    }

    .action-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .action-badge.showWhen { background: rgba(76, 175, 80, 0.8); }
    .action-badge.hideWhen { background: rgba(244, 67, 54, 0.8); }
    .action-badge.disableWhen { background: rgba(255, 152, 0, 0.8); }

    .when-text {
      opacity: 0.8;
      margin: 0 4px;
    }

    .value-badge {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 6px;
      border-radius: 3px;
    }

    /* Dependency Graph */
    .logic-graph {
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px solid var(--border, #ddd);
    }

    .logic-graph h4 {
      margin: 0 0 15px;
      font-size: 0.95rem;
    }

    .graph-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .graph-node {
      padding: 10px 15px;
      background: var(--bg-tertiary, #f5f5f5);
      border: 1px solid var(--border, #ddd);
      border-radius: 6px;
      min-width: 120px;
    }

    .graph-node.has-rules {
      border-color: var(--accent, #e94560);
      border-width: 2px;
    }

    .node-label {
      font-weight: 500;
      font-size: 0.9rem;
    }

    .node-deps {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dep-badge {
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .dep-badge.showWhen { background: rgba(76, 175, 80, 0.2); color: #2e7d32; }
    .dep-badge.hideWhen { background: rgba(244, 67, 54, 0.2); color: #c62828; }
    .dep-badge.disableWhen { background: rgba(255, 152, 0, 0.2); color: #ef6c00; }
  `]
})
export class LogicBuilderComponent {
  readonly i18n = inject(I18nService);

  @Input() fields: FormFieldDef[] = [];
  @Output() rulesChange = new EventEmitter<LogicRule[]>();

  readonly rules = signal<LogicRule[]>([]);
  readonly expandedRule = signal<string | null>(null);

  private ruleCounter = 0;

  /**
   * Add a new rule
   */
  addRule(): void {
    const newRule: LogicRule = {
      id: `rule_${++this.ruleCounter}`,
      type: 'showWhen',
      targetField: this.fields[0]?.name || '',
      condition: {
        field: '',
        operator: 'equals',
        value: ''
      }
    };

    this.rules.update(r => [...r, newRule]);
    this.expandedRule.set(newRule.id);
    this.emitRules();
  }

  /**
   * Update a rule
   */
  updateRule(rule: LogicRule): void {
    this.rules.update(rules =>
      rules.map(r => r.id === rule.id ? { ...rule } : r)
    );
    this.emitRules();
  }

  /**
   * Delete a rule
   */
  deleteRule(ruleId: string): void {
    this.rules.update(r => r.filter(rule => rule.id !== ruleId));
    if (this.expandedRule() === ruleId) {
      this.expandedRule.set(null);
    }
    this.emitRules();
  }

  /**
   * Toggle rule expansion
   */
  toggleRule(ruleId: string): void {
    this.expandedRule.update(current => current === ruleId ? null : ruleId);
  }

  /**
   * Get available fields for condition (exclude target)
   */
  getAvailableFields(targetField: string): FormFieldDef[] {
    return this.fields.filter(f => f.name !== targetField);
  }

  /**
   * Get field label by name
   */
  getFieldLabel(fieldName: string): string {
    const field = this.fields.find(f => f.name === fieldName);
    return field?.label || fieldName;
  }

  /**
   * Get type label
   */
  getTypeLabel(type: ConditionType): string {
    const lang = this.i18n.lang();
    const labels: Record<ConditionType, { tr: string; en: string }> = {
      showWhen: { tr: 'Goster', en: 'Show' },
      hideWhen: { tr: 'Gizle', en: 'Hide' },
      disableWhen: { tr: 'Devre Disi', en: 'Disable' }
    };
    return labels[type][lang];
  }

  /**
   * Get operator label
   */
  getOperatorLabel(operator: string): string {
    const lang = this.i18n.lang();
    const labels: Record<string, { tr: string; en: string }> = {
      equals: { tr: 'esit', en: 'equals' },
      notEquals: { tr: 'esit degil', en: 'not equals' },
      contains: { tr: 'icerir', en: 'contains' },
      greaterThan: { tr: 'buyuk', en: 'greater than' },
      lessThan: { tr: 'kucuk', en: 'less than' },
      isEmpty: { tr: 'bos', en: 'is empty' },
      isNotEmpty: { tr: 'dolu', en: 'is not empty' }
    };
    return labels[operator]?.[lang] || operator;
  }

  /**
   * Check if operator is unary (no value needed)
   */
  isUnaryOperator(operator: string): boolean {
    return operator === 'isEmpty' || operator === 'isNotEmpty';
  }

  /**
   * Check if field has rules
   */
  hasRules(fieldName: string): boolean {
    return this.rules().some(r => r.targetField === fieldName);
  }

  /**
   * Get dependencies for a field
   */
  getDependencies(fieldName: string): { type: ConditionType; sourceField: string }[] {
    return this.rules()
      .filter(r => r.targetField === fieldName)
      .map(r => ({
        type: r.type,
        sourceField: r.condition.field
      }));
  }

  /**
   * Emit rules to parent
   */
  private emitRules(): void {
    this.rulesChange.emit(this.rules());
  }

  /**
   * Load rules from fields
   */
  loadFromFields(): void {
    const loadedRules: LogicRule[] = [];

    this.fields.forEach(field => {
      (['showWhen', 'hideWhen', 'disableWhen'] as ConditionType[]).forEach(type => {
        const condition = field.config[type] as ConditionalRule | undefined;
        if (condition?.field) {
          loadedRules.push({
            id: `rule_${++this.ruleCounter}`,
            type,
            targetField: field.name,
            condition
          });
        }
      });
    });

    this.rules.set(loadedRules);
  }

  /**
   * Apply rules to fields
   */
  applyToFields(): Record<string, Partial<FormFieldDef['config']>> {
    const updates: Record<string, Partial<FormFieldDef['config']>> = {};

    // Initialize all fields with cleared conditions
    this.fields.forEach(field => {
      updates[field.name] = {
        showWhen: undefined,
        hideWhen: undefined,
        disableWhen: undefined
      };
    });

    // Apply current rules
    this.rules().forEach(rule => {
      if (!updates[rule.targetField]) {
        updates[rule.targetField] = {};
      }
      updates[rule.targetField][rule.type] = rule.condition;
    });

    return updates;
  }
}
