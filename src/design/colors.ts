// Design System — Color Tokens
// Formato hex para uso no CSS/HTML e número (0x) para Phaser

export const Colors = {
  // Backgrounds
  BG_PRIMARY:    { hex: '#0a0a0f', num: 0x0a0a0f },
  BG_SECONDARY:  { hex: '#12121a', num: 0x12121a },
  BG_CARD:       { hex: '#1c1c28', num: 0x1c1c28 },

  // Brand
  BRAND_PRIMARY:   { hex: '#6c63ff', num: 0x6c63ff },
  BRAND_SECONDARY: { hex: '#ff6584', num: 0xff6584 },
  BRAND_ACCENT:    { hex: '#43e97b', num: 0x43e97b },

  // Text
  TEXT_PRIMARY:   { hex: '#ffffff', num: 0xffffff },
  TEXT_SECONDARY: { hex: '#a0a0b8', num: 0xa0a0b8 },
  TEXT_MUTED:     { hex: '#4a4a6a', num: 0x4a4a6a },

  // Feedback
  SUCCESS: { hex: '#43e97b', num: 0x43e97b },
  WARNING: { hex: '#f9ca24', num: 0xf9ca24 },
  ERROR:   { hex: '#ff4757', num: 0xff4757 },
  INFO:    { hex: '#1e90ff', num: 0x1e90ff },

  // UI Elements
  BORDER:      { hex: '#2a2a3e', num: 0x2a2a3e },
  OVERLAY:     { hex: '#000000', num: 0x000000 }, // use com alpha
  TRANSPARENT: { hex: '#00000000', num: 0x000000 },
} as const

export type ColorKey = keyof typeof Colors
