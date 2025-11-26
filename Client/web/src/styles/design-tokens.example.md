# Design Tokens Example

## Web (CSS Variables)

```css
/* src/styles/tokens.css */
:root {
  /* Colors */
  --color-primary: #007AFF;
  --color-secondary: #5856D6;
  --color-background: #FFFFFF;
  --color-surface: #F5F5F5;
  --color-text: #000000;
  --color-text-secondary: #666666;
  --color-border: #E0E0E0;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  
  /* Typography */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 20px;
  --font-size-xl: 24px;
  --font-size-2xl: 32px;
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Breakpoints */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

## Mobile (TypeScript Constants)

```typescript
// src/styles/tokens.ts
export const colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    bold: '700',
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
};
```

## Usage Example

### Web Component
```tsx
// Button.tsx (Web)
import './Button.css';

export function Button({ children, variant = 'primary' }) {
  return <button className={`btn btn-${variant}`}>{children}</button>;
}
```

```css
/* Button.css */
.btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}
```

### Mobile Component
```tsx
// Button.tsx (Mobile)
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../styles/tokens';

export function Button({ children, variant = 'primary' }) {
  return (
    <TouchableOpacity 
      style={[styles.button, styles[variant]]}
    >
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: '#FFFFFF',
  },
});
```

