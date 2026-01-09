import { Injectable, signal, computed } from '@angular/core';

export type Language = 'tr' | 'en';

export interface TranslationSet {
  tr: string;
  en: string;
}

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly _lang = signal<Language>('tr');

  /** Current language as readonly signal */
  readonly lang = this._lang.asReadonly();

  /** Computed language label */
  readonly langLabel = computed(() => this._lang() === 'tr' ? 'Turkce' : 'English');

  private readonly translations: Record<string, TranslationSet> = {
    // Header & Navigation
    formBuilder: { tr: 'Form Olusturucu', en: 'Form Builder' },
    simplyBuildForms: { tr: 'Formlarinizi kolayca olusturun', en: 'Build your forms easily' },
    newForm: { tr: 'Yeni Form', en: 'New Form' },

    // Tabs
    preview: { tr: 'Onizleme', en: 'Preview' },
    export: { tr: 'Cikti', en: 'Export' },
    conditions: { tr: 'Kosullar', en: 'Conditions' },

    // Field Panel
    addField: { tr: 'Alan Ekle', en: 'Add Field' },
    basicFields: { tr: 'Temel Alanlar', en: 'Basic Fields' },
    selectionFields: { tr: 'Secim Alanlari', en: 'Selection Fields' },
    advancedFields: { tr: 'Gelismis Alanlar', en: 'Advanced Fields' },
    specialFields: { tr: 'Ozel Alanlar', en: 'Special Fields' },
    templates: { tr: 'Sablonlar', en: 'Templates' },

    // Field Types
    text: { tr: 'Metin', en: 'Text' },
    textarea: { tr: 'Cok Satirli Metin', en: 'Textarea' },
    number: { tr: 'Sayi', en: 'Number' },
    email: { tr: 'E-posta', en: 'Email' },
    password: { tr: 'Sifre', en: 'Password' },
    url: { tr: 'URL', en: 'URL' },
    phone: { tr: 'Telefon', en: 'Phone' },
    select: { tr: 'Secim Kutusu', en: 'Select' },
    multiselect: { tr: 'Coklu Secim', en: 'Multi Select' },
    checkbox: { tr: 'Onay Kutusu', en: 'Checkbox' },
    date: { tr: 'Tarih', en: 'Date' },
    time: { tr: 'Saat', en: 'Time' },
    color: { tr: 'Renk', en: 'Color' },
    rating: { tr: 'Degerlendirme', en: 'Rating' },
    money: { tr: 'Para Birimi', en: 'Money' },
    percent: { tr: 'Yuzde', en: 'Percent' },
    file: { tr: 'Dosya', en: 'File' },
    tags: { tr: 'Etiketler', en: 'Tags' },
    slug: { tr: 'URL Slug', en: 'URL Slug' },
    json: { tr: 'JSON', en: 'JSON' },
    slider: { tr: 'Kaydirici', en: 'Slider' },
    calculated: { tr: 'Hesaplanan Alan', en: 'Calculated Field' },

    // Field Configuration
    fieldName: { tr: 'Alan Adi', en: 'Field Name' },
    fieldLabel: { tr: 'Etiket', en: 'Label' },
    required: { tr: 'Zorunlu', en: 'Required' },
    placeholder: { tr: 'Placeholder', en: 'Placeholder' },
    hint: { tr: 'Ipucu', en: 'Hint' },
    minLength: { tr: 'Min Uzunluk', en: 'Min Length' },
    maxLength: { tr: 'Max Uzunluk', en: 'Max Length' },
    minimum: { tr: 'Minimum', en: 'Minimum' },
    maximum: { tr: 'Maksimum', en: 'Maximum' },
    pattern: { tr: 'Desen (Regex)', en: 'Pattern (Regex)' },
    options: { tr: 'Secenekler', en: 'Options' },

    // Actions
    save: { tr: 'Kaydet', en: 'Save' },
    cancel: { tr: 'Iptal', en: 'Cancel' },
    delete: { tr: 'Sil', en: 'Delete' },
    duplicate: { tr: 'Kopyala', en: 'Duplicate' },
    edit: { tr: 'Duzenle', en: 'Edit' },
    add: { tr: 'Ekle', en: 'Add' },
    remove: { tr: 'Kaldir', en: 'Remove' },
    reset: { tr: 'Sifirla', en: 'Reset' },
    submit: { tr: 'Gonder', en: 'Submit' },
    copy: { tr: 'Kopyala', en: 'Copy' },
    download: { tr: 'Indir', en: 'Download' },
    import: { tr: 'Ice Aktar', en: 'Import' },

    // Groups
    addGroup: { tr: 'Grup Ekle', en: 'Add Group' },
    groupName: { tr: 'Grup Adi', en: 'Group Name' },
    noGroup: { tr: 'Grupsuz', en: 'No Group' },

    // Conditions
    showWhen: { tr: 'Goster (Kosul)', en: 'Show When' },
    hideWhen: { tr: 'Gizle (Kosul)', en: 'Hide When' },
    disableWhen: { tr: 'Devre Disi (Kosul)', en: 'Disable When' },
    conditionalLogic: { tr: 'Kosullu Mantik', en: 'Conditional Logic' },

    // Operators
    equals: { tr: 'Esit', en: 'Equals' },
    notEquals: { tr: 'Esit Degil', en: 'Not Equals' },
    contains: { tr: 'Icerir', en: 'Contains' },
    greaterThan: { tr: 'Buyuk', en: 'Greater Than' },
    lessThan: { tr: 'Kucuk', en: 'Less Than' },
    isEmpty: { tr: 'Bos', en: 'Is Empty' },
    isNotEmpty: { tr: 'Dolu', en: 'Is Not Empty' },

    // Cross Validators
    crossValidators: { tr: 'Capraz Dogrulayicilar', en: 'Cross Validators' },
    addCrossValidator: { tr: 'Capraz Dogrulayici Ekle', en: 'Add Cross Validator' },
    fieldsMatch: { tr: 'Alanlar Eslessin', en: 'Fields Match' },
    atLeastOne: { tr: 'En Az Biri Dolu', en: 'At Least One' },
    custom: { tr: 'Ozel', en: 'Custom' },

    // Settings
    formSettings: { tr: 'Form Ayarlari', en: 'Form Settings' },
    formName: { tr: 'Form Adi', en: 'Form Name' },
    layout: { tr: 'Yerlesim', en: 'Layout' },
    vertical: { tr: 'Dikey', en: 'Vertical' },
    horizontal: { tr: 'Yatay', en: 'Horizontal' },
    theme: { tr: 'Tema', en: 'Theme' },
    dark: { tr: 'Koyu', en: 'Dark' },
    light: { tr: 'Acik', en: 'Light' },
    showResetButton: { tr: 'Sifirla Butonu Goster', en: 'Show Reset Button' },
    submitButtonText: { tr: 'Gonder Butonu Metni', en: 'Submit Button Text' },
    resetButtonText: { tr: 'Sifirla Butonu Metni', en: 'Reset Button Text' },

    // Preview
    formPreview: { tr: 'Form Onizleme', en: 'Form Preview' },
    fullscreen: { tr: 'Tam Ekran', en: 'Fullscreen' },
    addFieldsToPreview: { tr: 'Onizleme icin alan ekleyin', en: 'Add fields to preview' },

    // Export
    exportFormat: { tr: 'Cikti Formati', en: 'Export Format' },
    copyToClipboard: { tr: 'Panoya Kopyala', en: 'Copy to Clipboard' },
    downloadFile: { tr: 'Dosya Indir', en: 'Download File' },
    importFromUrl: { tr: 'URL\'den Ice Aktar', en: 'Import from URL' },

    // Validation Messages
    fieldRequired: { tr: 'Bu alan zorunludur', en: 'This field is required' },
    minLengthError: { tr: 'En az {min} karakter gerekli', en: 'Minimum {min} characters required' },
    maxLengthError: { tr: 'En fazla {max} karakter olmali', en: 'Maximum {max} characters allowed' },
    minValueError: { tr: 'Minimum deger: {min}', en: 'Minimum value: {min}' },
    maxValueError: { tr: 'Maksimum deger: {max}', en: 'Maximum value: {max}' },
    invalidEmail: { tr: 'Gecerli bir e-posta adresi girin', en: 'Enter a valid email address' },
    invalidUrl: { tr: 'Gecerli bir URL girin', en: 'Enter a valid URL' },
    invalidFormat: { tr: 'Gecersiz format', en: 'Invalid format' },
    invalidJson: { tr: 'Gecersiz JSON formati', en: 'Invalid JSON format' },

    // Misc
    noFieldSelected: { tr: 'Duzenlemek icin bir alan secin', en: 'Select a field to edit' },
    confirmDelete: { tr: 'Silmek istediginizden emin misiniz?', en: 'Are you sure you want to delete?' },
    copied: { tr: 'Kopyalandi!', en: 'Copied!' },
    imported: { tr: 'Ice aktarildi!', en: 'Imported!' },
    undo: { tr: 'Geri Al', en: 'Undo' },
    redo: { tr: 'Yinele', en: 'Redo' },
    fields: { tr: 'Alanlar', en: 'Fields' },
    selectAction: { tr: 'Sec', en: 'Select' },
    value: { tr: 'Deger', en: 'Value' },
    label: { tr: 'Etiket', en: 'Label' },
    type: { tr: 'Tip', en: 'Type' },
    name: { tr: 'Ad', en: 'Name' },
    errorMessage: { tr: 'Hata Mesaji', en: 'Error Message' },
    customExpression: { tr: 'Ozel Ifade', en: 'Custom Expression' },

    // Calculated Fields
    formula: { tr: 'Formul', en: 'Formula' },
    calculatedField: { tr: 'Hesaplanan Alan', en: 'Calculated Field' },
    availableFields: { tr: 'Kullanilabilir Alanlar', en: 'Available Fields' },
    formulaHint: { tr: 'Ornek: {field1} + {field2} * 0.18', en: 'Example: {field1} + {field2} * 0.18' },

    // Slider
    step: { tr: 'Adim', en: 'Step' },
    showValue: { tr: 'Degeri Goster', en: 'Show Value' },
  };

  /**
   * Get translation for a key
   */
  t(key: string, params?: Record<string, string | number>): string {
    const translation = this.translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }

    let text = translation[this._lang()];

    // Replace parameters like {min}, {max}
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return text;
  }

  /**
   * Get translation set for a key (both languages)
   */
  getTranslationSet(key: string): TranslationSet | undefined {
    return this.translations[key];
  }

  /**
   * Set current language
   */
  setLang(lang: Language): void {
    this._lang.set(lang);
    localStorage.setItem('formBuilder_lang', lang);
  }

  /**
   * Toggle language
   */
  toggleLang(): void {
    this._lang.update(l => l === 'tr' ? 'en' : 'tr');
    localStorage.setItem('formBuilder_lang', this._lang());
  }

  /**
   * Initialize language from localStorage
   */
  initFromStorage(): void {
    const stored = localStorage.getItem('formBuilder_lang') as Language | null;
    if (stored && (stored === 'tr' || stored === 'en')) {
      this._lang.set(stored);
    }
  }

  /**
   * Get localized value from a TranslationSet or bilingual object
   */
  localize(obj: TranslationSet | Record<string, string> | undefined, fallback = ''): string {
    if (!obj) return fallback;
    return obj[this._lang()] || obj['tr'] || obj['en'] || fallback;
  }
}
