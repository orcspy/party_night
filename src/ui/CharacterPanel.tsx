import { useState } from 'react'
import { getUnlockedClassSkillIds } from '../game/characters'
import { CLASS_DATA, deriveCombatStats, getFinalAttributes, RACE_DATA } from '../game/content'
import { getEquipmentDisplayName, getEquipmentSlotDisplayName, getItemDisplayName, getSkillDisplayName } from '../game/displayNames'
import { getInventoryCapacity } from '../game/inventory'
import type { EquipmentSlot, GameCommand, ProfileV2 } from '../game/types'
import { ContentIcon } from './ContentIcon'
import { getEquipmentPresentation, getItemPresentation, getSkillPresentation } from './contentPresentation'

const SLOTS: EquipmentSlot[] = ['weapon', 'offhand', 'head', 'body']

export function CharacterPanel({ profile, dispatch }: { profile: ProfileV2; dispatch: (command: GameCommand) => void }) {
  const [characterId, setCharacterId] = useState(profile.characters[0].characterId)
  const character = profile.characters.find((item) => item.characterId === characterId) ?? profile.characters[0]
  const attributes = getFinalAttributes(character)
  const stats = deriveCombatStats(attributes, CLASS_DATA[character.classId].derivation)
  const capacity = getInventoryCapacity(character)
  const classSkillIds = getUnlockedClassSkillIds(character.classId, character.level)
  return (
    <div className="management-panel character-management">
      <header className="management-toolbar"><div><h2>{character.name}</h2><p>{RACE_DATA[character.raceId].name} · {CLASS_DATA[character.classId].name} · Lv {character.level}</p></div><label>캐릭터<select value={character.characterId} onChange={(event) => setCharacterId(event.target.value)}>{profile.characters.map((item) => <option key={item.characterId} value={item.characterId}>{item.name}</option>)}</select></label></header>
      <p className="stat-line">STR {attributes.str} · DEX {attributes.dex} · INT {attributes.int} · CON {attributes.con} · AGI {attributes.agi} · LUK {attributes.luck}</p>
      <p className="stat-line">HP {stats.maxHp} · ATK {stats.atk} · DEF {stats.def} · 전투 AGI {stats.agi}</p>
      <div className="stat-line class-skills">직업 스킬: {classSkillIds.length > 0 ? <span className="content-inline-list">{classSkillIds.map((skillId) => {
        const presentation = getSkillPresentation(skillId)
        return <span className="content-inline" key={skillId}><ContentIcon {...presentation} size="small" />{getSkillDisplayName(skillId)}</span>
      })}</span> : '없음'}</div>
      <div className="management-list compact">{character.customSkillSlots.map((slot, index) => {
        const presentation = slot ? getSkillPresentation(slot.skillId) : null
        return <article key={index}><span className="content-copy character-loadout-copy"><small className="character-loadout-label">커스텀 {index + 1}</small>{slot && presentation ? <span className="content-identity character-loadout-identity"><ContentIcon {...presentation} size="small" /><b className="character-loadout-name">{getSkillDisplayName(slot.skillId)}</b></span> : <span className="character-loadout-empty">{character.level >= [3,7,10][index] ? '비어 있음' : `Lv${[3,7,10][index]} 잠금`}</span>}</span>{slot && <button onClick={() => dispatch({ type: 'UNEQUIP_CUSTOM_SKILL', characterId: character.characterId, skillInstanceId: slot.skillInstanceId, slotIndex: index })}>해제</button>}</article>
      })}</div>
      <h3>장착 장비</h3>
      <div className="management-list compact">
        {SLOTS.map((slot) => {
          const instance = character.equipment[slot]
          const presentation = instance ? getEquipmentPresentation(instance.equipmentId) : null
          return <article key={slot} className={presentation ? 'content-row' : undefined} data-rarity={presentation?.rarity}><span className="content-copy character-loadout-copy"><small className="character-loadout-label">{getEquipmentSlotDisplayName(slot)}</small>{instance && presentation ? <span className="content-identity character-loadout-identity"><ContentIcon {...presentation} size="small" /><b className="character-loadout-name content-name">{getEquipmentDisplayName(instance.equipmentId)}</b>{presentation.rarityLabel && <span className="rarity-badge">{presentation.rarityLabel}</span>}</span> : <span className="character-loadout-empty">비어 있음</span>}</span>{instance && <button onClick={() => dispatch({ type: 'UNEQUIP_ITEM', characterId: character.characterId, slot, equipmentInstanceId: instance.equipmentInstanceId })}>해제</button>}</article>
        })}
      </div>
      <h3>개인 인벤토리 {character.inventorySlots.length}/{capacity}</h3>
      <div className="management-list">
        {character.inventorySlots.length === 0 && <p className="muted">휴대한 아이템이 없습니다.</p>}
        {character.inventorySlots.map((stack) => {
          const presentation = getItemPresentation(stack.itemId)
          return <article key={stack.stackId}><span className="content-identity"><ContentIcon {...presentation} /><span className="content-copy"><b>{getItemDisplayName(stack.itemId)}</b><small>{stack.quantity}/10</small></span></span><div><button onClick={() => dispatch({ type: 'RETURN_ITEM_TO_STORAGE', characterId: character.characterId, stackId: stack.stackId, quantity: 1 })}>1개 반환</button><button onClick={() => dispatch({ type: 'RETURN_ITEM_TO_STORAGE', characterId: character.characterId, stackId: stack.stackId, quantity: stack.quantity })}>전체 반환</button></div></article>
        })}
      </div>
    </div>
  )
}
