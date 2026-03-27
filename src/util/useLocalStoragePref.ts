import { useState, useCallback } from 'react'

interface PrefOptions<T> {
  serialize?: (v: T) => string
  deserialize?: (v: string) => T
  normalize?: (v: T) => T
}

export function useLocalStoragePref<T>(
  key: string,
  defaultValue: T,
  opts: PrefOptions<T> = {}
): [T, (val: T) => void] {
  const {
    serialize = String as unknown as (v: T) => string,
    deserialize = (v: string) => v as unknown as T,
    normalize = (v: T) => v,
  } = opts

  const [value, setValueState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? deserialize(raw) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setValue = useCallback(
    (val: T) => {
      const next = normalize(val)
      setValueState(next)
      try {
        localStorage.setItem(key, serialize(next))
      } catch {
        /* ignore */
      }
    },
    [key]
  ) // eslint-disable-line react-hooks/exhaustive-deps

  return [value, setValue]
}

// ── Preset option objects ─────────────────────────────────────────

/** For boolean prefs stored as '1' / '0'. */
export const BOOL_PREF: PrefOptions<boolean> = {
  serialize: (v) => (v ? '1' : '0'),
  deserialize: (v) => v === '1',
}

/** For non-negative integer prefs. */
export const INT_PREF: PrefOptions<number> = {
  serialize: String,
  deserialize: (v) => Math.max(0, parseInt(v, 10) || 0),
  normalize: (v) => Math.max(0, parseInt(String(v), 10) || 0),
}
