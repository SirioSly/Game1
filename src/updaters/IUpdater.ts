/**
 * IUpdater — Contrato para rotinas de atualização.
 * Usado pelo Agente 2 para criar updaters compatíveis com o sistema.
 */
export interface IUpdater {
  /** Identificador único do updater */
  id: string

  /** Se está ativo */
  active: boolean

  /** Chamado a cada frame pelo sistema (delta em ms) */
  update(delta: number): void

  /** Inicializa o updater */
  start(): void

  /** Pausa sem destruir o estado */
  pause(): void

  /** Retoma após pause */
  resume(): void

  /** Destrói e libera recursos */
  destroy(): void
}

/**
 * BaseUpdater — Implementação base para o Agente 2 estender.
 */
export abstract class BaseUpdater implements IUpdater {
  abstract readonly id: string
  active = false

  start(): void {
    this.active = true
    this.onStart()
  }

  pause(): void {
    this.active = false
  }

  resume(): void {
    this.active = true
  }

  destroy(): void {
    this.active = false
    this.onDestroy()
  }

  update(delta: number): void {
    if (!this.active) return
    this.onUpdate(delta)
  }

  protected abstract onStart(): void
  protected abstract onUpdate(delta: number): void
  protected onDestroy(): void {}
}
