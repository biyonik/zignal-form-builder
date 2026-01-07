<div align="center">
  <h1>🛠️ Zignal Form Builder</h1>
  <p>
    <strong>TR:</strong> Görsel Form Tasarım Aracı - Drag & Drop<br/>
    <strong>EN:</strong> Visual Form Design Tool - Drag & Drop
  </p>

  <p>
    <a href="https://angular.io/"><img src="https://img.shields.io/badge/Angular-17+-DD0031?style=flat-square&logo=angular" alt="Angular 17+"/></a>
    <a href="https://www.npmjs.com/package/@biyonik/zignal"><img src="https://img.shields.io/badge/Zignal-Form%20Library-blue?style=flat-square" alt="Zignal"/></a>
    <a href="https://zod.dev/"><img src="https://img.shields.io/badge/Zod-Validation-3068B7?style=flat-square" alt="Zod"/></a>
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License"/>
  </p>
</div>

---

## 🇹🇷 Türkçe

### Hakkında

**Zignal Form Builder**, [@biyonik/zignal](https://www.npmjs.com/package/@biyonik/zignal) form kütüphanesinin tüm field tiplerini görsel olarak tasarlamanızı sağlayan bir araçtır. Drag & drop ile form oluşturun, ayarları düzenleyin ve JSON schema olarak dışa aktarın.

### Özellikler

- ✅ **Drag & Drop**: Alanları sürükleyip bırakarak form oluşturma
- ✅ **18+ Field Tipi**: Metin, sayı, tarih, seçim, dosya ve daha fazlası
- ✅ **Gerçek Zamanlı Önizleme**: Formu anında görüntüleme
- ✅ **JSON Import/Export**: Schema'yı JSON olarak kaydet ve yükle
- ✅ **Hazır Şablonlar**: İletişim, anket, kayıt formları
- ✅ **Yapılandırılabilir**: Her alan için detaylı ayarlar
- ✅ **i18n**: Türkçe/İngilizce arayüz
- ✅ **Koyu Tema**: Geliştirici dostu dark mode

### Kurulum

```bash
# Repoyu klonlayın
git clone https://github.com/anthropics/zignal-form-builder.git
cd zignal-form-builder

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
ng serve
```

Tarayıcıda `http://localhost:4200` adresine gidin.

### Desteklenen Field Tipleri

| Kategori | Alanlar |
|----------|---------|
| **Temel** | Metin, Çok satırlı, Sayı, E-posta, Şifre, URL, Telefon |
| **Seçim** | Dropdown, Çoklu Seçim, Onay Kutusu |
| **Gelişmiş** | Tarih, Saat, Renk, Değerlendirme, Para, Yüzde |
| **Özel** | Dosya, Etiketler, URL Slug, JSON |

### Kullanım

1. **Sol Panel**: Alan tiplerini görün, şablon seçin
2. **Orta Panel**: Alanları sürükleyip bırakın, sıralayın
3. **Sağ Panel**: Seçili alanın ayarlarını düzenleyin
4. **JSON Tab**: Schema'yı dışa aktarın veya içe aktarın

### JSON Çıktı Örneği

```json
[
  {
    "type": "string",
    "name": "name",
    "label": "Ad Soyad",
    "config": { "required": true, "minLength": 2 }
  },
  {
    "type": "email",
    "name": "email",
    "label": "E-posta",
    "config": { "required": true }
  },
  {
    "type": "select",
    "name": "country",
    "label": "Ülke",
    "config": {
      "required": true,
      "options": [
        { "value": "tr", "label": "Türkiye" },
        { "value": "us", "label": "USA" }
      ]
    }
  }
]
```

### Zignal ile Kullanım

```typescript
import { SchemaFactory } from '@biyonik/zignal';

@Component({...})
export class MyFormComponent {
  private factory = inject(SchemaFactory);

  // Form Builder'dan aldığınız JSON
  formSchema = [
    { type: 'string', name: 'name', label: 'Ad', config: { required: true } },
    { type: 'email', name: 'email', label: 'E-posta', config: { required: true } }
  ];

  // Zignal form oluştur
  form = this.factory.parse(this.formSchema).createForm();
}
```

---

## 🇬🇧 English

### About

**Zignal Form Builder** is a visual tool that lets you design forms using all field types from the [@biyonik/zignal](https://www.npmjs.com/package/@biyonik/zignal) form library. Create forms with drag & drop, configure settings, and export as JSON schema.

### Features

- ✅ **Drag & Drop**: Build forms by dragging and dropping fields
- ✅ **18+ Field Types**: Text, number, date, selection, file and more
- ✅ **Real-time Preview**: Instantly view your form
- ✅ **JSON Import/Export**: Save and load schema as JSON
- ✅ **Ready Templates**: Contact, survey, registration forms
- ✅ **Configurable**: Detailed settings for each field
- ✅ **i18n**: Turkish/English interface
- ✅ **Dark Theme**: Developer-friendly dark mode

### Installation

```bash
# Clone the repository
git clone https://github.com/anthropics/zignal-form-builder.git
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

1. **Left Panel**: View field types, select templates
2. **Center Panel**: Drag and drop fields, reorder them
3. **Right Panel**: Edit selected field settings
4. **JSON Tab**: Export or import schema

### JSON Output Example

```json
[
  {
    "type": "string",
    "name": "name",
    "label": "Full Name",
    "config": { "required": true, "minLength": 2 }
  },
  {
    "type": "email",
    "name": "email",
    "label": "Email",
    "config": { "required": true }
  },
  {
    "type": "select",
    "name": "country",
    "label": "Country",
    "config": {
      "required": true,
      "options": [
        { "value": "tr", "label": "Turkey" },
        { "value": "us", "label": "USA" }
      ]
    }
  }
]
```

### Using with Zignal

```typescript
import { SchemaFactory } from '@biyonik/zignal';

@Component({...})
export class MyFormComponent {
  private factory = inject(SchemaFactory);

  // JSON from Form Builder
  formSchema = [
    { type: 'string', name: 'name', label: 'Name', config: { required: true } },
    { type: 'email', name: 'email', label: 'Email', config: { required: true } }
  ];

  // Create Zignal form
  form = this.factory.parse(this.formSchema).createForm();
}
```

---

## 📸 Screenshots

### Main Interface
```
┌─────────────────────────────────────────────────────────────────────┐
│  🛠️ Zignal Form Builder                                    [🇬🇧 EN] │
├──────────────┬────────────────────────────┬────────────────────────┤
│ Alan Tipleri │     Form Alanları (3)      │  ⚙️ Ayarlar            │
│              │                            │                        │
│ 📞 Şablonlar │  ┌────────────────────┐    │  Alan Adı: name        │
│ [İletişim]   │  │ 📝 string          │    │  [____________]        │
│ [Anket]      │  │ Ad Soyad           │    │                        │
│ [Kayıt]      │  │ name         [⬆️⬇️🗑️] │    │  Etiket: Ad Soyad     │
│              │  └────────────────────┘    │  [____________]        │
│ 📝 Temel     │                            │                        │
│ [Metin]      │  ┌────────────────────┐    │  ☑ Zorunlu             │
│ [Sayı]       │  │ 📧 email           │    │  Min: [2]              │
│ [E-posta]    │  │ E-posta            │    │  Max: [50]             │
│              │  │ email        [⬆️⬇️🗑️] │    │                        │
│ 📋 Seçim     │  └────────────────────┘    │                        │
│ [Dropdown]   │                            │                        │
│ [Çoklu]      │  ┌────────────────────┐    │                        │
│              │  │ 📋 select          │    │                        │
│ ⚙️ Gelişmiş  │  │ Ülke               │    │                        │
│ [Tarih]      │  │ country      [⬆️⬇️🗑️] │    │                        │
│ [Renk]       │  └────────────────────┘    │                        │
└──────────────┴────────────────────────────┴────────────────────────┘
```

### JSON Export
```json
[
  { "type": "string", "name": "name", "label": "Ad Soyad", ... },
  { "type": "email", "name": "email", "label": "E-posta", ... },
  { "type": "select", "name": "country", "label": "Ülke", ... }
]
```

---

## 🛠️ Tech Stack

- **Framework**: Angular 17+ (Standalone Components)
- **Form Library**: @biyonik/zignal
- **Validation**: Zod
- **State**: Angular Signals
- **Styling**: SCSS (Dark Theme)

---

## 🚀 Roadmap

- [ ] Drag reorder within canvas
- [ ] Field groups / sections
- [ ] Conditional logic (showWhen)
- [ ] Form validation preview
- [ ] Export to TypeScript code
- [ ] Save/load from localStorage

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Zignal NPM**: [@biyonik/zignal](https://www.npmjs.com/package/@biyonik/zignal)
- **Zignal GitHub**: [biyonik/zignal](https://github.com/biyonik/zignal)
- **KYC Demo**: [zignal-kyc-turkey](https://github.com/anthropics/zignal-kyc-turkey)

---

<div align="center">
  <p>Built with ❤️ using <strong>Zignal</strong> Form Library</p>
</div>
