import { useState } from 'react'
import type { ContentIconKey, PresentationRarity } from './contentPresentation'

const iconModules = import.meta.glob<string>('../assets/icons/*.png', { eager: true, import: 'default' })

export const CONTENT_ICON_URLS = Object.fromEntries(
  Object.entries(iconModules).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]),
) as Partial<Record<ContentIconKey, string>>

interface ContentIconProps {
  iconKey: ContentIconKey | null
  fallbackText: string
  label: string
  rarity?: PresentationRarity
  size?: 'small' | 'normal'
}

function ContentImage({ url, fallbackText }: { url: string | undefined; fallbackText: string }) {
  const [failed, setFailed] = useState(false)
  if (!url || failed) return <span className="content-icon-fallback">{fallbackText}</span>
  return <img src={url} alt="" onError={() => setFailed(true)} />
}

export function ContentIcon({ iconKey, fallbackText, label, rarity = 'neutral', size = 'normal' }: ContentIconProps) {
  const url = iconKey ? CONTENT_ICON_URLS[iconKey] : undefined
  return (
    <span className={`content-icon ${size}`} data-rarity={rarity} aria-hidden="true" title={`${label} 아이콘`}>
      <ContentImage key={iconKey ?? 'fallback'} url={url} fallbackText={fallbackText} />
    </span>
  )
}
