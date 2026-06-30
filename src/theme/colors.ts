export const colors = {
  background: '#f0faf4',
  white: '#ffffff',
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },
  teal: {
    700: '#0f766e',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    400: '#9ca3af',
    500: '#6b7280',
    700: '#374151',
    900: '#111827',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    600: '#ca8a04',
    800: '#854d0e',
  },
  red: {
    100: '#fee2e2',
    600: '#dc2626',
    800: '#991b1b',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    600: '#2563eb',
    800: '#1e40af',
  },
  purple: {
    50: '#faf5ff',
    600: '#9333ea',
  },
} as const;

export const gradients = {
  primary: [colors.green[600], colors.emerald[600]] as const,
  hero: [colors.green[600], colors.emerald[600], colors.teal[700]] as const,
};
