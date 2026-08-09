import { useState } from 'react'
import { CUSTOM_SKILL_ALLOWED_CLASSES, EQUIPMENT_DATA, type CustomSkillId } from '../game/content'
import { getEquipmentDisplayName, getEquipmentSlotDisplayName, getItemDisplayName, getSkillDisplayName } from '../game/displayNames'
import type { GameCommand, ProfileV2 } from '../game/types'
import { ContentIcon } from './ContentIcon'
import { getEquipmentPresentation, getItemPresentation, getSkillPresentation } from './contentPresentation'

export function StoragePanel({ profile, dispatch }: { profile: ProfileV2; dispatch: (command: GameCommand) => void }) {
  const [characterId, setCharacterId] = useState(profile.characters[0].characterId)
  const character = profile.characters.find((item) => item.characterId === characterId) ?? profile.characters[0]
  return (
    <div className="management-panel">
      <header className="management-toolbar"><h2>통합 공용 창고</h2><label>대상 캐릭터<select value={character.characterId} onChange={(event) => setCharacterId(event.target.value)}>{profile.characters.map((item) => <option key={item.characterId} value={item.characterId}>{item.name}</option>)}</select></label></header>
      <h3>장비</h3>
      <div className="management-list">
        {profile.storage.equipmentInstances.length === 0 && <p className="muted">보관 중인 장비가 없습니다.</p>}
        {profile.storage.equipmentInstances.map((instance) => {
          const definition = EQUIPMENT_DATA[instance.equipmentId]
          const presentation = getEquipmentPresentation(instance.equipmentId)
          const compatible = definition?.allowedClasses.includes(character.classId)
          return <article key={instance.equipmentInstanceId} className="content-row" data-rarity={presentation.rarity}><span className="content-identity"><ContentIcon {...presentation} /><span className="content-copy"><b className="content-name">{getEquipmentDisplayName(instance.equipmentId)}</b><small>{presentation.rarityLabel && <><span className="rarity-badge">{presentation.rarityLabel}</span> · </>}{definition ? getEquipmentSlotDisplayName(definition.slot) : '알 수 없는 슬롯'} · {definition?.twoHanded ? '양손' : '한손'} · {compatible ? '장착 가능' : '직업 제한'}</small></span></span><div><button disabled={!compatible} onClick={() => dispatch({ type: 'EQUIP_ITEM', characterId: character.characterId, equipmentInstanceId: instance.equipmentInstanceId })}>장착</button><button onClick={() => dispatch({ type: 'SELL_EQUIPMENT', equipmentInstanceId: instance.equipmentInstanceId })}>판매</button></div></article>
        })}
      </div>
      <h3>소비 아이템</h3>
      <div className="management-list">
        {profile.storage.itemStacks.length === 0 && <p className="muted">보관 중인 아이템이 없습니다.</p>}
        {profile.storage.itemStacks.map((stack) => {
          const presentation = getItemPresentation(stack.itemId)
          return <article key={stack.stackId}><span className="content-identity"><ContentIcon {...presentation} /><span className="content-copy"><b>{getItemDisplayName(stack.itemId)}</b><small>{stack.quantity}/10</small></span></span><div><button onClick={() => dispatch({ type: 'MOVE_ITEM_TO_CHARACTER', characterId: character.characterId, stackId: stack.stackId, quantity: 1 })}>1개 배분</button><button onClick={() => dispatch({ type: 'MOVE_ITEM_TO_CHARACTER', characterId: character.characterId, stackId: stack.stackId, quantity: stack.quantity })}>전체 배분</button><button onClick={() => dispatch({ type: 'SELL_ITEM', stackId: stack.stackId, quantity: 1 })}>1개 판매</button></div></article>
        })}
      </div>
      <h3>스킬</h3>
      <div className="management-list">
        {profile.storage.skillInstances.length === 0 && <p className="muted">보관 중인 커스텀 스킬이 없습니다.</p>}
        {profile.storage.skillInstances.map((instance) => {
          const slotIndex = character.customSkillSlots.findIndex((slot, index) => !slot && character.level >= [3, 7, 10][index])
          const compatible = CUSTOM_SKILL_ALLOWED_CLASSES[instance.skillId as CustomSkillId]?.includes(character.classId)
          const presentation = getSkillPresentation(instance.skillId)
          return <article key={instance.skillInstanceId}><span className="content-identity"><ContentIcon {...presentation} /><span className="content-copy"><b>{getSkillDisplayName(instance.skillId)}</b><small>{instance.skillInstanceId} · {compatible ? '장착 가능' : '직업 제한'}</small></span></span><div><button disabled={!compatible || slotIndex < 0} onClick={() => dispatch({ type: 'EQUIP_CUSTOM_SKILL', characterId: character.characterId, skillInstanceId: instance.skillInstanceId, slotIndex })}>장착</button><button onClick={() => dispatch({ type: 'SELL_SKILL', skillInstanceId: instance.skillInstanceId })}>판매</button></div></article>
        })}
      </div>
    </div>
  )
}
