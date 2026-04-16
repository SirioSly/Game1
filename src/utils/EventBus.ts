import Phaser from 'phaser'

/**
 * EventBus — Singleton global para comunicação entre cenas e sistemas.
 * Usar para eventos cross-scene (ex: updaters notificando a UI).
 */
export const EventBus = new Phaser.Events.EventEmitter()
