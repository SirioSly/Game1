import Phaser from 'phaser'
import { BaseMiniGameScene, type IMiniGame } from '@games/IMiniGame'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { GameManagerScene } from '@scenes/GameManagerScene'
import { UIButton } from '@ui/UIButton'

// ─── Grid constants ───────────────────────────────────────────────────────────
const CELL_SIZE   = 26
const COLS        = 20
const ROWS        = 15
const GRID_W      = COLS * CELL_SIZE  // 520
const GRID_H      = ROWS * CELL_SIZE  // 390
const GRID_X      = (GAME_CONFIG.WIDTH  - GRID_W) / 2  // 140
const GRID_Y      = (GAME_CONFIG.HEIGHT - GRID_H) / 2 + 20  // 115 (shifted down to leave room for HUD)

// ─── Speed constants ──────────────────────────────────────────────────────────
const BASE_SPEED_MS  = 180   // ms per step at start
const MIN_SPEED_MS   = 70    // fastest allowed
const SPEED_STEP_MS  = 15    // reduction per 5 foods eaten

// ─── Scoring ─────────────────────────────────────────────────────────────────
const PTS_PER_FOOD    = 10
const PTS_BONUS_ABOVE = 5    // bonus per food when foodEaten > 5

// ─── Config ───────────────────────────────────────────────────────────────────
const SNAKE_CONFIG: IMiniGame = {
  sceneKey:    SCENE_KEYS.SNAKE,
  displayName: 'Snake',
  durationMs:  0,
  difficulty:  2,
  genre:       'arcade',
}

GameManagerScene.registerGame(SNAKE_CONFIG)

// ─── Types ────────────────────────────────────────────────────────────────────
interface Point { x: number; y: number }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

// ─── Scene ───────────────────────────────────────────────────────────────────
export class SnakeScene extends BaseMiniGameScene {
  constructor() { super({ key: SCENE_KEYS.SNAKE }) }

  // Graphics
  private gfx!: Phaser.GameObjects.Graphics

  // Snake state
  private body:      Point[]   = []
  private direction: Direction = 'RIGHT'
  private nextDir:   Direction = 'RIGHT'
  private food:      Point     = { x: 0, y: 0 }
  private stepTimer  = 0
  private speedMs    = BASE_SPEED_MS
  private score      = 0
  private foodEaten  = 0
  private gameOver   = false

  // HUD
  private scoreTxt!:  Phaser.GameObjects.Text
  private speedTxt!:  Phaser.GameObjects.Text
  private hintTxt!:   Phaser.GameObjects.Text

  // Game-over overlay objects (kept for cleanup on restart)
  private overlayObjs: Phaser.GameObjects.GameObject[] = []

  protected get miniGameConfig(): IMiniGame {
    return SNAKE_CONFIG
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  protected onStart(): void {
    this.gameOver  = false
    this.score     = 0
    this.foodEaten = 0
    this.speedMs   = BASE_SPEED_MS
    this.stepTimer = 0
    this.direction = 'RIGHT'
    this.nextDir   = 'RIGHT'
    this.overlayObjs = []

    // Background
    const bg = this.add.graphics()
    bg.fillStyle(Colors.BG_PRIMARY.num, 1)
    bg.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT)

    // Grid background
    bg.fillStyle(Colors.BG_SECONDARY.num, 1)
    bg.fillRect(GRID_X - 2, GRID_Y - 2, GRID_W + 4, GRID_H + 4)

    // Grid border
    bg.lineStyle(2, Colors.BRAND_PRIMARY.num, 0.5)
    bg.strokeRect(GRID_X - 2, GRID_Y - 2, GRID_W + 4, GRID_H + 4)

    // Main graphics layer (redrawn every step)
    this.gfx = this.add.graphics()

    // Snake — start at center with 3 segments moving right
    const startCol = Math.floor(COLS / 2) - 1
    const startRow = Math.floor(ROWS / 2)
    this.body = [
      { x: startCol + 2, y: startRow },
      { x: startCol + 1, y: startRow },
      { x: startCol,     y: startRow },
    ]

    this.spawnFood()

    // HUD
    this.scoreTxt = this.add.text(
      GRID_X,
      GRID_Y - 40,
      this.scoreLabel(),
      { ...TextStyles.SCORE, fontSize: '22px' },
    ).setOrigin(0, 0.5)

    this.speedTxt = this.add.text(
      GRID_X + GRID_W,
      GRID_Y - 40,
      this.speedLabel(),
      { ...TextStyles.CAPTION, fontSize: '16px' },
    ).setOrigin(1, 0.5)

    this.hintTxt = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GRID_Y + GRID_H + 22,
      'WASD / Setas  •  Swipe no celular',
      { ...TextStyles.CAPTION, fontSize: '14px' },
    ).setOrigin(0.5, 0.5)

    // Controls — keyboard
    const keys = this.input.keyboard!

    keys.on('keydown-W',    () => this.trySetDir('UP'))
    keys.on('keydown-S',    () => this.trySetDir('DOWN'))
    keys.on('keydown-A',    () => this.trySetDir('LEFT'))
    keys.on('keydown-D',    () => this.trySetDir('RIGHT'))
    keys.on('keydown-UP',   () => this.trySetDir('UP'))
    keys.on('keydown-DOWN', () => this.trySetDir('DOWN'))
    keys.on('keydown-LEFT', () => this.trySetDir('LEFT'))
    keys.on('keydown-RIGHT',() => this.trySetDir('RIGHT'))

    // Controls — swipe (mobile)
    let swipeStartX = 0
    let swipeStartY = 0
    const MIN_SWIPE = 30

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      swipeStartX = p.x
      swipeStartY = p.y
    })
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const dx = p.x - swipeStartX
      const dy = p.y - swipeStartY
      if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return
      if (Math.abs(dx) > Math.abs(dy)) {
        this.trySetDir(dx > 0 ? 'RIGHT' : 'LEFT')
      } else {
        this.trySetDir(dy > 0 ? 'DOWN' : 'UP')
      }
    })

    this.drawFrame()
  }

  protected onUpdate(_time: number, delta: number): void {
    if (this.gameOver) return

    this.stepTimer += delta
    if (this.stepTimer >= this.speedMs) {
      this.stepTimer -= this.speedMs
      this.step()
    }
  }

  // ── Snake logic ──────────────────────────────────────────────────────────────

  private trySetDir(dir: Direction): void {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
    }
    if (dir !== opposites[this.direction]) {
      this.nextDir = dir
    }
  }

  private step(): void {
    this.direction = this.nextDir

    const head = this.body[0]
    const delta: Record<Direction, Point> = {
      UP:    { x: 0,  y: -1 },
      DOWN:  { x: 0,  y:  1 },
      LEFT:  { x: -1, y:  0 },
      RIGHT: { x:  1, y:  0 },
    }
    const d = delta[this.direction]
    const newHead: Point = { x: head.x + d.x, y: head.y + d.y }

    // Wall collision
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      this.triggerGameOver()
      return
    }

    // Self collision (ignore tail tip since it will move away)
    for (let i = 0; i < this.body.length - 1; i++) {
      if (this.body[i].x === newHead.x && this.body[i].y === newHead.y) {
        this.triggerGameOver()
        return
      }
    }

    // Ate food?
    const ate = newHead.x === this.food.x && newHead.y === this.food.y

    this.body.unshift(newHead)
    if (!ate) {
      this.body.pop()
    } else {
      this.foodEaten++
      const bonus = this.foodEaten > 5 ? PTS_BONUS_ABOVE : 0
      this.score += PTS_PER_FOOD + bonus

      // Speed up every 5 foods
      if (this.foodEaten % 5 === 0) {
        this.speedMs = Math.max(MIN_SPEED_MS, this.speedMs - SPEED_STEP_MS)
      }

      this.scoreTxt.setText(this.scoreLabel())
      this.speedTxt.setText(this.speedLabel())
      this.spawnFood()
    }

    this.drawFrame()
  }

  private spawnFood(): void {
    let pos: Point
    do {
      pos = {
        x: Phaser.Math.Between(0, COLS - 1),
        y: Phaser.Math.Between(0, ROWS - 1),
      }
    } while (this.body.some(s => s.x === pos.x && s.y === pos.y))
    this.food = pos
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  private drawFrame(): void {
    this.gfx.clear()

    // Draw grid dots (subtle)
    this.gfx.fillStyle(Colors.BG_CARD.num, 1)
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const px = GRID_X + col * CELL_SIZE
        const py = GRID_Y + row * CELL_SIZE
        this.gfx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2)
      }
    }

    // Draw food
    const fx = GRID_X + this.food.x * CELL_SIZE
    const fy = GRID_Y + this.food.y * CELL_SIZE
    this.gfx.fillStyle(Colors.BRAND_SECONDARY.num, 1)
    this.gfx.fillRoundedRect(fx + 3, fy + 3, CELL_SIZE - 6, CELL_SIZE - 6, 4)

    // Draw snake body
    this.body.forEach((seg, i) => {
      const sx = GRID_X + seg.x * CELL_SIZE
      const sy = GRID_Y + seg.y * CELL_SIZE

      if (i === 0) {
        // Head — brighter
        this.gfx.fillStyle(Colors.BRAND_ACCENT.num, 1)
        this.gfx.fillRoundedRect(sx + 1, sy + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5)
        // Eye indicator based on direction
        this.gfx.fillStyle(Colors.BG_PRIMARY.num, 1)
        const eyeOffsets: Record<Direction, [number, number][]> = {
          RIGHT: [[CELL_SIZE - 7, 5], [CELL_SIZE - 7, CELL_SIZE - 9]],
          LEFT:  [[3, 5],             [3, CELL_SIZE - 9]],
          UP:    [[5, 3],             [CELL_SIZE - 9, 3]],
          DOWN:  [[5, CELL_SIZE - 7], [CELL_SIZE - 9, CELL_SIZE - 7]],
        }
        for (const [ex, ey] of eyeOffsets[this.direction]) {
          this.gfx.fillRect(sx + ex, sy + ey, 3, 3)
        }
      } else {
        // Body — slightly darker shade
        const alpha = Math.max(0.5, 1 - i * 0.015)
        this.gfx.fillStyle(Colors.BRAND_PRIMARY.num, alpha)
        this.gfx.fillRoundedRect(sx + 2, sy + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4)
      }
    })
  }

  // ── Game Over ────────────────────────────────────────────────────────────────

  private triggerGameOver(): void {
    this.gameOver = true

    // Dim the grid
    const overlay = this.add.graphics()
    overlay.fillStyle(Colors.BG_PRIMARY.num, 0.75)
    overlay.fillRect(GRID_X - 2, GRID_Y - 2, GRID_W + 4, GRID_H + 4)
    this.overlayObjs.push(overlay)

    // Panel background
    const panelW = 360
    const panelH = 260
    const panelX = GAME_CONFIG.WIDTH  / 2
    const panelY = GAME_CONFIG.HEIGHT / 2

    const panel = this.add.graphics()
    panel.fillStyle(Colors.BG_CARD.num, 1)
    panel.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 12)
    panel.lineStyle(2, Colors.BRAND_PRIMARY.num, 1)
    panel.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 12)
    this.overlayObjs.push(panel)

    // "Game Over" title
    const titleTxt = this.add.text(
      panelX,
      panelY - 90,
      'GAME OVER',
      { ...TextStyles.TITLE, color: Colors.ERROR.hex },
    ).setOrigin(0.5)
    this.overlayObjs.push(titleTxt)

    // Score display
    const scoreLbl = this.add.text(
      panelX,
      panelY - 42,
      `Pontuação: ${this.score}`,
      { ...TextStyles.SCORE, fontSize: '28px' },
    ).setOrigin(0.5)
    this.overlayObjs.push(scoreLbl)

    // Foods eaten
    const foodLbl = this.add.text(
      panelX,
      panelY,
      `Comidas: ${this.foodEaten}  |  Tamanho: ${this.body.length}`,
      { ...TextStyles.CAPTION, fontSize: '16px' },
    ).setOrigin(0.5)
    this.overlayObjs.push(foodLbl)

    // Buttons
    const btnRestart = new UIButton(
      this,
      panelX - 90,
      panelY + 80,
      'JOGAR NOVAMENTE',
      () => {
        this.input.keyboard!.removeAllListeners()
        this.scene.restart()
      },
      190,
      46,
    )
    this.overlayObjs.push(btnRestart)

    const btnMenu = new UIButton(
      this,
      panelX + 90,
      panelY + 80,
      'MENU',
      () => {
        this.input.keyboard!.removeAllListeners()
        this.completeFail()
      },
      130,
      46,
    )
    this.overlayObjs.push(btnMenu)
  }

  // ── HUD helpers ──────────────────────────────────────────────────────────────

  private scoreLabel(): string {
    return `SCORE  ${String(this.score).padStart(5, '0')}`
  }

  private speedLabel(): string {
    const level = Math.round((BASE_SPEED_MS - this.speedMs) / SPEED_STEP_MS) + 1
    return `VEL  ${level}`
  }
}
