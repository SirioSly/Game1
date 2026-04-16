// Design System — Game Constants

export const GAME_CONFIG = {
  WIDTH:    800,
  HEIGHT:   600,
  BG_COLOR: '#0a0a0f',
} as const

export const SCENE_KEYS = {
  BOOT:         'BootScene',
  PRELOAD:      'PreloadScene',
  MAIN_MENU:    'MainMenuScene',
  GAME_MANAGER: 'GameManagerScene',
  // Mini jogos
  SNAKE:    'SnakeScene',
  PONG:     'PongScene',
  MEMORY:   'MemoryScene',
  BREAKOUT: 'BreakoutScene',
  FLAPPY:   'FlappyScene',
} as const

export const EVENTS = {
  // Game Manager
  MINI_GAME_START:    'miniGame:start',
  MINI_GAME_COMPLETE: 'miniGame:complete',
  MINI_GAME_FAIL:     'miniGame:fail',
  // UI
  BUTTON_CLICK:       'ui:buttonClick',
  // Updaters
  TICK:               'updater:tick',
  STATE_CHANGE:       'updater:stateChange',
} as const

export const ASSET_KEYS = {
  // Fontes de bitmap, spritesheets, etc.
  // Preenchido pelo PreloadScene
} as const

export const STORAGE_KEYS = {
  HIGH_SCORE:   'game1:highScore',
  SETTINGS:     'game1:settings',
  PROGRESS:     'game1:progress',
} as const
