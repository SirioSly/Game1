import Phaser from 'phaser'
import { BaseMiniGameScene, type IMiniGame } from '@games/IMiniGame'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'
import { Spacing } from '@design/spacing'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { GameManagerScene } from '@scenes/GameManagerScene'
import { UIButton } from '@ui/UIButton'

// ─── Layout constants ─────────────────────────────────────────────────────────
const SHIP_Y       = GAME_CONFIG.HEIGHT - 70
const SHIP_W       = 36
const SHIP_H       = 28
const SHIP_SPEED   = 340  // px/s
const ARENA_LEFT   = 40
const ARENA_RIGHT  = GAME_CONFIG.WIDTH - 40

// ─── Meteor constants ─────────────────────────────────────────────────────────
const METEOR_BASE_SPEED   = 180   // px/s at start
const METEOR_MAX_SPEED    = 520
const METEOR_SPEED_RAMP   = 40    // extra px/s per 5 s of survival
const SPAWN_INTERVAL_BASE = 1100  // ms between spawns at start
const SPAWN_INTERVAL_MIN  = 320   // fastest spawn rate
const SPAWN_RAMP_STEP     = 60    // ms reduction per 5 s

const METEOR_RADIUS_MIN   = 8
const METEOR_RADIUS_MAX   = 20

// ─── Star (collectible) constants ─────────────────────────────────────────────
const STAR_SPAWN_CHANCE = 0.25   // probability each meteor spawn also spawns a star
const STAR_SPEED        = 120
const STAR_RADIUS       = 7
const STAR_POINTS       = 50

// ─── Scoring ──────────────────────────────────────────────────────────────────
const PTS_PER_SECOND    = 10
const GOAL_SECONDS      = 30

// ─── Config ───────────────────────────────────────────────────────────────────
const METEOR_DODGE_CONFIG: IMiniGame = {
  sceneKey:    SCENE_KEYS.METEOR_DODGE,
  displayName: 'Meteor Dodge',
  durationMs:  GOAL_SECONDS * 1000,
  difficulty:  3,
  genre:       'arcade',
}

GameManagerScene.registerGame(METEOR_DODGE_CONFIG)

// ─── Types ────────────────────────────────────────────────────────────────────
interface FallingObject {
  gfx:    Phaser.GameObjects.Graphics
  x:      number
  y:      number
  radius: number
  speed:  number
  color:  number
}

// ─── Scene ────────────────────────────────────────────────────────────────────
export class MeteorDodgeScene extends BaseMiniGameScene {
  constructor() { super({ key: SCENE_KEYS.METEOR_DODGE }) }

  protected get miniGameConfig(): IMiniGame { return METEOR_DODGE_CONFIG }

  // Ship
  private shipX        = GAME_CONFIG.WIDTH / 2
  private shipGfx!:    Phaser.GameObjects.Graphics
  private thrustGfx!:  Phaser.GameObjects.Graphics

  // Falling objects
  private meteors: FallingObject[] = []
  private stars:   FallingObject[] = []

  // Timers & state
  private spawnTimer    = 0
  private spawnInterval = SPAWN_INTERVAL_BASE
  private score         = 0
  private survivalSecs  = 0
  private alive         = true
  private thrustFrame   = 0

  // HUD
  private scoreTxt!:    Phaser.GameObjects.Text
  private timerTxt!:    Phaser.GameObjects.Text
  private progressBar!: Phaser.GameObjects.Graphics

  // Input
  private cursors!:     Phaser.Types.Input.Keyboard.CursorKeys
  private keyA!:        Phaser.Input.Keyboard.Key
  private keyD!:        Phaser.Input.Keyboard.Key

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  protected onStart(): void {
    this.shipX        = GAME_CONFIG.WIDTH / 2
    this.meteors      = []
    this.stars        = []
    this.spawnTimer   = 0
    this.spawnInterval = SPAWN_INTERVAL_BASE
    this.score        = 0
    this.survivalSecs = 0
    this.alive        = true
    this.thrustFrame  = 0

    this.drawBackground()
    this.createHUD()
    this.createShip()

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keyA    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    // Mobile: drag / touch to steer
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.shipX = Phaser.Math.Clamp(p.x, ARENA_LEFT + SHIP_W / 2, ARENA_RIGHT - SHIP_W / 2)
    })
  }

  protected onUpdate(_time: number, delta: number): void {
    if (!this.alive) return

    const dt = delta / 1000

    // ── Move ship ──────────────────────────────────────────────────────────────
    const movingLeft  = this.cursors.left.isDown  || this.keyA.isDown
    const movingRight = this.cursors.right.isDown || this.keyD.isDown

    if (movingLeft)  this.shipX -= SHIP_SPEED * dt
    if (movingRight) this.shipX += SHIP_SPEED * dt
    this.shipX = Phaser.Math.Clamp(this.shipX, ARENA_LEFT + SHIP_W / 2, ARENA_RIGHT - SHIP_W / 2)

    // ── Advance survival timer ─────────────────────────────────────────────────
    const prevSecs = Math.floor(this.survivalSecs)
    this.survivalSecs += dt
    const curSecs  = Math.floor(this.survivalSecs)

    if (curSecs > prevSecs) {
      this.score += PTS_PER_SECOND
      this.scoreTxt.setText(this.scoreLabel())

      // Ramp difficulty every 5 s
      if (curSecs % 5 === 0) {
        const stage = curSecs / 5
        this.spawnInterval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_BASE - stage * SPAWN_RAMP_STEP)
      }
    }

    const remaining = Math.max(0, GOAL_SECONDS - this.survivalSecs)
    this.timerTxt.setText(this.timerLabel(remaining))
    this.drawProgressBar(remaining)

    // ── Spawn falling objects ──────────────────────────────────────────────────
    this.spawnTimer += delta
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval
      this.spawnMeteor()
      if (Math.random() < STAR_SPAWN_CHANCE) this.spawnStar()
    }

    // ── Move & check meteors ───────────────────────────────────────────────────
    const meteorSpeed = Math.min(METEOR_MAX_SPEED, METEOR_BASE_SPEED + (this.survivalSecs / 5) * METEOR_SPEED_RAMP)

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i]
      m.y += m.speed * dt
      this.drawFallingObject(m, false)

      // Off screen
      if (m.y - m.radius > GAME_CONFIG.HEIGHT) {
        m.gfx.destroy()
        this.meteors.splice(i, 1)
        continue
      }

      // Collision with ship (circular vs rectangle approx)
      if (this.checkShipCollision(m)) {
        this.triggerDeath()
        return
      }

      // Update speed (gets faster over time)
      m.speed = meteorSpeed
    }

    // ── Move & check stars ────────────────────────────────────────────────────
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i]
      s.y += STAR_SPEED * dt
      this.drawFallingObject(s, true)

      if (s.y - s.radius > GAME_CONFIG.HEIGHT) {
        s.gfx.destroy()
        this.stars.splice(i, 1)
        continue
      }

      if (this.checkShipCollision(s)) {
        this.score += STAR_POINTS
        this.scoreTxt.setText(this.scoreLabel())
        s.gfx.destroy()
        this.stars.splice(i, 1)
        this.spawnScorePopup(s.x, s.y, `+${STAR_POINTS}`)
      }
    }

    // ── Redraw ship ────────────────────────────────────────────────────────────
    this.thrustFrame++
    this.drawShip(movingLeft, movingRight)
  }

  protected override onTimeUp(): void {
    this.alive = false
    this.completeSuccess(this.score)
  }

  // ── Spawn helpers ─────────────────────────────────────────────────────────────

  private spawnMeteor(): void {
    const radius = Phaser.Math.Between(METEOR_RADIUS_MIN, METEOR_RADIUS_MAX)
    const x      = Phaser.Math.Between(ARENA_LEFT + radius, ARENA_RIGHT - radius)
    const speed  = Math.min(METEOR_MAX_SPEED, METEOR_BASE_SPEED + (this.survivalSecs / 5) * METEOR_SPEED_RAMP)

    // Pick a brown/grey palette for meteors
    const palette = [0x8b5e3c, 0xa0785a, 0x6e4e2a, 0x7a7a8a, 0x5a5a6a]
    const color   = palette[Phaser.Math.Between(0, palette.length - 1)]

    const gfx = this.add.graphics()
    const m: FallingObject = { gfx, x, y: -radius, radius, speed, color }
    this.drawFallingObject(m, false)
    this.meteors.push(m)
  }

  private spawnStar(): void {
    const x   = Phaser.Math.Between(ARENA_LEFT + STAR_RADIUS, ARENA_RIGHT - STAR_RADIUS)
    const gfx = this.add.graphics()
    const s: FallingObject = {
      gfx, x, y: -STAR_RADIUS,
      radius: STAR_RADIUS,
      speed:  STAR_SPEED,
      color:  Colors.WARNING.num,
    }
    this.drawFallingObject(s, true)
    this.stars.push(s)
  }

  // ── Drawing helpers ───────────────────────────────────────────────────────────

  private drawBackground(): void {
    const bg = this.add.graphics()
    bg.fillStyle(Colors.BG_PRIMARY.num, 1)
    bg.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT)

    // Subtle grid lines (space feel)
    bg.lineStyle(1, Colors.BG_CARD.num, 0.5)
    for (let x = ARENA_LEFT; x <= ARENA_RIGHT; x += 40) {
      bg.beginPath()
      bg.moveTo(x, 0)
      bg.lineTo(x, GAME_CONFIG.HEIGHT)
      bg.strokePath()
    }
    for (let y = 0; y <= GAME_CONFIG.HEIGHT; y += 40) {
      bg.beginPath()
      bg.moveTo(ARENA_LEFT, y)
      bg.lineTo(ARENA_RIGHT, y)
      bg.strokePath()
    }

    // Arena walls
    bg.fillStyle(Colors.BG_CARD.num, 1)
    bg.fillRect(0, 0, ARENA_LEFT, GAME_CONFIG.HEIGHT)
    bg.fillRect(ARENA_RIGHT, 0, GAME_CONFIG.WIDTH - ARENA_RIGHT, GAME_CONFIG.HEIGHT)
    bg.lineStyle(2, Colors.BRAND_PRIMARY.num, 0.4)
    bg.beginPath()
    bg.moveTo(ARENA_LEFT, 0)
    bg.lineTo(ARENA_LEFT, GAME_CONFIG.HEIGHT)
    bg.strokePath()
    bg.beginPath()
    bg.moveTo(ARENA_RIGHT, 0)
    bg.lineTo(ARENA_RIGHT, GAME_CONFIG.HEIGHT)
    bg.strokePath()
  }

  private createShip(): void {
    this.thrustGfx = this.add.graphics()
    this.shipGfx   = this.add.graphics()
    this.drawShip(false, false)
  }

  private drawShip(tiltLeft: boolean, tiltRight: boolean): void {
    const x = this.shipX
    const y = SHIP_Y

    // Thrust flame (flickers)
    this.thrustGfx.clear()
    const flicker = this.thrustFrame % 4 < 2
    const flameH  = flicker ? 18 : 12
    this.thrustGfx.fillStyle(Colors.WARNING.num, 0.9)
    this.thrustGfx.fillTriangle(
      x - 8, y + SHIP_H / 2,
      x + 8, y + SHIP_H / 2,
      x, y + SHIP_H / 2 + flameH,
    )
    this.thrustGfx.fillStyle(Colors.BRAND_SECONDARY.num, 0.6)
    this.thrustGfx.fillTriangle(
      x - 4, y + SHIP_H / 2,
      x + 4, y + SHIP_H / 2,
      x, y + SHIP_H / 2 + flameH * 0.6,
    )

    // Side thrusters when turning
    if (tiltLeft) {
      this.thrustGfx.fillStyle(Colors.INFO.num, 0.7)
      this.thrustGfx.fillTriangle(
        x + SHIP_W / 2 - 4, y,
        x + SHIP_W / 2 + 2, y - 4,
        x + SHIP_W / 2 + 8, y + 6,
      )
    }
    if (tiltRight) {
      this.thrustGfx.fillStyle(Colors.INFO.num, 0.7)
      this.thrustGfx.fillTriangle(
        x - SHIP_W / 2 + 4, y,
        x - SHIP_W / 2 - 2, y - 4,
        x - SHIP_W / 2 - 8, y + 6,
      )
    }

    // Ship hull
    this.shipGfx.clear()
    // Body
    this.shipGfx.fillStyle(Colors.BRAND_PRIMARY.num, 1)
    this.shipGfx.fillTriangle(
      x, y - SHIP_H / 2,
      x - SHIP_W / 2, y + SHIP_H / 2,
      x + SHIP_W / 2, y + SHIP_H / 2,
    )
    // Cockpit
    this.shipGfx.fillStyle(Colors.BRAND_ACCENT.num, 0.9)
    this.shipGfx.fillCircle(x, y - 2, 6)
    // Wing accents
    this.shipGfx.fillStyle(Colors.BRAND_SECONDARY.num, 1)
    this.shipGfx.fillTriangle(
      x - SHIP_W / 2, y + SHIP_H / 2,
      x - SHIP_W / 2 + 10, y + SHIP_H / 2,
      x - SHIP_W / 2 + 4, y + SHIP_H / 2 - 10,
    )
    this.shipGfx.fillTriangle(
      x + SHIP_W / 2, y + SHIP_H / 2,
      x + SHIP_W / 2 - 10, y + SHIP_H / 2,
      x + SHIP_W / 2 - 4, y + SHIP_H / 2 - 10,
    )
  }

  private drawFallingObject(obj: FallingObject, isStar: boolean): void {
    obj.gfx.clear()
    obj.gfx.setPosition(0, 0)

    if (isStar) {
      // Draw a 5-pointed star shape
      this.drawStarShape(obj.gfx, obj.x, obj.y, obj.radius, obj.radius * 0.4, Colors.WARNING.num)
    } else {
      // Meteor: irregular polygon approximation (rotated ellipses with offset)
      obj.gfx.fillStyle(obj.color, 1)
      obj.gfx.fillCircle(obj.x, obj.y, obj.radius)
      // Crater
      obj.gfx.fillStyle(Colors.BG_PRIMARY.num, 0.25)
      obj.gfx.fillCircle(obj.x - obj.radius * 0.25, obj.y - obj.radius * 0.2, obj.radius * 0.35)
      // Highlight
      obj.gfx.fillStyle(0xffffff, 0.12)
      obj.gfx.fillCircle(obj.x + obj.radius * 0.2, obj.y - obj.radius * 0.3, obj.radius * 0.25)
    }
  }

  private drawStarShape(
    gfx: Phaser.GameObjects.Graphics,
    cx: number, cy: number,
    outerR: number, innerR: number,
    color: number,
  ): void {
    const points: number[] = []
    const spikes = 5
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes - Math.PI / 2
      const r     = i % 2 === 0 ? outerR : innerR
      points.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
    }
    gfx.fillStyle(color, 1)
    gfx.fillPoints(
      points.reduce<Phaser.Geom.Point[]>((acc, _, i, arr) => {
        if (i % 2 === 0) acc.push(new Phaser.Geom.Point(arr[i], arr[i + 1]))
        return acc
      }, []),
      true,
    )
    gfx.fillStyle(0xffffff, 0.5)
    gfx.fillCircle(cx, cy, innerR * 0.6)
  }

  private createHUD(): void {
    const hudY = Spacing.LG

    // Score
    this.scoreTxt = this.add.text(
      ARENA_LEFT + Spacing.MD,
      hudY,
      this.scoreLabel(),
      { ...TextStyles.SCORE, fontSize: '22px' },
    ).setOrigin(0, 0.5).setDepth(10)

    // Timer
    this.timerTxt = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      hudY,
      this.timerLabel(GOAL_SECONDS),
      { ...TextStyles.SUBTITLE, fontSize: '18px' },
    ).setOrigin(0.5, 0.5).setDepth(10)

    // Controls hint
    this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT - Spacing.MD,
      '← → / A D / Arraste para mover',
      { ...TextStyles.CAPTION, fontSize: '13px' },
    ).setOrigin(0.5, 1).setDepth(10)

    // Progress bar background
    const barBg = this.add.graphics()
    barBg.fillStyle(Colors.BG_CARD.num, 1)
    barBg.fillRect(ARENA_LEFT, 6, ARENA_RIGHT - ARENA_LEFT, 6)
    barBg.setDepth(10)

    this.progressBar = this.add.graphics()
    this.progressBar.setDepth(11)
    this.drawProgressBar(GOAL_SECONDS)

    // Star hint
    this.add.text(
      ARENA_RIGHT - Spacing.MD,
      hudY,
      '★ +50',
      { ...TextStyles.CAPTION, fontSize: '14px', color: Colors.WARNING.hex },
    ).setOrigin(1, 0.5).setDepth(10)
  }

  private drawProgressBar(remaining: number): void {
    this.progressBar.clear()
    const ratio = remaining / GOAL_SECONDS
    const barW  = (ARENA_RIGHT - ARENA_LEFT) * ratio
    // Color shifts red as time runs out
    const color = remaining > 10 ? Colors.BRAND_ACCENT.num : Colors.ERROR.num
    this.progressBar.fillStyle(color, 1)
    this.progressBar.fillRect(ARENA_LEFT, 6, barW, 6)
  }

  // ── Collision ─────────────────────────────────────────────────────────────────

  private checkShipCollision(obj: FallingObject): boolean {
    const dx = obj.x - this.shipX
    const dy = obj.y - SHIP_Y
    // Shrink hitbox slightly for better feel
    const hitRadius = obj.radius * 0.72
    return (dx * dx + dy * dy) < (hitRadius + SHIP_W * 0.3) * (hitRadius + SHIP_W * 0.3)
  }

  // ── Score popup ───────────────────────────────────────────────────────────────

  private spawnScorePopup(x: number, y: number, text: string): void {
    const t = this.add.text(x, y, text, {
      ...TextStyles.CAPTION,
      fontSize:   '18px',
      color:      Colors.WARNING.hex,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(20)

    this.tweens.add({
      targets:  t,
      y:        y - 40,
      alpha:    0,
      duration: 700,
      ease:     'Power2',
      onComplete: () => t.destroy(),
    })
  }

  // ── Death sequence ────────────────────────────────────────────────────────────

  private triggerDeath(): void {
    this.alive = false

    // Explosion flash
    const flash = this.add.graphics().setDepth(50)
    flash.fillStyle(Colors.BRAND_SECONDARY.num, 1)
    flash.fillCircle(this.shipX, SHIP_Y, 60)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 400,
      ease: 'Power2',
      onComplete: () => { flash.destroy(); this.showDeathPanel() },
    })

    // Hide ship
    this.shipGfx.setVisible(false)
    this.thrustGfx.setVisible(false)
  }

  private showDeathPanel(): void {
    const cx = GAME_CONFIG.WIDTH  / 2
    const cy = GAME_CONFIG.HEIGHT / 2

    const panelW = 360
    const panelH = 270

    const panel = this.add.graphics().setDepth(60)
    panel.fillStyle(Colors.BG_CARD.num, 1)
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12)
    panel.lineStyle(2, Colors.ERROR.num, 1)
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12)

    this.add.text(cx, cy - 95, 'DESTRUÍDO!', {
      ...TextStyles.TITLE,
      color: Colors.ERROR.hex,
    }).setOrigin(0.5).setDepth(61)

    this.add.text(cx, cy - 48, `Pontuação: ${this.score}`, {
      ...TextStyles.SCORE,
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(61)

    const survived = Math.floor(this.survivalSecs)
    this.add.text(cx, cy, `Sobreviveu: ${survived}s de ${GOAL_SECONDS}s`, {
      ...TextStyles.CAPTION,
      fontSize: '16px',
    }).setOrigin(0.5).setDepth(61)

    new UIButton(this, cx - 90, cy + 85, 'TENTAR NOVAMENTE', () => {
      this.input.removeAllListeners()
      this.scene.restart()
    }, 190, 46)

    new UIButton(this, cx + 90, cy + 85, 'MENU', () => {
      this.input.removeAllListeners()
      this.completeFail()
    }, 130, 46)
  }

  // ── HUD label helpers ─────────────────────────────────────────────────────────

  private scoreLabel(): string {
    return `SCORE  ${String(this.score).padStart(5, '0')}`
  }

  private timerLabel(remaining: number): string {
    const s = Math.ceil(remaining)
    return `⏱  ${s}s`
  }
}
