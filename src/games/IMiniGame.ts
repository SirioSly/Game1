/**
 * IMiniGame — Contrato que todo mini jogo deve implementar.
 * Usado pelos Agentes 1 e 3 para criar mini jogos compatíveis com o GameManagerScene.
 */
export interface IMiniGame {
  /** Chave única da cena Phaser (deve estar em SCENE_KEYS) */
  sceneKey: string

  /** Nome legível exibido na UI */
  displayName: string

  /** Duração máxima em milissegundos (0 = sem limite) */
  durationMs: number

  /** Dificuldade de 1 a 5 */
  difficulty: 1 | 2 | 3 | 4 | 5

  /** Gênero do mini jogo */
  genre: 'puzzle' | 'arcade' | 'casual'
}

export interface MiniGameResult {
  /** Pontuação obtida no mini jogo */
  points: number

  /** Tempo gasto em milissegundos */
  elapsedMs: number

  /** true se completou o objetivo principal */
  success: boolean
}

/**
 * BaseMiniGameScene — Classe base que todos os mini jogos devem estender.
 * Fornece helpers para emitir eventos de conclusão.
 */
import Phaser from 'phaser'
import { EVENTS, SCENE_KEYS } from '@design/constants'
import { EventBus } from '@utils/EventBus'

export abstract class BaseMiniGameScene extends Phaser.Scene {
  protected elapsedMs = 0
  private timer?: Phaser.Time.TimerEvent

  protected abstract get miniGameConfig(): IMiniGame

  create(): void {
    this.elapsedMs = 0

    if (this.miniGameConfig.durationMs > 0) {
      this.timer = this.time.addEvent({
        delay: this.miniGameConfig.durationMs,
        callback: () => this.onTimeUp(),
      })
    }

    this.onStart()
  }

  update(time: number, delta: number): void {
    this.elapsedMs += delta
    this.onUpdate(time, delta)
  }

  /** Chamado quando o mini jogo inicia */
  protected abstract onStart(): void

  /** Chamado a cada frame */
  protected onUpdate(_time: number, _delta: number): void {}

  /** Chamado quando o tempo esgota */
  protected onTimeUp(): void {
    this.completeFail()
  }

  protected completeSuccess(points: number): void {
    this.timer?.remove()
    EventBus.emit(EVENTS.MINI_GAME_COMPLETE, {
      points,
      elapsedMs: this.elapsedMs,
      success: true,
    } satisfies MiniGameResult)
    this.scene.start(SCENE_KEYS.MAIN_MENU)
  }

  protected completeFail(): void {
    this.timer?.remove()
    EventBus.emit(EVENTS.MINI_GAME_FAIL)
    this.scene.start(SCENE_KEYS.MAIN_MENU)
  }
}
