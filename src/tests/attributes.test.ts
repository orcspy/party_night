import { describe, expect, it } from 'vitest'
import { CLASS_DATA, combineAttributes, createParty, deriveCombatStats, RACE_DATA } from '../game/content'
import type { AttributeModifiers, BaseAttributes, ClassId, Gender, RaceId } from '../game/types'

const raceIds: RaceId[] = ['human', 'elf', 'dwarf', 'halfling']
const classIds: ClassId[] = ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage']

const expectedRaceAttributes: Record<RaceId, BaseAttributes> = {
  human: { str: 5, dex: 5, int: 5, con: 5, agi: 6, luck: 5 },
  elf: { str: 3, dex: 7, int: 6, con: 4, agi: 7, luck: 4 },
  dwarf: { str: 7, dex: 6, int: 3, con: 6, agi: 4, luck: 5 },
  halfling: { str: 2, dex: 5, int: 5, con: 3, agi: 8, luck: 8 },
}

const expectedClassModifiers: Record<ClassId, AttributeModifiers> = {
  warrior: { str: 4, dex: -1, int: 0, con: 3, agi: 0, luck: 0 },
  rogue: { str: -1, dex: 4, int: 0, con: 0, agi: 2, luck: 1 },
  archer: { str: 0, dex: 3, int: 0, con: 0, agi: 3, luck: 0 },
  paladin: { str: 2, dex: 0, int: 2, con: 2, agi: 0, luck: 0 },
  priest: { str: 0, dex: 2, int: 4, con: 0, agi: 0, luck: 0 },
  mage: { str: -1, dex: 0, int: 5, con: 0, agi: 1, luck: 1 },
}

const expectedHumanFinals: Record<ClassId, BaseAttributes> = {
  warrior: { str: 9, dex: 4, int: 5, con: 8, agi: 6, luck: 5 },
  rogue: { str: 4, dex: 9, int: 5, con: 5, agi: 8, luck: 6 },
  archer: { str: 5, dex: 8, int: 5, con: 5, agi: 9, luck: 5 },
  paladin: { str: 7, dex: 5, int: 7, con: 7, agi: 6, luck: 5 },
  priest: { str: 5, dex: 7, int: 9, con: 5, agi: 6, luck: 5 },
  mage: { str: 4, dex: 5, int: 10, con: 5, agi: 7, luck: 6 },
}

describe('race base attributes and class modifiers', () => {
  it('uses the approved balanced 31-point race bases', () => {
    for (const raceId of raceIds) {
      const attributes = RACE_DATA[raceId].baseAttributes
      expect(attributes).toEqual(expectedRaceAttributes[raceId])
      expect(Object.values(attributes).every((value) => Number.isInteger(value) && value >= 1)).toBe(true)
      expect(Object.values(attributes).reduce((sum, value) => sum + value, 0)).toBe(31)
    }
    const human = RACE_DATA.human.baseAttributes
    expect(new Set([human.str, human.dex, human.int, human.con]).size).toBe(1)
  })

  it('uses the approved class modifier profiles including negative modifiers', () => {
    for (const classId of classIds) {
      expect(CLASS_DATA[classId].attributeModifiers).toEqual(expectedClassModifiers[classId])
      expect(Object.values(CLASS_DATA[classId].attributeModifiers).every(Number.isInteger)).toBe(true)
    }
    expect(CLASS_DATA.warrior.attributeModifiers.dex).toBeLessThan(0)
    expect(CLASS_DATA.rogue.attributeModifiers.str).toBeLessThan(0)
  })

  it('creates valid 37-point finals for all 24 race and class combinations', () => {
    for (const raceId of raceIds) {
      for (const classId of classIds) {
        const attributes = combineAttributes(RACE_DATA[raceId].baseAttributes, CLASS_DATA[classId].attributeModifiers)
        const values = Object.values(attributes)
        expect(values.every((value) => Number.isInteger(value) && value >= 1 && value <= 11)).toBe(true)
        expect(values.reduce((sum, value) => sum + value, 0)).toBe(37)
      }
    }
  })

  it('produces the approved human final attributes', () => {
    for (const classId of classIds) {
      expect(combineAttributes(RACE_DATA.human.baseAttributes, CLASS_DATA[classId].attributeModifiers)).toEqual(expectedHumanFinals[classId])
    }
  })

  it('changes final and derived stats when the race changes', () => {
    const warrior = CLASS_DATA.warrior
    const human = combineAttributes(RACE_DATA.human.baseAttributes, warrior.attributeModifiers)
    const dwarf = combineAttributes(RACE_DATA.dwarf.baseAttributes, warrior.attributeModifiers)
    expect(dwarf).not.toEqual(human)
    expect(deriveCombatStats(dwarf, warrior.derivation)).not.toEqual(deriveCombatStats(human, warrior.derivation))
  })

  it('keeps LUK inactive in derived combat stats', () => {
    const mage = CLASS_DATA.mage
    const attributes = combineAttributes(RACE_DATA.human.baseAttributes, mage.attributeModifiers)
    expect(deriveCombatStats({ ...attributes, luck: 999 }, mage.derivation)).toEqual(deriveCombatStats(attributes, mage.derivation))
  })

  it.each<Gender>(['남성', '여성'])('maps %s to a non-neutral runtime asset gender', (gender) => {
    const party = createParty({ name: '테스터', raceId: 'halfling', classId: 'rogue', gender })
    expect(party[0].gender).toBe(gender === '여성' ? 'female' : 'male')
    expect(party.map((actor) => actor.gender)).not.toContain('neutral')
  })

  it('combines without mutation and rejects invalid content data', () => {
    const base = { ...RACE_DATA.human.baseAttributes }
    const modifiers = { ...CLASS_DATA.warrior.attributeModifiers }
    const originalBase = { ...base }
    const originalModifiers = { ...modifiers }
    expect(combineAttributes(base, modifiers)).toEqual(expectedHumanFinals.warrior)
    expect(base).toEqual(originalBase)
    expect(modifiers).toEqual(originalModifiers)

    expect(() => combineAttributes({ ...base, str: Number.NaN }, modifiers)).toThrow(TypeError)
    expect(() => combineAttributes(base, { ...modifiers, dex: 1.5 })).toThrow(TypeError)
    expect(() => combineAttributes(base, { ...modifiers, str: -99 })).toThrow(RangeError)
  })
})
