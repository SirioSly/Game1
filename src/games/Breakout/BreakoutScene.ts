import Phaser from 'phaser'
import { BaseMiniGameScene, type IMiniGame } from '@games/IMiniGame'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { GameManagerScene } from '@scenes/GameManagerScene'
import { UIButton } from '@ui/UIButton'

// ─── Config ───────────────────────────────────────────────────────────────────

const BREAKOUT_CONFIG: IMiniGame = {
  sceneKey:    SCENE_KEYS.BREAKOUT,
  displayName: 'Breakout',
  durationMs:  0,
  difficulty:  3,
  genre:       'arcade',
}

GameManagerScene.registerGame(BREAKOUT_CONFIG)

// ─── Layout constants ─────────────────────────────────────────────────────────

const PADDLE_W     = 100
const PADDLE_H     = 14
const PADDLE_Y     = GAME_CONFIG.HEIGHT - 50
const PADDLE_SPEED = 480   // px/s via keyboard

const BALL_RADIUS  = 8
const BALL_SPEED   = 340   // px/s

const BRICK_COLS   = 10
const BRICK_ROWS   = 5
const BRICK_W      = 70
const BRICK_H      = 20
const BRICK_GAP    = 2
const BRICK_AREA_W = BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP
const BRICK_AREA_X = (GAME_CONFIG.WIDTH - BRICK_AREA_W) / 2
const BRICK_AREA_Y = 60

const MAX_LIVES = 3

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number }

interface Brick {
  col:     number
  row:     number
  alive:   boolean
  points:  number
  colorNum: number
}

// Points and color per row (row 0 = topmost)
function brickConfig(row: number): { points: number; colorNum: number } {
  if (row === 0)          return { points: 2, colorNum: Colors.ERROR.num }
  if (row <= 2)           return { points: 1, colorNum: Colors.WARNING.num }
  return                         { points: 1, colorNum: Colors.BRAND_PRIMARY.num }
}

// ─── Scene ───────────────────────────────────────────────────────────────────

export class BreakoutScene extends BaseMiniGameScene {
  // Graphics
  private gfx!: Phaser.GameObjects.Graphics

  // Paddle
  private paddleX     = GAME_CONFIG.WIDTH / 2
  private cursors!:    Phaser.Types.Input.Keyboard.CursorKeys
  private keyA!:       Phaser.Input.Keyboard.Key
  private keyD!:       Phaser.Input.Keyboard.Key

  // Ball
  private ballPos:     Vec2    = { x: 0, y: 0 }
  private ballVel:     Vec2    = { x: 0, y: 0 }
  private ballActive  = false

  // Bricks
  private bricks:      Brick[] = []
  private bricksAlive = 0

  // Lives & Score
  private lives  = MAX_LIVES
  private score  = 0
  private gameOver = false

  // HUD
  private scoreTxt!:  Phaser.GameObjects.Text
  private livesTxt!:  Phaser.GameObjects.Text
  private hintTxt!:   Phaser.GameObjects.Text

  // Overlay cleanup
  private overlayObjs: Phaser.GameObjects.GameObject[] = []

  // ── Config ────────────────────────────────────────────────────────────────

  protected get miniGameConfig(): IMiniGame {
    return BREAKOUT_CONFIG
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  protected onStart(): void {
    this.gameOver    = false
    this.score       = 0
    this.lives       = MAX_LIVES
    this.ballActive  = false
    this.overlayObjs = []

    this.paddleX = GAME_CONFIG.WIDTH / 2
    this.resetBallToPaddle()

    // ── Background ──────────────────────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillStyle(Colors.BG_PRIMARY.num, 1)
    bg.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT)

    // Subtle field border
    bg.lineStyle(1, Colors.BORDER.num, 0.6)
    bg.strokeRect(1, 1, GAME_CONFIG.WIDTH - 2, GAME_CONFIG.HEIGHT - 2)

    // ── Brick grid ──────────────────────────────────────────────────────────
    this.bricks = []
    this.bricksAlive = 0

    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const cfg = brickConfig(row)
        this.bricks.push({
          col,
          row,
          alive: true,
          points:   cfg.points,
          colorNum: cfg.colorNum,
        })
        this.bricksAlive++
      }
    }

    // ── Main GFX layer ──────────────────────────────────────────────────────
    this.gfx = this.add.graphics()

    // ── HUD ─────────────────────────────────────────────────────────────────
    this.scoreTxt = this.add.text(
      16,
      10,
      this.scoreLabel(),
      { ...TextStyles.SCORE, fontSize: '22px' },
    ).setOrigin(0, 0)

    this.livesTxt = this.add.text(
      GAME_CONFIG.WIDTH - 16,
      10,
      this.livesLabel(),
      { ...TextStyles.CAPTION, fontSize: '18px' },
    ).setOrigin(1, 0)

    this.hintTxt = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      PADDLE_Y - 30,
      'Clique ou ESPAÇO para lançar',
      { ...TextStyles.CAPTION, fontSize: '14px', color: Colors.TEXT_SECONDARY.hex },
    ).setOrigin(0.5, 0.5)

    // ── Input ───────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keyA    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    this.input.keyboard!.on('keydown-SPACE', () => this.launchBall())
    this.input.on('pointerdown', () => this.launchBall())

    this.drawFrame()
  }

  protected onUpdate(_time: number, delta: number): void {
    if (this.gameOver) return

    const dt = delta / 1000   // seconds

    // ── Paddle movement ──────────────────────────────────────────────────────
    const movingLeft  = this.cursors.left.isDown  || this.keyA.isDown
    const movingRight = this.cursors.right.isDown || this.keyD.isDown

    if (movingLeft) {
      this.paddleX -= PADDLE_SPEED * dt
    } else if (movingRight) {
      this.paddleX += PADDLE_SPEED * dt
    }

    // Mouse follow
    const pointer = this.input.activePointer
    if (pointer.isDown || (!movingLeft && !movingRight)) {
      // Follow mouse position smoothly when neither keyboard key is pressed
      if (!movingLeft && !movingRight && pointer.x > 0) {
        this.paddleX = pointer.x
      }
    }

    // Clamp paddle within walls
    const halfPaddle = PADDLE_W / 2
    this.paddleX = Phaser.Math.Clamp(this.paddleX, halfPaddle, GAME_CONFIG.WIDTH - halfPaddle)

    // If ball not active, keep it on paddle
    if (!this.ballActive) {
      this.resetBallToPaddle()
    } else {
      this.updateBall(dt)
    }

    this.drawFrame()
  }

  // ── Ball physics ───────────────────────────────────────────────────────────

  private launchBall(): void {
    if (this.ballActive || this.gameOver) return

    // Random angle between 45° and 135° (upward)
    const angleDeg = Phaser.Math.Between(45, 135)
    const angleRad = Phaser.Math.DegToRad(angleDeg)
    this.ballVel.x =  Math.cos(angleRad) * BALL_SPEED
    this.ballVel.y = -Math.abs(Math.sin(angleRad)) * BALL_SPEED

    this.ballActive = true
    this.hintTxt.setVisible(false)
  }

  private resetBallToPaddle(): void {
    this.ballPos.x = this.paddleX
    this.ballPos.y = PADDLE_Y - PADDLE_H / 2 - BALL_RADIUS - 1
    this.ballVel.x = 0
    this.ballVel.y = 0
  }

  private updateBall(dt: number): void {
    // Move
    this.ballPos.x += this.ballVel.x * dt
    this.ballPos.y += this.ballVel.y * dt

    // ── Wall collisions ──────────────────────────────────────────────────────

    // Left wall
    if (this.ballPos.x - BALL_RADIUS < 0) {
      this.ballPos.x = BALL_RADIUS
      this.ballVel.x = Math.abs(this.ballVel.x)
    }

    // Right wall
    if (this.ballPos.x + BALL_RADIUS > GAME_CONFIG.WIDTH) {
      this.ballPos.x = GAME_CONFIG.WIDTH - BALL_RADIUS
      this.ballVel.x = -Math.abs(this.ballVel.x)
    }

    // Top wall
    if (this.ballPos.y - BALL_RADIUS < 0) {
      this.ballPos.y = BALL_RADIUS
      this.ballVel.y = Math.abs(this.ballVel.y)
    }

    // ── Paddle collision ─────────────────────────────────────────────────────

    const paddleLeft   = this.paddleX - PADDLE_W / 2
    const paddleRight  = this.paddleX + PADDLE_W / 2
    const paddleTop    = PADDLE_Y - PADDLE_H / 2
    const paddleBottom = PADDLE_Y + PADDLE_H / 2

    if (
      this.ballVel.y > 0 &&
      this.ballPos.x >= paddleLeft  &&
      this.ballPos.x <= paddleRight &&
      this.ballPos.y + BALL_RADIUS >= paddleTop &&
      this.ballPos.y - BALL_RADIUS <= paddleBottom
    ) {
      // Angle based on impact offset from paddle center (-1 .. +1)
      const offset = (this.ballPos.x - this.paddleX) / (PADDLE_W / 2)
      const bounceAngleDeg = offset * 60   // max ±60° from vertical
      const bounceAngleRad = Phaser.Math.DegToRad(bounceAngleDeg - 90)

      const speed = Math.sqrt(this.ballVel.x ** 2 + this.ballVel.y ** 2)
      this.ballVel.x = Math.cos(bounceAngleRad) * speed
      this.ballVel.y = Math.sin(bounceAngleRad) * speed  // negative = upward

      // Push ball above paddle to prevent tunneling
      this.ballPos.y = paddleTop - BALL_RADIUS - 1
    }

    // ── Brick collisions (AABB) ──────────────────────────────────────────────

    for (const brick of this.bricks) {
      if (!brick.alive) continue

      const bx = BRICK_AREA_X + brick.col * (BRICK_W + BRICK_GAP)
      const by = BRICK_AREA_Y + brick.row * (BRICK_H + BRICK_GAP)
      const bRight  = bx + BRICK_W
      const bBottom = by + BRICK_H

      // Broad-phase: AABB check (ball as AABB for speed)
      const ballLeft   = this.ballPos.x - BALL_RADIUS
      const ballRight  = this.ballPos.x + BALL_RADIUS
      const ballTop    = this.ballPos.y - BALL_RADIUS
      const ballBottom = this.ballPos.y + BALL_RADIUS

      if (ballRight < bx || ballLeft > bRight || ballBottom < by || ballTop > bBottom) {
        continue
      }

      // Overlap depths on each axis to determine which side was hit
      const overlapLeft   = ballRight  - bx
      const overlapRight  = bRight     - ballLeft
      const overlapTop    = ballBottom - by
      const overlapBottom = bBottom    - ballTop

      const minOverlapX = Math.min(overlapLeft, overlapRight)
      const minOverlapY = Math.min(overlapTop,  overlapBottom)

      if (minOverlapX < minOverlapY) {
        // Hit from left or right side
        this.ballVel.x = -this.ballVel.x
        if (overlapLeft < overlapRight) {
          this.ballPos.x = bx - BALL_RADIUS
        } else {
          this.ballPos.x = bRight + BALL_RADIUS
        }
      } else {
        // Hit from top or bottom
        this.ballVel.y = -this.ballVel.y
        if (overlapTop < overlapBottom) {
          this.ballPos.y = by - BALL_RADIUS
        } else {
          this.ballPos.y = bBottom + BALL_RADIUS
        }
      }

      brick.alive = false
      this.bricksAlive--
      this.score += brick.points
      this.scoreTxt.setText(this.scoreLabel())

      // Check win condition
      if (this.bricksAlive === 0) {
        this.triggerWin()
        return
      }

      // Only resolve one brick per frame to avoid corner glitches
      break
    }

    // ── Ball lost ────────────────────────────────────────────────────────────

    if (this.ballPos.y - BALL_RADIUS > GAME_CONFIG.HEIGHT) {
      this.lives--
      this.livesTxt.setText(this.livesLabel())

      if (this.lives <= 0) {
        this.triggerGameOver()
      } else {
        this.ballActive = false
        this.resetBallToPaddle()
        this.hintTxt.setVisible(true)
      }
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private drawFrame(): void {
    this.gfx.clear()

    // ── Bricks ──────────────────────────────────────────────────────────────
    for (const brick of this.bricks) {
      if (!brick.alive) continue

      const bx = BRICK_AREA_X + brick.col * (BRICK_W + BRICK_GAP)
      const by = BRICK_AREA_Y + brick.row * (BRICK_H + BRICK_GAP)

      this.gfx.fillStyle(brick.colorNum, 1)
      this.gfx.fillRect(bx, by, BRICK_W, BRICK_H)

      // Highlight edge (top-left gloss)
      this.gfx.fillStyle(0xffffff, 0.15)
      this.gfx.fillRect(bx, by, BRICK_W, 3)
      this.gfx.fillRect(bx, by, 3, BRICK_H)
    }

    // ── Paddle ───────────────────────────────────────────────────────────────
    this.gfx.fillStyle(Colors.BRAND_PRIMARY.num, 1)
    this.gfx.fillRoundedRect(
      this.paddleX - PADDLE_W / 2,
      PADDLE_Y - PADDLE_H / 2,
      PADDLE_W,
      PADDLE_H,
      6,
    )

    // Paddle gloss
    this.gfx.fillStyle(0xffffff, 0.25)
    this.gfx.fillRoundedRect(
      this.paddleX - PADDLE_W / 2 + 4,
      PADDLE_Y - PADDLE_H / 2 + 2,
      PADDLE_W - 8,
      4,
      3,
    )

    // ── Ball ────────────────────────────────────────────────────────────────
    this.gfx.fillStyle(Colors.TEXT_PRIMARY.num, 1)
    this.gfx.fillCircle(this.ballPos.x, this.ballPos.y, BALL_RADIUS)

    // Ball highlight
    this.gfx.fillStyle(0xffffff, 0.5)
    this.gfx.fillCircle(this.ballPos.x - 2, this.ballPos.y - 2, BALL_RADIUS * 0.4)
  }

  // ── End states ────────────────────────────────────────────────────────────

  private triggerWin(): void {
    this.gameOver   = true
    this.ballActive = false
    this.showEndOverlay(true)
    this.completeSuccess(this.score)
  }

  private triggerGameOver(): void {
    this.gameOver   = true
    this.ballActive = false
    this.showEndOverlay(false)
    this.completeFail()
  }

  private showEndOverlay(success: boolean): void {
    // Dim background
    const overlay = this.add.graphics()
    overlay.fillStyle(Colors.BG_PRIMARY.num, 0.82)
    overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT)
    this.overlayObjs.push(overlay)

    // Panel
    const panelW = 380
    const panelH = 280
    const panelX = GAME_CONFIG.WIDTH  / 2
    const panelY = GAME_CONFIG.HEIGHT / 2

    const panel = this.add.graphics()
    panel.fillStyle(Colors.BG_SECONDARY.num, 1)
    panel.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 14)
    panel.lineStyle(2, success ? Colors.BRAND_ACCENT.num : Colors.ERROR.num, 1)
    panel.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 14)
    this.overlayObjs.push(panel)

    // Title
    const titleText  = success ? 'VOCÊ VENCEU!' : 'GAME OVER'
    const titleColor = success ? Colors.BRAND_ACCENT.hex : Colors.ERROR.hex
    const titleTxt = this.add.text(
      panelX,
      panelY - 95,
      titleText,
      { ...TextStyles.TITLE, color: titleColor },
    ).setOrigin(0.5)
    this.overlayObjs.push(titleTxt)

    // Score
    const scoreLbl = this.add.text(
      panelX,
      panelY - 42,
      `Pontuação: ${this.score}`,
      { ...TextStyles.SCORE, fontSize: '30px' },
    ).setOrigin(0.5)
    this.overlayObjs.push(scoreLbl)

    // Lives remaining info
    const infoLbl = this.add.text(
      panelX,
      panelY + 4,
      success
        ? `Todos os tijolos destruídos!`
        : `Vidas restantes: ${Math.max(0, this.lives)}`,
      { ...TextStyles.CAPTION, fontSize: '15px' },
    ).setOrigin(0.5)
    this.overlayObjs.push(infoLbl)

    // Buttons
    const btnRestart = new UIButton(
      this,
      panelX - 98,
      panelY + 90,
      'JOGAR NOVAMENTE',
      () => {
        this.input.keyboard!.removeAllListeners()
        this.input.removeAllListeners()
        this.scene.restart()
      },
      200,
      46,
    )
    this.overlayObjs.push(btnRestart)

    const btnMenu = new UIButton(
      this,
      panelX + 98,
      panelY + 90,
      'MENU',
      () => {
        this.input.keyboard!.removeAllListeners()
        this.input.removeAllListeners()
        // completeFail/completeSuccess already called above;
        // navigate back to menu directly
        this.scene.start(SCENE_KEYS.MAIN_MENU)
      },
      130,
      46,
    )
    this.overlayObjs.push(btnMenu)
  }

  // ── HUD helpers ───────────────────────────────────────────────────────────

  private scoreLabel(): string {
    return `SCORE  ${String(this.score).padStart(4, '0')}`
  }

  private livesLabel(): string {
    return `${'♥ '.repeat(this.lives).trim()}`
  }
}
