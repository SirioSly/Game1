import Phaser from 'phaser'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { Colors } from '@design/colors'
import { FontFamily } from '@design/typography'
import { BorderRadius } from '@design/spacing'

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

const W = GAME_CONFIG.WIDTH
const H = GAME_CONFIG.HEIGHT

const CARD_W    = 168
const CARD_H    = 108
const CARD_COLS = 4
const CARD_GAP  = 14
const GRID_W    = CARD_COLS * CARD_W + (CARD_COLS - 1) * CARD_GAP
const GRID_X    = (W - GRID_W) / 2
const GRID_Y    = 200

export class MainMenuScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.MAIN_MENU }) }

  create(): void {
    this.drawBackground()
    this.drawTitle()
    this.drawCards()
    this.drawFooter()
  }

  // ── Background (static — drawn once) ─────────────────────────────────────────
  private drawBackground(): void {
    const g = this.add.graphics()

    // Base
    g.fillStyle(Colors.BG_PRIMARY.num, 1)
    g.fillRect(0, 0, W, H)

    // Top center glow — single soft circle, drawn once
    for (let i = 10; i >= 0; i--) {
      g.fillStyle(Colors.BRAND_PRIMARY.num, 0.025 * (1 - i / 10))
      g.fillCircle(W / 2, -20, 420 * (i / 10))
    }

    // Bottom right accent
    for (let i = 8; i >= 0; i--) {
      g.fillStyle(Colors.BRAND_SECONDARY.num, 0.02 * (1 - i / 8))
      g.fillCircle(W + 40, H + 40, 300 * (i / 8))
    }

    // Stars — static dots, no animation
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, W)
      const y = Phaser.Math.Between(0, H)
      const r = Math.random() < 0.15 ? 1.5 : 0.8
      g.fillStyle(0xffffff, 0.15 + Math.random() * 0.45)
      g.fillCircle(x, y, r)
    }
  }

  // ── Title ─────────────────────────────────────────────────────────────────────
  private drawTitle(): void {
    const cx = W / 2

    // Title
    const title = this.add.text(cx, 68, 'SIRIO', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '62px',
      fontStyle:  'bold',
      color:      '#ffffff',
      stroke:     Colors.BRAND_PRIMARY.hex,
      strokeThickness: 4,
    }).setOrigin(0.5)

    // Gentle float tween — just Y, no redraw
    this.tweens.add({
      targets:  title,
      y:        72,
      duration: 2000,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    })

    // Subtitle
    this.add.text(cx, 116, 'MINI GAMES COLLECTION', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '13px',
      color:      Colors.TEXT_SECONDARY.hex,
      letterSpacing: 5,
    }).setOrigin(0.5)

    // Divider
    const div = this.add.graphics()
    div.lineStyle(1, Colors.BRAND_PRIMARY.num, 0.4)
    div.beginPath()
    div.moveTo(cx - 140, 140); div.lineTo(cx + 140, 140)
    div.strokePath()
    div.fillStyle(Colors.BRAND_PRIMARY.num, 0.7)
    div.fillCircle(cx - 140, 140, 2.5)
    div.fillCircle(cx + 140, 140, 2.5)
    div.fillCircle(cx, 140, 2.5)

    // Badge
    const bw = 116, bh = 24, bx = cx - bw / 2, by = 152
    const badge = this.add.graphics()
    badge.fillStyle(Colors.BG_CARD.num, 1)
    badge.lineStyle(1, Colors.BORDER.num, 1)
    badge.fillRoundedRect(bx, by, bw, bh, BorderRadius.PILL)
    badge.strokeRoundedRect(bx, by, bw, bh, BorderRadius.PILL)

    this.add.text(cx, by + bh / 2, `${GAMES.length} jogos disponíveis`, {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '11px',
      color:      Colors.TEXT_SECONDARY.hex,
    }).setOrigin(0.5)
  }

  // ── Cards ─────────────────────────────────────────────────────────────────────
  private drawCards(): void {
    const row1 = GAMES.slice(0, 4)
    const row2 = GAMES.slice(4)

    // Row 1 — 4 cards
    row1.forEach((game, i) => {
      const x = GRID_X + i * (CARD_W + CARD_GAP)
      this.createCard(x, GRID_Y, game, i * 60)
    })

    // Row 2 — remaining cards, centered
    const row2W = row2.length * CARD_W + (row2.length - 1) * CARD_GAP
    const row2X = (W - row2W) / 2
    row2.forEach((game, i) => {
      const x = row2X + i * (CARD_W + CARD_GAP)
      this.createCard(x, GRID_Y + CARD_H + CARD_GAP, game, 240 + i * 60)
    })
  }

  private createCard(
    x: number, y: number,
    game: { label: string; key: string; emoji: string; genre: string },
    delay: number,
  ): void {
    const accent = GENRE_COLOR[game.genre] ?? Colors.BRAND_PRIMARY.num
    const accentHex = GENRE_HEX[game.genre] ?? Colors.BRAND_PRIMARY.hex

    const container = this.add.container(x + CARD_W / 2, y + CARD_H / 2)
    container.setAlpha(0)

    // Card bg graphic
    const bg = this.add.graphics()
    this.drawCardNormal(bg, accent)

    // Emoji
    const emoji = this.add.text(0, -22, game.emoji, {
      fontSize: '26px',
    }).setOrigin(0.5)

    // Label
    const label = this.add.text(0, 14, game.label, {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '14px',
      fontStyle:  'bold',
      color:      '#ffffff',
    }).setOrigin(0.5)

    // Genre pill
    const pillW = 62, pillH = 16
    const pill = this.add.graphics()
    pill.fillStyle(accent, 0.18)
    pill.fillRoundedRect(-pillW / 2, 28, pillW, pillH, BorderRadius.PILL)

    const genreText = this.add.text(0, 36, game.genre, {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '10px',
      color:      accentHex,
      letterSpacing: 1,
    }).setOrigin(0.5)

    container.add([bg, emoji, label, pill, genreText])

    // Hit zone
    const zone = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: true })
    container.add(zone)

    zone.on('pointerover', () => {
      bg.clear()
      this.drawCardHover(bg, accent)
      this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 100, ease: 'Power2' })
    })
    zone.on('pointerout', () => {
      bg.clear()
      this.drawCardNormal(bg, accent)
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100, ease: 'Power2' })
    })
    zone.on('pointerdown', () => {
      this.tweens.add({
        targets: container, scaleX: 0.96, scaleY: 0.96, duration: 80, yoyo: true,
        onComplete: () => this.scene.start(game.key),
      })
    })

    // Entrance animation
    this.tweens.add({
      targets:  container,
      alpha:    1,
      y:        container.y,
      duration: 300,
      delay,
      ease:     'Power2',
    })
    container.y += 20  // start slightly lower
  }

  private drawCardNormal(g: Phaser.GameObjects.Graphics, accent: number): void {
    const hw = CARD_W / 2, hh = CARD_H / 2
    g.fillStyle(Colors.BG_CARD.num, 1)
    g.fillRoundedRect(-hw, -hh, CARD_W, CARD_H, BorderRadius.LG)
    g.lineStyle(1, Colors.BORDER.num, 1)
    g.strokeRoundedRect(-hw, -hh, CARD_W, CARD_H, BorderRadius.LG)
    // Top accent strip
    g.fillStyle(accent, 0.9)
    g.fillRoundedRect(-hw, -hh, CARD_W, 4, { tl: BorderRadius.LG, tr: BorderRadius.LG, bl: 0, br: 0 })
  }

  private drawCardHover(g: Phaser.GameObjects.Graphics, accent: number): void {
    const hw = CARD_W / 2, hh = CARD_H / 2
    // Glow layer
    g.fillStyle(accent, 0.08)
    g.fillRoundedRect(-hw - 2, -hh - 2, CARD_W + 4, CARD_H + 4, BorderRadius.LG + 2)
    // Card
    g.fillStyle(Colors.BG_CARD.num, 1)
    g.fillRoundedRect(-hw, -hh, CARD_W, CARD_H, BorderRadius.LG)
    g.lineStyle(2, accent, 1)
    g.strokeRoundedRect(-hw, -hh, CARD_W, CARD_H, BorderRadius.LG)
    // Top accent strip
    g.fillStyle(accent, 1)
    g.fillRoundedRect(-hw, -hh, CARD_W, 4, { tl: BorderRadius.LG, tr: BorderRadius.LG, bl: 0, br: 0 })
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  private drawFooter(): void {
    this.add.text(W / 2, H - 18, 'Phaser 3  ·  TypeScript  ·  Vite', {
      fontFamily: FontFamily.PRIMARY,
      fontSize:   '10px',
      color:      Colors.TEXT_MUTED.hex,
      letterSpacing: 2,
    }).setOrigin(0.5)
  }
}
