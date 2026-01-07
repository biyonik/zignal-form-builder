/**
 * TR: Form Builder için desteklenen field tipleri ve varsayılan konfigürasyonları
 * EN: Supported field types and default configurations for Form Builder
 */
export interface FieldTypeConfig {
  type: string;
  label: { tr: string; en: string };
  icon: string;
  category: 'basic' | 'selection' | 'advanced' | 'special';
  defaultConfig: Record<string, unknown>;
  configOptions: ConfigOption[];
}

export interface ConfigOption {
  key: string;
  label: { tr: string; en: string };
  type: 'text' | 'number' | 'boolean' | 'select' | 'options-editor';
  default?: unknown;
  options?: { value: unknown; label: string }[];
}

/**
 * TR: Tüm desteklenen field tipleri
 * EN: All supported field types
 */
export const fieldTypes: FieldTypeConfig[] = [
  // ============================================
  // Basic Fields
  // ============================================
  {
    type: 'string',
    label: { tr: 'Metin', en: 'Text' },
    icon: '📝',
    category: 'basic',
    defaultConfig: { required: false, minLength: 0, maxLength: 255 },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'minLength', label: { tr: 'Min Uzunluk', en: 'Min Length' }, type: 'number', default: 0 },
      { key: 'maxLength', label: { tr: 'Max Uzunluk', en: 'Max Length' }, type: 'number', default: 255 },
      { key: 'placeholder', label: { tr: 'Placeholder', en: 'Placeholder' }, type: 'text' },
      { key: 'hint', label: { tr: 'İpucu', en: 'Hint' }, type: 'text' },
    ],
  },
  {
    type: 'textarea',
    label: { tr: 'Çok Satırlı Metin', en: 'Textarea' },
    icon: '📄',
    category: 'basic',
    defaultConfig: { required: false, rows: 4 },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'rows', label: { tr: 'Satır Sayısı', en: 'Rows' }, type: 'number', default: 4 },
      { key: 'minLength', label: { tr: 'Min Uzunluk', en: 'Min Length' }, type: 'number' },
      { key: 'maxLength', label: { tr: 'Max Uzunluk', en: 'Max Length' }, type: 'number' },
    ],
  },
  {
    type: 'number',
    label: { tr: 'Sayı', en: 'Number' },
    icon: '🔢',
    category: 'basic',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'min', label: { tr: 'Minimum', en: 'Minimum' }, type: 'number' },
      { key: 'max', label: { tr: 'Maksimum', en: 'Maximum' }, type: 'number' },
      { key: 'integer', label: { tr: 'Tam Sayı', en: 'Integer' }, type: 'boolean', default: false },
    ],
  },
  {
    type: 'email',
    label: { tr: 'E-posta', en: 'Email' },
    icon: '📧',
    category: 'basic',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
    ],
  },
  {
    type: 'password',
    label: { tr: 'Şifre', en: 'Password' },
    icon: '🔐',
    category: 'basic',
    defaultConfig: { required: false, minLength: 8 },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'minLength', label: { tr: 'Min Uzunluk', en: 'Min Length' }, type: 'number', default: 8 },
      { key: 'requireUppercase', label: { tr: 'Büyük Harf Zorunlu', en: 'Require Uppercase' }, type: 'boolean' },
      { key: 'requireNumber', label: { tr: 'Rakam Zorunlu', en: 'Require Number' }, type: 'boolean' },
      { key: 'requireSpecial', label: { tr: 'Özel Karakter Zorunlu', en: 'Require Special' }, type: 'boolean' },
    ],
  },
  {
    type: 'url',
    label: { tr: 'URL', en: 'URL' },
    icon: '🔗',
    category: 'basic',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
    ],
  },
  {
    type: 'phone',
    label: { tr: 'Telefon', en: 'Phone' },
    icon: '📱',
    category: 'basic',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
    ],
  },

  // ============================================
  // Selection Fields
  // ============================================
  {
    type: 'select',
    label: { tr: 'Seçim Kutusu', en: 'Select' },
    icon: '📋',
    category: 'selection',
    defaultConfig: { required: false, options: [] },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'options', label: { tr: 'Seçenekler', en: 'Options' }, type: 'options-editor' },
    ],
  },
  {
    type: 'multiselect',
    label: { tr: 'Çoklu Seçim', en: 'Multi Select' },
    icon: '☑️',
    category: 'selection',
    defaultConfig: { required: false, options: [] },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'options', label: { tr: 'Seçenekler', en: 'Options' }, type: 'options-editor' },
      { key: 'min', label: { tr: 'Min Seçim', en: 'Min Selection' }, type: 'number' },
      { key: 'max', label: { tr: 'Max Seçim', en: 'Max Selection' }, type: 'number' },
    ],
  },
  {
    type: 'boolean',
    label: { tr: 'Onay Kutusu', en: 'Checkbox' },
    icon: '✅',
    category: 'selection',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu (true olmalı)', en: 'Required (must be true)' }, type: 'boolean', default: false },
    ],
  },

  // ============================================
  // Advanced Fields
  // ============================================
  {
    type: 'date',
    label: { tr: 'Tarih', en: 'Date' },
    icon: '📅',
    category: 'advanced',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
    ],
  },
  {
    type: 'time',
    label: { tr: 'Saat', en: 'Time' },
    icon: '🕐',
    category: 'advanced',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
    ],
  },
  {
    type: 'color',
    label: { tr: 'Renk', en: 'Color' },
    icon: '🎨',
    category: 'advanced',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
    ],
  },
  {
    type: 'rating',
    label: { tr: 'Değerlendirme', en: 'Rating' },
    icon: '⭐',
    category: 'advanced',
    defaultConfig: { required: false, max: 5 },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'max', label: { tr: 'Maksimum Yıldız', en: 'Max Stars' }, type: 'number', default: 5 },
    ],
  },
  {
    type: 'money',
    label: { tr: 'Para Birimi', en: 'Money' },
    icon: '💰',
    category: 'advanced',
    defaultConfig: { required: false, currency: 'TRY' },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'currency', label: { tr: 'Para Birimi', en: 'Currency' }, type: 'select', default: 'TRY', options: [
        { value: 'TRY', label: '₺ TRY' },
        { value: 'USD', label: '$ USD' },
        { value: 'EUR', label: '€ EUR' },
      ]},
      { key: 'min', label: { tr: 'Minimum', en: 'Minimum' }, type: 'number' },
      { key: 'max', label: { tr: 'Maksimum', en: 'Maximum' }, type: 'number' },
    ],
  },
  {
    type: 'percent',
    label: { tr: 'Yüzde', en: 'Percent' },
    icon: '%',
    category: 'advanced',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'min', label: { tr: 'Minimum', en: 'Minimum' }, type: 'number', default: 0 },
      { key: 'max', label: { tr: 'Maksimum', en: 'Maximum' }, type: 'number', default: 100 },
    ],
  },

  // ============================================
  // Special Fields
  // ============================================
  {
    type: 'file',
    label: { tr: 'Dosya', en: 'File' },
    icon: '📎',
    category: 'special',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'accept', label: { tr: 'Kabul Edilen Tipler', en: 'Accepted Types' }, type: 'text', default: '*' },
      { key: 'maxSize', label: { tr: 'Max Boyut (MB)', en: 'Max Size (MB)' }, type: 'number', default: 5 },
    ],
  },
  {
    type: 'tags',
    label: { tr: 'Etiketler', en: 'Tags' },
    icon: '🏷️',
    category: 'special',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
      { key: 'max', label: { tr: 'Max Etiket', en: 'Max Tags' }, type: 'number' },
    ],
  },
  {
    type: 'slug',
    label: { tr: 'URL Slug', en: 'URL Slug' },
    icon: '🔤',
    category: 'special',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
    ],
  },
  {
    type: 'json',
    label: { tr: 'JSON', en: 'JSON' },
    icon: '{ }',
    category: 'special',
    defaultConfig: { required: false },
    configOptions: [
      { key: 'required', label: { tr: 'Zorunlu', en: 'Required' }, type: 'boolean', default: false },
    ],
  },
];

/**
 * TR: Kategori bilgileri
 * EN: Category information
 */
export const fieldCategories = [
  { id: 'basic', label: { tr: 'Temel Alanlar', en: 'Basic Fields' }, icon: '📝' },
  { id: 'selection', label: { tr: 'Seçim Alanları', en: 'Selection Fields' }, icon: '📋' },
  { id: 'advanced', label: { tr: 'Gelişmiş Alanlar', en: 'Advanced Fields' }, icon: '⚙️' },
  { id: 'special', label: { tr: 'Özel Alanlar', en: 'Special Fields' }, icon: '✨' },
];

/**
 * TR: Örnek form şablonları
 * EN: Sample form templates
 */
export const sampleTemplates = [
  {
    id: 'contact',
    name: { tr: 'İletişim Formu', en: 'Contact Form' },
    icon: '📞',
    fields: [
      { type: 'string', name: 'name', label: 'Ad Soyad / Full Name', config: { required: true } },
      { type: 'email', name: 'email', label: 'E-posta / Email', config: { required: true } },
      { type: 'phone', name: 'phone', label: 'Telefon / Phone', config: { required: false } },
      { type: 'textarea', name: 'message', label: 'Mesaj / Message', config: { required: true, rows: 5 } },
    ],
  },
  {
    id: 'survey',
    name: { tr: 'Anket Formu', en: 'Survey Form' },
    icon: '📊',
    fields: [
      { type: 'string', name: 'name', label: 'İsim / Name', config: { required: true } },
      { type: 'select', name: 'satisfaction', label: 'Memnuniyet / Satisfaction', config: {
        required: true,
        options: [
          { value: 'very_satisfied', label: 'Çok Memnun / Very Satisfied' },
          { value: 'satisfied', label: 'Memnun / Satisfied' },
          { value: 'neutral', label: 'Nötr / Neutral' },
          { value: 'unsatisfied', label: 'Memnun Değil / Unsatisfied' },
        ],
      }},
      { type: 'rating', name: 'rating', label: 'Puanlama / Rating', config: { required: true, max: 5 } },
      { type: 'textarea', name: 'feedback', label: 'Görüşler / Feedback', config: { required: false } },
    ],
  },
  {
    id: 'registration',
    name: { tr: 'Kayıt Formu', en: 'Registration Form' },
    icon: '📝',
    fields: [
      { type: 'string', name: 'username', label: 'Kullanıcı Adı / Username', config: { required: true, minLength: 3 } },
      { type: 'email', name: 'email', label: 'E-posta / Email', config: { required: true } },
      { type: 'password', name: 'password', label: 'Şifre / Password', config: { required: true, minLength: 8, requireUppercase: true, requireNumber: true } },
      { type: 'date', name: 'birthDate', label: 'Doğum Tarihi / Birth Date', config: { required: true } },
      { type: 'boolean', name: 'acceptTerms', label: 'Şartları Kabul Et / Accept Terms', config: { required: true } },
    ],
  },
];
