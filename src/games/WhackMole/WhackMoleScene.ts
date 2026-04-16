import Phaser from 'phaser'
import { BaseMiniGameScene, type IMiniGame } from '@games/IMiniGame'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'
import { Spacing } from '@design/spacing'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { GameManagerScene } from '@scenes/GameManagerScene'
import { UIButton } from '@ui/UIButton'

// ─── Grid layout ──────────────────────────────────────────────────────────────
const COLS        = 3
const ROWS        = 3
const HOLE_R      = 48          // hole radius
const MOLE_R      = 38          // mole head radius
const GRID_PAD_X  = 180
const GRID_PAD_Y  = 140
const H_GAP       = (GAME_CONFIG.WIDTH  - GRID_PAD_X * 2) / (COLS - 1)   // 220
const V_GAP       = (GAME_CONFIG.HEIGHT - GRID_PAD_Y * 2) / (ROWS - 1)   // 160

// ─── Timing ───────────────────────────────────────────────────────────────────
const DURATION_MS      = 30_000
const POPUP_INTERVAL   = 950    // ms between spawns
const POPUP_INTERVAL_MIN = 380
const POPUP_RAMP_STEP  = 50     // interval reduction every 5 s
const VISIBLE_MS       = 1400   // how long a normal mole stays up
const VISIBLE_FAST_MS  = 750
const BOMB_MS          = 1800

// ─── Scoring ─────────────────────────────────────────────────────────────────
const PTS_NORMAL = 10
const PTS_FAST   = 25
const PTS_BOMB   = -15   // penalty if you miss a bomb (it explodes)

// ─── Config ───────────────────────────────────────────────────────────────────
const WHACK_CONFIG: IMiniGame = {
  sceneKey:    SCENE_KEYS.WHACK_MOLE,
  displayName: 'Whack-a-Mole',
  durationMs:  DURATION_MS,
  difficulty:  2,
  genre:       'casual',
}

GameManagerScene.registerGame(WHACK_CONFIG)

// ─── Types ────────────────────────────────────────────────────────────────────
type MoleType = 'normal' | 'fast' | 'bomb'

interface Hole {
  col:      number
  row:      number
  cx:       number
  cy:       number
  gfx:      Phaser.GameObjects.Graphics
  moleGfx:  Phaser.GameObjects.Graphics
  hitZone:  Phaser.GameObjects.Zone
  occupied: boolean
  moleType: MoleType
  visTimer: Phaser.Time.TimerEvent | null
  peekY:    number   // current visible height (0 = hidden, MOLE_R*2 = fully up)
  peekDir:  1 | -1   // 1 = rising, -1 = going down
}

// ─── Scene ────────────────────────────────────────────────────────────────────
export class WhackMoleScene extends BaseMiniGameScene {
  constructor() { super({ key: SCENE_KEYS.WHACK_MOLE }) }

  protected get miniGameConfig(): IMiniGame { return WHACK_CONFIG }

  private holes:       Hole[]  = []
  private score        = 0
  private whacks       = 0
  private misses       = 0
  private spawnTimer   = 0
  private spawnInterval = POPUP_INTERVAL
  private survivalSecs = 0
  private alive        = true

  // HUD
  private scoreTxt!:   Phaser.GameObjects.Text
  private timerTxt!:   Phaser.GameObjects.Text
  private comboTxt!:   Phaser.GameObjects.Text
  private progressBar!: Phaser.GameObjects.Graphics
  private combo        = 0

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  protected onStart(): void {
    this.score        = 0
    this.whacks       = 0
    this.misses       = 0
    this.spawnTimer   = 0
    this.spawnInterval = POPUP_INTERVAL
    this.survivalSecs = 0
    this.alive        = true
    this.combo        = 0
    this.holes        = []

    this.drawBackground()
    this.createHoles()
    this.createHUD()
  }

  protected onUpdate(_time: number, delta: number): void {
    if (!this.alive) return

    const dt = delta / 1000
    const prevSecs = Math.floor(this.survivalSecs)
    this.survivalSecs += dt
    const curSecs = Math.floor(this.survivalSecs)

    // Ramp difficulty every 5 s
    if (curSecs > prevSecs && curSecs % 5 === 0) {
      this.spawnInterval = Math.max(POPUP_INTERVAL_MIN, this.spawnInterval - POPUP_RAMP_STEP)
    }

    // Spawn
    this.spawnTimer += delta
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval
      this.trySpawnMole()
    }

    // Animate moles
    for (const hole of this.holes) {
      if (!hole.occupied && hole.peekY <= 0) continue
      this.animateMole(hole, delta)
    }

    // Update HUD
    const remaining = Math.max(0, DURATION_MS / 1000 - this.survivalSecs)
    this.timerTxt.setText(`⏱  ${Math.ceil(remaining)}s`)
    this.drawProgressBar(remaining)
  }

  protected override onTimeUp(): void {
    this.alive = false
    this.hideAllMoles()
    this.showResultPanel()
  }

  // ── Holes & moles ─────────────────────────────────────────────────────────────

  private createHoles(): void {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cx = GRID_PAD_X + col * H_GAP
        const cy = GRID_PAD_Y + row * V_GAP

        // Hole shadow/dirt
        const gfx = this.add.graphics()
        this.drawHole(gfx, cx, cy)

        // Mole graphics (drawn on top)
        const moleGfx = this.add.graphics()

        // Hit zone
        const hitZone = this.add.zone(cx, cy - HOLE_R * 0.3, HOLE_R * 2.2, HOLE_R * 2.2)
          .setInteractive({ useHandCursor: true })

        const hole: Hole = {
          col, row, cx, cy,
          gfx, moleGfx, hitZone,
          occupied: false,
          moleType: 'normal',
          visTimer: null,
          peekY:    0,
          peekDir:  1,
        }

        hitZone.on('pointerdown', () => this.onWhack(hole))

        this.holes.push(hole)
      }
    }
  }

  private drawHole(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    gfx.clear()
    // Shadow ellipse
    gfx.fillStyle(0x1a1208, 1)
    gfx.fillEllipse(cx, cy + 8, HOLE_R * 2.2, HOLE_R * 0.9)
    // Dirt rim
    gfx.fillStyle(0x5c3d1e, 1)
    gfx.fillEllipse(cx, cy, HOLE_R * 2.2, HOLE_R * 0.85)
    // Inner dark hole
    gfx.fillStyle(0x1a1208, 1)
    gfx.fillEllipse(cx, cy + 2, HOLE_R * 1.8, HOLE_R * 0.65)
  }

  private trySpawnMole(): void {
    const free = this.holes.filter(h => !h.occupied)
    if (free.length === 0) return

    const hole = free[Phaser.Math.Between(0, free.length - 1)]

    // Pick type: 15% bomb, 20% fast, 65% normal
    const r = Math.random()
    hole.moleType = r < 0.15 ? 'bomb' : r < 0.35 ? 'fast' : 'normal'
    hole.occupied = true
    hole.peekDir  = 1
    hole.peekY    = 0

    const stayMs = hole.moleType === 'fast' ? VISIBLE_FAST_MS
      : hole.moleType === 'bomb' ? BOMB_MS
      : VISIBLE_MS

    hole.visTimer = this.time.addEvent({
      delay:    stayMs,
      callback: () => this.retractMole(hole, false),
    })
  }

  private animateMole(hole: Hole, delta: number): void {
    const speed = hole.moleType === 'fast' ? 5.5 : 4.0   // MOLE_R units / 100ms
    hole.peekY = Phaser.Math.Clamp(
      hole.peekY + hole.peekDir * speed * (delta / 100),
      0,
      MOLE_R * 1.6,
    )
    this.drawMole(hole)
  }

  private drawMole(hole: Hole): void {
    const { moleGfx, cx, cy, peekY, moleType } = hole
    moleGfx.clear()

    if (peekY <= 0) return

    // Clip emerging from hole: draw from cy downward and clip to above cy
    const headY = cy - peekY + MOLE_R * 0.3

    // Body color per type
    const bodyColor  = moleType === 'bomb'   ? Colors.ERROR.num
      : moleType === 'fast'   ? Colors.WARNING.num
      : 0x7b4f2e

    const faceColor  = moleType === 'bomb'   ? 0xff8080
      : moleType === 'fast'   ? 0xfff0a0
      : 0xd4956a

    // Body
    moleGfx.fillStyle(bodyColor, 1)
    moleGfx.fillCircle(cx, headY, MOLE_R)

    if (moleType === 'bomb') {
      // Bomb fuse
      moleGfx.lineStyle(3, Colors.WARNING.num, 1)
      moleGfx.beginPath()
      moleGfx.moveTo(cx, headY - MOLE_R)
      moleGfx.lineTo(cx + 8, headY - MOLE_R - 14)
      moleGfx.strokePath()
      moleGfx.fillStyle(Colors.WARNING.num, 1)
      moleGfx.fillCircle(cx + 8, headY - MOLE_R - 16, 4)
      // X eyes
      moleGfx.lineStyle(2, 0xffffff, 1)
      const ex = [-10, 10]
      for (const ox of ex) {
        moleGfx.beginPath()
        moleGfx.moveTo(cx + ox - 5, headY - 8); moleGfx.lineTo(cx + ox + 5, headY + 2)
        moleGfx.moveTo(cx + ox + 5, headY - 8); moleGfx.lineTo(cx + ox - 5, headY + 2)
        moleGfx.strokePath()
      }
    } else {
      // Face
      moleGfx.fillStyle(faceColor, 1)
      moleGfx.fillEllipse(cx, headY + 4, MOLE_R * 1.1, MOLE_R * 0.75)
      // Eyes
      moleGfx.fillStyle(0x1a1208, 1)
      moleGfx.fillCircle(cx - 11, headY - 10, 5)
      moleGfx.fillCircle(cx + 11, headY - 10, 5)
      moleGfx.fillStyle(0xffffff, 1)
      moleGfx.fillCircle(cx - 9, headY - 12, 2)
      moleGfx.fillCircle(cx + 13, headY - 12, 2)
      // Nose
      moleGfx.fillStyle(0x3a1a08, 1)
      moleGfx.fillEllipse(cx, headY - 2, 10, 7)
      // Fast mole star accent
      if (moleType === 'fast') {
        moleGfx.fillStyle(Colors.BRAND_ACCENT.num, 1)
        moleGfx.fillCircle(cx + MOLE_R - 6, headY - MOLE_R + 6, 6)
      }
    }

    // Dirt overlap at hole rim (hide lower portion)
    moleGfx.fillStyle(0x5c3d1e, 1)
    moleGfx.fillEllipse(cx, cy + 2, HOLE_R * 2.2, HOLE_R * 0.75)
    moleGfx.fillStyle(0x1a1208, 1)
    moleGfx.fillEllipse(cx, cy + 4, HOLE_R * 1.8, HOLE_R * 0.55)
  }

  private onWhack(hole: Hole): void {
    if (!hole.occupied || hole.peekY < MOLE_R * 0.5 || !this.alive) return

    hole.visTimer?.remove()
    hole.visTimer = null

    if (hole.moleType === 'bomb') {
      // Whacking bomb = penalty
      this.score  = Math.max(0, this.score + PTS_BOMB)
      this.combo  = 0
      this.spawnPopup(hole.cx, hole.cy - MOLE_R, `${PTS_BOMB}`, Colors.ERROR.hex)
      this.cameras.main.shake(200, 0.012)
    } else {
      const pts = hole.moleType === 'fast' ? PTS_FAST : PTS_NORMAL
      this.combo++
      this.whacks++
      const bonus = this.combo >= 3 ? Math.floor(pts * 0.5) : 0
      this.score += pts + bonus
      const label = bonus > 0 ? `+${pts + bonus} 🔥x${this.combo}` : `+${pts}`
      this.spawnPopup(hole.cx, hole.cy - MOLE_R, label, Colors.BRAND_ACCENT.hex)
    }

    this.scoreTxt.setText(this.scoreLabel())
    this.comboTxt.setText(this.combo >= 3 ? `🔥 COMBO x${this.combo}` : '')
    this.retractMole(hole, true)
  }

  private retractMole(hole: Hole, wasHit: boolean): void {
    if (!hole.occupied) return

    if (!wasHit && hole.moleType !== 'bomb') {
      this.misses++
      this.combo = 0
      this.comboTxt.setText('')
    }

    hole.visTimer?.remove()
    hole.visTimer = null
    hole.occupied = false
    hole.peekDir  = -1

    // After retract animation finishes, clear gfx
    this.time.addEvent({
      delay:    400,
      callback: () => { hole.peekY = 0; hole.moleGfx.clear() },
    })
  }

  private hideAllMoles(): void {
    for (const hole of this.holes) {
      hole.visTimer?.remove()
      hole.occupied = false
      hole.peekY    = 0
      hole.moleGfx.clear()
    }
  }

  // ── Background ────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    // Sky gradient
    const bg = this.add.graphics()
    bg.fillStyle(Colors.BG_PRIMARY.num, 1)
    bg.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT)

    // Grass band
    bg.fillStyle(0x2d5a27, 1)
    bg.fillRect(0, GAME_CONFIG.HEIGHT * 0.55, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT * 0.45)

    // Grass highlight
    bg.fillStyle(0x3d7a35, 1)
    bg.fillRect(0, GAME_CONFIG.HEIGHT * 0.55, GAME_CONFIG.WIDTH, 12)

    // Title strip
    bg.fillStyle(Colors.BG_CARD.num, 0.6)
    bg.fillRect(0, 0, GAME_CONFIG.WIDTH, 56)
  }

  // ── HUD ───────────────────────────────────────────────────────────────────────

  private createHUD(): void {
    this.scoreTxt = this.add.text(
      ARENA_L + Spacing.MD, 28,
      this.scoreLabel(),
      { ...TextStyles.SCORE, fontSize: '22px' },
    ).setOrigin(0, 0.5).setDepth(10)

    this.timerTxt = this.add.text(
      GAME_CONFIG.WIDTH / 2, 28,
      `⏱  ${DURATION_MS / 1000}s`,
      { ...TextStyles.SUBTITLE, fontSize: '18px' },
    ).setOrigin(0.5, 0.5).setDepth(10)

    // Legend
    this.add.text(GAME_CONFIG.WIDTH - Spacing.MD, 28,
      '🐭+10  ⚡+25  💣-15',
      { ...TextStyles.CAPTION, fontSize: '13px' },
    ).setOrigin(1, 0.5).setDepth(10)

    this.comboTxt = this.add.text(
      GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 36,
      '',
      { ...TextStyles.SCORE, fontSize: '20px', color: Colors.WARNING.hex },
    ).setOrigin(0.5).setDepth(10)

    // Progress bar
    const barBg = this.add.graphics().setDepth(10)
    barBg.fillStyle(Colors.BG_CARD.num, 1)
    barBg.fillRect(0, 6, GAME_CONFIG.WIDTH, 6)

    this.progressBar = this.add.graphics().setDepth(11)
    this.drawProgressBar(DURATION_MS / 1000)
  }

  private drawProgressBar(remaining: number): void {
    this.progressBar.clear()
    const ratio = remaining / (DURATION_MS / 1000)
    const color = remaining > 10 ? Colors.BRAND_ACCENT.num : Colors.ERROR.num
    this.progressBar.fillStyle(color, 1)
    this.progressBar.fillRect(0, 6, GAME_CONFIG.WIDTH * ratio, 6)
  }

  // ── Popup ─────────────────────────────────────────────────────────────────────

  private spawnPopup(x: number, y: number, text: string, color: string): void {
    const t = this.add.text(x, y, text, {
      ...TextStyles.CAPTION,
      fontSize: '20px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20)

    this.tweens.add({
      targets:  t,
      y:        y - 50,
      alpha:    0,
      duration: 750,
      ease:     'Power2',
      onComplete: () => t.destroy(),
    })
  }

  // ── Result panel ──────────────────────────────────────────────────────────────

  private showResultPanel(): void {
    const cx = GAME_CONFIG.WIDTH  / 2
    const cy = GAME_CONFIG.HEIGHT / 2

    const panel = this.add.graphics().setDepth(60)
    panel.fillStyle(Colors.BG_CARD.num, 1)
    panel.fillRoundedRect(cx - 190, cy - 150, 380, 300, 14)
    panel.lineStyle(2, Colors.BRAND_ACCENT.num, 1)
    panel.strokeRoundedRect(cx - 190, cy - 150, 380, 300, 14)

    this.add.text(cx, cy - 115, 'TEMPO ESGOTADO!', {
      ...TextStyles.TITLE,
      color: Colors.BRAND_ACCENT.hex,
    }).setOrigin(0.5).setDepth(61)

    this.add.text(cx, cy - 65, `${this.score}`, {
      ...TextStyles.SCORE,
      fontSize: '48px',
    }).setOrigin(0.5).setDepth(61)

    this.add.text(cx, cy - 20, 'pontos', {
      ...TextStyles.CAPTION,
    }).setOrigin(0.5).setDepth(61)

    this.add.text(cx, cy + 20,
      `✅ Acertos: ${this.whacks}   ❌ Perdidos: ${this.misses}`,
      { ...TextStyles.CAPTION, fontSize: '15px' },
    ).setOrigin(0.5).setDepth(61)

    new UIButton(this, cx - 90, cy + 95, 'JOGAR NOVAMENTE', () => {
      this.scene.restart()
    }, 190, 46)

    new UIButton(this, cx + 90, cy + 95, 'MENU', () => {
      this.completeSuccess(this.score)
    }, 130, 46)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private scoreLabel(): string {
    return `SCORE  ${String(this.score).padStart(5, '0')}`
  }
}

// ─── Layout helper (arena bounds) ────────────────────────────────────────────
const ARENA_L = 0
