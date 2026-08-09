import { describe, expect, it } from 'vitest'
import { createProfile } from '../game/gameEngine'
import { consumeCharacterItem, equipCustomSkill, equipEquipment, getInventoryCapacity, moveItemToCharacter, unequipCustomSkill, unequipEquipment, usedStorageSlots } from '../game/inventory'
import { applyExperience } from '../game/characters'
import type { ItemStack, ProfileV2 } from '../game/types'

function profile(classId: 'warrior' | 'rogue' = 'warrior'): ProfileV2 {
  return createProfile({
    type: 'CREATE_PROFILE',
    mainCharacterConfig: { name: '인벤테스터', raceId: 'human', classId, gender: '남성' },
    profileId: 'profile_inventory', createdAt: 1, rootSeed: 2,
  })!
}

describe('integrated storage and personal inventory', () => {
  it('counts equipment, item, and skill storage entries', () => {
    const base = profile()
    const candidate = {
      ...base,
      storage: {
        ...base.storage,
        equipmentInstances: [{ equipmentInstanceId: 'equipment_20', equipmentId: 'common_head' }],
        itemStacks: [{ stackId: 'item_stack_21', itemId: 'bandage', quantity: 2 }],
        skillInstances: [{ skillInstanceId: 'skill_22', skillId: 'first_aid' }],
      },
    }
    expect(usedStorageSlots(candidate)).toBe(3)
  })

  it('fills a partial personal stack before allocating a deterministic split stack', () => {
    const base = profile()
    const main = { ...base.characters[0], inventorySlots: [{ stackId: 'item_stack_30', itemId: 'bandage', quantity: 6 }] }
    const candidate: ProfileV2 = {
      ...base,
      characters: [main, base.characters[1], base.characters[2], base.characters[3]],
      storage: { ...base.storage, itemStacks: [{ stackId: 'item_stack_31', itemId: 'bandage', quantity: 10 }] },
      random: { ...base.random, nextInstanceSequence: 32 },
    }
    const moved = moveItemToCharacter(candidate, main.characterId, 'item_stack_31', 7)
    expect(moved.ok).toBe(true)
    if (!moved.ok) return
    expect(moved.value.storage.itemStacks).toEqual([{ stackId: 'item_stack_31', itemId: 'bandage', quantity: 3 }])
    expect(moved.value.characters[0].inventorySlots).toEqual([
      { stackId: 'item_stack_30', itemId: 'bandage', quantity: 10 },
      { stackId: 'item_stack_32', itemId: 'bandage', quantity: 3 },
    ])
    expect(moved.value.random.nextInstanceSequence).toBe(33)
  })

  it('preserves a stack ID when moving the complete stack', () => {
    const base = profile()
    const candidate = { ...base, storage: { ...base.storage, itemStacks: [{ stackId: 'item_stack_40', itemId: 'remedy', quantity: 4 }] } }
    const moved = moveItemToCharacter(candidate, base.characters[0].characterId, 'item_stack_40', 4)
    expect(moved.ok && moved.value.characters[0].inventorySlots[0]).toEqual({ stackId: 'item_stack_40', itemId: 'remedy', quantity: 4 })
  })

  it('rejects class-incompatible equipment without changing the profile', () => {
    const base = profile('rogue')
    const candidate = { ...base, storage: { ...base.storage, equipmentInstances: [{ equipmentInstanceId: 'equipment_50', equipmentId: 'common_shield' }] } }
    const result = equipEquipment(candidate, base.characters[0].characterId, 'equipment_50')
    expect(result).toEqual({ ok: false, error: '해당 직업이 장착할 수 없는 장비다.' })
    expect(candidate.storage.equipmentInstances).toHaveLength(1)
  })

  it('equips a two-handed weapon and returns the old weapon and offhand', () => {
    const base = profile()
    const main = {
      ...base.characters[0],
      equipment: { ...base.characters[0].equipment, offhand: { equipmentInstanceId: 'equipment_60', equipmentId: 'common_shield' } },
    }
    const candidate: ProfileV2 = {
      ...base,
      characters: [main, base.characters[1], base.characters[2], base.characters[3]],
      storage: { ...base.storage, equipmentInstances: [{ equipmentInstanceId: 'equipment_61', equipmentId: 'common_bow' }] },
    }
    const result = equipEquipment(candidate, main.characterId, 'equipment_61')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.characters[0].equipment.weapon?.equipmentId).toBe('common_bow')
    expect(result.value.characters[0].equipment.offhand).toBeNull()
    expect(result.value.storage.equipmentInstances.map((item) => item.equipmentId).sort()).toEqual(['common_shield', 'common_sword'])
  })

  it('rejects STR equipment removal when personal stack capacity would be exceeded', () => {
    const base = profile()
    const main = base.characters[0]
    const capacityWithSword = getInventoryCapacity(main)
    const stacks: ItemStack[] = Array.from({ length: capacityWithSword }, (_, index) => ({ stackId: `item_stack_${100 + index}`, itemId: 'bandage', quantity: 10 }))
    const loaded = { ...main, inventorySlots: stacks }
    const candidate: ProfileV2 = { ...base, characters: [loaded, base.characters[1], base.characters[2], base.characters[3]] }
    const weapon = loaded.equipment.weapon!
    const result = unequipEquipment(candidate, loaded.characterId, 'weapon', weapon.equipmentInstanceId)
    expect(result.ok).toBe(false)
    expect(candidate.characters[0].equipment.weapon).toBe(weapon)
  })

  it('moves one custom skill instance through an unlocked Lv3 slot', () => {
    const base = profile('rogue')
    const level2 = applyExperience(base.characters[0], 100).character
    const level3 = applyExperience(level2, 100).character
    const candidate: ProfileV2 = {
      ...base,
      characters: [level3, base.characters[1], base.characters[2], base.characters[3]],
      storage: { ...base.storage, skillInstances: [{ skillInstanceId: 'skill_50', skillId: 'neurotoxin' }] },
      random: { ...base.random, nextInstanceSequence: 51 },
    }
    const equipped = equipCustomSkill(candidate, level3.characterId, 'skill_50', 0)
    expect(equipped.ok && equipped.value.characters[0].customSkillSlots[0]?.skillInstanceId).toBe('skill_50')
    if (!equipped.ok) return
    const returned = unequipCustomSkill(equipped.value, level3.characterId, 'skill_50', 0)
    expect(returned.ok && returned.value.storage.skillInstances[0].skillInstanceId).toBe('skill_50')
  })

  it('consumes exactly one personally carried item and rejects a wrong owner atomically', () => {
    const base = profile()
    const main = { ...base.characters[0], inventorySlots: [{ stackId: 'item_stack_70', itemId: 'fire_bomb', quantity: 2 }] }
    const candidate: ProfileV2 = { ...base, characters: [main, base.characters[1], base.characters[2], base.characters[3]] }
    const consumed = consumeCharacterItem(candidate, main.characterId, 'item_stack_70', 'fire_bomb')
    expect(consumed.ok && consumed.value.characters[0].inventorySlots[0].quantity).toBe(1)
    expect(consumeCharacterItem(candidate, base.characters[1].characterId, 'item_stack_70', 'fire_bomb').ok).toBe(false)
    expect(candidate.characters[0].inventorySlots[0].quantity).toBe(2)
  })
})
