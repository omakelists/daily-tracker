import { useState, useCallback } from 'react';

/**
 * Persistent preference backed by localStorage.
 *
 * @param {string} key            - localStorage key
 * @param {*}      defaultValue   - value used when the key is absent
 * @param {object} [opts]
 * @param {function} [opts.serialize]   - value → string  (default: String)
 * @param {function} [opts.deserialize] - string → value  (default: identity)
 * @param {function} [opts.normalize]   - sanitize before storing (default: identity)
 *
 * @returns {[value, setter]}
 *
 * @example
 * // Boolean flag (stored as '1' / '0')
 * const [flag, setFlag] = useLocalStoragePref('dt:flag', true, BOOL_PREF);
 *
 * // Integer with clamping
 * const [days, setDays] = useLocalStoragePref('dt:days', 1, INT_PREF);
 */
export function useLocalStoragePref(key, defaultValue, opts = {}) {
  const { serialize = String, deserialize = (v) => v, normalize = (v) => v } = opts;

  const [value, setValueState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? deserialize(raw) : defaultValue;
    } catch { return defaultValue; }
  });

  const setValue = useCallback((val) => {
    const next = normalize(val);
    setValueState(next);
    try { localStorage.setItem(key, serialize(next)); } catch {}
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return [value, setValue];
}

// ── Preset option objects ────────────────────────────────────────

/** For boolean prefs stored as '1' / '0'. */
export const BOOL_PREF = {
  serialize:   (v) => (v ? '1' : '0'),
  deserialize: (v) => v === '1',
};

/** For non-negative integer prefs. */
export const INT_PREF = {
  serialize:   String,
  deserialize: (v) => Math.max(0, parseInt(v, 10) || 0),
  normalize:   (v) => Math.max(0, parseInt(v, 10) || 0),
};
