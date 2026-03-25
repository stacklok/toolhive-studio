/**
 * OS design variant — controls purely visual/layout decisions (window chrome,
 * traffic-light padding, etc.) and is intentionally separate from the real
 * platform value used for behavioural logic (log paths, networking flags, …).
 *
 * In DevTools:
 *   OsDesign.setMac()      – macOS layout (no custom controls, traffic-light padding)
 *   OsDesign.setWindows()  – Windows/Linux layout (custom min/max/close buttons)
 *   OsDesign.reset()       – restore the real platform
 *   OsDesign.current()     – log the active variant
 */

const STORAGE_KEY = '__thv_os_design_variant'

type OsDesignVariant = 'mac' | 'windows'

function detectVariant(): OsDesignVariant {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (stored === 'mac' || stored === 'windows') return stored
  return window.electronAPI.isMac ? 'mac' : 'windows'
}

export function getOsDesignVariant(): OsDesignVariant {
  return detectVariant()
}

// ── DevTools helper ────────────────────────────────────────────────────────

const osDesignDevtools = {
  setMac: () => {
    sessionStorage.setItem(STORAGE_KEY, 'mac')
    location.reload()
  },
  setWindows: () => {
    sessionStorage.setItem(STORAGE_KEY, 'windows')
    location.reload()
  },
  reset: () => {
    sessionStorage.removeItem(STORAGE_KEY)
    location.reload()
  },
  current: () => {
    const variant = detectVariant()
    const isOverridden = sessionStorage.getItem(STORAGE_KEY) !== null
    console.log(
      `OsDesign variant: "${variant}"${isOverridden ? ' (overridden)' : ''}`
    )
  },
}

declare global {
  interface Window {
    OsDesign: typeof osDesignDevtools
  }
}

window.OsDesign = osDesignDevtools
