import type { Actor, ClassId, MainCharacterConfig, Skill } from './types'

// TODO(MVP): Replace temporary balance, names, and map data when final content is approved.
export const CLASS_DATA: Record<ClassId, { name: string; hp: number; atk: number; def: number; agi: number; skillId: string }> = {
  warrior: { name: '전사', hp: 30, atk: 5, def: 4, agi: 2, skillId: 'power_strike' },
  rogue: { name: '도적', hp: 22, atk: 4, def: 2, agi: 6, skillId: 'quick_stab' },
  archer: { name: '궁수', hp: 24, atk: 5, def: 2, agi: 5, skillId: 'aimed_shot' },
  paladin: { name: '성기사', hp: 28, atk: 4, def: 5, agi: 2, skillId: 'holy_strike' },
  priest: { name: '사제', hp: 23, atk: 3, def: 3, agi: 3, skillId: 'smite' },
  mage: { name: '마법사', hp: 18, atk: 6, def: 1, agi: 4, skillId: 'arcane_bolt' },
}

export const RACES = { human: '인간', elf: '엘프', dwarf: '드워프', halfling: '하플링' } as const

export const SKILLS: Record<string, Skill> = {
  basic_attack: { id: 'basic_attack', name: '기본 공격', diceCount: 2, fixedModifier: 0, oncePerBattle: false, rerolls: 0 },
  power_strike: { id: 'power_strike', name: '강타', diceCount: 3, fixedModifier: 0, oncePerBattle: true, rerolls: 0 },
  quick_stab: { id: 'quick_stab', name: '빠른 찌르기', diceCount: 2, fixedModifier: 2, oncePerBattle: true, rerolls: 0 },
  aimed_shot: { id: 'aimed_shot', name: '조준 사격', diceCount: 3, fixedModifier: 0, oncePerBattle: true, rerolls: 1 },
  holy_strike: { id: 'holy_strike', name: '신성한 일격', diceCount: 2, fixedModifier: 2, oncePerBattle: true, rerolls: 0 },
  smite: { id: 'smite', name: '징벌', diceCount: 2, fixedModifier: 1, oncePerBattle: true, rerolls: 0 },
  arcane_bolt: { id: 'arcane_bolt', name: '비전 화살', diceCount: 3, fixedModifier: 1, oncePerBattle: true, rerolls: 0 },
}

export const MAP_ROWS = [
  '#######',
  '#S....#',
  '#.###.#',
  '#...#.#',
  '###.#.#',
  '#..E.X#',
  '#######',
] as const

function makePartyActor(id: string, name: string, classId: ClassId, row: 'front' | 'back'): Actor {
  const data = CLASS_DATA[classId]
  return {
    id, contentId: classId, name, side: 'party', classId, row,
    maxHp: data.hp, currentHp: data.hp, atk: data.atk, def: data.def, agi: data.agi,
    skillIds: ['basic_attack', data.skillId],
  }
}

export function createParty(main: MainCharacterConfig): Actor[] {
  return [
    makePartyActor('party_main', main.name.trim(), main.classId, 'front'),
    makePartyActor('party_warrior', '브람', 'warrior', 'front'),
    makePartyActor('party_priest', '세라', 'priest', 'back'),
    makePartyActor('party_archer', '로웬', 'archer', 'back'),
  ]
}

export function createEnemies(): Actor[] {
  return [
    { id: 'enemy_goblin_scout', contentId: 'goblin_scout', name: '고블린 정찰병', side: 'enemy', maxHp: 18, currentHp: 18, atk: 3, def: 2, agi: 4, skillIds: ['basic_attack'] },
    { id: 'enemy_goblin_guard', contentId: 'goblin_guard', name: '고블린 경비병', side: 'enemy', maxHp: 24, currentHp: 24, atk: 4, def: 3, agi: 2, skillIds: ['basic_attack'] },
  ]
}
