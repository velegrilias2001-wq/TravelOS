export const fontFamily = {
  sansRegular: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',

  serifRegular: 'PlayfairDisplay_400Regular',
  serifMedium: 'PlayfairDisplay_500Medium',
  serifSemiBold: 'PlayfairDisplay_600SemiBold',
  serifBold: 'PlayfairDisplay_700Bold',
} as const;

export const fontSize = {
  micro: 11,
  caption: 12,
  bodySmall: 14,
  body: 16,
  bodyLarge: 18,

  titleSmall: 22,
  title: 28,
  titleLarge: 34,

  display: 42,
  hero: 52,
} as const;

export const lineHeight = {
  micro: 14,
  caption: 16,
  bodySmall: 20,
  body: 24,
  bodyLarge: 27,

  titleSmall: 28,
  title: 35,
  titleLarge: 41,

  display: 49,
  hero: 58,
} as const;

export const letterSpacing = {
  tight: -0.6,
  normal: 0,
  wide: 0.8,
  eyebrow: 2,
} as const;