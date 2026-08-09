import { CUSTOM_SKILL_DATA, EQUIPMENT_DATA, ITEM_DATA, type CustomSkillId } from './content'
import { addEquipmentToStorage, addItemQuantityToStorage, allocateUniqueId, usedStorageSlots, type RuleResult } from './inventory'
import { normalizeSeed, randomIndex } from './rng'
import type { ItemId, ProfileV2 } from './types'

export const COMMON_EQUIPMENT_IDS = Object.keys(EQUIPMENT_DATA).filter((id) => EQUIPMENT_DATA[id].rarity === 'common')
export const INITIAL_ITEM_IDS: ItemId[] = ['minor_healing_potion', 'bandage', 'remedy']

export function getAvailableItemIds(profile: ProfileV2): ItemId[] {
  const items = [...INITIAL_ITEM_IDS]
  if (profile.questProgress.completedQuestIds.includes('training_ruins_quest')) items.push('fire_bomb', 'survey_chalk')
  if (profile.questProgress.completedQuestIds.includes('ancient_site_quest')) items.push('greater_healing_potion', 'might_tonic', 'haste_tonic')
  if (profile.questProgress.completedQuestIds.includes('underground_dungeon_quest')) items.push('panacea')
  return items
}

export function getAvailableEquipmentIds(profile: ProfileV2): string[] {
  return Object.keys(EQUIPMENT_DATA).filter((id) => profile.shop.unlockedRarities.includes(EQUIPMENT_DATA[id].rarity))
}

function validQuantity(quantity: number): boolean {
  return Number.isSafeInteger(quantity) && quantity >= 1
}

function canAfford(profile: ProfileV2, price: number): boolean {
  return Number.isSafeInteger(price) && price >= 0 && profile.gold >= price
}

export function buyEquipment(profile: ProfileV2, equipmentId: string): RuleResult<ProfileV2> {
  const definition = EQUIPMENT_DATA[equipmentId]
  if (!definition || !profile.shop.unlockedRarities.includes(definition.rarity)) return { ok: false, error: '구매할 수 없는 장비다.' }
  if (usedStorageSlots(profile) >= profile.storage.capacity) return { ok: false, error: '공용 창고가 가득 찼다.' }
  if (!canAfford(profile, definition.buyPrice)) return { ok: false, error: '골드가 부족하다.' }
  const added = addEquipmentToStorage(profile, equipmentId)
  if (!added.ok) return added
  return { ok: true, value: { ...added.value, gold: added.value.gold - definition.buyPrice } }
}

export function buyItem(profile: ProfileV2, itemId: string, quantity: number): RuleResult<ProfileV2> {
  const definition = ITEM_DATA[itemId as ItemId]
  if (!definition || !getAvailableItemIds(profile).includes(itemId as ItemId) || !validQuantity(quantity)) return { ok: false, error: '구매할 아이템과 수량을 확인해야 한다.' }
  if (usedStorageSlots(profile) >= profile.storage.capacity) return { ok: false, error: '공용 창고가 가득 찼다.' }
  const total = definition.buyPrice * quantity
  if (!Number.isSafeInteger(total) || !canAfford(profile, total)) return { ok: false, error: '골드가 부족하다.' }
  const added = addItemQuantityToStorage(profile, itemId as ItemId, quantity)
  if (!added.ok) return added
  return { ok: true, value: { ...added.value, gold: added.value.gold - total } }
}

export function generateSkillOffers(rootSeed: number, revision: number): string[] {
  let state = normalizeSeed(rootSeed ^ Math.imul(revision + 1, 0x45d9f3b) ^ 0x7a11e5)
  const pool = Object.keys(CUSTOM_SKILL_DATA) as CustomSkillId[]
  const offers: string[] = []
  for (let count = 0; count < 3; count++) {
    const selected = randomIndex(state, pool.length)
    state = selected.state
    offers.push(pool.splice(selected.value, 1)[0])
  }
  return offers
}

export function getSkillPrice(profile: ProfileV2): number {
  const maximumLevel = Math.max(...profile.characters.map((character) => character.level))
  return maximumLevel >= 10 ? 650 : maximumLevel >= 7 ? 420 : 180
}

export function buySkill(profile: ProfileV2, skillId: string): RuleResult<ProfileV2> {
  if (!profile.shop.skillOfferIds.includes(skillId) || !(skillId in CUSTOM_SKILL_DATA)) return { ok: false, error: '현재 판매 중인 스킬이 아니다.' }
  if (usedStorageSlots(profile) >= profile.storage.capacity) return { ok: false, error: '공용 창고가 가득 찼다.' }
  const price = getSkillPrice(profile)
  if (profile.gold < price) return { ok: false, error: '골드가 부족하다.' }
  const allocated = allocateUniqueId(profile, 'skill')
  return {
    ok: true,
    value: {
      ...allocated.profile,
      gold: allocated.profile.gold - price,
      storage: { ...allocated.profile.storage, skillInstances: [...allocated.profile.storage.skillInstances, { skillInstanceId: allocated.id, skillId }] },
      shop: { ...allocated.profile.shop, skillOfferIds: allocated.profile.shop.skillOfferIds.filter((id) => id !== skillId) },
    },
  }
}

export function sellSkill(profile: ProfileV2, skillInstanceId: string): RuleResult<ProfileV2> {
  const instance = profile.storage.skillInstances.find((item) => item.skillInstanceId === skillInstanceId)
  if (!instance) return { ok: false, error: '판매할 스킬을 찾을 수 없다.' }
  return { ok: true, value: { ...profile, gold: profile.gold + Math.floor(getSkillPrice(profile) * 0.5), storage: { ...profile.storage, skillInstances: profile.storage.skillInstances.filter((item) => item.skillInstanceId !== skillInstanceId) } } }
}

export function sellEquipment(profile: ProfileV2, equipmentInstanceId: string): RuleResult<ProfileV2> {
  const instance = profile.storage.equipmentInstances.find((item) => item.equipmentInstanceId === equipmentInstanceId)
  const definition = instance ? EQUIPMENT_DATA[instance.equipmentId] : undefined
  if (!instance || !definition) return { ok: false, error: '판매할 장비를 찾을 수 없다.' }
  const price = Math.floor(definition.buyPrice * 0.5)
  if (!Number.isSafeInteger(profile.gold + price)) return { ok: false, error: '골드 값을 처리할 수 없다.' }
  return {
    ok: true,
    value: {
      ...profile,
      gold: profile.gold + price,
      storage: { ...profile.storage, equipmentInstances: profile.storage.equipmentInstances.filter((item) => item.equipmentInstanceId !== equipmentInstanceId) },
    },
  }
}

export function sellItem(profile: ProfileV2, stackId: string, quantity: number): RuleResult<ProfileV2> {
  const stack = profile.storage.itemStacks.find((item) => item.stackId === stackId)
  const definition = stack ? ITEM_DATA[stack.itemId as ItemId] : undefined
  if (!stack || !definition || !validQuantity(quantity) || quantity > stack.quantity) return { ok: false, error: '판매할 아이템과 수량을 확인해야 한다.' }
  const price = Math.floor(definition.buyPrice * 0.5) * quantity
  if (!Number.isSafeInteger(price) || !Number.isSafeInteger(profile.gold + price)) return { ok: false, error: '골드 값을 처리할 수 없다.' }
  const remaining = stack.quantity - quantity
  return {
    ok: true,
    value: {
      ...profile,
      gold: profile.gold + price,
      storage: {
        ...profile.storage,
        itemStacks: remaining > 0
          ? profile.storage.itemStacks.map((item) => item.stackId === stackId ? { ...item, quantity: remaining } : item)
          : profile.storage.itemStacks.filter((item) => item.stackId !== stackId),
      },
    },
  }
}
