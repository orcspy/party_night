import type { GameCommand, GameState } from '../game/types'

export function ResultScreen({ state, dispatch }: { state: GameState; dispatch: (command: GameCommand) => void }) {
  const victory = state.result?.outcome === 'victory'
  return (
    <main className={`menu-screen result-screen ${victory ? 'victory' : 'defeat'}`}>
      <p className="eyebrow">EXPEDITION REPORT</p>
      <h1>{victory ? 'QUEST COMPLETE' : 'PARTY DEFEATED'}</h1>
      <p>{victory ? '고블린을 물리치고 훈련 폐허를 빠져나왔다.' : '파티는 쓰러졌지만 모두 무사히 구조되었다.'}</p>
      <div className="reward-card"><span>획득 골드<strong>+{state.result?.gold ?? 0}</strong></span><span>획득 경험치<strong>+{state.result?.experience ?? 0}</strong></span></div>
      <p className="totals">누적 G {state.profile.totalGold} · EXP {state.profile.totalExperience}</p>
      <button className="primary" onClick={() => dispatch({ type: 'RETURN_TO_SETUP' })}>준비 화면으로</button>
    </main>
  )
}
