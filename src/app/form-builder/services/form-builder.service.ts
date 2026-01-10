import { Injectable, signal, computed } from '@angular/core';
import { z } from 'zod';
import {
  FormDefinition,
  FormFieldDef,
  FieldGroup,
  FormSettings,
  CrossValidatorDef,
  FormStateSnapshot,
  SavedForm,
  Theme,
  Language,
  createEmptyForm,
  generateId,
  DEFAULT_FORM_SETTINGS,
} from '../models/form-builder.types';

const STORAGE_KEY = 'zignal-form-builder';
const MAX_UNDO_STACK = 50;

// ✅ PERFORMANCE FIX: Use structuredClone for better performance
function deepClone<T>(obj: T): T {
  // structuredClone is faster and more reliable than JSON.parse(JSON.stringify())
  // It also preserves Date objects, Maps, Sets, etc.
  return structuredClone(obj);
}

// ✅ SECURITY FIX: Zod schema for localStorage validation
const StorageDataSchema = z.object({
  savedForms: z.array(z.any()).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  language: z.enum(['tr', 'en']).optional(),
  currentFormId: z.string().optional(),
}).passthrough();

@Injectable({ providedIn: 'root' })
export class FormBuilderService {
  // ============================================
  // State Signals
  // ============================================

  // Current form
  private _currentForm = signal<FormDefinition>(createEmptyForm());
  readonly currentForm = this._currentForm.asReadonly();

  // All saved forms
  private _savedForms = signal<SavedForm[]>([]);
  readonly savedForms = this._savedForms.asReadonly();

  // Selected field
  private _selectedFieldId = signal<string | null>(null);
  readonly selectedFieldId = this._selectedFieldId.asReadonly();

  // Selected group
  private _selectedGroupId = signal<string | null>(null);
  readonly selectedGroupId = this._selectedGroupId.asReadonly();

  // Theme
  private _theme = signal<Theme>('dark');
  readonly theme = this._theme.asReadonly();

  // Language
  private _language = signal<Language>('tr');
  readonly language = this._language.asReadonly();

  // Undo/Redo stacks
  private _undoStack = signal<FormStateSnapshot[]>([]);
  private _redoStack = signal<FormStateSnapshot[]>([]);

  // Clipboard
  private _clipboard = signal<FormFieldDef | null>(null);
  readonly clipboard = this._clipboard.asReadonly();

  // ============================================
  // Computed Values
  // ============================================

  readonly fields = computed(() => this._currentForm().fields);
  readonly groups = computed(() => this._currentForm().groups);
  readonly settings = computed(() => this._currentForm().settings);
  readonly crossValidators = computed(() => this._currentForm().crossValidators);

  readonly selectedField = computed(() => {
    const id = this._selectedFieldId();
    return id ? this._currentForm().fields.find(f => f.id === id) : null;
  });

  readonly selectedGroup = computed(() => {
    const id = this._selectedGroupId();
    return id ? this._currentForm().groups.find(g => g.id === id) : null;
  });

  readonly canUndo = computed(() => this._undoStack().length > 0);
  readonly canRedo = computed(() => this._redoStack().length > 0);
  readonly hasClipboard = computed(() => this._clipboard() !== null);

  // Grouped fields
  readonly groupedFields = computed(() => {
    const fields = this._currentForm().fields;
    const groups = this._currentForm().groups;

    const result: { group: FieldGroup | null; fields: FormFieldDef[] }[] = [];

    // Ungrouped fields first
    const ungrouped = fields.filter(f => !f.groupId).sort((a, b) => a.order - b.order);
    if (ungrouped.length > 0) {
      result.push({ group: null, fields: ungrouped });
    }

    // Grouped fields
    for (const group of groups.sort((a, b) => a.order - b.order)) {
      const groupFields = fields.filter(f => f.groupId === group.id).sort((a, b) => a.order - b.order);
      result.push({ group, fields: groupFields });
    }

    return result;
  });

  // ============================================
  // Initialization
  // ============================================

  constructor() {
    this.loadFromStorage();
  }

  // ✅ SECURITY FIX: Validate localStorage data before using it
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }

      // Parse JSON
      const parsed = JSON.parse(stored);

      // Validate with Zod schema
      const validation = StorageDataSchema.safeParse(parsed);
      if (!validation.success) {
        console.warn('Invalid localStorage data, resetting:', validation.error);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const data = validation.data;

      // Apply validated data
      if (data.savedForms && Array.isArray(data.savedForms)) {
        this._savedForms.set(data.savedForms);
      }
      if (data.theme) {
        this._theme.set(data.theme);
      }
      if (data.language) {
        this._language.set(data.language);
      }
      if (data.currentFormId && data.savedForms) {
        const form = data.savedForms.find((f: SavedForm) => f.id === data.currentFormId);
        if (form && form.data) {
          this._currentForm.set(form.data);
        }
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
      // Clear corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore if localStorage is not available
      }
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        savedForms: this._savedForms(),
        theme: this._theme(),
        language: this._language(),
        currentFormId: this._currentForm().id,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to storage:', e);
    }
  }

  // ============================================
  // Undo/Redo
  // ============================================

  // ✅ PERFORMANCE FIX: Use structuredClone instead of JSON methods
  private saveSnapshot(): void {
    const current = this._currentForm();
    const snapshot: FormStateSnapshot = {
      fields: deepClone(current.fields),
      groups: deepClone(current.groups),
      settings: deepClone(current.settings),
      crossValidators: deepClone(current.crossValidators),
      timestamp: Date.now(),
    };

    const stack = [...this._undoStack(), snapshot];
    if (stack.length > MAX_UNDO_STACK) {
      stack.shift();
    }

    this._undoStack.set(stack);
    this._redoStack.set([]); // Clear redo on new action
  }

  // ✅ PERFORMANCE FIX: Use structuredClone for undo
  undo(): void {
    const undoStack = this._undoStack();
    if (undoStack.length === 0) return;

    // Save current state to redo
    const current = this._currentForm();
    const currentSnapshot: FormStateSnapshot = {
      fields: deepClone(current.fields),
      groups: deepClone(current.groups),
      settings: deepClone(current.settings),
      crossValidators: deepClone(current.crossValidators),
      timestamp: Date.now(),
    };

    // ✅ MEMORY LEAK FIX: Add size limit to redo stack
    this._redoStack.update(stack => {
      const newStack = [...stack, currentSnapshot];
      if (newStack.length > MAX_UNDO_STACK) {
        newStack.shift();  // Remove oldest entry
      }
      return newStack;
    });

    // Restore previous state
    const snapshot = undoStack[undoStack.length - 1];
    this._undoStack.update(stack => stack.slice(0, -1));

    this._currentForm.update(form => ({
      ...form,
      fields: snapshot.fields,
      groups: snapshot.groups,
      settings: snapshot.settings,
      crossValidators: snapshot.crossValidators,
      updatedAt: new Date(),
    }));
  }

  // ✅ MEMORY LEAK FIX + PERFORMANCE FIX: structuredClone for redo
  redo(): void {
    const redoStack = this._redoStack();
    if (redoStack.length === 0) return;

    // Save current state to undo
    const current = this._currentForm();
    const currentSnapshot: FormStateSnapshot = {
      fields: deepClone(current.fields),
      groups: deepClone(current.groups),
      settings: deepClone(current.settings),
      crossValidators: deepClone(current.crossValidators),
      timestamp: Date.now(),
    };

    // Add to undo stack with size limit
    this._undoStack.update(stack => {
      const newStack = [...stack, currentSnapshot];
      if (newStack.length > MAX_UNDO_STACK) {
        newStack.shift();  // Remove oldest entry
      }
      return newStack;
    });

    // Restore redo state
    const snapshot = redoStack[redoStack.length - 1];
    this._redoStack.update(stack => stack.slice(0, -1));

    this._currentForm.update(form => ({
      ...form,
      fields: snapshot.fields,
      groups: snapshot.groups,
      settings: snapshot.settings,
      crossValidators: snapshot.crossValidators,
      updatedAt: new Date(),
    }));
  }

  // ============================================
  // Field Operations
  // ============================================

  addField(field: Omit<FormFieldDef, 'id' | 'order'>, groupId?: string): FormFieldDef {
    this.saveSnapshot();

    const fields = this._currentForm().fields;
    const newField: FormFieldDef = {
      ...field,
      id: generateId(),
      order: fields.length,
      groupId,
      config: { ...field.config },
    };

    this._currentForm.update(form => ({
      ...form,
      fields: [...form.fields, newField],
      updatedAt: new Date(),
    }));

    this.selectField(newField.id);
    return newField;
  }

  updateField(id: string, updates: Partial<FormFieldDef>): void {
    this.saveSnapshot();

    this._currentForm.update(form => ({
      ...form,
      fields: form.fields.map(f => f.id === id ? { ...f, ...updates } : f),
      updatedAt: new Date(),
    }));
  }

  updateFieldConfig(id: string, configKey: string, value: unknown): void {
    this.saveSnapshot();

    this._currentForm.update(form => ({
      ...form,
      fields: form.fields.map(f => {
        if (f.id === id) {
          return { ...f, config: { ...f.config, [configKey]: value } };
        }
        return f;
      }),
      updatedAt: new Date(),
    }));
  }

  removeField(id: string): void {
    this.saveSnapshot();

    this._currentForm.update(form => ({
      ...form,
      fields: form.fields.filter(f => f.id !== id),
      updatedAt: new Date(),
    }));

    if (this._selectedFieldId() === id) {
      this._selectedFieldId.set(null);
    }
  }

  duplicateField(id: string): FormFieldDef | null {
    const field = this._currentForm().fields.find(f => f.id === id);
    if (!field) return null;

    const newField = this.addField({
      type: field.type,
      name: field.name + '_copy',
      label: field.label + ' (Copy)',
      config: deepClone(field.config),
      groupId: field.groupId,
    }, field.groupId);

    return newField;
  }

  moveField(id: string, direction: 'up' | 'down'): void {
    this.saveSnapshot();

    const fields = [...this._currentForm().fields];
    const index = fields.findIndex(f => f.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    // Swap orders
    const temp = fields[index].order;
    fields[index] = { ...fields[index], order: fields[newIndex].order };
    fields[newIndex] = { ...fields[newIndex], order: temp };

    // Sort by order
    fields.sort((a, b) => a.order - b.order);

    this._currentForm.update(form => ({
      ...form,
      fields,
      updatedAt: new Date(),
    }));
  }

  reorderFields(fromIndex: number, toIndex: number): void {
    this.saveSnapshot();

    const fields = [...this._currentForm().fields];
    const [removed] = fields.splice(fromIndex, 1);
    fields.splice(toIndex, 0, removed);

    // Recalculate orders
    fields.forEach((f, i) => f.order = i);

    this._currentForm.update(form => ({
      ...form,
      fields,
      updatedAt: new Date(),
    }));
  }

  selectField(id: string | null): void {
    this._selectedFieldId.set(id);
    this._selectedGroupId.set(null);
  }

  // ============================================
  // Clipboard Operations
  // ============================================

  copyField(id: string): void {
    const field = this._currentForm().fields.find(f => f.id === id);
    if (field) {
      this._clipboard.set(deepClone(field));
    }
  }

  cutField(id: string): void {
    this.copyField(id);
    this.removeField(id);
  }

  pasteField(groupId?: string): FormFieldDef | null {
    const clipboard = this._clipboard();
    if (!clipboard) return null;

    return this.addField({
      type: clipboard.type,
      name: clipboard.name + '_paste',
      label: clipboard.label,
      config: JSON.parse(JSON.stringify(clipboard.config)),
    }, groupId);
  }

  // ============================================
  // Group Operations
  // ============================================

  addGroup(name: string, label: string): FieldGroup {
    this.saveSnapshot();

    const groups = this._currentForm().groups;
    const newGroup: FieldGroup = {
      id: generateId(),
      name,
      label,
      order: groups.length,
      collapsible: true,
      collapsed: false,
    };

    this._currentForm.update(form => ({
      ...form,
      groups: [...form.groups, newGroup],
      updatedAt: new Date(),
    }));

    this.selectGroup(newGroup.id);
    return newGroup;
  }

  updateGroup(id: string, updates: Partial<FieldGroup>): void {
    this.saveSnapshot();

    this._currentForm.update(form => ({
      ...form,
      groups: form.groups.map(g => g.id === id ? { ...g, ...updates } : g),
      updatedAt: new Date(),
    }));
  }

  removeGroup(id: string): void {
    this.saveSnapshot();

    // Move fields to ungrouped
    this._currentForm.update(form => ({
      ...form,
      groups: form.groups.filter(g => g.id !== id),
      fields: form.fields.map(f => f.groupId === id ? { ...f, groupId: undefined } : f),
      updatedAt: new Date(),
    }));

    if (this._selectedGroupId() === id) {
      this._selectedGroupId.set(null);
    }
  }

  selectGroup(id: string | null): void {
    this._selectedGroupId.set(id);
    this._selectedFieldId.set(null);
  }

  moveFieldToGroup(fieldId: string, groupId: string | undefined): void {
    this.saveSnapshot();

    this._currentForm.update(form => ({
      ...form,
      fields: form.fields.map(f => f.id === fieldId ? { ...f, groupId } : f),
      updatedAt: new Date(),
    }));
  }

  // ============================================
  // Cross Validator Operations
  // ============================================

  addCrossValidator(validator: Omit<CrossValidatorDef, 'id'>): CrossValidatorDef {
    this.saveSnapshot();

    const newValidator: CrossValidatorDef = {
      ...validator,
      id: generateId(),
    };

    this._currentForm.update(form => ({
      ...form,
      crossValidators: [...form.crossValidators, newValidator],
      updatedAt: new Date(),
    }));

    return newValidator;
  }

  updateCrossValidator(id: string, updates: Partial<CrossValidatorDef>): void {
    this.saveSnapshot();

    this._currentForm.update(form => ({
      ...form,
      crossValidators: form.crossValidators.map(v => v.id === id ? { ...v, ...updates } : v),
      updatedAt: new Date(),
    }));
  }

  removeCrossValidator(id: string): void {
    this.saveSnapshot();

    this._currentForm.update(form => ({
      ...form,
      crossValidators: form.crossValidators.filter(v => v.id !== id),
      updatedAt: new Date(),
    }));
  }

  // ============================================
  // Form Settings
  // ============================================

  updateSettings(updates: Partial<FormSettings>): void {
    this.saveSnapshot();

    this._currentForm.update(form => ({
      ...form,
      settings: { ...form.settings, ...updates },
      updatedAt: new Date(),
    }));
  }

  updateFormMeta(name: string, description?: string): void {
    this._currentForm.update(form => ({
      ...form,
      name,
      description,
      updatedAt: new Date(),
    }));
  }

  // ============================================
  // Form Management
  // ============================================

  newForm(): void {
    this._currentForm.set(createEmptyForm());
    this._selectedFieldId.set(null);
    this._selectedGroupId.set(null);
    this._undoStack.set([]);
    this._redoStack.set([]);
  }

  saveForm(): void {
    const form = this._currentForm();
    const existingIndex = this._savedForms().findIndex(f => f.id === form.id);

    const savedForm: SavedForm = {
      id: form.id,
      name: form.name,
      description: form.description,
      data: deepClone(form),
      savedAt: new Date(),
    };

    if (existingIndex >= 0) {
      this._savedForms.update(forms => {
        const newForms = [...forms];
        newForms[existingIndex] = savedForm;
        return newForms;
      });
    } else {
      this._savedForms.update(forms => [...forms, savedForm]);
    }

    this.saveToStorage();
  }

  loadForm(id: string): void {
    const saved = this._savedForms().find(f => f.id === id);
    if (saved) {
      this._currentForm.set(deepClone(saved.data));
      this._selectedFieldId.set(null);
      this._selectedGroupId.set(null);
      this._undoStack.set([]);
      this._redoStack.set([]);
      this.saveToStorage();
    }
  }

  deleteForm(id: string): void {
    this._savedForms.update(forms => forms.filter(f => f.id !== id));
    this.saveToStorage();
  }

  clearAllFields(): void {
    this.saveSnapshot();

    this._currentForm.update(form => ({
      ...form,
      fields: [],
      groups: [],
      crossValidators: [],
      updatedAt: new Date(),
    }));

    this._selectedFieldId.set(null);
    this._selectedGroupId.set(null);
  }

  // ============================================
  // Import/Export
  // ============================================

  exportToJson(): string {
    return JSON.stringify(this._currentForm(), null, 2);
  }

  exportFieldsToJson(): string {
    const fields = this._currentForm().fields.map(f => ({
      type: f.type,
      name: f.name,
      label: f.label,
      config: f.config,
    }));
    return JSON.stringify(fields, null, 2);
  }

  importFromJson(json: string): boolean {
    try {
      const data = JSON.parse(json);

      // Check if it's a full form or just fields array
      if (Array.isArray(data)) {
        // It's just fields
        this.saveSnapshot();
        const fields: FormFieldDef[] = data.map((f, i) => ({
          id: generateId(),
          type: f.type,
          name: f.name,
          label: f.label,
          config: f.config || {},
          order: i,
        }));

        this._currentForm.update(form => ({
          ...form,
          fields,
          updatedAt: new Date(),
        }));
      } else if (data.fields) {
        // It's a full form definition
        this._currentForm.set({
          ...data,
          id: data.id || generateId(),
          createdAt: new Date(data.createdAt || Date.now()),
          updatedAt: new Date(),
        });
      }

      this._selectedFieldId.set(null);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  async importFromUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url);
      const json = await response.text();
      return this.importFromJson(json);
    } catch (e) {
      console.error('Import from URL failed:', e);
      return false;
    }
  }

  // ============================================
  // Theme & Language
  // ============================================

  setTheme(theme: Theme): void {
    this._theme.set(theme);
    this.saveToStorage();
  }

  toggleTheme(): void {
    this._theme.update(t => t === 'dark' ? 'light' : 'dark');
    this.saveToStorage();
  }

  setLanguage(lang: Language): void {
    this._language.set(lang);
    this.saveToStorage();
  }

  toggleLanguage(): void {
    this._language.update(l => l === 'tr' ? 'en' : 'tr');
    this.saveToStorage();
  }
}
