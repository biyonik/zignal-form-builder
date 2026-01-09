/**
 * Repeatable Groups Types
 */

export interface RepeatableGroupConfig {
  enabled: boolean;
  minItems: number;
  maxItems: number;
  addButtonText: { tr: string; en: string };
  removeButtonText: { tr: string; en: string };
  itemLabel?: { tr: string; en: string }; // e.g., "Adres", "Kisi"
  defaultItemCount: number;
  confirmDelete: boolean;
}

export interface RepeatableGroupInstance {
  id: string;
  index: number;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  collapsed: boolean;
}

export interface RepeatableGroupState {
  groupId: string;
  instances: RepeatableGroupInstance[];
}

export const DEFAULT_REPEATABLE_CONFIG: RepeatableGroupConfig = {
  enabled: false,
  minItems: 1,
  maxItems: 10,
  addButtonText: { tr: '+ Yeni Ekle', en: '+ Add New' },
  removeButtonText: { tr: 'Kaldir', en: 'Remove' },
  itemLabel: { tr: 'Oge', en: 'Item' },
  defaultItemCount: 1,
  confirmDelete: true
};

/**
 * Generate a unique ID for repeatable instances
 */
export function generateRepeatableId(): string {
  return `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
