# Design Tools MCP Server

SDLC Framework için UI/UX tasarım araçları. Figma entegrasyonu, design token yönetimi ve erişilebilirlik kontrolleri.

## Özellikler

- **Figma Operations**: Dosya/frame/component oluşturma
- **User Flow**: Ekran akışı diyagramları
- **Design Tokens**: Renk, tipografi, spacing token'ları çıkarma ve export
- **Accessibility Review**: WCAG uyumluluk kontrolü
- **Consistency Check**: Design system tutarlılık analizi
- **Component Mapping**: Frontend framework için component haritası

## Araçlar (10 Tool)

### Figma Operations
| Tool | Açıklama |
|------|----------|
| `design_create_file` | Yeni Figma dosyası oluştur |
| `design_create_frame` | Frame/artboard ekle (mobile/tablet/desktop) |
| `design_add_component` | UI component ekle (button, input, card, vb.) |
| `design_create_flow` | User flow diyagramı oluştur |
| `design_get_file` | Figma dosya detaylarını al |

### Design Tokens
| Tool | Açıklama |
|------|----------|
| `design_extract_tokens` | Figma'dan token'ları çıkar |
| `design_export_tokens` | CSS/SCSS/JSON/Tailwind/styled-components export |

### Review & Analysis
| Tool | Açıklama |
|------|----------|
| `design_review_accessibility` | WCAG erişilebilirlik kontrolü |
| `design_review_consistency` | Design system tutarlılık analizi |
| `design_generate_component_map` | Frontend component haritası oluştur |

## Kullanım Örnekleri

### Figma Dosyası Oluşturma
```json
{
  "tool": "design_create_file",
  "arguments": {
    "projectId": "proj_123",
    "projectName": "E-Commerce App",
    "designType": "wireframe"
  }
}
```

**Çıktı:**
```json
{
  "success": true,
  "fileId": "fig_1234567890_abc123",
  "fileName": "E-Commerce App - Wireframe",
  "fileUrl": "https://figma.com/file/fig_1234567890_abc123",
  "designType": "wireframe"
}
```

### Frame Ekleme
```json
{
  "tool": "design_create_frame",
  "arguments": {
    "fileId": "fig_1234567890_abc123",
    "frameName": "Login Screen",
    "frameType": "mobile"
  }
}
```

### Component Ekleme
```json
{
  "tool": "design_add_component",
  "arguments": {
    "fileId": "fig_1234567890_abc123",
    "frameId": "frame_123",
    "componentType": "button",
    "properties": {
      "label": "Sign In",
      "variant": "primary",
      "size": "lg"
    }
  }
}
```

### Design Token Export
```json
{
  "tool": "design_export_tokens",
  "arguments": {
    "fileId": "fig_1234567890_abc123",
    "format": "tailwind"
  }
}
```

**Çıktı (Tailwind config):**
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        "primary-500": "#6366F1",
        "primary-600": "#4F46E5",
        "gray-900": "#111827"
      },
      spacing: {
        "0": "0px",
        "1": "4px",
        "2": "8px"
      }
    }
  }
}
```

### Accessibility Review
```json
{
  "tool": "design_review_accessibility",
  "arguments": {
    "fileId": "fig_1234567890_abc123"
  }
}
```

**Çıktı:**
```markdown
## Accessibility Review Report

**Score**: 85/100 ✅

### Issues Found (2)
- **[SERIOUS]** button_1: Touch target may be smaller than 44px
  - WCAG: WCAG 2.5.5 Target Size
  - Fix: Ensure minimum size of 44x44px

- **[MODERATE]** card_2: Color contrast ratio may be below 4.5:1
  - WCAG: WCAG 1.4.3 Contrast (Minimum)
  - Fix: Increase color contrast to at least 4.5:1

### Passed Checks
- ✅ Heading structure appears correct
- ✅ Interactive elements are keyboard accessible
- ✅ Focus indicators are present

### Recommendations
- 💡 Add alt text descriptions for all images
- 💡 Ensure skip navigation links are present
```

### Component Map Generation
```json
{
  "tool": "design_generate_component_map",
  "arguments": {
    "fileId": "fig_1234567890_abc123",
    "framework": "react"
  }
}
```

**Çıktı:**
```markdown
## Component Map Generated

**Framework**: react
**Components**: 5

### Component Structure
src/components/
├── Button1
├── Input1
├── Card1
├── Nav1
├── Modal1

### Component Details

#### Button1
- **File**: `src/components/Button1.tsx`
- **Figma**: button_1 (comp_123)
- **Props**: `label: string`, `variant: string`, `size: string`
```

## Desteklenen Formatlar

### Token Export Formatları
| Format | Dosya | Açıklama |
|--------|-------|----------|
| `css` | `design-tokens.css` | CSS custom properties |
| `scss` | `_design-tokens.scss` | SCSS variables |
| `json` | `design-tokens.json` | Raw JSON |
| `tailwind` | `tailwind.config.js` | Tailwind CSS config |
| `styled-components` | `theme.ts` | TypeScript theme object |

### Component Types
- `button` - Butonlar (primary, secondary, outline, ghost)
- `input` - Form input'ları
- `card` - Kart container'ları
- `nav` - Navigation menüleri
- `modal` - Modal/dialog'lar
- `list` - Liste görünümleri
- `form` - Form container'ları
- `header` - Header/app bar
- `footer` - Footer
- `sidebar` - Sidebar navigation

### Frame Types
- `mobile` - 375x812px (iPhone)
- `tablet` - 768x1024px (iPad)
- `desktop` - 1440x900px
- `component` - 400x300px (component preview)

## WCAG Kontrolleri

| Kontrol | WCAG Kriteri | Eşik |
|---------|--------------|------|
| Color Contrast (Normal) | 1.4.3 | 4.5:1 |
| Color Contrast (Large) | 1.4.3 | 3.0:1 |
| Touch Target Size | 2.5.5 | 44x44px |
| Focus Indicators | 2.4.7 | Visible |
| Form Labels | 1.3.1 | Required |

## Kurulum

```bash
cd design-tools-mcp-server
npm install
npm run build
```

## Claude Desktop Konfigürasyonu

```json
{
  "mcpServers": {
    "design-tools": {
      "command": "node",
      "args": ["/path/to/design-tools-mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_token_here"
      }
    }
  }
}
```

## Figma Token Alma

1. Figma'ya giriş yap: https://www.figma.com
2. Profil → Settings → Personal Access Tokens
3. "Generate new token" → Kopyala
4. MCP config'e ekle

## SDLC Workflow Entegrasyonu

DESIGN fazı REQUIREMENTS'tan sonra, ARCHITECTURE'dan önce çalışır:

```
REQUIREMENTS → DESIGN → ARCHITECTURE → PLANNING → DEVELOPMENT → TESTING → DEPLOYMENT
```

### DESIGN Fazı İterasyonları:

| İterasyon | Odak | Artifact'lar |
|-----------|------|--------------|
| 1 | Wireframes | wireframes, user_flows |
| 2 | Mockups | mockups, component_library |
| 3 | Prototype & Export | prototype, design_tokens, component_map |

### AI Review Rolleri:

| AI | Odak Alanı |
|----|------------|
| Claude | Design system, component consistency |
| ChatGPT | UX, user flow, information architecture |
| Gemini | Accessibility, WCAG, edge cases |

## Lisans

MIT
