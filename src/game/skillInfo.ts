import { CLASS_SKILL_IDS } from './characters'
import { CLASS_DATA, CUSTOM_SKILL_ALLOWED_CLASSES, SKILLS, type CustomSkillId } from './content'
import type { ClassId, Skill } from './types'

export const SKILL_INFO_CLASS_ORDER = ['warrior', 'paladin', 'rogue', 'archer', 'priest', 'mage'] as const satisfies readonly ClassId[]

const CLASS_CUSTOM_SKILL_IDS = {
  warrior: ['cutlery_expert', 'club_expert'],
  paladin: ['sacrifice'],
  rogue: ['neurotoxin'],
  archer: ['breathing_control'],
  priest: ['bless'],
  mage: ['sleep'],
} as const satisfies Record<ClassId, readonly CustomSkillId[]>

const PUBLIC_CUSTOM_SKILL_IDS = [
  'first_aid',
  'spell_boost',
  'str_reinforcement',
  'goblin_killer',
  'kobold_killer',
  'bone_crusher',
] as const satisfies readonly CustomSkillId[]

export const PLAYER_SKILL_EFFECT_NOTES = {
  basic_attack: '기본 피해식',
  power_strike: '50% 확률로 적 1턴 기절',
  quick_stab: '100% 확률로 적 출혈(1dmg per turn), 누적 가능',
  aimed_shot: '다이스 하나 선택 리롤',
  holy_strike: '언데드에 2배 효과',
  heal: '아군 한명 치료, 성력 1 축적(버프로 취급)',
  arcane_bolt: 'overkill데미지 이전(임의의 남은 적), 마력1 축적',
  taunt: '1턴간 적이 50%확률로 자신을 공격',
  seek_trap: '함정 및 숨겨진 문 발견',
  find_leak: '지정대상은 다음 궁수 차례가 끝날때까지 대상이 받는 피해 증가(dice 값)',
  protection_pledge: '모든 아군이 받는 최종 피해 -1',
  smite: '언데드에 2배 효과, 성력 1축적',
  lightning_bolt: '100% 확률로 적 1턴 마비, 마력 1축적',
  ability_reinforcement: '3턴간 모든 스테이터스 5증가, 3턴후 1턴간 모든 스테이터스 2감소',
  wound_break: '적 출혈 제거, 출혈 중첩당 +x배의 데미지',
  head_shot: '약점 노출중 대상에만 사용가능',
  sacred_rage: '3턴동안 언데드에 3배 데미지. 일반 적에 2배 데미지(성스러운 분노 포함)',
  celestial_shroud: '성력 1당 치료+2, 징벌 데미지+2',
  fire_ball: '축적된 마력 1당 +5 데미지',
  first_aid: '기본 치료, 붕대 소모',
  spell_boost: '마법 데미지 +1',
  str_reinforcement: '물리 데미지 +1',
  goblin_killer: '고블린 대상 대미지 +3',
  kobold_killer: '코볼트 대상 대미지 +3',
  bone_crusher: '스켈레톤 대상 대미지 +3, 보스 대상시 +1',
  cutlery_expert: '날붙이 무기류 +1 대미지',
  club_expert: '비 날붙이 무기류 +1 대미지',
  neurotoxin: '100% 확률로 적 신경독 중독(대상의 전투 agi 50% down 중복 불가)+출혈',
  breathing_control: '사격 대미지 + 2',
  sacrifice: '아군에게 치료, 치료된 1/2만큼 hp소모',
  bless: '아군 한명 str, dex, int 2씩 증가, 성력 1 축적',
  sleep: '50%(25%) 확률로 dice값의 1/2턴(1/4턴) 동안 수면 부여, 마력1 축적',
} as const

type PlayerSkillInfoId = keyof typeof PLAYER_SKILL_EFFECT_NOTES

export interface PlayerSkillInfoRow {
  skillId: PlayerSkillInfoId
  name: string
  classLabel: string
  classificationLabel: '액티브' | '패시브'
  unlockLevel: number
  targetLabel: string
  diceLabel: string
  fixedModifierLabel: string
  cooldownRounds: number
  effectNote: string
}

const CLASS_UNLOCK_LEVELS = [1, 2, 5] as const
const CUSTOM_UNLOCK_LEVEL = 3

function getTargetLabel(skillId: PlayerSkillInfoId, skill: Skill): string {
  if (skillId === 'protection_pledge') return '모든 아군'
  return {
    single_enemy: '적 1명',
    all_enemies: '모든 적',
    single_ally: '아군 1명',
    self: '자신',
  }[skill.targetMode]
}

function getCooldownRounds(skill: Skill): number {
  if (skill.useLimit.type === 'cooldown') return skill.useLimit.rounds
  if (skill.useLimit.type === 'unlimited') return 0
  throw new Error(`전투당 1회 스킬은 숫자 쿨타임으로 표시할 수 없습니다: ${skill.id}`)
}

function getCustomSkillClassLabel(skillId: CustomSkillId): string {
  const allowedClasses = CUSTOM_SKILL_ALLOWED_CLASSES[skillId]
  if (SKILL_INFO_CLASS_ORDER.every((classId) => allowedClasses.includes(classId))) return '공용'
  return allowedClasses.map((classId) => CLASS_DATA[classId].name).join(' · ')
}

function createRow(skillId: PlayerSkillInfoId, classLabel: string, unlockLevel: number): PlayerSkillInfoRow {
  const skill = SKILLS[skillId]
  return {
    skillId,
    name: skill.name,
    classLabel,
    classificationLabel: skill.activation === 'active' ? '액티브' : '패시브',
    unlockLevel,
    targetLabel: getTargetLabel(skillId, skill),
    diceLabel: skill.diceCount === 0 ? '없음' : `${skill.diceCount}d6`,
    fixedModifierLabel: skill.fixedModifier > 0 ? `+${skill.fixedModifier}` : `${skill.fixedModifier}`,
    cooldownRounds: getCooldownRounds(skill),
    effectNote: PLAYER_SKILL_EFFECT_NOTES[skillId],
  }
}

export function getPlayerSkillInfoRows(): readonly PlayerSkillInfoRow[] {
  const classRows = SKILL_INFO_CLASS_ORDER.flatMap((classId) => {
    const classLabel = CLASS_DATA[classId].name
    const classSkillRows = CLASS_SKILL_IDS[classId].map((skillId, index) => createRow(skillId, classLabel, CLASS_UNLOCK_LEVELS[index]))
    const customSkillRows = CLASS_CUSTOM_SKILL_IDS[classId].map((skillId) => createRow(skillId, getCustomSkillClassLabel(skillId), CUSTOM_UNLOCK_LEVEL))
    return [...classSkillRows, ...customSkillRows]
  })
  const publicRows = [
    createRow('basic_attack', '공용', 1),
    ...PUBLIC_CUSTOM_SKILL_IDS.map((skillId) => createRow(skillId, getCustomSkillClassLabel(skillId), CUSTOM_UNLOCK_LEVEL)),
  ]
  return [...classRows, ...publicRows]
}
