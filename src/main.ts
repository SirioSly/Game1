import Phaser from 'phaser'
import { GAME_CONFIG } from '@design/constants'
import { BootScene } from '@scenes/BootScene'
import { PreloadScene } from '@scenes/PreloadScene'
import { MainMenuScene } from '@scenes/MainMenuScene'
import { GameManagerScene } from '@scenes/GameManagerScene'
import { SnakeScene } from '@games/Snake/SnakeScene'
import { PongScene } from '@games/Pong/PongScene'
import { MemoryScene } from '@games/Memory/MemoryScene'
import { BreakoutScene } from '@games/Breakout/BreakoutScene'
import { FlappyScene } from '@games/Flappy/FlappyScene'
import { MeteorDodgeScene } from '@games/MeteorDodge/MeteorDodgeScene'
import { WhackMoleScene } from '@games/WhackMole/WhackMoleScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: GAME_CONFIG.BG_COLOR,
  parent: 'game-container',
  scene: [BootScene, PreloadScene, MainMenuScene, GameManagerScene, SnakeScene, PongScene, MemoryScene, BreakoutScene, FlappyScene, MeteorDodgeScene, WhackMoleScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

new Phaser.Game(config)
