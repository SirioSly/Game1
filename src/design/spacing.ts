// Design System — Spacing & Layout Tokens

export const Spacing = {
  XS:  4,
  SM:  8,
  MD:  16,
  LG:  24,
  XL:  32,
  XXL: 48,
  XXXL: 64,
} as const

export const BorderRadius = {
  SM: 4,
  MD: 8,
  LG: 16,
  PILL: 999,
} as const

export const ZIndex = {
  BACKGROUND: 0,
  GAME:       10,
  UI:         20,
  HUD:        30,
  OVERLAY:    40,
  MODAL:      50,
  TOOLTIP:    60,
} as const
