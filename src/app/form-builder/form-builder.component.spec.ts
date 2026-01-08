import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilderComponent } from './form-builder.component';
import { FormBuilderService } from './services/form-builder.service';
import { CodeGeneratorService } from './services/code-generator.service';
import { FormFieldDef, ConditionalRule } from './models/form-builder.types';

describe('FormBuilderComponent', () => {
  let component: FormBuilderComponent;
  let fixture: ComponentFixture<FormBuilderComponent>;
  let service: FormBuilderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormBuilderComponent],
      providers: [FormBuilderService, CodeGeneratorService]
    }).compileComponents();

    fixture = TestBed.createComponent(FormBuilderComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(FormBuilderService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Conditional Logic - isFieldVisible', () => {
    function createField(config: Record<string, unknown>): FormFieldDef {
      return {
        id: 'test-field',
        type: 'string',
        name: 'testField',
        label: 'Test Field',
        config,
        order: 0
      };
    }

    describe('showWhen conditions', () => {
      it('should show field when showWhen condition is met (equals)', () => {
        const field = createField({
          showWhen: { field: 'trigger', operator: 'equals', value: 'show' }
        });

        component.previewValues.set({ trigger: 'show' });
        expect(component.isFieldVisible(field)).toBe(true);
      });

      it('should hide field when showWhen condition is not met', () => {
        const field = createField({
          showWhen: { field: 'trigger', operator: 'equals', value: 'show' }
        });

        component.previewValues.set({ trigger: 'hide' });
        expect(component.isFieldVisible(field)).toBe(false);
      });

      it('should hide field when showWhen trigger field is empty', () => {
        const field = createField({
          showWhen: { field: 'trigger', operator: 'equals', value: 'show' }
        });

        component.previewValues.set({});
        expect(component.isFieldVisible(field)).toBe(false);
      });
    });

    describe('hideWhen conditions', () => {
      it('should hide field when hideWhen condition is met', () => {
        const field = createField({
          hideWhen: { field: 'trigger', operator: 'equals', value: 'hide' }
        });

        component.previewValues.set({ trigger: 'hide' });
        expect(component.isFieldVisible(field)).toBe(false);
      });

      it('should show field when hideWhen condition is not met', () => {
        const field = createField({
          hideWhen: { field: 'trigger', operator: 'equals', value: 'hide' }
        });

        component.previewValues.set({ trigger: 'show' });
        expect(component.isFieldVisible(field)).toBe(true);
      });
    });

    describe('No conditions', () => {
      it('should always show field without conditions', () => {
        const field = createField({});

        component.previewValues.set({});
        expect(component.isFieldVisible(field)).toBe(true);

        component.previewValues.set({ anything: 'value' });
        expect(component.isFieldVisible(field)).toBe(true);
      });
    });
  });

  describe('Conditional Logic - isFieldDisabled', () => {
    function createField(config: Record<string, unknown>): FormFieldDef {
      return {
        id: 'test-field',
        type: 'string',
        name: 'testField',
        label: 'Test Field',
        config,
        order: 0
      };
    }

    it('should disable field when disableWhen condition is met', () => {
      const field = createField({
        disableWhen: { field: 'status', operator: 'equals', value: 'readonly' }
      });

      component.previewValues.set({ status: 'readonly' });
      expect(component.isFieldDisabled(field)).toBe(true);
    });

    it('should enable field when disableWhen condition is not met', () => {
      const field = createField({
        disableWhen: { field: 'status', operator: 'equals', value: 'readonly' }
      });

      component.previewValues.set({ status: 'editable' });
      expect(component.isFieldDisabled(field)).toBe(false);
    });

    it('should enable field without disableWhen condition', () => {
      const field = createField({});

      component.previewValues.set({});
      expect(component.isFieldDisabled(field)).toBe(false);
    });
  });

  describe('Condition Operators', () => {
    function testCondition(operator: string, fieldValue: unknown, conditionValue: unknown, expected: boolean) {
      const field: FormFieldDef = {
        id: 'test',
        type: 'string',
        name: 'test',
        label: 'Test',
        config: {
          showWhen: { field: 'trigger', operator, value: conditionValue } as ConditionalRule
        },
        order: 0
      };

      component.previewValues.set({ trigger: fieldValue });
      expect(component.isFieldVisible(field)).toBe(expected);
    }

    describe('equals operator', () => {
      it('should match string equality', () => {
        testCondition('equals', 'hello', 'hello', true);
        testCondition('equals', 'hello', 'world', false);
      });

      it('should match number equality', () => {
        testCondition('equals', 5, 5, true);
        testCondition('equals', 5, 10, false);
      });

      it('should match boolean equality', () => {
        testCondition('equals', true, true, true);
        testCondition('equals', false, true, false);
      });

      it('should coerce string to number comparison', () => {
        testCondition('equals', '5', 5, true);
        testCondition('equals', 5, '5', true);
      });
    });

    describe('notEquals operator', () => {
      it('should match inequality', () => {
        testCondition('notEquals', 'hello', 'world', true);
        testCondition('notEquals', 'hello', 'hello', false);
      });
    });

    describe('contains operator', () => {
      it('should match string contains', () => {
        testCondition('contains', 'hello world', 'world', true);
        testCondition('contains', 'hello world', 'foo', false);
      });

      it('should be case insensitive', () => {
        testCondition('contains', 'Hello World', 'world', true);
        testCondition('contains', 'hello world', 'WORLD', true);
      });

      it('should return false for non-string values', () => {
        testCondition('contains', 123, 'test', false);
        testCondition('contains', null, 'test', false);
      });
    });

    describe('greaterThan operator', () => {
      it('should compare numbers', () => {
        testCondition('greaterThan', 10, 5, true);
        testCondition('greaterThan', 5, 10, false);
        testCondition('greaterThan', 5, 5, false);
      });

      it('should coerce strings to numbers', () => {
        testCondition('greaterThan', '10', 5, true);
        testCondition('greaterThan', 10, '5', true);
      });
    });

    describe('lessThan operator', () => {
      it('should compare numbers', () => {
        testCondition('lessThan', 5, 10, true);
        testCondition('lessThan', 10, 5, false);
        testCondition('lessThan', 5, 5, false);
      });
    });

    describe('isEmpty operator', () => {
      it('should detect empty values', () => {
        testCondition('isEmpty', '', undefined, true);
        testCondition('isEmpty', null, undefined, true);
        testCondition('isEmpty', undefined, undefined, true);
        testCondition('isEmpty', 'value', undefined, false);
        testCondition('isEmpty', 0, undefined, false);
      });
    });

    describe('isNotEmpty operator', () => {
      it('should detect non-empty values', () => {
        testCondition('isNotEmpty', 'value', undefined, true);
        testCondition('isNotEmpty', 0, undefined, true);
        testCondition('isNotEmpty', '', undefined, false);
        testCondition('isNotEmpty', null, undefined, false);
      });
    });
  });

  describe('Validation', () => {
    it('should validate required field', () => {
      service.addField({
        type: 'string',
        name: 'required',
        label: 'Required Field',
        config: { required: true }
      });

      component.onPreviewBlur('required', '');

      expect(component.previewErrors()['required']).toContain('zorunlu');
    });

    it('should validate minLength', () => {
      service.addField({
        type: 'string',
        name: 'test',
        label: 'Test',
        config: { minLength: 5 }
      });

      component.onPreviewBlur('test', 'abc');

      expect(component.previewErrors()['test']).toContain('5');
    });

    it('should validate maxLength', () => {
      service.addField({
        type: 'string',
        name: 'test',
        label: 'Test',
        config: { maxLength: 3 }
      });

      component.onPreviewBlur('test', 'abcdef');

      expect(component.previewErrors()['test']).toContain('3');
    });

    it('should validate email format', () => {
      service.addField({
        type: 'email',
        name: 'email',
        label: 'Email',
        config: {}
      });

      component.onPreviewBlur('email', 'invalid-email');

      expect(component.previewErrors()['email']).toContain('e-posta');
    });

    it('should pass valid email', () => {
      service.addField({
        type: 'email',
        name: 'email',
        label: 'Email',
        config: {}
      });

      component.onPreviewBlur('email', 'valid@email.com');

      expect(component.previewErrors()['email']).toBe('');
    });

    it('should validate URL format', () => {
      service.addField({
        type: 'url',
        name: 'url',
        label: 'URL',
        config: {}
      });

      component.onPreviewBlur('url', 'not-a-url');

      expect(component.previewErrors()['url']).toContain('URL');
    });

    it('should pass valid URL', () => {
      service.addField({
        type: 'url',
        name: 'url',
        label: 'URL',
        config: {}
      });

      component.onPreviewBlur('url', 'https://example.com');

      expect(component.previewErrors()['url']).toBe('');
    });

    it('should validate min value for numbers', () => {
      service.addField({
        type: 'number',
        name: 'num',
        label: 'Number',
        config: { min: 10 }
      });

      component.onPreviewBlur('num', 5);

      expect(component.previewErrors()['num']).toContain('10');
    });

    it('should validate max value for numbers', () => {
      service.addField({
        type: 'number',
        name: 'num',
        label: 'Number',
        config: { max: 10 }
      });

      component.onPreviewBlur('num', 15);

      expect(component.previewErrors()['num']).toContain('10');
    });

    it('should validate pattern', () => {
      service.addField({
        type: 'string',
        name: 'code',
        label: 'Code',
        config: { pattern: '^[A-Z]{3}$' }
      });

      component.onPreviewBlur('code', 'abc');

      expect(component.previewErrors()['code']).toContain('format');
    });

    it('should pass valid pattern', () => {
      service.addField({
        type: 'string',
        name: 'code',
        label: 'Code',
        config: { pattern: '^[A-Z]{3}$' }
      });

      component.onPreviewBlur('code', 'ABC');

      expect(component.previewErrors()['code']).toBe('');
    });

    it('should clear error on input', () => {
      service.addField({
        type: 'string',
        name: 'test',
        label: 'Test',
        config: { required: true }
      });

      // First set an error
      component.onPreviewBlur('test', '');
      expect(component.previewErrors()['test']).not.toBe('');

      // Then type something
      component.onPreviewInput('test', 'new value');
      expect(component.previewErrors()['test']).toBe('');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle Ctrl+Z for undo', () => {
      service.addField({ type: 'string', name: 'test', label: 'Test', config: {} });
      expect(service.fields().length).toBe(1);

      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
      component.onKeyDown(event);

      expect(service.fields().length).toBe(0);
    });

    it('should handle Ctrl+Y for redo', () => {
      service.addField({ type: 'string', name: 'test', label: 'Test', config: {} });
      service.undo();
      expect(service.fields().length).toBe(0);

      const event = new KeyboardEvent('keydown', { key: 'y', ctrlKey: true });
      component.onKeyDown(event);

      expect(service.fields().length).toBe(1);
    });

    it('should handle Escape to deselect', () => {
      service.addField({ type: 'string', name: 'test', label: 'Test', config: {} });
      service.selectField(service.fields()[0].id);
      expect(service.selectedFieldId()).not.toBeNull();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onKeyDown(event);

      expect(service.selectedFieldId()).toBeNull();
    });

    it('should handle Delete to remove selected field', () => {
      service.addField({ type: 'string', name: 'test', label: 'Test', config: {} });
      service.selectField(service.fields()[0].id);

      const event = new KeyboardEvent('keydown', { key: 'Delete' });
      component.onKeyDown(event);

      expect(service.fields().length).toBe(0);
    });

    it('should handle Ctrl+D to duplicate selected field', () => {
      service.addField({ type: 'string', name: 'test', label: 'Test', config: {} });
      service.selectField(service.fields()[0].id);

      const event = new KeyboardEvent('keydown', { key: 'd', ctrlKey: true });
      component.onKeyDown(event);

      expect(service.fields().length).toBe(2);
    });
  });

  describe('Translation', () => {
    it('should return Turkish translations when language is tr', () => {
      service.toggleLanguage(); // Switch to TR if not already
      if (service.language() !== 'tr') {
        service.toggleLanguage();
      }

      expect(component.t('required')).toBe('Zorunlu');
    });

    it('should return English translations when language is en', () => {
      service.toggleLanguage(); // Switch to EN if not already
      if (service.language() !== 'en') {
        service.toggleLanguage();
      }

      expect(component.t('required')).toBe('Required');
    });
  });

  describe('Export', () => {
    it('should compute JSON export', () => {
      service.addField({
        type: 'email',
        name: 'email',
        label: 'Email',
        config: { required: true }
      });

      component.exportFormat.set('json');
      const output = component.currentExport();

      const parsed = JSON.parse(output);
      expect(parsed.fields.length).toBe(1);
      expect(parsed.fields[0].type).toBe('email');
    });

    it('should compute TypeScript export', () => {
      service.addField({
        type: 'email',
        name: 'email',
        label: 'Email',
        config: { required: true }
      });

      component.exportFormat.set('typescript');
      const output = component.currentExport();

      expect(output).toContain('EmailField');
      expect(output).toContain('export interface');
    });
  });

  describe('Helper Methods', () => {
    it('should get correct stars array', () => {
      expect(component.getStars(5)).toEqual([0, 1, 2, 3, 4]);
      expect(component.getStars(3)).toEqual([0, 1, 2]);
    });

    it('should correctly identify filled stars', () => {
      component.previewValues.set({ rating: 3 });

      expect(component.isStarFilled('rating', 0)).toBe(true);
      expect(component.isStarFilled('rating', 1)).toBe(true);
      expect(component.isStarFilled('rating', 2)).toBe(true);
      expect(component.isStarFilled('rating', 3)).toBe(false);
      expect(component.isStarFilled('rating', 4)).toBe(false);
    });

    it('should reset preview values and errors', () => {
      component.previewValues.set({ test: 'value' });
      component.previewErrors.set({ test: 'error' });

      component.resetPreview();

      expect(component.previewValues()).toEqual({});
      expect(component.previewErrors()).toEqual({});
    });
  });
});
