import Phaser from 'phaser'
import { BaseMiniGameScene, type IMiniGame } from '@games/IMiniGame'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { GameManagerScene } from '@scenes/GameManagerScene'
import { UIButton } from '@ui/UIButton'

// ─── Config ──────────────────────────────────────────────────────────────────

const PONG_CONFIG: IMiniGame = {
  sceneKey:    SCENE_KEYS.PONG,
  displayName: 'Pong',
  durationMs:  60000,
  difficulty:  3,
  genre:       'arcade',
}

GameManagerScene.registerGame(PONG_CONFIG)

// ─── Constants ────────────────────────────────────────────────────────────────

const W = GAME_CONFIG.WIDTH
const H = GAME_CONFIG.HEIGHT

const PADDLE_W        = 12
const PADDLE_H        = 80
const PADDLE_MARGIN   = 24          // distance from edge to paddle centre-x
const PADDLE_SPEED    = 320         // px/s player
const CPU_MAX_SPEED   = 230         // px/s CPU
const BALL_RADIUS     = 7
const BALL_BASE_SPEED = 300         // px/s initial
const SPEED_INCREMENT = 18          // added to total speed after each hit
const PLAYER_WIN_SCORE = 7
const PLAYER_LIVES    = 3

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaddleState {
  x: number
  y: number
  vy: number
}

interface BallState {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export class PongScene extends BaseMiniGameScene {

  // game state
  private playerScore  = 0
  private cpuScore     = 0
  private playerLives  = PLAYER_LIVES
  private gameOver     = false
  private ballInPlay   = false
  private ballLaunchTimer = 0

  // physics objects (manual)
  private player!: PaddleState
  private cpu!:    PaddleState
  private ball!:   BallState

  // graphics / text
  private gfx!:          Phaser.GameObjects.Graphics
  private txtPlayerScore!: Phaser.GameObjects.Text
  private txtCpuScore!:    Phaser.GameObjects.Text
  private txtLives!:       Phaser.GameObjects.Text
  private txtTimer!:       Phaser.GameObjects.Text
  private txtResult!:      Phaser.GameObjects.Text

  // input
  private keyW!:    Phaser.Input.Keyboard.Key
  private keyS!:    Phaser.Input.Keyboard.Key
  private keyUp!:   Phaser.Input.Keyboard.Key
  private keyDown!: Phaser.Input.Keyboard.Key

  // ── BaseMiniGameScene contract ─────────────────────────────────────────────

  protected get miniGameConfig(): IMiniGame {
    return PONG_CONFIG
  }

  protected onStart(): void {
    this.gameOver    = false
    this.playerScore = 0
    this.cpuScore    = 0
    this.playerLives = PLAYER_LIVES

    this.createBackground()
    this.createCenterLine()
    this.createHUD()
    this.createInput()

    this.resetPaddles()
    this.resetBall(true)

    this.updateHUD()
  }

  protected onUpdate(_time: number, delta: number): void {
    if (this.gameOver) return

    const dt = delta / 1000   // seconds

    this.updateTimer()

    if (!this.ballInPlay) {
      this.ballLaunchTimer -= delta
      if (this.ballLaunchTimer <= 0) {
        this.ballInPlay = true
      }
    }

    this.handlePlayerInput(dt)
    this.moveCPU(dt)

    if (this.ballInPlay) {
      this.moveBall(dt)
      this.checkWallCollisions()
      this.checkPaddleCollisions()
      this.checkScoring()
    }

    this.drawFrame()
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  private createBackground(): void {
    this.cameras.main.setBackgroundColor(Colors.BG_PRIMARY.hex)
    this.gfx = this.add.graphics()
  }

  private createCenterLine(): void {
    // drawn every frame in drawFrame, nothing to init
  }

  private createHUD(): void {
    const scoreStyle = { ...TextStyles.SCORE, fontSize: '32px' }

    // Player score (left)
    this.txtPlayerScore = this.add.text(W / 2 - 60, 24, '0', scoreStyle)
      .setOrigin(1, 0)

    // CPU score (right)
    this.txtCpuScore = this.add.text(W / 2 + 60, 24, '0', scoreStyle)
      .setOrigin(0, 0)

    // Lives
    this.txtLives = this.add.text(20, 16, '', TextStyles.CAPTION)
      .setOrigin(0, 0)

    // Timer
    this.txtTimer = this.add.text(W / 2, 16, '', TextStyles.CAPTION)
      .setOrigin(0.5, 0)

    // Result (hidden until game over)
    this.txtResult = this.add.text(W / 2, H / 2 - 60, '', {
      ...TextStyles.TITLE,
      fontSize: '40px',
      align: 'center',
    }).setOrigin(0.5).setVisible(false)
  }

  private createInput(): void {
    const kb = this.input.keyboard!
    this.keyW    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyS    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.keyUp   = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.keyDown = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
  }

  // ── Reset helpers ──────────────────────────────────────────────────────────

  private resetPaddles(): void {
    this.player = {
      x:  PADDLE_MARGIN + PADDLE_W / 2,
      y:  H / 2,
      vy: 0,
    }
    this.cpu = {
      x:  W - PADDLE_MARGIN - PADDLE_W / 2,
      y:  H / 2,
      vy: 0,
    }
  }

  private resetBall(initial = false): void {
    this.ball = {
      x:     W / 2,
      y:     H / 2,
      vx:    0,
      vy:    0,
      speed: BALL_BASE_SPEED,
    }
    this.ballInPlay = false

    // Random launch angle: 30–60° from horizontal, random side & direction
    const side  = initial ? (Math.random() < 0.5 ? 1 : -1) : 1
    const angle = (30 + Math.random() * 30) * (Math.PI / 180)
    const ySign = Math.random() < 0.5 ? 1 : -1

    this.ball.vx = side  * Math.cos(angle) * this.ball.speed
    this.ball.vy = ySign * Math.sin(angle) * this.ball.speed

    this.ballLaunchTimer = 1000  // 1s delay before launch
  }

  // ── Per-frame updates ──────────────────────────────────────────────────────

  private handlePlayerInput(dt: number): void {
    const up   = this.keyW.isDown    || this.keyUp.isDown
    const down = this.keyS.isDown    || this.keyDown.isDown

    if (up)   this.player.vy = -PADDLE_SPEED
    else if (down) this.player.vy = PADDLE_SPEED
    else           this.player.vy = 0

    this.player.y = Phaser.Math.Clamp(
      this.player.y + this.player.vy * dt,
      PADDLE_H / 2,
      H - PADDLE_H / 2,
    )
  }

  private moveCPU(dt: number): void {
    const targetY = this.ball.y
    const diff    = targetY - this.cpu.y
    const maxMove = CPU_MAX_SPEED * dt

    if (Math.abs(diff) < maxMove) {
      this.cpu.y = targetY
    } else {
      this.cpu.y += Math.sign(diff) * maxMove
    }

    this.cpu.y = Phaser.Math.Clamp(this.cpu.y, PADDLE_H / 2, H - PADDLE_H / 2)
  }

  private moveBall(dt: number): void {
    this.ball.x += this.ball.vx * dt
    this.ball.y += this.ball.vy * dt
  }

  private checkWallCollisions(): void {
    // Top wall
    if (this.ball.y - BALL_RADIUS <= 0) {
      this.ball.y  = BALL_RADIUS
      this.ball.vy = Math.abs(this.ball.vy)
    }
    // Bottom wall
    if (this.ball.y + BALL_RADIUS >= H) {
      this.ball.y  = H - BALL_RADIUS
      this.ball.vy = -Math.abs(this.ball.vy)
    }
  }

  private checkPaddleCollisions(): void {
    // ── Player paddle (left) ──────────────────────────────────────────────
    const pLeft   = this.player.x - PADDLE_W / 2
    const pRight  = this.player.x + PADDLE_W / 2
    const pTop    = this.player.y - PADDLE_H / 2
    const pBottom = this.player.y + PADDLE_H / 2

    if (
      this.ball.vx < 0 &&
      this.ball.x - BALL_RADIUS <= pRight &&
      this.ball.x + BALL_RADIUS >= pLeft  &&
      this.ball.y >= pTop &&
      this.ball.y <= pBottom
    ) {
      this.ball.x  = pRight + BALL_RADIUS
      this.increaseBallSpeed()
      this.reflectBallOffPaddle(this.player)
    }

    // ── CPU paddle (right) ────────────────────────────────────────────────
    const cLeft   = this.cpu.x - PADDLE_W / 2
    const cRight  = this.cpu.x + PADDLE_W / 2
    const cTop    = this.cpu.y - PADDLE_H / 2
    const cBottom = this.cpu.y + PADDLE_H / 2

    if (
      this.ball.vx > 0 &&
      this.ball.x + BALL_RADIUS >= cLeft &&
      this.ball.x - BALL_RADIUS <= cRight &&
      this.ball.y >= cTop &&
      this.ball.y <= cBottom
    ) {
      this.ball.x = cLeft - BALL_RADIUS
      this.increaseBallSpeed()
      this.reflectBallOffPaddle(this.cpu)
    }
  }

  private reflectBallOffPaddle(paddle: PaddleState): void {
    // Angle depends on where ball hit relative to paddle centre
    const hitDelta   = this.ball.y - paddle.y            // –H/2 to +H/2
    const normalised = hitDelta / (PADDLE_H / 2)          // –1 to +1
    const maxAngle   = 65 * (Math.PI / 180)
    const angle      = normalised * maxAngle

    const dirX = this.ball.vx > 0 ? -1 : 1
    this.ball.vx = dirX * Math.cos(angle) * this.ball.speed
    this.ball.vy =        Math.sin(angle) * this.ball.speed
  }

  private increaseBallSpeed(): void {
    this.ball.speed += SPEED_INCREMENT
  }

  private checkScoring(): void {
    // Ball exits left → CPU scores
    if (this.ball.x + BALL_RADIUS < 0) {
      this.playerLives--
      this.updateHUD()
      if (this.playerLives <= 0) {
        this.triggerGameOver(false)
      } else {
        this.resetBall()
      }
      return
    }

    // Ball exits right → Player scores
    if (this.ball.x - BALL_RADIUS > W) {
      this.playerScore++
      this.updateHUD()
      if (this.playerScore >= PLAYER_WIN_SCORE) {
        this.triggerGameOver(true)
      } else {
        this.resetBall()
      }
    }
  }

  private updateTimer(): void {
    const remaining = Math.max(0, PONG_CONFIG.durationMs - this.elapsedMs)
    const secs      = Math.ceil(remaining / 1000)
    this.txtTimer.setText(`${secs}s`)

    if (remaining <= 0 && !this.gameOver) {
      // Time's up — decide by score
      if (this.playerScore > this.cpuScore) {
        this.triggerGameOver(true)
      } else {
        this.triggerGameOver(false)
      }
    }
  }

  private updateHUD(): void {
    this.txtPlayerScore.setText(`${this.playerScore}`)
    this.txtCpuScore.setText(`${this.cpuScore}`)

    // Lives as hearts
    const heartsStr = '♥ '.repeat(this.playerLives).trim()
    this.txtLives.setText(`Vidas: ${heartsStr}`)
  }

  // ── Game over ──────────────────────────────────────────────────────────────

  private triggerGameOver(won: boolean): void {
    if (this.gameOver) return
    this.gameOver   = true
    this.ballInPlay = false

    this.showResultScreen(won)

    if (won) {
      const points = this.playerScore * 100
      this.completeSuccess(points)
    } else {
      this.completeFail()
    }
  }

  private showResultScreen(won: boolean): void {
    // Semi-transparent overlay
    const overlay = this.add.graphics()
    overlay.fillStyle(Colors.BG_PRIMARY.num, 0.75)
    overlay.fillRect(0, 0, W, H)

    // Result text
    const resultMsg  = won ? 'VOCÊ GANHOU!' : 'GAME OVER'
    const resultColor = won
      ? Colors.BRAND_ACCENT.hex
      : Colors.ERROR.hex

    this.txtResult
      .setText(resultMsg)
      .setStyle({ ...TextStyles.TITLE, fontSize: '40px', color: resultColor })
      .setVisible(true)

    // Score summary
    const summaryY = H / 2 - 10
    const summaryText = won
      ? `Placar: ${this.playerScore} × ${this.cpuScore}\nPontuação: ${this.playerScore * 100}`
      : `Placar: ${this.playerScore} × ${this.cpuScore}`

    this.add.text(W / 2, summaryY, summaryText, {
      ...TextStyles.BODY,
      align: 'center',
    }).setOrigin(0.5, 0)

    // Buttons
    new UIButton(
      this,
      W / 2 - 120,
      H / 2 + 90,
      'JOGAR NOVAMENTE',
      () => this.scene.restart(),
      220,
      48,
    )

    new UIButton(
      this,
      W / 2 + 120,
      H / 2 + 90,
      'MENU',
      () => this.completeFail(),
      160,
      48,
    )
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  private drawFrame(): void {
    this.gfx.clear()

    // Centre dashed line
    this.drawCenterLine()

    // Player paddle
    this.gfx.fillStyle(Colors.BRAND_PRIMARY.num, 1)
    this.gfx.fillRoundedRect(
      this.player.x - PADDLE_W / 2,
      this.player.y - PADDLE_H / 2,
      PADDLE_W,
      PADDLE_H,
      4,
    )

    // CPU paddle
    this.gfx.fillStyle(Colors.BRAND_SECONDARY.num, 1)
    this.gfx.fillRoundedRect(
      this.cpu.x - PADDLE_W / 2,
      this.cpu.y - PADDLE_H / 2,
      PADDLE_W,
      PADDLE_H,
      4,
    )

    // Ball
    const ballColor = this.ballInPlay
      ? Colors.TEXT_PRIMARY.num
      : Colors.TEXT_SECONDARY.num

    this.gfx.fillStyle(ballColor, 1)
    this.gfx.fillCircle(this.ball.x, this.ball.y, BALL_RADIUS)
  }

  private drawCenterLine(): void {
    const dashH   = 12
    const gapH    = 8
    const x       = W / 2
    let   y       = dashH / 2

    this.gfx.fillStyle(Colors.TEXT_MUTED.num, 0.6)

    while (y < H) {
      this.gfx.fillRect(x - 1, y - dashH / 2, 2, dashH)
      y += dashH + gapH
    }
  }
}
