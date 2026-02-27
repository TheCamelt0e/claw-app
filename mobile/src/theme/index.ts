/**
 * 🎨 CLAW DESIGN SYSTEM
 * Centralized theme for consistent UI across the app
 * 
 * Principles:
 * - Dark-first design
 * - Consistent spacing (4px grid)
 * - Clear typography hierarchy
 * - Accessible contrast ratios
 */

// ==========================================
// COLOR SYSTEM
// ==========================================

export const colors = {
  // Primary brand colors
  primary: {
    DEFAULT: '#FF6B35',
    light: '#FF8C42',
    dark: '#E55A2B',
    muted: 'rgba(255, 107, 53, 0.1)',
    border: 'rgba(255, 107, 53, 0.3)',
  },
  
  // VIP/Gold accent
  gold: {
    DEFAULT: '#FFD700',
    light: '#FFE44D',
    dark: '#B8860B',
    muted: 'rgba(255, 215, 0, 0.15)',
    border: 'rgba(255, 215, 0, 0.3)',
    card: '#2d2d00',  // Dark gold background for VIP cards
  },
  
  // Someday/Purple accent
  someday: {
    DEFAULT: '#9C27B0',
    light: '#BA68C8',
    dark: '#7B1FA2',
    muted: 'rgba(156, 39, 176, 0.15)',
  },
  
  // Semantic colors
  success: {
    DEFAULT: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
    muted: 'rgba(76, 175, 80, 0.15)',
  },
  
  danger: {
    DEFAULT: '#e94560',
    light: '#FF6B7A',
    dark: '#C73E54',
    muted: 'rgba(233, 69, 96, 0.15)',
  },
  
  warning: {
    DEFAULT: '#FF9800',
    light: '#FFB74D',
    dark: '#F57C00',
    muted: 'rgba(255, 152, 0, 0.15)',
  },
  
  info: {
    DEFAULT: '#2196F3',
    light: '#64B5F6',
    dark: '#1976D2',
    muted: 'rgba(33, 150, 243, 0.15)',
  },
  
  // Background colors
  background: {
    DEFAULT: '#1a1a2e',
    secondary: '#16213e',
    tertiary: '#0f3460',
    elevated: '#2d2d44',
  },
  
  // Surface colors (cards, modals)
  surface: {
    DEFAULT: '#0f3460',
    elevated: '#2d2d44',
    pressed: '#3d3d5c',
  },
  
  // Text colors
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.8)',
    muted: '#888888',
    disabled: '#666666',
    inverse: '#1a1a2e',
  },
  
  // Border colors
  border: {
    DEFAULT: 'rgba(255, 255, 255, 0.1)',
    light: 'rgba(255, 255, 255, 0.2)',
    focus: '#FF6B35',
  },
  
  // Gradients (array of colors for LinearGradient)
  gradient: {
    primary: ['#FF6B35', '#e94560'] as const,
    gold: ['#FFD700', '#FF8C42'] as const,
    background: ['#1a1a2e', '#16213e'] as const,
    surface: ['#16213e', '#0f3460'] as const,
    vip: ['#FFD700', '#FFA500'] as const,
  },
};

// ==========================================
// SPACING SYSTEM (4px grid)
// ==========================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 60,
  '7xl': 80,
};

// ==========================================
// TYPOGRAPHY SYSTEM
// ==========================================

export const typography = {
  // Font sizes
  size: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  },
  
  // Font weights
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Preset styles
  presets: {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      color: colors.text.primary,
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text.primary,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: colors.text.primary,
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text.primary,
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: colors.text.primary,
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      color: colors.text.muted,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    label: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
  },
};

// ==========================================
// BORDER RADIUS SYSTEM
// ==========================================

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// ==========================================
// SHADOW/ELEVATION SYSTEM
// ==========================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  primary: {
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  gold: {
    shadowColor: colors.gold.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
};

// ==========================================
// COMPONENT TOKENS
// ==========================================

export const components = {
  // Button styles
  button: {
    primary: {
      backgroundColor: colors.primary.DEFAULT,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing['2xl'],
      borderRadius: borderRadius['3xl'],
      ...shadows.md,
    },
    secondary: {
      backgroundColor: colors.surface.DEFAULT,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing['2xl'],
      borderRadius: borderRadius['3xl'],
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    ghost: {
      backgroundColor: 'transparent',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
  },
  
  // Card styles
  card: {
    DEFAULT: {
      backgroundColor: colors.surface.DEFAULT,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      ...shadows.sm,
    },
    elevated: {
      backgroundColor: colors.surface.elevated,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      ...shadows.md,
    },
    vip: {
      backgroundColor: '#2d2d00',
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 3,
      borderColor: colors.gold.DEFAULT,
      ...shadows.gold,
    },
  },
  
  // Input styles
  input: {
    DEFAULT: {
      backgroundColor: colors.surface.DEFAULT,
      borderRadius: borderRadius['2xl'],
      padding: spacing.lg,
      fontSize: typography.size.md,
      color: colors.text.primary,
    },
  },
  
  // Badge styles
  badge: {
    DEFAULT: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary.muted,
    },
    gold: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: colors.gold.DEFAULT,
    },
  },
};

// ==========================================
// LAYOUT CONSTANTS
// ==========================================

export const layout = {
  // Screen padding
  screenPadding: spacing.lg,
  
  // Header height
  headerHeight: 60,
  
  // Tab bar
  tabBarHeight: 70,
  
  // Max content width (for tablets)
  maxContentWidth: 600,
  
  // Border widths
  borderWidth: {
    thin: 1,
    normal: 2,
    thick: 3,
  },
};

// ==========================================
// ANIMATION CONSTANTS
// ==========================================

export const animation = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  easing: {
    default: 'easeInOut',
    bounce: 'bounce',
    spring: {
      friction: 6,
      tension: 40,
    },
  },
};

// ==========================================
// Z-INDEX SCALE
// ==========================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
  toast: 600,
};

// ==========================================
// EXPORT DEFAULT THEME
// ==========================================

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  components,
  layout,
  animation,
  zIndex,
};

export default theme;
