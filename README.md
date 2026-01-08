<div align="center">
  <h1>Zignal Form Builder</h1>
  <p>
    <strong>TR:</strong> Profesyonel Gorsel Form Tasarim Araci<br/>
    <strong>EN:</strong> Professional Visual Form Design Tool
  </p>

  <p>
    <a href="https://angular.io/"><img src="https://img.shields.io/badge/Angular-17+-DD0031?style=flat-square&logo=angular" alt="Angular 17+"/></a>
    <a href="https://www.npmjs.com/package/@biyonik/zignal"><img src="https://img.shields.io/badge/Zignal-Form%20Library-blue?style=flat-square" alt="Zignal"/></a>
    <a href="https://zod.dev/"><img src="https://img.shields.io/badge/Zod-Validation-3068B7?style=flat-square" alt="Zod"/></a>
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License"/>
  </p>
</div>

---

## TR Turkce

### Hakkinda

**Zignal Form Builder**, [@biyonik/zignal](https://www.npmjs.com/package/@biyonik/zignal) form kutuphanesinin tum field tiplerini gorsel olarak tasarlamanizi saglayan profesyonel bir aractir. Drag & drop ile form olusturun, kosullu mantik ekleyin, gruplar olusturun ve JSON/TypeScript olarak disa aktarin.

### Ozellikler

#### Temel Ozellikler
- **Drag & Drop**: Alanlari surukleyip birakarak form olusturma
- **18+ Field Tipi**: Metin, sayi, tarih, secim, dosya ve daha fazlasi
- **Gercek Zamanli Onizleme**: Formu aninda goruntuleme
- **JSON Import/Export**: Schema'yi JSON olarak kaydet ve yukle
- **TypeScript Export**: Direkt kullanilabilir TypeScript kodu uret
- **Hazir Sablonlar**: Iletisim, anket, kayit formlari
- **i18n**: Turkce/Ingilizce arayuz

#### Gelismis Ozellikler
- **Undo/Redo**: Geri al/ileri al sistemi (Ctrl+Z / Ctrl+Y)
- **Field Groups**: Alanlari gruplara ayirma (Fieldset/Section)
- **Conditional Logic Builder**: showWhen/hideWhen/disableWhen editoru
- **Cross-field Validation**: Alanlar arasi validasyon olusturucu
- **Theme Switcher**: Light/Dark tema destegi
- **Keyboard Shortcuts**: Hizli erisim tuslari
- **Multi-form Support**: Birden fazla form yonetimi
- **LocalStorage Persistence**: Tasarimlari otomatik kaydetme
- **Preview Modal**: Tam ekran form onizleme
- **Live Validation**: Gercek zamanli validasyon testi
- **Import from URL**: API'den form schemasi cekme

### Klavye Kisayollari

| Kisayol | Islem |
|---------|-------|
| `Ctrl + Z` | Geri Al |
| `Ctrl + Y` | Ileri Al |
| `Ctrl + S` | Formu Kaydet |
| `Ctrl + C` | Alani Kopyala |
| `Ctrl + V` | Alani Yapistir |
| `Ctrl + D` | Alani Cogalt |
| `Delete` | Alani Sil |
| `Escape` | Secimi Kaldir |

### Kurulum

```bash
# Repoyu klonlayin
git clone https://github.com/biyonik/zignal-form-builder.git
cd zignal-form-builder

# Bagimliliklari yukleyin
npm install

# Gelistirme sunucusunu baslatin
ng serve
```

Tarayicida `http://localhost:4200` adresine gidin.

### Desteklenen Field Tipleri

| Kategori | Alanlar |
|----------|---------|
| **Temel** | Metin, Cok satirli, Sayi, E-posta, Sifre, URL, Telefon |
| **Secim** | Dropdown, Coklu Secim, Onay Kutusu |
| **Gelismis** | Tarih, Saat, Renk, Degerlendirme, Para, Yuzde |
| **Ozel** | Dosya, Etiketler, URL Slug, JSON |

### Kullanim

1. **Sol Panel**: Alan tiplerini gorun, sablon secin, grup ekleyin
2. **Orta Panel**: Alanlari surukleyip birakin, gruplar arasinda tasiyin
3. **Sag Panel - Ayarlar**: Secili alanin/grubun ayarlarini duzenleyin
4. **Sag Panel - Onizleme**: Formu canli onizleyin, validasyon test edin
5. **Sag Panel - Export**: JSON veya TypeScript olarak disa aktarin
6. **Sag Panel - Form Ayarlari**: Genel form ayarlari ve cross-validator ekleyin

### TypeScript Export Ornegi

```typescript
import {
  FormSchema,
  FormState,
  StringField,
  EmailField,
  SelectField,
} from '@biyonik/zignal';

/**
 * TR: Form veri tipi
 * EN: Form data type
 */
export interface ContactFormFormData {
  name: string;
  email: string;
  country?: string;
}

/**
 * TR: Form semasi
 * EN: Form schema
 */
export const formSchema = new FormSchema<ContactFormFormData>({
  name: new StringField('name', 'Ad Soyad', {
    required: true,
    minLength: 2
  }),

  email: new EmailField('email', 'E-posta', {
    required: true
  }),

  country: new SelectField('country', 'Ulke', {
    options: [
      { value: 'tr', label: 'Turkiye' },
      { value: 'us', label: 'USA' }
    ]
  }),
});

/**
 * TR: Form state olusturma
 * EN: Create form state
 */
export function createFormState(): FormState<ContactFormFormData> {
  return new FormState<ContactFormFormData>(formSchema);
}
```

---

## EN English

### About

**Zignal Form Builder** is a professional visual tool that lets you design forms using all field types from the [@biyonik/zignal](https://www.npmjs.com/package/@biyonik/zignal) form library. Create forms with drag & drop, add conditional logic, create groups, and export as JSON/TypeScript.

### Features

#### Core Features
- **Drag & Drop**: Build forms by dragging and dropping fields
- **18+ Field Types**: Text, number, date, selection, file and more
- **Real-time Preview**: Instantly view your form
- **JSON Import/Export**: Save and load schema as JSON
- **TypeScript Export**: Generate ready-to-use TypeScript code
- **Ready Templates**: Contact, survey, registration forms
- **i18n**: Turkish/English interface

#### Advanced Features
- **Undo/Redo**: Full undo/redo system (Ctrl+Z / Ctrl+Y)
- **Field Groups**: Organize fields into groups (Fieldset/Section)
- **Conditional Logic Builder**: showWhen/hideWhen/disableWhen editor
- **Cross-field Validation**: Create inter-field validators
- **Theme Switcher**: Light/Dark theme support
- **Keyboard Shortcuts**: Quick access keys
- **Multi-form Support**: Manage multiple forms
- **LocalStorage Persistence**: Auto-save designs
- **Preview Modal**: Fullscreen form preview
- **Live Validation**: Real-time validation testing
- **Import from URL**: Fetch form schema from API

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + S` | Save Form |
| `Ctrl + C` | Copy Field |
| `Ctrl + V` | Paste Field |
| `Ctrl + D` | Duplicate Field |
| `Delete` | Delete Field |
| `Escape` | Deselect |

### Installation

```bash
# Clone the repository
git clone https://github.com/biyonik/zignal-form-builder.git
cd zignal-form-builder

# Install dependencies
npm install

# Start development server
ng serve
```

Navigate to `http://localhost:4200` in your browser.

### Supported Field Types

| Category | Fields |
|----------|--------|
| **Basic** | Text, Textarea, Number, Email, Password, URL, Phone |
| **Selection** | Dropdown, Multi Select, Checkbox |
| **Advanced** | Date, Time, Color, Rating, Money, Percent |
| **Special** | File, Tags, URL Slug, JSON |

### Usage

1. **Left Panel**: View field types, select templates, add groups
2. **Center Panel**: Drag and drop fields, move between groups
3. **Right Panel - Config**: Edit selected field/group settings
4. **Right Panel - Preview**: Live preview form, test validation
5. **Right Panel - Export**: Export as JSON or TypeScript
6. **Right Panel - Settings**: Form settings and cross-validators

### TypeScript Export Example

```typescript
import {
  FormSchema,
  FormState,
  StringField,
  EmailField,
  SelectField,
} from '@biyonik/zignal';

/**
 * TR: Form veri tipi
 * EN: Form data type
 */
export interface ContactFormFormData {
  name: string;
  email: string;
  country?: string;
}

/**
 * TR: Form semasi
 * EN: Form schema
 */
export const formSchema = new FormSchema<ContactFormFormData>({
  name: new StringField('name', 'Full Name', {
    required: true,
    minLength: 2
  }),

  email: new EmailField('email', 'Email', {
    required: true
  }),

  country: new SelectField('country', 'Country', {
    options: [
      { value: 'tr', label: 'Turkey' },
      { value: 'us', label: 'USA' }
    ]
  }),
});

/**
 * TR: Form state olusturma
 * EN: Create form state
 */
export function createFormState(): FormState<ContactFormFormData> {
  return new FormState<ContactFormFormData>(formSchema);
}
```

---

## Architecture

```
src/app/form-builder/
├── form-builder.component.ts    # Ana component (template + styles)
├── field-types.config.ts        # Field tip tanimlari
├── models/
│   └── form-builder.types.ts    # Tip tanimlari
└── services/
    ├── form-builder.service.ts  # State yonetimi
    └── code-generator.service.ts # TypeScript kod uretici
```

### State Management

- **Angular Signals**: Reaktif state yonetimi
- **Undo/Redo Stack**: Max 50 snapshot ile geri al/ileri al
- **LocalStorage**: Otomatik kayit/yukleme
- **Clipboard**: Alan kopyalama/yapistirma

---

## Tech Stack

- **Framework**: Angular 17+ (Standalone Components)
- **Form Library**: @biyonik/zignal
- **Validation**: Zod
- **State**: Angular Signals
- **Styling**: CSS Variables (Dark/Light Theme)

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

## Links

- **Zignal NPM**: [@biyonik/zignal](https://www.npmjs.com/package/@biyonik/zignal)
- **Zignal GitHub**: [biyonik/zignal](https://github.com/biyonik/zignal)
- **KYC Demo**: [zignal-kyc-turkey](https://github.com/biyonik/zignal-kyc-turkey)

---

<div align="center">
  <p>Built with Zignal Form Library</p>
</div>
