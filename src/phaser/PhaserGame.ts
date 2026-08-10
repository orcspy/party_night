import Phaser from 'phaser'
import { createElement, useEffect, useRef } from 'react'
import type { Screen } from '../game/types'
import type { GameStore } from '../app/gameStore'
import { BattleScene } from './BattleScene'
import { ExplorationScene } from './ExplorationScene'
import { installSfxUnlock } from './audio/sfxPlayer'

export interface SceneBridge {
  store: GameStore
  onBattlePresentationStarted?: (sequence: number) => void
}

export function PhaserGame({ screen, store, onBattlePresentationStarted }: { screen: Screen; store: GameStore; onBattlePresentationStarted?: (sequence: number) => void }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!host.current) return
    installSfxUnlock()
    const scene = screen === 'battle' ? new BattleScene({ store, onBattlePresentationStarted }) : new ExplorationScene({ store })
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: 640,
      height: 360,
      backgroundColor: '#0d0c14',
      pixelArt: true,
      antialias: false,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene,
    })
    return () => game.destroy(true)
  }, [onBattlePresentationStarted, screen, store])
  return createElement('div', { className: 'phaser-host', ref: host })
}
