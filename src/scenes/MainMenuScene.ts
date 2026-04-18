import Phaser from 'phaser'
import { SCENE_KEYS, GAME_CONFIG, STORAGE_KEYS } from '@design/constants'
import { FontFamily } from '@design/typography'

// ── Game catalogue ────────────────────────────────────────────────────────────

interface GameDef {
  label:      string
  key:        string
  emoji:      string
  color:      number   // 0xRRGGBB
  difficulty: number   // 1–3
  tag:        string
}

const GAMES: GameDef[] = [
  { label: 'Snake',        key: SCENE_KEYS.SNAKE,        emoji: '🐍', color: 0x6c63ff, difficulty: 2, tag: 'Clássico'  },
  { label: 'Pong',         key: SCENE_KEYS.PONG,         emoji: '🏓', color: 0x00d2ff, difficulty: 1, tag: 'Reflexos'  },
  { label: 'Memory',       key: SCENE_KEYS.MEMORY,       emoji: '🧠', color: 0x43e97b, difficulty: 2, tag: 'Memória'   },
  { label: 'Breakout',     key: SCENE_KEYS.BREAKOUT,     emoji: '🧱', color: 0xf7971e, difficulty: 3, tag: 'Clássico'  },
  { label: 'Flappy',       key: SCENE_KEYS.FLAPPY,       emoji: '🐦', color: 0xff6584, difficulty: 3, tag: 'Agilidade' },
  { label: 'Meteor Dodge', key: SCENE_KEYS.METEOR_DODGE, emoji: '🚀', color: 0xa78bfa, difficulty: 2, tag: 'Esquiva'   },
  { label: 'Whack-a-Mole', key: SCENE_KEYS.WHACK_MOLE,  emoji: '🐭', color: 0xfbbf24, difficulty: 1, tag: 'Reflexos'  },
]

// ── Layout constants ──────────────────────────────────────────────────────────

const W   = GAME_CONFIG.WIDTH   // 800
const H   = GAME_CONFIG.HEIGHT  // 600
const CW  = 176  // card width
const CH  = 150  // card height
const GAP = 12

// cards start Y — leaves 135 px for the header
const CARDS_Y = 135

// action bar centre Y — 22 px below last card row
const BAR_Y = CARDS_Y + CH + GAP + CH + 22 + 18  // = 135+150+12+150+22+18 = 487 … adjust below
// Recalculate: row2 bottom = CARDS_Y + CH + GAP + CH = 135+150+12+150 = 447
// BAR_Y centre  = 447 + 26 = 473
const ACTION_Y = CARDS_Y + CH + GAP + CH + 26

// ── Helper type ───────────────────────────────────────────────────────────────

type Star = { x: number; y: number; sz: number; spd: number; a: number }

// ─────────────────────────────────────────────────────────────────────────────

export class MainMenuScene extends Phaser.Scene {
  private stars:   Star[] = []
  private starGfx!: Phaser.GameObjects.Graphics

  constructor() { super({ key: SCENE_KEYS.MAIN_MENU }) }

  create(): void {
    this.createBg()
    this.createStars()
    this.createHeader()
    this.createCards()
    this.createActionBar()
    this.createFooter()
  }

  update(): void {
    this.starGfx.clear()
    for (const s of this.stars) {
      s.y += s.spd
      if (s.y > H) { s.y = 0; s.x = Phaser.Math.Between(0, W) }
      this.starGfx.fillStyle(0xffffff, s.a)
      this.starGfx.fillCircle(s.x, s.y, s.sz)
    }
  }

  // ── Background ──────────────────────────────────────────────────────────────

  private createBg(): void {
    this.add.rectangle(0, 0, W, H, 0x0a0a0f).setOrigin(0)

    // Top purple vignette
    const top = this.add.graphics()
    top.fillGradientStyle(0x6c63ff, 0x6c63ff, 0x0a0a0f, 0x0a0a0f, 0.13, 0.13, 0, 0)
    top.fillRect(0, 0, W, 200)

    // Bottom pink vignette
    const btm = this.add.graphics()
    btm.fillGradientStyle(0x0a0a0f, 0x0a0a0f, 0xff6584, 0xff6584, 0, 0, 0.06, 0.06)
    btm.fillRect(0, H - 100, W, 100)
  }

  // ── Starfield ───────────────────────────────────────────────────────────────

  private createStars(): void {
    this.starGfx = this.add.graphics()
    this.stars   = Array.from({ length: 30 }, () => ({
      x:   Phaser.Math.Between(0, W),
      y:   Phaser.Math.Between(0, H),
      sz:  Phaser.Math.FloatBetween(0.3, 1.4),
      spd: Phaser.Math.FloatBetween(0.08, 0.28),
      a:   Phaser.Math.FloatBetween(0.1, 0.5),
    }))
  }

  // ── Header ──────────────────────────────────────────────────────────────────

  private createHeader(): void {
    // Title — slides in from above
    const title = this.add.text(W / 2, 55, 'SIRIO', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '54px',
      fontStyle:  'bold',
      color:      '#ffffff',
      stroke:     '#6c63ff',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0)

    // Subtitle
    const sub = this.add.text(W / 2, 100, 'MINI GAMES COLLECTION', {
      fontFamily:   FontFamily.PRIMARY,
      fontSize:     '11px',
      color:        '#484868',
      letterSpacing: 8,
    }).setOrigin(0.5).setAlpha(0)

    // Divider
    const div = this.add.graphics().setAlpha(0)
    div.lineStyle(1, 0x6c63ff, 0.28)
    div.lineBetween(W / 2 - 150, 120, W / 2 + 150, 120)

    this.tweens.add({ targets: title, alpha: 1, y: { from: 36, to: 55 }, duration: 520, ease: 'Power2.easeOut' })
    this.tweens.add({ targets: [sub, div], alpha: 1, duration: 420, delay: 160, ease: 'Power1' })
  }

  // ── Cards ────────────────────────────────────────────────────────────────────

  private createCards(): void {
    const row1 = GAMES.slice(0, 4)
    const row2 = GAMES.slice(4)

    const tw1   = row1.length * CW + (row1.length - 1) * GAP
    const sx1   = (W - tw1) / 2

    const tw2   = row2.length * CW + (row2.length - 1) * GAP
    const sx2   = (W - tw2) / 2

    row1.forEach((g, i) => this.makeCard(sx1 + i * (CW + GAP), CARDS_Y,             g, 280 + i * 55))
    row2.forEach((g, i) => this.makeCard(sx2 + i * (CW + GAP), CARDS_Y + CH + GAP,  g, 280 + (4 + i) * 55))
  }

  private makeCard(cx: number, cy: number, g: GameDef, delay: number): void {
    const stored   = localStorage.getItem(`${STORAGE_KEYS.SCORE_PREFIX}:${g.key}`)
    const scoreStr = stored ? `RECORDE  ${stored}` : 'SEM RECORDE'
    const scoreCol = stored ? '#52527a' : '#2a2a40'
    const colorHex = '#' + g.color.toString(16).padStart(6, '0')

    // Container starts 14 px below final position for slide-in
    const cont = this.add.container(cx, cy + 14).setAlpha(0)

    // ── Normal state ──
    const bgN = this.add.graphics()
    bgN.fillStyle(0x111120, 1)
    bgN.fillRoundedRect(0, 0, CW, CH, 10)
    bgN.lineStyle(1, 0x212135, 1)
    bgN.strokeRoundedRect(0, 0, CW, CH, 10)
    bgN.fillStyle(g.color, 1)
    bgN.fillRoundedRect(0, 0, CW, 4, { tl: 10, tr: 10, bl: 0, br: 0 })

    // ── Hover state ──
    const bgH = this.add.graphics().setVisible(false)
    bgH.fillStyle(0x18182c, 1)
    bgH.fillRoundedRect(0, 0, CW, CH, 10)
    bgH.lineStyle(2, g.color, 0.9)
    bgH.strokeRoundedRect(0, 0, CW, CH, 10)
    bgH.fillStyle(g.color, 1)
    bgH.fillRoundedRect(0, 0, CW, 4, { tl: 10, tr: 10, bl: 0, br: 0 })

    // Inner hover glow (top section)
    const glowH = this.add.graphics().setVisible(false)
    glowH.fillGradientStyle(g.color, g.color, 0x18182c, 0x18182c, 0.07, 0.07, 0, 0)
    glowH.fillRect(2, 4, CW - 4, 54)

    // ── Text elements ──
    const emoji = this.add.text(CW / 2, 36, g.emoji, { fontSize: '28px' }).setOrigin(0.5)

    const label = this.add.text(CW / 2, 75, g.label, {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '13px',
      fontStyle:  'bold',
      color:      '#dcdcf0',
    }).setOrigin(0.5)

    const tag = this.add.text(CW / 2, 93, g.tag.toUpperCase(), {
      fontFamily:   FontFamily.PRIMARY,
      fontSize:     '9px',
      color:        colorHex,
      letterSpacing: 2,
    }).setOrigin(0.5)

    const score = this.add.text(CW / 2, 111, scoreStr, {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '9px',
      color:      scoreCol,
    }).setOrigin(0.5)

    // ── Difficulty dots (3 circles) ──
    const dots = this.add.graphics()
    const dotR = 3.5
    const dotGap = 11
    const dx = CW / 2 - dotGap
    for (let d = 0; d < 3; d++) {
      dots.fillStyle(d < g.difficulty ? g.color : 0x202030, d < g.difficulty ? 0.85 : 1)
      dots.fillCircle(dx + d * dotGap, 133, dotR)
    }

    // ── Hit zone ──
    const zone = this.add.zone(0, 0, CW, CH).setOrigin(0).setInteractive({ useHandCursor: true })

    cont.add([bgN, bgH, glowH, emoji, label, tag, score, dots, zone])

    // Entrance animation
    this.tweens.add({ targets: cont, alpha: 1, y: cy, duration: 380, delay, ease: 'Back.easeOut' })

    // Hover interactions
    zone.on('pointerover', () => {
      bgN.setVisible(false); bgH.setVisible(true); glowH.setVisible(true)
      this.tweens.killTweensOf(cont)
      this.tweens.add({ targets: cont, scaleX: 1.045, scaleY: 1.045, duration: 110, ease: 'Power1' })
    })
    zone.on('pointerout', () => {
      bgN.setVisible(true); bgH.setVisible(false); glowH.setVisible(false)
      this.tweens.killTweensOf(cont)
      this.tweens.add({ targets: cont, scaleX: 1, scaleY: 1, duration: 110, ease: 'Power1' })
    })
    zone.on('pointerdown', () => {
      this.cameras.main.flash(90, 0, 0, 0)
      this.time.delayedCall(75, () => this.scene.start(g.key))
    })
  }

  // ── Action bar ───────────────────────────────────────────────────────────────

  private createActionBar(): void {
    // Group width: 180 (primary) + 28 gap + 76 (secondary) = 284 px → centred at W/2
    const groupW  = 180 + 28 + 76
    const groupX  = W / 2 - groupW / 2

    this.makeBtn(groupX,           ACTION_Y, 180, 38, 0x5b54e8, 0x7068f0, '⚡  Jogar Todos', '#ffffff', () => {
      this.cameras.main.flash(90, 0, 0, 0)
      this.time.delayedCall(75, () => this.scene.start(SCENE_KEYS.GAME_MANAGER))
    })

    this.makeBtn(groupX + 180 + 28, ACTION_Y, 76, 38, 0x111120, 0x1a1a2e, '⛶', '#5a5a88', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen()
      } else {
        this.scale.startFullscreen()
      }
    })
  }

  private makeBtn(
    x: number, y: number, w: number, h: number,
    bgNorm: number, bgHover: number,
    label: string, textColor: string,
    onClick: () => void,
  ): void {
    const cy = y + h / 2
    const cx = x + w / 2

    const gN = this.add.graphics()
    gN.fillStyle(bgNorm, 1)
    gN.fillRoundedRect(x, y, w, h, 8)

    const gH = this.add.graphics().setVisible(false)
    gH.fillStyle(bgHover, 1)
    gH.fillRoundedRect(x, y, w, h, 8)

    this.add.text(cx, cy, label, {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '13px',
      fontStyle:  'bold',
      color:      textColor,
    }).setOrigin(0.5)

    const zone = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true })
    zone.on('pointerover',  () => { gN.setVisible(false); gH.setVisible(true)  })
    zone.on('pointerout',   () => { gN.setVisible(true);  gH.setVisible(false) })
    zone.on('pointerdown',  onClick)
  }

  // ── Footer ───────────────────────────────────────────────────────────────────

  private createFooter(): void {
    this.add.text(W / 2, H - 14, 'Phaser 3  ·  TypeScript  ·  Vite  ·  GitHub Pages', {
      fontFamily:   FontFamily.PRIMARY,
      fontSize:     '9px',
      color:        '#1e1e2e',
      letterSpacing: 3,
    }).setOrigin(0.5)
  }
}
