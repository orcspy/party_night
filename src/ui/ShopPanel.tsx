import { useState } from 'react'
import { EQUIPMENT_DATA, ITEM_DATA } from '../game/content'
import { getEquipmentSlotDisplayName, getSkillDisplayName } from '../game/displayNames'
import { usedStorageSlots } from '../game/inventory'
import { getAvailableEquipmentIds, getAvailableItemIds, getSkillPrice } from '../game/shop'
import type { GameCommand, ProfileV2 } from '../game/types'
import { ContentIcon } from './ContentIcon'
import { getCustomSkillAllowedClassLabel, getEquipmentPresentation, getItemEffectDescription, getItemPresentation, getPositiveEquipmentModifierLabels, getSkillPresentation } from './contentPresentation'
import { SkillInfoTable } from './SkillInfoTable'

type ShopCategory = 'equipment' | 'item' | 'skill' | 'skill_info'

export function ShopPanel({ profile, dispatch }: { profile: ProfileV2; dispatch: (command: GameCommand) => void }) {
  const [category, setCategory] = useState<ShopCategory>('equipment')
  const [quantity, setQuantity] = useState(1)
  const storageFull = usedStorageSlots(profile) >= profile.storage.capacity
  const skillPrice = getSkillPrice(profile)
  return (
    <div className="management-panel">
      <header className="management-toolbar">
        <h2>상점</h2>
        <div className="category-buttons">
          <button className={category === 'equipment' ? 'active' : ''} onClick={() => setCategory('equipment')}>장비</button>
          <button className={category === 'item' ? 'active' : ''} onClick={() => setCategory('item')}>아이템</button>
          <button className={category === 'skill' ? 'active' : ''} disabled={profile.shop.skillOfferIds.length === 0} onClick={() => setCategory('skill')}>스킬</button>
          <button className={category === 'skill_info' ? 'active' : ''} onClick={() => setCategory('skill_info')}>스킬 정보</button>
        </div>
      </header>
      {storageFull && category !== 'skill_info' && <p className="warning">창고가 가득 차 모든 구매가 차단되었습니다.</p>}
      {category === 'skill_info' ? <SkillInfoTable /> : <div className="management-list shop-list">
        {category === 'equipment' && getAvailableEquipmentIds(profile).map((equipmentId) => {
          const definition = EQUIPMENT_DATA[equipmentId]
          const presentation = getEquipmentPresentation(equipmentId)
          const compatible = profile.characters.some((character) => definition.allowedClasses.includes(character.classId))
          const modifierLabels = getPositiveEquipmentModifierLabels(equipmentId)
          return <article key={equipmentId} className="content-row" data-rarity={presentation.rarity}><span className="content-identity"><ContentIcon {...presentation} /><span className="content-copy"><b className="content-name">{presentation.label}</b><small><span className="rarity-badge">{presentation.rarityLabel}</span> · G {definition.buyPrice} · {getEquipmentSlotDisplayName(definition.slot)}{modifierLabels.length > 0 && ` · ${modifierLabels.join(' · ')}`}{!compatible && <> · <span className="equipment-compatibility-warning">현재 파티 장착 불가</span></>}</small></span></span><button disabled={storageFull || profile.gold < definition.buyPrice} onClick={() => dispatch({ type: 'BUY_EQUIPMENT', equipmentId })}>구매</button></article>
        })}
        {category === 'item' && <><label className="quantity-control">구매 수량<input type="number" min="1" max="10" value={quantity} onChange={(event) => setQuantity(Math.min(10, Math.max(1, Number(event.target.value) || 1)))} /></label>{getAvailableItemIds(profile).map((itemId) => {
          const definition = ITEM_DATA[itemId]
          const presentation = getItemPresentation(itemId)
          return <article key={itemId}><span className="content-identity"><ContentIcon {...presentation} /><span className="content-copy"><b>{presentation.label}</b><small>개당 G {definition.buyPrice} · {getItemEffectDescription(itemId)}</small></span></span><button disabled={storageFull || profile.gold < definition.buyPrice * quantity} onClick={() => dispatch({ type: 'BUY_ITEM', itemId, quantity })}>구매</button></article>
        })}</>}
        {category === 'skill' && profile.shop.skillOfferIds.map((skillId) => {
          const presentation = getSkillPresentation(skillId)
          return <article key={skillId}><span className="content-identity"><ContentIcon {...presentation} /><span className="content-copy"><b>{getSkillDisplayName(skillId)}</b><small>G {skillPrice} · 사용 가능 직업: {getCustomSkillAllowedClassLabel(skillId)}</small></span></span><button disabled={storageFull || profile.gold < skillPrice} onClick={() => dispatch({ type: 'BUY_SKILL', skillId })}>구매</button></article>
        })}
      </div>}
      {category !== 'skill_info' && <p className="muted">구매한 소비 아이템은 창고에서 캐릭터에게 배분한 뒤 원정에서 사용할 수 있습니다.</p>}
    </div>
  )
}
