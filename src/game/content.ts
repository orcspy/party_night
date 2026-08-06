import type { Actor, BaseAttributes, ClassDerivation, ClassId, DerivedCombatStats, MainCharacterConfig, Skill } from './types'

// TODO(MVP): Replace temporary balance, names, and map data when final content is approved.
export interface ClassData {
  name: string
  attributes: BaseAttributes
  derivation: ClassDerivation
  skillId: string
}

export const CLASS_DATA: Record<ClassId, ClassData> = {
  warrior: { name: '전사', attributes: { str: 10, dex: 5, int: 3, con: 9, agi: 3, luck: 6 }, derivation: { attackBasis: 'str', attackModifier: 0, defenseModifier: 1 }, skillId: 'power_strike' },
  rogue: { name: '도적', attributes: { str: 4, dex: 9, int: 4, con: 5, agi: 10, luck: 4 }, derivation: { attackBasis: 'dex', attackModifier: 0, defenseModifier: 0 }, skillId: 'quick_stab' },
  archer: { name: '궁수', attributes: { str: 5, dex: 10, int: 4, con: 6, agi: 8, luck: 3 }, derivation: { attackBasis: 'dex', attackModifier: 0, defenseModifier: 0 }, skillId: 'aimed_shot' },
  paladin: { name: '성기사', attributes: { str: 8, dex: 4, int: 7, con: 8, agi: 3, luck: 6 }, derivation: { attackBasis: 'max_str_int', attackModifier: 0, defenseModifier: 3 }, skillId: 'holy_strike' },
  priest: { name: '사제', attributes: { str: 4, dex: 5, int: 10, con: 6, agi: 5, luck: 6 }, derivation: { attackBasis: 'int', attackModifier: -2, defenseModifier: 1 }, skillId: 'smite' },
  mage: { name: '마법사', attributes: { str: 3, dex: 7, int: 10, con: 3, agi: 7, luck: 6 }, derivation: { attackBasis: 'int', attackModifier: 1, defenseModifier: 0 }, skillId: 'arcane_bolt' },
}

export function deriveCombatStats(attributes: BaseAttributes, derivation: ClassDerivation): DerivedCombatStats {
  const values = Object.values(attributes)
  if (values.some((value) => !Number.isFinite(value) || !Number.isInteger(value))) {
    throw new TypeError('기본 능력치는 유한한 정수여야 한다.')
  }
  if (values.some((value) => value < 1)) {
    throw new RangeError('기본 능력치는 1 이상이어야 한다.')
  }
  const attackBasis = derivation.attackBasis === 'max_str_int'
    ? Math.max(attributes.str, attributes.int)
    : attributes[derivation.attackBasis]
  return {
    maxHp: Math.max(1, 11 + attributes.con * 2 + Math.floor((attributes.str + attributes.dex) / 10)),
    atk: Math.max(1, Math.floor(attackBasis / 2) + derivation.attackModifier),
    def: Math.max(1, Math.floor((attributes.con * 2 + attributes.str + attributes.dex) / 10) + derivation.defenseModifier),
    agi: Math.max(1, Math.floor((attributes.agi + 2) / 2)),
  }
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
  const attributes = { ...data.attributes }
  const stats = deriveCombatStats(attributes, data.derivation)
  return {
    id, contentId: classId, name, side: 'party', classId, row,
    attributes,
    maxHp: stats.maxHp, currentHp: stats.maxHp, atk: stats.atk, def: stats.def, agi: stats.agi,
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
