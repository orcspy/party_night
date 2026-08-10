import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { GameState } from '../game/types'
import { PhaserGame } from '../phaser/PhaserGame'
import { BattleCommands } from '../ui/BattleCommands'
import { GameHud } from '../ui/GameHud'
import { ExplorationItems } from '../ui/ExplorationItems'
import { FullscreenToggle } from '../ui/FullscreenToggle'
import { HubScreen } from '../ui/HubScreen'
import { ResultScreen } from '../ui/ResultScreen'
import { SetupScreen } from '../ui/SetupScreen'
import { buildBattlePresentationPlan } from './battlePresentation'
import { gameStore } from './gameStore'

function subscribe(listener: () => void): () => void {
  return gameStore.subscribe(() => listener())
}

export function App() {
  const envelope = useSyncExternalStore(subscribe, gameStore.getSnapshot, gameStore.getSnapshot)
  const plan = buildBattlePresentationPlan(envelope)
  const [releasedSequence, setReleasedSequence] = useState(0)
  const [startedSequence, setStartedSequence] = useState(0)
  const handlePresentationStarted = useCallback((sequence: number) => {
    setStartedSequence(sequence)
    setReleasedSequence((released) => released === sequence ? -1 : released)
  }, [])
  useEffect(() => {
    if (!plan.lockCommands || plan.durationMs <= 0) return
    const startFallbackMs = startedSequence === envelope.sequence ? 0 : 5000
    const timer = window.setTimeout(() => setReleasedSequence(envelope.sequence), plan.durationMs + startFallbackMs)
    return () => window.clearTimeout(timer)
  }, [envelope.sequence, plan.durationMs, plan.lockCommands, startedSequence])
  const presentationActive = plan.lockCommands && plan.durationMs > 0 && releasedSequence !== envelope.sequence
  const state: GameState = presentationActive && envelope.battlePresentation
    ? { ...envelope.state, screen: 'battle', session: envelope.battlePresentation.session }
    : envelope.state
  if (state.screen === 'start' || state.screen === 'profile_create') return <><SetupScreen state={state} dispatch={gameStore.dispatch} /><OrientationWarning /></>
  if (state.screen === 'hub') return <><HubScreen state={state} dispatch={gameStore.dispatch} /><OrientationWarning /></>
  if (state.screen === 'result') return <><ResultScreen state={state} dispatch={gameStore.dispatch} /><OrientationWarning /></>
  return (
    <main className="game-shell">
      <section className="game-stage" aria-label={state.screen === 'battle' ? '전투 화면' : '탐사 화면'}>
        <PhaserGame key={state.screen} screen={state.screen} store={gameStore} onBattlePresentationStarted={handlePresentationStarted} />
        <FullscreenToggle className="game-fullscreen-toggle" />
      </section>
      <aside className="hud-panel">
        <GameHud state={state} />
        {state.screen === 'battle' && <BattleCommands state={state} dispatch={gameStore.dispatch} presentationBusy={presentationActive} />}
        {state.screen === 'exploration' && <ExplorationItems state={state} dispatch={gameStore.dispatch} />}
      </aside>
      <OrientationWarning />
    </main>
  )
}

function OrientationWarning() {
  return <div className="portrait-warning">기기를 가로로 회전해 주세요.</div>
}
