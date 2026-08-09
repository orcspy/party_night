import { describe, expect, it } from 'vitest'
import { applyExperience, expectedGrowth, getUnlockedClassSkillIds } from '../game/characters'
import { COMPANION_DATA, createInitialCharacters, createPartyFromCharacters, getFinalAttributes } from '../game/content'
import { getDirectionDisplayName, getEquipmentDisplayName, getEquipmentSlotDisplayName, getItemDisplayName, getQuestDisplayName, getRewardDisplayName, getSkillDisplayName } from '../game/displayNames'
import { getInventoryCapacity } from '../game/inventory'
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

  it('uses the approved companion identities and race-dependent starting values', () => {
    expect(COMPANION_DATA).toEqual([
      { characterId: 'party_warrior', name: '브람', raceId: 'dwarf', classId: 'warrior', gender: '남성', row: 'front', partySlot: 2 },
      { characterId: 'party_priest', name: '세라', raceId: 'human', classId: 'priest', gender: '여성', row: 'back', partySlot: 3 },
      { characterId: 'party_archer', name: '로웬', raceId: 'elf', classId: 'archer', gender: '남성', row: 'back', partySlot: 4 },
    ])
    const characters = createInitialCharacters({ name: '메인', raceId: 'human', classId: 'warrior', gender: '남성' })
    expect(characters.map((character) => character.raceId)).toEqual(['human', 'dwarf', 'human', 'elf'])
    expect(characters.slice(1).map((character) => getFinalAttributes(character))).toEqual([
      { str: 12, dex: 5, int: 3, con: 9, agi: 4, luck: 5 },
      { str: 5, dex: 7, int: 10, con: 5, agi: 6, luck: 5 },
      { str: 3, dex: 11, int: 6, con: 4, agi: 10, luck: 4 },
    ])
    expect(characters.slice(1).map(getInventoryCapacity)).toEqual([12, 11, 10])
    expect(createPartyFromCharacters(characters).slice(1).map((actor) => ({ id: actor.id, hp: actor.maxHp, atk: actor.atk, def: actor.def, agi: actor.agi, skills: actor.skillIds }))).toEqual([
      { id: 'party_warrior', hp: 30, atk: 6, def: 4, agi: 3, skills: ['basic_attack', 'power_strike'] },
      { id: 'party_priest', hp: 22, atk: 3, def: 3, agi: 4, skills: ['basic_attack', 'heal'] },
      { id: 'party_archer', hp: 20, atk: 5, def: 2, agi: 6, skills: ['basic_attack', 'aimed_shot'] },
    ])
  })

  it('applies the approved Lv3 growth and opens exactly one custom slot', () => {
    const character = createInitialCharacters({ name: 'Lv3', raceId: 'human', classId: 'mage', gender: '여성' })[0]
    const level2 = applyExperience(character, 100).character
    const level3 = applyExperience(level2, 100).character
    expect(level3).toMatchObject({ level: 3, experience: 200 })
    expect(expectedGrowth('mage', 3)).toEqual({ str: 0, dex: 0, int: 2, con: 0, agi: 1, luck: 1 })
    expect([3, 7, 10].filter((level) => level3.level >= level)).toHaveLength(1)
  })

  it('reports custom slots only when their unlock level is crossed', () => {
    let character = createInitialCharacters({ name: '슬롯', raceId: 'human', classId: 'mage', gender: '여성' })[0]
    expect(applyExperience(character, 100).unlockedCustomSlotIndices).toEqual([])
    character = applyExperience(character, 100).character
    const level3 = applyExperience(character, 100)
    expect(level3.unlockedCustomSlotIndices).toEqual([0])
    character = level3.character
    while (character.level < 6) character = applyExperience(character, 100).character
    expect(applyExperience(character, 100).unlockedCustomSlotIndices).toEqual([1])
    while (character.level < 9) character = applyExperience(character, 100).character
    expect(applyExperience(character, 100).unlockedCustomSlotIndices).toEqual([])
    const level10 = applyExperience(character, 200)
    expect(level10.unlockedCustomSlotIndices).toEqual([2])
    expect(applyExperience(level10.character, 100).unlockedCustomSlotIndices).toEqual([])
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
