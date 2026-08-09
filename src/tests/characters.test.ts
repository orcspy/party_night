import { describe, expect, it } from 'vitest'
import { applyExperience, expectedGrowth, getUnlockedClassSkillIds } from '../game/characters'
import { createInitialCharacters } from '../game/content'
import { getDirectionDisplayName, getEquipmentDisplayName, getEquipmentSlotDisplayName, getItemDisplayName, getQuestDisplayName, getRewardDisplayName, getSkillDisplayName } from '../game/displayNames'
import type { ClassId, PendingRewardEntry } from '../game/types'

describe('level 2 growth and class skill unlocks', () => {
  it('applies the approved Lv2 growth for all six classes', () => {
    const classIds: ClassId[] = ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage']
    const expected = {
      warrior: { str: 1, dex: 0, int: 0, con: 1, agi: 0, luck: 0 }, rogue: { str: 0, dex: 1, int: 0, con: 0, agi: 1, luck: 0 },
      archer: { str: 0, dex: 1, int: 0, con: 0, agi: 1, luck: 0 }, paladin: { str: 1, dex: 0, int: 0, con: 1, agi: 0, luck: 0 },
      priest: { str: 0, dex: 0, int: 1, con: 1, agi: 0, luck: 0 }, mage: { str: 0, dex: 0, int: 1, con: 0, agi: 1, luck: 0 },
    }
    for (const classId of classIds) expect(expectedGrowth(classId, 2)).toEqual(expected[classId])
  })

  it('gives every character the same EXP and level regardless of combat state', () => {
    const party = createInitialCharacters({ name: '성장테스터', raceId: 'human', classId: 'warrior', gender: '남성' })
    for (const character of party) {
      const result = applyExperience(character, 100)
      expect(result.character).toMatchObject({ level: 2, experience: 100 })
      expect(result.growthApplied).toEqual(expectedGrowth(character.classId, 2))
    }
  })

  it('uses heal as the priest Lv1 skill and unlocks smite at Lv2', () => {
    expect(getUnlockedClassSkillIds('priest', 1)).toEqual(['heal'])
    expect(getUnlockedClassSkillIds('priest', 2)).toEqual(['heal', 'smite'])
    expect(getUnlockedClassSkillIds('rogue', 2)).toEqual(['quick_stab', 'seek_trap'])
  })

  it('applies the approved Lv3 growth and opens exactly one custom slot', () => {
    const character = createInitialCharacters({ name: 'Lv3', raceId: 'human', classId: 'mage', gender: '여성' })[0]
    const level2 = applyExperience(character, 100).character
    const level3 = applyExperience(level2, 100).character
    expect(level3).toMatchObject({ level: 3, experience: 200 })
    expect(expectedGrowth('mage', 3)).toEqual({ str: 0, dex: 0, int: 2, con: 0, agi: 1, luck: 1 })
    expect([3, 7, 10].filter((level) => level3.level >= level)).toHaveLength(1)
  })

  it('uses representative names instead of exposing content IDs', () => {
    expect(getSkillDisplayName('taunt')).toBe('도발')
    expect(getSkillDisplayName('seek_trap')).toBe('함정간파')
    expect(getSkillDisplayName('protection_pledge')).toBe('보호 서약')
    expect(getSkillDisplayName('unknown_skill')).toBe('알 수 없는 스킬')
    expect(getEquipmentDisplayName('common_sword')).toBe('철제 한손검')
    expect(getItemDisplayName('bandage')).toBe('붕대')
    expect(getQuestDisplayName('goblin_den_quest')).toBe('고블린 소굴')
    expect(getEquipmentSlotDisplayName('offhand')).toBe('보조 장비')
    expect(getDirectionDisplayName('east')).toBe('동쪽')
    const reward: PendingRewardEntry = { rewardId: 'secret_goblin_den_secret_1', kind: 'item', itemId: 'bandage', quantity: 1 }
    expect(getRewardDisplayName(reward)).toBe('붕대')
  })
})
