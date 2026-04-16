import type { IUpdater } from './IUpdater'

/**
 * UpdaterManager — Registra e executa todos os updaters a cada frame.
 * Instanciar uma vez e chamar .update(delta) no loop principal.
 */
export class UpdaterManager {
  private updaters = new Map<string, IUpdater>()

  register(updater: IUpdater): void {
    this.updaters.set(updater.id, updater)
    updater.start()
  }

  unregister(id: string): void {
    const updater = this.updaters.get(id)
    if (updater) {
      updater.destroy()
      this.updaters.delete(id)
    }
  }

  update(delta: number): void {
    for (const updater of this.updaters.values()) {
      updater.update(delta)
    }
  }

  pauseAll(): void {
    for (const updater of this.updaters.values()) updater.pause()
  }

  resumeAll(): void {
    for (const updater of this.updaters.values()) updater.resume()
  }

  destroyAll(): void {
    for (const updater of this.updaters.values()) updater.destroy()
    this.updaters.clear()
  }
}
