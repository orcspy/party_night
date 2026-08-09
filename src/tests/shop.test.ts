import { describe, expect, it } from 'vitest'
import { createProfile } from '../game/gameEngine'
import { settleAncientSite, settleGoblinDen, settleTrainingRuins } from '../game/rewards'
import { buyEquipment, buyItem, buySkill, COMMON_EQUIPMENT_IDS, generateSkillOffers, getAvailableEquipmentIds, getAvailableItemIds, INITIAL_ITEM_IDS, sellEquipment, sellItem } from '../game/shop'
import type { ItemStack, ProfileV2 } from '../game/types'

function profile(): ProfileV2 {
  return createProfile({
    type: 'CREATE_PROFILE',
    mainCharacterConfig: { name: '상점테스터', raceId: 'human', classId: 'warrior', gender: '남성' },
    profileId: 'profile_shop', createdAt: 1, rootSeed: 2,
  })!
}

describe('common equipment and initial item shop', () => {
  it('offers nine common equipment entries and three initial consumables', () => {
    expect(COMMON_EQUIPMENT_IDS).toHaveLength(9)
    expect(INITIAL_ITEM_IDS).toEqual(['minor_healing_potion', 'bandage', 'remedy'])
  })

  it('unlocks all nine uncommon equipment offers after training ruins', () => {
    const settled = settleTrainingRuins({ ...profile(), gold: 1000 }, 7, 'expedition_1')
    if (!settled.ok) throw new Error(settled.error)
    expect(getAvailableEquipmentIds(settled.value.profile)).toHaveLength(18)
    expect(buyEquipment(settled.value.profile, 'uncommon_head').ok).toBe(true)
  })

  it('unlocks Q1 items and deterministically purchases a skill offer', () => {
    const trained = settleTrainingRuins({ ...profile(), gold: 1000 }, 7, 'expedition_1')
    if (!trained.ok) throw new Error(trained.error)
    expect(getAvailableItemIds(trained.value.profile)).toContain('fire_bomb')
    const offers = generateSkillOffers(trained.value.profile.random.rootSeed, 1)
    const withOffers = { ...trained.value.profile, shop: { ...trained.value.profile.shop, skillOfferIds: offers } }
    const bought = buySkill(withOffers, offers[0])
    expect(bought.ok).toBe(true)
    if (!bought.ok) return
    expect(bought.value.gold).toBe(1120)
    expect(bought.value.shop.skillOfferIds).not.toContain(offers[0])
  })

  it('unlocks nine rare equipment entries and Q3 consumables after ancient site', () => {
    const trained = settleTrainingRuins({ ...profile(), gold: 10000 }, 7, 'expedition_1')
    if (!trained.ok) throw new Error(trained.error)
    const goblin = settleGoblinDen(trained.value.profile, 8, 'expedition_2', [])
    if (!goblin.ok) throw new Error(goblin.error)
    const ancient = settleAncientSite(goblin.value.profile, 9, 'expedition_3', [])
    if (!ancient.ok) throw new Error(ancient.error)
    expect(getAvailableEquipmentIds(ancient.value.profile)).toHaveLength(27)
    expect(getAvailableItemIds(ancient.value.profile)).toEqual(['minor_healing_potion', 'bandage', 'remedy', 'fire_bomb', 'survey_chalk', 'greater_healing_potion', 'might_tonic', 'haste_tonic'])
    expect(buyEquipment(ancient.value.profile, 'rare_bow').ok).toBe(true)
    expect(buyItem(ancient.value.profile, 'greater_healing_potion', 1).ok).toBe(true)
    expect(buyItem(ancient.value.profile, 'panacea', 1).ok).toBe(false)
  })

  it('buys equipment into storage with a deterministic instance ID', () => {
    const result = buyEquipment(profile(), 'common_head')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.gold).toBe(230)
    expect(result.value.storage.equipmentInstances).toEqual([{ equipmentInstanceId: 'equipment_5', equipmentId: 'common_head' }])
    expect(result.value.random.nextInstanceSequence).toBe(6)
  })

  it('fills item stacks before allocating chunks', () => {
    const base = profile()
    const candidate = { ...base, storage: { ...base.storage, itemStacks: [{ stackId: 'item_stack_8', itemId: 'bandage', quantity: 7 }] }, random: { ...base.random, nextInstanceSequence: 9 } }
    const result = buyItem(candidate, 'bandage', 8)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.storage.itemStacks).toEqual([
      { stackId: 'item_stack_8', itemId: 'bandage', quantity: 10 },
      { stackId: 'item_stack_9', itemId: 'bandage', quantity: 5 },
    ])
    expect(result.value.gold).toBe(140)
  })

  it('blocks every purchase at exactly 100 storage slots', () => {
    const base = { ...profile(), gold: 10000 }
    const stacks: ItemStack[] = Array.from({ length: 100 }, (_, index) => ({ stackId: `item_stack_${100 + index}`, itemId: 'bandage', quantity: index === 0 ? 1 : 10 }))
    const full: ProfileV2 = { ...base, storage: { ...base.storage, itemStacks: stacks }, random: { ...base.random, nextInstanceSequence: 300 } }
    const result = buyItem(full, 'bandage', 1)
    expect(result.ok).toBe(false)
    expect(full.storage.itemStacks[0].quantity).toBe(1)
    expect(full.random.nextInstanceSequence).toBe(300)
  })

  it('sells only storage entries at half price and supports partial item sales', () => {
    const base: ProfileV2 = {
      ...profile(),
      storage: {
        capacity: 100,
        equipmentInstances: [{ equipmentInstanceId: 'equipment_20', equipmentId: 'common_sword' }],
        itemStacks: [{ stackId: 'item_stack_21', itemId: 'remedy', quantity: 5 }],
        skillInstances: [],
      },
    }
    const soldEquipment = sellEquipment(base, 'equipment_20')
    expect(soldEquipment.ok && soldEquipment.value.gold).toBe(350)
    if (!soldEquipment.ok) return
    const soldItems = sellItem(soldEquipment.value, 'item_stack_21', 2)
    expect(soldItems.ok && soldItems.value.gold).toBe(390)
    expect(soldItems.ok && soldItems.value.storage.itemStacks[0].quantity).toBe(3)
  })
})
