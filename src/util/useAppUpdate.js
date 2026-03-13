import { useState, useEffect, useCallback } from 'react';
import { t } from './i18n';

const VERSION_URL       = './version.json';
const VERSION_CHECK_URL = './version.json?check=1';
const UPDATED_FLAG      = 'app-updated';
const SKIP_WAITING_MSG  = { type: 'SKIP_WAITING' };

// ── Helpers ───────────────────────────────────────────────────────

async function fetchVersions() {
  const [cachedRes, netRes] = await Promise.all([
    fetch(VERSION_URL),
    fetch(VERSION_CHECK_URL + '&t=' + Date.now()), // bust any intermediate caches
  ]);
  if (!cachedRes.ok || !netRes.ok) throw new Error('fetch failed');
  const [cached, net] = await Promise.all([cachedRes.json(), netRes.json()]);
  return { cached, net };
}

// Registers the controllerchange listener BEFORE posting SKIP_WAITING so a
// fast-responding SW cannot fire the event before the listener is in place.
function activateAndReload(reg) {
  try { localStorage.setItem(UPDATED_FLAG, '1'); } catch { /* ignore */ }
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => window.location.reload(),
    { once: true },
  );
  reg.waiting.postMessage(SKIP_WAITING_MSG);
}

// ── useAppUpdate ──────────────────────────────────────────────────
//
// Returns:
//   updateInfo   — null | { current, next }  (used by App for the ⬆️ badge)
//   flashMsg     — null | string             (post-reload toast, auto-clears after 4 s)
//   verState     — null | 'checking' | 'updating' | 'reloading' | 'error'
//                  | { current, latest, hasUpdate, timedOut? }
//   checkVersion — () => void  (Settings "check" button)
//   doUpdate     — () => void  (Settings "update" button / App ⬆️ button)
export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [flashMsg,   setFlashMsg]   = useState(null);
  const [verState,   setVerState]   = useState(null);

  // ── Post-update toast (runs once on mount after a reload) ─────
  useEffect(() => {
    try {
      if (!localStorage.getItem(UPDATED_FLAG)) return;
      localStorage.removeItem(UPDATED_FLAG);
      setFlashMsg(t('verUpdated'));
      const timer = setTimeout(() => setFlashMsg(null), 4000);
      return () => clearTimeout(timer);
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Passive SW update detection (runs once on mount) ─────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkVersions = async () => {
      try {
        const { cached, net } = await fetchVersions();
        if (net.version && net.version !== cached.version) {
          setUpdateInfo({ current: cached.version, next: net.version });
        }
      } catch { /* ignore */ }
    };

    navigator.serviceWorker.ready.then((reg) => {
      reg.update();
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) checkVersions();
        });
      });
      if (reg.waiting && navigator.serviceWorker.controller) checkVersions();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Active version check (Settings "check" button) ───────────
  const checkVersion = useCallback(async () => {
    setVerState('checking');
    try {
      const { cached, net } = await fetchVersions();
      setVerState({
        current:   cached.version ?? '?',
        latest:    net.version    ?? '?',
        hasUpdate: !!(net.version && net.version !== cached.version),
      });
    } catch {
      setVerState('error');
    }
  }, []);

  // ── Apply update (Settings "update" button / App ⬆️ button) ──
  const doUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    setVerState('updating');
    try {
      const reg = await navigator.serviceWorker.ready;

      // Fast path: new SW is already waiting.
      if (reg.waiting) {
        setVerState('reloading');
        activateAndReload(reg);
        return;
      }

      // Slow path: force a SW update check and wait for it to reach 'installed'.
      await reg.update();
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        setVerState((prev) => ({
          ...(typeof prev === 'object' && prev !== null ? prev : {}),
          hasUpdate: true,
          timedOut:  true,
        }));
      }, 20_000);

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && !settled) {
            settled = true;
            clearTimeout(timeout);
            setVerState('reloading');
            activateAndReload(reg);
          }
        });
      }, { once: true });

      // Race: another tab may have already advanced the SW to waiting.
      if (reg.waiting && !settled) {
        settled = true;
        clearTimeout(timeout);
        setVerState('reloading');
        activateAndReload(reg);
      }
    } catch {
      setVerState('error');
    }
  }, []);

  return { updateInfo, flashMsg, verState, checkVersion, doUpdate };
}
