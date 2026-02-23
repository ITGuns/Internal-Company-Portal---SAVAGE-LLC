/**
 * Design System Tokens
 * Centralized design values for consistent UI
 */

/**
 * Modular Scale Typography (1.25 Major Third Ratio)
 * Base: 16px (1rem)
 */
export const TYPOGRAPHY = {
  sizes: {
    xs: '0.8rem',      // 12.8px - helper text, captions
    sm: '1rem',        // 16px - base, labels, button text
    md: '1.25rem',     // 20px - input text, body emphasis
    lg: '1.5625rem',   // 25px - subtitles, section headers
    xl: '1.953rem',    // 31.25px - page titles
    '2xl': '2.441rem'  // 39px - hero text, brand
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
    height: '40px',        // 5 units
    paddingX: '16px',      // 2 units
    paddingY: '8px',       // 1 unit
    borderRadius: '8px'    // 1 unit
  },
  button: {
    height: '40px',        // 5 units
    paddingX: '32px',      // 4 units
    paddingY: '8px',       // 1 unit
    borderRadius: '8px'    // 1 unit
  },
  card: {
    maxWidth: '400px',     // 50 units
    padding: '32px',       // 4 units
    borderRadius: '8px'    // 1 unit
  }
} as const;

/**
 * Type exports for TypeScript autocomplete
 */
export type TypographySize = keyof typeof TYPOGRAPHY.sizes;
export type TypographyWeight = keyof typeof TYPOGRAPHY.weights;
export type TypographyLineHeight = keyof typeof TYPOGRAPHY.lineHeights;
export type SpacingSize = keyof typeof SPACING;
