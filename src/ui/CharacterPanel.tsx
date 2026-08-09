import { useState } from 'react'
import { getUnlockedClassSkillIds } from '../game/characters'
import { CLASS_DATA, deriveCombatStats, getFinalAttributes, RACE_DATA } from '../game/content'
import { getEquipmentDisplayName, getEquipmentSlotDisplayName, getItemDisplayName, getSkillDisplayName } from '../game/displayNames'
import { getInventoryCapacity } from '../game/inventory'
import type { EquipmentSlot, GameCommand, ProfileV2 } from '../game/types'

const SLOTS: EquipmentSlot[] = ['weapon', 'offhand', 'head', 'body']

export function CharacterPanel({ profile, dispatch }: { profile: ProfileV2; dispatch: (command: GameCommand) => void }) {
  const [characterId, setCharacterId] = useState(profile.characters[0].characterId)
  const character = profile.characters.find((item) => item.characterId === characterId) ?? profile.characters[0]
  const attributes = getFinalAttributes(character)
  const stats = deriveCombatStats(attributes, CLASS_DATA[character.classId].derivation)
  const capacity = getInventoryCapacity(character)
  return (
    <div className="management-panel character-management">
      <header className="management-toolbar"><div><h2>{character.name}</h2><p>{RACE_DATA[character.raceId].name} · {CLASS_DATA[character.classId].name} · Lv {character.level}</p></div><label>캐릭터<select value={character.characterId} onChange={(event) => setCharacterId(event.target.value)}>{profile.characters.map((item) => <option key={item.characterId} value={item.characterId}>{item.name}</option>)}</select></label></header>
      <p className="stat-line">STR {attributes.str} · DEX {attributes.dex} · INT {attributes.int} · CON {attributes.con} · AGI {attributes.agi} · LUK {attributes.luck}</p>
      <p className="stat-line">HP {stats.maxHp} · ATK {stats.atk} · DEF {stats.def} · 전투 AGI {stats.agi}</p>
      <p className="stat-line">직업 스킬: {getUnlockedClassSkillIds(character.classId, character.level).map(getSkillDisplayName).join(' · ')}</p>
      <div className="management-list compact">{character.customSkillSlots.map((slot, index) => <article key={index}><span><b>커스텀 {index + 1}</b><small>{slot ? getSkillDisplayName(slot.skillId) : character.level >= [3,7,10][index] ? '비어 있음' : `Lv${[3,7,10][index]} 잠금`}</small></span>{slot && <button onClick={() => dispatch({ type: 'UNEQUIP_CUSTOM_SKILL', characterId: character.characterId, skillInstanceId: slot.skillInstanceId, slotIndex: index })}>해제</button>}</article>)}</div>
      <h3>장착 장비</h3>
      <div className="management-list compact">
        {SLOTS.map((slot) => {
          const instance = character.equipment[slot]
          return <article key={slot}><span><b>{getEquipmentSlotDisplayName(slot)}</b><small>{instance ? getEquipmentDisplayName(instance.equipmentId) : '비어 있음'}</small></span>{instance && <button onClick={() => dispatch({ type: 'UNEQUIP_ITEM', characterId: character.characterId, slot, equipmentInstanceId: instance.equipmentInstanceId })}>해제</button>}</article>
        })}
      </div>
      <h3>개인 인벤토리 {character.inventorySlots.length}/{capacity}</h3>
      <div className="management-list">
        {character.inventorySlots.length === 0 && <p className="muted">휴대한 아이템이 없습니다.</p>}
        {character.inventorySlots.map((stack) => <article key={stack.stackId}><span><b>{getItemDisplayName(stack.itemId)}</b><small>{stack.quantity}/10</small></span><div><button onClick={() => dispatch({ type: 'RETURN_ITEM_TO_STORAGE', characterId: character.characterId, stackId: stack.stackId, quantity: 1 })}>1개 반환</button><button onClick={() => dispatch({ type: 'RETURN_ITEM_TO_STORAGE', characterId: character.characterId, stackId: stack.stackId, quantity: stack.quantity })}>전체 반환</button></div></article>)}
      </div>
    </div>
  )
}
