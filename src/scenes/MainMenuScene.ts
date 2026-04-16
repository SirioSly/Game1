import Phaser from 'phaser'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { Colors } from '@design/colors'
import { TextStyles, FontFamily } from '@design/typography'
import { Spacing, BorderRadius } from '@design/spacing'

// ─── Game catalogue ───────────────────────────────────────────────────────────
const GAMES: { label: string; key: string; emoji: string; genre: string }[] = [
  { label: 'Snake',        key: SCENE_KEYS.SNAKE,        emoji: '🐍', genre: 'arcade'  },
  { label: 'Pong',         key: SCENE_KEYS.PONG,         emoji: '🏓', genre: 'arcade'  },
  { label: 'Memory',       key: SCENE_KEYS.MEMORY,       emoji: '🧠', genre: 'puzzle'  },
  { label: 'Breakout',     key: SCENE_KEYS.BREAKOUT,     emoji: '🧱', genre: 'arcade'  },
  { label: 'Flappy',       key: SCENE_KEYS.FLAPPY,       emoji: '🐦', genre: 'casual'  },
  { label: 'Meteor Dodge', key: SCENE_KEYS.METEOR_DODGE, emoji: '🚀', genre: 'arcade'  },
  { label: 'Whack-a-Mole', key: SCENE_KEYS.WHACK_MOLE,  emoji: '🐭', genre: 'casual'  },
]

const GENRE_COLOR: Record<string, number> = {
  arcade: Colors.BRAND_PRIMARY.num,
  puzzle: Colors.BRAND_ACCENT.num,
  casual: Colors.BRAND_SECONDARY.num,
}

const GENRE_HEX: Record<string, string> = {
  arcade: Colors.BRAND_PRIMARY.hex,
  puzzle: Colors.BRAND_ACCENT.hex,
  casual: Colors.BRAND_SECONDARY.hex,
}

// ─── Layout ───────────────────────────────────────────────────────────────────
const W = GAME_CONFIG.WIDTH
const H = GAME_CONFIG.HEIGHT

const CARD_W    = 200
const CARD_H    = 110
const CARD_COLS = 4
const CARD_GAP  = 16
const GRID_W    = CARD_COLS * CARD_W + (CARD_COLS - 1) * CARD_GAP
const GRID_X    = (W - GRID_W) / 2 + CARD_W / 2
const GRID_Y    = 290

export class MainMenuScene extends Phaser.Scene {
  private stars:    Phaser.GameObjects.Graphics[] = []
  private particles: { x: number; y: number; vy: number; alpha: number; r: number; color: number }[] = []
  private bgGfx!:  Phaser.GameObjects.Graphics
  private t        = 0

  constructor() { super({ key: SCENE_KEYS.MAIN_MENU }) }

  create(): void {
    this.stars    = []
    this.particles = []
    this.t        = 0

    this.bgGfx = this.add.graphics()
    this.drawBackground()
    this.spawnStars()
    this.drawTitle()
    this.drawCards()
    this.drawFooter()
  }

  update(_time: number, delta: number): void {
    this.t += delta
    this.animateBackground()
    this.animateParticles(delta)
  }

  // ── Background ────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const g = this.bgGfx
    g.clear()

    // Base deep dark
    g.fillStyle(Colors.BG_PRIMARY.num, 1)
    g.fillRect(0, 0, W, H)

    // Radial glow top-center (brand purple)
    const steps = 18
    for (let i = steps; i >= 0; i--) {
      const alpha = 0.045 * (1 - i / steps)
      const r     = 340 * (i / steps)
      g.fillStyle(Colors.BRAND_PRIMARY.num, alpha)
      g.fillCircle(W / 2, 0, r)
    }

    // Radial glow bottom-right (pink accent)
    for (let i = steps; i >= 0; i--) {
      const alpha = 0.03 * (1 - i / steps)
      const r     = 280 * (i / steps)
      g.fillStyle(Colors.BRAND_SECONDARY.num, alpha)
      g.fillCircle(W, H, r)
    }

    // Subtle grid
    g.lineStyle(1, Colors.BG_CARD.num, 0.35)
    for (let x = 0; x < W; x += 40) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.strokePath()
    }
    for (let y = 0; y < H; y += 40) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath()
    }
  }

  private animateBackground(): void {
    // Pulse the top glow
    const pulse = 0.5 + 0.5 * Math.sin(this.t / 2200)
    const g = this.bgGfx

    // Only redraw glow layers (don't clear full bg every frame — cheap approach:
    // use a separate overlay graphics instead)
    // For simplicity, redraw everything at low cost
    if (Math.floor(this.t / 80) % 2 === 0) {
      g.clear()
      g.fillStyle(Colors.BG_PRIMARY.num, 1)
      g.fillRect(0, 0, W, H)

      const steps = 14
      for (let i = steps; i >= 0; i--) {
        const alpha = (0.04 + pulse * 0.02) * (1 - i / steps)
        const r     = (320 + pulse * 40) * (i / steps)
        g.fillStyle(Colors.BRAND_PRIMARY.num, alpha)
        g.fillCircle(W / 2, 0, r)
      }
      for (let i = steps; i >= 0; i--) {
        const alpha = 0.025 * (1 - i / steps)
        const r     = 240 * (i / steps)
        g.fillStyle(Colors.BRAND_SECONDARY.num, alpha)
        g.fillCircle(W, H, r)
      }

      g.lineStyle(1, Colors.BG_CARD.num, 0.3)
      for (let x = 0; x < W; x += 40) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.strokePath()
      }
      for (let y = 0; y < H; y += 40) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath()
      }
    }
  }

  // ── Stars ─────────────────────────────────────────────────────────────────────

  private spawnStars(): void {
    const count = 55
    for (let i = 0; i < count; i++) {
      const g = this.add.graphics()
      const x = Phaser.Math.Between(0, W)
      const y = Phaser.Math.Between(0, H)
      const r = Math.random() < 0.2 ? 2 : 1
      const alpha = 0.3 + Math.random() * 0.7
      g.fillStyle(0xffffff, alpha)
      g.fillCircle(x, y, r)
      this.stars.push(g)
      // Twinkle
      this.tweens.add({
        targets:  g,
        alpha:    { from: alpha, to: 0.1 },
        duration: 800 + Math.random() * 2000,
        yoyo:     true,
        repeat:   -1,
        delay:    Math.random() * 2000,
      })

      // Occasional floating particles
      if (i % 8 === 0) {
        this.particles.push({
          x: Phaser.Math.Between(20, W - 20),
          y: Phaser.Math.Between(20, H - 20),
          vy: -(0.3 + Math.random() * 0.6),
          alpha: 0.4 + Math.random() * 0.4,
          r: 1.5 + Math.random() * 1.5,
          color: [Colors.BRAND_PRIMARY.num, Colors.BRAND_ACCENT.num, Colors.BRAND_SECONDARY.num][
            Math.floor(Math.random() * 3)
          ],
        })
      }
    }
  }

  private animateParticles(delta: number): void {
    for (const p of this.particles) {
      p.y += p.vy * (delta / 16)
      if (p.y < -10) p.y = H + 10
    }
  }

  // ── Title ─────────────────────────────────────────────────────────────────────

  private drawTitle(): void {
    const cx = W / 2

    // Glow behind title
    const glow = this.add.graphics()
    glow.fillStyle(Colors.BRAND_PRIMARY.num, 0.18)
    glow.fillEllipse(cx, 72, 340, 90)

    // Main title
    const title = this.add.text(cx, 62, 'SIRIO', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '68px',
      fontStyle:  'bold',
      color:      Colors.TEXT_PRIMARY.hex,
      stroke:     Colors.BRAND_PRIMARY.hex,
      strokeThickness: 3,
    }).setOrigin(0.5)

    // Subtle pulse on title
    this.tweens.add({
      targets:  title,
      scaleX:   1.03,
      scaleY:   1.03,
      duration: 1800,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    })

    // Subtitle
    this.add.text(cx, 112, 'Mini Games Collection', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '16px',
      color:      Colors.TEXT_SECONDARY.hex,
      letterSpacing: 4,
    }).setOrigin(0.5)

    // Divider line
    const div = this.add.graphics()
    div.lineStyle(1, Colors.BRAND_PRIMARY.num, 0.5)
    div.beginPath()
    div.moveTo(cx - 160, 135)
    div.lineTo(cx + 160, 135)
    div.strokePath()

    // Dot on each end of divider
    div.fillStyle(Colors.BRAND_PRIMARY.num, 0.8)
    div.fillCircle(cx - 160, 135, 3)
    div.fillCircle(cx + 160, 135, 3)

    // Game count badge
    const badgeG = this.add.graphics()
    badgeG.fillStyle(Colors.BG_CARD.num, 1)
    badgeG.lineStyle(1, Colors.BORDER.num, 1)
    badgeG.fillRoundedRect(cx - 52, 146, 104, 26, BorderRadius.PILL)
    badgeG.strokeRoundedRect(cx - 52, 146, 104, 26, BorderRadius.PILL)

    this.add.text(cx, 159, `${GAMES.length} jogos disponíveis`, {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '12px',
      color:      Colors.TEXT_SECONDARY.hex,
    }).setOrigin(0.5)
  }

  // ── Cards ─────────────────────────────────────────────────────────────────────

  private drawCards(): void {
    GAMES.forEach((game, i) => {
      const col = i % CARD_COLS
      const row = Math.floor(i / CARD_COLS)
      const x   = GRID_X + col * (CARD_W + CARD_GAP) - CARD_W / 2
      const y   = GRID_Y + row * (CARD_H + CARD_GAP)
      this.createCard(x, y, game)
    })
  }

  private createCard(
    x: number, y: number,
    game: { label: string; key: string; emoji: string; genre: string },
  ): void {
    const accentColor = GENRE_COLOR[game.genre] ?? Colors.BRAND_PRIMARY.num
    const accentHex   = GENRE_HEX[game.genre]   ?? Colors.BRAND_PRIMARY.hex

    // Card bg
    const bg = this.add.graphics()
    const drawNormal = (): void => {
      bg.clear()
      bg.fillStyle(Colors.BG_CARD.num, 1)
      bg.fillRoundedRect(x, y - CARD_H / 2, CARD_W, CARD_H, BorderRadius.LG)
      bg.lineStyle(1, Colors.BORDER.num, 1)
      bg.strokeRoundedRect(x, y - CARD_H / 2, CARD_W, CARD_H, BorderRadius.LG)
      // Top accent bar
      bg.fillStyle(accentColor, 0.7)
      bg.fillRoundedRect(x, y - CARD_H / 2, CARD_W, 4, { tl: BorderRadius.LG, tr: BorderRadius.LG, bl: 0, br: 0 })
    }
    const drawHover = (): void => {
      bg.clear()
      bg.fillStyle(Colors.BG_CARD.num, 1)
      bg.fillRoundedRect(x - 2, y - CARD_H / 2 - 2, CARD_W + 4, CARD_H + 4, BorderRadius.LG)
      bg.lineStyle(2, accentColor, 1)
      bg.strokeRoundedRect(x - 2, y - CARD_H / 2 - 2, CARD_W + 4, CARD_H + 4, BorderRadius.LG)
      // Glow
      bg.fillStyle(accentColor, 0.08)
      bg.fillRoundedRect(x - 2, y - CARD_H / 2 - 2, CARD_W + 4, CARD_H + 4, BorderRadius.LG)
      // Top accent bar
      bg.fillStyle(accentColor, 1)
      bg.fillRoundedRect(x - 2, y - CARD_H / 2 - 2, CARD_W + 4, 4, { tl: BorderRadius.LG, tr: BorderRadius.LG, bl: 0, br: 0 })
    }
    drawNormal()

    // Emoji
    this.add.text(x + CARD_W / 2, y - CARD_H / 2 + 28, game.emoji, {
      fontSize: '28px',
    }).setOrigin(0.5)

    // Game name
    this.add.text(x + CARD_W / 2, y - CARD_H / 2 + 62, game.label, {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '15px',
      fontStyle:  'bold',
      color:      Colors.TEXT_PRIMARY.hex,
    }).setOrigin(0.5)

    // Genre badge
    const badgeW = 68
    const badgeH = 18
    const badgeX = x + CARD_W / 2 - badgeW / 2
    const badgeY = y - CARD_H / 2 + 79
    const badgeBg = this.add.graphics()
    badgeBg.fillStyle(accentColor, 0.15)
    badgeBg.fillRoundedRect(badgeX, badgeY, badgeW, badgeH, BorderRadius.PILL)

    this.add.text(x + CARD_W / 2, badgeY + badgeH / 2, game.genre, {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '10px',
      color:      accentHex,
      letterSpacing: 1,
    }).setOrigin(0.5)

    // Hit area
    const zone = this.add.zone(x + CARD_W / 2, y, CARD_W, CARD_H)
      .setInteractive({ useHandCursor: true })

    zone.on('pointerover', () => {
      drawHover()
      this.tweens.add({ targets: zone, scaleX: 1, scaleY: 1, duration: 80 })
    })
    zone.on('pointerout', () => {
      drawNormal()
    })
    zone.on('pointerdown', () => {
      this.tweens.add({
        targets:  bg,
        alpha:    0.6,
        duration: 80,
        yoyo:     true,
        onComplete: () => this.scene.start(game.key),
      })
    })
  }

  // ── Footer ────────────────────────────────────────────────────────────────────

  private drawFooter(): void {
    const y = H - Spacing.LG

    this.add.text(W / 2, y, 'Phaser 3  ·  TypeScript  ·  Vite', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '11px',
      color:      Colors.TEXT_MUTED.hex,
      letterSpacing: 2,
    }).setOrigin(0.5)
  }
}
