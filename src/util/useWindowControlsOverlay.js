import { useState, useEffect } from 'react';

const STORAGE_KEY = 'dt:wcoEnabled';

/**
 * Encapsulates all Window Controls Overlay (WCO) state and logic.
 *
 * @returns {{
 *   isPwa:       boolean,  // true when the app is running as an installed PWA with WCO API
 *   wcoVisible:  boolean,  // true when WCO is active (isPwa && enabled && OS reports visible)
 * }}
 */
export function useWindowControlsOverlay() {
  const isPwa = !!(navigator.windowControlsOverlay);

  const [enabled, setEnabledState] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  });

  const setEnabled = (val) => {
    setEnabledState(val);
    try { localStorage.setItem(STORAGE_KEY, val ? '1' : '0'); } catch {}
  };

  const [osVisible, setOsVisible] = useState(
    () => !!(navigator.windowControlsOverlay?.visible)
  );

  useEffect(() => {
    const wco = navigator.windowControlsOverlay;
    if (!wco) return;
    const handler = () => setOsVisible(wco.visible);
    wco.addEventListener('geometrychange', handler);
    return () => wco.removeEventListener('geometrychange', handler);
  }, []);

  return {
    isPwa,
    wcoVisible: enabled && osVisible,
  };
}
