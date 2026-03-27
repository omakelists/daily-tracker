/// <reference types="vite/client" />

// ── CSS Modules ───────────────────────────────────────────────────
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

// ── Browser API extensions ────────────────────────────────────────

interface Window {
  /** Safari legacy prefix for Web Audio API. */
  webkitAudioContext?: typeof AudioContext
}

interface Navigator {
  /** Window Controls Overlay API (PWA titlebar integration). */
  windowControlsOverlay?: {
    visible: boolean
    addEventListener(type: 'geometrychange', handler: () => void): void
    removeEventListener(type: 'geometrychange', handler: () => void): void
  }
}

interface Document {
  /** View Transitions API. */
  startViewTransition?: (callback: () => void) => { ready: Promise<void> }
}
