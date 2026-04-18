import Phaser from 'phaser'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { FontFamily } from '@design/typography'

const W = GAME_CONFIG.WIDTH
const H = GAME_CONFIG.HEIGHT

export class PreloadScene extends Phaser.Scene {
  private progBar!:  Phaser.GameObjects.Graphics
  private progGlow!: Phaser.GameObjects.Graphics
  private pctText!:  Phaser.GameObjects.Text

  constructor() { super({ key: SCENE_KEYS.PRELOAD }) }

  preload(): void {
    this.createUI()
    this.animateProgress()

    // Futuros assets:
    // this.load.image('logo', 'assets/images/logo.png')
    // this.load.audio('bgm',  'assets/audio/bgm.mp3')

    this.load.on('progress', (v: number) => this.drawProgress(v))
    this.load.on('complete', () => this.drawProgress(1))
  }

  create(): void {
    this.time.delayedCall(250, () => {
      window.dispatchEvent(new CustomEvent('game-ready'))
      this.scene.start(SCENE_KEYS.MAIN_MENU)
    })
  }

  // ─── UI ─────────────────────────────────────────────────────────────────────

  private createUI(): void {
    const cx = W / 2
    const cy = H / 2

    // Background
    this.add.rectangle(0, 0, W, H, 0x0a0a0f).setOrigin(0)

    // Top glow
    const top = this.add.graphics()
    top.fillGradientStyle(0x6c63ff, 0x6c63ff, 0x0a0a0f, 0x0a0a0f, 0.14, 0.14, 0, 0)
    top.fillRect(0, 0, W, 260)

    // Bottom glow
    const btm = this.add.graphics()
    btm.fillGradientStyle(0x0a0a0f, 0x0a0a0f, 0xff6584, 0xff6584, 0, 0, 0.07, 0.07)
    btm.fillRect(0, H - 110, W, 110)

    // Logo
    this.add.text(cx, cy - 88, 'SIRIO', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '64px',
      fontStyle:  'bold',
      color:      '#ffffff',
      stroke:     '#6c63ff',
      strokeThickness: 5,
    }).setOrigin(0.5)

    this.add.text(cx, cy - 28, 'MINI GAMES COLLECTION', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '11px',
      color:      '#3e3e5e',
      letterSpacing: 8,
    }).setOrigin(0.5)

    // Divider
    const div = this.add.graphics()
    div.lineStyle(1, 0x6c63ff, 0.2)
    div.lineBetween(cx - 100, cy - 8, cx + 100, cy - 8)

    // Progress bar track
    const track = this.add.graphics()
    track.fillStyle(0x1a1a28, 1)
    track.fillRoundedRect(cx - 160, cy + 22, 320, 6, 3)

    // Glow layer (drawn below fill)
    this.progGlow = this.add.graphics()

    // Fill layer
    this.progBar = this.add.graphics()

    // Percentage
    this.pctText = this.add.text(cx, cy + 10, '0%', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '10px',
      color:      '#3a3a5a',
    }).setOrigin(0.5)

    // Loading label
    this.add.text(cx, cy + 44, 'Preparando os jogos...', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '11px',
      color:      '#2e2e4e',
    }).setOrigin(0.5)

    // Version
    this.add.text(cx, H - 18, 'v1.0  ·  Phaser 3  ·  TypeScript', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '9px',
      color:      '#1e1e30',
      letterSpacing: 3,
    }).setOrigin(0.5)
  }

  // ─── Progress ────────────────────────────────────────────────────────────────

  private animateProgress(): void {
    const dummy = { v: 0 }
    this.tweens.add({
      targets:  dummy,
      v:        1,
      duration: 900,
      ease:     'Sine.easeInOut',
      onUpdate: () => this.drawProgress(dummy.v),
    })
  }

  private drawProgress(v: number): void {
    const cx = W / 2
    const cy = H / 2
    const fillW = Math.max(0, 316 * v)

    this.progGlow.clear()
    this.progGlow.fillStyle(0x6c63ff, 0.22)
    this.progGlow.fillRoundedRect(cx - 159, cy + 20, fillW + 2, 10, 5)

    this.progBar.clear()
    this.progBar.fillStyle(0x6c63ff, 1)
    this.progBar.fillRoundedRect(cx - 158, cy + 22, fillW, 6, 3)

    this.pctText.setText(`${Math.round(v * 100)}%`)
  }
}
