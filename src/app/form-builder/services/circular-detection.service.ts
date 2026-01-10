import { Injectable } from '@angular/core';
import { FormFieldDef, ConditionalRule } from '../models/form-builder.types';

/**
 * Service for detecting circular references in conditional logic
 * ✅ NEW FEATURE: Prevents infinite loops in showWhen/hideWhen/disableWhen rules
 */
@Injectable({
  providedIn: 'root'
})
export class CircularDetectionService {
  /**
   * Check if there's a circular reference in conditional logic
   * @param fields All form fields
   * @returns Array of circular reference chains if found, empty array if none
   */
  detectCircularReferences(fields: FormFieldDef[]): string[][] {
    const circularChains: string[][] = [];
    const fieldMap = new Map<string, FormFieldDef>();

    // Build field map for quick lookup
    fields.forEach(field => fieldMap.set(field.id, field));

    // Check each field for circular references
    fields.forEach(field => {
      const visited = new Set<string>();
      const path: string[] = [];
      const circular = this.hasCircularDependency(field, fieldMap, visited, path);

      if (circular) {
        circularChains.push([...path]);
      }
    });

    // Remove duplicate chains
    return this.deduplicateChains(circularChains);
  }

  /**
   * Check if adding a new rule would create a circular reference
   * @param fieldId Field ID that will have the rule
   * @param targetFieldId Field ID referenced in the rule
   * @param fields All form fields
   * @returns true if it would create a circle, false otherwise
   */
  wouldCreateCircle(fieldId: string, targetFieldId: string, fields: FormFieldDef[]): boolean {
    const fieldMap = new Map<string, FormFieldDef>();
    fields.forEach(field => fieldMap.set(field.id, field));

    const targetField = fieldMap.get(targetFieldId);
    if (!targetField) return false;

    // Check if target field (or its dependencies) already reference the source field
    const visited = new Set<string>();
    return this.dependsOn(targetField, fieldId, fieldMap, visited);
  }

  /**
   * Get all fields that a given field depends on
   * @param field The field to check
   * @param fields All form fields
   * @returns Array of field IDs that this field depends on
   */
  getDependencies(field: FormFieldDef, fields: FormFieldDef[]): string[] {
    const dependencies = new Set<string>();
    const fieldMap = new Map<string, FormFieldDef>();
    fields.forEach(f => fieldMap.set(f.id, f));

    this.collectDependencies(field, fieldMap, dependencies);
    return Array.from(dependencies);
  }

  /**
   * Get dependency graph for visualization
   * @param fields All form fields
   * @returns Adjacency list representation of dependencies
   */
  buildDependencyGraph(fields: FormFieldDef[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    fields.forEach(field => {
      const deps: string[] = [];

      // Check all conditional rules
      [field.showWhen, field.hideWhen, field.disableWhen].forEach(rules => {
        if (rules && rules.length > 0) {
          rules.forEach(rule => {
            if (!deps.includes(rule.field)) {
              deps.push(rule.field);
            }
          });
        }
      });

      graph.set(field.id, deps);
    });

    return graph;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private hasCircularDependency(
    field: FormFieldDef,
    fieldMap: Map<string, FormFieldDef>,
    visited: Set<string>,
    path: string[]
  ): boolean {
    // If we've seen this field before in current path, we have a circle
    if (visited.has(field.id)) {
      path.push(field.id);
      return true;
    }

    visited.add(field.id);
    path.push(field.id);

    // Check all conditional rules
    const rules: ConditionalRule[][] = [
      field.showWhen || [],
      field.hideWhen || [],
      field.disableWhen || []
    ];

    for (const ruleSet of rules) {
      for (const rule of ruleSet) {
        const targetField = fieldMap.get(rule.field);
        if (targetField && this.hasCircularDependency(targetField, fieldMap, new Set(visited), path)) {
          return true;
        }
      }
    }

    // Backtrack
    visited.delete(field.id);
    path.pop();
    return false;
  }

  private dependsOn(
    field: FormFieldDef,
    targetId: string,
    fieldMap: Map<string, FormFieldDef>,
    visited: Set<string>
  ): boolean {
    if (field.id === targetId) {
      return true;
    }

    if (visited.has(field.id)) {
      return false;
    }

    visited.add(field.id);

    // Check all conditional rules
    const rules: ConditionalRule[][] = [
      field.showWhen || [],
      field.hideWhen || [],
      field.disableWhen || []
    ];

    for (const ruleSet of rules) {
      for (const rule of ruleSet) {
        const referencedField = fieldMap.get(rule.field);
        if (referencedField && this.dependsOn(referencedField, targetId, fieldMap, visited)) {
          return true;
        }
      }
    }

    return false;
  }

  private collectDependencies(
    field: FormFieldDef,
    fieldMap: Map<string, FormFieldDef>,
    dependencies: Set<string>
  ): void {
    const rules: ConditionalRule[][] = [
      field.showWhen || [],
      field.hideWhen || [],
      field.disableWhen || []
    ];

    for (const ruleSet of rules) {
      for (const rule of ruleSet) {
        if (!dependencies.has(rule.field)) {
          dependencies.add(rule.field);

          const referencedField = fieldMap.get(rule.field);
          if (referencedField) {
            this.collectDependencies(referencedField, fieldMap, dependencies);
          }
        }
      }
    }
  }

  private deduplicateChains(chains: string[][]): string[][] {
    const unique = new Map<string, string[]>();

    chains.forEach(chain => {
      const key = chain.sort().join('->');
      if (!unique.has(key)) {
        unique.set(key, chain);
      }
    });

    return Array.from(unique.values());
  }

  /**
   * Format circular reference error message
   */
  formatCircularError(chain: string[], fieldMap: Map<string, FormFieldDef>): string {
    const fieldNames = chain.map(id => {
      const field = fieldMap.get(id);
      return field ? field.label || field.name : id;
    }).join(' → ');

    return `Circular reference detected: ${fieldNames}`;
  }

  /**
   * Check if field can be safely deleted (no other fields depend on it)
   */
  canSafelyDelete(fieldId: string, fields: FormFieldDef[]): { safe: boolean; dependents: string[] } {
    const dependents: string[] = [];

    fields.forEach(field => {
      if (field.id === fieldId) return;

      const rules: ConditionalRule[][] = [
        field.showWhen || [],
        field.hideWhen || [],
        field.disableWhen || []
      ];

      for (const ruleSet of rules) {
        for (const rule of ruleSet) {
          if (rule.field === fieldId) {
            dependents.push(field.id);
            break;
          }
        }
      }
    });

    return {
      safe: dependents.length === 0,
      dependents
    };
  }
}
