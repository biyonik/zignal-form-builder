import { Component, signal, computed, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilderService } from './services/form-builder.service';
import { CodeGeneratorService } from './services/code-generator.service';
import { PdfExportService } from './services/pdf-export.service';
import { ZignalFormService } from './services/zignal-form.service';
import {
  FormFieldDef,
  FieldGroup,
  CrossValidatorDef,
  ConditionalRule,
  ExportFormat,
  ActiveTab,
  OPERATOR_LABELS,
} from './models/form-builder.types';
import { WizardStep, WizardConfig, DEFAULT_WIZARD_CONFIG } from './models/wizard.types';
import { RepeatableGroupConfig, DEFAULT_REPEATABLE_CONFIG } from './models/repeatable.types';
import {
  fieldTypes,
  fieldCategories,
  sampleTemplates,
  FieldTypeConfig,
} from './field-types.config';
import { WizardPreviewComponent } from './components/wizard/wizard-preview.component';
import { RepeatableGroupComponent } from './components/repeatable/repeatable-group.component';
import { LogicBuilderComponent } from './components/logic-builder/logic-builder.component';
import { SignatureFieldComponent } from './components/signature/signature-field.component';
import { ZignalPreviewComponent } from './components/zignal-preview/zignal-preview.component';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, WizardPreviewComponent, RepeatableGroupComponent, LogicBuilderComponent, SignatureFieldComponent, ZignalPreviewComponent],
  template: `
    <div class="builder-container" [class.light-theme]="service.theme() === 'light'">
      <!-- Header -->
      <header class="builder-header">
        <div class="header-left">
          <h1>Zignal Form Builder</h1>
          <p>{{ t('subtitle') }}</p>
        </div>
        <div class="header-center">
          <!-- Form selector -->
          <div class="form-selector">
            <select [value]="service.currentForm().id" (change)="onFormSelect($event)">
              <option [value]="service.currentForm().id">{{ service.currentForm().name }}</option>
              @for (form of service.savedForms(); track form.id) {
                @if (form.id !== service.currentForm().id) {
                  <option [value]="form.id">{{ form.name }}</option>
                }
              }
            </select>
            <button class="btn-icon" (click)="newForm()" [title]="t('newForm')">+</button>
            <button class="btn-icon" (click)="saveForm()" [title]="t('saveForm')">💾</button>
            @if (service.savedForms().length > 0) {
              <button class="btn-icon btn-delete" (click)="deleteCurrentForm()" [title]="t('deleteForm')">🗑️</button>
            }
          </div>
        </div>
        <div class="header-right">
          <!-- Undo/Redo -->
          <div class="undo-redo">
            <button
              class="btn-icon"
              (click)="service.undo()"
              [disabled]="!service.canUndo()"
              [title]="t('undo') + ' (Ctrl+Z)'"
            >↩️</button>
            <button
              class="btn-icon"
              (click)="service.redo()"
              [disabled]="!service.canRedo()"
              [title]="t('redo') + ' (Ctrl+Y)'"
            >↪️</button>
          </div>
          <!-- Theme toggle -->
          <button class="btn-icon" (click)="service.toggleTheme()" [title]="t('toggleTheme')">
            {{ service.theme() === 'dark' ? '☀️' : '🌙' }}
          </button>
          <!-- Language toggle -->
          <button class="btn-lang" (click)="service.toggleLanguage()">
            {{ service.language() === 'tr' ? '🇬🇧 EN' : '🇹🇷 TR' }}
          </button>
          <!-- Keyboard shortcuts help -->
          <button class="btn-icon" (click)="showShortcuts.set(true)" title="Keyboard Shortcuts">⌨️</button>
        </div>
      </header>

      <div class="builder-main">
        <!-- Left Panel: Field Types -->
        <aside class="panel panel-left">
          <h3>{{ t('fieldTypes') }}</h3>

          <!-- Templates -->
          <div class="templates-section">
            <h4>{{ t('templates') }}</h4>
            <div class="template-buttons">
              @for (template of templates; track template.id) {
                <button
                  class="template-btn"
                  (click)="loadTemplate(template)"
                  [title]="lang() === 'tr' ? template.name.tr : template.name.en"
                >
                  {{ template.icon }} {{ lang() === 'tr' ? template.name.tr : template.name.en }}
                </button>
              }
            </div>
          </div>

          <!-- Field Categories -->
          @for (category of categories; track category.id) {
            <div class="category-section">
              <h4>{{ category.icon }} {{ lang() === 'tr' ? category.label.tr : category.label.en }}</h4>
              <div class="field-type-list">
                @for (field of getFieldsByCategory(category.id); track field.type) {
                  <div
                    class="field-type-item"
                    draggable="true"
                    (dragstart)="onDragStartType($event, field)"
                    (click)="addFieldFromType(field)"
                  >
                    <span class="field-icon">{{ field.icon }}</span>
                    <span class="field-label">{{ lang() === 'tr' ? field.label.tr : field.label.en }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Add Group Button -->
          <div class="add-group-section">
            <button class="btn-add-group" (click)="addGroup()">
              📁 {{ t('addGroup') }}
            </button>
          </div>
        </aside>

        <!-- Center Panel: Form Canvas -->
        <main class="panel panel-center">
          <div class="canvas-header">
            <h3>{{ t('formFields') }} ({{ service.fields().length }})</h3>
            <div class="canvas-actions">
              @if (service.hasClipboard()) {
                <button class="btn-action" (click)="service.pasteField()">
                  📋 {{ t('paste') }}
                </button>
              }
              <button class="btn-action" (click)="service.clearAllFields()" [disabled]="service.fields().length === 0">
                🗑️ {{ t('clearAll') }}
              </button>
            </div>
          </div>

          <div
            class="form-canvas"
            (dragover)="onDragOver($event)"
            (drop)="onDropToCanvas($event)"
          >
            @if (service.fields().length === 0 && service.groups().length === 0) {
              <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>{{ t('emptyCanvas') }}</p>
              </div>
            }

            <!-- Render grouped fields -->
            @for (item of service.groupedFields(); track item.group?.id || 'ungrouped') {
              @if (item.group) {
                <!-- Group container -->
                <div
                  class="field-group"
                  [class.selected]="service.selectedGroupId() === item.group.id"
                  [class.collapsed]="item.group.collapsed"
                >
                  <div class="group-header" (click)="selectGroup(item.group)">
                    <div class="group-title">
                      @if (item.group.collapsible) {
                        <button class="btn-collapse" (click)="toggleGroupCollapse(item.group); $event.stopPropagation()">
                          {{ item.group.collapsed ? '▶' : '▼' }}
                        </button>
                      }
                      <span class="group-icon">📁</span>
                      <span>{{ item.group.label }}</span>
                      <span class="group-count">({{ item.fields.length }})</span>
                    </div>
                    <div class="group-actions">
                      <button class="btn-icon btn-delete" (click)="service.removeGroup(item.group.id); $event.stopPropagation()">🗑️</button>
                    </div>
                  </div>
                  @if (!item.group.collapsed) {
                    <div
                      class="group-content"
                      (dragover)="onDragOver($event)"
                      (drop)="onDropToGroup($event, item.group.id)"
                    >
                      @for (field of item.fields; track field.id; let i = $index) {
                        <ng-container *ngTemplateOutlet="fieldTemplate; context: { field, index: i }"></ng-container>
                      }
                      @if (item.fields.length === 0) {
                        <div class="empty-group">{{ t('dropFieldsHere') }}</div>
                      }
                    </div>
                  }
                </div>
              } @else {
                <!-- Ungrouped fields -->
                @for (field of item.fields; track field.id; let i = $index) {
                  <ng-container *ngTemplateOutlet="fieldTemplate; context: { field, index: i }"></ng-container>
                }
              }
            }
          </div>
        </main>

        <!-- Right Panel: Config & Preview -->
        <aside class="panel panel-right">
          <!-- Tabs -->
          <div class="panel-tabs">
            <button class="tab-btn" [class.active]="activeTab() === 'config'" (click)="activeTab.set('config')">
              ⚙️ {{ t('config') }}
            </button>
            <button class="tab-btn" [class.active]="activeTab() === 'preview'" (click)="activeTab.set('preview')">
              👁️ {{ t('preview') }}
            </button>
            <button class="tab-btn" [class.active]="activeTab() === 'logic'" (click)="activeTab.set('logic')">
              🔗 {{ t('logic') }}
            </button>
            <button class="tab-btn" [class.active]="activeTab() === 'json'" (click)="activeTab.set('json')">
              {{ '{' }} {{ '}' }} Export
            </button>
            <button class="tab-btn" [class.active]="activeTab() === 'settings'" (click)="activeTab.set('settings')">
              🔧 {{ t('settings') }}
            </button>
          </div>

          <!-- Config Tab -->
          @if (activeTab() === 'config') {
            <div class="tab-content">
              @if (service.selectedField()) {
                <h4>{{ t('fieldSettings') }}</h4>
                <div class="config-form">
                  <!-- Field Name -->
                  <div class="config-group">
                    <label>{{ t('fieldName') }}</label>
                    <input
                      type="text"
                      [value]="service.selectedField()?.name"
                      (input)="updateField('name', getValue($event))"
                      placeholder="fieldName"
                    />
                  </div>

                  <!-- Field Label -->
                  <div class="config-group">
                    <label>{{ t('fieldLabel') }}</label>
                    <input
                      type="text"
                      [value]="service.selectedField()?.label"
                      (input)="updateField('label', getValue($event))"
                      placeholder="Field Label"
                    />
                  </div>

                  <!-- Move to Group -->
                  @if (service.groups().length > 0) {
                    <div class="config-group">
                      <label>{{ t('group') }}</label>
                      <select
                        [value]="service.selectedField()?.groupId || ''"
                        (change)="moveFieldToGroup(getValue($event))"
                      >
                        <option value="">{{ t('noGroup') }}</option>
                        @for (group of service.groups(); track group.id) {
                          <option [value]="group.id">{{ group.label }}</option>
                        }
                      </select>
                    </div>
                  }

                  <!-- Dynamic Config Options -->
                  @for (option of getConfigOptions(service.selectedField()!.type); track option.key) {
                    <div class="config-group">
                      <label>{{ lang() === 'tr' ? option.label.tr : option.label.en }}</label>

                      @switch (option.type) {
                        @case ('boolean') {
                          <label class="checkbox-label">
                            <input
                              type="checkbox"
                              [checked]="service.selectedField()?.config?.[option.key] ?? option.default"
                              (change)="updateFieldConfig(option.key, getChecked($event))"
                            />
                            <span>{{ lang() === 'tr' ? option.label.tr : option.label.en }}</span>
                          </label>
                        }
                        @case ('number') {
                          <input
                            type="number"
                            [value]="service.selectedField()?.config?.[option.key] ?? option.default ?? ''"
                            (input)="updateFieldConfig(option.key, getNumberValue($event))"
                          />
                        }
                        @case ('select') {
                          <select
                            [value]="service.selectedField()?.config?.[option.key] ?? option.default"
                            (change)="updateFieldConfig(option.key, getValue($event))"
                          >
                            @for (opt of option.options; track opt.value) {
                              <option [value]="opt.value">{{ opt.label }}</option>
                            }
                          </select>
                        }
                        @case ('options-editor') {
                          <div class="options-editor">
                            <div class="options-list">
                              @for (opt of getSelectOptions(); track opt.value; let i = $index) {
                                <div class="option-row">
                                  <input
                                    type="text"
                                    [value]="opt.value"
                                    (input)="updateSelectOption(i, 'value', getValue($event))"
                                    placeholder="value"
                                  />
                                  <input
                                    type="text"
                                    [value]="opt.label"
                                    (input)="updateSelectOption(i, 'label', getValue($event))"
                                    placeholder="label"
                                  />
                                  <button class="btn-icon btn-delete" (click)="removeSelectOption(i)">✕</button>
                                </div>
                              }
                            </div>
                            <button class="btn-add-option" (click)="addSelectOption()">
                              + {{ t('addOption') }}
                            </button>
                          </div>
                        }
                        @default {
                          <input
                            type="text"
                            [value]="service.selectedField()?.config?.[option.key] ?? ''"
                            (input)="updateFieldConfig(option.key, getValue($event))"
                          />
                        }
                      }
                    </div>
                  }

                  <!-- Grid Layout Options -->
                  <div class="config-group">
                    <label>{{ t('columnWidth') }}</label>
                    <select
                      [value]="service.selectedField()?.config?.['columnWidth'] || '100'"
                      (change)="updateFieldConfig('columnWidth', getValue($event))"
                    >
                      <option value="100">100% ({{ t('fullWidth') }})</option>
                      <option value="50">50% ({{ t('halfWidth') }})</option>
                      <option value="33">33% ({{ t('thirdWidth') }})</option>
                      <option value="25">25% ({{ t('quarterWidth') }})</option>
                    </select>
                  </div>

                  <!-- Conditional Logic Section -->
                  <div class="config-section">
                    <h5>{{ t('conditionalLogic') }}</h5>

                    <!-- Show When -->
                    <div class="condition-editor">
                      <label>{{ t('showWhen') }}</label>
                      @if (service.selectedField()?.config?.['showWhen']) {
                        <div class="condition-row">
                          <select
                            [value]="service.selectedField()?.config?.['showWhen']?.field"
                            (change)="updateCondition('showWhen', 'field', getValue($event))"
                          >
                            <option value="">{{ t('selectField') }}</option>
                            @for (f of getOtherFields(); track f.id) {
                              <option [value]="f.name">{{ f.label }}</option>
                            }
                          </select>
                          <select
                            [value]="service.selectedField()?.config?.['showWhen']?.operator"
                            (change)="updateCondition('showWhen', 'operator', getValue($event))"
                          >
                            @for (op of operators; track op) {
                              <option [value]="op">{{ getOperatorLabel(op) }}</option>
                            }
                          </select>
                          @if (!['isEmpty', 'isNotEmpty'].includes(service.selectedField()?.config?.['showWhen']?.operator || '')) {
                            <input
                              type="text"
                              [value]="service.selectedField()?.config?.['showWhen']?.value ?? ''"
                              (input)="updateCondition('showWhen', 'value', getValue($event))"
                              placeholder="value"
                            />
                          }
                          <button class="btn-icon btn-delete" (click)="removeCondition('showWhen')">✕</button>
                        </div>
                      } @else {
                        <button class="btn-add-condition" (click)="addCondition('showWhen')">
                          + {{ t('addCondition') }}
                        </button>
                      }
                    </div>

                    <!-- Hide When -->
                    <div class="condition-editor">
                      <label>{{ t('hideWhen') }}</label>
                      @if (service.selectedField()?.config?.['hideWhen']) {
                        <div class="condition-row">
                          <select
                            [value]="service.selectedField()?.config?.['hideWhen']?.field"
                            (change)="updateCondition('hideWhen', 'field', getValue($event))"
                          >
                            <option value="">{{ t('selectField') }}</option>
                            @for (f of getOtherFields(); track f.id) {
                              <option [value]="f.name">{{ f.label }}</option>
                            }
                          </select>
                          <select
                            [value]="service.selectedField()?.config?.['hideWhen']?.operator"
                            (change)="updateCondition('hideWhen', 'operator', getValue($event))"
                          >
                            @for (op of operators; track op) {
                              <option [value]="op">{{ getOperatorLabel(op) }}</option>
                            }
                          </select>
                          @if (!['isEmpty', 'isNotEmpty'].includes(service.selectedField()?.config?.['hideWhen']?.operator || '')) {
                            <input
                              type="text"
                              [value]="service.selectedField()?.config?.['hideWhen']?.value ?? ''"
                              (input)="updateCondition('hideWhen', 'value', getValue($event))"
                              placeholder="value"
                            />
                          }
                          <button class="btn-icon btn-delete" (click)="removeCondition('hideWhen')">✕</button>
                        </div>
                      } @else {
                        <button class="btn-add-condition" (click)="addCondition('hideWhen')">
                          + {{ t('addCondition') }}
                        </button>
                      }
                    </div>

                    <!-- Disable When -->
                    <div class="condition-editor">
                      <label>{{ t('disableWhen') }}</label>
                      @if (service.selectedField()?.config?.['disableWhen']) {
                        <div class="condition-row">
                          <select
                            [value]="service.selectedField()?.config?.['disableWhen']?.field"
                            (change)="updateCondition('disableWhen', 'field', getValue($event))"
                          >
                            <option value="">{{ t('selectField') }}</option>
                            @for (f of getOtherFields(); track f.id) {
                              <option [value]="f.name">{{ f.label }}</option>
                            }
                          </select>
                          <select
                            [value]="service.selectedField()?.config?.['disableWhen']?.operator"
                            (change)="updateCondition('disableWhen', 'operator', getValue($event))"
                          >
                            @for (op of operators; track op) {
                              <option [value]="op">{{ getOperatorLabel(op) }}</option>
                            }
                          </select>
                          @if (!['isEmpty', 'isNotEmpty'].includes(service.selectedField()?.config?.['disableWhen']?.operator || '')) {
                            <input
                              type="text"
                              [value]="service.selectedField()?.config?.['disableWhen']?.value ?? ''"
                              (input)="updateCondition('disableWhen', 'value', getValue($event))"
                              placeholder="value"
                            />
                          }
                          <button class="btn-icon btn-delete" (click)="removeCondition('disableWhen')">✕</button>
                        </div>
                      } @else {
                        <button class="btn-add-condition" (click)="addCondition('disableWhen')">
                          + {{ t('addCondition') }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              } @else if (service.selectedGroup()) {
                <h4>{{ t('groupSettings') }}</h4>
                <div class="config-form">
                  <div class="config-group">
                    <label>{{ t('groupName') }}</label>
                    <input
                      type="text"
                      [value]="service.selectedGroup()?.name"
                      (input)="updateGroup('name', getValue($event))"
                    />
                  </div>
                  <div class="config-group">
                    <label>{{ t('groupLabel') }}</label>
                    <input
                      type="text"
                      [value]="service.selectedGroup()?.label"
                      (input)="updateGroup('label', getValue($event))"
                    />
                  </div>
                  <div class="config-group">
                    <label>{{ t('description') }}</label>
                    <textarea
                      [value]="service.selectedGroup()?.description ?? ''"
                      (input)="updateGroup('description', getValue($event))"
                      rows="2"
                    ></textarea>
                  </div>
                  <div class="config-group">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="service.selectedGroup()?.collapsible"
                        (change)="updateGroup('collapsible', getChecked($event))"
                      />
                      <span>{{ t('collapsible') }}</span>
                    </label>
                  </div>
                  <div class="config-group">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="isGroupRepeatable(service.selectedGroup())"
                        (change)="updateGroupRepeatable(getChecked($event))"
                      />
                      <span>{{ t('repeatableGroup') }}</span>
                    </label>
                  </div>
                  @if (isGroupRepeatable(service.selectedGroup())) {
                    <div class="repeatable-settings">
                      <div class="config-group">
                        <label>{{ t('minItems') }}</label>
                        <input
                          type="number"
                          [value]="getGroupRepeatableConfig(service.selectedGroup())?.minItems || 1"
                          min="0"
                          max="10"
                          (input)="updateGroupRepeatableConfig('minItems', getNumberValue($event))"
                        />
                      </div>
                      <div class="config-group">
                        <label>{{ t('maxItems') }}</label>
                        <input
                          type="number"
                          [value]="getGroupRepeatableConfig(service.selectedGroup())?.maxItems || 5"
                          min="1"
                          max="20"
                          (input)="updateGroupRepeatableConfig('maxItems', getNumberValue($event))"
                        />
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="no-selection">
                  <p>{{ t('selectFieldToEdit') }}</p>
                </div>
              }
            </div>
          }

          <!-- Preview Tab -->
          @if (activeTab() === 'preview') {
            <div class="tab-content preview-content">
              <div class="preview-header">
                <h4>{{ t('formPreview') }}</h4>
                <div class="preview-actions">
                  <!-- Zignal Preview Toggle -->
                  <label class="zignal-toggle" [class.active]="zignalPreviewMode()">
                    <input
                      type="checkbox"
                      [checked]="zignalPreviewMode()"
                      (change)="zignalPreviewMode.set(getChecked($event))"
                    />
                    <span>⚡ Zignal</span>
                  </label>
                  <!-- Device Preview Selector -->
                  <div class="device-selector">
                    <button
                      class="device-btn"
                      [class.active]="previewDevice() === 'mobile'"
                      (click)="previewDevice.set('mobile')"
                      title="Mobile (375px)"
                    >📱</button>
                    <button
                      class="device-btn"
                      [class.active]="previewDevice() === 'tablet'"
                      (click)="previewDevice.set('tablet')"
                      title="Tablet (768px)"
                    >📱</button>
                    <button
                      class="device-btn"
                      [class.active]="previewDevice() === 'desktop'"
                      (click)="previewDevice.set('desktop')"
                      title="Desktop (100%)"
                    >🖥️</button>
                  </div>
                  @if (!zignalPreviewMode()) {
                    <label class="wizard-toggle">
                      <input
                        type="checkbox"
                        [checked]="wizardMode()"
                        (change)="wizardMode.set(getChecked($event))"
                      />
                      <span>🧙 {{ t('wizardMode') }}</span>
                    </label>
                  }
                  <button class="btn-action" (click)="exportToPdf()">
                    📄 PDF
                  </button>
                  <button class="btn-action" (click)="openFullPreview()">
                    🔍 {{ t('fullscreen') }}
                  </button>
                </div>
              </div>

              <!-- Zignal Preview Mode -->
              @if (zignalPreviewMode() && service.fields().length > 0) {
                <app-zignal-preview
                  [device]="previewDevice()"
                  [showValidationSummary]="true"
                  [enablePersistence]="false"
                  (submitted)="onZignalFormSubmit($event)"
                />
              }

              <!-- Normal Preview Mode -->
              @if (!zignalPreviewMode() && service.fields().length > 0 && !wizardMode()) {
                <div class="preview-device-frame" [class]="'device-' + previewDevice()">
                  <div class="preview-form">
                  <!-- Repeatable Groups -->
                  @for (group of getRepeatableGroups(); track group.id) {
                    <app-repeatable-group
                      [group]="group"
                      [fields]="getGroupFields(group.id)"
                      [config]="getGroupRepeatableConfig(group)!"
                      (valuesChange)="onRepeatableValuesChange(group.id, $event)"
                    />
                  }

                  <!-- Regular Fields (excluding repeatable group fields) -->
                  @for (field of getNonRepeatableFields(); track field.id) {
                    @if (isFieldVisible(field)) {
                    <div
                      class="preview-field"
                      [class.has-error]="previewErrors()[field.name]"
                      [class.field-disabled]="isFieldDisabled(field)"
                      [class.col-100]="!field.config['columnWidth'] || field.config['columnWidth'] === '100'"
                      [class.col-50]="field.config['columnWidth'] === '50'"
                      [class.col-33]="field.config['columnWidth'] === '33'"
                      [class.col-25]="field.config['columnWidth'] === '25'"
                    >
                      <label>
                        {{ field.label }}
                        @if (field.config['required']) {
                          <span class="required-star">*</span>
                        }
                      </label>

                      @switch (field.type) {
                        @case ('string') {
                          <input
                            type="text"
                            [value]="getPreviewValue(field.name)"
                            [placeholder]="field.config['placeholder'] || ''"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('email') {
                          <input
                            type="email"
                            [value]="getPreviewValue(field.name)"
                            placeholder="email@example.com"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('password') {
                          <input
                            type="password"
                            [value]="getPreviewValue(field.name)"
                            placeholder="********"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('number') {
                          <input
                            type="number"
                            [value]="getPreviewValue(field.name)"
                            [min]="field.config['min']"
                            [max]="field.config['max']"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getNumberValue($event))"
                            (blur)="onPreviewBlur(field.name, getNumberValue($event))"
                          />
                        }
                        @case ('textarea') {
                          <textarea
                            [value]="getPreviewValue(field.name)"
                            [rows]="field.config['rows'] || 4"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          ></textarea>
                        }
                        @case ('select') {
                          <select
                            [value]="getPreviewValue(field.name)"
                            [disabled]="isFieldDisabled(field)"
                            (change)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          >
                            <option value="">{{ t('select') }}...</option>
                            @for (opt of field.config['options'] || []; track opt.value) {
                              <option [value]="opt.value" [selected]="getPreviewValue(field.name) === opt.value">{{ opt.label }}</option>
                            }
                          </select>
                        }
                        @case ('multiselect') {
                          <div class="multiselect-preview">
                            @for (opt of field.config['options'] || []; track opt.value) {
                              <label class="multiselect-option">
                                <input
                                  type="checkbox"
                                  [checked]="isMultiselectChecked(field.name, opt.value)"
                                  [disabled]="isFieldDisabled(field)"
                                  (change)="onMultiselectChange(field.name, opt.value, getChecked($event))"
                                />
                                {{ opt.label }}
                              </label>
                            }
                          </div>
                        }
                        @case ('boolean') {
                          <input
                            type="checkbox"
                            [checked]="isPreviewChecked(field.name)"
                            [disabled]="isFieldDisabled(field)"
                            (change)="onPreviewInput(field.name, getChecked($event))"
                          />
                        }
                        @case ('date') {
                          <input
                            type="date"
                            [value]="getPreviewValue(field.name)"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('time') {
                          <input
                            type="time"
                            [value]="getPreviewValue(field.name)"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('color') {
                          <input
                            type="color"
                            [value]="getPreviewValue(field.name) || '#000000'"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                          />
                        }
                        @case ('url') {
                          <input
                            type="url"
                            [value]="getPreviewValue(field.name)"
                            placeholder="https://"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('phone') {
                          <input
                            type="tel"
                            [value]="getPreviewValue(field.name)"
                            placeholder="+90 5XX XXX XX XX"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('file') {
                          <input
                            type="file"
                            [accept]="field.config['accept'] || '*'"
                            [disabled]="isFieldDisabled(field)"
                          />
                        }
                        @case ('rating') {
                          <div class="rating-preview" [class.disabled]="isFieldDisabled(field)">
                            @for (star of getStars(field.config['max'] || 5); track star) {
                              <span
                                class="star"
                                [class.filled]="isStarFilled(field.name, star)"
                                (click)="!isFieldDisabled(field) && onPreviewInput(field.name, star + 1)"
                              >{{ isStarFilled(field.name, star) ? '★' : '☆' }}</span>
                            }
                          </div>
                        }
                        @case ('money') {
                          <div class="money-input">
                            <span class="currency-symbol">{{ getCurrencySymbol(field.config['currency']) }}</span>
                            <input
                              type="number"
                              [value]="getPreviewValue(field.name)"
                              [min]="field.config['min']"
                              [max]="field.config['max']"
                              step="0.01"
                              [disabled]="isFieldDisabled(field)"
                              (input)="onPreviewInput(field.name, getNumberValue($event))"
                              (blur)="onPreviewBlur(field.name, getNumberValue($event))"
                            />
                          </div>
                        }
                        @case ('percent') {
                          <div class="percent-input">
                            <input
                              type="number"
                              [value]="getPreviewValue(field.name)"
                              [min]="field.config['min'] || 0"
                              [max]="field.config['max'] || 100"
                              [disabled]="isFieldDisabled(field)"
                              (input)="onPreviewInput(field.name, getNumberValue($event))"
                              (blur)="onPreviewBlur(field.name, getNumberValue($event))"
                            />
                            <span class="percent-symbol">%</span>
                          </div>
                        }
                        @case ('tags') {
                          <div class="tags-input">
                            <div class="tags-list">
                              @for (tag of getTagsList(field.name); track tag) {
                                <span class="tag">
                                  {{ tag }}
                                  <button type="button" (click)="removeTag(field.name, tag)">×</button>
                                </span>
                              }
                            </div>
                            <input
                              type="text"
                              [placeholder]="lang() === 'tr' ? 'Etiket ekle (Enter)' : 'Add tag (Enter)'"
                              [disabled]="isFieldDisabled(field)"
                              (keydown.enter)="addTag(field.name, $event)"
                            />
                          </div>
                        }
                        @case ('slug') {
                          <input
                            type="text"
                            [value]="getPreviewValue(field.name)"
                            placeholder="url-slug-ornegi"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, slugify(getValue($event)))"
                            (blur)="onPreviewBlur(field.name, getPreviewValue(field.name))"
                          />
                        }
                        @case ('json') {
                          <textarea
                            [value]="getPreviewValue(field.name)"
                            rows="4"
                            placeholder='{{ "{" }}"key": "value"{{ "}" }}'
                            class="json-textarea"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onJsonBlur(field.name, getValue($event))"
                          ></textarea>
                        }
                        @case ('slider') {
                          <div class="slider-input">
                            <input
                              type="range"
                              [value]="getPreviewValue(field.name) || field.config['min'] || 0"
                              [min]="field.config['min'] || 0"
                              [max]="field.config['max'] || 100"
                              [step]="field.config['step'] || 1"
                              [disabled]="isFieldDisabled(field)"
                              (input)="onPreviewInput(field.name, getNumberValue($event))"
                            />
                            @if (field.config['showValue'] !== false) {
                              <span class="slider-value">{{ getPreviewValue(field.name) || field.config['min'] || 0 }}{{ field.config['unit'] || '' }}</span>
                            }
                          </div>
                        }
                        @case ('calculated') {
                          <div class="calculated-field">
                            <input
                              type="text"
                              [value]="getCalculatedValue(field)"
                              disabled
                              class="calculated-value"
                            />
                            @if (field.config['formula']) {
                              <span class="formula-indicator" [title]="field.config['formula']">fx</span>
                            }
                          </div>
                        }
                        @case ('signature') {
                          <app-signature-field
                            [width]="$any(field.config['width']) || 400"
                            [height]="$any(field.config['height']) || 150"
                            [penColor]="$any(field.config['penColor']) || '#000000'"
                            [backgroundColor]="$any(field.config['backgroundColor']) || '#ffffff'"
                            [disabled]="isFieldDisabled(field)"
                            [value]="getPreviewValue(field.name)"
                            [lang]="lang()"
                            (valueChange)="onPreviewInput(field.name, $event)"
                          />
                        }
                        @default {
                          <input
                            type="text"
                            [value]="getPreviewValue(field.name)"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                      }

                      @if (field.config['hint']) {
                        <span class="hint">{{ field.config['hint'] }}</span>
                      }

                      @if (previewErrors()[field.name]) {
                        <span class="error-message">{{ previewErrors()[field.name] }}</span>
                      }
                    </div>
                    }
                  }

                    <div class="preview-buttons">
                      <button class="btn-submit" type="button" (click)="saveFormResponse()">
                        {{ service.settings().submitButtonText[lang()] }}
                      </button>
                      @if (service.settings().showReset) {
                        <button class="btn-reset" type="button" (click)="resetPreview()">
                          {{ service.settings().resetButtonText[lang()] }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- Wizard Mode Preview -->
              @if (wizardMode() && service.groups().length > 0) {
                <app-wizard-preview
                  [fields]="service.fields()"
                  [config]="getWizardConfig()"
                  (complete)="onWizardComplete($event)"
                />
              } @else if (wizardMode() && service.groups().length === 0) {
                <div class="no-selection">
                  <p>{{ t('wizardNeedsGroups') }}</p>
                  <button class="btn-action" (click)="addGroup()">
                    ➕ {{ t('addGroup') }}
                  </button>
                </div>
              }

              @if (!wizardMode() && service.fields().length === 0) {
                <div class="no-selection">
                  <p>{{ t('addFieldsToPreview') }}</p>
                </div>
              }
            </div>
          }

          <!-- Logic Builder Tab -->
          @if (activeTab() === 'logic') {
            <div class="tab-content logic-content">
              <app-logic-builder
                [fields]="service.fields()"
                (rulesChange)="onLogicRulesChange($event)"
              />
            </div>
          }

          <!-- Export Tab (JSON + TypeScript) -->
          @if (activeTab() === 'json') {
            <div class="tab-content json-content">
              <div class="export-format-selector">
                <button
                  class="format-btn"
                  [class.active]="exportFormat() === 'json'"
                  (click)="exportFormat.set('json')"
                >
                  {{ '{' }} {{ '}' }} JSON
                </button>
                <button
                  class="format-btn"
                  [class.active]="exportFormat() === 'typescript'"
                  (click)="exportFormat.set('typescript')"
                >
                  TS TypeScript
                </button>
              </div>

              <div class="json-actions">
                <button class="btn-action" (click)="copyExport()">
                  📋 {{ t('copy') }}
                </button>
                <button class="btn-action" (click)="downloadExport()">
                  ⬇️ {{ t('download') }}
                </button>
              </div>

              <pre class="json-output">{{ currentExport() }}</pre>

              <h4>{{ t('importJson') }}</h4>
              <textarea
                class="json-input"
                [placeholder]="t('pasteJson')"
                #jsonInput
              ></textarea>
              <div class="import-actions">
                <button class="btn-action" (click)="importJson(jsonInput.value)">
                  📥 {{ t('import') }}
                </button>
                <button class="btn-action" (click)="showImportUrl.set(true)">
                  🔗 {{ t('importFromUrl') }}
                </button>
              </div>
            </div>
          }

          <!-- Settings Tab -->
          @if (activeTab() === 'settings') {
            <div class="tab-content settings-content">
              <h4>{{ t('formSettings') }}</h4>

              <div class="config-form">
                <!-- Form Name -->
                <div class="config-group">
                  <label>{{ t('formName') }}</label>
                  <input
                    type="text"
                    [value]="service.currentForm().name"
                    (input)="updateFormMeta('name', getValue($event))"
                  />
                </div>

                <!-- Form Description -->
                <div class="config-group">
                  <label>{{ t('formDescription') }}</label>
                  <textarea
                    [value]="service.currentForm().description ?? ''"
                    (input)="updateFormMeta('description', getValue($event))"
                    rows="2"
                  ></textarea>
                </div>

                <hr />

                <!-- Submit Button Text -->
                <div class="config-group">
                  <label>{{ t('submitButtonText') }} (TR)</label>
                  <input
                    type="text"
                    [value]="service.settings().submitButtonText.tr"
                    (input)="updateSubmitButtonText('tr', getValue($event))"
                  />
                </div>
                <div class="config-group">
                  <label>{{ t('submitButtonText') }} (EN)</label>
                  <input
                    type="text"
                    [value]="service.settings().submitButtonText.en"
                    (input)="updateSubmitButtonText('en', getValue($event))"
                  />
                </div>

                <!-- Show Reset Button -->
                <div class="config-group">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="service.settings().showReset"
                      (change)="updateSettings('showReset', getChecked($event))"
                    />
                    <span>{{ t('showResetButton') }}</span>
                  </label>
                </div>

                <hr />

                <!-- Validation Settings -->
                <div class="config-group">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="service.settings().validateOnBlur"
                      (change)="updateSettings('validateOnBlur', getChecked($event))"
                    />
                    <span>{{ t('validateOnBlur') }}</span>
                  </label>
                </div>
                <div class="config-group">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="service.settings().validateOnChange"
                      (change)="updateSettings('validateOnChange', getChecked($event))"
                    />
                    <span>{{ t('validateOnChange') }}</span>
                  </label>
                </div>

                <hr />

                <!-- Layout -->
                <div class="config-group">
                  <label>{{ t('layout') }}</label>
                  <select
                    [value]="service.settings().layout"
                    (change)="updateSettings('layout', getValue($event))"
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                    <option value="inline">Inline</option>
                  </select>
                </div>

                <!-- Label Position -->
                <div class="config-group">
                  <label>{{ t('labelPosition') }}</label>
                  <select
                    [value]="service.settings().labelPosition"
                    (change)="updateSettings('labelPosition', getValue($event))"
                  >
                    <option value="top">Top</option>
                    <option value="left">Left</option>
                    <option value="floating">Floating</option>
                  </select>
                </div>

                <!-- Size -->
                <div class="config-group">
                  <label>{{ t('size') }}</label>
                  <select
                    [value]="service.settings().size"
                    (change)="updateSettings('size', getValue($event))"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <hr />

                <!-- Cross-field Validators -->
                <h5>{{ t('crossValidators') }}</h5>
                @for (validator of service.crossValidators(); track validator.id) {
                  <div class="cross-validator-item">
                    <div class="validator-header">
                      <span>{{ validator.name }}</span>
                      <button class="btn-icon btn-delete" (click)="service.removeCrossValidator(validator.id)">✕</button>
                    </div>
                    <div class="validator-details">
                      <span class="validator-type">{{ validator.type }}</span>
                      <span class="validator-fields">{{ validator.fields.join(', ') }}</span>
                    </div>
                  </div>
                }
                <button class="btn-add-validator" (click)="showCrossValidatorModal.set(true)">
                  + {{ t('addCrossValidator') }}
                </button>

                <hr />

                <!-- Webhook/API Integration -->
                <h5>📡 {{ t('webhookIntegration') }}</h5>
                <div class="config-group">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="webhookEnabled()"
                      (change)="webhookEnabled.set(getChecked($event))"
                    />
                    <span>{{ t('enableWebhook') }}</span>
                  </label>
                </div>
                @if (webhookEnabled()) {
                  <div class="config-group">
                    <label>{{ t('webhookUrl') }}</label>
                    <input
                      type="url"
                      [value]="webhookUrl()"
                      placeholder="https://api.example.com/webhook"
                      (input)="webhookUrl.set(getValue($event))"
                    />
                  </div>
                  <div class="config-group">
                    <label>{{ t('webhookMethod') }}</label>
                    <select [value]="webhookMethod()" (change)="webhookMethod.set(getValue($event))">
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div class="config-group">
                    <label>{{ t('webhookHeaders') }}</label>
                    <textarea
                      [value]="webhookHeaders()"
                      placeholder='{"Authorization": "Bearer token"}'
                      rows="2"
                      (input)="webhookHeaders.set(getValue($event))"
                    ></textarea>
                    <small class="help-text">JSON format</small>
                  </div>
                  <button class="btn-test-webhook" (click)="testWebhook()">
                    🧪 {{ t('testWebhook') }}
                  </button>
                }

                <hr />

                <!-- Email Notification -->
                <h5>📧 {{ t('emailNotification') }}</h5>
                <div class="config-group">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="emailNotificationEnabled()"
                      (change)="emailNotificationEnabled.set(getChecked($event))"
                    />
                    <span>{{ t('enableEmailNotification') }}</span>
                  </label>
                </div>
                @if (emailNotificationEnabled()) {
                  <div class="config-group">
                    <label>{{ t('notifyEmails') }}</label>
                    <input
                      type="text"
                      [value]="notifyEmails()"
                      placeholder="admin@example.com, support@example.com"
                      (input)="notifyEmails.set(getValue($event))"
                    />
                    <small class="help-text">{{ t('separateWithComma') }}</small>
                  </div>
                  <div class="config-group">
                    <label>{{ t('emailSubject') }}</label>
                    <input
                      type="text"
                      [value]="emailSubject()"
                      [placeholder]="t('newFormSubmission')"
                      (input)="emailSubject.set(getValue($event))"
                    />
                  </div>
                  <div class="config-group">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="includeFormDataInEmail()"
                        (change)="includeFormDataInEmail.set(getChecked($event))"
                      />
                      <span>{{ t('includeFormData') }}</span>
                    </label>
                  </div>
                }

                <hr />

                <!-- Response Viewer -->
                <h5>📊 {{ t('responses') }}</h5>
                <div class="response-summary">
                  <span class="response-count">{{ formResponses().length }} {{ t('totalResponses') }}</span>
                  @if (formResponses().length > 0) {
                    <button class="btn-view-responses" (click)="showResponseViewer.set(true)">
                      👁️ {{ t('viewResponses') }}
                    </button>
                    <button class="btn-export-responses" (click)="exportResponsesToCSV()">
                      📥 {{ t('exportCSV') }}
                    </button>
                    <button class="btn-clear-responses" (click)="clearResponses()">
                      🗑️ {{ t('clearResponses') }}
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </aside>
      </div>

      <!-- Field Template -->
      <ng-template #fieldTemplate let-field="field" let-index="index">
        <div
          class="canvas-field"
          [class.selected]="service.selectedFieldId() === field.id"
          draggable="true"
          (dragstart)="onDragStartField($event, field, index)"
          (dragover)="onDragOverField($event, index)"
          (drop)="onDropField($event, index)"
          (click)="selectField(field)"
        >
          <div class="field-header">
            <span class="field-type-badge">
              {{ getFieldTypeIcon(field.type) }} {{ field.type }}
            </span>
            <div class="field-actions">
              <button class="btn-icon" (click)="service.copyField(field.id); $event.stopPropagation()" title="Copy (Ctrl+C)">📋</button>
              <button class="btn-icon" (click)="service.duplicateField(field.id); $event.stopPropagation()" title="Duplicate (Ctrl+D)">📑</button>
              <button class="btn-icon" (click)="service.moveField(field.id, 'up'); $event.stopPropagation()" [disabled]="index === 0">⬆️</button>
              <button class="btn-icon" (click)="service.moveField(field.id, 'down'); $event.stopPropagation()" [disabled]="index === service.fields().length - 1">⬇️</button>
              <button class="btn-icon btn-delete" (click)="service.removeField(field.id); $event.stopPropagation()" title="Delete (Del)">🗑️</button>
            </div>
          </div>
          <div class="field-body">
            <strong>{{ field.label }}</strong>
            <code class="field-name">{{ field.name }}</code>
          </div>
          <div class="field-config-preview">
            @if (field.config['required']) {
              <span class="config-badge required">{{ t('required') }}</span>
            }
            @if (field.config['minLength']) {
              <span class="config-badge">min: {{ field.config['minLength'] }}</span>
            }
            @if (field.config['maxLength']) {
              <span class="config-badge">max: {{ field.config['maxLength'] }}</span>
            }
            @if (field.config['showWhen']) {
              <span class="config-badge condition">{{ t('hasCondition') }}</span>
            }
            @if (field.groupId) {
              <span class="config-badge group">📁</span>
            }
          </div>
        </div>
      </ng-template>

      <!-- Keyboard Shortcuts Modal -->
      @if (showShortcuts()) {
        <div class="modal-overlay" (click)="showShortcuts.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ t('keyboardShortcuts') }}</h3>
              <button class="btn-close" (click)="showShortcuts.set(false)">✕</button>
            </div>
            <div class="modal-body shortcuts-list">
              <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>Z</kbd> <span>{{ t('undo') }}</span></div>
              <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>Y</kbd> <span>{{ t('redo') }}</span></div>
              <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>S</kbd> <span>{{ t('saveForm') }}</span></div>
              <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>C</kbd> <span>{{ t('copyField') }}</span></div>
              <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>V</kbd> <span>{{ t('pasteField') }}</span></div>
              <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>D</kbd> <span>{{ t('duplicateField') }}</span></div>
              <div class="shortcut-item"><kbd>Delete</kbd> <span>{{ t('deleteField') }}</span></div>
              <div class="shortcut-item"><kbd>Escape</kbd> <span>{{ t('deselect') }}</span></div>
            </div>
          </div>
        </div>
      }

      <!-- Response Viewer Modal -->
      @if (showResponseViewer()) {
        <div class="modal-overlay" (click)="showResponseViewer.set(false)">
          <div class="modal modal-large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>📊 {{ t('responses') }} ({{ formResponses().length }})</h3>
              <button class="btn-close" (click)="showResponseViewer.set(false)">✕</button>
            </div>
            <div class="modal-body response-viewer-body">
              @if (formResponses().length === 0) {
                <div class="empty-responses">
                  <span class="empty-icon">📭</span>
                  <p>{{ t('noResponses') }}</p>
                </div>
              } @else {
                <div class="response-list">
                  @for (response of formResponses(); track response.id; let i = $index) {
                    <div class="response-item" [class.expanded]="expandedResponseId() === response.id">
                      <div class="response-header" (click)="toggleResponseExpand(response.id)">
                        <span class="response-number">#{{ i + 1 }}</span>
                        <span class="response-date">{{ formatResponseDate(response.timestamp) }}</span>
                        <span class="expand-icon">{{ expandedResponseId() === response.id ? '▼' : '▶' }}</span>
                      </div>
                      @if (expandedResponseId() === response.id) {
                        <div class="response-details">
                          <table class="response-table">
                            <thead>
                              <tr>
                                <th>{{ t('fieldName') }}</th>
                                <th>{{ t('value') }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (entry of getResponseEntries(response.values); track entry.key) {
                                <tr>
                                  <td class="field-name">{{ getFieldLabel(entry.key) }}</td>
                                  <td class="field-value">
                                    @if (isSignatureValue(entry.value)) {
                                      <img [src]="entry.value" alt="Signature" class="signature-preview" />
                                    } @else {
                                      {{ formatResponseValue(entry.value) }}
                                    }
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                          <div class="response-actions">
                            <button class="btn-delete-response" (click)="deleteResponse(response.id)">
                              🗑️ {{ t('delete') }}
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Full Preview Modal -->
      @if (showFullPreview()) {
        <div class="modal-overlay" (click)="showFullPreview.set(false)">
          <div class="modal modal-large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ service.currentForm().name }} - {{ t('preview') }}</h3>
              <button class="btn-close" (click)="showFullPreview.set(false)">✕</button>
            </div>
            <div class="modal-body preview-modal-body">
              <div class="full-preview-form" [class.layout-horizontal]="service.settings().layout === 'horizontal'">
                <!-- Repeatable Groups in Fullscreen -->
                @for (group of getRepeatableGroups(); track group.id) {
                  <app-repeatable-group
                    [group]="group"
                    [fields]="getGroupFields(group.id)"
                    [config]="getGroupRepeatableConfig(group)!"
                    (valuesChange)="onRepeatableValuesChange(group.id, $event)"
                  />
                }

                <!-- Regular Fields in Fullscreen -->
                @for (field of getNonRepeatableFields(); track field.id) {
                  @if (isFieldVisible(field)) {
                    <div
                      class="preview-field"
                      [class.has-error]="previewErrors()[field.name]"
                      [class.field-disabled]="isFieldDisabled(field)"
                      [class.col-100]="!field.config['columnWidth'] || field.config['columnWidth'] === '100'"
                      [class.col-50]="field.config['columnWidth'] === '50'"
                      [class.col-33]="field.config['columnWidth'] === '33'"
                      [class.col-25]="field.config['columnWidth'] === '25'"
                    >
                      <label>
                        {{ field.label }}
                        @if (field.config['required']) {
                          <span class="required-star">*</span>
                        }
                      </label>

                      @switch (field.type) {
                        @case ('string') {
                          <input
                            type="text"
                            [value]="getPreviewValue(field.name)"
                            [placeholder]="field.config['placeholder'] || ''"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('email') {
                          <input
                            type="email"
                            [value]="getPreviewValue(field.name)"
                            placeholder="email@example.com"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('password') {
                          <input
                            type="password"
                            [value]="getPreviewValue(field.name)"
                            placeholder="********"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('number') {
                          <input
                            type="number"
                            [value]="getPreviewValue(field.name)"
                            [min]="field.config['min']"
                            [max]="field.config['max']"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getNumberValue($event))"
                            (blur)="onPreviewBlur(field.name, getNumberValue($event))"
                          />
                        }
                        @case ('textarea') {
                          <textarea
                            [value]="getPreviewValue(field.name)"
                            [rows]="field.config['rows'] || 4"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          ></textarea>
                        }
                        @case ('select') {
                          <select
                            [value]="getPreviewValue(field.name)"
                            [disabled]="isFieldDisabled(field)"
                            (change)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          >
                            <option value="">{{ t('select') }}...</option>
                            @for (opt of field.config['options'] || []; track opt.value) {
                              <option [value]="opt.value" [selected]="getPreviewValue(field.name) === opt.value">{{ opt.label }}</option>
                            }
                          </select>
                        }
                        @case ('multiselect') {
                          <div class="multiselect-preview">
                            @for (opt of field.config['options'] || []; track opt.value) {
                              <label class="multiselect-option">
                                <input
                                  type="checkbox"
                                  [checked]="isMultiselectChecked(field.name, opt.value)"
                                  [disabled]="isFieldDisabled(field)"
                                  (change)="onMultiselectChange(field.name, opt.value, getChecked($event))"
                                />
                                {{ opt.label }}
                              </label>
                            }
                          </div>
                        }
                        @case ('boolean') {
                          <input
                            type="checkbox"
                            [checked]="isPreviewChecked(field.name)"
                            [disabled]="isFieldDisabled(field)"
                            (change)="onPreviewInput(field.name, getChecked($event))"
                          />
                        }
                        @case ('date') {
                          <input
                            type="date"
                            [value]="getPreviewValue(field.name)"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('time') {
                          <input
                            type="time"
                            [value]="getPreviewValue(field.name)"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('color') {
                          <input
                            type="color"
                            [value]="getPreviewValue(field.name) || '#000000'"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                          />
                        }
                        @case ('url') {
                          <input
                            type="url"
                            [value]="getPreviewValue(field.name)"
                            placeholder="https://"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('phone') {
                          <input
                            type="tel"
                            [value]="getPreviewValue(field.name)"
                            placeholder="+90 5XX XXX XX XX"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                        @case ('file') {
                          <input
                            type="file"
                            [accept]="field.config['accept'] || '*'"
                            [disabled]="isFieldDisabled(field)"
                          />
                        }
                        @case ('rating') {
                          <div class="rating-preview" [class.disabled]="isFieldDisabled(field)">
                            @for (star of getStars(field.config['max'] || 5); track star) {
                              <span
                                class="star"
                                [class.filled]="isStarFilled(field.name, star)"
                                (click)="!isFieldDisabled(field) && onPreviewInput(field.name, star + 1)"
                              >{{ isStarFilled(field.name, star) ? '★' : '☆' }}</span>
                            }
                          </div>
                        }
                        @case ('money') {
                          <div class="money-input">
                            <span class="currency-symbol">{{ getCurrencySymbol(field.config['currency']) }}</span>
                            <input
                              type="number"
                              [value]="getPreviewValue(field.name)"
                              [min]="field.config['min']"
                              [max]="field.config['max']"
                              step="0.01"
                              [disabled]="isFieldDisabled(field)"
                              (input)="onPreviewInput(field.name, getNumberValue($event))"
                              (blur)="onPreviewBlur(field.name, getNumberValue($event))"
                            />
                          </div>
                        }
                        @case ('percent') {
                          <div class="percent-input">
                            <input
                              type="number"
                              [value]="getPreviewValue(field.name)"
                              [min]="field.config['min'] || 0"
                              [max]="field.config['max'] || 100"
                              [disabled]="isFieldDisabled(field)"
                              (input)="onPreviewInput(field.name, getNumberValue($event))"
                              (blur)="onPreviewBlur(field.name, getNumberValue($event))"
                            />
                            <span class="percent-symbol">%</span>
                          </div>
                        }
                        @case ('tags') {
                          <div class="tags-input">
                            <div class="tags-list">
                              @for (tag of getTagsList(field.name); track tag) {
                                <span class="tag">
                                  {{ tag }}
                                  <button type="button" (click)="removeTag(field.name, tag)">×</button>
                                </span>
                              }
                            </div>
                            <input
                              type="text"
                              [placeholder]="lang() === 'tr' ? 'Etiket ekle (Enter)' : 'Add tag (Enter)'"
                              [disabled]="isFieldDisabled(field)"
                              (keydown.enter)="addTag(field.name, $event)"
                            />
                          </div>
                        }
                        @case ('slug') {
                          <input
                            type="text"
                            [value]="getPreviewValue(field.name)"
                            placeholder="url-slug-ornegi"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, slugify(getValue($event)))"
                            (blur)="onPreviewBlur(field.name, getPreviewValue(field.name))"
                          />
                        }
                        @case ('json') {
                          <textarea
                            [value]="getPreviewValue(field.name)"
                            rows="4"
                            placeholder='{{ "{" }}"key": "value"{{ "}" }}'
                            class="json-textarea"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onJsonBlur(field.name, getValue($event))"
                          ></textarea>
                        }
                        @case ('slider') {
                          <div class="slider-input">
                            <input
                              type="range"
                              [value]="getPreviewValue(field.name) || field.config['min'] || 0"
                              [min]="field.config['min'] || 0"
                              [max]="field.config['max'] || 100"
                              [step]="field.config['step'] || 1"
                              [disabled]="isFieldDisabled(field)"
                              (input)="onPreviewInput(field.name, getNumberValue($event))"
                            />
                            @if (field.config['showValue'] !== false) {
                              <span class="slider-value">{{ getPreviewValue(field.name) || field.config['min'] || 0 }}{{ field.config['unit'] || '' }}</span>
                            }
                          </div>
                        }
                        @case ('calculated') {
                          <div class="calculated-field">
                            <input
                              type="text"
                              [value]="getCalculatedValue(field)"
                              disabled
                              class="calculated-value"
                            />
                            @if (field.config['formula']) {
                              <span class="formula-indicator" [title]="field.config['formula']">fx</span>
                            }
                          </div>
                        }
                        @case ('signature') {
                          <app-signature-field
                            [width]="$any(field.config['width']) || 400"
                            [height]="$any(field.config['height']) || 150"
                            [penColor]="$any(field.config['penColor']) || '#000000'"
                            [backgroundColor]="$any(field.config['backgroundColor']) || '#ffffff'"
                            [disabled]="isFieldDisabled(field)"
                            [value]="getPreviewValue(field.name)"
                            [lang]="lang()"
                            (valueChange)="onPreviewInput(field.name, $event)"
                          />
                        }
                        @default {
                          <input
                            type="text"
                            [value]="getPreviewValue(field.name)"
                            [placeholder]="field.config['placeholder'] || ''"
                            [disabled]="isFieldDisabled(field)"
                            (input)="onPreviewInput(field.name, getValue($event))"
                            (blur)="onPreviewBlur(field.name, getValue($event))"
                          />
                        }
                      }

                      @if (field.config['hint']) {
                        <span class="hint">{{ field.config['hint'] }}</span>
                      }

                      @if (previewErrors()[field.name]) {
                        <span class="error-message">{{ previewErrors()[field.name] }}</span>
                      }
                    </div>
                  }
                }
                <div class="preview-buttons">
                  <button class="btn-submit" type="button" (click)="saveFormResponse()">
                    {{ service.settings().submitButtonText[lang()] }}
                  </button>
                  @if (service.settings().showReset) {
                    <button class="btn-reset" type="button" (click)="resetPreview()">
                      {{ service.settings().resetButtonText[lang()] }}
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Import from URL Modal -->
      @if (showImportUrl()) {
        <div class="modal-overlay" (click)="showImportUrl.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ t('importFromUrl') }}</h3>
              <button class="btn-close" (click)="showImportUrl.set(false)">✕</button>
            </div>
            <div class="modal-body">
              <div class="config-group">
                <label>URL</label>
                <input type="url" placeholder="https://api.example.com/form.json" #urlInput />
              </div>
              <button class="btn-submit" (click)="importFromUrl(urlInput.value)">
                {{ t('import') }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Cross-Validator Modal -->
      @if (showCrossValidatorModal()) {
        <div class="modal-overlay" (click)="showCrossValidatorModal.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ t('addCrossValidator') }}</h3>
              <button class="btn-close" (click)="showCrossValidatorModal.set(false)">✕</button>
            </div>
            <div class="modal-body">
              <div class="config-group">
                <label>{{ t('name') }}</label>
                <input type="text" [(ngModel)]="newValidator.name" placeholder="passwordMatch" />
              </div>
              <div class="config-group">
                <label>{{ t('type') }}</label>
                <select [(ngModel)]="newValidator.type">
                  <option value="fieldsMatch">{{ t('fieldsMatch') }}</option>
                  <option value="atLeastOne">{{ t('atLeastOne') }}</option>
                  <option value="custom">{{ t('custom') }}</option>
                </select>
              </div>
              <div class="config-group">
                <label>{{ t('fields') }}</label>
                <div class="field-checkboxes">
                  @for (field of service.fields(); track field.id) {
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="newValidator.fields.includes(field.name)"
                        (change)="toggleValidatorField(field.name, getChecked($event))"
                      />
                      <span>{{ field.label }}</span>
                    </label>
                  }
                </div>
              </div>
              <div class="config-group">
                <label>{{ t('errorMessage') }} (TR)</label>
                <input type="text" [(ngModel)]="newValidator.message.tr" />
              </div>
              <div class="config-group">
                <label>{{ t('errorMessage') }} (EN)</label>
                <input type="text" [(ngModel)]="newValidator.message.en" />
              </div>
              @if (newValidator.type === 'custom') {
                <div class="config-group">
                  <label>{{ t('customExpression') }}</label>
                  <textarea [(ngModel)]="newValidator.customExpression" rows="3" placeholder="return values.field1 === values.field2 ? null : 'Error';"></textarea>
                </div>
              }
              <button class="btn-submit" (click)="addCrossValidator()">
                {{ t('add') }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ========================================
       CSS Variables & Themes
       ======================================== */
    .builder-container {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --text-primary: #eee;
      --text-secondary: #888;
      --accent: #e94560;
      --accent-hover: #ff6b6b;
      --border: #0f3460;
      --success: #27ae60;
      --error: #e74c3c;
      --warning: #f39c12;

      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .builder-container.light-theme {
      --bg-primary: #f5f5f5;
      --bg-secondary: #ffffff;
      --bg-tertiary: #e0e0e0;
      --text-primary: #333;
      --text-secondary: #666;
      --border: #ddd;
    }

    /* ========================================
       Header
       ======================================== */
    .builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      gap: 20px;
    }

    .header-left h1 {
      margin: 0;
      font-size: 1.3rem;
      color: var(--accent);
    }

    .header-left p {
      margin: 3px 0 0;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .header-center {
      flex: 1;
      display: flex;
      justify-content: center;
    }

    .form-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-selector select {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 8px 12px;
      border-radius: 5px;
      min-width: 200px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .undo-redo {
      display: flex;
      gap: 5px;
    }

    .btn-icon {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-icon:hover:not(:disabled) {
      background: var(--accent);
    }

    .btn-icon:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-icon.btn-delete:hover:not(:disabled) {
      background: var(--error);
    }

    .btn-lang {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: none;
      padding: 8px 12px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .btn-lang:hover {
      background: var(--accent);
    }

    /* ========================================
       Main Layout
       ======================================== */
    .builder-main {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .panel {
      overflow-y: auto;
      padding: 15px;
    }

    .panel-left {
      width: 240px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
    }

    .panel-center {
      flex: 1;
      background: var(--bg-primary);
    }

    .panel-right {
      width: 380px;
      background: var(--bg-secondary);
      border-left: 1px solid var(--border);
    }

    /* ========================================
       Left Panel - Field Types
       ======================================== */
    .panel-left h3 {
      margin: 0 0 15px;
      color: var(--accent);
      font-size: 1rem;
    }

    .templates-section {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--border);
    }

    .templates-section h4,
    .category-section h4 {
      color: var(--text-secondary);
      font-size: 0.8rem;
      margin: 0 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .template-buttons {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .template-btn {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: none;
      padding: 8px 10px;
      border-radius: 5px;
      cursor: pointer;
      text-align: left;
      font-size: 0.85rem;
      transition: all 0.2s;
    }

    .template-btn:hover {
      background: var(--accent);
    }

    .category-section {
      margin-bottom: 15px;
    }

    .field-type-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-type-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: var(--bg-tertiary);
      border-radius: 5px;
      cursor: grab;
      font-size: 0.85rem;
      transition: all 0.2s;
    }

    .field-type-item:hover {
      background: var(--accent);
      transform: translateX(3px);
    }

    .field-type-item:active {
      cursor: grabbing;
    }

    .field-icon {
      font-size: 1rem;
    }

    .add-group-section {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid var(--border);
    }

    .btn-add-group {
      width: 100%;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 2px dashed var(--border);
      padding: 10px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .btn-add-group:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    /* ========================================
       Center Panel - Canvas
       ======================================== */
    .canvas-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .canvas-header h3 {
      margin: 0;
      color: var(--accent);
      font-size: 1rem;
    }

    .canvas-actions {
      display: flex;
      gap: 8px;
    }

    .btn-action {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: none;
      padding: 6px 12px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .btn-action:hover:not(:disabled) {
      background: var(--accent);
    }

    .btn-action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .form-canvas {
      min-height: 400px;
      background: var(--bg-tertiary);
      border-radius: 8px;
      padding: 15px;
      border: 2px dashed var(--accent);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: var(--text-secondary);
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 10px;
    }

    /* Field Groups */
    .field-group {
      background: var(--bg-secondary);
      border-radius: 8px;
      margin-bottom: 10px;
      border: 2px solid transparent;
      overflow: hidden;
    }

    .field-group.selected {
      border-color: var(--accent);
    }

    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      background: var(--bg-tertiary);
      cursor: pointer;
    }

    .group-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }

    .btn-collapse {
      background: none;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      padding: 0;
      font-size: 0.8rem;
    }

    .group-icon {
      font-size: 1rem;
    }

    .group-count {
      color: var(--text-secondary);
      font-weight: normal;
      font-size: 0.85rem;
    }

    .group-actions {
      display: flex;
      gap: 5px;
    }

    .group-content {
      padding: 10px;
      min-height: 50px;
    }

    .empty-group {
      text-align: center;
      color: var(--text-secondary);
      padding: 20px;
      font-size: 0.85rem;
    }

    /* Canvas Fields */
    .canvas-field {
      background: var(--bg-secondary);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
    }

    .canvas-field:hover {
      border-color: var(--accent);
    }

    .canvas-field.selected {
      border-color: var(--accent);
      background: var(--bg-primary);
    }

    .canvas-field.drag-over {
      border-color: var(--success);
      border-style: dashed;
    }

    .field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .field-type-badge {
      background: var(--accent);
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
    }

    .field-actions {
      display: flex;
      gap: 4px;
    }

    .field-actions .btn-icon {
      width: 26px;
      height: 26px;
      font-size: 0.75rem;
    }

    .field-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-name {
      color: var(--text-secondary);
      font-size: 0.75rem;
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 3px;
      width: fit-content;
      font-family: monospace;
    }

    .field-config-preview {
      display: flex;
      gap: 5px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .config-badge {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.65rem;
    }

    .config-badge.required {
      background: var(--accent);
      color: #fff;
    }

    .config-badge.condition {
      background: var(--warning);
      color: #000;
    }

    .config-badge.group {
      background: var(--success);
      color: #fff;
    }

    /* ========================================
       Right Panel - Tabs & Content
       ======================================== */
    .panel-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }

    .tab-btn {
      flex: 1;
      min-width: 70px;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: none;
      padding: 8px 6px;
      cursor: pointer;
      border-radius: 5px;
      font-size: 0.75rem;
      transition: all 0.2s;
    }

    .tab-btn.active {
      background: var(--accent);
    }

    .tab-content {
      padding: 15px;
      background: var(--bg-tertiary);
      border-radius: 8px;
      max-height: calc(100vh - 180px);
      overflow-y: auto;
    }

    .tab-content h4 {
      margin: 0 0 15px;
      color: var(--accent);
      font-size: 0.95rem;
    }

    .tab-content h5 {
      margin: 20px 0 10px;
      color: var(--text-secondary);
      font-size: 0.85rem;
    }

    .tab-content hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 15px 0;
    }

    .no-selection {
      text-align: center;
      color: var(--text-secondary);
      padding: 30px;
    }

    /* Config Form */
    .config-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .config-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .config-group > label {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .config-group input[type="text"],
    .config-group input[type="number"],
    .config-group input[type="url"],
    .config-group select,
    .config-group textarea {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 8px 10px;
      border-radius: 5px;
      font-size: 0.85rem;
    }

    .config-group input:focus,
    .config-group select:focus,
    .config-group textarea:focus {
      outline: none;
      border-color: var(--accent);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    /* Options Editor */
    .options-editor {
      background: var(--bg-secondary);
      padding: 10px;
      border-radius: 5px;
    }

    .options-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 10px;
    }

    .option-row {
      display: flex;
      gap: 5px;
    }

    .option-row input {
      flex: 1;
      background: var(--bg-tertiary) !important;
      padding: 6px 8px !important;
    }

    .option-row .btn-icon {
      width: 28px;
      height: 28px;
    }

    .btn-add-option,
    .btn-add-condition,
    .btn-add-validator {
      width: 100%;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px dashed var(--border);
      padding: 8px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .btn-add-option:hover,
    .btn-add-condition:hover,
    .btn-add-validator:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    /* Condition Editor */
    .config-section {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid var(--border);
    }

    .condition-editor {
      margin-bottom: 10px;
    }

    .condition-editor > label {
      display: block;
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-bottom: 5px;
    }

    .condition-row {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    }

    .condition-row select,
    .condition-row input {
      flex: 1;
      min-width: 80px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 6px 8px;
      border-radius: 5px;
      font-size: 0.8rem;
    }

    /* Cross Validator */
    .cross-validator-item {
      background: var(--bg-secondary);
      border-radius: 5px;
      padding: 10px;
      margin-bottom: 8px;
    }

    .validator-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      margin-bottom: 5px;
    }

    .validator-details {
      display: flex;
      gap: 10px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .validator-type {
      background: var(--accent);
      color: #fff;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .field-checkboxes {
      display: flex;
      flex-direction: column;
      gap: 5px;
      max-height: 150px;
      overflow-y: auto;
      background: var(--bg-secondary);
      padding: 10px;
      border-radius: 5px;
    }

    /* Preview */
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .preview-header h4 {
      margin: 0;
    }

    .preview-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .wizard-toggle {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 5px 10px;
      background: var(--bg-tertiary);
      border-radius: 5px;
      transition: all 0.2s;
    }

    .wizard-toggle:hover {
      background: var(--accent);
    }

    .wizard-toggle input {
      cursor: pointer;
    }

    /* Zignal Toggle */
    .zignal-toggle {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 5px 12px;
      background: var(--bg-tertiary);
      border-radius: 5px;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .zignal-toggle:hover {
      background: #4f46e5;
      color: #fff;
    }

    .zignal-toggle.active {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      border-color: #6366f1;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    .zignal-toggle input {
      cursor: pointer;
    }

    /* Logic Content */
    .logic-content {
      padding: 0 !important;
    }

    /* Repeatable Settings */
    .repeatable-settings {
      background: var(--bg-tertiary);
      border-radius: 5px;
      padding: 10px;
      margin-top: 10px;
      border: 1px dashed var(--accent);
    }

    .repeatable-settings .config-group {
      margin-bottom: 8px;
    }

    .repeatable-settings .config-group:last-child {
      margin-bottom: 0;
    }

    /* Device Selector */
    .device-selector {
      display: flex;
      gap: 4px;
      background: var(--bg-tertiary);
      padding: 3px;
      border-radius: 6px;
    }

    .device-btn {
      background: transparent;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      opacity: 0.5;
      transition: all 0.2s;
    }

    .device-btn:hover {
      opacity: 0.8;
    }

    .device-btn.active {
      background: var(--accent);
      opacity: 1;
    }

    /* Device Preview Frame */
    .preview-device-frame {
      transition: all 0.3s ease;
      margin: 0 auto;
      background: var(--bg-secondary);
      border: 2px solid var(--border);
      border-radius: 12px;
      padding: 15px;
      overflow-y: auto;
      max-height: 600px;
    }

    .preview-device-frame.device-mobile {
      max-width: 375px;
      border-radius: 24px;
      border-width: 8px;
      border-color: #333;
    }

    .preview-device-frame.device-tablet {
      max-width: 768px;
      border-radius: 16px;
      border-width: 6px;
      border-color: #444;
    }

    .preview-device-frame.device-desktop {
      max-width: 100%;
      border: none;
      padding: 0;
    }

    .preview-form {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
    }

    /* Grid Layout Classes */
    .preview-field.col-100 { width: 100%; }
    .preview-field.col-50 { width: calc(50% - 8px); }
    .preview-field.col-33 { width: calc(33.333% - 10px); }
    .preview-field.col-25 { width: calc(25% - 12px); }

    @media (max-width: 768px) {
      .preview-field.col-50,
      .preview-field.col-33,
      .preview-field.col-25 {
        width: 100%;
      }
    }

    .preview-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .preview-field.has-error input,
    .preview-field.has-error select,
    .preview-field.has-error textarea {
      border-color: var(--error);
    }

    .preview-field label {
      font-weight: 500;
      font-size: 0.9rem;
    }

    .required-star {
      color: var(--accent);
    }

    .preview-field input,
    .preview-field select,
    .preview-field textarea {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 10px;
      border-radius: 5px;
    }

    .preview-field .hint {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .preview-field .error-message {
      font-size: 0.8rem;
      color: var(--error);
      margin-top: 4px;
      display: block;
      font-weight: 500;
    }

    .preview-field.field-disabled {
      opacity: 0.6;
    }

    .preview-field.field-disabled input,
    .preview-field.field-disabled select,
    .preview-field.field-disabled textarea {
      cursor: not-allowed;
      background: var(--bg-tertiary);
    }

    .rating-preview {
      font-size: 1.5rem;
      cursor: pointer;
    }

    .rating-preview .star {
      color: var(--text-secondary);
      transition: color 0.2s;
    }

    .rating-preview .star.filled {
      color: var(--warning);
    }

    .rating-preview.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .rating-preview.disabled .star {
      pointer-events: none;
    }

    /* Multiselect Styles */
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

    /* Money Input Styles */
    .money-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .money-input .currency-symbol {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .money-input input {
      flex: 1;
    }

    /* Percent Input Styles */
    .percent-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .percent-input input {
      flex: 1;
    }

    .percent-input .percent-symbol {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    /* Tags Input Styles */
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
      background: var(--accent);
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

    .tags-list .tag button:hover {
      opacity: 0.8;
    }

    /* JSON Textarea Styles */
    .json-textarea {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.85rem;
    }

    /* Slider Input Styles */
    .slider-input {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .slider-input input[type="range"] {
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: var(--bg-tertiary);
      appearance: none;
      cursor: pointer;
    }

    .slider-input input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--accent);
      cursor: pointer;
      transition: transform 0.2s;
    }

    .slider-input input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.1);
    }

    .slider-value {
      min-width: 50px;
      text-align: right;
      font-weight: 500;
      color: var(--accent);
    }

    /* Calculated Field Styles */
    .calculated-field {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .calculated-field .calculated-value {
      flex: 1;
      background: var(--bg-tertiary);
      color: var(--accent);
      font-weight: 600;
      cursor: not-allowed;
    }

    .formula-indicator {
      background: var(--accent);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      font-style: italic;
      cursor: help;
    }

    .preview-buttons {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }

    .btn-submit {
      flex: 1;
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 12px;
      border-radius: 5px;
      font-size: 0.95rem;
      cursor: pointer;
    }

    .btn-submit:hover {
      background: var(--accent-hover);
    }

    .btn-reset {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border);
      padding: 12px 20px;
      border-radius: 5px;
      cursor: pointer;
    }

    /* Export Tab */
    .export-format-selector {
      display: flex;
      gap: 5px;
      margin-bottom: 15px;
    }

    .format-btn {
      flex: 1;
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border);
      padding: 10px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .format-btn.active {
      background: var(--accent);
      border-color: var(--accent);
    }

    .json-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .json-output {
      background: var(--bg-secondary);
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-size: 0.75rem;
      max-height: 250px;
      overflow-y: auto;
      font-family: 'Fira Code', monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .json-input {
      width: 100%;
      min-height: 80px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      margin-bottom: 10px;
      box-sizing: border-box;
      font-size: 0.8rem;
    }

    .import-actions {
      display: flex;
      gap: 10px;
    }

    /* ========================================
       Modals
       ======================================== */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: var(--bg-secondary);
      border-radius: 10px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-large {
      max-width: 800px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border);
    }

    .modal-header h3 {
      margin: 0;
      color: var(--accent);
    }

    .btn-close {
      background: none;
      border: none;
      color: var(--text-primary);
      font-size: 1.2rem;
      cursor: pointer;
      padding: 5px;
    }

    .btn-close:hover {
      color: var(--accent);
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
    }

    .shortcuts-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .shortcut-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .shortcut-item kbd {
      background: var(--bg-tertiary);
      padding: 5px 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85rem;
    }

    .shortcut-item span {
      color: var(--text-secondary);
    }

    .preview-modal-body {
      background: var(--bg-primary);
    }

    .full-preview-form {
      max-width: 600px;
      margin: 0 auto;
    }

    .full-preview-form.layout-horizontal .preview-field {
      flex-direction: row;
      align-items: center;
    }

    .full-preview-form.layout-horizontal .preview-field label {
      width: 150px;
      flex-shrink: 0;
    }

    /* ========================================
       Webhook & Email Settings
       ======================================== */
    .btn-test-webhook {
      margin-top: 8px;
      padding: 8px 16px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .btn-test-webhook:hover {
      background: var(--accent-hover);
      transform: translateY(-1px);
    }

    .help-text {
      display: block;
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    /* ========================================
       Response Viewer Styles
       ======================================== */
    .response-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: 12px;
      background: var(--bg-tertiary);
      border-radius: 8px;
    }

    .response-count {
      font-weight: 600;
      color: var(--accent);
      margin-right: auto;
    }

    .btn-view-responses,
    .btn-export-responses,
    .btn-clear-responses {
      padding: 6px 12px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }

    .btn-view-responses {
      background: var(--accent);
      color: #fff;
    }

    .btn-view-responses:hover {
      background: var(--accent-hover);
    }

    .btn-export-responses {
      background: var(--success);
      color: #fff;
    }

    .btn-export-responses:hover {
      opacity: 0.9;
    }

    .btn-clear-responses {
      background: var(--error);
      color: #fff;
    }

    .btn-clear-responses:hover {
      opacity: 0.9;
    }

    /* Response Viewer Modal */
    .response-viewer-body {
      padding: 0 !important;
    }

    .empty-responses {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }

    .empty-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 16px;
    }

    .response-list {
      max-height: 500px;
      overflow-y: auto;
    }

    .response-item {
      border-bottom: 1px solid var(--border);
    }

    .response-item:last-child {
      border-bottom: none;
    }

    .response-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .response-header:hover {
      background: var(--bg-tertiary);
    }

    .response-number {
      font-weight: 700;
      color: var(--accent);
      min-width: 40px;
    }

    .response-date {
      flex: 1;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .expand-icon {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    .response-details {
      padding: 0 16px 16px;
      background: var(--bg-tertiary);
    }

    .response-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-primary);
      border-radius: 8px;
      overflow: hidden;
    }

    .response-table th,
    .response-table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .response-table th {
      background: var(--bg-secondary);
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .response-table td.field-name {
      font-weight: 500;
      color: var(--accent);
      width: 40%;
    }

    .response-table td.field-value {
      color: var(--text-primary);
    }

    .signature-preview {
      max-width: 150px;
      max-height: 60px;
      border: 1px solid var(--border);
      border-radius: 4px;
    }

    .response-actions {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
    }

    .btn-delete-response {
      padding: 6px 12px;
      background: var(--error);
      color: #fff;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: opacity 0.2s;
    }

    .btn-delete-response:hover {
      opacity: 0.9;
    }

    /* ========================================
       Responsive
       ======================================== */
    @media (max-width: 1200px) {
      .builder-main {
        flex-direction: column;
      }

      .panel-left,
      .panel-right {
        width: 100%;
        max-height: 300px;
      }

      .header-center {
        display: none;
      }
    }
  `],
})
export class FormBuilderComponent implements OnInit, OnDestroy {
  // Services
  service = inject(FormBuilderService);
  codeGenerator = inject(CodeGeneratorService);
  pdfExport = inject(PdfExportService);

  // State
  activeTab = signal<ActiveTab | 'logic'>('config');
  exportFormat = signal<ExportFormat>('json');
  showShortcuts = signal(false);
  showFullPreview = signal(false);
  showImportUrl = signal(false);
  showCrossValidatorModal = signal(false);

  // Wizard state
  wizardMode = signal(false);
  wizardConfig: WizardConfig = DEFAULT_WIZARD_CONFIG;

  // Zignal preview mode
  zignalPreviewMode = signal(false);
  zignalService = inject(ZignalFormService);

  // Device preview state
  previewDevice = signal<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Preview state
  previewValues = signal<Record<string, unknown>>({});
  previewErrors = signal<Record<string, string>>({});

  // Response storage (simulated submissions)
  formResponses = signal<Array<{ id: string; timestamp: Date; values: Record<string, unknown> }>>([]);
  showResponseViewer = signal(false);
  expandedResponseId = signal<string | null>(null);

  // Webhook settings
  webhookEnabled = signal(false);
  webhookUrl = signal('');
  webhookMethod = signal('POST');
  webhookHeaders = signal('');

  // Email notification settings
  emailNotificationEnabled = signal(false);
  notifyEmails = signal('');
  emailSubject = signal('');
  includeFormDataInEmail = signal(true);

  // Drag state
  private draggedFieldType: FieldTypeConfig | null = null;
  private draggedField: FormFieldDef | null = null;
  private draggedIndex: number = -1;

  // New validator form
  newValidator = {
    name: '',
    type: 'fieldsMatch' as 'fieldsMatch' | 'atLeastOne' | 'custom',
    fields: [] as string[],
    message: { tr: '', en: '' },
    customExpression: '',
  };

  // Data
  fieldTypesData = fieldTypes;
  categories = fieldCategories;
  templates = sampleTemplates;
  operators: ConditionalRule['operator'][] = ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'];

  // Computed
  lang = computed(() => this.service.language());

  currentExport = computed(() => {
    return this.codeGenerator.generate(this.service.currentForm(), this.exportFormat());
  });

  // Translations
  private translations: Record<string, Record<string, string>> = {
    tr: {
      subtitle: 'Drag & Drop Form Tasarımı',
      fieldTypes: 'Alan Tipleri',
      templates: 'Şablonlar',
      formFields: 'Form Alanları',
      clearAll: 'Temizle',
      paste: 'Yapıştır',
      config: 'Ayarlar',
      preview: 'Önizleme',
      settings: 'Form Ayarları',
      fieldSettings: 'Alan Ayarları',
      fieldName: 'Alan Adı (name)',
      fieldLabel: 'Etiket (label)',
      group: 'Grup',
      noGroup: 'Grupsuz',
      conditionalLogic: 'Koşullu Mantık',
      showWhen: 'Göster (showWhen)',
      hideWhen: 'Gizle (hideWhen)',
      disableWhen: 'Devre Dışı (disableWhen)',
      selectField: 'Alan seçin',
      addCondition: 'Koşul Ekle',
      groupSettings: 'Grup Ayarları',
      groupName: 'Grup Adı',
      groupLabel: 'Grup Etiketi',
      description: 'Açıklama',
      collapsible: 'Daraltılabilir',
      selectFieldToEdit: 'Düzenlemek için bir alan seçin',
      formPreview: 'Form Önizleme',
      fullscreen: 'Tam Ekran',
      addFieldsToPreview: 'Önizleme için alan ekleyin',
      select: 'Seçiniz',
      copy: 'Kopyala',
      download: 'İndir',
      importJson: 'JSON Yükle',
      pasteJson: 'JSON yapıştırın...',
      import: 'Yükle',
      importFromUrl: 'URL\'den Yükle',
      formName: 'Form Adı',
      formDescription: 'Form Açıklaması',
      submitButtonText: 'Gönder Butonu',
      showResetButton: 'Sıfırla Butonu Göster',
      validateOnBlur: 'Blur\'da Doğrula',
      validateOnChange: 'Değişimde Doğrula',
      layout: 'Düzen',
      labelPosition: 'Etiket Pozisyonu',
      size: 'Boyut',
      crossValidators: 'Cross-field Validatorler',
      addCrossValidator: 'Validator Ekle',
      required: 'Zorunlu',
      hasCondition: 'Koşullu',
      emptyCanvas: 'Buraya alan eklemek için soldan sürükleyin veya tıklayın',
      dropFieldsHere: 'Alanları buraya sürükleyin',
      addGroup: 'Grup Ekle',
      newForm: 'Yeni Form',
      saveForm: 'Kaydet',
      deleteForm: 'Sil',
      undo: 'Geri Al',
      redo: 'İleri Al',
      toggleTheme: 'Tema Değiştir',
      keyboardShortcuts: 'Klavye Kısayolları',
      copyField: 'Alanı Kopyala',
      pasteField: 'Alanı Yapıştır',
      duplicateField: 'Alanı Çoğalt',
      deleteField: 'Alanı Sil',
      deselect: 'Seçimi Kaldır',
      addOption: 'Seçenek Ekle',
      name: 'Ad',
      type: 'Tip',
      fields: 'Alanlar',
      errorMessage: 'Hata Mesajı',
      customExpression: 'Özel İfade',
      add: 'Ekle',
      fieldsMatch: 'Alanlar Eşleşmeli',
      atLeastOne: 'En Az Biri',
      custom: 'Özel',
      logic: 'Mantık',
      wizardMode: 'Sihirbaz Modu',
      wizardNeedsGroups: 'Sihirbaz modu için grup eklemeniz gerekiyor',
      zignalPreview: 'Zignal Önizleme',
      zignalMode: 'Zignal Modu',
      repeatableGroup: 'Tekrarlanabilir Grup',
      minItems: 'Minimum Öğe',
      maxItems: 'Maksimum Öğe',
      columnWidth: 'Sütun Genişliği',
      fullWidth: 'Tam Genişlik',
      halfWidth: 'Yarım',
      thirdWidth: 'Üçte Bir',
      quarterWidth: 'Çeyrek',
      responses: 'Yanıtlar',
      noResponses: 'Henüz yanıt yok',
      webhookIntegration: 'Webhook/API Entegrasyonu',
      enableWebhook: 'Webhook Etkinleştir',
      webhookUrl: 'Webhook URL',
      webhookMethod: 'HTTP Metodu',
      webhookHeaders: 'HTTP Headers',
      testWebhook: 'Webhook Test Et',
      emailNotification: 'E-posta Bildirimi',
      enableEmailNotification: 'E-posta Bildirimi Etkinleştir',
      notifyEmails: 'Bildirim E-postaları',
      separateWithComma: 'Virgülle ayırın',
      emailSubject: 'E-posta Konusu',
      newFormSubmission: 'Yeni Form Gönderimi',
      includeFormData: 'Form verilerini ekle',
      totalResponses: 'Toplam Yanıt',
      viewResponses: 'Yanıtları Görüntüle',
      exportCSV: 'CSV İndir',
      clearResponses: 'Yanıtları Temizle',
      value: 'Değer',
      delete: 'Sil',
      saveResponse: 'Yanıtı Kaydet',
    },
    en: {
      subtitle: 'Drag & Drop Form Design',
      fieldTypes: 'Field Types',
      templates: 'Templates',
      formFields: 'Form Fields',
      clearAll: 'Clear All',
      paste: 'Paste',
      config: 'Config',
      preview: 'Preview',
      settings: 'Form Settings',
      fieldSettings: 'Field Settings',
      fieldName: 'Field Name',
      fieldLabel: 'Label',
      group: 'Group',
      noGroup: 'No Group',
      conditionalLogic: 'Conditional Logic',
      showWhen: 'Show When',
      hideWhen: 'Hide When',
      disableWhen: 'Disable When',
      selectField: 'Select field',
      addCondition: 'Add Condition',
      groupSettings: 'Group Settings',
      groupName: 'Group Name',
      groupLabel: 'Group Label',
      description: 'Description',
      collapsible: 'Collapsible',
      selectFieldToEdit: 'Select a field to edit',
      formPreview: 'Form Preview',
      fullscreen: 'Fullscreen',
      addFieldsToPreview: 'Add fields to preview',
      select: 'Select',
      copy: 'Copy',
      download: 'Download',
      importJson: 'Import JSON',
      pasteJson: 'Paste JSON...',
      import: 'Import',
      importFromUrl: 'Import from URL',
      formName: 'Form Name',
      formDescription: 'Form Description',
      submitButtonText: 'Submit Button',
      showResetButton: 'Show Reset Button',
      validateOnBlur: 'Validate on Blur',
      validateOnChange: 'Validate on Change',
      layout: 'Layout',
      labelPosition: 'Label Position',
      size: 'Size',
      crossValidators: 'Cross-field Validators',
      addCrossValidator: 'Add Validator',
      required: 'Required',
      hasCondition: 'Conditional',
      emptyCanvas: 'Drag from left or click to add fields here',
      dropFieldsHere: 'Drop fields here',
      addGroup: 'Add Group',
      newForm: 'New Form',
      saveForm: 'Save',
      deleteForm: 'Delete',
      undo: 'Undo',
      redo: 'Redo',
      toggleTheme: 'Toggle Theme',
      keyboardShortcuts: 'Keyboard Shortcuts',
      copyField: 'Copy Field',
      pasteField: 'Paste Field',
      duplicateField: 'Duplicate Field',
      deleteField: 'Delete Field',
      deselect: 'Deselect',
      addOption: 'Add Option',
      name: 'Name',
      type: 'Type',
      fields: 'Fields',
      errorMessage: 'Error Message',
      customExpression: 'Custom Expression',
      add: 'Add',
      fieldsMatch: 'Fields Match',
      atLeastOne: 'At Least One',
      custom: 'Custom',
      logic: 'Logic',
      wizardMode: 'Wizard Mode',
      wizardNeedsGroups: 'You need to add groups for wizard mode',
      zignalPreview: 'Zignal Preview',
      zignalMode: 'Zignal Mode',
      repeatableGroup: 'Repeatable Group',
      minItems: 'Minimum Items',
      maxItems: 'Maximum Items',
      columnWidth: 'Column Width',
      fullWidth: 'Full Width',
      halfWidth: 'Half',
      thirdWidth: 'Third',
      quarterWidth: 'Quarter',
      responses: 'Responses',
      noResponses: 'No responses yet',
      webhookIntegration: 'Webhook/API Integration',
      enableWebhook: 'Enable Webhook',
      webhookUrl: 'Webhook URL',
      webhookMethod: 'HTTP Method',
      webhookHeaders: 'HTTP Headers',
      testWebhook: 'Test Webhook',
      emailNotification: 'Email Notification',
      enableEmailNotification: 'Enable Email Notification',
      notifyEmails: 'Notification Emails',
      separateWithComma: 'Separate with comma',
      emailSubject: 'Email Subject',
      newFormSubmission: 'New Form Submission',
      includeFormData: 'Include form data',
      totalResponses: 'Total Responses',
      viewResponses: 'View Responses',
      exportCSV: 'Export CSV',
      clearResponses: 'Clear Responses',
      value: 'Value',
      delete: 'Delete',
      saveResponse: 'Save Response',
    },
  };

  ngOnInit(): void {
    // Any initialization
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl/Cmd + Z = Undo
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.service.undo();
    }

    // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z = Redo
    if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
      event.preventDefault();
      this.service.redo();
    }

    // Ctrl/Cmd + S = Save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.saveForm();
    }

    // Ctrl/Cmd + C = Copy selected field
    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && this.service.selectedFieldId()) {
      event.preventDefault();
      this.service.copyField(this.service.selectedFieldId()!);
    }

    // Ctrl/Cmd + V = Paste
    if ((event.ctrlKey || event.metaKey) && event.key === 'v' && this.service.hasClipboard()) {
      event.preventDefault();
      this.service.pasteField();
    }

    // Ctrl/Cmd + D = Duplicate
    if ((event.ctrlKey || event.metaKey) && event.key === 'd' && this.service.selectedFieldId()) {
      event.preventDefault();
      this.service.duplicateField(this.service.selectedFieldId()!);
    }

    // Delete = Remove selected field
    if (event.key === 'Delete' && this.service.selectedFieldId()) {
      event.preventDefault();
      this.service.removeField(this.service.selectedFieldId()!);
    }

    // Escape = Deselect
    if (event.key === 'Escape') {
      this.service.selectField(null);
      this.service.selectGroup(null);
      this.showShortcuts.set(false);
      this.showFullPreview.set(false);
      this.showImportUrl.set(false);
      this.showCrossValidatorModal.set(false);
    }
  }

  // Translation helper
  t(key: string): string {
    return this.translations[this.lang()]?.[key] || key;
  }

  // Field type helpers
  getFieldsByCategory(categoryId: string): FieldTypeConfig[] {
    return this.fieldTypesData.filter(f => f.category === categoryId);
  }

  getFieldTypeIcon(type: string): string {
    return this.fieldTypesData.find(f => f.type === type)?.icon ?? '📝';
  }

  getConfigOptions(type: string) {
    return this.fieldTypesData.find(f => f.type === type)?.configOptions ?? [];
  }

  // Drag & Drop - From type list
  onDragStartType(event: DragEvent, fieldType: FieldTypeConfig): void {
    this.draggedFieldType = fieldType;
    this.draggedField = null;
    event.dataTransfer?.setData('text/plain', 'type:' + fieldType.type);
  }

  // Drag & Drop - From canvas (reorder)
  onDragStartField(event: DragEvent, field: FormFieldDef, index: number): void {
    this.draggedField = field;
    this.draggedFieldType = null;
    this.draggedIndex = index;
    event.dataTransfer?.setData('text/plain', 'field:' + field.id);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragOverField(event: DragEvent, index: number): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDropToCanvas(event: DragEvent): void {
    event.preventDefault();
    if (this.draggedFieldType) {
      this.addFieldFromType(this.draggedFieldType);
      this.draggedFieldType = null;
    }
  }

  onDropToGroup(event: DragEvent, groupId: string): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.draggedFieldType) {
      this.addFieldFromType(this.draggedFieldType, groupId);
      this.draggedFieldType = null;
    } else if (this.draggedField) {
      this.service.moveFieldToGroup(this.draggedField.id, groupId);
      this.draggedField = null;
    }
  }

  onDropField(event: DragEvent, toIndex: number): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.draggedField && this.draggedIndex !== toIndex) {
      this.service.reorderFields(this.draggedIndex, toIndex);
    }
    this.draggedField = null;
    this.draggedIndex = -1;
  }

  // Field operations
  addFieldFromType(fieldType: FieldTypeConfig, groupId?: string): void {
    const label = this.lang() === 'tr' ? fieldType.label.tr : fieldType.label.en;
    this.service.addField({
      type: fieldType.type,
      name: this.generateFieldName(fieldType.type),
      label: label,
      config: { ...fieldType.defaultConfig },
    }, groupId);
  }

  selectField(field: FormFieldDef): void {
    this.service.selectField(field.id);
    this.activeTab.set('config');
  }

  selectGroup(group: FieldGroup): void {
    this.service.selectGroup(group.id);
    this.activeTab.set('config');
  }

  updateField(key: 'name' | 'label', value: string): void {
    const fieldId = this.service.selectedFieldId();
    if (fieldId) {
      this.service.updateField(fieldId, { [key]: value });
    }
  }

  updateFieldConfig(key: string, value: unknown): void {
    const fieldId = this.service.selectedFieldId();
    if (fieldId) {
      this.service.updateFieldConfig(fieldId, key, value);
    }
  }

  moveFieldToGroup(groupId: string): void {
    const fieldId = this.service.selectedFieldId();
    if (fieldId) {
      this.service.moveFieldToGroup(fieldId, groupId || undefined);
    }
  }

  // Group operations
  addGroup(): void {
    const name = 'group' + (this.service.groups().length + 1);
    const label = this.lang() === 'tr' ? 'Yeni Grup' : 'New Group';
    this.service.addGroup(name, label);
  }

  updateGroup(key: string, value: unknown): void {
    const groupId = this.service.selectedGroupId();
    if (groupId) {
      this.service.updateGroup(groupId, { [key]: value });
    }
  }

  toggleGroupCollapse(group: FieldGroup): void {
    this.service.updateGroup(group.id, { collapsed: !group.collapsed });
  }

  // Select options (for select/multiselect fields)
  getSelectOptions(): { value: string; label: string }[] {
    const field = this.service.selectedField();
    return (field?.config?.['options'] as { value: string; label: string }[]) ?? [];
  }

  updateSelectOption(index: number, key: 'value' | 'label', value: string): void {
    const options = [...this.getSelectOptions()];
    options[index] = { ...options[index], [key]: value };
    this.updateFieldConfig('options', options);
  }

  addSelectOption(): void {
    const options = [...this.getSelectOptions(), { value: '', label: '' }];
    this.updateFieldConfig('options', options);
  }

  removeSelectOption(index: number): void {
    const options = this.getSelectOptions().filter((_, i) => i !== index);
    this.updateFieldConfig('options', options);
  }

  // Conditional logic
  getOtherFields(): FormFieldDef[] {
    const selectedId = this.service.selectedFieldId();
    return this.service.fields().filter(f => f.id !== selectedId);
  }

  getOperatorLabel(operator: string): string {
    const labels = OPERATOR_LABELS[operator as keyof typeof OPERATOR_LABELS];
    return labels ? labels[this.lang()] : operator;
  }

  addCondition(type: 'showWhen' | 'hideWhen' | 'disableWhen'): void {
    this.updateFieldConfig(type, { field: '', operator: 'equals', value: '' });
  }

  updateCondition(type: string, key: string, value: string): void {
    const field = this.service.selectedField();
    if (field) {
      const current = (field.config?.[type] as ConditionalRule) || { field: '', operator: 'equals', value: '' };
      this.updateFieldConfig(type, { ...current, [key]: value });
    }
  }

  removeCondition(type: string): void {
    const fieldId = this.service.selectedFieldId();
    if (fieldId) {
      const field = this.service.selectedField();
      if (field) {
        const newConfig = { ...field.config };
        delete newConfig[type];
        this.service.updateField(fieldId, { config: newConfig });
      }
    }
  }

  // Cross-field validators
  toggleValidatorField(fieldName: string, checked: boolean): void {
    if (checked) {
      this.newValidator.fields = [...this.newValidator.fields, fieldName];
    } else {
      this.newValidator.fields = this.newValidator.fields.filter(f => f !== fieldName);
    }
  }

  addCrossValidator(): void {
    if (this.newValidator.name && this.newValidator.fields.length >= 2) {
      this.service.addCrossValidator({
        name: this.newValidator.name,
        type: this.newValidator.type,
        fields: this.newValidator.fields,
        message: { ...this.newValidator.message },
        customExpression: this.newValidator.type === 'custom' ? this.newValidator.customExpression : undefined,
      });

      // Reset form
      this.newValidator = {
        name: '',
        type: 'fieldsMatch',
        fields: [],
        message: { tr: '', en: '' },
        customExpression: '',
      };
      this.showCrossValidatorModal.set(false);
    }
  }

  // Form settings
  updateSettings(key: string, value: unknown): void {
    this.service.updateSettings({ [key]: value });
  }

  updateFormMeta(key: 'name' | 'description', value: string): void {
    if (key === 'name') {
      this.service.updateFormMeta(value, this.service.currentForm().description);
    } else {
      this.service.updateFormMeta(this.service.currentForm().name, value);
    }
  }

  // Form management
  onFormSelect(event: Event): void {
    const formId = (event.target as HTMLSelectElement).value;
    if (formId !== this.service.currentForm().id) {
      this.service.loadForm(formId);
    }
  }

  newForm(): void {
    this.service.newForm();
  }

  saveForm(): void {
    this.service.saveForm();
    alert(this.lang() === 'tr' ? 'Form kaydedildi!' : 'Form saved!');
  }

  deleteCurrentForm(): void {
    if (confirm(this.lang() === 'tr' ? 'Bu formu silmek istediğinizden emin misiniz?' : 'Are you sure you want to delete this form?')) {
      this.service.deleteForm(this.service.currentForm().id);
      this.service.newForm();
    }
  }

  // Templates
  loadTemplate(template: typeof sampleTemplates[0]): void {
    this.service.clearAllFields();

    // Load groups if available
    const templateWithGroups = template as typeof sampleTemplates[0] & {
      groups?: Array<{ id: string; name: { tr: string; en: string }; color: string; collapsed: boolean; order: number }>;
      settings?: { showReset?: boolean; theme?: string };
    };

    // Map old group IDs to new group IDs
    const groupIdMap = new Map<string, string>();

    if (templateWithGroups.groups) {
      for (const group of templateWithGroups.groups) {
        const label = this.lang() === 'tr' ? group.name.tr : group.name.en;
        const newGroup = this.service.addGroup(group.id, label);
        groupIdMap.set(group.id, newGroup.id);

        // Update group with additional properties
        this.service.updateGroup(newGroup.id, {
          collapsed: group.collapsed,
          order: group.order,
        });
      }
    }

    // Load fields
    for (const f of template.fields) {
      const fieldWithGroup = f as typeof template.fields[0] & { groupId?: string };
      const mappedGroupId = fieldWithGroup.groupId ? groupIdMap.get(fieldWithGroup.groupId) : undefined;

      this.service.addField({
        type: f.type,
        name: f.name,
        label: f.label,
        groupId: mappedGroupId,
        config: { ...f.config },
      });
    }

    // Load settings if available
    if (templateWithGroups.settings) {
      if (templateWithGroups.settings.showReset !== undefined) {
        this.service.updateSettings({ showReset: templateWithGroups.settings.showReset });
      }
    }

    this.service.selectField(null);
    this.service.selectGroup(null);
    this.previewValues.set({});
    this.previewErrors.set({});
  }

  // Export
  copyExport(): void {
    navigator.clipboard.writeText(this.currentExport());
    alert(this.lang() === 'tr' ? 'Kopyalandı!' : 'Copied!');
  }

  downloadExport(): void {
    const content = this.currentExport();
    const ext = this.exportFormat() === 'typescript' ? 'ts' : 'json';
    const type = this.exportFormat() === 'typescript' ? 'text/typescript' : 'application/json';
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-schema.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import
  importJson(jsonStr: string): void {
    if (this.service.importFromJson(jsonStr)) {
      alert(this.lang() === 'tr' ? 'JSON yüklendi!' : 'JSON imported!');
    } else {
      alert(this.lang() === 'tr' ? 'Geçersiz JSON!' : 'Invalid JSON!');
    }
  }

  async importFromUrl(url: string): Promise<void> {
    if (!url) return;

    const success = await this.service.importFromUrl(url);
    if (success) {
      alert(this.lang() === 'tr' ? 'Form yüklendi!' : 'Form imported!');
      this.showImportUrl.set(false);
    } else {
      alert(this.lang() === 'tr' ? 'Yükleme başarısız!' : 'Import failed!');
    }
  }

  // Preview
  openFullPreview(): void {
    this.showFullPreview.set(true);
  }

  onPreviewInput(fieldName: string, value: unknown): void {
    this.previewValues.update(v => ({ ...v, [fieldName]: value }));
    // Clear error on input, validate on blur
    this.previewErrors.update(e => ({ ...e, [fieldName]: '' }));
  }

  onPreviewBlur(fieldName: string, value: unknown): void {
    this.validatePreviewField(fieldName, value);
  }

  validatePreviewField(fieldName: string, value: unknown): void {
    const field = this.service.fields().find(f => f.name === fieldName);
    if (!field) return;

    let error = '';

    // Required check
    if (field.config['required'] && (value === '' || value === null || value === undefined)) {
      error = this.lang() === 'tr' ? 'Bu alan zorunludur' : 'This field is required';
    }

    // MinLength check
    if (!error && field.config['minLength'] && typeof value === 'string' && value.length < (field.config['minLength'] as number)) {
      error = this.lang() === 'tr'
        ? `En az ${field.config['minLength']} karakter gerekli`
        : `Minimum ${field.config['minLength']} characters required`;
    }

    // MaxLength check
    if (!error && field.config['maxLength'] && typeof value === 'string' && value.length > (field.config['maxLength'] as number)) {
      error = this.lang() === 'tr'
        ? `En fazla ${field.config['maxLength']} karakter olmali`
        : `Maximum ${field.config['maxLength']} characters allowed`;
    }

    // Min value check (for numbers)
    if (!error && field.config['min'] !== undefined && typeof value === 'number' && value < (field.config['min'] as number)) {
      error = this.lang() === 'tr'
        ? `Minimum deger: ${field.config['min']}`
        : `Minimum value: ${field.config['min']}`;
    }

    // Max value check (for numbers)
    if (!error && field.config['max'] !== undefined && typeof value === 'number' && value > (field.config['max'] as number)) {
      error = this.lang() === 'tr'
        ? `Maksimum deger: ${field.config['max']}`
        : `Maximum value: ${field.config['max']}`;
    }

    // Email validation
    if (!error && field.type === 'email' && value && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        error = this.lang() === 'tr' ? 'Gecerli bir e-posta adresi girin' : 'Enter a valid email address';
      }
    }

    // URL validation
    if (!error && field.type === 'url' && value && typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        error = this.lang() === 'tr' ? 'Gecerli bir URL girin' : 'Enter a valid URL';
      }
    }

    // Pattern validation
    if (!error && field.config['pattern'] && value && typeof value === 'string') {
      try {
        const regex = new RegExp(field.config['pattern'] as string);
        if (!regex.test(value)) {
          error = this.lang() === 'tr' ? 'Gecersiz format' : 'Invalid format';
        }
      } catch {
        // Invalid regex pattern, skip
      }
    }

    this.previewErrors.update(e => ({ ...e, [fieldName]: error }));
  }

  /**
   * Evaluate if a field should be visible based on showWhen/hideWhen conditions
   */
  isFieldVisible(field: FormFieldDef): boolean {
    const values = this.previewValues();

    // Check hideWhen condition
    if (field.config['hideWhen']) {
      const condition = field.config['hideWhen'] as ConditionalRule;
      if (this.evaluateCondition(condition, values)) {
        return false; // Hide the field
      }
    }

    // Check showWhen condition
    if (field.config['showWhen']) {
      const condition = field.config['showWhen'] as ConditionalRule;
      if (!this.evaluateCondition(condition, values)) {
        return false; // Don't show until condition is met
      }
    }

    return true;
  }

  /**
   * Evaluate if a field should be disabled based on disableWhen condition
   */
  isFieldDisabled(field: FormFieldDef): boolean {
    const values = this.previewValues();

    if (field.config['disableWhen']) {
      const condition = field.config['disableWhen'] as ConditionalRule;
      return this.evaluateCondition(condition, values);
    }

    return false;
  }

  /**
   * Evaluate a single condition against current form values
   */
  private evaluateCondition(condition: ConditionalRule, values: Record<string, unknown>): boolean {
    if (!condition || !condition.field || !condition.operator) {
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
        if (typeof fieldValue === 'number' && typeof conditionValue === 'number') {
          return fieldValue > conditionValue;
        }
        return Number(fieldValue) > Number(conditionValue);

      case 'lessThan':
        if (typeof fieldValue === 'number' && typeof conditionValue === 'number') {
          return fieldValue < conditionValue;
        }
        return Number(fieldValue) < Number(conditionValue);

      case 'isEmpty':
        return fieldValue === '' || fieldValue === null || fieldValue === undefined;

      case 'isNotEmpty':
        return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;

      default:
        return false;
    }
  }

  resetPreview(): void {
    this.previewValues.set({});
    this.previewErrors.set({});
  }

  // Helpers
  getValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  getNumberValue(event: Event): number | null {
    const value = (event.target as HTMLInputElement).value;
    return value ? Number(value) : null;
  }

  getChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  getStars(max: number): number[] {
    return Array.from({ length: max }, (_, i) => i);
  }

  isStarFilled(fieldName: string, star: number): boolean {
    const value = this.previewValues()[fieldName];
    return typeof value === 'number' && star < value;
  }

  // Get preview value for binding
  getPreviewValue(fieldName: string): string {
    const value = this.previewValues()[fieldName];
    if (value === null || value === undefined) return '';
    return String(value);
  }

  // Check if boolean field is checked
  isPreviewChecked(fieldName: string): boolean {
    const value = this.previewValues()[fieldName];
    return value === true;
  }

  // Multiselect helpers
  isMultiselectChecked(fieldName: string, optionValue: string): boolean {
    const value = this.previewValues()[fieldName];
    if (Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return false;
  }

  onMultiselectChange(fieldName: string, optionValue: string, checked: boolean): void {
    const current = this.previewValues()[fieldName];
    let newValue: string[] = Array.isArray(current) ? [...current] : [];

    if (checked) {
      if (!newValue.includes(optionValue)) {
        newValue.push(optionValue);
      }
    } else {
      newValue = newValue.filter(v => v !== optionValue);
    }

    this.previewValues.update(v => ({ ...v, [fieldName]: newValue }));
  }

  // Currency symbol helper
  getCurrencySymbol(currency: unknown): string {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'TRY': return '₺';
      default: return '₺';
    }
  }

  // Tags helpers
  getTagsList(fieldName: string): string[] {
    const value = this.previewValues()[fieldName];
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }

  addTag(fieldName: string, event: Event): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const tag = input.value.trim();
    if (tag) {
      const current = this.previewValues()[fieldName];
      const tags: string[] = Array.isArray(current) ? [...current] : [];
      if (!tags.includes(tag)) {
        tags.push(tag);
        this.previewValues.update(v => ({ ...v, [fieldName]: tags }));
      }
      input.value = '';
    }
  }

  removeTag(fieldName: string, tag: string): void {
    const current = this.previewValues()[fieldName];
    if (Array.isArray(current)) {
      const newTags = current.filter(t => t !== tag);
      this.previewValues.update(v => ({ ...v, [fieldName]: newTags }));
    }
  }

  // Slug helper
  slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // JSON validation helper
  onJsonBlur(fieldName: string, value: string): void {
    if (!value) {
      this.previewErrors.update(e => ({ ...e, [fieldName]: '' }));
      return;
    }
    try {
      JSON.parse(value);
      this.previewErrors.update(e => ({ ...e, [fieldName]: '' }));
    } catch {
      const error = this.lang() === 'tr' ? 'Geçersiz JSON formatı' : 'Invalid JSON format';
      this.previewErrors.update(e => ({ ...e, [fieldName]: error }));
    }
  }

  // Calculated field helper
  getCalculatedValue(field: FormFieldDef): string {
    const formula = field.config['formula'] as string;
    if (!formula) return '';

    const values = this.previewValues();
    const decimals = (field.config['decimals'] as number) ?? 2;
    const prefix = (field.config['prefix'] as string) ?? '';
    const suffix = (field.config['suffix'] as string) ?? '';

    try {
      // Replace field references like {fieldName} with actual values
      let expression = formula.replace(/\{(\w+)\}/g, (_, fieldName) => {
        const value = values[fieldName];
        if (value === null || value === undefined || value === '') {
          return '0';
        }
        return String(Number(value) || 0);
      });

      // Safely evaluate the expression (basic math only)
      const result = this.evaluateExpression(expression);
      if (isNaN(result) || !isFinite(result)) {
        return '';
      }

      const formatted = result.toFixed(decimals);
      return `${prefix}${formatted}${suffix}`;
    } catch {
      return '';
    }
  }

  // Safe expression evaluator for calculated fields
  private evaluateExpression(expr: string): number {
    // Only allow numbers, basic operators, parentheses, and spaces
    const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '');
    if (!sanitized || sanitized !== expr.replace(/\s/g, '').replace(/[^0-9+\-*/().%]/g, '')) {
      return NaN;
    }

    // Use Function constructor for safe evaluation (no access to scope)
    try {
      const fn = new Function(`return (${sanitized})`);
      return fn();
    } catch {
      return NaN;
    }
  }

  updateSubmitButtonText(lang: 'tr' | 'en', value: string): void {
    const current = this.service.settings().submitButtonText;
    this.service.updateSettings({
      submitButtonText: { ...current, [lang]: value }
    });
  }

  private generateFieldName(type: string): string {
    const count = this.service.fields().filter(f => f.type === type).length;
    return `${type}${count > 0 ? count + 1 : ''}`;
  }

  // Repeatable Group Methods
  repeatableConfigs = signal<Record<string, RepeatableGroupConfig>>({});

  isGroupRepeatable(group: FieldGroup | null | undefined): boolean {
    if (!group) return false;
    return !!this.repeatableConfigs()[group.id];
  }

  getGroupRepeatableConfig(group: FieldGroup | null | undefined): RepeatableGroupConfig | null {
    if (!group) return null;
    return this.repeatableConfigs()[group.id] || null;
  }

  updateGroupRepeatable(enabled: boolean): void {
    const group = this.service.selectedGroup();
    if (!group) return;

    if (enabled) {
      this.repeatableConfigs.update(configs => ({
        ...configs,
        [group.id]: {
          ...DEFAULT_REPEATABLE_CONFIG,
          groupId: group.id,
          fieldNames: this.service.fields().filter(f => f.groupId === group.id).map(f => f.name)
        }
      }));
    } else {
      this.repeatableConfigs.update(configs => {
        const newConfigs = { ...configs };
        delete newConfigs[group.id];
        return newConfigs;
      });
    }
  }

  updateGroupRepeatableConfig(key: string, value: number | null): void {
    const group = this.service.selectedGroup();
    if (!group || !this.repeatableConfigs()[group.id]) return;

    this.repeatableConfigs.update(configs => ({
      ...configs,
      [group.id]: {
        ...configs[group.id],
        [key]: value ?? 1
      }
    }));
  }

  getRepeatableGroups(): FieldGroup[] {
    return this.service.groups().filter(g => this.isGroupRepeatable(g));
  }

  getGroupFields(groupId: string): FormFieldDef[] {
    return this.service.fields().filter(f => f.groupId === groupId);
  }

  getNonRepeatableFields(): FormFieldDef[] {
    const repeatableGroupIds = this.getRepeatableGroups().map(g => g.id);
    return this.service.fields().filter(f => !repeatableGroupIds.includes(f.groupId || ''));
  }

  onRepeatableValuesChange(groupId: string, values: Record<string, unknown>[]): void {
    console.log('Repeatable values changed for group', groupId, values);
    // Store repeatable values
    this.previewValues.update(v => ({
      ...v,
      [`__repeatable_${groupId}`]: values
    }));
  }

  // Wizard Methods
  getWizardConfig(): WizardConfig {
    const steps: WizardStep[] = this.service.groups().map((group, index) => ({
      id: group.id,
      title: typeof group.name === 'object' ? group.name : { tr: group.label || group.id, en: group.label || group.id },
      description: group.description ? { tr: group.description, en: group.description } : undefined,
      icon: (group as any).icon,
      fields: this.service.fields().filter(f => f.groupId === group.id).map(f => f.name),
      order: index
    }));

    return {
      ...this.wizardConfig,
      enabled: true,
      steps
    };
  }

  onWizardComplete(values: Record<string, unknown>): void {
    console.log('Wizard completed with values:', values);
    const msg = this.lang() === 'tr' ? 'Form başarıyla tamamlandı!' : 'Form completed successfully!';
    alert(msg);
  }

  // Logic Builder Methods
  onLogicRulesChange(rules: { id: string; type: string; targetField: string; condition: ConditionalRule }[]): void {
    console.log('Logic rules changed:', rules);
    // Apply rules to fields
    rules.forEach(rule => {
      const field = this.service.fields().find(f => f.name === rule.targetField);
      if (field) {
        // Update field config based on rule type
        const configUpdate: Record<string, ConditionalRule> = {};
        configUpdate[rule.type] = rule.condition;
        this.service.updateField(field.id, {
          config: { ...field.config, ...configUpdate }
        });
      }
    });
  }

  // PDF Export
  exportToPdf(): void {
    const formName = this.service.currentForm().name;
    const fields = this.service.fields();
    const values = this.previewValues();

    this.pdfExport.exportToPdf(formName, fields, values);
  }

  // Webhook Methods
  testWebhook(): void {
    if (!this.webhookUrl()) {
      alert(this.lang() === 'tr' ? 'Lütfen webhook URL girin' : 'Please enter webhook URL');
      return;
    }

    const testData = {
      test: true,
      formName: this.service.currentForm().name,
      timestamp: new Date().toISOString(),
      fields: this.service.fields().map(f => ({ name: f.name, label: f.label })),
    };

    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.webhookHeaders()) {
      try {
        headers = { ...headers, ...JSON.parse(this.webhookHeaders()) };
      } catch {
        alert(this.lang() === 'tr' ? 'Geçersiz JSON headers' : 'Invalid JSON headers');
        return;
      }
    }

    fetch(this.webhookUrl(), {
      method: this.webhookMethod(),
      headers,
      body: JSON.stringify(testData),
    })
      .then(response => {
        if (response.ok) {
          alert(this.lang() === 'tr' ? 'Webhook testi başarılı!' : 'Webhook test successful!');
        } else {
          alert(this.lang() === 'tr' ? `Webhook hatası: ${response.status}` : `Webhook error: ${response.status}`);
        }
      })
      .catch(error => {
        alert(this.lang() === 'tr' ? `Bağlantı hatası: ${error.message}` : `Connection error: ${error.message}`);
      });
  }

  sendWebhook(values: Record<string, unknown>): void {
    if (!this.webhookEnabled() || !this.webhookUrl()) return;

    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.webhookHeaders()) {
      try {
        headers = { ...headers, ...JSON.parse(this.webhookHeaders()) };
      } catch {
        console.error('Invalid webhook headers JSON');
        return;
      }
    }

    const payload = {
      formName: this.service.currentForm().name,
      formId: this.service.currentForm().id,
      timestamp: new Date().toISOString(),
      values,
    };

    fetch(this.webhookUrl(), {
      method: this.webhookMethod(),
      headers,
      body: JSON.stringify(payload),
    }).catch(error => console.error('Webhook error:', error));
  }

  // Response Viewer Methods
  toggleResponseExpand(responseId: string): void {
    this.expandedResponseId.set(
      this.expandedResponseId() === responseId ? null : responseId
    );
  }

  formatResponseDate(date: Date): string {
    return new Intl.DateTimeFormat(this.lang() === 'tr' ? 'tr-TR' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  }

  getResponseEntries(values: Record<string, unknown>): Array<{ key: string; value: unknown }> {
    return Object.entries(values).map(([key, value]) => ({ key, value }));
  }

  getFieldLabel(fieldName: string): string {
    const field = this.service.fields().find(f => f.name === fieldName);
    return field?.label || fieldName;
  }

  isSignatureValue(value: unknown): boolean {
    return typeof value === 'string' && value.startsWith('data:image/');
  }

  formatResponseValue(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  deleteResponse(responseId: string): void {
    const confirmMsg = this.lang() === 'tr'
      ? 'Bu yanıtı silmek istediğinize emin misiniz?'
      : 'Are you sure you want to delete this response?';

    if (confirm(confirmMsg)) {
      this.formResponses.update(responses =>
        responses.filter(r => r.id !== responseId)
      );
      this.expandedResponseId.set(null);
    }
  }

  clearResponses(): void {
    const confirmMsg = this.lang() === 'tr'
      ? 'Tüm yanıtları silmek istediğinize emin misiniz?'
      : 'Are you sure you want to clear all responses?';

    if (confirm(confirmMsg)) {
      this.formResponses.set([]);
    }
  }

  exportResponsesToCSV(): void {
    const responses = this.formResponses();
    if (responses.length === 0) return;

    const fields = this.service.fields();
    const headers = ['ID', 'Timestamp', ...fields.map(f => f.label)];

    const rows = responses.map(response => {
      const row = [
        response.id,
        this.formatResponseDate(response.timestamp),
        ...fields.map(f => {
          const value = response.values[f.name];
          if (this.isSignatureValue(value)) return '[Signature]';
          return this.formatResponseValue(value);
        })
      ];
      return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.service.currentForm().name}_responses.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Save form response (called when form is submitted in preview)
  saveFormResponse(): void {
    const values = this.previewValues();
    const response = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      values: { ...values },
    };

    this.formResponses.update(responses => [...responses, response]);

    // Send webhook if enabled
    this.sendWebhook(values);

    // Show success message
    const msg = this.lang() === 'tr' ? 'Form kaydedildi!' : 'Form saved!';
    alert(msg);
  }

  // Zignal form submit handler
  onZignalFormSubmit(values: Record<string, unknown>): void {
    console.log('Zignal form submitted with values:', values);

    // Store response
    const response = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      values: { ...values },
    };

    this.formResponses.update(responses => [...responses, response]);

    // Send webhook if enabled
    this.sendWebhook(values);

    // Show success message
    const msg = this.lang() === 'tr' ? 'Zignal formu başarıyla gönderildi!' : 'Zignal form submitted successfully!';
    alert(msg);
  }

  // Export Zignal schema
  exportZignalSchema(): string {
    return this.zignalService.exportZignalSchema();
  }
}
