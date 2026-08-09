import type { GameCommand, GameState } from '../game/types'
import { getQuestDisplayName, getSkillDisplayName } from '../game/displayNames'
import { usedStorageSlots } from '../game/inventory'
import { ContentIcon } from './ContentIcon'
import { getRarityDisplayName, getRewardPresentation, getSkillPresentation } from './contentPresentation'

export function ResultScreen({ state, dispatch }: { state: GameState; dispatch: (command: GameCommand) => void }) {
  const victory = state.result?.outcome === 'victory'
  const summary = state.result?.settlement ?? state.profile?.pendingReward?.summary
  const pending = state.profile?.pendingReward
  const rewardEntries = state.result?.rewardEntries ?? pending?.rewards ?? []
  const selectedIds = new Set(pending?.selections.map((selection) => selection.rewardId) ?? [])
  return (
    <main className={`menu-screen result-screen ${victory ? 'victory' : 'defeat'}`}>
      <p className="eyebrow">EXPEDITION REPORT</p>
      <h1>{victory ? 'QUEST COMPLETE' : 'PARTY DEFEATED'}</h1>
      <p>{victory ? `${summary ? getQuestDisplayName(summary.questId) : '퀘스트'} 원정을 완료했다.` : '파티는 쓰러졌지만 모두 무사히 구조되었다.'}</p>
      <div className="reward-card"><span>획득 골드<strong>+{state.result?.gold ?? 0}</strong></span><span>획득 경험치<strong>+{state.result?.experience ?? 0}</strong></span></div>
      <p className="totals">보유 G {state.profile?.gold ?? 0} · 파티 EXP {state.profile?.characters[0]?.experience ?? 0}</p>
      {summary && <section className="settlement-details"><h2>성장·해금</h2>{summary.characterResults.map((result) => <div className="settlement-character" key={result.characterId}><span>{state.profile?.characters.find((character) => character.characterId === result.characterId)?.name}: Lv {result.previousLevel} → {result.level} · EXP +{summary.experiencePerCharacter} · 신규 스킬</span>{result.unlockedClassSkillIds.length > 0 ? <span className="content-inline-list">{result.unlockedClassSkillIds.map((skillId) => {
        const presentation = getSkillPresentation(skillId)
        return <span className="content-inline" key={skillId}><ContentIcon {...presentation} size="small" />{getSkillDisplayName(skillId)}</span>
      })}</span> : <span>없음</span>}<span>· 신규 커스텀 슬롯 {(result.unlockedCustomSlotIndices ?? []).map((index) => index + 1).join(', ') || '없음'}</span></div>)}<p>{summary.unlockedQuestIds.length > 0 ? `${summary.unlockedQuestIds.map(getQuestDisplayName).join(' · ')} 해금` : '추가 퀘스트 해금 없음'}</p>{summary.unlockedRarities.length > 0 && <div className="rarity-unlock-list"><span>신규 장비 등급:</span>{summary.unlockedRarities.map((rarity) => <span className="rarity-badge" data-rarity={rarity} key={rarity}>{getRarityDisplayName(rarity)}</span>)}</div>}{summary.questId === 'underground_dungeon_quest' && <p>만능 치료제가 상점에 추가되었습니다.</p>}</section>}
      {victory && rewardEntries.length > 0 && !pending && <section className="settlement-details"><h2>원정 보상</h2><div className="content-inline-list reward-list">{rewardEntries.map((reward) => {
        const presentation = getRewardPresentation(reward)
        return <span className="content-inline" data-rarity={presentation.rarity} key={reward.rewardId}><ContentIcon {...presentation} size="small" /><span className="content-name">{presentation.label}</span>{presentation.rarityLabel && <span className="rarity-badge">{presentation.rarityLabel}</span>}</span>
      })}</div><p>통합 창고에 보관되었습니다.</p></section>}
      {pending && <section className="reward-selection"><h2>창고 초과 보상 선택</h2><p>창고 {usedStorageSlots(state.profile!)}/100 · 보관할 보상을 선택하세요.</p>{pending.rewards.map((reward) => {
        const presentation = getRewardPresentation(reward)
        return <label key={reward.rewardId} data-rarity={presentation.rarity}><input type="checkbox" checked={selectedIds.has(reward.rewardId)} onChange={() => {
          const next = new Set(selectedIds)
          if (next.has(reward.rewardId)) next.delete(reward.rewardId); else next.add(reward.rewardId)
          dispatch({ type: 'SET_REWARD_SELECTION', selections: [...next].map((rewardId) => ({ rewardId, quantity: 1 })) })
        }} /><span className="content-identity"><ContentIcon {...presentation} size="small" /><span className="content-name">{presentation.label}</span>{presentation.rarityLabel && <span className="rarity-badge">{presentation.rarityLabel}</span>}</span></label>
      })}<button className="danger" onClick={() => dispatch({ type: 'CONFIRM_REWARD_SELECTION', confirmDiscardUnselected: true })}>선택 보관·나머지 포기</button></section>}
      {!pending && <button className="primary" onClick={() => dispatch({ type: 'RETURN_TO_HUB' })}>거점으로</button>}
    </main>
  )
}
