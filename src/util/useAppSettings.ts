import { useState, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from "react";
import { EVENT } from '../constants';
import { useLocalStoragePref, BOOL_PREF, INT_PREF } from './useLocalStoragePref';
import { imgGet, imgPurgeOrphans } from './imageStorage';
import { msUntilDeadline } from './helpers';
import type { Game, GameBgEntry } from '../types';

export function useAppSettings(
  games: Game[] | null,
  setGames: Dispatch<SetStateAction<Game[] | null>>,
  now: Date,
) {
  const [sortUncheckedFirst, setSortUncheckedFirst] = useLocalStoragePref('dt:sortUncheckedFirst', true,  BOOL_PREF);
  const [autoDeleteExpired,  setAutoDeleteExpired]  = useLocalStoragePref('dt:autoDeleteExpired',  false, BOOL_PREF);
  const [autoDeleteDays,     setAutoDeleteDays]     = useLocalStoragePref('dt:autoDeleteDays',     1,     INT_PREF);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const v = localStorage.getItem('dt:collapsed');
      return v ? new Set<string>(JSON.parse(v) as string[]) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem('dt:collapsed', JSON.stringify([...collapsed])); } catch { /* ignore */ }
  }, [collapsed]);

  const toggleCollapse = useCallback((gameId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId); else next.add(gameId);
      return next;
    });
  }, []);

  const [appBg,   setAppBg]   = useState<string | null>(null);
  const [gameBgs, setGameBgs] = useState<Record<string, GameBgEntry>>({});
  const [imgVer,  setImgVer]  = useState(0);

  const refreshImages = useCallback(() => setImgVer((v) => v + 1), []);

  useEffect(() => {
    if (!games) return;
    let cancelled = false;
    (async () => {
      const ab = await imgGet('app-bg');
      if (cancelled) return;
      setAppBg(ab ? ab.dataUrl : null);
      const bgs: Record<string, GameBgEntry> = {};
      await Promise.all(games.map(async (g) => {
        const entry = await imgGet(`game-${g.id}`);
        if (entry) bgs[g.id] = entry;
      }));
      if (!cancelled) setGameBgs(bgs);
    })();
    return () => { cancelled = true; };
  }, [imgVer, games]);

  useEffect(() => {
    if (games) imgPurgeOrphans(games.map((g) => g.id));
  }, [games]);

  useEffect(() => {
    if (!autoDeleteExpired || !games) return;
    const thresholdMs = autoDeleteDays * 86_400_000;
    setGames((prev) => (prev ?? []).map((g) => {
      const filtered = (g.items ?? []).filter((item) => {
        if (item.type !== EVENT) return true;
        const ms = msUntilDeadline(item.deadline, now, item.deadlineTime ?? null);
        return ms > -thresholdMs;
      });
      return filtered.length === (g.items ?? []).length ? g : { ...g, items: filtered };
    }));
  }, [now, autoDeleteExpired, autoDeleteDays]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    sortUncheckedFirst, setSortUncheckedFirst,
    autoDeleteExpired,  setAutoDeleteExpired,
    autoDeleteDays,     setAutoDeleteDays,
    collapsed, toggleCollapse,
    appBg, gameBgs, refreshImages,
  };
}
