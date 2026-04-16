import Phaser from 'phaser'
import { GAME_CONFIG } from '@design/constants'
import { BootScene } from '@scenes/BootScene'
import { PreloadScene } from '@scenes/PreloadScene'
import { MainMenuScene } from '@scenes/MainMenuScene'
import { GameManagerScene } from '@scenes/GameManagerScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: GAME_CONFIG.BG_COLOR,
  parent: 'game-container',
  scene: [BootScene, PreloadScene, MainMenuScene, GameManagerScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

new Phaser.Game(config)
