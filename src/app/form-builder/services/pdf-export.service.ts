import { Injectable, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import { FormFieldDef, FieldGroup, FormSettings } from '../models/form-builder.types';

export interface PdfExportOptions {
  title?: string;
  includeValues?: boolean;
  includeConfig?: boolean;
  includeGroups?: boolean;
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  private readonly i18n = inject(I18nService);

  /**
   * Export form schema to PDF (simple version)
   */
  exportToPdf(
    formName: string,
    fields: FormFieldDef[],
    values?: Record<string, unknown>
  ): void {
    const lang = this.i18n.lang();
    const htmlContent = this.buildSimpleHtmlContent(formName, fields, lang, values);
    this.printHtml(htmlContent, formName);
  }

  /**
   * Export form schema to PDF with full options
   * Uses a simple HTML-to-PDF approach without external library
   */
  async exportToPdfFull(
    fields: FormFieldDef[],
    groups: FieldGroup[],
    title: string,
    values?: Record<string, unknown>,
    options: PdfExportOptions = {}
  ): Promise<void> {
    const {
      includeValues = true,
      includeConfig = false,
      includeGroups = true
    } = options;

    const lang = this.i18n.lang();

    // Build HTML content
    const htmlContent = this.buildHtmlContent(
      fields,
      groups,
      title,
      lang,
      includeValues ? values : undefined,
      includeConfig,
      includeGroups
    );

    // Open print dialog
    this.printHtml(htmlContent, title);
  }

  /**
   * Build simple HTML content for PDF (without groups)
   */
  private buildSimpleHtmlContent(
    title: string,
    fields: FormFieldDef[],
    lang: 'tr' | 'en',
    values?: Record<string, unknown>
  ): string {
    const styles = this.getStyles();
    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        ${styles}
      </head>
      <body>
        <h1>${title}</h1>
    `;

    if (fields.length === 0) {
      content += '<div class="no-fields">No fields defined</div>';
    } else {
      content += this.renderFields(fields, lang, values, false);
    }

    content += `
        <div class="footer">
          ${lang === 'tr' ? 'Olusturulma Tarihi' : 'Generated on'}: ${new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
          <br>
          Zignal Form Builder
        </div>
      </body>
      </html>
    `;

    return content;
  }

  /**
   * Get CSS styles for PDF
   */
  private getStyles(): string {
    return `
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          font-size: 24px;
          color: #e94560;
          border-bottom: 2px solid #e94560;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        h2 {
          font-size: 16px;
          color: #333;
          background: #f5f5f5;
          padding: 8px 12px;
          margin: 20px 0 10px;
          border-left: 4px solid #e94560;
        }
        .field {
          margin-bottom: 15px;
          padding: 10px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
        }
        .field-label {
          font-weight: 600;
          color: #333;
          margin-bottom: 5px;
        }
        .field-label .required {
          color: #e74c3c;
        }
        .field-type {
          font-size: 11px;
          color: #888;
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
          margin-left: 8px;
        }
        .field-value {
          background: #f9f9f9;
          padding: 8px;
          border-radius: 3px;
          margin-top: 5px;
          word-break: break-word;
        }
        .field-value.empty {
          color: #999;
          font-style: italic;
        }
        .field-config {
          font-size: 11px;
          color: #666;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed #ddd;
        }
        .config-item {
          display: inline-block;
          margin-right: 12px;
        }
        .no-fields {
          text-align: center;
          color: #999;
          padding: 40px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #888;
          text-align: center;
        }
        @media print {
          body { padding: 0; }
          .field { page-break-inside: avoid; }
        }
      </style>
    `;
  }

  /**
   * Build HTML content for PDF
   */
  private buildHtmlContent(
    fields: FormFieldDef[],
    groups: FieldGroup[],
    title: string,
    lang: 'tr' | 'en',
    values?: Record<string, unknown>,
    includeConfig = false,
    includeGroups = true
  ): string {
    const styles = `
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          font-size: 24px;
          color: #e94560;
          border-bottom: 2px solid #e94560;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        h2 {
          font-size: 16px;
          color: #333;
          background: #f5f5f5;
          padding: 8px 12px;
          margin: 20px 0 10px;
          border-left: 4px solid #e94560;
        }
        .field {
          margin-bottom: 15px;
          padding: 10px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
        }
        .field-label {
          font-weight: 600;
          color: #333;
          margin-bottom: 5px;
        }
        .field-label .required {
          color: #e74c3c;
        }
        .field-type {
          font-size: 11px;
          color: #888;
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
          margin-left: 8px;
        }
        .field-value {
          background: #f9f9f9;
          padding: 8px;
          border-radius: 3px;
          margin-top: 5px;
          word-break: break-word;
        }
        .field-value.empty {
          color: #999;
          font-style: italic;
        }
        .field-config {
          font-size: 11px;
          color: #666;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed #ddd;
        }
        .config-item {
          display: inline-block;
          margin-right: 12px;
        }
        .no-fields {
          text-align: center;
          color: #999;
          padding: 40px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #888;
          text-align: center;
        }
        @media print {
          body { padding: 0; }
          .field { page-break-inside: avoid; }
        }
      </style>
    `;

    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        ${styles}
      </head>
      <body>
        <h1>${title}</h1>
    `;

    if (fields.length === 0) {
      content += '<div class="no-fields">No fields defined</div>';
    } else if (includeGroups && groups.length > 0) {
      // Render by groups
      const groupMap = new Map<string | undefined, FormFieldDef[]>();

      // Initialize groups
      groups.forEach(g => groupMap.set(g.id, []));
      groupMap.set(undefined, []); // For ungrouped fields

      // Distribute fields
      fields.forEach(field => {
        const groupId = field.groupId;
        if (groupMap.has(groupId)) {
          groupMap.get(groupId)!.push(field);
        } else {
          groupMap.get(undefined)!.push(field);
        }
      });

      // Render each group
      groups.forEach(group => {
        const groupFields = groupMap.get(group.id) || [];
        if (groupFields.length > 0) {
          // ✅ TYPE FIX: Handle bilingual names and labels
          let groupName: string;
          if (typeof group.name === 'object' && group.name !== null) {
            groupName = (group.name as { tr?: string; en?: string })[lang] || group.id;
          } else if (typeof group.label === 'object' && group.label !== null) {
            groupName = (group.label as { tr?: string; en?: string })[lang] || group.name || group.id;
          } else {
            groupName = (group.name as string) || (group.label as string) || group.id;
          }
          content += `<h2>${groupName}</h2>`;
          content += this.renderFields(groupFields, lang, values, includeConfig);
        }
      });

      // Render ungrouped fields
      const ungrouped = groupMap.get(undefined) || [];
      if (ungrouped.length > 0) {
        content += `<h2>${lang === 'tr' ? 'Diger Alanlar' : 'Other Fields'}</h2>`;
        content += this.renderFields(ungrouped, lang, values, includeConfig);
      }
    } else {
      // Render all fields without grouping
      content += this.renderFields(fields, lang, values, includeConfig);
    }

    content += `
        <div class="footer">
          ${lang === 'tr' ? 'Olusturulma Tarihi' : 'Generated on'}: ${new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
          <br>
          Zignal Form Builder
        </div>
      </body>
      </html>
    `;

    return content;
  }

  /**
   * Render a list of fields
   */
  private renderFields(
    fields: FormFieldDef[],
    lang: 'tr' | 'en',
    values?: Record<string, unknown>,
    includeConfig = false
  ): string {
    return fields.map(field => {
      const value = values?.[field.name];
      const hasValue = value !== undefined && value !== null && value !== '';

      let valueDisplay = '';
      if (values) {
        if (hasValue) {
          if (Array.isArray(value)) {
            valueDisplay = value.join(', ');
          } else if (typeof value === 'boolean') {
            valueDisplay = value ? (lang === 'tr' ? 'Evet' : 'Yes') : (lang === 'tr' ? 'Hayir' : 'No');
          } else if (typeof value === 'object') {
            valueDisplay = JSON.stringify(value, null, 2);
          } else {
            valueDisplay = String(value);
          }
        } else {
          valueDisplay = lang === 'tr' ? 'Bos' : 'Empty';
        }
      }

      let configDisplay = '';
      if (includeConfig && field.config) {
        const configItems = Object.entries(field.config)
          .filter(([key, val]) => val !== undefined && val !== null && val !== '' && key !== 'options')
          .map(([key, val]) => `<span class="config-item"><strong>${key}:</strong> ${val}</span>`)
          .join('');
        if (configItems) {
          configDisplay = `<div class="field-config">${configItems}</div>`;
        }
      }

      return `
        <div class="field">
          <div class="field-label">
            ${field.label}
            ${field.config['required'] ? '<span class="required">*</span>' : ''}
            <span class="field-type">${field.type}</span>
          </div>
          ${values ? `<div class="field-value ${hasValue ? '' : 'empty'}">${valueDisplay}</div>` : ''}
          ${configDisplay}
        </div>
      `;
    }).join('');
  }

  /**
   * Print HTML content using browser print dialog
   */
  private printHtml(htmlContent: string, title: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } else {
      // Fallback: download as HTML
      this.downloadHtml(htmlContent, title);
    }
  }

  /**
   * Download HTML as file
   */
  private downloadHtml(htmlContent: string, title: string): void {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export form data to CSV
   */
  exportToCsv(fields: FormFieldDef[], values: Record<string, unknown>): void {
    const headers = fields.map(f => f.label).join(',');
    const data = fields.map(f => {
      const val = values[f.name];
      if (val === undefined || val === null) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      if (Array.isArray(val)) return `"${val.join('; ')}"`;
      return String(val);
    }).join(',');

    const csv = `${headers}\n${data}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
