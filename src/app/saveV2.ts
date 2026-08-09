import { expectedGrowth, levelForExperience } from '../game/characters'
import { CUSTOM_SKILL_ALLOWED_CLASSES, CUSTOM_SKILL_DATA, EQUIPMENT_DATA, ITEM_DATA, type CustomSkillId } from '../game/content'
import { getInventoryCapacity, usedStorageSlots } from '../game/inventory'
import { normalizeSeed } from '../game/rng'
import type { ClassId, EquipmentInstance, EquipmentSlot, ItemStack, PersistentCharacter, ProfileV2, QuestId, Rarity, SkillInstance } from '../game/types'

export const PROFILE_V2_KEY = 'party_night_profile_v2'

interface ProfileV2Envelope {
  version: 2
  profile: ProfileV2
}

const QUEST_IDS: QuestId[] = ['training_ruins_quest', 'goblin_den_quest', 'ancient_site_quest', 'underground_dungeon_quest', 'old_castle_quest', 'volcanic_cave_quest', 'deep_forest_ruins_quest']
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'heroic', 'legendary']
const EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'offhand', 'head', 'body']
const ATTRIBUTE_KEYS = ['str', 'dex', 'int', 'con', 'agi', 'luck'] as const

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function integer(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum
}

function isEquipmentInstance(value: unknown): value is EquipmentInstance {
  const item = record(value)
  return Boolean(item && nonEmptyString(item.equipmentInstanceId) && nonEmptyString(item.equipmentId) && EQUIPMENT_DATA[item.equipmentId])
}

function isSkillInstance(value: unknown): value is SkillInstance {
  const item = record(value)
  return Boolean(item && nonEmptyString(item.skillInstanceId) && nonEmptyString(item.skillId) && item.skillId in CUSTOM_SKILL_DATA)
}

function isItemStack(value: unknown): value is ItemStack {
  const item = record(value)
  return Boolean(item && nonEmptyString(item.stackId) && nonEmptyString(item.itemId) && ITEM_DATA[item.itemId as keyof typeof ITEM_DATA] && integer(item.quantity, 1, 10))
}

function isCharacter(value: unknown): value is PersistentCharacter {
  const character = record(value)
  if (!character || !nonEmptyString(character.characterId) || !nonEmptyString(character.name) || character.name.trim().length > 12) return false
  if (!['human', 'elf', 'dwarf', 'halfling'].includes(String(character.raceId))) return false
  if (!['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'].includes(String(character.classId))) return false
  if (character.gender !== '남성' && character.gender !== '여성') return false
  if (character.row !== 'front' && character.row !== 'back') return false
  if (!integer(character.level, 1, 10) || !integer(character.experience, 0, 1000)) return false

  const growth = record(character.growth)
  if (!growth || ATTRIBUTE_KEYS.some((key) => !integer(growth[key], 0))) return false
  if (character.level !== levelForExperience(character.experience as number)) return false
  const approvedGrowth = expectedGrowth(character.classId as ClassId, character.level as number)
  if (ATTRIBUTE_KEYS.some((key) => growth[key] !== approvedGrowth[key])) return false

  const equipment = record(character.equipment)
  if (!equipment || EQUIPMENT_SLOTS.some((slot) => !(slot in equipment))) return false
  const classId = character.classId as ClassId
  for (const slot of EQUIPMENT_SLOTS) {
    const instance = equipment[slot]
    if (instance === null) continue
    if (!isEquipmentInstance(instance)) return false
    const definition = EQUIPMENT_DATA[instance.equipmentId]
    if (definition.slot !== slot || !definition.allowedClasses.includes(classId)) return false
  }
  const weapon = equipment.weapon
  if (weapon && isEquipmentInstance(weapon) && EQUIPMENT_DATA[weapon.equipmentId].twoHanded && equipment.offhand !== null) return false

  if (!Array.isArray(character.inventorySlots) || !character.inventorySlots.every(isItemStack)) return false
  if (!Array.isArray(character.customSkillSlots) || character.customSkillSlots.length !== 3) return false
  const unlockLevels = [3, 7, 10]
  const equippedSkillIds = new Set<string>()
  for (let index = 0; index < 3; index++) {
    const instance = character.customSkillSlots[index]
    if (instance !== null && (!isSkillInstance(instance) || character.level < unlockLevels[index])) return false
    if (instance) {
      if (equippedSkillIds.has(instance.skillId) || !CUSTOM_SKILL_ALLOWED_CLASSES[instance.skillId as CustomSkillId]?.includes(classId)) return false
      equippedSkillIds.add(instance.skillId)
    }
  }
  if (character.inventorySlots.length > getInventoryCapacity(character as unknown as PersistentCharacter)) return false
  return true
}

function uniqueIds(profile: ProfileV2): boolean {
  const ids = new Set<string>()
  const add = (id: string) => {
    if (ids.has(id)) return false
    ids.add(id)
    return true
  }
  for (const character of profile.characters) {
    for (const instance of Object.values(character.equipment)) if (instance && !add(instance.equipmentInstanceId)) return false
    for (const stack of character.inventorySlots) if (!add(stack.stackId)) return false
    for (const instance of character.customSkillSlots) if (instance && !add(instance.skillInstanceId)) return false
  }
  for (const instance of profile.storage.equipmentInstances) if (!add(instance.equipmentInstanceId)) return false
  for (const stack of profile.storage.itemStacks) if (!add(stack.stackId)) return false
  for (const instance of profile.storage.skillInstances) if (!add(instance.skillInstanceId)) return false
  if (profile.pendingReward) {
    for (const reward of profile.pendingReward.rewards) {
      if (reward.kind === 'equipment' && !add(reward.instance.equipmentInstanceId)) return false
      if (reward.kind === 'skill' && !add(reward.instance.skillInstanceId)) return false
    }
  }
  return true
}

function isPendingReward(value: unknown): boolean {
  const claim = record(value)
  if (!claim || !nonEmptyString(claim.claimId) || !QUEST_IDS.includes(claim.questId as QuestId) || !Array.isArray(claim.rewards) || !Array.isArray(claim.selections)) return false
  const summary = record(claim.summary)
  if (!summary || summary.questId !== claim.questId || !integer(summary.goldGranted, 0) || !integer(summary.experiencePerCharacter, 0)
    || !Array.isArray(summary.characterResults) || !Array.isArray(summary.unlockedQuestIds) || !Array.isArray(summary.unlockedRarities)) return false
  const quantities = new Map<string, number>()
  for (const rawReward of claim.rewards) {
    const reward = record(rawReward)
    if (!reward || !nonEmptyString(reward.rewardId) || quantities.has(reward.rewardId)) return false
    if (reward.kind === 'skill') {
      if (!isSkillInstance(reward.instance)) return false
      const instance = reward.instance as SkillInstance
      if (instance.skillInstanceId !== reward.rewardId || !(instance.skillId in CUSTOM_SKILL_DATA)) return false
      quantities.set(reward.rewardId, 1)
    } else if (reward.kind === 'equipment') {
      if (!isEquipmentInstance(reward.instance)) return false
      const instance = reward.instance as EquipmentInstance
      if (instance.equipmentInstanceId !== reward.rewardId) return false
      quantities.set(reward.rewardId, 1)
    } else if (reward.kind === 'item') {
      if (!nonEmptyString(reward.itemId) || !ITEM_DATA[reward.itemId as keyof typeof ITEM_DATA] || !integer(reward.quantity, 1)) return false
      quantities.set(reward.rewardId, reward.quantity as number)
    } else return false
  }
  const selected = new Set<string>()
  for (const rawSelection of claim.selections) {
    const selection = record(rawSelection)
    if (!selection || !nonEmptyString(selection.rewardId) || selected.has(selection.rewardId) || !integer(selection.quantity, 1)) return false
    const maximum = quantities.get(selection.rewardId)
    if (!maximum || (selection.quantity as number) > maximum) return false
    selected.add(selection.rewardId)
  }
  return true
}

export function isProfileV2(value: unknown): value is ProfileV2 {
  const profile = record(value)
  if (!profile || !nonEmptyString(profile.profileId) || !integer(profile.createdAt, 0) || !integer(profile.gold, 0)) return false
  if (!Array.isArray(profile.characters) || profile.characters.length !== 4 || !profile.characters.every(isCharacter)) return false
  const characters = profile.characters as PersistentCharacter[]
  if (new Set(characters.map((character) => character.characterId)).size !== 4) return false
  if (characters.filter((character) => character.row === 'front').length !== 2 || characters.filter((character) => character.row === 'back').length !== 2) return false

  const storage = record(profile.storage)
  if (!storage || storage.capacity !== 100 || !Array.isArray(storage.equipmentInstances) || !storage.equipmentInstances.every(isEquipmentInstance)
    || !Array.isArray(storage.itemStacks) || !storage.itemStacks.every(isItemStack)
    || !Array.isArray(storage.skillInstances) || !storage.skillInstances.every(isSkillInstance)) return false
  if (storage.equipmentInstances.length + storage.itemStacks.length + storage.skillInstances.length > 100) return false

  const progress = record(profile.questProgress)
  if (!progress || !Array.isArray(progress.unlockedQuestIds) || !progress.unlockedQuestIds.every((id) => QUEST_IDS.includes(id as QuestId))
    || !Array.isArray(progress.completedQuestIds) || !progress.completedQuestIds.every((id) => QUEST_IDS.includes(id as QuestId))) return false
  const unlockedQuestIds = progress.unlockedQuestIds as QuestId[]
  const completedQuestIds = progress.completedQuestIds as QuestId[]
  if (new Set(unlockedQuestIds).size !== unlockedQuestIds.length || new Set(completedQuestIds).size !== completedQuestIds.length) return false
  if (!unlockedQuestIds.includes('training_ruins_quest')) return false
  if (completedQuestIds.some((id) => !unlockedQuestIds.includes(id))) return false
  const repeats = record(progress.repeatCompletionCounts)
  if (!repeats || !integer(repeats.volcanic_cave_quest, 0) || !integer(repeats.deep_forest_ruins_quest, 0)) return false

  const shop = record(profile.shop)
  if (!shop || !Array.isArray(shop.unlockedRarities) || shop.unlockedRarities.length < 1 || !shop.unlockedRarities.every((rarity) => RARITIES.includes(rarity as Rarity))) return false
  if (shop.unlockedRarities.some((rarity, index) => rarity !== RARITIES[index])) return false
  if (!Array.isArray(shop.skillOfferIds) || !shop.skillOfferIds.every((id) => nonEmptyString(id) && id in CUSTOM_SKILL_DATA) || new Set(shop.skillOfferIds).size !== shop.skillOfferIds.length || shop.skillOfferIds.length > 3) return false
  const trainingCompleted = completedQuestIds.includes('training_ruins_quest')
  const goblinCompleted = completedQuestIds.includes('goblin_den_quest')
  const ancientCompleted = completedQuestIds.includes('ancient_site_quest')
  const dungeonCompleted = completedQuestIds.includes('underground_dungeon_quest')
  if (trainingCompleted && (!unlockedQuestIds.includes('goblin_den_quest') || !(shop.unlockedRarities as Rarity[]).includes('uncommon'))) return false
  if (!trainingCompleted && (shop.unlockedRarities as Rarity[]).includes('uncommon')) return false
  if (goblinCompleted && (!trainingCompleted || !unlockedQuestIds.includes('ancient_site_quest'))) return false
  if (ancientCompleted && (!goblinCompleted || !unlockedQuestIds.includes('underground_dungeon_quest') || !(shop.unlockedRarities as Rarity[]).includes('rare'))) return false
  if (!ancientCompleted && (shop.unlockedRarities as Rarity[]).includes('rare')) return false
  if (dungeonCompleted && (!ancientCompleted || !unlockedQuestIds.includes('old_castle_quest') || !(shop.unlockedRarities as Rarity[]).includes('heroic'))) return false
  if (!dungeonCompleted && (shop.unlockedRarities as Rarity[]).includes('heroic')) return false
  if (!goblinCompleted && shop.skillOfferIds.length > 0) return false

  const random = record(profile.random)
  if (!random || !integer(random.rootSeed, 1, 0xffffffff) || normalizeSeed(random.rootSeed as number) !== random.rootSeed
    || !integer(random.nextExpeditionSequence, 1) || !integer(random.nextInstanceSequence, 1) || !integer(random.shopRevision, 0)) return false
  if (profile.pendingReward !== null && !isPendingReward(profile.pendingReward)) return false

  const typed = profile as unknown as ProfileV2
  if (!uniqueIds(typed)) return false
  if (typed.pendingReward && (!typed.questProgress.completedQuestIds.includes(typed.pendingReward.questId)
    || usedStorageSlots(typed) + typed.pendingReward.selections.reduce((sum, selection) => sum + selection.quantity, 0) > typed.storage.capacity)) return false
  const ownedIds = [
    ...typed.characters.flatMap((character) => [...Object.values(character.equipment).filter(Boolean).map((item) => item!.equipmentInstanceId), ...character.inventorySlots.map((item) => item.stackId), ...character.customSkillSlots.filter(Boolean).map((item) => item!.skillInstanceId)]),
    ...typed.storage.equipmentInstances.map((item) => item.equipmentInstanceId), ...typed.storage.itemStacks.map((item) => item.stackId), ...typed.storage.skillInstances.map((item) => item.skillInstanceId),
    ...(typed.pendingReward?.rewards.flatMap((reward) => reward.kind === 'equipment' ? [reward.instance.equipmentInstanceId] : reward.kind === 'skill' ? [reward.instance.skillInstanceId] : []) ?? []),
  ]
  const maximumSequence = Math.max(0, ...ownedIds.map((id) => Number(id.match(/_(\d+)$/)?.[1] ?? 0)))
  return typed.random.nextInstanceSequence > maximumSequence
}

function selectedStorage(storage?: Storage): Storage | null {
  if (storage) return storage
  return typeof localStorage === 'undefined' ? null : localStorage
}

export function readProfileV2(storage?: Storage): ProfileV2 | null {
  const target = selectedStorage(storage)
  if (!target) return null
  try {
    const envelope = record(JSON.parse(target.getItem(PROFILE_V2_KEY) ?? 'null'))
    if (!envelope || envelope.version !== 2 || !isProfileV2(envelope.profile)) return null
    return envelope.profile
  } catch {
    return null
  }
}

export function writeProfileV2(profile: ProfileV2, storage?: Storage): boolean {
  const target = selectedStorage(storage)
  if (!target || !isProfileV2(profile)) return false
  try {
    const envelope: ProfileV2Envelope = { version: 2, profile }
    target.setItem(PROFILE_V2_KEY, JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}

export function clearProfileV2(storage?: Storage): boolean {
  const target = selectedStorage(storage)
  if (!target) return false
  try {
    target.removeItem(PROFILE_V2_KEY)
    return true
  } catch {
    return false
  }
}
