import Phaser from 'phaser'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'
import { UIButton } from '@ui/UIButton'

const GAMES: { label: string; key: string }[] = [
  { label: 'Snake',   key: SCENE_KEYS.SNAKE },
  { label: 'Pong',    key: SCENE_KEYS.PONG },
  { label: 'Memory',  key: SCENE_KEYS.MEMORY },
  { label: 'Breakout',key: SCENE_KEYS.BREAKOUT },
  { label: 'Flappy',  key: SCENE_KEYS.FLAPPY },
]

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MAIN_MENU })
  }

  create(): void {
    const cx = GAME_CONFIG.WIDTH / 2

    // Background
    this.add.rectangle(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT, Colors.BG_PRIMARY.num)
      .setOrigin(0)

    // Título
    this.add.text(cx, 60, 'GAME 1', TextStyles.HERO).setOrigin(0.5)
    this.add.text(cx, 110, 'Escolha um jogo', TextStyles.SUBTITLE).setOrigin(0.5)

    // Grid de botões
    const cols = 3
    const btnW = 200
    const btnH = 50
    const padX = 24
    const padY = 20
    const totalW = cols * btnW + (cols - 1) * padX
    const startX = cx - totalW / 2 + btnW / 2
    const startY = 200

    GAMES.forEach((game, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = startX + col * (btnW + padX)
      const y = startY + row * (btnH + padY)
      new UIButton(this, x, y, game.label, () => {
        this.scene.start(game.key)
      }, btnW, btnH)
    })
  }
}
