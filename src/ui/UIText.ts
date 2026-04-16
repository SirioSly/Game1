import Phaser from 'phaser'
import { TextStyles, type TextStyleKey } from '@design/typography'

/**
 * UIText — Wrapper de texto com estilos do design system.
 */
export class UIText extends Phaser.GameObjects.Text {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    styleKey: TextStyleKey = 'BODY',
    originX = 0.5,
    originY = 0.5,
  ) {
    super(scene, x, y, text, TextStyles[styleKey])
    this.setOrigin(originX, originY)
    scene.add.existing(this)
  }
}
