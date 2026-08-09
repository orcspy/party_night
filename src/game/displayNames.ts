import { CUSTOM_SKILL_DATA, EQUIPMENT_DATA, ITEM_DATA, QUEST_DATA, SKILLS } from './content'
import type { Direction, EquipmentSlot, PendingRewardEntry, QuestId } from './types'

const CLASS_SKILL_NAMES: Record<string, string> = {
  ability_reinforcement: '능력 강화',
  wound_break: '상처 가르기',
  head_shot: '헤드 샷',
  sacred_rage: '신성한 분노',
  celestial_shroud: '천상의 수의',
  fire_ball: '화염구',
}

const QUEST_NAMES: Record<QuestId, string> = {
  training_ruins_quest: '훈련 폐허', goblin_den_quest: '고블린 소굴', ancient_site_quest: '유적지',
  underground_dungeon_quest: '지하 던전', old_castle_quest: '옛 고성', volcanic_cave_quest: '화산 동굴', deep_forest_ruins_quest: '깊은 숲 폐허',
}

const ENEMY_NAMES: Record<string, string> = {
  goblin_scout: '고블린 정찰병', goblin_guard: '고블린 경비병', hobgoblin_boss: '홉고블린 대장', orc_raider: '오크 약탈자', ogre: '오우거',
  kobold_skirmisher: '코볼트 척후병', gnoll_brute: '놀 투사', minotaur_boss: '미노타우르스', skeleton_soldier: '스켈레톤 병사', zombie: '좀비', ghoul: '구울', lich_boss: '리치',
  imp: '임프', cyclops_boss: '사이클롭스', wraith: '레이스', skeleton_king_boss: '스켈레톤 킹',
}

const SLOT_NAMES: Record<EquipmentSlot, string> = { weapon: '무기', offhand: '보조 장비', head: '머리', body: '몸통' }
const DIRECTION_NAMES: Record<Direction, string> = { north: '북쪽', east: '동쪽', south: '남쪽', west: '서쪽' }

export function getSkillDisplayName(skillId: string): string {
  return SKILLS[skillId]?.name ?? CUSTOM_SKILL_DATA[skillId as keyof typeof CUSTOM_SKILL_DATA] ?? CLASS_SKILL_NAMES[skillId] ?? '알 수 없는 스킬'
}

export function getEquipmentDisplayName(equipmentId: string): string {
  return EQUIPMENT_DATA[equipmentId]?.name ?? '알 수 없는 장비'
}

export function getItemDisplayName(itemId: string): string {
  return ITEM_DATA[itemId as keyof typeof ITEM_DATA]?.name ?? '알 수 없는 아이템'
}

export function getQuestDisplayName(questId: QuestId): string {
  return QUEST_DATA[questId]?.name ?? QUEST_NAMES[questId] ?? '알 수 없는 퀘스트'
}

export function getEnemyDisplayName(enemyId: string): string {
  return ENEMY_NAMES[enemyId] ?? '알 수 없는 적'
}

export function getEquipmentSlotDisplayName(slot: EquipmentSlot): string {
  return SLOT_NAMES[slot]
}

export function getDirectionDisplayName(direction: Direction): string {
  return DIRECTION_NAMES[direction]
}

export function getRewardDisplayName(reward: PendingRewardEntry): string {
  if (reward.kind === 'skill') return getSkillDisplayName(reward.instance.skillId)
  if (reward.kind === 'equipment') return getEquipmentDisplayName(reward.instance.equipmentId)
  return getItemDisplayName(reward.itemId)
}
