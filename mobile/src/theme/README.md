# 🎨 CLAW Design System

A centralized design system for consistent UI across the CLAW mobile app.

## Quick Start

```typescript
import { colors, spacing, typography, borderRadius, shadows } from './theme';
import { Card, Button, Badge } from './components/ui';
```

## Color System

```typescript
colors.primary.DEFAULT     // '#FF6B35' - Primary orange
colors.gold.DEFAULT        // '#FFD700' - VIP gold
colors.success.DEFAULT     // '#4CAF50' - Success green
colors.danger.DEFAULT      // '#e94560' - Error red
colors.background.DEFAULT  // '#1a1a2e' - Main background
colors.surface.DEFAULT     // '#0f3460' - Card surfaces
colors.text.primary        // '#ffffff' - Primary text
colors.text.muted          // '#888888' - Secondary text
```

## Spacing System (4px grid)

```typescript
spacing.xs   // 4
spacing.sm   // 8
spacing.md   // 12
spacing.lg   // 16
spacing.xl   // 20
spacing['2xl'] // 24
spacing['3xl'] // 32
spacing['4xl'] // 40
spacing['5xl'] // 48
spacing['6xl'] // 60
```

## Typography System

```typescript
// Font sizes
typography.size.xs     // 10
typography.size.sm     // 12
typography.size.base   // 14
typography.size.md     // 16
typography.size.lg     // 18
typography.size.xl     // 20
typography.size['2xl'] // 24

// Presets
typography.presets.h1      // Large heading
typography.presets.h2      // Medium heading
typography.presets.body    // Body text
typography.presets.caption // Small text
```

## Border Radius

```typescript
borderRadius.none  // 0
borderRadius.xs    // 4
borderRadius.sm    // 6
borderRadius.md    // 8
borderRadius.lg    // 12
borderRadius.xl    // 16
borderRadius['2xl'] // 20
borderRadius['3xl'] // 24
borderRadius.full   // 9999 (circular)
```

## Shadows

```typescript
shadows.none    // No shadow
shadows.sm      // Small shadow
shadows.md      // Medium shadow
shadows.lg      // Large shadow
shadows.xl      // Extra large shadow
shadows.primary // Primary colored shadow
shadows.gold    // Gold colored shadow (VIP)
```

## UI Components

### Card

```typescript
<Card variant="default">Content</Card>
<Card variant="elevated">Content</Card>
<Card variant="vip">VIP Content</Card>
<Card variant="outlined">Content</Card>
<Card onPress={handlePress}>Tappable</Card>
```

### Button

```typescript
<Button title="Primary" onPress={handlePress} variant="primary" />
<Button title="Secondary" onPress={handlePress} variant="secondary" />
<Button title="VIP" onPress={handlePress} variant="vip" />
<Button title="Ghost" onPress={handlePress} variant="ghost" />
<Button title="Loading" onPress={handlePress} loading />
<Button title="Small" onPress={handlePress} size="sm" />
<Button title="Large" onPress={handlePress} size="lg" />
```

### Badge

```typescript
<Badge text="Default" variant="default" />
<Badge text="Primary" variant="primary" />
<Badge text="Success" variant="success" />
<Badge text="VIP" variant="gold" />
```

## Gradients

```typescript
colors.gradient.primary   // ['#FF6B35', '#e94560']
colors.gradient.gold      // ['#FFD700', '#FF8C42']
colors.gradient.background // ['#1a1a2e', '#16213e']
```

## Migration Guide

### Before
```typescript
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f3460',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
```

### After
```typescript
import { colors, spacing, borderRadius, shadows, typography } from './theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  text: {
    ...typography.presets.body,
    fontWeight: typography.weight.semibold,
  },
});
```

Or use the Card component:
```typescript
import { Card } from './components/ui';

<Card>
  <Text style={typography.presets.body}>Content</Text>
</Card>
```

## Benefits

1. **Consistency** - Same values used across all screens
2. **Maintainability** - Change once, apply everywhere
3. **Accessibility** - Ensures proper contrast ratios
4. **Dark Mode Ready** - Designed for dark-first approach
5. **Type Safety** - Full TypeScript support
