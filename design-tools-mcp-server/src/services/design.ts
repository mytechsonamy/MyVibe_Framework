import {
  FigmaFile,
  FigmaFrame,
  FigmaComponent,
  UserFlow,
  DesignTokens,
  ColorToken,
  TypographyToken,
  SpacingToken,
  AccessibilityReport,
  AccessibilityIssue,
  ConsistencyReport,
  ConsistencyViolation,
  ComponentMapping,
  ComponentTree,
  PropDefinition,
  ComponentProperty,
  DesignType,
  FrameType,
  ComponentType,
  TokenFormat,
  Framework,
  DESIGN_CONFIG
} from "../types.js";

/**
 * Design Tools Service
 * Manages Figma-like design operations, token extraction, and accessibility checks
 */
export class DesignService {
  private files: Map<string, FigmaFile> = new Map();
  private flows: Map<string, UserFlow> = new Map();
  private tokens: Map<string, DesignTokens> = new Map();

  // ============================================================================
  // FIGMA FILE OPERATIONS
  // ============================================================================

  createFile(projectId: string, projectName: string, designType: DesignType): FigmaFile {
    const fileId = `fig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const file: FigmaFile = {
      id: fileId,
      name: `${projectName} - ${designType.charAt(0).toUpperCase() + designType.slice(1)}`,
      projectId,
      url: `https://figma.com/file/${fileId}`,
      designType,
      frames: [],
      components: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    this.files.set(fileId, file);
    return file;
  }

  getFile(fileId: string): FigmaFile | null {
    return this.files.get(fileId) || null;
  }

  createFrame(
    fileId: string,
    frameName: string,
    frameType: FrameType,
    width?: number,
    height?: number
  ): FigmaFrame | null {
    const file = this.files.get(fileId);
    if (!file) return null;

    const defaults = DESIGN_CONFIG.defaultFrameSizes[frameType];
    const frame: FigmaFrame = {
      id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: frameName,
      type: frameType,
      width: width || defaults.width,
      height: height || defaults.height,
      children: []
    };

    file.frames.push(frame);
    file.lastModified = new Date().toISOString();
    return frame;
  }

  addComponent(
    fileId: string,
    frameId: string,
    componentType: ComponentType,
    properties?: Record<string, unknown>
  ): FigmaComponent | null {
    const file = this.files.get(fileId);
    if (!file) return null;

    const frame = file.frames.find(f => f.id === frameId);
    if (!frame) return null;

    const component: FigmaComponent = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: `${componentType}_${file.components.length + 1}`,
      type: componentType,
      variants: this.getDefaultVariants(componentType),
      properties: this.getDefaultProperties(componentType)
    };

    // Add to frame children
    frame.children.push({
      id: component.id,
      name: component.name,
      type: componentType,
      x: 0,
      y: frame.children.length * 50,
      width: 200,
      height: 40,
      properties
    });

    file.components.push(component);
    file.lastModified = new Date().toISOString();
    return component;
  }

  private getDefaultVariants(type: ComponentType): { name: string; properties: Record<string, unknown> }[] {
    const variantMap: Record<ComponentType, { name: string; properties: Record<string, unknown> }[]> = {
      button: [
        { name: "primary", properties: { variant: "primary" } },
        { name: "secondary", properties: { variant: "secondary" } },
        { name: "outline", properties: { variant: "outline" } },
        { name: "ghost", properties: { variant: "ghost" } }
      ],
      input: [
        { name: "default", properties: { state: "default" } },
        { name: "focused", properties: { state: "focused" } },
        { name: "error", properties: { state: "error" } },
        { name: "disabled", properties: { state: "disabled" } }
      ],
      card: [
        { name: "elevated", properties: { elevation: "elevated" } },
        { name: "outlined", properties: { elevation: "outlined" } },
        { name: "filled", properties: { elevation: "filled" } }
      ],
      nav: [
        { name: "horizontal", properties: { orientation: "horizontal" } },
        { name: "vertical", properties: { orientation: "vertical" } }
      ],
      modal: [
        { name: "small", properties: { size: "sm" } },
        { name: "medium", properties: { size: "md" } },
        { name: "large", properties: { size: "lg" } }
      ],
      list: [
        { name: "simple", properties: { style: "simple" } },
        { name: "detailed", properties: { style: "detailed" } }
      ],
      form: [
        { name: "stacked", properties: { layout: "stacked" } },
        { name: "inline", properties: { layout: "inline" } }
      ],
      header: [
        { name: "fixed", properties: { position: "fixed" } },
        { name: "sticky", properties: { position: "sticky" } }
      ],
      footer: [
        { name: "simple", properties: { style: "simple" } },
        { name: "complex", properties: { style: "complex" } }
      ],
      sidebar: [
        { name: "expanded", properties: { state: "expanded" } },
        { name: "collapsed", properties: { state: "collapsed" } }
      ]
    };
    return variantMap[type] || [];
  }

  private getDefaultProperties(type: ComponentType): ComponentProperty[] {
    const propMap: Record<ComponentType, ComponentProperty[]> = {
      button: [
        { name: "label", type: "string", required: true },
        { name: "variant", type: "enum", required: false, defaultValue: "primary" },
        { name: "size", type: "enum", required: false, defaultValue: "md" },
        { name: "disabled", type: "boolean", required: false, defaultValue: false },
        { name: "onClick", type: "function", required: false }
      ],
      input: [
        { name: "placeholder", type: "string", required: false },
        { name: "value", type: "string", required: false },
        { name: "type", type: "enum", required: false, defaultValue: "text" },
        { name: "error", type: "string", required: false },
        { name: "onChange", type: "function", required: false }
      ],
      card: [
        { name: "title", type: "string", required: false },
        { name: "children", type: "node", required: true },
        { name: "elevation", type: "enum", required: false, defaultValue: "elevated" }
      ],
      nav: [
        { name: "items", type: "array", required: true },
        { name: "activeItem", type: "string", required: false }
      ],
      modal: [
        { name: "isOpen", type: "boolean", required: true },
        { name: "onClose", type: "function", required: true },
        { name: "title", type: "string", required: false },
        { name: "children", type: "node", required: true }
      ],
      list: [
        { name: "items", type: "array", required: true },
        { name: "renderItem", type: "function", required: false }
      ],
      form: [
        { name: "onSubmit", type: "function", required: true },
        { name: "children", type: "node", required: true }
      ],
      header: [
        { name: "logo", type: "node", required: false },
        { name: "navigation", type: "node", required: false },
        { name: "actions", type: "node", required: false }
      ],
      footer: [
        { name: "copyright", type: "string", required: false },
        { name: "links", type: "array", required: false }
      ],
      sidebar: [
        { name: "items", type: "array", required: true },
        { name: "isCollapsed", type: "boolean", required: false, defaultValue: false }
      ]
    };
    return propMap[type] || [];
  }

  // ============================================================================
  // USER FLOW OPERATIONS
  // ============================================================================

  createFlow(
    fileId: string,
    flowName: string,
    screens: string[],
    connections: { from: string; to: string; action: string; condition?: string }[]
  ): UserFlow | null {
    const file = this.files.get(fileId);
    if (!file) return null;

    const flow: UserFlow = {
      id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: flowName,
      screens: screens.map(screenId => ({
        id: screenId,
        name: file.frames.find(f => f.id === screenId)?.name || screenId,
        frameId: screenId
      })),
      connections
    };

    this.flows.set(flow.id, flow);
    return flow;
  }

  // ============================================================================
  // DESIGN TOKEN OPERATIONS
  // ============================================================================

  extractTokens(fileId: string): DesignTokens | null {
    const file = this.files.get(fileId);
    if (!file) return null;

    // Generate default design tokens based on file
    const tokens: DesignTokens = {
      colors: this.generateColorTokens(),
      typography: this.generateTypographyTokens(),
      spacing: this.generateSpacingTokens(),
      shadows: this.generateShadowTokens(),
      borderRadius: this.generateBorderRadiusTokens()
    };

    this.tokens.set(fileId, tokens);
    return tokens;
  }

  private generateColorTokens(): ColorToken[] {
    return [
      // Primary
      { name: "primary-50", value: "#EEF2FF", category: "primary" },
      { name: "primary-100", value: "#E0E7FF", category: "primary" },
      { name: "primary-500", value: "#6366F1", category: "primary" },
      { name: "primary-600", value: "#4F46E5", category: "primary" },
      { name: "primary-700", value: "#4338CA", category: "primary" },
      // Secondary
      { name: "secondary-500", value: "#8B5CF6", category: "secondary" },
      { name: "secondary-600", value: "#7C3AED", category: "secondary" },
      // Neutral
      { name: "gray-50", value: "#F9FAFB", category: "neutral" },
      { name: "gray-100", value: "#F3F4F6", category: "neutral" },
      { name: "gray-200", value: "#E5E7EB", category: "neutral" },
      { name: "gray-500", value: "#6B7280", category: "neutral" },
      { name: "gray-700", value: "#374151", category: "neutral" },
      { name: "gray-900", value: "#111827", category: "neutral" },
      // Semantic
      { name: "success", value: "#10B981", category: "semantic" },
      { name: "warning", value: "#F59E0B", category: "semantic" },
      { name: "error", value: "#EF4444", category: "semantic" },
      { name: "info", value: "#3B82F6", category: "semantic" },
      // Surface
      { name: "background", value: "#FFFFFF", category: "surface" },
      { name: "surface", value: "#F9FAFB", category: "surface" },
      { name: "border", value: "#E5E7EB", category: "surface" }
    ];
  }

  private generateTypographyTokens(): TypographyToken[] {
    return [
      { name: "display-xl", fontFamily: "Inter", fontSize: 56, fontWeight: 700, lineHeight: 1.1 },
      { name: "display-lg", fontFamily: "Inter", fontSize: 48, fontWeight: 700, lineHeight: 1.1 },
      { name: "heading-xl", fontFamily: "Inter", fontSize: 40, fontWeight: 600, lineHeight: 1.2 },
      { name: "heading-lg", fontFamily: "Inter", fontSize: 32, fontWeight: 600, lineHeight: 1.25 },
      { name: "heading-md", fontFamily: "Inter", fontSize: 24, fontWeight: 600, lineHeight: 1.3 },
      { name: "heading-sm", fontFamily: "Inter", fontSize: 20, fontWeight: 600, lineHeight: 1.4 },
      { name: "body-lg", fontFamily: "Inter", fontSize: 18, fontWeight: 400, lineHeight: 1.6 },
      { name: "body-md", fontFamily: "Inter", fontSize: 16, fontWeight: 400, lineHeight: 1.5 },
      { name: "body-sm", fontFamily: "Inter", fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
      { name: "caption", fontFamily: "Inter", fontSize: 12, fontWeight: 400, lineHeight: 1.4 },
      { name: "overline", fontFamily: "Inter", fontSize: 12, fontWeight: 500, lineHeight: 1.4, letterSpacing: 0.5 }
    ];
  }

  private generateSpacingTokens(): SpacingToken[] {
    return DESIGN_CONFIG.spacingScale.map((value, index) => ({
      name: `space-${index}`,
      value,
      unit: "px"
    }));
  }

  private generateShadowTokens(): { name: string; offsetX: number; offsetY: number; blur: number; spread: number; color: string }[] {
    return [
      { name: "shadow-sm", offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: "rgba(0,0,0,0.05)" },
      { name: "shadow-md", offsetX: 0, offsetY: 4, blur: 6, spread: -1, color: "rgba(0,0,0,0.1)" },
      { name: "shadow-lg", offsetX: 0, offsetY: 10, blur: 15, spread: -3, color: "rgba(0,0,0,0.1)" },
      { name: "shadow-xl", offsetX: 0, offsetY: 20, blur: 25, spread: -5, color: "rgba(0,0,0,0.1)" }
    ];
  }

  private generateBorderRadiusTokens(): { name: string; value: number; unit: "px" | "rem" | "%" }[] {
    return [
      { name: "radius-none", value: 0, unit: "px" },
      { name: "radius-sm", value: 4, unit: "px" },
      { name: "radius-md", value: 8, unit: "px" },
      { name: "radius-lg", value: 12, unit: "px" },
      { name: "radius-xl", value: 16, unit: "px" },
      { name: "radius-2xl", value: 24, unit: "px" },
      { name: "radius-full", value: 9999, unit: "px" }
    ];
  }

  exportTokens(fileId: string, format: TokenFormat): { content: string; filename: string } | null {
    const tokens = this.tokens.get(fileId);
    if (!tokens) return null;

    switch (format) {
      case "css":
        return { content: this.tokensToCSS(tokens), filename: "design-tokens.css" };
      case "scss":
        return { content: this.tokensToSCSS(tokens), filename: "_design-tokens.scss" };
      case "json":
        return { content: JSON.stringify(tokens, null, 2), filename: "design-tokens.json" };
      case "tailwind":
        return { content: this.tokensToTailwind(tokens), filename: "tailwind.config.js" };
      case "styled-components":
        return { content: this.tokensToStyledComponents(tokens), filename: "theme.ts" };
      default:
        return null;
    }
  }

  private tokensToCSS(tokens: DesignTokens): string {
    const lines = [":root {"];

    tokens.colors.forEach(c => lines.push(`  --color-${c.name}: ${c.value};`));
    tokens.typography.forEach(t => {
      lines.push(`  --font-${t.name}-size: ${t.fontSize}px;`);
      lines.push(`  --font-${t.name}-weight: ${t.fontWeight};`);
      lines.push(`  --font-${t.name}-line-height: ${t.lineHeight};`);
    });
    tokens.spacing.forEach(s => lines.push(`  --${s.name}: ${s.value}${s.unit};`));
    tokens.shadows.forEach(s =>
      lines.push(`  --${s.name}: ${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color};`)
    );
    tokens.borderRadius.forEach(r => lines.push(`  --${r.name}: ${r.value}${r.unit};`));

    lines.push("}");
    return lines.join("\n");
  }

  private tokensToSCSS(tokens: DesignTokens): string {
    const lines: string[] = [];

    tokens.colors.forEach(c => lines.push(`$color-${c.name}: ${c.value};`));
    tokens.typography.forEach(t => {
      lines.push(`$font-${t.name}-size: ${t.fontSize}px;`);
      lines.push(`$font-${t.name}-weight: ${t.fontWeight};`);
    });
    tokens.spacing.forEach(s => lines.push(`$${s.name}: ${s.value}${s.unit};`));

    return lines.join("\n");
  }

  private tokensToTailwind(tokens: DesignTokens): string {
    const colors: Record<string, string> = {};
    tokens.colors.forEach(c => { colors[c.name] = c.value; });

    const config = {
      theme: {
        extend: {
          colors,
          spacing: Object.fromEntries(
            tokens.spacing.map(s => [s.name.replace("space-", ""), `${s.value}px`])
          ),
          borderRadius: Object.fromEntries(
            tokens.borderRadius.map(r => [r.name.replace("radius-", ""), `${r.value}${r.unit}`])
          )
        }
      }
    };

    return `module.exports = ${JSON.stringify(config, null, 2)}`;
  }

  private tokensToStyledComponents(tokens: DesignTokens): string {
    const colors: Record<string, string> = {};
    tokens.colors.forEach(c => { colors[c.name.replace(/-/g, "_")] = c.value; });

    return `export const theme = {
  colors: ${JSON.stringify(colors, null, 4)},
  typography: ${JSON.stringify(
    Object.fromEntries(tokens.typography.map(t => [t.name.replace(/-/g, "_"), {
      fontSize: `${t.fontSize}px`,
      fontWeight: t.fontWeight,
      lineHeight: t.lineHeight
    }])), null, 4)},
  spacing: ${JSON.stringify(
    Object.fromEntries(tokens.spacing.map(s => [s.name.replace("space-", ""), `${s.value}${s.unit}`])), null, 4)},
  borderRadius: ${JSON.stringify(
    Object.fromEntries(tokens.borderRadius.map(r => [r.name.replace("radius-", ""), `${r.value}${r.unit}`])), null, 4)}
} as const;

export type Theme = typeof theme;`;
  }

  // ============================================================================
  // REVIEW OPERATIONS
  // ============================================================================

  reviewAccessibility(fileId: string): AccessibilityReport | null {
    const file = this.files.get(fileId);
    if (!file) return null;

    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Simulate accessibility checks
    file.components.forEach(component => {
      // Check touch targets
      if (["button", "input", "nav"].includes(component.type)) {
        // Simulate potential issue
        if (Math.random() > 0.7) {
          issues.push({
            id: `a11y_${issues.length + 1}`,
            type: "touch-target",
            severity: "serious",
            element: component.name,
            description: `Touch target may be smaller than ${DESIGN_CONFIG.accessibilityThresholds.touchTargetMin}px`,
            wcagCriteria: "WCAG 2.5.5 Target Size",
            suggestion: `Ensure minimum size of ${DESIGN_CONFIG.accessibilityThresholds.touchTargetMin}x${DESIGN_CONFIG.accessibilityThresholds.touchTargetMin}px`
          });
          score -= 5;
        }
      }

      // Check color contrast
      if (Math.random() > 0.8) {
        issues.push({
          id: `a11y_${issues.length + 1}`,
          type: "contrast",
          severity: "moderate",
          element: component.name,
          description: "Color contrast ratio may be below 4.5:1",
          wcagCriteria: "WCAG 1.4.3 Contrast (Minimum)",
          suggestion: "Increase color contrast to at least 4.5:1 for normal text"
        });
        score -= 3;
      }
    });

    // Check for labels on form elements
    const formComponents = file.components.filter(c => ["input", "form"].includes(c.type));
    if (formComponents.length > 0 && Math.random() > 0.6) {
      issues.push({
        id: `a11y_${issues.length + 1}`,
        type: "label",
        severity: "critical",
        element: "Form inputs",
        description: "Some form inputs may be missing visible labels",
        wcagCriteria: "WCAG 1.3.1 Info and Relationships",
        suggestion: "Add visible labels for all form inputs"
      });
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      issues,
      passed: [
        "Heading structure appears correct",
        "Interactive elements are keyboard accessible",
        "Focus indicators are present"
      ],
      suggestions: [
        "Add alt text descriptions for all images",
        "Ensure skip navigation links are present",
        "Test with screen reader"
      ]
    };
  }

  reviewConsistency(fileId: string, designSystemId?: string): ConsistencyReport | null {
    const file = this.files.get(fileId);
    if (!file) return null;

    const violations: ConsistencyViolation[] = [];
    let score = 100;

    // Check spacing consistency
    if (Math.random() > 0.7) {
      violations.push({
        id: `cons_${violations.length + 1}`,
        type: "spacing",
        element: "Multiple components",
        expected: "8px grid system",
        actual: "Mixed spacing values (5px, 12px, 15px)",
        suggestion: "Use consistent spacing from the spacing scale"
      });
      score -= 8;
    }

    // Check typography consistency
    if (Math.random() > 0.75) {
      violations.push({
        id: `cons_${violations.length + 1}`,
        type: "typography",
        element: "Headings",
        expected: "Typography scale",
        actual: "Custom font sizes not in scale",
        suggestion: "Use predefined typography tokens"
      });
      score -= 6;
    }

    // Check color consistency
    if (Math.random() > 0.8) {
      violations.push({
        id: `cons_${violations.length + 1}`,
        type: "color",
        element: "Buttons",
        expected: "Primary color palette",
        actual: "Custom blue (#1a73e8)",
        suggestion: "Use color tokens from the design system"
      });
      score -= 5;
    }

    // Check component naming
    if (Math.random() > 0.6) {
      violations.push({
        id: `cons_${violations.length + 1}`,
        type: "naming",
        element: "Components",
        expected: "PascalCase naming (e.g., PrimaryButton)",
        actual: "Inconsistent naming (btn_primary, primaryBtn)",
        suggestion: "Use consistent PascalCase naming for all components"
      });
      score -= 4;
    }

    return {
      score: Math.max(0, score),
      violations,
      suggestions: [
        "Create a shared component library",
        "Document spacing and typography scales",
        "Use design tokens consistently across all frames"
      ]
    };
  }

  // ============================================================================
  // COMPONENT MAPPING
  // ============================================================================

  generateComponentMap(fileId: string, framework: Framework): {
    components: ComponentMapping[];
    tree: ComponentTree;
    propsDefinitions: PropDefinition[];
  } | null {
    const file = this.files.get(fileId);
    if (!file) return null;

    const components: ComponentMapping[] = file.components.map(comp => ({
      figmaId: comp.id,
      figmaName: comp.name,
      componentName: this.toComponentName(comp.name, framework),
      filePath: `src/components/${this.toComponentName(comp.name, framework)}.${this.getFileExtension(framework)}`,
      props: comp.properties.map(p => ({
        name: p.name,
        type: this.mapPropType(p.type, framework),
        required: p.required,
        defaultValue: p.defaultValue,
        description: `${p.name} prop for ${comp.name}`
      }))
    }));

    const tree: ComponentTree = {
      name: "components",
      path: "src/components",
      children: components.map(c => ({
        name: c.componentName,
        path: c.filePath,
        children: []
      }))
    };

    const allProps = components.flatMap(c => c.props);

    return { components, tree, propsDefinitions: allProps };
  }

  private toComponentName(name: string, framework: Framework): string {
    // Convert to PascalCase
    const pascalCase = name
      .split(/[_\-\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");

    return pascalCase;
  }

  private getFileExtension(framework: Framework): string {
    switch (framework) {
      case "react": return "tsx";
      case "vue": return "vue";
      case "angular": return "ts";
      case "svelte": return "svelte";
      default: return "tsx";
    }
  }

  private mapPropType(type: string, framework: Framework): string {
    const typeMap: Record<string, Record<string, string>> = {
      react: {
        string: "string",
        number: "number",
        boolean: "boolean",
        function: "() => void",
        array: "any[]",
        node: "React.ReactNode",
        enum: "string"
      },
      vue: {
        string: "String",
        number: "Number",
        boolean: "Boolean",
        function: "Function",
        array: "Array",
        node: "any",
        enum: "String"
      },
      angular: {
        string: "string",
        number: "number",
        boolean: "boolean",
        function: "() => void",
        array: "any[]",
        node: "TemplateRef<any>",
        enum: "string"
      },
      svelte: {
        string: "string",
        number: "number",
        boolean: "boolean",
        function: "() => void",
        array: "any[]",
        node: "any",
        enum: "string"
      }
    };

    return typeMap[framework]?.[type] || "any";
  }
}
