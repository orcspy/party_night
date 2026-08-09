import type { Actor, AssetGender, AttributeGrowth, AttributeModifiers, BaseAttributes, CharacterEquipment, ClassDerivation, ClassId, DerivedCombatStats, Direction, EquipmentFamily, EquipmentInstance, EquipmentSlot, Gender, ItemId, MainCharacterConfig, PersistentCharacter, QuestId, RaceId, Rarity, Row, Skill } from './types'
import { getUnlockedClassSkillIds } from './characters'

// TODO(MVP): Replace temporary balance, names, and map data when final content is approved.
export interface RaceData {
  name: string
  baseAttributes: BaseAttributes
}

export interface ClassData {
  name: string
  attributeModifiers: AttributeModifiers
  derivation: ClassDerivation
  skillId: string
}

export interface EquipmentData {
  name: string
  family: EquipmentFamily
  rarity: Rarity
  slot: EquipmentSlot
  twoHanded: boolean
  modifiers: AttributeModifiers
  allowedClasses: ClassId[]
  buyPrice: number
}

export interface ItemData {
  name: string
  buyPrice: number
  usableIn: readonly ('battle' | 'exploration')[]
  targetMode: 'single_ally' | 'single_enemy' | 'self' | 'none'
  turnCost: 'consume_action' | 'free'
  effect: 'heal_10' | 'skill_cost' | 'remove_one' | 'damage_10' | 'survey' | 'heal_22' | 'buff_str' | 'buff_agi' | 'remove_all'
}

export const RACE_DATA: Record<RaceId, RaceData> = {
  human: { name: '인간', baseAttributes: { str: 5, dex: 5, int: 5, con: 5, agi: 6, luck: 5 } },
  elf: { name: '엘프', baseAttributes: { str: 3, dex: 7, int: 6, con: 4, agi: 7, luck: 4 } },
  dwarf: { name: '드워프', baseAttributes: { str: 7, dex: 6, int: 3, con: 6, agi: 4, luck: 5 } },
  halfling: { name: '하플링', baseAttributes: { str: 2, dex: 5, int: 5, con: 3, agi: 8, luck: 8 } },
}

export const CLASS_DATA: Record<ClassId, ClassData> = {
  warrior: { name: '전사', attributeModifiers: { str: 4, dex: -1, int: 0, con: 3, agi: 0, luck: 0 }, derivation: { attackBasis: 'str', attackModifier: 0, defenseModifier: 1 }, skillId: 'power_strike' },
  rogue: { name: '도적', attributeModifiers: { str: -1, dex: 4, int: 0, con: 0, agi: 2, luck: 1 }, derivation: { attackBasis: 'dex', attackModifier: 0, defenseModifier: 0 }, skillId: 'quick_stab' },
  archer: { name: '궁수', attributeModifiers: { str: 0, dex: 3, int: 0, con: 0, agi: 3, luck: 0 }, derivation: { attackBasis: 'dex', attackModifier: 0, defenseModifier: 0 }, skillId: 'aimed_shot' },
  paladin: { name: '성기사', attributeModifiers: { str: 2, dex: 0, int: 2, con: 2, agi: 0, luck: 0 }, derivation: { attackBasis: 'max_str_int', attackModifier: 0, defenseModifier: 3 }, skillId: 'holy_strike' },
  priest: { name: '사제', attributeModifiers: { str: 0, dex: 2, int: 4, con: 0, agi: 0, luck: 0 }, derivation: { attackBasis: 'int', attackModifier: -2, defenseModifier: 1 }, skillId: 'heal' },
  mage: { name: '마법사', attributeModifiers: { str: -1, dex: 0, int: 5, con: 0, agi: 1, luck: 1 }, derivation: { attackBasis: 'int', attackModifier: 1, defenseModifier: 0 }, skillId: 'arcane_bolt' },
}

export const EQUIPMENT_DATA: Record<string, EquipmentData> = {
  common_dagger: { name: '낡은 단검', family: 'dagger', rarity: 'common', slot: 'weapon', twoHanded: false, modifiers: { str: 0, dex: 1, int: 0, con: 0, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'rogue'], buyPrice: 80 },
  common_sword: { name: '철제 한손검', family: 'sword', rarity: 'common', slot: 'weapon', twoHanded: false, modifiers: { str: 1, dex: 0, int: 0, con: 0, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin', 'rogue'], buyPrice: 100 },
  common_mace: { name: '철제 둔기', family: 'mace', rarity: 'common', slot: 'weapon', twoHanded: false, modifiers: { str: 1, dex: 0, int: 0, con: 0, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin'], buyPrice: 100 },
  common_shield: { name: '나무 방패', family: 'shield', rarity: 'common', slot: 'offhand', twoHanded: false, modifiers: { str: 0, dex: 0, int: 0, con: 1, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin'], buyPrice: 80 },
  common_bow: { name: '사냥용 활', family: 'bow', rarity: 'common', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 1, int: 0, con: 0, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'archer'], buyPrice: 110 },
  common_staff: { name: '참나무 지팡이', family: 'staff', rarity: 'common', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 0, int: 1, con: 0, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'priest', 'mage'], buyPrice: 100 },
  common_rod: { name: '견습 로드', family: 'rod', rarity: 'common', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 0, int: 1, con: 0, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'mage'], buyPrice: 110 },
  common_head: { name: '가죽 모자', family: 'head', rarity: 'common', slot: 'head', twoHanded: false, modifiers: { str: 0, dex: 1, int: 0, con: 0, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'], buyPrice: 70 },
  common_body: { name: '가죽 갑옷', family: 'body', rarity: 'common', slot: 'body', twoHanded: false, modifiers: { str: 0, dex: 0, int: 0, con: 1, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'], buyPrice: 90 },
  uncommon_dagger: { name: '사냥꾼 단검', family: 'dagger', rarity: 'uncommon', slot: 'weapon', twoHanded: false, modifiers: { str: 0, dex: 2, int: 0, con: 0, agi: 1, luck: 0 }, allowedClasses: ['warrior', 'rogue'], buyPrice: 150 },
  uncommon_sword: { name: '수호자의 검', family: 'sword', rarity: 'uncommon', slot: 'weapon', twoHanded: false, modifiers: { str: 2, dex: 1, int: 0, con: 0, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin', 'rogue'], buyPrice: 180 },
  uncommon_mace: { name: '수호 철퇴', family: 'mace', rarity: 'uncommon', slot: 'weapon', twoHanded: false, modifiers: { str: 2, dex: 0, int: 0, con: 1, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin'], buyPrice: 180 },
  uncommon_shield: { name: '강화 방패', family: 'shield', rarity: 'uncommon', slot: 'offhand', twoHanded: false, modifiers: { str: 1, dex: 0, int: 0, con: 2, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin'], buyPrice: 150 },
  uncommon_bow: { name: '녹림의 활', family: 'bow', rarity: 'uncommon', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 2, int: 0, con: 0, agi: 1, luck: 0 }, allowedClasses: ['warrior', 'archer'], buyPrice: 190 },
  uncommon_staff: { name: '현자의 지팡이', family: 'staff', rarity: 'uncommon', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 0, int: 2, con: 1, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'priest', 'mage'], buyPrice: 180 },
  uncommon_rod: { name: '비취 로드', family: 'rod', rarity: 'uncommon', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 0, int: 2, con: 0, agi: 1, luck: 0 }, allowedClasses: ['warrior', 'mage'], buyPrice: 190 },
  uncommon_head: { name: '강화 두건', family: 'head', rarity: 'uncommon', slot: 'head', twoHanded: false, modifiers: { str: 0, dex: 1, int: 0, con: 0, agi: 1, luck: 1 }, allowedClasses: ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'], buyPrice: 130 },
  uncommon_body: { name: '강화 갑옷', family: 'body', rarity: 'uncommon', slot: 'body', twoHanded: false, modifiers: { str: 1, dex: 0, int: 0, con: 2, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'], buyPrice: 170 },
  rare_dagger: { name: '청람 단검', family: 'dagger', rarity: 'rare', slot: 'weapon', twoHanded: false, modifiers: { str: 0, dex: 3, int: 0, con: 0, agi: 1, luck: 1 }, allowedClasses: ['warrior', 'rogue'], buyPrice: 250 },
  rare_sword: { name: '청강검', family: 'sword', rarity: 'rare', slot: 'weapon', twoHanded: false, modifiers: { str: 3, dex: 2, int: 0, con: 0, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin', 'rogue'], buyPrice: 300 },
  rare_mace: { name: '청뢰 철퇴', family: 'mace', rarity: 'rare', slot: 'weapon', twoHanded: false, modifiers: { str: 3, dex: 0, int: 1, con: 1, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin'], buyPrice: 300 },
  rare_shield: { name: '청강 방패', family: 'shield', rarity: 'rare', slot: 'offhand', twoHanded: false, modifiers: { str: 1, dex: 0, int: 0, con: 3, agi: 0, luck: 1 }, allowedClasses: ['warrior', 'paladin'], buyPrice: 250 },
  rare_bow: { name: '청옥 장궁', family: 'bow', rarity: 'rare', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 3, int: 0, con: 0, agi: 2, luck: 0 }, allowedClasses: ['warrior', 'archer'], buyPrice: 320 },
  rare_staff: { name: '청옥 지팡이', family: 'staff', rarity: 'rare', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 0, int: 3, con: 1, agi: 0, luck: 1 }, allowedClasses: ['warrior', 'priest', 'mage'], buyPrice: 300 },
  rare_rod: { name: '청성 로드', family: 'rod', rarity: 'rare', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 0, int: 3, con: 0, agi: 1, luck: 1 }, allowedClasses: ['warrior', 'mage'], buyPrice: 320 },
  rare_head: { name: '청옥 투구', family: 'head', rarity: 'rare', slot: 'head', twoHanded: false, modifiers: { str: 0, dex: 1, int: 1, con: 0, agi: 1, luck: 2 }, allowedClasses: ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'], buyPrice: 220 },
  rare_body: { name: '청강 갑옷', family: 'body', rarity: 'rare', slot: 'body', twoHanded: false, modifiers: { str: 1, dex: 1, int: 0, con: 3, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'], buyPrice: 280 },
  heroic_dagger: { name: '그림자 단검', family: 'dagger', rarity: 'heroic', slot: 'weapon', twoHanded: false, modifiers: { str: 1, dex: 4, int: 0, con: 0, agi: 2, luck: 1 }, allowedClasses: ['warrior', 'rogue'], buyPrice: 380 },
  heroic_sword: { name: '왕실 보검', family: 'sword', rarity: 'heroic', slot: 'weapon', twoHanded: false, modifiers: { str: 5, dex: 2, int: 0, con: 1, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin', 'rogue'], buyPrice: 460 },
  heroic_mace: { name: '성전 철퇴', family: 'mace', rarity: 'heroic', slot: 'weapon', twoHanded: false, modifiers: { str: 4, dex: 0, int: 2, con: 2, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin'], buyPrice: 460 },
  heroic_shield: { name: '성채 방패', family: 'shield', rarity: 'heroic', slot: 'offhand', twoHanded: false, modifiers: { str: 2, dex: 0, int: 0, con: 4, agi: 0, luck: 2 }, allowedClasses: ['warrior', 'paladin'], buyPrice: 380 },
  heroic_bow: { name: '자월 장궁', family: 'bow', rarity: 'heroic', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 4, int: 0, con: 0, agi: 3, luck: 1 }, allowedClasses: ['warrior', 'archer'], buyPrice: 490 },
  heroic_staff: { name: '주교의 지팡이', family: 'staff', rarity: 'heroic', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 0, int: 4, con: 2, agi: 0, luck: 2 }, allowedClasses: ['warrior', 'priest', 'mage'], buyPrice: 460 },
  heroic_rod: { name: '공허의 로드', family: 'rod', rarity: 'heroic', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 0, int: 5, con: 0, agi: 2, luck: 1 }, allowedClasses: ['warrior', 'mage'], buyPrice: 490 },
  heroic_head: { name: '왕실 투구', family: 'head', rarity: 'heroic', slot: 'head', twoHanded: false, modifiers: { str: 0, dex: 1, int: 2, con: 1, agi: 2, luck: 2 }, allowedClasses: ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'], buyPrice: 340 },
  heroic_body: { name: '영웅의 갑옷', family: 'body', rarity: 'heroic', slot: 'body', twoHanded: false, modifiers: { str: 2, dex: 1, int: 0, con: 4, agi: 0, luck: 1 }, allowedClasses: ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'], buyPrice: 430 },
  legendary_dagger: { name: '황금 송곳니', family: 'dagger', rarity: 'legendary', slot: 'weapon', twoHanded: false, modifiers: { str: 1, dex: 5, int: 0, con: 0, agi: 3, luck: 2 }, allowedClasses: ['warrior', 'rogue'], buyPrice: 580 },
  legendary_sword: { name: '태양검', family: 'sword', rarity: 'legendary', slot: 'weapon', twoHanded: false, modifiers: { str: 7, dex: 3, int: 0, con: 1, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin', 'rogue'], buyPrice: 700 },
  legendary_mace: { name: '심판의 망치', family: 'mace', rarity: 'legendary', slot: 'weapon', twoHanded: false, modifiers: { str: 6, dex: 0, int: 2, con: 3, agi: 0, luck: 0 }, allowedClasses: ['warrior', 'paladin'], buyPrice: 700 },
  legendary_shield: { name: '태양 방패', family: 'shield', rarity: 'legendary', slot: 'offhand', twoHanded: false, modifiers: { str: 3, dex: 0, int: 0, con: 6, agi: 0, luck: 2 }, allowedClasses: ['warrior', 'paladin'], buyPrice: 580 },
  legendary_bow: { name: '별빛 장궁', family: 'bow', rarity: 'legendary', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 6, int: 0, con: 0, agi: 4, luck: 1 }, allowedClasses: ['warrior', 'archer'], buyPrice: 740 },
  legendary_staff: { name: '세계수 지팡이', family: 'staff', rarity: 'legendary', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 0, int: 6, con: 3, agi: 0, luck: 2 }, allowedClasses: ['warrior', 'priest', 'mage'], buyPrice: 700 },
  legendary_rod: { name: '용맥의 로드', family: 'rod', rarity: 'legendary', slot: 'weapon', twoHanded: true, modifiers: { str: 0, dex: 0, int: 7, con: 0, agi: 2, luck: 2 }, allowedClasses: ['warrior', 'mage'], buyPrice: 740 },
  legendary_head: { name: '별왕관', family: 'head', rarity: 'legendary', slot: 'head', twoHanded: false, modifiers: { str: 1, dex: 2, int: 2, con: 1, agi: 2, luck: 3 }, allowedClasses: ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'], buyPrice: 520 },
  legendary_body: { name: '천명 갑옷', family: 'body', rarity: 'legendary', slot: 'body', twoHanded: false, modifiers: { str: 3, dex: 1, int: 0, con: 6, agi: 0, luck: 1 }, allowedClasses: ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'], buyPrice: 650 },
}

export const ITEM_DATA: Record<ItemId, ItemData> = {
  minor_healing_potion: { name: '소형 회복약', buyPrice: 30, usableIn: ['battle', 'exploration'], targetMode: 'single_ally', turnCost: 'consume_action', effect: 'heal_10' },
  bandage: { name: '붕대', buyPrice: 20, usableIn: [], targetMode: 'none', turnCost: 'consume_action', effect: 'skill_cost' },
  remedy: { name: '정화약', buyPrice: 40, usableIn: ['battle', 'exploration'], targetMode: 'single_ally', turnCost: 'consume_action', effect: 'remove_one' },
  fire_bomb: { name: '화염병', buyPrice: 60, usableIn: ['battle'], targetMode: 'single_enemy', turnCost: 'consume_action', effect: 'damage_10' },
  survey_chalk: { name: '탐색용 분필', buyPrice: 50, usableIn: ['exploration'], targetMode: 'none', turnCost: 'free', effect: 'survey' },
  greater_healing_potion: { name: '상급 회복약', buyPrice: 70, usableIn: ['battle', 'exploration'], targetMode: 'single_ally', turnCost: 'consume_action', effect: 'heal_22' },
  might_tonic: { name: '근력 강장제', buyPrice: 70, usableIn: ['battle'], targetMode: 'self', turnCost: 'free', effect: 'buff_str' },
  haste_tonic: { name: '민첩 강장제', buyPrice: 70, usableIn: ['battle'], targetMode: 'self', turnCost: 'free', effect: 'buff_agi' },
  panacea: { name: '만능 치료제', buyPrice: 100, usableIn: ['battle', 'exploration'], targetMode: 'single_ally', turnCost: 'consume_action', effect: 'remove_all' },
}

const STARTING_WEAPON_BY_CLASS: Record<ClassId, string> = {
  warrior: 'common_sword',
  rogue: 'common_dagger',
  archer: 'common_bow',
  paladin: 'common_sword',
  priest: 'common_staff',
  mage: 'common_rod',
}

const ATTRIBUTE_KEYS = ['str', 'dex', 'int', 'con', 'agi', 'luck'] as const

function assertIntegerAttributes(attributes: BaseAttributes, minimum: number, label: string) {
  const values = ATTRIBUTE_KEYS.map((key) => attributes[key])
  if (values.some((value) => !Number.isFinite(value) || !Number.isInteger(value))) {
    throw new TypeError(`${label}은 유한한 정수여야 한다.`)
  }
  if (values.some((value) => value < minimum)) {
    throw new RangeError(`${label}은 ${minimum} 이상이어야 한다.`)
  }
}

export function combineAttributes(raceBase: BaseAttributes, classModifiers: AttributeModifiers): BaseAttributes {
  assertIntegerAttributes(raceBase, 1, '종족 기본 능력치')
  const modifiers = ATTRIBUTE_KEYS.map((key) => classModifiers[key])
  if (modifiers.some((value) => !Number.isFinite(value) || !Number.isInteger(value))) {
    throw new TypeError('직업 능력치 보정은 유한한 정수여야 한다.')
  }
  const combined: BaseAttributes = {
    str: raceBase.str + classModifiers.str,
    dex: raceBase.dex + classModifiers.dex,
    int: raceBase.int + classModifiers.int,
    con: raceBase.con + classModifiers.con,
    agi: raceBase.agi + classModifiers.agi,
    luck: raceBase.luck + classModifiers.luck,
  }
  assertIntegerAttributes(combined, 1, '최종 능력치')
  return combined
}

function addModifiers(attributes: BaseAttributes, modifiers: AttributeModifiers[]): BaseAttributes {
  return modifiers.reduce((current, modifier) => ({
    str: current.str + modifier.str,
    dex: current.dex + modifier.dex,
    int: current.int + modifier.int,
    con: current.con + modifier.con,
    agi: current.agi + modifier.agi,
    luck: current.luck + modifier.luck,
  }), attributes)
}

export function deriveCombatStats(attributes: BaseAttributes, derivation: ClassDerivation): DerivedCombatStats {
  assertIntegerAttributes(attributes, 1, '기본 능력치')
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

function activeDamage(id: string, name: string, diceCount: number, fixedModifier: number, rerolls = 0, cooldownRounds = 0): Skill {
  return {
    id, name, diceCount, fixedModifier, rerolls,
    activation: 'active', targetMode: 'single_enemy', resolution: 'damage',
    useLimit: cooldownRounds > 0 ? { type: 'cooldown', rounds: cooldownRounds } : { type: 'unlimited' },
  }
}

export const SKILLS: Record<string, Skill> = {
  basic_attack: activeDamage('basic_attack', '기본 공격', 2, 0),
  power_strike: activeDamage('power_strike', '강타', 3, 0, 0, 2),
  quick_stab: activeDamage('quick_stab', '빠른 찌르기', 2, 2, 0, 2),
  aimed_shot: activeDamage('aimed_shot', '조준 사격', 3, 0, 1, 2),
  holy_strike: activeDamage('holy_strike', '신성한 일격', 2, 2, 0, 2),
  heal: { ...activeDamage('heal', '성스러운 치료', 2, 1), targetMode: 'single_ally', resolution: 'heal' },
  smite: activeDamage('smite', '징벌', 2, 1, 0, 2),
  arcane_bolt: activeDamage('arcane_bolt', '비전 화살', 3, 1, 0, 2),
  taunt: { id: 'taunt', name: '도발', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'active', targetMode: 'all_enemies', resolution: 'taunt', useLimit: { type: 'cooldown', rounds: 2 } },
  seek_trap: { id: 'seek_trap', name: '함정간파', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_seek_trap', useLimit: { type: 'unlimited' } },
  find_leak: { ...activeDamage('find_leak', '약점노출', 1, -3, 0, 2), resolution: 'status' },
  protection_pledge: { id: 'protection_pledge', name: '보호 서약', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_protection', useLimit: { type: 'unlimited' } },
  lightning_bolt: activeDamage('lightning_bolt', '전격 화살', 2, 3, 0, 2),
  commanding_strike: activeDamage('commanding_strike', '지휘관의 일격', 3, 0),
  ogre_smash: activeDamage('ogre_smash', '오우거 강타', 3, 2),
  first_aid: { ...activeDamage('first_aid', '응급 치료', 1, 2, 0, 2), targetMode: 'self', resolution: 'heal' },
  rending_bite: activeDamage('rending_bite', '찢는 물기', 2, 2),
  minotaur_gore: activeDamage('minotaur_gore', '미노타우르스 돌진', 4, 0),
  paralyzing_claw: activeDamage('paralyzing_claw', '마비 발톱', 2, 2),
  death_bolt: activeDamage('death_bolt', '죽음의 화살', 3, 4),
  crushing_blow: activeDamage('crushing_blow', '분쇄의 일격', 4, 4),
  drain_touch: activeDamage('drain_touch', '생명력 흡수', 3, 0),
  royal_cleave: { ...activeDamage('royal_cleave', '왕의 휩쓸기', 3, 0), targetMode: 'all_enemies' },
  ability_reinforcement: { id: 'ability_reinforcement', name: '능력 강화', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'active', targetMode: 'self', resolution: 'buff', useLimit: { type: 'cooldown', rounds: 5 } },
  wound_break: activeDamage('wound_break', '상처 가르기', 3, 5, 0, 5),
  head_shot: activeDamage('head_shot', '헤드 샷', 5, 5, 0, 5),
  sacred_rage: { id: 'sacred_rage', name: '신성한 분노', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'active', targetMode: 'self', resolution: 'buff', useLimit: { type: 'cooldown', rounds: 5 } },
  celestial_shroud: { id: 'celestial_shroud', name: '천상의 수의', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_resource', useLimit: { type: 'unlimited' } },
  fire_ball: { ...activeDamage('fire_ball', '화염구', 3, 7, 0, 5), targetMode: 'all_enemies' },
  neurotoxin: activeDamage('neurotoxin', '신경독', 2, 2, 0, 2),
  sacrifice: { ...activeDamage('sacrifice', '희생', 2, 2, 0, 4), targetMode: 'single_ally', resolution: 'heal' },
  bless: { ...activeDamage('bless', '축복', 0, 0), targetMode: 'single_ally', resolution: 'buff' },
  sleep: { id: 'sleep', name: '수면', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'active', targetMode: 'single_enemy', resolution: 'status', useLimit: { type: 'cooldown', rounds: 2 } },
  spell_boost: { id: 'spell_boost', name: '마력 강화', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_resource', useLimit: { type: 'unlimited' } },
  str_reinforcement: { id: 'str_reinforcement', name: '근력 강화', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_resource', useLimit: { type: 'unlimited' } },
  goblin_killer: { id: 'goblin_killer', name: '고블린 학살자', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_resource', useLimit: { type: 'unlimited' } },
  kobold_killer: { id: 'kobold_killer', name: '코볼트 학살자', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_resource', useLimit: { type: 'unlimited' } },
  bone_crusher: { id: 'bone_crusher', name: '본 크러셔', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_resource', useLimit: { type: 'unlimited' } },
  cutlery_expert: { id: 'cutlery_expert', name: '날붙이 전문가', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_resource', useLimit: { type: 'unlimited' } },
  club_expert: { id: 'club_expert', name: '몽둥이 전문가', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_resource', useLimit: { type: 'unlimited' } },
  breathing_control: { id: 'breathing_control', name: '호흡 조절', diceCount: 0, fixedModifier: 0, rerolls: 0, activation: 'passive', targetMode: 'self', resolution: 'passive_resource', useLimit: { type: 'unlimited' } },
}

export const CUSTOM_SKILL_DATA = {
  first_aid: '응급 치료', spell_boost: '마력 강화', str_reinforcement: '근력 강화', goblin_killer: '고블린 학살자',
  kobold_killer: '코볼트 학살자', bone_crusher: '본 크러셔', cutlery_expert: '날붙이 전문가', club_expert: '몽둥이 전문가',
  neurotoxin: '신경독', breathing_control: '호흡 조절', sacrifice: '희생', bless: '축복', sleep: '수면',
} as const

export type CustomSkillId = keyof typeof CUSTOM_SKILL_DATA

export const CUSTOM_SKILL_ALLOWED_CLASSES: Record<CustomSkillId, ClassId[]> = {
  first_aid: ['warrior','rogue','archer','paladin','priest','mage'], spell_boost: ['warrior','rogue','archer','paladin','priest','mage'],
  str_reinforcement: ['warrior','rogue','archer','paladin','priest','mage'], goblin_killer: ['warrior','rogue','archer','paladin','priest','mage'],
  kobold_killer: ['warrior','rogue','archer','paladin','priest','mage'], bone_crusher: ['warrior','rogue','archer','paladin','priest','mage'],
  cutlery_expert: ['warrior'], club_expert: ['warrior'], neurotoxin: ['rogue'], breathing_control: ['archer'], sacrifice: ['paladin'], bless: ['priest'], sleep: ['mage'],
}

export interface TrapPlacement { trapId: string; x: number; y: number; damage: number }
export interface SecretPlacement { secretId: string; doorX: number; doorY: number; rewardX: number; rewardY: number }
export interface MapDefinition {
  mapId: string
  name: string
  rows: readonly string[]
  start: { x: number; y: number; direction: Direction }
  encounterIds: string[]
  traps: TrapPlacement[]
  secrets: SecretPlacement[]
}

export interface QuestDefinition {
  questId: QuestId
  name: string
  mapId: string
  completionEncounterId: string
  goldReward: number
  experiencePerCharacter: number
  nextQuestId: QuestId | null
}

export interface EncounterDefinition {
  encounterId: string
  questId: QuestId
  x: number
  y: number
  role: 'normal' | 'boss'
  enemies: { enemyId: 'goblin_scout' | 'goblin_guard' | 'hobgoblin_boss' | 'orc_raider' | 'ogre' | 'kobold_skirmisher' | 'gnoll_brute' | 'minotaur_boss' | 'skeleton_soldier' | 'zombie' | 'ghoul' | 'lich_boss' | 'imp' | 'cyclops_boss' | 'wraith' | 'skeleton_king_boss'; count: number }[]
}

export const TRAINING_RUINS_ENCOUNTERS: EncounterDefinition[] = [
  { encounterId: 'training_ruins_encounter_1', questId: 'training_ruins_quest', x: 3, y: 1, role: 'normal', enemies: [{ enemyId: 'goblin_scout', count: 1 }] },
  { encounterId: 'training_ruins_encounter_2', questId: 'training_ruins_quest', x: 5, y: 3, role: 'normal', enemies: [{ enemyId: 'goblin_scout', count: 2 }] },
  { encounterId: 'training_ruins_encounter_3', questId: 'training_ruins_quest', x: 3, y: 5, role: 'normal', enemies: [{ enemyId: 'goblin_scout', count: 1 }, { enemyId: 'goblin_guard', count: 1 }] },
]

export const GOBLIN_DEN_ENCOUNTERS: EncounterDefinition[] = [
  { encounterId: 'goblin_den_encounter_1', questId: 'goblin_den_quest', x: 4, y: 1, role: 'normal', enemies: [{ enemyId: 'goblin_scout', count: 2 }] },
  { encounterId: 'goblin_den_encounter_2', questId: 'goblin_den_quest', x: 7, y: 3, role: 'normal', enemies: [{ enemyId: 'goblin_scout', count: 1 }, { enemyId: 'goblin_guard', count: 1 }] },
  { encounterId: 'goblin_den_boss', questId: 'goblin_den_quest', x: 4, y: 5, role: 'boss', enemies: [{ enemyId: 'hobgoblin_boss', count: 1 }] },
]

export const ANCIENT_SITE_ENCOUNTERS: EncounterDefinition[] = [
  { encounterId: 'ancient_site_encounter_1', questId: 'ancient_site_quest', x: 3, y: 1, role: 'normal', enemies: [{ enemyId: 'goblin_scout', count: 1 }, { enemyId: 'goblin_guard', count: 1 }] },
  { encounterId: 'ancient_site_encounter_2', questId: 'ancient_site_quest', x: 7, y: 3, role: 'normal', enemies: [{ enemyId: 'goblin_scout', count: 1 }, { enemyId: 'orc_raider', count: 1 }] },
  { encounterId: 'ancient_site_encounter_3', questId: 'ancient_site_quest', x: 3, y: 5, role: 'normal', enemies: [{ enemyId: 'orc_raider', count: 2 }] },
  { encounterId: 'ancient_site_boss', questId: 'ancient_site_quest', x: 7, y: 7, role: 'boss', enemies: [{ enemyId: 'ogre', count: 1 }] },
]

export const UNDERGROUND_DUNGEON_ENCOUNTERS: EncounterDefinition[] = [
  { encounterId: 'underground_dungeon_encounter_1', questId: 'underground_dungeon_quest', x: 3, y: 1, role: 'normal', enemies: [{ enemyId: 'kobold_skirmisher', count: 2 }] },
  { encounterId: 'underground_dungeon_encounter_2', questId: 'underground_dungeon_quest', x: 8, y: 1, role: 'normal', enemies: [{ enemyId: 'goblin_guard', count: 1 }, { enemyId: 'kobold_skirmisher', count: 1 }] },
  { encounterId: 'underground_dungeon_midboss', questId: 'underground_dungeon_quest', x: 8, y: 4, role: 'normal', enemies: [{ enemyId: 'gnoll_brute', count: 1 }] },
  { encounterId: 'underground_dungeon_encounter_4', questId: 'underground_dungeon_quest', x: 3, y: 7, role: 'normal', enemies: [{ enemyId: 'goblin_guard', count: 1 }, { enemyId: 'kobold_skirmisher', count: 2 }] },
  { encounterId: 'underground_dungeon_boss', questId: 'underground_dungeon_quest', x: 9, y: 7, role: 'boss', enemies: [{ enemyId: 'minotaur_boss', count: 1 }] },
]

export const OLD_CASTLE_ENCOUNTERS: EncounterDefinition[] = [
  { encounterId: 'old_castle_encounter_1', questId: 'old_castle_quest', x: 3, y: 1, role: 'normal', enemies: [{ enemyId: 'skeleton_soldier', count: 2 }] },
  { encounterId: 'old_castle_encounter_2', questId: 'old_castle_quest', x: 8, y: 2, role: 'normal', enemies: [{ enemyId: 'zombie', count: 2 }] },
  { encounterId: 'old_castle_midboss', questId: 'old_castle_quest', x: 8, y: 5, role: 'normal', enemies: [{ enemyId: 'ghoul', count: 1 }] },
  { encounterId: 'old_castle_encounter_4', questId: 'old_castle_quest', x: 3, y: 8, role: 'normal', enemies: [{ enemyId: 'skeleton_soldier', count: 1 }, { enemyId: 'zombie', count: 1 }] },
  { encounterId: 'old_castle_boss', questId: 'old_castle_quest', x: 9, y: 9, role: 'boss', enemies: [{ enemyId: 'lich_boss', count: 1 }] },
]

export const VOLCANIC_CAVE_ENCOUNTERS: EncounterDefinition[] = [
  { encounterId: 'volcanic_cave_encounter_1', questId: 'volcanic_cave_quest', x: 4, y: 1, role: 'normal', enemies: [{ enemyId: 'imp', count: 2 }] },
  { encounterId: 'volcanic_cave_encounter_2', questId: 'volcanic_cave_quest', x: 9, y: 3, role: 'normal', enemies: [{ enemyId: 'kobold_skirmisher', count: 2 }, { enemyId: 'imp', count: 1 }] },
  { encounterId: 'volcanic_cave_midboss', questId: 'volcanic_cave_quest', x: 6, y: 5, role: 'normal', enemies: [{ enemyId: 'ogre', count: 1 }] },
  { encounterId: 'volcanic_cave_encounter_4', questId: 'volcanic_cave_quest', x: 3, y: 8, role: 'normal', enemies: [{ enemyId: 'imp', count: 2 }, { enemyId: 'kobold_skirmisher', count: 1 }] },
  { encounterId: 'volcanic_cave_boss', questId: 'volcanic_cave_quest', x: 9, y: 9, role: 'boss', enemies: [{ enemyId: 'cyclops_boss', count: 1 }] },
]

export const DEEP_FOREST_RUINS_ENCOUNTERS: EncounterDefinition[] = [
  { encounterId: 'deep_forest_ruins_encounter_1', questId: 'deep_forest_ruins_quest', x: 4, y: 1, role: 'normal', enemies: [{ enemyId: 'skeleton_soldier', count: 2 }] },
  { encounterId: 'deep_forest_ruins_encounter_2', questId: 'deep_forest_ruins_quest', x: 10, y: 3, role: 'normal', enemies: [{ enemyId: 'orc_raider', count: 2 }] },
  { encounterId: 'deep_forest_ruins_midboss', questId: 'deep_forest_ruins_quest', x: 6, y: 5, role: 'normal', enemies: [{ enemyId: 'wraith', count: 1 }] },
  { encounterId: 'deep_forest_ruins_encounter_4', questId: 'deep_forest_ruins_quest', x: 3, y: 8, role: 'normal', enemies: [{ enemyId: 'skeleton_soldier', count: 2 }, { enemyId: 'orc_raider', count: 1 }] },
  { encounterId: 'deep_forest_ruins_boss', questId: 'deep_forest_ruins_quest', x: 11, y: 9, role: 'boss', enemies: [{ enemyId: 'skeleton_king_boss', count: 1 }] },
]

const ALL_ENCOUNTERS = [...TRAINING_RUINS_ENCOUNTERS, ...GOBLIN_DEN_ENCOUNTERS, ...ANCIENT_SITE_ENCOUNTERS, ...UNDERGROUND_DUNGEON_ENCOUNTERS, ...OLD_CASTLE_ENCOUNTERS, ...VOLCANIC_CAVE_ENCOUNTERS, ...DEEP_FOREST_RUINS_ENCOUNTERS]

export const MAP_DATA: Record<string, MapDefinition> = {
  training_ruins: { mapId: 'training_ruins', name: '훈련 폐허', rows: ['#######','#S....#','#.###.#','#...#.#','###.#.#','#.....#','#######'], start: { x: 1, y: 1, direction: 'east' }, encounterIds: TRAINING_RUINS_ENCOUNTERS.map((item) => item.encounterId), traps: [], secrets: [] },
  goblin_den: { mapId: 'goblin_den', name: '고블린 소굴', rows: ['#########','#S......#','#######.#','#...#...#','#####.###','####..###','#########'], start: { x: 1, y: 1, direction: 'east' }, encounterIds: GOBLIN_DEN_ENCOUNTERS.map((item) => item.encounterId), traps: [{ trapId: 'goblin_den_trap_1', x: 6, y: 1, damage: 2 }], secrets: [{ secretId: 'goblin_den_secret_1', doorX: 2, doorY: 2, rewardX: 2, rewardY: 3 }] },
  // TODO(v0.2.0): 승인된 좌표를 연결하는 임시 9x9 회랑과 함정·비밀방 배치다.
  ancient_site: { mapId: 'ancient_site', name: '유적지', rows: ['#########','#S......#','#######.#','#.......#','#.#######','#.......#','#######.#','#####.#.#','#########'], start: { x: 1, y: 1, direction: 'east' }, encounterIds: ANCIENT_SITE_ENCOUNTERS.map((item) => item.encounterId), traps: [{ trapId: 'ancient_site_trap_1', x: 6, y: 5, damage: 2 }], secrets: [{ secretId: 'ancient_site_secret_1', doorX: 5, doorY: 6, rewardX: 5, rewardY: 7 }] },
  // TODO(v0.2.0): 승인 좌표를 한 회랑으로 연결한 임시 지하 던전이다.
  underground_dungeon: { mapId: 'underground_dungeon', name: '지하 던전', rows: ['###########','#S........#','########.##','########.##','#........##','#.###.#####','#.#########','#.........#','###########'], start: { x: 1, y: 1, direction: 'east' }, encounterIds: UNDERGROUND_DUNGEON_ENCOUNTERS.map((item) => item.encounterId), traps: [{ trapId: 'underground_dungeon_trap_1', x: 5, y: 7, damage: 2 }], secrets: [{ secretId: 'underground_dungeon_secret_1', doorX: 5, doorY: 6, rewardX: 5, rewardY: 5 }] },
  // TODO(v0.2.0): 승인 좌표를 단일 회랑으로 연결한 임시 옛 고성과 비밀방 배치다.
  old_castle: { mapId: 'old_castle', name: '옛 고성', rows: ['###########','#S........#','########.##','########.##','########.##','#........##','#.###.#####','#.#########','#.........#','#########.#','###########'], start: { x: 1, y: 1, direction: 'east' }, encounterIds: OLD_CASTLE_ENCOUNTERS.map((item) => item.encounterId), traps: [{ trapId: 'old_castle_trap_1', x: 6, y: 5, damage: 2 }], secrets: [{ secretId: 'old_castle_secret_1', doorX: 5, doorY: 7, rewardX: 5, rewardY: 6 }] },
  // TODO(v0.2.0): 승인 좌표를 단일 회랑으로 연결한 임시 화산 동굴과 비밀방 배치다.
  volcanic_cave: { mapId: 'volcanic_cave', name: '화산 동굴', rows: ['###########','#S........#','#########.#','######....#','######.####','###....####','###.#.#####','###.#.#####','###.......#','#########.#','###########'], start: { x: 1, y: 1, direction: 'east' }, encounterIds: VOLCANIC_CAVE_ENCOUNTERS.map((item) => item.encounterId), traps: [{ trapId: 'volcanic_cave_trap_1', x: 4, y: 5, damage: 2 }], secrets: [{ secretId: 'volcanic_cave_secret_1', doorX: 4, doorY: 7, rewardX: 5, rewardY: 7 }] },
  // TODO(v0.2.0): 승인 좌표를 단일 회랑으로 연결한 임시 깊은 숲 폐허와 비밀방 배치다.
  deep_forest_ruins: { mapId: 'deep_forest_ruins', name: '깊은 숲 폐허', rows: ['#############','#S..........#','##########.##','######.....##','######.######','###....######','###.#.#######','###.#.#######','###.........#','###########.#','#############'], start: { x: 1, y: 1, direction: 'east' }, encounterIds: DEEP_FOREST_RUINS_ENCOUNTERS.map((item) => item.encounterId), traps: [{ trapId: 'deep_forest_ruins_trap_1', x: 5, y: 5, damage: 2 }], secrets: [{ secretId: 'deep_forest_ruins_secret_1', doorX: 4, doorY: 7, rewardX: 5, rewardY: 7 }] },
}

export const MAP_ROWS = MAP_DATA.training_ruins.rows

export const QUEST_DATA: Partial<Record<QuestId, QuestDefinition>> = {
  training_ruins_quest: { questId: 'training_ruins_quest', name: '훈련 폐허', mapId: 'training_ruins', completionEncounterId: 'training_ruins_encounter_3', goldReward: 300, experiencePerCharacter: 100, nextQuestId: 'goblin_den_quest' },
  goblin_den_quest: { questId: 'goblin_den_quest', name: '고블린 소굴', mapId: 'goblin_den', completionEncounterId: 'goblin_den_boss', goldReward: 320, experiencePerCharacter: 100, nextQuestId: 'ancient_site_quest' },
  ancient_site_quest: { questId: 'ancient_site_quest', name: '유적지', mapId: 'ancient_site', completionEncounterId: 'ancient_site_boss', goldReward: 500, experiencePerCharacter: 100, nextQuestId: 'underground_dungeon_quest' },
  underground_dungeon_quest: { questId: 'underground_dungeon_quest', name: '지하 던전', mapId: 'underground_dungeon', completionEncounterId: 'underground_dungeon_boss', goldReward: 720, experiencePerCharacter: 100, nextQuestId: 'old_castle_quest' },
  old_castle_quest: { questId: 'old_castle_quest', name: '옛 고성', mapId: 'old_castle', completionEncounterId: 'old_castle_boss', goldReward: 1050, experiencePerCharacter: 100, nextQuestId: null },
  volcanic_cave_quest: { questId: 'volcanic_cave_quest', name: '화산 동굴', mapId: 'volcanic_cave', completionEncounterId: 'volcanic_cave_boss', goldReward: 760, experiencePerCharacter: 100, nextQuestId: null },
  deep_forest_ruins_quest: { questId: 'deep_forest_ruins_quest', name: '깊은 숲 폐허', mapId: 'deep_forest_ruins', completionEncounterId: 'deep_forest_ruins_boss', goldReward: 820, experiencePerCharacter: 100, nextQuestId: null },
}

export function getQuestDefinition(questId: QuestId): QuestDefinition | null { return QUEST_DATA[questId] ?? null }
export function getMapDefinition(mapId: string): MapDefinition { const map = MAP_DATA[mapId]; if (!map) throw new Error(`알 수 없는 맵이다: ${mapId}`); return map }
export function getEncounterDefinition(encounterId: string): EncounterDefinition | null { return ALL_ENCOUNTERS.find((item) => item.encounterId === encounterId) ?? null }
export function getNextRequiredEncounter(mapId: string, completedEncounterIds: readonly string[]): EncounterDefinition | null {
  const map = getMapDefinition(mapId)
  const id = map.encounterIds.find((encounterId) => !completedEncounterIds.includes(encounterId))
  return id ? getEncounterDefinition(id) : null
}
export function getNextTrainingEncounter(completedEncounterIds: readonly string[]): EncounterDefinition | null { return getNextRequiredEncounter('training_ruins', completedEncounterIds) }

/** Maps the validated Korean profile value to the character asset filename token. */
function toAssetGender(gender: Gender): AssetGender {
  return gender === '여성' ? 'female' : 'male'
}

function toAttributeModifiers(growth: AttributeGrowth): AttributeModifiers {
  return { ...growth }
}

function equipmentModifiers(equipment: CharacterEquipment): AttributeModifiers[] {
  return (Object.values(equipment).filter((instance): instance is EquipmentInstance => Boolean(instance))).map((instance) => {
    const definition = EQUIPMENT_DATA[instance.equipmentId]
    if (!definition) throw new Error(`알 수 없는 장비다: ${instance.equipmentId}`)
    return definition.modifiers
  })
}

export function getFinalAttributes(character: PersistentCharacter): BaseAttributes {
  const data = CLASS_DATA[character.classId]
  const base = combineAttributes(RACE_DATA[character.raceId].baseAttributes, data.attributeModifiers)
  return addModifiers(base, [toAttributeModifiers(character.growth), ...equipmentModifiers(character.equipment)])
}

function makePartyActor(character: PersistentCharacter): Actor {
  const data = CLASS_DATA[character.classId]
  const attributes = getFinalAttributes(character)
  const stats = deriveCombatStats(attributes, data.derivation)
  return {
    id: character.characterId, contentId: character.classId, name: character.name, side: 'party', classId: character.classId,
    row: character.row, raceId: character.raceId, gender: toAssetGender(character.gender),
    weaponFamily: character.equipment.weapon ? EQUIPMENT_DATA[character.equipment.weapon.equipmentId].family : undefined,
    attributes,
    maxHp: stats.maxHp, currentHp: stats.maxHp, atk: stats.atk, def: stats.def, agi: stats.agi,
    skillIds: ['basic_attack', ...getUnlockedClassSkillIds(character.classId, character.level), ...character.customSkillSlots.filter((slot): slot is NonNullable<typeof slot> => Boolean(slot)).map((slot) => slot.skillId).filter((skillId) => SKILLS[skillId])],
  }
}

const ZERO_GROWTH: AttributeGrowth = { str: 0, dex: 0, int: 0, con: 0, agi: 0, luck: 0 }

function startingCharacter(characterId: string, name: string, raceId: RaceId, classId: ClassId, gender: Gender, row: Row, instanceIndex: number): PersistentCharacter {
  return {
    characterId, name, raceId, classId, gender, row, level: 1, experience: 0, growth: { ...ZERO_GROWTH },
    equipment: {
      weapon: { equipmentInstanceId: `equipment_${instanceIndex}`, equipmentId: STARTING_WEAPON_BY_CLASS[classId] },
      offhand: null,
      head: null,
      body: null,
    },
    inventorySlots: [],
    customSkillSlots: [null, null, null],
  }
}

export function createInitialCharacters(main: MainCharacterConfig): [PersistentCharacter, PersistentCharacter, PersistentCharacter, PersistentCharacter] {
  return [
    startingCharacter('party_main', main.name.trim(), main.raceId, main.classId, main.gender, 'front', 1),
    // TODO(v0.2.0): 고정 동료의 종족·직업·성별 콘텐츠를 별도 승인 데이터로 교체할 때 이 초기값을 갱신한다.
    startingCharacter('party_warrior', '브람', 'human', 'warrior', '남성', 'front', 2),
    startingCharacter('party_priest', '세라', 'human', 'priest', '여성', 'back', 3),
    startingCharacter('party_archer', '로웬', 'human', 'archer', '남성', 'back', 4),
  ]
}

export function createPartyFromCharacters(characters: readonly PersistentCharacter[]): Actor[] {
  return characters.map(makePartyActor)
}

export function createParty(main: MainCharacterConfig): Actor[] {
  return createPartyFromCharacters(createInitialCharacters(main))
}

export function createEnemies(): Actor[] {
  return createEncounterEnemies('training_ruins_encounter_3')
}

export function createEncounterEnemies(encounterId: string): Actor[] {
  const encounter = getEncounterDefinition(encounterId)
  if (!encounter) throw new Error(`알 수 없는 조우다: ${encounterId}`)
  return encounter.enemies.flatMap(({ enemyId, count }) => Array.from({ length: count }, (_, index) => {
    const definitions = {
      goblin_scout: { name: '고블린 정찰병', maxHp: 18, atk: 3, def: 2, agi: 4, skillId: 'basic_attack' },
      goblin_guard: { name: '고블린 경비병', maxHp: 24, atk: 4, def: 3, agi: 2, skillId: 'basic_attack' },
      hobgoblin_boss: { name: '홉고블린 대장', maxHp: 68, atk: 5, def: 4, agi: 3, skillId: 'commanding_strike' },
      orc_raider: { name: '오크 약탈자', maxHp: 30, atk: 6, def: 3, agi: 3, skillId: 'basic_attack' },
      ogre: { name: '오우거', maxHp: 92, atk: 7, def: 5, agi: 1, skillId: 'ogre_smash' },
      kobold_skirmisher: { name: '코볼트 척후병', maxHp: 25, atk: 5, def: 3, agi: 6, skillId: 'basic_attack' },
      gnoll_brute: { name: '놀 투사', maxHp: 74, atk: 7, def: 5, agi: 5, skillId: 'rending_bite' },
      minotaur_boss: { name: '미노타우르스', maxHp: 120, atk: 9, def: 6, agi: 4, skillId: 'minotaur_gore' },
      skeleton_soldier: { name: '스켈레톤 병사', maxHp: 30, atk: 6, def: 5, agi: 3, skillId: 'basic_attack', isUndead: true },
      zombie: { name: '좀비', maxHp: 42, atk: 7, def: 3, agi: 1, skillId: 'basic_attack', isUndead: true },
      ghoul: { name: '구울', maxHp: 82, atk: 8, def: 5, agi: 6, skillId: 'paralyzing_claw', isUndead: true },
      lich_boss: { name: '리치', maxHp: 125, atk: 10, def: 7, agi: 6, skillId: 'death_bolt', isUndead: true },
      imp: { name: '임프', maxHp: 34, atk: 8, def: 4, agi: 7, skillId: 'basic_attack' },
      cyclops_boss: { name: '사이클롭스', maxHp: 150, atk: 11, def: 7, agi: 2, skillId: 'crushing_blow' },
      wraith: { name: '레이스', maxHp: 86, atk: 10, def: 7, agi: 8, skillId: 'drain_touch', isUndead: true },
      skeleton_king_boss: { name: '스켈레톤 킹', maxHp: 155, atk: 11, def: 8, agi: 5, skillId: 'royal_cleave', isUndead: true },
    } as const
    const definition = definitions[enemyId]
    return {
      id: `${encounterId}_${enemyId}_${index + 1}`, contentId: enemyId, name: definition.name, side: 'enemy' as const,
      maxHp: definition.maxHp, currentHp: definition.maxHp, atk: definition.atk, def: definition.def, agi: definition.agi,
      isBoss: encounter.role === 'boss', isUndead: 'isUndead' in definition ? definition.isUndead : false, skillIds: [definition.skillId],
    }
  }))
}
