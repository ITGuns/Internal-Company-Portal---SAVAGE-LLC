/**
 * Design System Tokens
 * Centralized design values for consistent UI
 */

/**
 * Product UI Typography
 * Base: 16px (1rem)
 */
export const TYPOGRAPHY = {
  sizes: {
    xs: '0.75rem',    // 12px - helper text, captions
    sm: '0.875rem',   // 14px - dense app text
    base: '1rem',     // 16px - forms and readable body
    md: '1.125rem',   // 18px - section emphasis
    lg: '1.25rem',    // 20px - compact page titles
    xl: '1.5rem',     // 24px - major page titles
    '2xl': '1.875rem' // 30px - first-viewport dashboard copy
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  lineHeights: {
    tight: 1.2,    // Headings
    normal: 1.5,   // Body text
    relaxed: 1.6   // Inputs, comfortable reading
  }
} as const;

/**
 * 8px Grid Spacing System
 * All spacing should be multiples of 8px
 */
export const SPACING = {
  unit: 8,
  xs: '8px',     // 1 unit
  sm: '16px',    // 2 units - form field gaps, tight spacing
  md: '24px',    // 3 units - section spacing
  lg: '32px',    // 4 units - card padding, major sections
  xl: '40px',    // 5 units - large spacing
  '2xl': '48px', // 6 units - section breaks
  '3xl': '64px', // 8 units - major page sections
  '4xl': '80px', // 10 units
  '5xl': '96px'  // 12 units
} as const;

/**
 * Component Dimensions (based on 8px grid)
 */
export const DIMENSIONS = {
  input: {
    height: '44px',
    paddingX: '16px',      // 2 units
    paddingY: '8px',       // 1 unit
    borderRadius: '8px'    // 1 unit
  },
  button: {
    height: '40px',
    paddingX: '16px',
    paddingY: '8px',       // 1 unit
    borderRadius: '8px'    // 1 unit
  },
  card: {
    maxWidth: '400px',     // 50 units
    padding: '24px',
    borderRadius: '8px'
  }
} as const;

/**
 * Type exports for TypeScript autocomplete
 */
export type TypographySize = keyof typeof TYPOGRAPHY.sizes;
export type TypographyWeight = keyof typeof TYPOGRAPHY.weights;
export type TypographyLineHeight = keyof typeof TYPOGRAPHY.lineHeights;
export type SpacingSize = keyof typeof SPACING;
