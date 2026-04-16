import Phaser from 'phaser'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'
import { Spacing, BorderRadius } from '@design/spacing'

/**
 * UIButton — Componente de botão reutilizável do design system.
 */
export class UIButton extends Phaser.GameObjects.Container {
  private bg!: Phaser.GameObjects.Graphics
  private label!: Phaser.GameObjects.Text

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    width = 200,
    height = 50,
  ) {
    super(scene, x, y)

    this.bg = scene.add.graphics()
    this.label = scene.add.text(0, 0, text, TextStyles.BUTTON).setOrigin(0.5)

    this.drawNormal(width, height)
    this.add([this.bg, this.label])

    this.setSize(width, height)
    this.setInteractive({ useHandCursor: true })

    this.on('pointerover',  () => this.drawHover(width, height))
    this.on('pointerout',   () => this.drawNormal(width, height))
    this.on('pointerdown',  () => this.drawPressed(width, height))
    this.on('pointerup',    () => { this.drawNormal(width, height); onClick() })

    scene.add.existing(this)
  }

  private drawNormal(w: number, h: number): void {
    this.bg.clear()
    this.bg.fillStyle(Colors.BRAND_PRIMARY.num, 1)
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, BorderRadius.MD)
  }

  private drawHover(w: number, h: number): void {
    this.bg.clear()
    this.bg.fillStyle(0x8880ff, 1)
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, BorderRadius.MD)
  }

  private drawPressed(w: number, h: number): void {
    this.bg.clear()
    this.bg.fillStyle(0x4a44cc, 1)
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, BorderRadius.MD)
  }
}
