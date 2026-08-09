import { applyExperience } from './characters'
import { CUSTOM_SKILL_DATA, EQUIPMENT_DATA, type CustomSkillId } from './content'
import { addItemQuantityToStorage, allocateUniqueId, usedStorageSlots, type RuleResult } from './inventory'
import { normalizeSeed, randomIndex } from './rng'
import { generateSkillOffers, getAvailableItemIds } from './shop'
import type { CharacterSettlementResult, ItemId, PendingRewardClaim, PendingRewardEntry, ProfileV2, QuestId, QuestSettlementSummary, Rarity, RepeatQuestId, RewardSelection } from './types'

export interface TrainingSettlement {
  profile: ProfileV2
  summary: QuestSettlementSummary
  rewards: PendingRewardEntry[]
}

function rewardSkillIds(seed: number): CustomSkillId[] {
  let state = normalizeSeed(seed ^ 0x51f15e31)
  const pool = Object.keys(CUSTOM_SKILL_DATA) as CustomSkillId[]
  const selected: CustomSkillId[] = []
  for (let count = 0; count < 3; count++) {
    const next = randomIndex(state, pool.length)
    state = next.state
    selected.push(pool.splice(next.value, 1)[0])
  }
  return selected
}

function createSkillRewards(profile: ProfileV2, seed: number): { profile: ProfileV2; rewards: PendingRewardEntry[] } {
  let candidate = profile
  const rewards: PendingRewardEntry[] = []
  for (const skillId of rewardSkillIds(seed)) {
    const allocated = allocateUniqueId(candidate, 'skill')
    candidate = allocated.profile
    rewards.push({ rewardId: allocated.id, kind: 'skill', instance: { skillInstanceId: allocated.id, skillId } })
  }
  return { profile: candidate, rewards }
}

function applyEntries(profile: ProfileV2, rewards: PendingRewardEntry[]): RuleResult<ProfileV2> {
  let candidate = profile
  for (const reward of rewards) {
    if (reward.kind === 'skill') candidate = { ...candidate, storage: { ...candidate.storage, skillInstances: [...candidate.storage.skillInstances, reward.instance] } }
    if (reward.kind === 'equipment') candidate = { ...candidate, storage: { ...candidate.storage, equipmentInstances: [...candidate.storage.equipmentInstances, reward.instance] } }
    if (reward.kind === 'item') {
      const added = addItemQuantityToStorage(candidate, reward.itemId as ItemId, reward.quantity)
      if (!added.ok) return added
      candidate = added.value
    }
  }
  return usedStorageSlots(candidate) <= candidate.storage.capacity ? { ok: true, value: candidate } : { ok: false, error: '보상을 보관할 공간이 부족하다.' }
}

export function settleTrainingRuins(profile: ProfileV2, expeditionSeed: number, expeditionId: string): RuleResult<TrainingSettlement> {
  if (profile.questProgress.completedQuestIds.includes('training_ruins_quest')) return { ok: false, error: '이미 완료한 퀘스트다.' }
  const characterResults: CharacterSettlementResult[] = []
  const characters = profile.characters.map((character) => {
    const previousLevel = character.level
    const previousExperience = character.experience
    const applied = applyExperience(character, 100)
    characterResults.push({
      characterId: character.characterId, previousLevel, level: applied.character.level, previousExperience,
      experience: applied.character.experience, growthApplied: applied.growthApplied, unlockedClassSkillIds: applied.unlockedClassSkillIds, unlockedCustomSlotIndices: applied.unlockedCustomSlotIndices,
    })
    return applied.character
  }) as ProfileV2['characters']
  const summary: QuestSettlementSummary = {
    questId: 'training_ruins_quest', goldGranted: 300, experiencePerCharacter: 100, characterResults,
    unlockedQuestIds: ['goblin_den_quest'], unlockedRarities: ['uncommon'],
  }
  let candidate: ProfileV2 = {
    ...profile,
    gold: profile.gold + 300,
    characters,
    questProgress: {
      ...profile.questProgress,
      completedQuestIds: [...profile.questProgress.completedQuestIds, 'training_ruins_quest'],
      unlockedQuestIds: profile.questProgress.unlockedQuestIds.includes('goblin_den_quest') ? profile.questProgress.unlockedQuestIds : [...profile.questProgress.unlockedQuestIds, 'goblin_den_quest'],
    },
    shop: {
      ...profile.shop,
      unlockedRarities: profile.shop.unlockedRarities.includes('uncommon') ? profile.shop.unlockedRarities : [...profile.shop.unlockedRarities, 'uncommon'],
    },
  }
  const generated = createSkillRewards(candidate, expeditionSeed)
  candidate = generated.profile
  const rewards = generated.rewards
  const applied = applyEntries(candidate, rewards)
  if (applied.ok) {
    candidate = applied.value
  } else {
    const claim: PendingRewardClaim = { claimId: `reward_${expeditionId}`, questId: 'training_ruins_quest', summary, rewards, selections: [] }
    candidate = { ...candidate, pendingReward: claim }
  }
  return { ok: true, value: { profile: candidate, summary, rewards } }
}

export function createSecretRoomReward(profile: ProfileV2, expeditionSeed: number, questId: QuestId, secretId: string): { profile: ProfileV2; reward: PendingRewardEntry } {
  const questItems: ItemId[] = questId === 'ancient_site_quest'
    ? ['minor_healing_potion', 'bandage', 'remedy', 'fire_bomb', 'survey_chalk', 'greater_healing_potion', 'might_tonic', 'haste_tonic']
    : getAvailableItemIds(profile)
  const maxRarity: Rarity = questId === 'ancient_site_quest' ? 'rare' : questId === 'old_castle_quest' ? 'legendary' : profile.shop.unlockedRarities.at(-1) ?? 'common'
  const rarityOrder: Rarity[] = ['common', 'uncommon', 'rare', 'heroic', 'legendary']
  const equipmentIds = Object.keys(EQUIPMENT_DATA).filter((id) => rarityOrder.indexOf(EQUIPMENT_DATA[id].rarity) <= rarityOrder.indexOf(maxRarity))
  const candidates = [...questItems.map((id) => ({ kind: 'item' as const, id })), ...equipmentIds.map((id) => ({ kind: 'equipment' as const, id }))]
  const hash = [...secretId].reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0
  const selected = candidates[randomIndex(normalizeSeed(expeditionSeed ^ hash ^ 0x5ec2e7), candidates.length).value]
  if (selected.kind === 'item') return { profile, reward: { rewardId: `secret_${secretId}`, kind: 'item', itemId: selected.id, quantity: 1 } }
  const allocated = allocateUniqueId(profile, 'equipment')
  return { profile: allocated.profile, reward: { rewardId: allocated.id, kind: 'equipment', instance: { equipmentInstanceId: allocated.id, equipmentId: selected.id } } }
}

export function settleGoblinDen(profile: ProfileV2, expeditionSeed: number, expeditionId: string, pendingLoot: PendingRewardEntry[]): RuleResult<TrainingSettlement> {
  if (!profile.questProgress.completedQuestIds.includes('training_ruins_quest') || profile.questProgress.completedQuestIds.includes('goblin_den_quest')) return { ok: false, error: '고블린 소굴을 정산할 수 없다.' }
  const characterResults: CharacterSettlementResult[] = []
  const characters = profile.characters.map((character) => {
    const previousLevel = character.level; const previousExperience = character.experience
    const applied = applyExperience(character, 100)
    characterResults.push({ characterId: character.characterId, previousLevel, level: applied.character.level, previousExperience, experience: applied.character.experience, growthApplied: applied.growthApplied, unlockedClassSkillIds: applied.unlockedClassSkillIds, unlockedCustomSlotIndices: applied.unlockedCustomSlotIndices })
    return applied.character
  }) as ProfileV2['characters']
  const summary: QuestSettlementSummary = { questId: 'goblin_den_quest', goldGranted: 320, experiencePerCharacter: 100, characterResults, unlockedQuestIds: ['ancient_site_quest'], unlockedRarities: [] }
  const revision = profile.random.shopRevision + 1
  let candidate: ProfileV2 = {
    ...profile, gold: profile.gold + 320, characters,
    questProgress: { ...profile.questProgress, completedQuestIds: [...profile.questProgress.completedQuestIds, 'goblin_den_quest'], unlockedQuestIds: profile.questProgress.unlockedQuestIds.includes('ancient_site_quest') ? profile.questProgress.unlockedQuestIds : [...profile.questProgress.unlockedQuestIds, 'ancient_site_quest'] },
    shop: { ...profile.shop, skillOfferIds: generateSkillOffers(profile.random.rootSeed, revision) },
    random: { ...profile.random, shopRevision: revision },
  }
  const generated = createSkillRewards(candidate, expeditionSeed ^ 0x6b1d3e)
  candidate = generated.profile
  const rewards = [...generated.rewards, ...pendingLoot]
  const applied = applyEntries(candidate, rewards)
  if (applied.ok) candidate = applied.value
  else candidate = { ...candidate, pendingReward: { claimId: `reward_${expeditionId}`, questId: 'goblin_den_quest', summary, rewards, selections: [] } }
  return { ok: true, value: { profile: candidate, summary, rewards } }
}

export function settleAncientSite(profile: ProfileV2, expeditionSeed: number, expeditionId: string, pendingLoot: PendingRewardEntry[]): RuleResult<TrainingSettlement> {
  if (!profile.questProgress.completedQuestIds.includes('goblin_den_quest') || profile.questProgress.completedQuestIds.includes('ancient_site_quest')) return { ok: false, error: '유적지를 정산할 수 없다.' }
  const characterResults: CharacterSettlementResult[] = []
  const characters = profile.characters.map((character) => {
    const previousLevel = character.level; const previousExperience = character.experience
    const applied = applyExperience(character, 100)
    characterResults.push({ characterId: character.characterId, previousLevel, level: applied.character.level, previousExperience, experience: applied.character.experience, growthApplied: applied.growthApplied, unlockedClassSkillIds: applied.unlockedClassSkillIds, unlockedCustomSlotIndices: applied.unlockedCustomSlotIndices })
    return applied.character
  }) as ProfileV2['characters']
  const summary: QuestSettlementSummary = { questId: 'ancient_site_quest', goldGranted: 500, experiencePerCharacter: 100, characterResults, unlockedQuestIds: ['underground_dungeon_quest'], unlockedRarities: ['rare'] }
  const revision = profile.random.shopRevision + 1
  let candidate: ProfileV2 = {
    ...profile, gold: profile.gold + 500, characters,
    questProgress: { ...profile.questProgress, completedQuestIds: [...profile.questProgress.completedQuestIds, 'ancient_site_quest'], unlockedQuestIds: profile.questProgress.unlockedQuestIds.includes('underground_dungeon_quest') ? profile.questProgress.unlockedQuestIds : [...profile.questProgress.unlockedQuestIds, 'underground_dungeon_quest'] },
    shop: { ...profile.shop, unlockedRarities: profile.shop.unlockedRarities.includes('rare') ? profile.shop.unlockedRarities : [...profile.shop.unlockedRarities, 'rare'], skillOfferIds: generateSkillOffers(profile.random.rootSeed, revision) },
    random: { ...profile.random, shopRevision: revision },
  }
  const generated = createSkillRewards(candidate, expeditionSeed ^ 0x7a2e4f)
  candidate = generated.profile
  const rewards = [...generated.rewards, ...pendingLoot]
  const applied = applyEntries(candidate, rewards)
  if (applied.ok) candidate = applied.value
  else candidate = { ...candidate, pendingReward: { claimId: `reward_${expeditionId}`, questId: 'ancient_site_quest', summary, rewards, selections: [] } }
  return { ok: true, value: { profile: candidate, summary, rewards } }
}

export function settleUndergroundDungeon(profile: ProfileV2, expeditionSeed: number, expeditionId: string, pendingLoot: PendingRewardEntry[]): RuleResult<TrainingSettlement> {
  if (!profile.questProgress.completedQuestIds.includes('ancient_site_quest') || profile.questProgress.completedQuestIds.includes('underground_dungeon_quest')) return { ok: false, error: '지하 던전을 정산할 수 없다.' }
  const characterResults: CharacterSettlementResult[] = []
  const characters = profile.characters.map((character) => {
    const previousLevel = character.level; const previousExperience = character.experience
    const applied = applyExperience(character, 100)
    characterResults.push({ characterId: character.characterId, previousLevel, level: applied.character.level, previousExperience, experience: applied.character.experience, growthApplied: applied.growthApplied, unlockedClassSkillIds: applied.unlockedClassSkillIds, unlockedCustomSlotIndices: applied.unlockedCustomSlotIndices })
    return applied.character
  }) as ProfileV2['characters']
  const summary: QuestSettlementSummary = { questId: 'underground_dungeon_quest', goldGranted: 720, experiencePerCharacter: 100, characterResults, unlockedQuestIds: ['old_castle_quest'], unlockedRarities: ['heroic'] }
  const revision = profile.random.shopRevision + 1
  let candidate: ProfileV2 = {
    ...profile, gold: profile.gold + 720, characters,
    questProgress: { ...profile.questProgress, completedQuestIds: [...profile.questProgress.completedQuestIds, 'underground_dungeon_quest'], unlockedQuestIds: profile.questProgress.unlockedQuestIds.includes('old_castle_quest') ? profile.questProgress.unlockedQuestIds : [...profile.questProgress.unlockedQuestIds, 'old_castle_quest'] },
    shop: { ...profile.shop, unlockedRarities: profile.shop.unlockedRarities.includes('heroic') ? profile.shop.unlockedRarities : [...profile.shop.unlockedRarities, 'heroic'], skillOfferIds: generateSkillOffers(profile.random.rootSeed, revision) },
    random: { ...profile.random, shopRevision: revision },
  }
  const generated = createSkillRewards(candidate, expeditionSeed ^ 0x4d6e8a)
  candidate = generated.profile
  const rewards = [...generated.rewards, ...pendingLoot]
  const applied = applyEntries(candidate, rewards)
  if (applied.ok) candidate = applied.value
  else candidate = { ...candidate, pendingReward: { claimId: `reward_${expeditionId}`, questId: 'underground_dungeon_quest', summary, rewards, selections: [] } }
  return { ok: true, value: { profile: candidate, summary, rewards } }
}

export function settleOldCastle(profile: ProfileV2, expeditionSeed: number, expeditionId: string, pendingLoot: PendingRewardEntry[]): RuleResult<TrainingSettlement> {
  if (!profile.questProgress.completedQuestIds.includes('underground_dungeon_quest') || profile.questProgress.completedQuestIds.includes('old_castle_quest')) return { ok: false, error: '옛 고성을 정산할 수 없다.' }
  const characterResults: CharacterSettlementResult[] = []
  const characters = profile.characters.map((character) => {
    const previousLevel = character.level; const previousExperience = character.experience
    const applied = applyExperience(character, 100)
    characterResults.push({ characterId: character.characterId, previousLevel, level: applied.character.level, previousExperience, experience: applied.character.experience, growthApplied: applied.growthApplied, unlockedClassSkillIds: applied.unlockedClassSkillIds, unlockedCustomSlotIndices: applied.unlockedCustomSlotIndices })
    return applied.character
  }) as ProfileV2['characters']
  const repeatQuestIds: QuestId[] = ['volcanic_cave_quest', 'deep_forest_ruins_quest']
  const summary: QuestSettlementSummary = { questId: 'old_castle_quest', goldGranted: 1050, experiencePerCharacter: 100, characterResults, unlockedQuestIds: repeatQuestIds, unlockedRarities: ['legendary'] }
  const revision = profile.random.shopRevision + 1
  let candidate: ProfileV2 = {
    ...profile, gold: profile.gold + 1050, characters,
    questProgress: {
      ...profile.questProgress,
      completedQuestIds: [...profile.questProgress.completedQuestIds, 'old_castle_quest'],
      unlockedQuestIds: [...profile.questProgress.unlockedQuestIds, ...repeatQuestIds.filter((questId) => !profile.questProgress.unlockedQuestIds.includes(questId))],
    },
    shop: { ...profile.shop, unlockedRarities: profile.shop.unlockedRarities.includes('legendary') ? profile.shop.unlockedRarities : [...profile.shop.unlockedRarities, 'legendary'], skillOfferIds: generateSkillOffers(profile.random.rootSeed, revision) },
    random: { ...profile.random, shopRevision: revision },
  }
  const generated = createSkillRewards(candidate, expeditionSeed ^ 0x5c7a9d)
  candidate = generated.profile
  const rewards = [...generated.rewards, ...pendingLoot]
  const applied = applyEntries(candidate, rewards)
  if (applied.ok) candidate = applied.value
  else candidate = { ...candidate, pendingReward: { claimId: `reward_${expeditionId}`, questId: 'old_castle_quest', summary, rewards, selections: [] } }
  return { ok: true, value: { profile: candidate, summary, rewards } }
}

function settleRepeatQuest(profile: ProfileV2, questId: RepeatQuestId, goldReward: number, expeditionSeed: number, expeditionId: string, pendingLoot: PendingRewardEntry[]): RuleResult<TrainingSettlement> {
  if (!profile.questProgress.completedQuestIds.includes('old_castle_quest') || !profile.questProgress.unlockedQuestIds.includes(questId)) return { ok: false, error: '반복 퀘스트를 정산할 수 없다.' }
  const characterResults: CharacterSettlementResult[] = []
  const characters = profile.characters.map((character) => {
    const previousLevel = character.level
    const previousExperience = character.experience
    const applied = applyExperience(character, 100)
    characterResults.push({ characterId: character.characterId, previousLevel, level: applied.character.level, previousExperience, experience: applied.character.experience, growthApplied: applied.growthApplied, unlockedClassSkillIds: applied.unlockedClassSkillIds, unlockedCustomSlotIndices: applied.unlockedCustomSlotIndices })
    return applied.character
  }) as ProfileV2['characters']
  const summary: QuestSettlementSummary = { questId, goldGranted: goldReward, experiencePerCharacter: 100, characterResults, unlockedQuestIds: [], unlockedRarities: [] }
  const revision = profile.random.shopRevision + 1
  const completedQuestIds = profile.questProgress.completedQuestIds.includes(questId) ? profile.questProgress.completedQuestIds : [...profile.questProgress.completedQuestIds, questId]
  let candidate: ProfileV2 = {
    ...profile,
    gold: profile.gold + goldReward,
    characters,
    questProgress: {
      ...profile.questProgress,
      completedQuestIds,
      repeatCompletionCounts: { ...profile.questProgress.repeatCompletionCounts, [questId]: profile.questProgress.repeatCompletionCounts[questId] + 1 },
    },
    shop: { ...profile.shop, skillOfferIds: generateSkillOffers(profile.random.rootSeed, revision) },
    random: { ...profile.random, shopRevision: revision },
  }
  const generated = createSkillRewards(candidate, expeditionSeed ^ (questId === 'volcanic_cave_quest' ? 0x6d8b2f : 0x7e9c31))
  candidate = generated.profile
  const rewards = [...generated.rewards, ...pendingLoot]
  const applied = applyEntries(candidate, rewards)
  if (applied.ok) candidate = applied.value
  else candidate = { ...candidate, pendingReward: { claimId: `reward_${expeditionId}`, questId, summary, rewards, selections: [] } }
  return { ok: true, value: { profile: candidate, summary, rewards } }
}

export function settleVolcanicCave(profile: ProfileV2, expeditionSeed: number, expeditionId: string, pendingLoot: PendingRewardEntry[]): RuleResult<TrainingSettlement> {
  return settleRepeatQuest(profile, 'volcanic_cave_quest', 760, expeditionSeed, expeditionId, pendingLoot)
}

export function settleDeepForestRuins(profile: ProfileV2, expeditionSeed: number, expeditionId: string, pendingLoot: PendingRewardEntry[]): RuleResult<TrainingSettlement> {
  return settleRepeatQuest(profile, 'deep_forest_ruins_quest', 820, expeditionSeed, expeditionId, pendingLoot)
}

export function setRewardSelection(profile: ProfileV2, selections: RewardSelection[]): RuleResult<ProfileV2> {
  const claim = profile.pendingReward
  if (!claim) return { ok: false, error: '선택할 보상이 없다.' }
  const ids = new Set<string>()
  for (const selection of selections) {
    const reward = claim.rewards.find((entry) => entry.rewardId === selection.rewardId)
    if (!reward || ids.has(selection.rewardId) || !Number.isInteger(selection.quantity) || selection.quantity !== 1) return { ok: false, error: '보상 선택이 올바르지 않다.' }
    ids.add(selection.rewardId)
  }
  const selectedRewards = selections.map((selection) => claim.rewards.find((entry) => entry.rewardId === selection.rewardId)!).map((reward, index) => reward.kind === 'item' ? { ...reward, quantity: selections[index].quantity } : reward)
  const capacity = applyEntries({ ...profile, pendingReward: null }, selectedRewards)
  if (!capacity.ok) return { ok: false, error: '선택한 보상을 보관할 공간이 부족하다.' }
  return { ok: true, value: { ...profile, pendingReward: { ...claim, selections: selections.map((selection) => ({ ...selection })) } } }
}

export function confirmRewardSelection(profile: ProfileV2): RuleResult<ProfileV2> {
  const claim = profile.pendingReward
  if (!claim) return { ok: false, error: '확정할 보상이 없다.' }
  const selectedRewards = claim.selections.map((selection) => claim.rewards.find((entry) => entry.rewardId === selection.rewardId)!).map((reward, index) => reward.kind === 'item' ? { ...reward, quantity: claim.selections[index].quantity } : reward)
  const applied = applyEntries({ ...profile, pendingReward: null }, selectedRewards)
  return applied.ok ? applied : applied
}
