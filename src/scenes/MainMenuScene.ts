import Phaser from 'phaser'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { Colors } from '@design/colors'
import { FontFamily } from '@design/typography'

const GAMES = [
  { label: 'Snake',        key: SCENE_KEYS.SNAKE,        emoji: '🐍', color: 0x6c63ff },
  { label: 'Pong',         key: SCENE_KEYS.PONG,         emoji: '🏓', color: 0x6c63ff },
  { label: 'Memory',       key: SCENE_KEYS.MEMORY,       emoji: '🧠', color: 0x43e97b },
  { label: 'Breakout',     key: SCENE_KEYS.BREAKOUT,     emoji: '🧱', color: 0x6c63ff },
  { label: 'Flappy',       key: SCENE_KEYS.FLAPPY,       emoji: '🐦', color: 0xff6584 },
  { label: 'Meteor Dodge', key: SCENE_KEYS.METEOR_DODGE, emoji: '🚀', color: 0x6c63ff },
  { label: 'Whack-a-Mole', key: SCENE_KEYS.WHACK_MOLE,  emoji: '🐭', color: 0xff6584 },
]

const W = GAME_CONFIG.WIDTH
const H = GAME_CONFIG.HEIGHT
const CW = 172   // card width
const CH = 100   // card height
const GAP = 12

export class MainMenuScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.MAIN_MENU }) }

  create(): void {
    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(0, 0, W, H, 0x0d0d14).setOrigin(0)

    // Single subtle top glow — drawn once, no animation
    const glow = this.add.graphics()
    glow.fillStyle(0x6c63ff, 0.07)
    glow.fillRect(0, 0, W, 220)

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(W / 2, 58, 'SIRIO', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '58px',
      fontStyle:  'bold',
      color:      '#ffffff',
      stroke:     '#6c63ff',
      strokeThickness: 3,
    }).setOrigin(0.5)

    this.add.text(W / 2, 106, 'MINI GAMES COLLECTION', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '12px',
      color:      '#5a5a7a',
      letterSpacing: 6,
    }).setOrigin(0.5)

    // Thin divider
    const line = this.add.graphics()
    line.lineStyle(1, 0x6c63ff, 0.3)
    line.lineBetween(W / 2 - 120, 128, W / 2 + 120, 128)

    // ── Cards ─────────────────────────────────────────────────────────────────
    const row1 = GAMES.slice(0, 4)
    const row2 = GAMES.slice(4)

    const totalW1 = row1.length * CW + (row1.length - 1) * GAP
    const startX1 = (W - totalW1) / 2

    const totalW2 = row2.length * CW + (row2.length - 1) * GAP
    const startX2 = (W - totalW2) / 2

    const startY = 160

    row1.forEach((g, i) => this.card(startX1 + i * (CW + GAP), startY, g))
    row2.forEach((g, i) => this.card(startX2 + i * (CW + GAP), startY + CH + GAP, g))

    // ── Footer ────────────────────────────────────────────────────────────────
    this.add.text(W / 2, H - 16, 'Phaser 3  ·  TypeScript  ·  Vite', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '10px',
      color:      '#2a2a3e',
      letterSpacing: 3,
    }).setOrigin(0.5)
  }

  private card(x: number, y: number, game: typeof GAMES[0]): void {
    // Normal state (pre-drawn, just toggled)
    const bgNormal = this.add.graphics()
    bgNormal.fillStyle(0x1c1c28, 1)
    bgNormal.fillRoundedRect(x, y, CW, CH, 10)
    bgNormal.lineStyle(1, 0x2a2a3e, 1)
    bgNormal.strokeRoundedRect(x, y, CW, CH, 10)
    bgNormal.fillStyle(game.color, 1)
    bgNormal.fillRoundedRect(x, y, CW, 3, { tl: 10, tr: 10, bl: 0, br: 0 })

    // Hover state (pre-drawn, hidden initially)
    const bgHover = this.add.graphics()
    bgHover.fillStyle(0x22223a, 1)
    bgHover.fillRoundedRect(x, y, CW, CH, 10)
    bgHover.lineStyle(2, game.color, 0.9)
    bgHover.strokeRoundedRect(x, y, CW, CH, 10)
    bgHover.fillStyle(game.color, 1)
    bgHover.fillRoundedRect(x, y, CW, 3, { tl: 10, tr: 10, bl: 0, br: 0 })
    bgHover.setVisible(false)

    // Emoji
    this.add.text(x + CW / 2, y + 30, game.emoji, {
      fontSize: '26px',
    }).setOrigin(0.5)

    // Label
    this.add.text(x + CW / 2, y + 66, game.label, {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '13px',
      fontStyle:  'bold',
      color:      '#ffffff',
    }).setOrigin(0.5)

    // Hit zone
    const zone = this.add.zone(x, y, CW, CH).setOrigin(0).setInteractive({ useHandCursor: true })

    zone.on('pointerover',  () => { bgNormal.setVisible(false); bgHover.setVisible(true)  })
    zone.on('pointerout',   () => { bgNormal.setVisible(true);  bgHover.setVisible(false) })
    zone.on('pointerdown',  () => { this.cameras.main.flash(120, 0, 0, 0); this.scene.start(game.key) })
  }
}
