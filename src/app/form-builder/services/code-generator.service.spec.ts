import { TestBed } from '@angular/core/testing';
import { CodeGeneratorService } from './code-generator.service';
import { FormDefinition, createEmptyForm } from '../models/form-builder.types';

describe('CodeGeneratorService', () => {
  let service: CodeGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CodeGeneratorService);
  });

  function createTestForm(): FormDefinition {
    const form = createEmptyForm();
    form.name = 'TestForm';
    form.description = 'A test form';
    form.fields = [
      {
        id: '1',
        type: 'string',
        name: 'firstName',
        label: 'First Name',
        config: { required: true, minLength: 2, maxLength: 50 },
        order: 0
      },
      {
        id: '2',
        type: 'email',
        name: 'email',
        label: 'Email Address',
        config: { required: true },
        order: 1
      },
      {
        id: '3',
        type: 'select',
        name: 'country',
        label: 'Country',
        config: {
          options: [
            { value: 'tr', label: 'Turkey' },
            { value: 'us', label: 'USA' }
          ]
        },
        order: 2
      }
    ];
    return form;
  }

  describe('JSON Generation', () => {
    it('should generate valid JSON', () => {
      const form = createTestForm();

      const json = service.generateJson(form);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('TestForm');
      expect(parsed.fields.length).toBe(3);
    });

    it('should include field configurations', () => {
      const form = createTestForm();

      const json = service.generateJson(form);
      const parsed = JSON.parse(json);

      expect(parsed.fields[0].config.required).toBe(true);
      expect(parsed.fields[0].config.minLength).toBe(2);
    });

    it('should include select options', () => {
      const form = createTestForm();

      const json = service.generateJson(form);
      const parsed = JSON.parse(json);

      const selectField = parsed.fields.find((f: any) => f.type === 'select');
      expect(selectField.config.options.length).toBe(2);
      expect(selectField.config.options[0].value).toBe('tr');
    });

    it('should exclude undefined groupId', () => {
      const form = createTestForm();

      const json = service.generateJson(form);
      const parsed = JSON.parse(json);

      expect(parsed.fields[0].groupId).toBeUndefined();
    });
  });

  describe('TypeScript Generation', () => {
    it('should generate valid TypeScript code', () => {
      const form = createTestForm();

      const ts = service.generateTypeScript(form);

      expect(ts).toContain("import {");
      expect(ts).toContain("from '@biyonik/zignal'");
      expect(ts).toContain("export interface TestFormFormData");
      expect(ts).toContain("export const formSchema");
      expect(ts).toContain("export function createFormState");
    });

    it('should generate correct interface properties', () => {
      const form = createTestForm();

      const ts = service.generateTypeScript(form);

      expect(ts).toContain('firstName: string');
      expect(ts).toContain('email: string');
      expect(ts).toContain('country?: string'); // not required, so optional
    });

    it('should include field classes in imports', () => {
      const form = createTestForm();

      const ts = service.generateTypeScript(form);

      expect(ts).toContain('StringField');
      expect(ts).toContain('EmailField');
      expect(ts).toContain('SelectField');
    });

    it('should generate field definitions with config', () => {
      const form = createTestForm();

      const ts = service.generateTypeScript(form);

      expect(ts).toContain("new StringField('firstName', 'First Name'");
      expect(ts).toContain('required: true');
      expect(ts).toContain('minLength: 2');
      expect(ts).toContain('maxLength: 50');
    });

    it('should generate select options', () => {
      const form = createTestForm();

      const ts = service.generateTypeScript(form);

      expect(ts).toContain("options: [");
      expect(ts).toContain("{ value: 'tr', label: 'Turkey' }");
      expect(ts).toContain("{ value: 'us', label: 'USA' }");
    });

    it('should handle cross-field validators', () => {
      const form = createTestForm();
      form.crossValidators = [{
        id: 'cv1',
        name: 'passwordMatch',
        type: 'fieldsMatch',
        fields: ['password', 'confirmPassword'],
        message: { tr: 'Sifreler eslesmiyor', en: 'Passwords do not match' }
      }];

      const ts = service.generateTypeScript(form);

      expect(ts).toContain('CrossFieldValidator');
      expect(ts).toContain('passwordMatchValidator');
      expect(ts).toContain("fields: ['password', 'confirmPassword']");
    });

    it('should handle conditional visibility', () => {
      const form = createEmptyForm();
      form.name = 'ConditionalForm';
      form.fields = [{
        id: '1',
        type: 'string',
        name: 'otherField',
        label: 'Other Field',
        config: {
          showWhen: { field: 'trigger', operator: 'equals', value: 'yes' }
        },
        order: 0
      }];

      const ts = service.generateTypeScript(form);

      expect(ts).toContain('showExpression');
      expect(ts).toContain("trigger === 'yes'");
    });

    it('should escape special characters in strings', () => {
      const form = createEmptyForm();
      form.name = 'TestForm';
      form.fields = [{
        id: '1',
        type: 'string',
        name: 'test',
        label: "It's a test",
        config: {},
        order: 0
      }];

      const ts = service.generateTypeScript(form);

      expect(ts).toContain("It\\'s a test");
    });
  });

  describe('generate method', () => {
    it('should return JSON when format is json', () => {
      const form = createTestForm();

      const result = service.generate(form, 'json');

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should return TypeScript when format is typescript', () => {
      const form = createTestForm();

      const result = service.generate(form, 'typescript');

      expect(result).toContain('import {');
      expect(result).toContain('export interface');
    });
  });

  describe('Field Type Mapping', () => {
    it('should map all field types to correct classes', () => {
      const fieldTypes = [
        { type: 'string', expected: 'StringField' },
        { type: 'textarea', expected: 'TextareaField' },
        { type: 'number', expected: 'NumberField' },
        { type: 'email', expected: 'EmailField' },
        { type: 'password', expected: 'PasswordField' },
        { type: 'url', expected: 'UrlField' },
        { type: 'phone', expected: 'PhoneField' },
        { type: 'select', expected: 'SelectField' },
        { type: 'boolean', expected: 'BooleanField' },
        { type: 'date', expected: 'DateField' },
      ];

      fieldTypes.forEach(({ type, expected }) => {
        const form = createEmptyForm();
        form.name = 'Test';
        form.fields = [{ id: '1', type, name: 'test', label: 'Test', config: {}, order: 0 }];

        const ts = service.generateTypeScript(form);
        expect(ts).toContain(expected);
      });
    });

    it('should map field types to correct TypeScript types', () => {
      const form = createEmptyForm();
      form.name = 'Test';
      form.fields = [
        { id: '1', type: 'number', name: 'num', label: 'Number', config: { required: true }, order: 0 },
        { id: '2', type: 'boolean', name: 'bool', label: 'Boolean', config: { required: true }, order: 1 },
        { id: '3', type: 'multiselect', name: 'multi', label: 'Multi', config: { required: true }, order: 2 },
        { id: '4', type: 'date', name: 'date', label: 'Date', config: { required: true }, order: 3 },
      ];

      const ts = service.generateTypeScript(form);

      expect(ts).toContain('num: number');
      expect(ts).toContain('bool: boolean');
      expect(ts).toContain('multi: string[]');
      expect(ts).toContain('date: Date | string');
    });
  });

  describe('Groups', () => {
    it('should add group comments in TypeScript output', () => {
      const form = createEmptyForm();
      form.name = 'Test';
      form.groups = [{ id: 'g1', name: 'personal', label: 'Personal Info', order: 0 }];
      form.fields = [
        { id: '1', type: 'string', name: 'name', label: 'Name', config: {}, groupId: 'g1', order: 0 }
      ];

      const ts = service.generateTypeScript(form);

      expect(ts).toContain('// === Personal Info ===');
    });
  });

  describe('Operators', () => {
    it('should generate correct expressions for all operators', () => {
      const operators = [
        { operator: 'equals', value: 'test', expected: "=== 'test'" },
        { operator: 'notEquals', value: 'test', expected: "!== 'test'" },
        { operator: 'contains', value: 'test', expected: "includes('test')" },
        { operator: 'greaterThan', value: 10, expected: '> 10' },
        { operator: 'lessThan', value: 5, expected: '< 5' },
        { operator: 'isEmpty', expected: "=== ''" },
        { operator: 'isNotEmpty', expected: "!== ''" },
      ];

      operators.forEach(({ operator, value, expected }) => {
        const form = createEmptyForm();
        form.name = 'Test';
        form.fields = [{
          id: '1',
          type: 'string',
          name: 'test',
          label: 'Test',
          config: {
            showWhen: { field: 'trigger', operator: operator as any, value }
          },
          order: 0
        }];

        const ts = service.generateTypeScript(form);
        expect(ts).toContain(expected);
      });
    });
  });
});
