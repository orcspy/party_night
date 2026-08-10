import { describe, expect, it } from 'vitest'
import rawDataTable from '../../raw_data_table.md?raw'
import { CLASS_SKILL_IDS } from '../game/characters'
import { CUSTOM_SKILL_ALLOWED_CLASSES, CUSTOM_SKILL_DATA, SKILLS } from '../game/content'
import { getPlayerSkillInfoRows, PLAYER_SKILL_EFFECT_NOTES } from '../game/skillInfo'

const EXPECTED_SKILL_IDS = [
  'power_strike', 'taunt', 'ability_reinforcement', 'cutlery_expert', 'club_expert',
  'holy_strike', 'protection_pledge', 'sacred_rage', 'sacrifice',
  'quick_stab', 'seek_trap', 'wound_break', 'neurotoxin',
  'aimed_shot', 'find_leak', 'head_shot', 'breathing_control',
  'heal', 'smite', 'celestial_shroud', 'bless',
  'arcane_bolt', 'lightning_bolt', 'fire_ball', 'sleep',
  'basic_attack', 'first_aid', 'spell_boost', 'str_reinforcement', 'goblin_killer', 'kobold_killer', 'bone_crusher',
] as const

function getRawEffectNotes(): Record<string, string> {
  return Object.fromEntries(rawDataTable.split('\n').flatMap((line) => {
    if (!line.startsWith('| `')) return []
    const columns = line.split('|').slice(1, -1).map((column) => column.trim())
    if (columns.length < 12) return []
    return [[columns[0].replaceAll('`', ''), columns[11]]]
  }))
}

describe('player skill information', () => {
  it('returns exactly 32 unique player skills in the approved order', () => {
    const rows = getPlayerSkillInfoRows()
    expect(rows).toHaveLength(32)
    expect(rows.map((row) => row.skillId)).toEqual(EXPECTED_SKILL_IDS)
    expect(new Set(rows.map((row) => row.skillId)).size).toBe(32)
    expect(rows.map((row) => row.classLabel)).toEqual([
      ...Array(5).fill('전사'), ...Array(4).fill('성기사'), ...Array(4).fill('도적'),
      ...Array(4).fill('궁수'), ...Array(4).fill('사제'), ...Array(4).fill('마법사'), ...Array(7).fill('공용'),
    ])
  })

  it('uses current runtime values for structure and approved unlock levels', () => {
    const rows = getPlayerSkillInfoRows()
    expect(rows.map((row) => row.unlockLevel)).toEqual([
      1, 2, 5, 3, 3, 1, 2, 5, 3, 1, 2, 5, 3, 1, 2, 5, 3, 1, 2, 5, 3, 1, 2, 5, 3, 1, 3, 3, 3, 3, 3, 3,
    ])
    expect(rows.find((row) => row.skillId === 'taunt')).toMatchObject({ classificationLabel: '액티브', targetLabel: '모든 적', diceLabel: '없음', fixedModifierLabel: '0', cooldownRounds: 2 })
    expect(rows.find((row) => row.skillId === 'protection_pledge')).toMatchObject({ classificationLabel: '패시브', targetLabel: '모든 아군', cooldownRounds: 0 })
    expect(rows.find((row) => row.skillId === 'find_leak')).toMatchObject({ diceLabel: '1d6', fixedModifierLabel: '-3' })
    expect(rows.find((row) => row.skillId === 'fire_ball')).toMatchObject({ targetLabel: '모든 적', diceLabel: '3d6', fixedModifierLabel: '+7', cooldownRounds: 5 })
    expect(rows.every((row) => Number.isInteger(row.cooldownRounds) && row.cooldownRounds >= 0)).toBe(true)
  })

  it('copies every player effect note exactly from raw sections 7.2 and 7.3', () => {
    const rawEffectNotes = getRawEffectNotes()
    expect(Object.keys(PLAYER_SKILL_EFFECT_NOTES).sort()).toEqual([...EXPECTED_SKILL_IDS].sort())
    for (const skillId of EXPECTED_SKILL_IDS.filter((id) => id !== 'neurotoxin')) expect(PLAYER_SKILL_EFFECT_NOTES[skillId]).toBe(rawEffectNotes[skillId])
    expect(PLAYER_SKILL_EFFECT_NOTES.neurotoxin).toBe('100% 확률로 적 신경독 중독(대상의 전투 agi 50% down 중복 불가)+출혈')
    expect(PLAYER_SKILL_EFFECT_NOTES.neurotoxin).not.toBe(rawEffectNotes.neurotoxin)
  })

  it('does not mutate authoritative skill, class, or custom-skill data', () => {
    const before = JSON.stringify({ skills: SKILLS, classSkills: CLASS_SKILL_IDS, customSkills: CUSTOM_SKILL_DATA, allowed: CUSTOM_SKILL_ALLOWED_CLASSES, notes: PLAYER_SKILL_EFFECT_NOTES })
    const first = getPlayerSkillInfoRows()
    const second = getPlayerSkillInfoRows()
    expect(first).not.toBe(second)
    expect(first[0]).not.toBe(second[0])
    expect(JSON.stringify({ skills: SKILLS, classSkills: CLASS_SKILL_IDS, customSkills: CUSTOM_SKILL_DATA, allowed: CUSTOM_SKILL_ALLOWED_CLASSES, notes: PLAYER_SKILL_EFFECT_NOTES })).toBe(before)
  })
})
