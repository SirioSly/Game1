import Phaser from 'phaser'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics
  private progressBox!: Phaser.GameObjects.Graphics
  private loadingText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: SCENE_KEYS.PRELOAD })
  }

  preload(): void {
    this.createLoadingUI()
    this.registerLoadEvents()

    // Assets globais do jogo
    // this.load.image('logo', 'assets/images/logo.png')
    // this.load.audio('bgm', 'assets/audio/bgm.mp3')
  }

  create(): void {
    this.scene.start(SCENE_KEYS.MAIN_MENU)
  }

  private createLoadingUI(): void {
    const cx = GAME_CONFIG.WIDTH / 2
    const cy = GAME_CONFIG.HEIGHT / 2

    this.progressBox = this.add.graphics()
    this.progressBox.fillStyle(Colors.BG_CARD.num, 0.8)
    this.progressBox.fillRect(cx - 160, cy - 15, 320, 30)

    this.progressBar = this.add.graphics()

    this.loadingText = this.add.text(cx, cy - 40, 'Carregando...', TextStyles.CAPTION)
    this.loadingText.setOrigin(0.5)
  }

  private registerLoadEvents(): void {
    this.load.on('progress', (value: number) => {
      const cx = GAME_CONFIG.WIDTH / 2
      const cy = GAME_CONFIG.HEIGHT / 2
      this.progressBar.clear()
      this.progressBar.fillStyle(Colors.BRAND_PRIMARY.num, 1)
      this.progressBar.fillRect(cx - 158, cy - 13, 316 * value, 26)
    })

    this.load.on('complete', () => {
      this.progressBar.destroy()
      this.progressBox.destroy()
      this.loadingText.destroy()
    })
  }
}
