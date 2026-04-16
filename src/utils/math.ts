/** Clamp: limita valor entre min e max */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** Lerp: interpolação linear */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * clamp(t, 0, 1)

/** Random inteiro entre min e max (inclusive) */
export const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

/** Embaralha array (Fisher-Yates) */
export const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Converte ms para string "M:SS" */
export const msToDisplay = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
