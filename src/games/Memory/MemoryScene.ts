import Phaser from 'phaser'
import { BaseMiniGameScene, type IMiniGame } from '@games/IMiniGame'
import { Colors } from '@design/colors'
import { TextStyles } from '@design/typography'
import { SCENE_KEYS, GAME_CONFIG } from '@design/constants'
import { GameManagerScene } from '@scenes/GameManagerScene'
import { UIButton } from '@ui/UIButton'

// ---------------------------------------------------------------------------
// Config & Registration
// ---------------------------------------------------------------------------

const MEMORY_CONFIG: IMiniGame = {
  sceneKey:    SCENE_KEYS.MEMORY,
  displayName: 'Memória',
  durationMs:  60000,
  difficulty:  2,
  genre:       'puzzle',
}

GameManagerScene.registerGame(MEMORY_CONFIG)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_COLS      = 4
const GRID_ROWS      = 4
const TOTAL_CARDS    = GRID_COLS * GRID_ROWS   // 16
const TOTAL_PAIRS    = TOTAL_CARDS / 2         // 8
const CARD_W         = 100
const CARD_H         = 100
const CARD_GAP       = 12
const FLIP_DURATION  = 150   // ms for each half of the flip (scale 1→0 and 0→1)
const HIDE_DELAY     = 800   // ms to wait before hiding a mismatched pair
const MAX_ATTEMPTS   = 30
const BASE_PTS_PAIR  = 100
const TIME_BONUS_PER_SEC = 10

const EMOJIS: string[] = ['🔥', '⚡', '💎', '🌙', '⭐', '🎯', '🎮', '🏆']

/** One color per pair index (0-7), using design system colours */
const PAIR_COLORS: number[] = [
  Colors.BRAND_PRIMARY.num,    // 0 – roxo
  Colors.BRAND_ACCENT.num,     // 1 – verde
  Colors.BRAND_SECONDARY.num,  // 2 – rosa
  Colors.WARNING.num,          // 3 – amarelo
  Colors.INFO.num,             // 4 – azul
  Colors.SUCCESS.num,          // 5 – verde claro
  Colors.ERROR.num,            // 6 – vermelho
  0xe67e22,                    // 7 – laranja (extra)
]

// ---------------------------------------------------------------------------
// Card type
// ---------------------------------------------------------------------------

interface Card {
  index:       number     // position in grid (0-15)
  pairId:      number     // 0-7
  emoji:       string
  faceColor:   number
  container:   Phaser.GameObjects.Container
  back:        Phaser.GameObjects.Graphics
  face:        Phaser.GameObjects.Graphics
  emojiText:   Phaser.GameObjects.Text
  isFlipped:   boolean
  isMatched:   boolean
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export class MemoryScene extends BaseMiniGameScene {
  // ---- mini game contract ----
  protected get miniGameConfig(): IMiniGame { return MEMORY_CONFIG }

  // ---- state ----
  private cards:          Card[]   = []
  private flippedCards:   Card[]   = []
  private matchedPairs    = 0
  private attempts        = 0
  private isProcessing    = false
  private gameOver        = false

  // ---- HUD ----
  private pairsText!:     Phaser.GameObjects.Text
  private attemptsText!:  Phaser.GameObjects.Text
  private timerText!:     Phaser.GameObjects.Text

  // ---- overlay ----
  private overlayGroup!:  Phaser.GameObjects.Group

  // ---------------------------------------------------------------------------
  constructor() {
    super({ key: SCENE_KEYS.MEMORY })
  }

  // ---------------------------------------------------------------------------
  protected onStart(): void {
    this.cards         = []
    this.flippedCards  = []
    this.matchedPairs  = 0
    this.attempts      = 0
    this.isProcessing  = false
    this.gameOver      = false

    this.drawBackground()
    this.drawHUD()
    this.buildGrid()
    this.updateHUD()
  }

  // ---------------------------------------------------------------------------
  protected onUpdate(_time: number, _delta: number): void {
    if (this.gameOver) return
    this.updateTimerDisplay()
  }

  // ---------------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------------

  private drawBackground(): void {
    const gfx = this.add.graphics()
    gfx.fillStyle(Colors.BG_PRIMARY.num, 1)
    gfx.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT)

    // subtle header bar
    gfx.fillStyle(Colors.BG_SECONDARY.num, 1)
    gfx.fillRect(0, 0, GAME_CONFIG.WIDTH, 60)

    this.add.text(GAME_CONFIG.WIDTH / 2, 30, 'MEMÓRIA', {
      ...TextStyles.TITLE,
      fontSize: '24px',
    }).setOrigin(0.5)
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  private drawHUD(): void {
    // Pairs
    this.add.text(20, 70, 'PARES:', TextStyles.CAPTION).setOrigin(0, 0.5)
    this.pairsText = this.add.text(80, 70, '', { ...TextStyles.BODY, color: Colors.BRAND_ACCENT.hex })
      .setOrigin(0, 0.5)

    // Attempts
    this.add.text(200, 70, 'TENTATIVAS:', TextStyles.CAPTION).setOrigin(0, 0.5)
    this.attemptsText = this.add.text(310, 70, '', { ...TextStyles.BODY, color: Colors.WARNING.hex })
      .setOrigin(0, 0.5)

    // Timer
    this.add.text(600, 70, 'TEMPO:', TextStyles.CAPTION).setOrigin(0, 0.5)
    this.timerText = this.add.text(660, 70, '60s', { ...TextStyles.BODY, color: Colors.TEXT_PRIMARY.hex })
      .setOrigin(0, 0.5)
  }

  private updateHUD(): void {
    this.pairsText.setText(`${this.matchedPairs}/${TOTAL_PAIRS}`)
    this.attemptsText.setText(`${this.attempts}/${MAX_ATTEMPTS}`)
  }

  private updateTimerDisplay(): void {
    const remaining = Math.max(
      0,
      Math.ceil((MEMORY_CONFIG.durationMs - this.elapsedMs) / 1000),
    )
    this.timerText.setText(`${remaining}s`)
    if (remaining <= 10) {
      this.timerText.setStyle({ ...TextStyles.BODY, color: Colors.ERROR.hex })
    } else {
      this.timerText.setStyle({ ...TextStyles.BODY, color: Colors.TEXT_PRIMARY.hex })
    }
  }

  // ---------------------------------------------------------------------------
  // Grid construction
  // ---------------------------------------------------------------------------

  private buildGrid(): void {
    const totalW = GRID_COLS * CARD_W + (GRID_COLS - 1) * CARD_GAP
    const totalH = GRID_ROWS * CARD_H + (GRID_ROWS - 1) * CARD_GAP
    const startX = (GAME_CONFIG.WIDTH  - totalW) / 2 + CARD_W / 2
    const startY = 90 + (GAME_CONFIG.HEIGHT - 90 - totalH) / 2 + CARD_H / 2

    // Build a shuffled deck: 2 of each pairId
    const pairIds: number[] = []
    for (let p = 0; p < TOTAL_PAIRS; p++) {
      pairIds.push(p, p)
    }
    this.shuffleArray(pairIds)

    for (let i = 0; i < TOTAL_CARDS; i++) {
      const col = i % GRID_COLS
      const row = Math.floor(i / GRID_COLS)
      const x   = startX + col * (CARD_W + CARD_GAP)
      const y   = startY + row * (CARD_H + CARD_GAP)

      const pairId    = pairIds[i]
      const emoji     = EMOJIS[pairId]
      const faceColor = PAIR_COLORS[pairId]

      const card = this.createCard(i, pairId, emoji, faceColor, x, y)
      this.cards.push(card)
    }
  }

  private createCard(
    index: number,
    pairId: number,
    emoji: string,
    faceColor: number,
    x: number,
    y: number,
  ): Card {
    const container = this.add.container(x, y)

    // Back (visible by default)
    const back = this.add.graphics()
    this.drawCardBack(back)

    // Face (hidden by default)
    const face = this.add.graphics()
    face.setVisible(false)
    this.drawCardFace(face, faceColor)

    // Emoji text (hidden by default)
    const emojiText = this.add.text(0, 0, emoji, {
      fontSize: '36px',
    }).setOrigin(0.5).setVisible(false)

    container.add([back, face, emojiText])

    container.setSize(CARD_W, CARD_H)
    container.setInteractive({ useHandCursor: true })
    container.on('pointerdown', () => this.onCardClick(card))
    container.on('pointerover',  () => { if (!card.isFlipped && !card.isMatched) this.highlightCard(back) })
    container.on('pointerout',   () => { if (!card.isFlipped && !card.isMatched) this.drawCardBack(back) })

    const card: Card = {
      index,
      pairId,
      emoji,
      faceColor,
      container,
      back,
      face,
      emojiText,
      isFlipped: false,
      isMatched: false,
    }

    return card
  }

  private drawCardBack(gfx: Phaser.GameObjects.Graphics): void {
    gfx.clear()
    gfx.fillStyle(Colors.BG_CARD.num, 1)
    gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8)
    gfx.lineStyle(2, Colors.BORDER.num, 1)
    gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8)
    // decorative pattern
    gfx.lineStyle(1, Colors.BRAND_PRIMARY.num, 0.3)
    gfx.strokeRoundedRect(-CARD_W / 2 + 6, -CARD_H / 2 + 6, CARD_W - 12, CARD_H - 12, 5)
  }

  private highlightCard(gfx: Phaser.GameObjects.Graphics): void {
    gfx.clear()
    gfx.fillStyle(Colors.BG_SECONDARY.num, 1)
    gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8)
    gfx.lineStyle(2, Colors.BRAND_PRIMARY.num, 1)
    gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8)
  }

  private drawCardFace(gfx: Phaser.GameObjects.Graphics, color: number): void {
    gfx.clear()
    gfx.fillStyle(color, 0.2)
    gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8)
    gfx.lineStyle(2, color, 1)
    gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8)
  }

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  private onCardClick(card: Card): void {
    if (this.gameOver)          return
    if (this.isProcessing)      return
    if (card.isFlipped)         return
    if (card.isMatched)         return
    if (this.flippedCards.length >= 2) return

    this.flipCardOpen(card)
    this.flippedCards.push(card)

    if (this.flippedCards.length === 2) {
      this.attempts++
      this.updateHUD()
      this.isProcessing = true
      this.time.delayedCall(FLIP_DURATION * 2 + 50, () => this.checkMatch())
    }
  }

  private checkMatch(): void {
    const [a, b] = this.flippedCards

    if (a.pairId === b.pairId) {
      // Matched!
      a.isMatched = true
      b.isMatched = true
      this.matchedPairs++
      this.updateHUD()
      this.playMatchEffect(a, b)
      this.flippedCards = []
      this.isProcessing = false

      if (this.matchedPairs === TOTAL_PAIRS) {
        this.gameOver = true
        const remainingMs = Math.max(0, MEMORY_CONFIG.durationMs - this.elapsedMs)
        const timeBonusPts = Math.floor(remainingMs / 1000) * TIME_BONUS_PER_SEC
        const totalPts     = TOTAL_PAIRS * BASE_PTS_PAIR + timeBonusPts
        this.time.delayedCall(600, () => this.showResult(true, totalPts))
        return
      }
    } else {
      // No match — flip both back after delay
      this.time.delayedCall(HIDE_DELAY, () => {
        this.flipCardClose(a)
        this.flipCardClose(b)
        this.flippedCards = []
        this.isProcessing = false
      })
    }

    // Check attempt limit
    if (!this.gameOver && this.attempts >= MAX_ATTEMPTS && this.matchedPairs < TOTAL_PAIRS) {
      this.gameOver = true
      this.time.delayedCall(HIDE_DELAY + 200, () => this.showResult(false, 0))
    }
  }

  // ---------------------------------------------------------------------------
  // Flip animations
  // ---------------------------------------------------------------------------

  private flipCardOpen(card: Card): void {
    // Scale X: 1 → 0 (hide back), then 0 → 1 (show face)
    this.tweens.add({
      targets:  card.container,
      scaleX:   0,
      duration: FLIP_DURATION,
      ease:     'Sine.easeIn',
      onComplete: () => {
        card.back.setVisible(false)
        card.face.setVisible(true)
        card.emojiText.setVisible(true)
        card.isFlipped = true
        this.tweens.add({
          targets:  card.container,
          scaleX:   1,
          duration: FLIP_DURATION,
          ease:     'Sine.easeOut',
        })
      },
    })
  }

  private flipCardClose(card: Card): void {
    this.tweens.add({
      targets:  card.container,
      scaleX:   0,
      duration: FLIP_DURATION,
      ease:     'Sine.easeIn',
      onComplete: () => {
        card.face.setVisible(false)
        card.emojiText.setVisible(false)
        card.back.setVisible(true)
        this.drawCardBack(card.back)
        card.isFlipped = false
        this.tweens.add({
          targets:  card.container,
          scaleX:   1,
          duration: FLIP_DURATION,
          ease:     'Sine.easeOut',
        })
      },
    })
  }

  private playMatchEffect(a: Card, b: Card): void {
    // Brief scale pop on matched cards
    for (const card of [a, b]) {
      this.tweens.add({
        targets:  card.container,
        scaleX:   1.15,
        scaleY:   1.15,
        duration: 120,
        yoyo:     true,
        ease:     'Sine.easeOut',
      })
      // Tint the border brighter
      this.drawCardFace(card.face, card.faceColor)
      card.face.lineStyle(3, Colors.BRAND_ACCENT.num, 1)
      card.face.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8)
    }
  }

  // ---------------------------------------------------------------------------
  // End-of-game overlay
  // ---------------------------------------------------------------------------

  private showResult(success: boolean, points: number): void {
    this.overlayGroup = this.add.group()

    // Dim background
    const dim = this.add.graphics()
    dim.fillStyle(0x000000, 0.75)
    dim.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT)
    this.overlayGroup.add(dim)

    const cx = GAME_CONFIG.WIDTH  / 2
    const cy = GAME_CONFIG.HEIGHT / 2

    // Panel
    const panel = this.add.graphics()
    panel.fillStyle(Colors.BG_SECONDARY.num, 1)
    panel.fillRoundedRect(cx - 220, cy - 160, 440, 320, 16)
    panel.lineStyle(2, success ? Colors.BRAND_ACCENT.num : Colors.ERROR.num, 1)
    panel.strokeRoundedRect(cx - 220, cy - 160, 440, 320, 16)
    this.overlayGroup.add(panel)

    // Title
    const titleStr = success ? 'PARABÉNS!' : 'GAME OVER'
    const titleColor = success ? Colors.BRAND_ACCENT.hex : Colors.ERROR.hex
    const titleTxt = this.add.text(cx, cy - 110, titleStr, {
      ...TextStyles.TITLE,
      color: titleColor,
    }).setOrigin(0.5)
    this.overlayGroup.add(titleTxt)

    if (success) {
      const scoreTxt = this.add.text(cx, cy - 55, `${points} pts`, {
        ...TextStyles.SCORE,
      }).setOrigin(0.5)
      this.overlayGroup.add(scoreTxt)
    }

    // Stats
    const remainingSec = Math.max(0, Math.floor((MEMORY_CONFIG.durationMs - this.elapsedMs) / 1000))
    const statsLines = [
      `Pares encontrados: ${this.matchedPairs}/${TOTAL_PAIRS}`,
      `Tentativas: ${this.attempts}`,
      `Tempo restante: ${remainingSec}s`,
    ]
    const statsStr = statsLines.join('\n')
    const statsTxt = this.add.text(cx, cy - (success ? 0 : 30), statsStr, {
      ...TextStyles.CAPTION,
      align: 'center',
    }).setOrigin(0.5)
    this.overlayGroup.add(statsTxt)

    // Buttons
    const btnY = cy + 90
    new UIButton(this, cx - 120, btnY, 'JOGAR NOVAMENTE', () => {
      this.scene.restart()
    }, 200, 46)

    new UIButton(this, cx + 120, btnY, 'MENU', () => {
      this.scene.start('MainMenuScene')
    }, 140, 46)

    // Emit result to game manager
    if (success) {
      this.completeSuccess(points)
    } else {
      this.completeFail()
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }
}
