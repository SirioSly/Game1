import { STORAGE_KEYS } from '@design/constants'

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

export const Storage = {
  get<T>(key: StorageKey, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },

  set<T>(key: StorageKey, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // localStorage indisponível (modo privado, etc.)
    }
  },

  remove(key: StorageKey): void {
    localStorage.removeItem(key)
  },
}
