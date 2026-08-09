import { describe, expect, it } from 'vitest'
import { clearProfileV2, PROFILE_V2_KEY, readProfileV2, writeProfileV2 } from '../app/saveV2'
import { createProfile } from '../game/gameEngine'
import { equipCustomSkill } from '../game/inventory'
import { settleGoblinDen, settleTrainingRuins } from '../game/rewards'
import type { ProfileV2 } from '../game/types'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial))
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

function validProfile(): ProfileV2 {
  return createProfile({
    type: 'CREATE_PROFILE',
    mainCharacterConfig: { name: '저장테스터', raceId: 'halfling', classId: 'mage', gender: '여성' },
    profileId: 'profile_save_test', createdAt: 123, rootSeed: 456,
  })!
}

describe('profile v2 save adapter', () => {
  it('round-trips a valid profile', () => {
    const storage = memoryStorage()
    const profile = validProfile()
    expect(writeProfileV2(profile, storage)).toBe(true)
    expect(readProfileV2(storage)).toEqual(profile)
  })

  it('ignores and preserves the version 1 key', () => {
    const v1Key = 'party_night_mvp_save_v1'
    const storage = memoryStorage({ [v1Key]: '{"version":1}' })
    expect(readProfileV2(storage)).toBeNull()
    expect(clearProfileV2(storage)).toBe(true)
    expect(storage.getItem(v1Key)).toBe('{"version":1}')
  })

  it('rejects invariant violations without overwriting a valid save', () => {
    const storage = memoryStorage()
    const profile = validProfile()
    expect(writeProfileV2(profile, storage)).toBe(true)
    const previous = storage.getItem(PROFILE_V2_KEY)
    const invalid = { ...profile, characters: profile.characters.slice(0, 3) } as unknown as ProfileV2
    expect(writeProfileV2(invalid, storage)).toBe(false)
    expect(storage.getItem(PROFILE_V2_KEY)).toBe(previous)
  })

  it('rejects duplicate instance ownership and malformed envelopes', () => {
    const profile = validProfile()
    const duplicated = {
      ...profile,
      storage: { ...profile.storage, equipmentInstances: [profile.characters[0].equipment.weapon!] },
    }
    const storage = memoryStorage({ [PROFILE_V2_KEY]: JSON.stringify({ version: 2, profile: duplicated }) })
    expect(readProfileV2(storage)).toBeNull()
    storage.setItem(PROFILE_V2_KEY, '{invalid')
    expect(readProfileV2(storage)).toBeNull()
  })

  it('rejects unknown items and personal inventory capacity overflow', () => {
    const profile = validProfile()
    const unknownItem = {
      ...profile,
      storage: { ...profile.storage, itemStacks: [{ stackId: 'item_stack_50', itemId: 'unknown_item', quantity: 1 }] },
    } as unknown as ProfileV2
    expect(writeProfileV2(unknownItem, memoryStorage())).toBe(false)

    const overloadedMain = {
      ...profile.characters[0],
      inventorySlots: Array.from({ length: 14 }, (_, index) => ({ stackId: `item_stack_${100 + index}`, itemId: 'bandage', quantity: 1 })),
    }
    const overloaded: ProfileV2 = {
      ...profile,
      characters: [overloadedMain, profile.characters[1], profile.characters[2], profile.characters[3]],
    }
    expect(writeProfileV2(overloaded, memoryStorage())).toBe(false)
  })

  it('round-trips an overflow reward claim for reload recovery', () => {
    const profile = validProfile()
    const crowded: ProfileV2 = {
      ...profile,
      storage: { ...profile.storage, itemStacks: Array.from({ length: 98 }, (_, index) => ({ stackId: `item_stack_${100 + index}`, itemId: 'bandage', quantity: 10 })) },
      random: { ...profile.random, nextInstanceSequence: 300 },
    }
    const settled = settleTrainingRuins(crowded, 77, 'expedition_1')
    if (!settled.ok) throw new Error(settled.error)
    const storage = memoryStorage()
    expect(writeProfileV2(settled.value.profile, storage)).toBe(true)
    expect(readProfileV2(storage)?.pendingReward).toEqual(settled.value.profile.pendingReward)
  })

  it('rejects level, EXP, and approved growth mismatches', () => {
    const profile = validProfile()
    const invalidCharacter = { ...profile.characters[0], level: 2, experience: 100 }
    const invalid: ProfileV2 = { ...profile, characters: [invalidCharacter, profile.characters[1], profile.characters[2], profile.characters[3]] }
    expect(writeProfileV2(invalid, memoryStorage())).toBe(false)
  })

  it('round-trips Lv3 offers and an equipped custom skill instance', () => {
    const trained = settleTrainingRuins(validProfile(), 1, 'expedition_1')
    if (!trained.ok) throw new Error(trained.error)
    const goblin = settleGoblinDen(trained.value.profile, 2, 'expedition_2', [])
    if (!goblin.ok) throw new Error(goblin.error)
    const sequence = goblin.value.profile.random.nextInstanceSequence
    const withSkill: ProfileV2 = {
      ...goblin.value.profile,
      storage: { ...goblin.value.profile.storage, skillInstances: [...goblin.value.profile.storage.skillInstances, { skillInstanceId: `skill_${sequence}`, skillId: 'first_aid' }] },
      random: { ...goblin.value.profile.random, nextInstanceSequence: sequence + 1 },
    }
    const equipped = equipCustomSkill(withSkill, 'party_main', `skill_${sequence}`, 0)
    if (!equipped.ok) throw new Error(equipped.error)
    const storage = memoryStorage()
    expect(writeProfileV2(equipped.value, storage)).toBe(true)
    expect(readProfileV2(storage)?.characters[0].customSkillSlots[0]?.skillId).toBe('first_aid')
    expect(readProfileV2(storage)?.shop.skillOfferIds.length).toBeLessThanOrEqual(3)
  })
})
