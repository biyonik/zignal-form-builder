import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FormSchema,
  StringField,
  NumberField,
  BooleanField,
  DateField,
  EmailField,
  PasswordField,
  SelectField,
  TextareaField,
  UrlField,
  PhoneField,
  ColorField,
  RatingField,
  MoneyField,
  PercentField,
  TagsField,
  SlugField,
  JsonField,
  TimeField,
  FileField,
  MultiselectField,
  FormState,
  IField,
} from '@biyonik/zignal';
import {
  fieldTypes,
  fieldCategories,
  sampleTemplates,
  FieldTypeConfig,
} from './field-types.config';

/**
 * TR: Form alanı tanımı
 * EN: Form field definition
 */
interface FormFieldDef {
  id: string;
  type: string;
  name: string;
  label: string;
  config: Record<string, unknown>;
}

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="builder-container">
      <!-- Header -->
      <header class="builder-header">
        <div class="header-left">
          <h1>🛠️ Zignal Form Builder</h1>
          <p>{{ lang() === 'tr' ? 'Drag & Drop Form Tasarımı' : 'Drag & Drop Form Design' }}</p>
        </div>
        <div class="header-right">
          <button class="btn-lang" (click)="toggleLang()">
            {{ lang() === 'tr' ? '🇬🇧 EN' : '🇹🇷 TR' }}
          </button>
        </div>
      </header>

      <div class="builder-main">
        <!-- Left Panel: Field Types -->
        <aside class="panel panel-left">
          <h3>{{ lang() === 'tr' ? 'Alan Tipleri' : 'Field Types' }}</h3>

          <!-- Templates -->
          <div class="templates-section">
            <h4>{{ lang() === 'tr' ? 'Şablonlar' : 'Templates' }}</h4>
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
                    (dragstart)="onDragStart($event, field)"
                    (click)="addField(field)"
                  >
                    <span class="field-icon">{{ field.icon }}</span>
                    <span class="field-label">{{ lang() === 'tr' ? field.label.tr : field.label.en }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </aside>

        <!-- Center Panel: Form Canvas -->
        <main class="panel panel-center">
          <div class="canvas-header">
            <h3>{{ lang() === 'tr' ? 'Form Alanları' : 'Form Fields' }} ({{ formFields().length }})</h3>
            <div class="canvas-actions">
              <button class="btn-action" (click)="clearAll()" [disabled]="formFields().length === 0">
                🗑️ {{ lang() === 'tr' ? 'Temizle' : 'Clear' }}
              </button>
            </div>
          </div>

          <div
            class="form-canvas"
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event)"
          >
            @if (formFields().length === 0) {
              <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>{{ lang() === 'tr'
                  ? 'Buraya alan eklemek için soldan sürükleyin veya tıklayın'
                  : 'Drag from left or click to add fields here' }}</p>
              </div>
            }

            @for (field of formFields(); track field.id; let i = $index) {
              <div
                class="canvas-field"
                [class.selected]="selectedField()?.id === field.id"
                (click)="selectField(field)"
              >
                <div class="field-header">
                  <span class="field-type-badge">
                    {{ getFieldTypeIcon(field.type) }} {{ field.type }}
                  </span>
                  <div class="field-actions">
                    <button class="btn-icon" (click)="moveField(i, -1); $event.stopPropagation()" [disabled]="i === 0">⬆️</button>
                    <button class="btn-icon" (click)="moveField(i, 1); $event.stopPropagation()" [disabled]="i === formFields().length - 1">⬇️</button>
                    <button class="btn-icon btn-delete" (click)="removeField(field.id); $event.stopPropagation()">🗑️</button>
                  </div>
                </div>
                <div class="field-body">
                  <strong>{{ field.label }}</strong>
                  <code class="field-name">{{ field.name }}</code>
                </div>
                <div class="field-config-preview">
                  @if (field.config['required']) {
                    <span class="config-badge required">{{ lang() === 'tr' ? 'Zorunlu' : 'Required' }}</span>
                  }
                  @if (field.config['minLength']) {
                    <span class="config-badge">min: {{ field.config['minLength'] }}</span>
                  }
                  @if (field.config['maxLength']) {
                    <span class="config-badge">max: {{ field.config['maxLength'] }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </main>

        <!-- Right Panel: Field Config & Preview -->
        <aside class="panel panel-right">
          <!-- Tabs -->
          <div class="panel-tabs">
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'config'"
              (click)="activeTab.set('config')"
            >
              ⚙️ {{ lang() === 'tr' ? 'Ayarlar' : 'Config' }}
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'preview'"
              (click)="activeTab.set('preview')"
            >
              👁️ {{ lang() === 'tr' ? 'Önizleme' : 'Preview' }}
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'json'"
              (click)="activeTab.set('json')"
            >
              { } JSON
            </button>
          </div>

          <!-- Config Tab -->
          @if (activeTab() === 'config') {
            <div class="tab-content">
              @if (selectedField()) {
                <h4>{{ lang() === 'tr' ? 'Alan Ayarları' : 'Field Settings' }}</h4>

                <div class="config-form">
                  <!-- Field Name -->
                  <div class="config-group">
                    <label>{{ lang() === 'tr' ? 'Alan Adı (name)' : 'Field Name' }}</label>
                    <input
                      type="text"
                      [value]="selectedField()?.name"
                      (input)="updateSelectedField('name', getValue($event))"
                      placeholder="fieldName"
                    />
                  </div>

                  <!-- Field Label -->
                  <div class="config-group">
                    <label>{{ lang() === 'tr' ? 'Etiket (label)' : 'Label' }}</label>
                    <input
                      type="text"
                      [value]="selectedField()?.label"
                      (input)="updateSelectedField('label', getValue($event))"
                      placeholder="Field Label"
                    />
                  </div>

                  <!-- Dynamic Config Options -->
                  @for (option of getConfigOptions(selectedField()!.type); track option.key) {
                    <div class="config-group">
                      <label>{{ lang() === 'tr' ? option.label.tr : option.label.en }}</label>

                      @switch (option.type) {
                        @case ('boolean') {
                          <input
                            type="checkbox"
                            [checked]="selectedField()?.config?.[option.key] ?? option.default"
                            (change)="updateFieldConfig(option.key, getChecked($event))"
                          />
                        }
                        @case ('number') {
                          <input
                            type="number"
                            [value]="selectedField()?.config?.[option.key] ?? option.default ?? ''"
                            (input)="updateFieldConfig(option.key, getNumberValue($event))"
                          />
                        }
                        @case ('select') {
                          <select
                            [value]="selectedField()?.config?.[option.key] ?? option.default"
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
                              @for (opt of getSelectOptions(selectedField()!); track $index; let i = $index) {
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
                              + {{ lang() === 'tr' ? 'Seçenek Ekle' : 'Add Option' }}
                            </button>
                          </div>
                        }
                        @default {
                          <input
                            type="text"
                            [value]="selectedField()?.config?.[option.key] ?? ''"
                            (input)="updateFieldConfig(option.key, getValue($event))"
                          />
                        }
                      }
                    </div>
                  }
                </div>
              } @else {
                <div class="no-selection">
                  <p>{{ lang() === 'tr'
                    ? 'Ayarlarını düzenlemek için bir alan seçin'
                    : 'Select a field to edit its settings' }}</p>
                </div>
              }
            </div>
          }

          <!-- Preview Tab -->
          @if (activeTab() === 'preview') {
            <div class="tab-content preview-content">
              <h4>{{ lang() === 'tr' ? 'Form Önizleme' : 'Form Preview' }}</h4>

              @if (formFields().length > 0) {
                <div class="preview-form">
                  @for (field of formFields(); track field.id) {
                    <div class="preview-field">
                      <label>
                        {{ field.label }}
                        @if (field.config['required']) {
                          <span class="required-star">*</span>
                        }
                      </label>

                      @switch (field.type) {
                        @case ('string') {
                          <input type="text" [placeholder]="field.config['placeholder'] || ''" />
                        }
                        @case ('email') {
                          <input type="email" placeholder="email@example.com" />
                        }
                        @case ('password') {
                          <input type="password" placeholder="••••••••" />
                        }
                        @case ('number') {
                          <input type="number" />
                        }
                        @case ('textarea') {
                          <textarea [rows]="field.config['rows'] || 4"></textarea>
                        }
                        @case ('select') {
                          <select>
                            <option value="">{{ lang() === 'tr' ? 'Seçiniz...' : 'Select...' }}</option>
                            @for (opt of getSelectOptions(field); track opt.value) {
                              <option [value]="opt.value">{{ opt.label }}</option>
                            }
                          </select>
                        }
                        @case ('boolean') {
                          <input type="checkbox" />
                        }
                        @case ('date') {
                          <input type="date" />
                        }
                        @case ('time') {
                          <input type="time" />
                        }
                        @case ('color') {
                          <input type="color" />
                        }
                        @case ('url') {
                          <input type="url" placeholder="https://" />
                        }
                        @case ('phone') {
                          <input type="tel" placeholder="+90 5XX XXX XX XX" />
                        }
                        @case ('file') {
                          <input type="file" />
                        }
                        @case ('rating') {
                          <div class="rating-preview">
                            @for (star of getStars(field.config['max'] || 5); track star) {
                              <span class="star">☆</span>
                            }
                          </div>
                        }
                        @default {
                          <input type="text" />
                        }
                      }

                      @if (field.config['hint']) {
                        <span class="hint">{{ field.config['hint'] }}</span>
                      }
                    </div>
                  }

                  <button class="btn-submit" disabled>
                    {{ lang() === 'tr' ? 'Gönder' : 'Submit' }}
                  </button>
                </div>
              } @else {
                <div class="no-selection">
                  <p>{{ lang() === 'tr'
                    ? 'Form alanları ekleyin'
                    : 'Add form fields' }}</p>
                </div>
              }
            </div>
          }

          <!-- JSON Tab -->
          @if (activeTab() === 'json') {
            <div class="tab-content json-content">
              <h4>JSON Schema</h4>

              <div class="json-actions">
                <button class="btn-action" (click)="copyJson()">
                  📋 {{ lang() === 'tr' ? 'Kopyala' : 'Copy' }}
                </button>
                <button class="btn-action" (click)="downloadJson()">
                  ⬇️ {{ lang() === 'tr' ? 'İndir' : 'Download' }}
                </button>
              </div>

              <pre class="json-output">{{ jsonOutput() }}</pre>

              <h4>{{ lang() === 'tr' ? 'JSON Yükle' : 'Load JSON' }}</h4>
              <textarea
                class="json-input"
                [placeholder]="lang() === 'tr' ? 'JSON yapıştırın...' : 'Paste JSON...'"
                #jsonInput
              ></textarea>
              <button class="btn-action" (click)="loadJson(jsonInput.value)">
                📥 {{ lang() === 'tr' ? 'Yükle' : 'Load' }}
              </button>
            </div>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .builder-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #1a1a2e;
      color: #eee;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    /* Header */
    .builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 25px;
      background: #16213e;
      border-bottom: 1px solid #0f3460;
    }

    .header-left h1 {
      margin: 0;
      font-size: 1.5rem;
    }

    .header-left p {
      margin: 5px 0 0;
      font-size: 0.85rem;
      color: #888;
    }

    .btn-lang {
      background: #0f3460;
      color: #fff;
      border: none;
      padding: 8px 15px;
      border-radius: 5px;
      cursor: pointer;
    }

    /* Main Layout */
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
      width: 250px;
      background: #16213e;
      border-right: 1px solid #0f3460;
    }

    .panel-center {
      flex: 1;
      background: #1a1a2e;
    }

    .panel-right {
      width: 350px;
      background: #16213e;
      border-left: 1px solid #0f3460;
    }

    /* Left Panel */
    .panel-left h3 {
      margin-top: 0;
      color: #e94560;
    }

    .templates-section {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #0f3460;
    }

    .template-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .template-btn {
      background: #0f3460;
      color: #fff;
      border: none;
      padding: 10px;
      border-radius: 5px;
      cursor: pointer;
      text-align: left;
      transition: background 0.2s;
    }

    .template-btn:hover {
      background: #e94560;
    }

    .category-section {
      margin-bottom: 20px;
    }

    .category-section h4 {
      color: #888;
      font-size: 0.85rem;
      margin-bottom: 10px;
    }

    .field-type-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .field-type-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: #0f3460;
      border-radius: 5px;
      cursor: grab;
      transition: all 0.2s;
    }

    .field-type-item:hover {
      background: #e94560;
      transform: translateX(5px);
    }

    .field-icon {
      font-size: 1.2rem;
    }

    /* Center Panel */
    .canvas-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .canvas-header h3 {
      margin: 0;
      color: #e94560;
    }

    .btn-action {
      background: #0f3460;
      color: #fff;
      border: none;
      padding: 8px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .btn-action:hover:not(:disabled) {
      background: #e94560;
    }

    .btn-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .form-canvas {
      min-height: 400px;
      background: #0f3460;
      border-radius: 10px;
      padding: 15px;
      border: 2px dashed #e94560;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: #888;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 15px;
    }

    .canvas-field {
      background: #16213e;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
    }

    .canvas-field:hover {
      border-color: #e94560;
    }

    .canvas-field.selected {
      border-color: #e94560;
      background: #1a1a2e;
    }

    .field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .field-type-badge {
      background: #e94560;
      color: #fff;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .field-actions {
      display: flex;
      gap: 5px;
    }

    .btn-icon {
      background: #0f3460;
      color: #fff;
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .btn-icon:hover:not(:disabled) {
      background: #e94560;
    }

    .btn-icon:disabled {
      opacity: 0.3;
    }

    .btn-delete:hover {
      background: #c0392b !important;
    }

    .field-body {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .field-name {
      color: #888;
      font-size: 0.8rem;
      background: #0f3460;
      padding: 2px 6px;
      border-radius: 3px;
      width: fit-content;
    }

    .field-config-preview {
      display: flex;
      gap: 5px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .config-badge {
      background: #0f3460;
      color: #888;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.7rem;
    }

    .config-badge.required {
      background: #e94560;
      color: #fff;
    }

    /* Right Panel */
    .panel-tabs {
      display: flex;
      gap: 5px;
      margin-bottom: 15px;
    }

    .tab-btn {
      flex: 1;
      background: #0f3460;
      color: #fff;
      border: none;
      padding: 10px;
      cursor: pointer;
      border-radius: 5px;
      font-size: 0.85rem;
    }

    .tab-btn.active {
      background: #e94560;
    }

    .tab-content {
      padding: 15px;
      background: #0f3460;
      border-radius: 8px;
    }

    .tab-content h4 {
      margin-top: 0;
      color: #e94560;
    }

    .no-selection {
      text-align: center;
      color: #888;
      padding: 40px;
    }

    .config-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .config-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .config-group label {
      font-size: 0.85rem;
      color: #888;
    }

    .config-group input[type="text"],
    .config-group input[type="number"],
    .config-group select,
    .config-group textarea {
      background: #16213e;
      border: 1px solid #0f3460;
      color: #fff;
      padding: 10px;
      border-radius: 5px;
      font-size: 0.9rem;
    }

    .config-group input[type="checkbox"] {
      width: 20px;
      height: 20px;
    }

    .options-editor {
      background: #16213e;
      padding: 10px;
      border-radius: 5px;
    }

    .option-row {
      display: flex;
      gap: 5px;
      margin-bottom: 5px;
    }

    .option-row input {
      flex: 1;
      background: #0f3460 !important;
    }

    .btn-add-option {
      width: 100%;
      background: #0f3460;
      color: #fff;
      border: none;
      padding: 8px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 10px;
    }

    /* Preview */
    .preview-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .preview-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .preview-field label {
      font-weight: 600;
    }

    .required-star {
      color: #e94560;
    }

    .preview-field input,
    .preview-field select,
    .preview-field textarea {
      background: #16213e;
      border: 1px solid #0f3460;
      color: #fff;
      padding: 10px;
      border-radius: 5px;
    }

    .preview-field .hint {
      font-size: 0.8rem;
      color: #888;
    }

    .rating-preview {
      font-size: 1.5rem;
    }

    .btn-submit {
      background: #e94560;
      color: #fff;
      border: none;
      padding: 12px;
      border-radius: 5px;
      font-size: 1rem;
      margin-top: 10px;
    }

    /* JSON */
    .json-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .json-output {
      background: #16213e;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-size: 0.8rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .json-input {
      width: 100%;
      min-height: 100px;
      background: #16213e;
      border: 1px solid #0f3460;
      color: #fff;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      margin-bottom: 10px;
      box-sizing: border-box;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .builder-main {
        flex-direction: column;
      }

      .panel-left,
      .panel-right {
        width: 100%;
        max-height: 300px;
      }
    }
  `],
})
export class FormBuilderComponent {
  // State
  formFields = signal<FormFieldDef[]>([]);
  selectedField = signal<FormFieldDef | null>(null);
  activeTab = signal<'config' | 'preview' | 'json'>('config');
  lang = signal<'tr' | 'en'>('tr');

  // Data
  fieldTypesData = fieldTypes;
  categories = fieldCategories;
  templates = sampleTemplates;

  // Drag state
  private draggedFieldType: FieldTypeConfig | null = null;

  // Computed
  jsonOutput = computed(() => {
    const schema = this.formFields().map((f) => ({
      type: f.type,
      name: f.name,
      label: f.label,
      config: f.config,
    }));
    return JSON.stringify(schema, null, 2);
  });

  // Methods
  toggleLang(): void {
    this.lang.update((l) => (l === 'tr' ? 'en' : 'tr'));
  }

  getFieldsByCategory(categoryId: string): FieldTypeConfig[] {
    return this.fieldTypesData.filter((f) => f.category === categoryId);
  }

  getFieldTypeIcon(type: string): string {
    return this.fieldTypesData.find((f) => f.type === type)?.icon ?? '📝';
  }

  getConfigOptions(type: string) {
    return this.fieldTypesData.find((f) => f.type === type)?.configOptions ?? [];
  }

  // Drag & Drop
  onDragStart(event: DragEvent, fieldType: FieldTypeConfig): void {
    this.draggedFieldType = fieldType;
    event.dataTransfer?.setData('text/plain', fieldType.type);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (this.draggedFieldType) {
      this.addField(this.draggedFieldType);
      this.draggedFieldType = null;
    }
  }

  // Field Management
  addField(fieldType: FieldTypeConfig): void {
    const newField: FormFieldDef = {
      id: this.generateId(),
      type: fieldType.type,
      name: this.generateFieldName(fieldType.type),
      label: this.lang() === 'tr' ? fieldType.label.tr : fieldType.label.en,
      config: { ...fieldType.defaultConfig },
    };
    this.formFields.update((fields) => [...fields, newField]);
    this.selectField(newField);
  }

  removeField(id: string): void {
    this.formFields.update((fields) => fields.filter((f) => f.id !== id));
    if (this.selectedField()?.id === id) {
      this.selectedField.set(null);
    }
  }

  selectField(field: FormFieldDef): void {
    this.selectedField.set(field);
    this.activeTab.set('config');
  }

  moveField(index: number, direction: number): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.formFields().length) return;

    this.formFields.update((fields) => {
      const newFields = [...fields];
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      return newFields;
    });
  }

  clearAll(): void {
    this.formFields.set([]);
    this.selectedField.set(null);
  }

  // Config Updates
  updateSelectedField(key: 'name' | 'label', value: string): void {
    const selected = this.selectedField();
    if (!selected) return;

    const updated = { ...selected, [key]: value };
    this.selectedField.set(updated);
    this.formFields.update((fields) =>
      fields.map((f) => (f.id === selected.id ? updated : f))
    );
  }

  updateFieldConfig(key: string, value: unknown): void {
    const selected = this.selectedField();
    if (!selected) return;

    const updated = {
      ...selected,
      config: { ...selected.config, [key]: value },
    };
    this.selectedField.set(updated);
    this.formFields.update((fields) =>
      fields.map((f) => (f.id === selected.id ? updated : f))
    );
  }

  // Select Options
  getSelectOptions(field: FormFieldDef): { value: string; label: string }[] {
    return (field.config['options'] as { value: string; label: string }[]) ?? [];
  }

  updateSelectOption(index: number, key: 'value' | 'label', value: string): void {
    const selected = this.selectedField();
    if (!selected) return;

    const options = [...this.getSelectOptions(selected)];
    options[index] = { ...options[index], [key]: value };
    this.updateFieldConfig('options', options);
  }

  addSelectOption(): void {
    const selected = this.selectedField();
    if (!selected) return;

    const options = [...this.getSelectOptions(selected), { value: '', label: '' }];
    this.updateFieldConfig('options', options);
  }

  removeSelectOption(index: number): void {
    const selected = this.selectedField();
    if (!selected) return;

    const options = this.getSelectOptions(selected).filter((_, i) => i !== index);
    this.updateFieldConfig('options', options);
  }

  // Templates
  loadTemplate(template: typeof sampleTemplates[0]): void {
    const fields: FormFieldDef[] = template.fields.map((f) => ({
      id: this.generateId(),
      type: f.type,
      name: f.name,
      label: f.label,
      config: f.config,
    }));
    this.formFields.set(fields);
    this.selectedField.set(null);
  }

  // JSON
  copyJson(): void {
    navigator.clipboard.writeText(this.jsonOutput());
    alert(this.lang() === 'tr' ? 'JSON kopyalandı!' : 'JSON copied!');
  }

  downloadJson(): void {
    const blob = new Blob([this.jsonOutput()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form-schema.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  loadJson(jsonStr: string): void {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        const fields: FormFieldDef[] = parsed.map((f: any) => ({
          id: this.generateId(),
          type: f.type,
          name: f.name,
          label: f.label,
          config: f.config ?? {},
        }));
        this.formFields.set(fields);
        this.selectedField.set(null);
        alert(this.lang() === 'tr' ? 'JSON yüklendi!' : 'JSON loaded!');
      }
    } catch (e) {
      alert(this.lang() === 'tr' ? 'Geçersiz JSON!' : 'Invalid JSON!');
    }
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

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private generateFieldName(type: string): string {
    const count = this.formFields().filter((f) => f.type === type).length;
    return `${type}${count > 0 ? count + 1 : ''}`;
  }
}
