export const typography = {
  heading1: { fontFamily: 'Inter_800ExtraBold', fontSize: 28, lineHeight: 34 },
  heading2: { fontFamily: 'Inter_700Bold', fontSize: 22, lineHeight: 28 },
  heading3: { fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 24 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },
  button: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
