import { describe, expect, it } from 'vitest'
import { createProfile } from '../game/gameEngine'
import { isProfileV2 } from '../app/saveV2'
import { confirmRewardSelection, createSecretRoomReward, setRewardSelection, settleAncientSite, settleGoblinDen, settleTrainingRuins } from '../game/rewards'
import type { ItemStack, ProfileV2 } from '../game/types'

function profile(): ProfileV2 {
  return createProfile({ type: 'CREATE_PROFILE', mainCharacterConfig: { name: '보상테스터', raceId: 'human', classId: 'warrior', gender: '남성' }, profileId: 'reward_test', createdAt: 1, rootSeed: 2 })!
}

describe('training ruins settlement and overflow', () => {
  it('settles Lv2, unlocks progression, and stores three deterministic unique skills', () => {
    const first = settleTrainingRuins(profile(), 1234, 'expedition_1')
    const second = settleTrainingRuins(profile(), 1234, 'expedition_1')
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(first.value.rewards.map((reward) => reward.kind === 'skill' && reward.instance.skillId)).toEqual(second.value.rewards.map((reward) => reward.kind === 'skill' && reward.instance.skillId))
    expect(new Set(first.value.rewards.map((reward) => reward.rewardId)).size).toBe(3)
    expect(first.value.rewards.map((reward) => reward.rewardId)).toEqual(['skill_5', 'skill_6', 'skill_7'])
    expect(first.value.profile).toMatchObject({ gold: 600, pendingReward: null })
    expect(first.value.profile.characters.every((character) => character.level === 2 && character.experience === 100)).toBe(true)
    expect(first.value.profile.questProgress).toMatchObject({ completedQuestIds: ['training_ruins_quest'], unlockedQuestIds: ['training_ruins_quest', 'goblin_den_quest'] })
    expect(first.value.profile.shop.unlockedRarities).toEqual(['common', 'uncommon'])
    expect(first.value.profile.storage.skillInstances).toHaveLength(3)
  })

  it('keeps all candidates pending on overflow and stores only the selected rewards', () => {
    const base = { ...profile(), gold: 10000 }
    const stacks: ItemStack[] = Array.from({ length: 98 }, (_, index) => ({ stackId: `item_stack_${100 + index}`, itemId: 'bandage', quantity: 10 }))
    const crowded: ProfileV2 = { ...base, storage: { ...base.storage, itemStacks: stacks }, random: { ...base.random, nextInstanceSequence: 300 } }
    const settled = settleTrainingRuins(crowded, 55, 'expedition_1')
    expect(settled.ok && settled.value.profile.pendingReward?.rewards).toHaveLength(3)
    if (!settled.ok || !settled.value.profile.pendingReward) return
    const ids = settled.value.profile.pendingReward.rewards.slice(0, 2).map((reward) => ({ rewardId: reward.rewardId, quantity: 1 }))
    const selected = setRewardSelection(settled.value.profile, ids)
    expect(selected.ok).toBe(true)
    if (!selected.ok) return
    const confirmed = confirmRewardSelection(selected.value)
    expect(confirmed.ok).toBe(true)
    if (!confirmed.ok) return
    expect(confirmed.value.pendingReward).toBeNull()
    expect(confirmed.value.storage.skillInstances).toHaveLength(2)
    expect(confirmed.value.storage.itemStacks).toHaveLength(98)
  })

  it('rejects a selection that exceeds available storage atomically', () => {
    const base = profile()
    const stacks: ItemStack[] = Array.from({ length: 99 }, (_, index) => ({ stackId: `item_stack_${100 + index}`, itemId: 'bandage', quantity: 10 }))
    const crowded: ProfileV2 = { ...base, storage: { ...base.storage, itemStacks: stacks }, random: { ...base.random, nextInstanceSequence: 300 } }
    const settled = settleTrainingRuins(crowded, 55, 'expedition_1')
    if (!settled.ok || !settled.value.profile.pendingReward) throw new Error('pending reward expected')
    const selections = settled.value.profile.pendingReward.rewards.slice(0, 2).map((reward) => ({ rewardId: reward.rewardId, quantity: 1 }))
    const rejected = setRewardSelection(settled.value.profile, selections)
    expect(rejected.ok).toBe(false)
    expect(settled.value.profile.pendingReward.selections).toEqual([])
  })

  it('settles goblin den at Lv3 with ancient-site unlock, offers, and secret loot', () => {
    const trained = settleTrainingRuins(profile(), 10, 'expedition_1')
    if (!trained.ok) throw new Error(trained.error)
    const secret = createSecretRoomReward(trained.value.profile, 20, 'goblin_den_quest', 'goblin_den_secret_1')
    const goblin = settleGoblinDen(secret.profile, 20, 'expedition_2', [secret.reward])
    expect(goblin.ok).toBe(true)
    if (!goblin.ok) return
    expect(goblin.value.profile.gold).toBe(920)
    expect(goblin.value.profile.characters.every((character) => character.level === 3 && character.experience === 200)).toBe(true)
    expect(goblin.value.profile.questProgress.completedQuestIds).toContain('goblin_den_quest')
    expect(goblin.value.profile.questProgress.unlockedQuestIds).toContain('ancient_site_quest')
    expect(goblin.value.profile.shop.skillOfferIds).toHaveLength(3)
    expect(goblin.value.profile.shop.unlockedRarities).toEqual(['common', 'uncommon'])
    expect(goblin.value.rewards).toHaveLength(4)
  })

  it('settles ancient site at Lv4 and unlocks rare equipment and the underground dungeon', () => {
    const trained = settleTrainingRuins(profile(), 10, 'expedition_1')
    if (!trained.ok) throw new Error(trained.error)
    const goblin = settleGoblinDen(trained.value.profile, 20, 'expedition_2', [])
    if (!goblin.ok) throw new Error(goblin.error)
    const secret = createSecretRoomReward(goblin.value.profile, 30, 'ancient_site_quest', 'ancient_site_secret_1')
    const ancient = settleAncientSite(secret.profile, 30, 'expedition_3', [secret.reward])
    expect(ancient.ok).toBe(true)
    if (!ancient.ok) return
    expect(ancient.value.profile.gold).toBe(1420)
    expect(ancient.value.profile.characters.every((character) => character.level === 4 && character.experience === 300)).toBe(true)
    expect(ancient.value.profile.questProgress.completedQuestIds).toContain('ancient_site_quest')
    expect(ancient.value.profile.questProgress.unlockedQuestIds).toContain('underground_dungeon_quest')
    expect(ancient.value.profile.shop.unlockedRarities).toEqual(['common', 'uncommon', 'rare'])
    expect(ancient.value.rewards).toHaveLength(4)
    expect(isProfileV2(ancient.value.profile)).toBe(true)
  })
})
