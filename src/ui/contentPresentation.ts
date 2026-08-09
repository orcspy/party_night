import { EQUIPMENT_DATA, ITEM_DATA, SKILLS } from '../game/content'
import { getEquipmentDisplayName, getItemDisplayName, getSkillDisplayName } from '../game/displayNames'
import type { EquipmentFamily, ItemId, PendingRewardEntry, Rarity } from '../game/types'

export const CONTENT_ICON_KEYS = [
  'item_potion',
  'equipment_sword',
  'equipment_club',
  'equipment_dagger',
  'equipment_bow',
  'equipment_staff',
  'equipment_shield',
  'equipment_helmet',
  'equipment_armor',
  'skill_active',
  'skill_passive',
] as const

export type ContentIconKey = typeof CONTENT_ICON_KEYS[number]
export type PresentationRarity = Rarity | 'neutral'

export interface ContentPresentation {
  label: string
  iconKey: ContentIconKey | null
  fallbackText: '아' | '장' | '액' | '패'
  rarity: PresentationRarity
  rarityLabel: string | null
}

const RARITY_LABELS: Record<Rarity, string> = {
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
  heroic: '영웅',
  legendary: '전설',
}

export const RARITY_CSS_TOKENS: Record<Rarity, string> = {
  common: '--rarity-common',
  uncommon: '--rarity-uncommon',
  rare: '--rarity-rare',
  heroic: '--rarity-heroic',
  legendary: '--rarity-legendary',
}

const EQUIPMENT_ICONS: Record<EquipmentFamily, ContentIconKey> = {
  dagger: 'equipment_dagger',
  sword: 'equipment_sword',
  mace: 'equipment_club',
  shield: 'equipment_shield',
  bow: 'equipment_bow',
  staff: 'equipment_staff',
  rod: 'equipment_staff',
  head: 'equipment_helmet',
  body: 'equipment_armor',
}

export function getRarityDisplayName(rarity: Rarity): string {
  return RARITY_LABELS[rarity]
}

export function getEquipmentPresentation(equipmentId: string): ContentPresentation {
  const definition = EQUIPMENT_DATA[equipmentId]
  if (!definition) return { label: getEquipmentDisplayName(equipmentId), iconKey: null, fallbackText: '장', rarity: 'neutral', rarityLabel: null }
  return {
    label: definition.name,
    iconKey: EQUIPMENT_ICONS[definition.family] ?? null,
    fallbackText: '장',
    rarity: definition.rarity,
    rarityLabel: getRarityDisplayName(definition.rarity),
  }
}

export function getItemPresentation(itemId: string): ContentPresentation {
  const known = ITEM_DATA[itemId as ItemId] !== undefined
  return {
    label: getItemDisplayName(itemId),
    iconKey: known ? 'item_potion' : null,
    fallbackText: '아',
    rarity: 'neutral',
    rarityLabel: null,
  }
}

export function getSkillPresentation(skillId: string): ContentPresentation {
  const skill = SKILLS[skillId]
  return {
    label: getSkillDisplayName(skillId),
    iconKey: skill ? (skill.activation === 'active' ? 'skill_active' : 'skill_passive') : null,
    fallbackText: skill?.activation === 'passive' ? '패' : '액',
    rarity: 'neutral',
    rarityLabel: null,
  }
}

export function getRewardPresentation(reward: PendingRewardEntry): ContentPresentation {
  if (reward.kind === 'equipment') return getEquipmentPresentation(reward.instance.equipmentId)
  if (reward.kind === 'skill') return getSkillPresentation(reward.instance.skillId)
  return getItemPresentation(reward.itemId)
}
