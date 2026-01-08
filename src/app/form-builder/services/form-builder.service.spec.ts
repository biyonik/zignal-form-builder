import { TestBed } from '@angular/core/testing';
import { FormBuilderService } from './form-builder.service';
import { FormFieldDef, FormDefinition, CrossValidatorDef } from '../models/form-builder.types';

describe('FormBuilderService', () => {
  let service: FormBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormBuilderService);
    // Clear localStorage before each test
    localStorage.clear();
    // Reset service state
    service.newForm();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Field Operations', () => {
    it('should add a field to the form', () => {
      expect(service.fields().length).toBe(0);

      service.addField({
        type: 'string',
        name: 'testField',
        label: 'Test Field',
        config: { required: true }
      });

      expect(service.fields().length).toBe(1);
      expect(service.fields()[0].name).toBe('testField');
      expect(service.fields()[0].type).toBe('string');
    });

    it('should generate unique IDs for fields', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.addField({ type: 'string', name: 'field2', label: 'Field 2', config: {} });

      const ids = service.fields().map(f => f.id);
      expect(new Set(ids).size).toBe(2);
    });

    it('should remove a field', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      const fieldId = service.fields()[0].id;

      service.removeField(fieldId);

      expect(service.fields().length).toBe(0);
    });

    it('should update field properties', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      const fieldId = service.fields()[0].id;

      service.updateField(fieldId, { label: 'Updated Label', name: 'updatedName' });

      expect(service.fields()[0].label).toBe('Updated Label');
      expect(service.fields()[0].name).toBe('updatedName');
    });

    it('should update field config', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      const fieldId = service.fields()[0].id;

      service.updateFieldConfig(fieldId, 'required', true);
      service.updateFieldConfig(fieldId, 'minLength', 5);

      expect(service.fields()[0].config['required']).toBe(true);
      expect(service.fields()[0].config['minLength']).toBe(5);
    });

    it('should duplicate a field', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: { required: true } });
      const fieldId = service.fields()[0].id;

      service.duplicateField(fieldId);

      expect(service.fields().length).toBe(2);
      expect(service.fields()[1].name).toContain('field1');
      expect(service.fields()[1].config['required']).toBe(true);
    });

    it('should move field up', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.addField({ type: 'string', name: 'field2', label: 'Field 2', config: {} });
      const field2Id = service.fields()[1].id;

      service.moveField(field2Id, 'up');

      expect(service.fields()[0].name).toBe('field2');
      expect(service.fields()[1].name).toBe('field1');
    });

    it('should move field down', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.addField({ type: 'string', name: 'field2', label: 'Field 2', config: {} });
      const field1Id = service.fields()[0].id;

      service.moveField(field1Id, 'down');

      expect(service.fields()[0].name).toBe('field2');
      expect(service.fields()[1].name).toBe('field1');
    });

    it('should reorder fields by index', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.addField({ type: 'string', name: 'field2', label: 'Field 2', config: {} });
      service.addField({ type: 'string', name: 'field3', label: 'Field 3', config: {} });

      service.reorderFields(0, 2);

      expect(service.fields()[0].name).toBe('field2');
      expect(service.fields()[1].name).toBe('field3');
      expect(service.fields()[2].name).toBe('field1');
    });

    it('should clear all fields', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.addField({ type: 'string', name: 'field2', label: 'Field 2', config: {} });

      service.clearAllFields();

      expect(service.fields().length).toBe(0);
    });
  });

  describe('Field Selection', () => {
    it('should select a field', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      const fieldId = service.fields()[0].id;

      service.selectField(fieldId);

      expect(service.selectedFieldId()).toBe(fieldId);
      expect(service.selectedField()?.name).toBe('field1');
    });

    it('should deselect field when null is passed', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.selectField(service.fields()[0].id);

      service.selectField(null);

      expect(service.selectedFieldId()).toBeNull();
      expect(service.selectedField()).toBeNull();
    });
  });

  describe('Group Operations', () => {
    it('should add a group', () => {
      expect(service.groups().length).toBe(0);

      service.addGroup('group1', 'Group 1');

      expect(service.groups().length).toBe(1);
      expect(service.groups()[0].name).toBe('group1');
      expect(service.groups()[0].label).toBe('Group 1');
    });

    it('should remove a group', () => {
      service.addGroup('group1', 'Group 1');
      const groupId = service.groups()[0].id;

      service.removeGroup(groupId);

      expect(service.groups().length).toBe(0);
    });

    it('should update group properties', () => {
      service.addGroup('group1', 'Group 1');
      const groupId = service.groups()[0].id;

      service.updateGroup(groupId, { label: 'Updated Group', collapsible: true });

      expect(service.groups()[0].label).toBe('Updated Group');
      expect(service.groups()[0].collapsible).toBe(true);
    });

    it('should move field to group', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.addGroup('group1', 'Group 1');
      const fieldId = service.fields()[0].id;
      const groupId = service.groups()[0].id;

      service.moveFieldToGroup(fieldId, groupId);

      expect(service.fields()[0].groupId).toBe(groupId);
    });

    it('should remove field from group', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.addGroup('group1', 'Group 1');
      const fieldId = service.fields()[0].id;
      const groupId = service.groups()[0].id;
      service.moveFieldToGroup(fieldId, groupId);

      service.moveFieldToGroup(fieldId, undefined);

      expect(service.fields()[0].groupId).toBeUndefined();
    });

    it('should return grouped fields correctly', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.addField({ type: 'string', name: 'field2', label: 'Field 2', config: {} });
      service.addGroup('group1', 'Group 1');

      const field1Id = service.fields()[0].id;
      const groupId = service.groups()[0].id;
      service.moveFieldToGroup(field1Id, groupId);

      const grouped = service.groupedFields();

      expect(grouped.length).toBe(2); // One group + one ungrouped section
      const groupSection = grouped.find(g => g.group?.id === groupId);
      const ungroupedSection = grouped.find(g => !g.group);

      expect(groupSection?.fields.length).toBe(1);
      expect(ungroupedSection?.fields.length).toBe(1);
    });
  });

  describe('Undo/Redo', () => {
    it('should undo field addition', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });

      expect(service.fields().length).toBe(1);
      expect(service.canUndo()).toBe(true);

      service.undo();

      expect(service.fields().length).toBe(0);
    });

    it('should redo undone action', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.undo();

      expect(service.fields().length).toBe(0);
      expect(service.canRedo()).toBe(true);

      service.redo();

      expect(service.fields().length).toBe(1);
    });

    it('should clear redo stack when new action is performed', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.undo();

      expect(service.canRedo()).toBe(true);

      service.addField({ type: 'string', name: 'field2', label: 'Field 2', config: {} });

      expect(service.canRedo()).toBe(false);
    });

    it('should not undo when stack is empty', () => {
      expect(service.canUndo()).toBe(false);
      service.undo(); // Should not throw
      expect(service.fields().length).toBe(0);
    });

    it('should not redo when stack is empty', () => {
      expect(service.canRedo()).toBe(false);
      service.redo(); // Should not throw
      expect(service.fields().length).toBe(0);
    });
  });

  describe('Clipboard Operations', () => {
    it('should copy a field', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: { required: true } });
      const fieldId = service.fields()[0].id;

      service.copyField(fieldId);

      expect(service.hasClipboard()).toBe(true);
    });

    it('should paste a copied field', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: { required: true } });
      const fieldId = service.fields()[0].id;
      service.copyField(fieldId);

      service.pasteField();

      expect(service.fields().length).toBe(2);
      expect(service.fields()[1].config['required']).toBe(true);
    });

    it('should cut a field (remove original)', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      const fieldId = service.fields()[0].id;

      service.cutField(fieldId);

      expect(service.fields().length).toBe(0);
      expect(service.hasClipboard()).toBe(true);
    });
  });

  describe('Cross-field Validators', () => {
    it('should add a cross validator', () => {
      service.addCrossValidator({
        name: 'passwordMatch',
        type: 'fieldsMatch',
        fields: ['password', 'confirmPassword'],
        message: { tr: 'Şifreler eşleşmiyor', en: 'Passwords do not match' }
      });

      expect(service.crossValidators().length).toBe(1);
      expect(service.crossValidators()[0].name).toBe('passwordMatch');
    });

    it('should remove a cross validator', () => {
      service.addCrossValidator({
        name: 'passwordMatch',
        type: 'fieldsMatch',
        fields: ['password', 'confirmPassword'],
        message: { tr: 'Şifreler eşleşmiyor', en: 'Passwords do not match' }
      });
      const validatorId = service.crossValidators()[0].id;

      service.removeCrossValidator(validatorId);

      expect(service.crossValidators().length).toBe(0);
    });
  });

  describe('Form Settings', () => {
    it('should update form settings', () => {
      service.updateSettings({
        validateOnBlur: false,
        validateOnChange: true,
        layout: 'horizontal'
      });

      expect(service.settings().validateOnBlur).toBe(false);
      expect(service.settings().validateOnChange).toBe(true);
      expect(service.settings().layout).toBe('horizontal');
    });

    it('should update form metadata', () => {
      service.updateFormMeta('My Form', 'Form description');

      expect(service.currentForm().name).toBe('My Form');
      expect(service.currentForm().description).toBe('Form description');
    });
  });

  describe('Theme and Language', () => {
    it('should toggle theme', () => {
      const initialTheme = service.theme();
      service.toggleTheme();
      expect(service.theme()).not.toBe(initialTheme);
    });

    it('should toggle language', () => {
      const initialLang = service.language();
      service.toggleLanguage();
      expect(service.language()).not.toBe(initialLang);
    });
  });

  describe('Form Persistence', () => {
    it('should save form to localStorage', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.updateFormMeta('Test Form', 'Test description');

      service.saveForm();

      expect(service.savedForms().length).toBe(1);
      expect(service.savedForms()[0].name).toBe('Test Form');
    });

    it('should load a saved form', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.saveForm();
      const formId = service.currentForm().id;
      service.newForm();

      service.loadForm(formId);

      expect(service.fields().length).toBe(1);
    });

    it('should delete a saved form', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });
      service.saveForm();
      const formId = service.currentForm().id;

      service.deleteForm(formId);

      expect(service.savedForms().length).toBe(0);
    });

    it('should create a new form', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: {} });

      service.newForm();

      expect(service.fields().length).toBe(0);
      expect(service.groups().length).toBe(0);
    });
  });

  describe('Import/Export', () => {
    it('should export form as JSON', () => {
      service.addField({ type: 'string', name: 'field1', label: 'Field 1', config: { required: true } });

      const json = service.exportToJson();
      const parsed = JSON.parse(json);

      expect(parsed.fields.length).toBe(1);
      expect(parsed.fields[0].name).toBe('field1');
    });

    it('should import form from valid JSON', () => {
      const jsonStr = JSON.stringify({
        name: 'Imported Form',
        fields: [
          { type: 'email', name: 'email', label: 'Email', config: { required: true } }
        ],
        groups: [],
        settings: {},
        crossValidators: []
      });

      const success = service.importFromJson(jsonStr);

      expect(success).toBe(true);
      expect(service.currentForm().name).toBe('Imported Form');
      expect(service.fields().length).toBe(1);
      expect(service.fields()[0].type).toBe('email');
    });

    it('should reject invalid JSON', () => {
      const success = service.importFromJson('not valid json');
      expect(success).toBe(false);
    });

    it('should reject JSON without required structure', () => {
      const success = service.importFromJson(JSON.stringify({ invalid: 'structure' }));
      expect(success).toBe(false);
    });
  });
});
