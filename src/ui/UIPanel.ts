import Phaser from 'phaser'
import { Colors } from '@design/colors'
import { BorderRadius } from '@design/spacing'

/**
 * UIPanel — Painel de fundo reutilizável (card/modal/HUD).
 */
export class UIPanel extends Phaser.GameObjects.Graphics {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    alpha = 0.9,
  ) {
    super(scene)
    this.setPosition(x - width / 2, y - height / 2)
    this.fillStyle(Colors.BG_CARD.num, alpha)
    this.fillRoundedRect(0, 0, width, height, BorderRadius.LG)
    scene.add.existing(this)
  }
}
