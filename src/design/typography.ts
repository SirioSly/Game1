// Design System — Typography Tokens

export const FontFamily = {
  PRIMARY: 'system-ui, -apple-system, Arial, sans-serif',
  MONO:    '"Courier New", Courier, monospace',
} as const

export const FontSize = {
  XS:  12,
  SM:  16,
  MD:  20,
  LG:  28,
  XL:  36,
  XXL: 48,
  HERO: 72,
} as const

export const FontWeight = {
  NORMAL: 'normal',
  BOLD:   'bold',
} as const

// Estilos prontos para Phaser TextStyle
export const TextStyles = {
  HERO: {
    fontFamily: FontFamily.PRIMARY,
    fontSize:   `${FontSize.HERO}px`,
    fontStyle:  FontWeight.BOLD,
    color:      '#ffffff',
  },
  TITLE: {
    fontFamily: FontFamily.PRIMARY,
    fontSize:   `${FontSize.XL}px`,
    fontStyle:  FontWeight.BOLD,
    color:      '#ffffff',
  },
  SUBTITLE: {
    fontFamily: FontFamily.PRIMARY,
    fontSize:   `${FontSize.LG}px`,
    fontStyle:  FontWeight.NORMAL,
    color:      '#a0a0b8',
  },
  BODY: {
    fontFamily: FontFamily.PRIMARY,
    fontSize:   `${FontSize.MD}px`,
    fontStyle:  FontWeight.NORMAL,
    color:      '#ffffff',
  },
  CAPTION: {
    fontFamily: FontFamily.PRIMARY,
    fontSize:   `${FontSize.SM}px`,
    fontStyle:  FontWeight.NORMAL,
    color:      '#a0a0b8',
  },
  SCORE: {
    fontFamily: FontFamily.MONO,
    fontSize:   `${FontSize.XL}px`,
    fontStyle:  FontWeight.BOLD,
    color:      '#43e97b',
  },
  BUTTON: {
    fontFamily: FontFamily.PRIMARY,
    fontSize:   `${FontSize.MD}px`,
    fontStyle:  FontWeight.BOLD,
    color:      '#ffffff',
  },
} as const

export type TextStyleKey = keyof typeof TextStyles
