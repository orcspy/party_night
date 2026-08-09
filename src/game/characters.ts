import type { AttributeGrowth, ClassId, PersistentCharacter } from './types'

export const EXP_THRESHOLDS = [0, 100, 200, 300, 400, 500, 600, 700, 800, 1000] as const

const GROWTH_BY_CLASS: Record<ClassId, AttributeGrowth[]> = {
  warrior: [[1,0,0,1,0,0],[1,0,0,0,1,0],[1,0,0,1,0,0],[0,0,0,1,0,1],[1,0,0,1,0,0],[1,0,0,0,1,0],[1,0,0,1,0,0],[0,1,0,1,0,0],[1,0,1,0,0,0]].map(growth),
  rogue: [[0,1,0,0,1,0],[0,1,0,0,0,1],[0,0,0,1,1,0],[0,1,0,0,1,0],[0,1,0,0,0,1],[0,1,0,0,1,0],[0,1,0,1,0,0],[1,0,0,0,1,0],[0,1,1,0,0,0]].map(growth),
  archer: [[0,1,0,0,1,0],[1,1,0,0,0,0],[0,0,0,1,1,0],[0,1,0,0,1,0],[0,1,0,0,0,1],[0,1,0,0,1,0],[0,1,0,1,0,0],[1,0,0,0,1,0],[0,1,1,0,0,0]].map(growth),
  paladin: [[1,0,0,1,0,0],[0,0,1,1,0,0],[1,0,1,0,0,0],[0,0,0,1,0,1],[1,0,1,0,0,0],[0,0,1,1,0,0],[1,0,0,0,1,0],[0,0,1,0,1,0],[1,1,0,0,0,0]].map(growth),
  priest: [[0,0,1,1,0,0],[0,1,1,0,0,0],[0,0,1,1,0,0],[0,0,1,0,0,1],[0,0,0,1,1,0],[0,0,1,1,0,0],[0,1,1,0,0,0],[0,0,1,0,0,1],[1,0,0,0,1,0]].map(growth),
  mage: [[0,0,1,0,1,0],[0,0,1,0,0,1],[0,0,1,1,0,0],[0,0,1,0,1,0],[0,0,1,1,0,0],[0,0,1,0,1,0],[0,0,1,0,0,1],[0,0,1,1,0,0],[0,1,0,0,1,0]].map(growth),
}

const CLASS_SKILLS: Record<ClassId, [string, string, string]> = {
  warrior: ['power_strike', 'taunt', 'ability_reinforcement'],
  rogue: ['quick_stab', 'seek_trap', 'wound_break'],
  archer: ['aimed_shot', 'find_leak', 'head_shot'],
  paladin: ['holy_strike', 'protection_pledge', 'sacred_rage'],
  priest: ['heal', 'smite', 'celestial_shroud'],
  mage: ['arcane_bolt', 'lightning_bolt', 'fire_ball'],
}

function growth(values: number[]): AttributeGrowth {
  return { str: values[0], dex: values[1], int: values[2], con: values[3], agi: values[4], luck: values[5] }
}

const ZERO = (): AttributeGrowth => ({ str: 0, dex: 0, int: 0, con: 0, agi: 0, luck: 0 })

export function levelForExperience(experience: number): number {
  let level = 1
  for (let index = 1; index < EXP_THRESHOLDS.length; index++) if (experience >= EXP_THRESHOLDS[index]) level = index + 1
  return level
}

export function expectedGrowth(classId: ClassId, level: number): AttributeGrowth {
  const total = ZERO()
  for (let index = 0; index < Math.max(0, level - 1); index++) {
    const delta = GROWTH_BY_CLASS[classId][index]
    total.str += delta.str; total.dex += delta.dex; total.int += delta.int; total.con += delta.con; total.agi += delta.agi; total.luck += delta.luck
  }
  return total
}

export function getUnlockedClassSkillIds(classId: ClassId, level: number): string[] {
  const skills = CLASS_SKILLS[classId]
  return [skills[0], ...(level >= 2 ? [skills[1]] : []), ...(level >= 5 ? [skills[2]] : [])]
}

export function applyExperience(character: PersistentCharacter, amount: number): { character: PersistentCharacter; growthApplied: AttributeGrowth; unlockedClassSkillIds: string[] } {
  const previousSkills = getUnlockedClassSkillIds(character.classId, character.level)
  const experience = Math.min(1000, character.experience + amount)
  const level = levelForExperience(experience)
  const nextGrowth = expectedGrowth(character.classId, level)
  const growthApplied: AttributeGrowth = {
    str: nextGrowth.str - character.growth.str, dex: nextGrowth.dex - character.growth.dex, int: nextGrowth.int - character.growth.int,
    con: nextGrowth.con - character.growth.con, agi: nextGrowth.agi - character.growth.agi, luck: nextGrowth.luck - character.growth.luck,
  }
  const nextSkills = getUnlockedClassSkillIds(character.classId, level)
  return {
    character: { ...character, experience, level, growth: nextGrowth },
    growthApplied,
    unlockedClassSkillIds: nextSkills.filter((skillId) => !previousSkills.includes(skillId)),
  }
}
