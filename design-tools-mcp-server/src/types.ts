// Design Tools Types

export type DesignType = "wireframe" | "mockup" | "prototype";
export type FrameType = "mobile" | "tablet" | "desktop" | "component";
export type ComponentType = "button" | "input" | "card" | "nav" | "modal" | "list" | "form" | "header" | "footer" | "sidebar";
export type TokenFormat = "css" | "scss" | "json" | "tailwind" | "styled-components";
export type Framework = "react" | "vue" | "angular" | "svelte";

// ============================================================================
// FIGMA TYPES
// ============================================================================

export interface FigmaFile {
  id: string;
  name: string;
  projectId: string;
  url: string;
  designType: DesignType;
  frames: FigmaFrame[];
  components: FigmaComponent[];
  createdAt: string;
  lastModified: string;
}

export interface FigmaFrame {
  id: string;
  name: string;
  type: FrameType;
  width: number;
  height: number;
  children: FigmaNode[];
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Record<string, unknown>;
}

export interface FigmaComponent {
  id: string;
  name: string;
  type: ComponentType;
  variants: ComponentVariant[];
  properties: ComponentProperty[];
}

export interface ComponentVariant {
  name: string;
  properties: Record<string, unknown>;
}

export interface ComponentProperty {
  name: string;
  type: "string" | "number" | "boolean" | "enum" | "function" | "array" | "node";
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
}

// ============================================================================
// USER FLOW TYPES
// ============================================================================

export interface UserFlow {
  id: string;
  name: string;
  screens: FlowScreen[];
  connections: FlowConnection[];
}

export interface FlowScreen {
  id: string;
  name: string;
  frameId: string;
}

export interface FlowConnection {
  from: string;
  to: string;
  action: string;
  condition?: string;
}

// ============================================================================
// DESIGN TOKEN TYPES
// ============================================================================

export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  shadows: ShadowToken[];
  borderRadius: BorderRadiusToken[];
}

export interface ColorToken {
  name: string;
  value: string;
  category: "primary" | "secondary" | "neutral" | "semantic" | "surface";
  opacity?: number;
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: number;
}

export interface SpacingToken {
  name: string;
  value: number;
  unit: "px" | "rem" | "em";
}

export interface ShadowToken {
  name: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
}

export interface BorderRadiusToken {
  name: string;
  value: number;
  unit: "px" | "rem" | "%";
}

// ============================================================================
// REVIEW TYPES
// ============================================================================

export interface AccessibilityIssue {
  id: string;
  type: "contrast" | "touch-target" | "focus" | "alt-text" | "heading" | "label";
  severity: "critical" | "serious" | "moderate" | "minor";
  element: string;
  description: string;
  wcagCriteria: string;
  suggestion: string;
}

export interface AccessibilityReport {
  score: number;
  issues: AccessibilityIssue[];
  passed: string[];
  suggestions: string[];
}

export interface ConsistencyViolation {
  id: string;
  type: "color" | "typography" | "spacing" | "component" | "naming";
  element: string;
  expected: string;
  actual: string;
  suggestion: string;
}

export interface ConsistencyReport {
  score: number;
  violations: ConsistencyViolation[];
  suggestions: string[];
}

// ============================================================================
// COMPONENT MAPPING TYPES
// ============================================================================

export interface ComponentMapping {
  figmaId: string;
  figmaName: string;
  componentName: string;
  filePath: string;
  props: PropDefinition[];
  children?: ComponentMapping[];
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface ComponentTree {
  name: string;
  path: string;
  children: ComponentTree[];
}

// ============================================================================
// STORAGE
// ============================================================================

export interface DesignStorage {
  files: Map<string, FigmaFile>;
  tokens: Map<string, DesignTokens>;
  flows: Map<string, UserFlow>;
}

// ============================================================================
// CONFIG
// ============================================================================

export const DESIGN_CONFIG = {
  defaultFrameSizes: {
    mobile: { width: 375, height: 812 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1440, height: 900 },
    component: { width: 400, height: 300 }
  },
  accessibilityThresholds: {
    contrastNormal: 4.5,
    contrastLarge: 3.0,
    touchTargetMin: 44
  },
  colorCategories: ["primary", "secondary", "neutral", "semantic", "surface"] as const,
  typographyScale: [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64] as const,
  spacingScale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const
};
