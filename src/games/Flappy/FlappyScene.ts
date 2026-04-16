import Phaser from 'phaser'
import { BaseMiniGameScene, type IMiniGame } from '@games/IMiniGame'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { GameManagerScene } from '@scenes/GameManagerScene'
import { UIButton } from '@ui/UIButton'

// ─── Config ───────────────────────────────────────────────────────────────────

const FLAPPY_CONFIG: IMiniGame = {
  sceneKey:    SCENE_KEYS.FLAPPY,
  displayName: 'Flappy',
  durationMs:  0,
  difficulty:  4,
  genre:       'arcade',
}

GameManagerScene.registerGame(FLAPPY_CONFIG)

// ─── Constants ────────────────────────────────────────────────────────────────

const BIRD_X       = 150
const BIRD_W       = 24
const BIRD_H       = 18

const GRAVITY      = 1200   // px/s²
const JUMP_VY      = -400   // px/s (upward)

const PIPE_WIDTH   = 60
const PIPE_GAP     = 150
const PIPE_SPEED   = 200    // px/s
const PIPE_INTERVAL_MS = 1800

const GAP_Y_MIN    = 120    // top of gap (centre of gap range: 120‥480)
const GAP_Y_MAX    = 480

const FLOOR_H      = 30     // height of ground strip at bottom
const WIN_SCORE    = 10

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pipe {
  x:       number
  gapY:    number   // Y of the top of the gap
  scored:  boolean
}

// ─── Scene ───────────────────────────────────────────────────────────────────

export class FlappyScene extends BaseMiniGameScene {
  constructor() { super({ key: SCENE_KEYS.FLAPPY }) }

  // Bird physics
  private birdY  = 0
  private birdVY = 0

  // Pipes
  private pipes:         Pipe[]  = []
  private pipeTimer      = 0

  // Game state
  private score          = 0
  private started        = false
  private dead           = false
  private floatTime      = 0

  // Graphics
  private gfx!:          Phaser.GameObjects.Graphics
  private scoreTxt!:     Phaser.GameObjects.Text

  // Overlay objects for game-over panel
  private overlayObjs:   Phaser.GameObjects.GameObject[] = []

  // ── Config ───────────────────────────────────────────────────────────────────

  protected get miniGameConfig(): IMiniGame {
    return FLAPPY_CONFIG
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  protected onStart(): void {
    this.birdY      = GAME_CONFIG.HEIGHT / 2
    this.birdVY     = 0
    this.pipes      = []
    this.pipeTimer  = 0
    this.score      = 0
    this.started    = false
    this.dead       = false
    this.floatTime  = 0
    this.overlayObjs = []

    // Static background
    const bg = this.add.graphics()
    bg.fillStyle(Colors.BG_PRIMARY.num, 1)
    bg.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT)

    // Subtle grid/atmosphere lines
    bg.lineStyle(1, Colors.BG_SECONDARY.num, 1)
    for (let y = 0; y < GAME_CONFIG.HEIGHT - FLOOR_H; y += 60) {
      bg.lineBetween(0, y, GAME_CONFIG.WIDTH, y)
    }

    // Main dynamic graphics layer
    this.gfx = this.add.graphics()

    // Score display
    this.scoreTxt = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      24,
      '0',
      { ...TextStyles.SCORE, fontSize: '32px' },
    ).setOrigin(0.5, 0)

    // Waiting hint
    const hintTxt = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 60,
      'ESPAÇO / CLIQUE para voar',
      { ...TextStyles.CAPTION, fontSize: '16px' },
    ).setOrigin(0.5)

    // Remove hint once game starts
    this.events.once('started', () => hintTxt.destroy())

    // ── Input ───────────────────────────────────────────────────────────────────

    this.input.keyboard!.on('keydown-SPACE', () => this.handleJump())
    this.input.on('pointerdown', () => this.handleJump())
  }

  protected onUpdate(_time: number, delta: number): void {
    if (this.dead) return

    const dt = delta / 1000   // seconds

    if (!this.started) {
      // Floating animation (sine wave)
      this.floatTime += dt
      this.birdY = GAME_CONFIG.HEIGHT / 2 + Math.sin(this.floatTime * 3) * 12
      this.drawFrame()
      return
    }

    // Physics
    this.birdVY += GRAVITY * dt
    this.birdY  += this.birdVY * dt

    // Pipe spawn timer
    this.pipeTimer += delta
    if (this.pipeTimer >= PIPE_INTERVAL_MS) {
      this.pipeTimer -= PIPE_INTERVAL_MS
      this.spawnPipe()
    }

    // Move pipes
    const removeList: Pipe[] = []
    for (const pipe of this.pipes) {
      pipe.x -= PIPE_SPEED * dt

      // Score when pipe passes the bird
      if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
        pipe.scored = true
        this.score++
        this.scoreTxt.setText(String(this.score))

        if (this.score >= WIN_SCORE) {
          this.dead = true
          this.drawFrame()
          this.completeSuccess(this.score * 50)
          return
        }
      }

      if (pipe.x + PIPE_WIDTH < 0) {
        removeList.push(pipe)
      }
    }
    this.pipes = this.pipes.filter(p => !removeList.includes(p))

    // Collision checks
    if (this.checkCollision()) {
      this.triggerDeath()
      return
    }

    this.drawFrame()
  }

  // ── Jump ─────────────────────────────────────────────────────────────────────

  private handleJump(): void {
    if (this.dead) return
    if (!this.started) {
      this.started = true
      this.birdVY  = JUMP_VY
      this.events.emit('started')
      return
    }
    this.birdVY = JUMP_VY
  }

  // ── Pipe management ──────────────────────────────────────────────────────────

  private spawnPipe(): void {
    const gapY = Phaser.Math.Between(GAP_Y_MIN, GAP_Y_MAX)
    this.pipes.push({
      x:      GAME_CONFIG.WIDTH,
      gapY,
      scored: false,
    })
  }

  // ── Collision ────────────────────────────────────────────────────────────────

  private checkCollision(): boolean {
    const birdTop    = this.birdY - BIRD_H / 2
    const birdBottom = this.birdY + BIRD_H / 2
    const birdLeft   = BIRD_X    - BIRD_W / 2
    const birdRight  = BIRD_X    + BIRD_W / 2

    // Ceiling
    if (birdTop <= 0) return true

    // Floor
    if (birdBottom >= GAME_CONFIG.HEIGHT - FLOOR_H) return true

    // Pipes
    for (const pipe of this.pipes) {
      const pipeLeft  = pipe.x
      const pipeRight = pipe.x + PIPE_WIDTH

      // Horizontal overlap
      if (birdRight < pipeLeft || birdLeft > pipeRight) continue

      const topPipeBottom    = pipe.gapY
      const bottomPipeTop    = pipe.gapY + PIPE_GAP

      if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) return true
    }

    return false
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  private drawFrame(): void {
    this.gfx.clear()

    // Draw pipes
    for (const pipe of this.pipes) {
      // Top pipe
      this.gfx.fillStyle(Colors.BRAND_ACCENT.num, 1)
      this.gfx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY)

      // Top pipe cap
      this.gfx.fillStyle(Colors.SUCCESS.num, 1)
      this.gfx.fillRect(pipe.x - 4, pipe.gapY - 18, PIPE_WIDTH + 8, 18)

      // Bottom pipe
      this.gfx.fillStyle(Colors.BRAND_ACCENT.num, 1)
      const bottomPipeTop = pipe.gapY + PIPE_GAP
      this.gfx.fillRect(pipe.x, bottomPipeTop, PIPE_WIDTH, GAME_CONFIG.HEIGHT - bottomPipeTop - FLOOR_H)

      // Bottom pipe cap
      this.gfx.fillStyle(Colors.SUCCESS.num, 1)
      this.gfx.fillRect(pipe.x - 4, bottomPipeTop, PIPE_WIDTH + 8, 18)

      // Pipe shine (subtle highlight strip)
      this.gfx.fillStyle(0x78ffa8, 0.25)
      this.gfx.fillRect(pipe.x + 4, 0, 8, pipe.gapY)
      this.gfx.fillRect(pipe.x + 4, bottomPipeTop + 18, 8, GAME_CONFIG.HEIGHT - bottomPipeTop - 18 - FLOOR_H)
    }

    // Ground strip (green/brown base)
    this.gfx.fillStyle(0x5a3e1b, 1)
    this.gfx.fillRect(0, GAME_CONFIG.HEIGHT - FLOOR_H, GAME_CONFIG.WIDTH, FLOOR_H)
    this.gfx.fillStyle(Colors.BRAND_ACCENT.num, 1)
    this.gfx.fillRect(0, GAME_CONFIG.HEIGHT - FLOOR_H, GAME_CONFIG.WIDTH, 6)

    // Bird body (ellipse approximated as rounded rect)
    const bx = BIRD_X - BIRD_W / 2
    const by = this.birdY - BIRD_H / 2

    this.gfx.fillStyle(Colors.BRAND_SECONDARY.num, 1)
    this.gfx.fillEllipse(BIRD_X, this.birdY, BIRD_W, BIRD_H)

    // Bird wing (small lighter ellipse)
    this.gfx.fillStyle(0xff8fa3, 1)
    this.gfx.fillEllipse(BIRD_X - 4, this.birdY + 2, 12, 8)

    // Bird eye
    this.gfx.fillStyle(Colors.TEXT_PRIMARY.num, 1)
    this.gfx.fillCircle(bx + BIRD_W - 5, by + 5, 3)
    this.gfx.fillStyle(Colors.BG_PRIMARY.num, 1)
    this.gfx.fillCircle(bx + BIRD_W - 4, by + 5, 1.5)

    // Bird beak
    this.gfx.fillStyle(Colors.WARNING.num, 1)
    this.gfx.fillTriangle(
      bx + BIRD_W,     this.birdY - 2,
      bx + BIRD_W + 8, this.birdY,
      bx + BIRD_W,     this.birdY + 3,
    )
  }

  // ── Death / Game Over ─────────────────────────────────────────────────────────

  private triggerDeath(): void {
    this.dead = true

    // Final frame
    this.drawFrame()

    // Small delay before showing panel (feels better)
    this.time.delayedCall(400, () => this.showGameOverPanel())

    this.completeFail()
  }

  private showGameOverPanel(): void {
    const cx = GAME_CONFIG.WIDTH  / 2
    const cy = GAME_CONFIG.HEIGHT / 2

    const panelW = 380
    const panelH = 280

    // Dim overlay
    const overlay = this.add.graphics()
    overlay.fillStyle(Colors.BG_PRIMARY.num, 0.72)
    overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT)
    this.overlayObjs.push(overlay)

    // Panel
    const panel = this.add.graphics()
    panel.fillStyle(Colors.BG_SECONDARY.num, 1)
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 14)
    panel.lineStyle(2, Colors.BRAND_PRIMARY.num, 1)
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 14)
    this.overlayObjs.push(panel)

    // Title
    const titleTxt = this.add.text(
      cx,
      cy - 100,
      'GAME OVER',
      { ...TextStyles.TITLE, color: Colors.ERROR.hex },
    ).setOrigin(0.5)
    this.overlayObjs.push(titleTxt)

    // Score
    const scoreLbl = this.add.text(
      cx,
      cy - 48,
      `Pontuação: ${this.score}`,
      { ...TextStyles.SCORE, fontSize: '30px' },
    ).setOrigin(0.5)
    this.overlayObjs.push(scoreLbl)

    // Hint
    const hintLbl = this.add.text(
      cx,
      cy + 4,
      this.score >= WIN_SCORE ? 'Parabéns! Você completou o desafio!' : `Objetivo: ${WIN_SCORE} pontos`,
      { ...TextStyles.CAPTION, fontSize: '15px' },
    ).setOrigin(0.5)
    this.overlayObjs.push(hintLbl)

    // Buttons
    const btnRestart = new UIButton(
      this,
      cx - 95,
      cy + 88,
      'JOGAR NOVAMENTE',
      () => {
        this.input.keyboard!.removeAllListeners()
        this.input.removeAllListeners()
        this.scene.restart()
      },
      190,
      46,
    )
    this.overlayObjs.push(btnRestart)

    const btnMenu = new UIButton(
      this,
      cx + 95,
      cy + 88,
      'MENU',
      () => {
        this.input.keyboard!.removeAllListeners()
        this.input.removeAllListeners()
        this.completeFail()
      },
      130,
      46,
    )
    this.overlayObjs.push(btnMenu)
  }
}
