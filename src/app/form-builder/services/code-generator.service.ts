import { Injectable } from '@angular/core';
import {
  FormDefinition,
  FormFieldDef,
  FieldGroup,
  CrossValidatorDef,
  ExportFormat,
} from '../models/form-builder.types';

/**
 * TR: TypeScript ve JSON kod ureticisi
 * EN: TypeScript and JSON code generator
 */
@Injectable({ providedIn: 'root' })
export class CodeGeneratorService {
  /**
   * TR: Formu belirtilen formatta export et
   * EN: Export form in specified format
   */
  generate(form: FormDefinition, format: ExportFormat): string {
    return format === 'typescript'
      ? this.generateTypeScript(form)
      : this.generateJson(form);
  }

  /**
   * TR: JSON formatinda export
   * EN: Export as JSON
   */
  generateJson(form: FormDefinition): string {
    const exportData = {
      name: form.name,
      description: form.description,
      fields: form.fields.map(f => ({
        type: f.type,
        name: f.name,
        label: f.label,
        config: f.config,
        ...(f.groupId ? { groupId: f.groupId } : {}),
      })),
      groups: form.groups.map(g => ({
        name: g.name,
        label: g.label,
        description: g.description,
        collapsible: g.collapsible,
      })),
      settings: form.settings,
      crossValidators: form.crossValidators.map(v => ({
        name: v.name,
        type: v.type,
        fields: v.fields,
        message: v.message,
        ...(v.customExpression ? { customExpression: v.customExpression } : {}),
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * TR: TypeScript kodu uret
   * EN: Generate TypeScript code
   */
  generateTypeScript(form: FormDefinition): string {
    const imports = this.generateImports(form);
    const interfaceCode = this.generateInterface(form);
    const schemaCode = this.generateSchemaCode(form);
    const crossValidatorCode = this.generateCrossValidators(form);
    const formStateCode = this.generateFormState(form);

    return `${imports}

${interfaceCode}

${schemaCode}

${crossValidatorCode}

${formStateCode}
`;
  }

  /**
   * TR: Import ifadelerini olustur
   * EN: Generate import statements
   */
  private generateImports(form: FormDefinition): string {
    const fieldTypes = new Set(form.fields.map(f => this.getFieldClass(f.type)));
    const imports = ['FormSchema', 'FormState', ...Array.from(fieldTypes)];

    // Add cross-field validator types if needed
    if (form.crossValidators.length > 0) {
      imports.push('CrossFieldValidator');
    }

    return `import {
  ${imports.join(',\n  ')},
} from '@biyonik/zignal';`;
  }

  /**
   * TR: TypeScript interface olustur
   * EN: Generate TypeScript interface
   */
  private generateInterface(form: FormDefinition): string {
    const fields = form.fields.map(f => {
      const type = this.getTypeScriptType(f.type);
      const optional = !f.config.required;
      return `  ${f.name}${optional ? '?' : ''}: ${type};`;
    }).join('\n');

    const interfaceName = this.pascalCase(form.name.replace(/[^a-zA-Z0-9]/g, '')) + 'FormData';

    return `/**
 * TR: Form veri tipi
 * EN: Form data type
 */
export interface ${interfaceName} {
${fields}
}`;
  }

  /**
   * TR: FormSchema kod blogu olustur
   * EN: Generate FormSchema code block
   */
  private generateSchemaCode(form: FormDefinition): string {
    const interfaceName = this.pascalCase(form.name.replace(/[^a-zA-Z0-9]/g, '')) + 'FormData';

    // Group fields by group
    const ungroupedFields = form.fields.filter(f => !f.groupId);
    const groupedFields = form.groups.map(g => ({
      group: g,
      fields: form.fields.filter(f => f.groupId === g.id),
    }));

    let schemaContent = '';

    // Ungrouped fields
    if (ungroupedFields.length > 0) {
      schemaContent += ungroupedFields.map(f => this.generateFieldCode(f)).join('\n\n');
    }

    // Grouped fields with comments
    for (const { group, fields } of groupedFields) {
      if (fields.length > 0) {
        schemaContent += `\n\n  // === ${group.label} ===\n`;
        schemaContent += fields.map(f => this.generateFieldCode(f)).join('\n\n');
      }
    }

    return `/**
 * TR: Form semasi
 * EN: Form schema
 */
export const formSchema = new FormSchema<${interfaceName}>({
${schemaContent}
});`;
  }

  /**
   * TR: Alan kodu olustur
   * EN: Generate field code
   */
  private generateFieldCode(field: FormFieldDef): string {
    const fieldClass = this.getFieldClass(field.type);
    const config = this.generateFieldConfig(field);

    return `  ${field.name}: new ${fieldClass}('${field.name}', '${this.escapeString(field.label)}'${config}),`;
  }

  /**
   * TR: Alan konfigurasyonu olustur
   * EN: Generate field configuration
   */
  private generateFieldConfig(field: FormFieldDef): string {
    const config = field.config;
    const configParts: string[] = [];

    // Required
    if (config.required) {
      configParts.push('required: true');
    }

    // Min/Max Length
    if (config.minLength !== undefined && config.minLength !== 0) {
      configParts.push(`minLength: ${config.minLength}`);
    }
    if (config.maxLength !== undefined) {
      configParts.push(`maxLength: ${config.maxLength}`);
    }

    // Min/Max Value
    if (config.min !== undefined) {
      configParts.push(`min: ${config.min}`);
    }
    if (config.max !== undefined) {
      configParts.push(`max: ${config.max}`);
    }

    // Pattern
    if (config.pattern) {
      configParts.push(`pattern: /${config.pattern}/`);
    }

    // Placeholder
    if (config.placeholder) {
      configParts.push(`placeholder: '${this.escapeString(String(config.placeholder))}'`);
    }

    // Hint
    if (config.hint) {
      configParts.push(`hint: '${this.escapeString(String(config.hint))}'`);
    }

    // Options for select/multiselect
    if (config.options && Array.isArray(config.options) && config.options.length > 0) {
      const optionsStr = config.options.map(o =>
        `{ value: '${this.escapeString(o.value)}', label: '${this.escapeString(o.label)}' }`
      ).join(', ');
      configParts.push(`options: [${optionsStr}]`);
    }

    // Rows for textarea
    if (config.rows && config.rows !== 4) {
      configParts.push(`rows: ${config.rows}`);
    }

    // Currency for money
    if (config.currency && config.currency !== 'TRY') {
      configParts.push(`currency: '${config.currency}'`);
    }

    // Integer for number
    if (config.integer) {
      configParts.push('integer: true');
    }

    // Password requirements
    if (config.requireUppercase) {
      configParts.push('requireUppercase: true');
    }
    if (config.requireLowercase) {
      configParts.push('requireLowercase: true');
    }
    if (config.requireNumber) {
      configParts.push('requireNumber: true');
    }
    if (config.requireSpecial) {
      configParts.push('requireSpecial: true');
    }

    // File accept and maxSize
    if (config.accept && config.accept !== '*') {
      configParts.push(`accept: '${config.accept}'`);
    }
    if (config.maxSize) {
      configParts.push(`maxSize: ${config.maxSize}`);
    }

    // Conditional visibility
    if (config.showWhen) {
      configParts.push(`showExpression: "${this.generateExpression(config.showWhen)}"`);
    }
    if (config.hideWhen) {
      configParts.push(`hideExpression: "${this.generateExpression(config.hideWhen)}"`);
    }
    if (config.disableWhen) {
      configParts.push(`disableExpression: "${this.generateExpression(config.disableWhen)}"`);
    }

    if (configParts.length === 0) {
      return '';
    }

    return `, {\n    ${configParts.join(',\n    ')}\n  }`;
  }

  /**
   * TR: Koşullu ifade olustur
   * EN: Generate conditional expression
   */
  private generateExpression(rule: { field: string; operator: string; value?: unknown }): string {
    const { field, operator, value } = rule;
    const fieldRef = field;

    switch (operator) {
      case 'equals':
        return typeof value === 'string'
          ? `${fieldRef} === '${this.escapeString(value)}'`
          : `${fieldRef} === ${value}`;
      case 'notEquals':
        return typeof value === 'string'
          ? `${fieldRef} !== '${this.escapeString(value)}'`
          : `${fieldRef} !== ${value}`;
      case 'contains':
        return `${fieldRef}?.includes('${this.escapeString(String(value))}')`;
      case 'greaterThan':
        return `${fieldRef} > ${value}`;
      case 'lessThan':
        return `${fieldRef} < ${value}`;
      case 'isEmpty':
        return `!${fieldRef} || ${fieldRef} === ''`;
      case 'isNotEmpty':
        return `${fieldRef} && ${fieldRef} !== ''`;
      default:
        return `${fieldRef}`;
    }
  }

  /**
   * TR: Cross-field validator kodu olustur
   * EN: Generate cross-field validator code
   */
  private generateCrossValidators(form: FormDefinition): string {
    if (form.crossValidators.length === 0) {
      return '';
    }

    const interfaceName = this.pascalCase(form.name.replace(/[^a-zA-Z0-9]/g, '')) + 'FormData';
    const validators = form.crossValidators.map(v => this.generateCrossValidatorCode(v, interfaceName)).join('\n\n');

    return `/**
 * TR: Cross-field validatorler
 * EN: Cross-field validators
 */
${validators}`;
  }

  /**
   * TR: Tek cross-field validator kodu
   * EN: Single cross-field validator code
   */
  private generateCrossValidatorCode(validator: CrossValidatorDef, interfaceName: string): string {
    const fieldsStr = validator.fields.map(f => `'${f}'`).join(', ');

    let validateFn: string;

    switch (validator.type) {
      case 'fieldsMatch':
        validateFn = `(values) => values.${validator.fields[0]} !== values.${validator.fields[1]}
      ? '${this.escapeString(validator.message.tr)}'
      : null`;
        break;
      case 'atLeastOne':
        const checks = validator.fields.map(f => `values.${f}`).join(' || ');
        validateFn = `(values) => !(${checks})
      ? '${this.escapeString(validator.message.tr)}'
      : null`;
        break;
      case 'custom':
        validateFn = `(values) => {
    ${validator.customExpression || '// Custom logic here'}
    return null;
  }`;
        break;
      default:
        validateFn = '(values) => null';
    }

    return `export const ${this.camelCase(validator.name)}Validator: CrossFieldValidator<${interfaceName}> = {
  name: '${validator.name}',
  fields: [${fieldsStr}],
  validate: ${validateFn}
};`;
  }

  /**
   * TR: FormState oluşturma kodu
   * EN: FormState creation code
   */
  private generateFormState(form: FormDefinition): string {
    const interfaceName = this.pascalCase(form.name.replace(/[^a-zA-Z0-9]/g, '')) + 'FormData';
    const hasValidators = form.crossValidators.length > 0;

    let code = `/**
 * TR: Form state olusturma
 * EN: Create form state
 */
export function createFormState(): FormState<${interfaceName}> {
  return new FormState<${interfaceName}>(formSchema`;

    if (hasValidators) {
      const validatorNames = form.crossValidators.map(v => `${this.camelCase(v.name)}Validator`).join(', ');
      code += `, {
    crossValidators: [${validatorNames}]
  }`;
    }

    code += `);
}

// Kullanim / Usage:
// const formState = createFormState();
// formState.getField('${form.fields[0]?.name || 'fieldName'}').value.set('...');`;

    return code;
  }

  /**
   * TR: Alan sinifini al
   * EN: Get field class
   */
  private getFieldClass(type: string): string {
    const classMap: Record<string, string> = {
      string: 'StringField',
      text: 'StringField',
      textarea: 'TextareaField',
      number: 'NumberField',
      email: 'EmailField',
      password: 'PasswordField',
      url: 'UrlField',
      phone: 'PhoneField',
      select: 'SelectField',
      dropdown: 'SelectField',
      multiselect: 'MultiselectField',
      boolean: 'BooleanField',
      checkbox: 'BooleanField',
      date: 'DateField',
      time: 'TimeField',
      color: 'ColorField',
      rating: 'RatingField',
      money: 'MoneyField',
      currency: 'MoneyField',
      percent: 'PercentField',
      file: 'FileField',
      tags: 'TagsField',
      slug: 'SlugField',
      json: 'JsonField',
      masked: 'MaskedField',
      // Turkish validator fields (uses StringField with custom validation)
      tckn: 'StringField',
      vkn: 'StringField',
      iban: 'StringField',
      turkishPhone: 'PhoneField',
      turkishPlate: 'StringField',
      postalCode: 'StringField',
    };

    return classMap[type] || 'StringField';
  }

  /**
   * TR: TypeScript tipini al
   * EN: Get TypeScript type
   */
  private getTypeScriptType(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      text: 'string',
      textarea: 'string',
      number: 'number',
      email: 'string',
      password: 'string',
      url: 'string',
      phone: 'string',
      select: 'string',
      dropdown: 'string',
      multiselect: 'string[]',
      boolean: 'boolean',
      checkbox: 'boolean',
      date: 'Date | string',
      time: 'string',
      color: 'string',
      rating: 'number',
      money: 'number',
      currency: 'number',
      percent: 'number',
      file: 'File | null',
      tags: 'string[]',
      slug: 'string',
      json: 'unknown',
      masked: 'string',
      signature: 'string',
      slider: 'number',
      calculated: 'number',
      // Turkish fields
      tckn: 'string',
      vkn: 'string',
      iban: 'string',
      turkishPhone: 'string',
      turkishPlate: 'string',
      postalCode: 'string',
    };

    return typeMap[type] || 'unknown';
  }

  /**
   * TR: String escape
   * EN: Escape string
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }

  /**
   * TR: PascalCase donusumu
   * EN: PascalCase conversion
   */
  private pascalCase(str: string): string {
    return str
      .split(/[\s_-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * TR: camelCase donusumu
   * EN: camelCase conversion
   */
  private camelCase(str: string): string {
    const pascal = this.pascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
}
