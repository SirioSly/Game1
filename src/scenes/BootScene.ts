import Phaser from 'phaser'
import { SCENE_KEYS } from '@design/constants'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT })
  }

  preload(): void {
    // Carrega assets mínimos necessários para a tela de preload
    // (barra de progresso, logo, etc.)
  }

  create(): void {
    this.scene.start(SCENE_KEYS.PRELOAD)
  }
}
