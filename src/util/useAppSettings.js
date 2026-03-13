import { useState, useEffect, useCallback } from 'react';
import { EVENT_TYPES } from '../constants';
import { useLocalStoragePref, BOOL_PREF, INT_PREF } from './useLocalStoragePref';
import { imgGet, imgPurgeOrphans } from './imageStorage';
import { msUntilDeadline } from './helpers';

// ── useAppSettings ────────────────────────────────────────────────
//
// Centralizes all persistent user preferences, UI state, and side-effects
// that are not directly related to game data or task logic:
//
//   Preferences (localStorage):
//     sortUncheckedFirst  — sort games with unchecked tasks to the top
//     showSectionHeaders  — show daily / periodic / event section labels
//     autoDeleteExpired   — automatically remove expired events
//     autoDeleteDays      — grace period in days before auto-deletion
//
//   UI state:
//     collapsed / toggleCollapse — which game cards are collapsed
//
//   Background images:
//     appBg / gameBgs     — loaded from IndexedDB via imageStorage
//     refreshImages       — call after any image change to reload
//
//   Side-effects (applied to games passed in):
//     Auto-delete of expired events (mutates via setGames)
//     imgPurgeOrphans — removes stale images for deleted games
//
// Usage:
//   const settings = useAppSettings(games, setGames, now);
//   const { sortUncheckedFirst, collapsed, appBg, ... } = settings;
export function useAppSettings(games, setGames, now) {
  // ── Persistent preferences ────────────────────────────────────
  const [sortUncheckedFirst,  setSortUncheckedFirst]  = useLocalStoragePref('dt:sortUncheckedFirst',  true,  BOOL_PREF);
  const [showSectionHeaders,  setShowSectionHeaders]  = useLocalStoragePref('dt:showSectionHeaders',  true,  BOOL_PREF);
  const [autoDeleteExpired,   setAutoDeleteExpired]   = useLocalStoragePref('dt:autoDeleteExpired',   false, BOOL_PREF);
  const [autoDeleteDays,      setAutoDeleteDays]      = useLocalStoragePref('dt:autoDeleteDays',      1,     INT_PREF);

  // ── Collapsed game cards ──────────────────────────────────────
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem('dt:collapsed');
      return v ? new Set(JSON.parse(v)) : new Set();
    } catch { return new Set(); }
  });

  // Persist collapsed set whenever it changes.
  useEffect(() => {
    try { localStorage.setItem('dt:collapsed', JSON.stringify([...collapsed])); } catch { /* ignore */ }
  }, [collapsed]);

  const toggleCollapse = useCallback((gameId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId); else next.add(gameId);
      return next;
    });
  }, []);

  // ── Background images ─────────────────────────────────────────
  const [appBg,   setAppBg]   = useState(null);
  const [gameBgs, setGameBgs] = useState({});
  const [imgVer,  setImgVer]  = useState(0);

  // Increment imgVer to trigger a reload of all background images.
  const refreshImages = useCallback(() => setImgVer((v) => v + 1), []);

  useEffect(() => {
    if (!games) return;
    let cancelled = false;
    (async () => {
      const ab = await imgGet('app-bg');
      if (cancelled) return;
      setAppBg(ab ? ab.dataUrl : null);
      const bgs = {};
      await Promise.all(games.map(async (g) => {
        const entry = await imgGet(`game-${g.id}`);
        if (entry) bgs[g.id] = entry;
      }));
      if (!cancelled) setGameBgs(bgs);
    })();
    return () => { cancelled = true; };
  }, [imgVer, games]);

  // Remove stale images when games are deleted.
  useEffect(() => {
    if (games) imgPurgeOrphans(games.map((g) => g.id));
  }, [games]);

  // ── Auto-delete expired events ────────────────────────────────
  useEffect(() => {
    if (!autoDeleteExpired || !games) return;
    const thresholdMs = autoDeleteDays * 86_400_000;
    setGames((prev) => prev.map((g) => {
      const filtered = (g.items ?? []).filter((item) => {
        if (!EVENT_TYPES.has(item.type)) return true; // never auto-delete tasks
        if (!item.deadline) return true;
        const ms = msUntilDeadline(item.deadline, now, item.deadlineTime ?? null);
        return ms > -thresholdMs; // keep if not yet past the grace threshold
      });
      return filtered.length === (g.items ?? []).length ? g : { ...g, items: filtered };
    }));
  }, [now, autoDeleteExpired, autoDeleteDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ────────────────────────────────────────────────
  return {
    // Preferences
    sortUncheckedFirst,  setSortUncheckedFirst,
    showSectionHeaders,  setShowSectionHeaders,
    autoDeleteExpired,   setAutoDeleteExpired,
    autoDeleteDays,      setAutoDeleteDays,
    // Collapsed state
    collapsed, toggleCollapse,
    // Background images
    appBg, gameBgs, refreshImages,
  };
}
