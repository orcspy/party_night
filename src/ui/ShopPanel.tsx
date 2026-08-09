import { useState } from 'react'
import { EQUIPMENT_DATA, ITEM_DATA } from '../game/content'
import { getEquipmentSlotDisplayName, getSkillDisplayName } from '../game/displayNames'
import { usedStorageSlots } from '../game/inventory'
import { getAvailableEquipmentIds, getAvailableItemIds } from '../game/shop'
import type { GameCommand, ProfileV2 } from '../game/types'

export function ShopPanel({ profile, dispatch }: { profile: ProfileV2; dispatch: (command: GameCommand) => void }) {
  const [category, setCategory] = useState<'equipment' | 'item' | 'skill'>('equipment')
  const [quantity, setQuantity] = useState(1)
  const storageFull = usedStorageSlots(profile) >= profile.storage.capacity
  return (
    <div className="management-panel">
      <header className="management-toolbar"><h2>상점</h2><div className="category-buttons"><button className={category === 'equipment' ? 'active' : ''} onClick={() => setCategory('equipment')}>장비</button><button className={category === 'item' ? 'active' : ''} onClick={() => setCategory('item')}>아이템</button><button className={category === 'skill' ? 'active' : ''} disabled={profile.shop.skillOfferIds.length === 0} onClick={() => setCategory('skill')}>스킬</button></div></header>
      {storageFull && <p className="warning">창고가 가득 차 모든 구매가 차단되었습니다.</p>}
      <div className="management-list shop-list">
        {category === 'equipment' && getAvailableEquipmentIds(profile).map((equipmentId) => {
          const definition = EQUIPMENT_DATA[equipmentId]
          const compatible = profile.characters.some((character) => definition.allowedClasses.includes(character.classId))
          return <article key={equipmentId}><span><b>{definition.name}</b><small>G {definition.buyPrice} · {getEquipmentSlotDisplayName(definition.slot)} · {compatible ? '파티 장착 가능' : '현재 파티 장착 불가'}</small></span><button disabled={storageFull || profile.gold < definition.buyPrice} onClick={() => dispatch({ type: 'BUY_EQUIPMENT', equipmentId })}>구매</button></article>
        })}
        {category === 'item' && <><label className="quantity-control">구매 수량<input type="number" min="1" max="10" value={quantity} onChange={(event) => setQuantity(Math.min(10, Math.max(1, Number(event.target.value) || 1)))} /></label>{getAvailableItemIds(profile).map((itemId) => {
          const definition = ITEM_DATA[itemId]
          return <article key={itemId}><span><b>{definition.name}</b><small>개당 G {definition.buyPrice} · 합계 G {definition.buyPrice * quantity}</small></span><button disabled={storageFull || profile.gold < definition.buyPrice * quantity} onClick={() => dispatch({ type: 'BUY_ITEM', itemId, quantity })}>구매</button></article>
        })}</>}
        {category === 'skill' && profile.shop.skillOfferIds.map((skillId) => <article key={skillId}><span><b>{getSkillDisplayName(skillId)}</b><small>G 180 · 구매 시 고유 인스턴스 생성</small></span><button disabled={storageFull || profile.gold < 180} onClick={() => dispatch({ type: 'BUY_SKILL', skillId })}>구매</button></article>)}
      </div>
      <p className="muted">구매한 소비 아이템은 창고에서 캐릭터에게 배분한 뒤 원정에서 사용할 수 있습니다.</p>
    </div>
  )
}
