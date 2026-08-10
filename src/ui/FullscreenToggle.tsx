import { useEffect, useState } from 'react'

interface FullscreenToggleProps {
  className?: string
}

function canUseFullscreen(): boolean {
  return typeof document !== 'undefined'
    && document.fullscreenEnabled
    && typeof document.documentElement.requestFullscreen === 'function'
    && typeof document.exitFullscreen === 'function'
}

function fullscreenActive(): boolean {
  return typeof document !== 'undefined' && document.fullscreenElement !== null
}

export function FullscreenToggle({ className = '' }: FullscreenToggleProps) {
  const [supported, setSupported] = useState(canUseFullscreen)
  const [isFullscreen, setIsFullscreen] = useState(fullscreenActive)
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const syncState = () => {
      setSupported(canUseFullscreen())
      setIsFullscreen(fullscreenActive())
      setTransitioning(false)
      setError(false)
    }
    const handleError = () => {
      setTransitioning(false)
      setError(true)
    }
    document.addEventListener('fullscreenchange', syncState)
    document.addEventListener('fullscreenerror', handleError)
    syncState()
    return () => {
      document.removeEventListener('fullscreenchange', syncState)
      document.removeEventListener('fullscreenerror', handleError)
    }
  }, [])

  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(false), 2500)
    return () => window.clearTimeout(timer)
  }, [error])

  if (!supported) return null

  const toggleFullscreen = async () => {
    if (transitioning) return
    setTransitioning(true)
    setError(false)
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      }
    } catch {
      setError(true)
    } finally {
      setTransitioning(false)
    }
  }

  const label = isFullscreen ? '일반 화면으로 전환' : '전체 화면으로 전환'
  const title = isFullscreen ? '전체 화면 종료' : '전체 화면'
  return (
    <>
      <button
        type="button"
        className={`fullscreen-toggle ${className}`.trim()}
        aria-label={label}
        aria-pressed={isFullscreen}
        title={title}
        disabled={transitioning}
        data-error={error ? 'true' : undefined}
        onClick={toggleFullscreen}
      >
        <span className="fullscreen-glyph" aria-hidden="true">
          <span /><span /><span /><span />
        </span>
      </button>
      <span className="fullscreen-status" role="status" aria-live="polite">{error ? '전체 화면으로 전환하지 못했습니다.' : ''}</span>
    </>
  )
}
