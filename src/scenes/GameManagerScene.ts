import Phaser from 'phaser'
import { SCENE_KEYS, EVENTS } from '@design/constants'
import type { IMiniGame, MiniGameResult } from '@games/IMiniGame'
import { EventBus } from '@utils/EventBus'

/**
 * GameManagerScene — orquestra a sequência de mini jogos.
 * Os Agentes 1 e 3 registram seus mini jogos via GameManagerScene.registerGame()
 * antes de o jogo iniciar.
 */
export class GameManagerScene extends Phaser.Scene {
  private static registry: IMiniGame[] = []

  private queue: IMiniGame[] = []
  private currentIndex = 0
  private score = 0

  constructor() {
    super({ key: SCENE_KEYS.GAME_MANAGER })
  }

  /** Chamado pelos Agentes 1 e 3 para registrar mini jogos */
  static registerGame(game: IMiniGame): void {
    GameManagerScene.registry.push(game)
  }

  create(): void {
    this.queue = [...GameManagerScene.registry]
    this.currentIndex = 0
    this.score = 0

    EventBus.on(EVENTS.MINI_GAME_COMPLETE, (result: MiniGameResult) => {
      this.score += result.points
      this.nextGame()
    })

    EventBus.on(EVENTS.MINI_GAME_FAIL, () => {
      this.nextGame()
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(EVENTS.MINI_GAME_COMPLETE)
      EventBus.off(EVENTS.MINI_GAME_FAIL)
    })

    this.nextGame()
  }

  private nextGame(): void {
    if (this.currentIndex >= this.queue.length) {
      this.endSession()
      return
    }

    const miniGame = this.queue[this.currentIndex++]
    this.scene.start(miniGame.sceneKey)
  }

  private endSession(): void {
    // TODO: ir para tela de resultado com this.score
    this.scene.start(SCENE_KEYS.MAIN_MENU)
  }
}
