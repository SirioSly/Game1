import Phaser from 'phaser'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'
import { UIButton } from '@ui/UIButton'

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MAIN_MENU })
  }

  create(): void {
    const cx = GAME_CONFIG.WIDTH / 2
    const cy = GAME_CONFIG.HEIGHT / 2

    // Background
    this.add.rectangle(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT, Colors.BG_PRIMARY.num)
      .setOrigin(0)

    // Título
    this.add.text(cx, cy - 120, 'GAME 1', TextStyles.HERO).setOrigin(0.5)
    this.add.text(cx, cy - 60, 'Mini Games', TextStyles.SUBTITLE).setOrigin(0.5)

    // Botão Jogar
    new UIButton(this, cx, cy + 20, 'JOGAR', () => {
      this.scene.start(SCENE_KEYS.GAME_MANAGER)
    })
  }
}
