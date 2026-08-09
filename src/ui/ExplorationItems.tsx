import { ITEM_DATA } from '../game/content'
import { getItemDisplayName } from '../game/displayNames'
import type { GameCommand, GameState, ItemId } from '../game/types'

export function ExplorationItems({ state, dispatch }: { state: GameState; dispatch: (command: GameCommand) => void }) {
  const session = state.session
  const profile = state.profile
  if (!session || !profile) return null
  const entries = profile.characters.flatMap((character) => character.inventorySlots
    .filter((stack) => ITEM_DATA[stack.itemId as ItemId]?.usableIn.includes('exploration'))
    .map((stack) => ({ character, stack, item: ITEM_DATA[stack.itemId as ItemId] })))
  if (entries.length === 0) return null
  return <section className="commands exploration-items"><h2>탐사 아이템</h2>{entries.map(({ character, stack, item }) => <div className="exploration-item" key={stack.stackId}><b>{character.name} · {getItemDisplayName(stack.itemId)} ×{stack.quantity}</b>{item.effect === 'survey' ? <button onClick={() => dispatch({ type: 'USE_ITEM', characterId: character.characterId, stackId: stack.stackId })}>사용</button> : <div>{session.party.filter((actor) => actor.currentHp > 0).map((target) => <button key={target.id} onClick={() => dispatch({ type: 'USE_ITEM', characterId: character.characterId, stackId: stack.stackId, targetId: target.id })}>{target.name}</button>)}</div>}</div>)}</section>
}
