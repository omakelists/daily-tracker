import { useState, useEffect, useCallback } from 'react'
import { t } from './i18n'

const VERSION_URL = './version.json'
const VERSION_CHECK_URL = './version.json?check=1'
const UPDATED_FLAG = 'app-updated'
const SKIP_WAITING_MSG = { type: 'SKIP_WAITING' }

interface VersionInfo {
  version?: string
}

interface VersionState {
  current: string
  latest: string
  hasUpdate: boolean
  timedOut?: boolean
}

export type VerState =
  | null
  | 'checking'
  | 'updating'
  | 'reloading'
  | 'error'
  | VersionState

async function fetchVersions(): Promise<{
  cached: VersionInfo
  net: VersionInfo
}> {
  const [cachedRes, netRes] = await Promise.all([
    fetch(VERSION_URL),
    fetch(VERSION_CHECK_URL + '&t=' + Date.now()),
  ])
  if (!cachedRes.ok || !netRes.ok) throw new Error('fetch failed')
  const [cached, net] = await Promise.all([
    cachedRes.json() as Promise<VersionInfo>,
    netRes.json() as Promise<VersionInfo>,
  ])
  return { cached, net }
}

// Accept the worker reference directly instead of reading reg.waiting at call time.
// reg.waiting may not be synchronously populated yet when called from within a
// statechange handler (nw.state === 'installed'), causing the postMessage to be
// silently skipped via optional chaining and the page to never reload.
function activateAndReload(worker: ServiceWorker): void {
  try {
    localStorage.setItem(UPDATED_FLAG, '1')
  } catch {
    /* ignore */
  }
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => window.location.reload(),
    { once: true }
  )
  worker.postMessage(SKIP_WAITING_MSG)
}

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<{
    current: string
    next: string
  } | null>(null)
  const [flashMsg, setFlashMsg] = useState<string | null>(null)
  const [verState, setVerState] = useState<VerState>(null)

  useEffect(() => {
    try {
      if (!localStorage.getItem(UPDATED_FLAG)) return
      localStorage.removeItem(UPDATED_FLAG)
      setFlashMsg(t('verUpdated'))
      const timer = setTimeout(() => setFlashMsg(null), 4000)
      return () => clearTimeout(timer)
    } catch {
      /* ignore */
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const checkVersions = async () => {
      try {
        const { cached, net } = await fetchVersions()
        if (net.version && net.version !== cached.version) {
          setUpdateInfo({ current: cached.version ?? '?', next: net.version })
        }
      } catch {
        /* ignore */
      }
    }

    navigator.serviceWorker.ready.then((reg) => {
      reg.update()
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing
        if (!nw) return
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller)
            checkVersions()
        })
      })
      if (reg.waiting && navigator.serviceWorker.controller) checkVersions()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkVersion = useCallback(async () => {
    setVerState('checking')
    try {
      const { cached, net } = await fetchVersions()
      setVerState({
        current: cached.version ?? '?',
        latest: net.version ?? '?',
        hasUpdate: !!(net.version && net.version !== cached.version),
      })
    } catch {
      setVerState('error')
    }
  }, [])

  const doUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return
    setVerState('updating')
    try {
      const reg = await navigator.serviceWorker.ready

      // Pass reg.waiting (ServiceWorker) directly — not reg (ServiceWorkerRegistration),
      // which has no postMessage and would silently drop the SKIP_WAITING message.
      if (reg.waiting) {
        setVerState('reloading')
        activateAndReload(reg.waiting)
        return
      }

      await reg.update()
      let settled = false

      const timeout = setTimeout(() => {
        if (settled) return
        settled = true
        setVerState(
          (prev) =>
            ({
              ...(typeof prev === 'object' && prev !== null ? prev : {}),
              hasUpdate: true,
              timedOut: true,
            }) as VersionState
        )
      }, 20_000)

      reg.addEventListener(
        'updatefound',
        () => {
          const nw = reg.installing
          if (!nw) return
          // Capture nw in the closure so we can pass it directly to activateAndReload.
          // reg.waiting may not yet be populated when statechange fires.
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && !settled) {
              settled = true
              clearTimeout(timeout)
              setVerState('reloading')
              activateAndReload(nw)
            }
          })
        },
        { once: true }
      )

      // Race: worker may have moved to waiting between reg.update() and updatefound.
      if (reg.waiting && !settled) {
        settled = true
        clearTimeout(timeout)
        setVerState('reloading')
        activateAndReload(reg.waiting)
      }
    } catch {
      setVerState('error')
    }
  }, [])

  return { updateInfo, flashMsg, verState, checkVersion, doUpdate }
}
