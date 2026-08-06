import { useSyncExternalStore } from 'react'
import { PhaserGame } from '../phaser/PhaserGame'
import { BattleCommands } from '../ui/BattleCommands'
import { GameHud } from '../ui/GameHud'
import { ResultScreen } from '../ui/ResultScreen'
import { SetupScreen } from '../ui/SetupScreen'
import { gameStore } from './gameStore'

function subscribe(listener: () => void): () => void {
  return gameStore.subscribe(listener)
}

export function App() {
  const state = useSyncExternalStore(subscribe, gameStore.getState, gameStore.getState)
  if (state.screen === 'start' || state.screen === 'setup') return <><SetupScreen state={state} dispatch={gameStore.dispatch} /><OrientationWarning /></>
  if (state.screen === 'result') return <><ResultScreen state={state} dispatch={gameStore.dispatch} /><OrientationWarning /></>
  return (
    <main className="game-shell">
      <section className="game-stage" aria-label={state.screen === 'battle' ? '전투 화면' : '탐사 화면'}>
        <PhaserGame key={state.screen} screen={state.screen} store={gameStore} />
      </section>
      <aside className="hud-panel">
        <GameHud state={state} />
        {state.screen === 'battle' && <BattleCommands state={state} dispatch={gameStore.dispatch} />}
      </aside>
      <OrientationWarning />
    </main>
  )
}

function OrientationWarning() {
  return <div className="portrait-warning">기기를 가로로 회전해 주세요.</div>
}
