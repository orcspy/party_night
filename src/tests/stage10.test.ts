import { describe, expect, it } from 'vitest'
import { readProfileV2, writeProfileV2 } from '../app/saveV2'
import { createProfile } from '../game/gameEngine'
import { confirmRewardSelection, settleAncientSite, settleDeepForestRuins, settleGoblinDen, settleOldCastle, settleTrainingRuins, settleUndergroundDungeon, settleVolcanicCave } from '../game/rewards'
import type { ProfileV2 } from '../game/types'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return { get length() { return data.size }, clear: () => data.clear(), getItem: (key) => data.get(key) ?? null, key: (index) => [...data.keys()][index] ?? null, removeItem: (key) => { data.delete(key) }, setItem: (key, value) => { data.set(key, value) } }
}

function repeatReady(): ProfileV2 {
  let profile = createProfile({ type: 'CREATE_PROFILE', mainCharacterConfig: { name: '장시간', raceId: 'human', classId: 'warrior', gender: '남성' }, profileId: 'stage_10', createdAt: 1, rootSeed: 1010 })!
  const settlements = [
    () => settleTrainingRuins(profile, 1, 'q1'),
    () => settleGoblinDen(profile, 2, 'q2', []),
    () => settleAncientSite(profile, 3, 'q3', []),
    () => settleUndergroundDungeon(profile, 4, 'q4', []),
    () => settleOldCastle(profile, 5, 'q5', []),
  ]
  for (const settle of settlements) {
    const result = settle()
    if (!result.ok) throw new Error(result.error)
    profile = result.value.profile
  }
  return profile
}

describe('stage 10 full regression', () => {
  it('survives one hundred mixed repeats with reward overflow, save reloads, and capped growth', () => {
    let profile = repeatReady()
    const initialGold = profile.gold
    const initialRevision = profile.random.shopRevision
    const storage = memoryStorage()

    for (let index = 0; index < 100; index++) {
      const result = index % 2 === 0
        ? settleVolcanicCave(profile, 1000 + index, `volcanic_${index}`, [])
        : settleDeepForestRuins(profile, 1000 + index, `forest_${index}`, [])
      if (!result.ok) throw new Error(result.error)
      profile = result.value.profile
      if (profile.pendingReward) {
        const discarded = confirmRewardSelection(profile)
        if (!discarded.ok) throw new Error(discarded.error)
        profile = discarded.value
      }
      if ((index + 1) % 10 === 0) {
        expect(writeProfileV2(profile, storage)).toBe(true)
        profile = readProfileV2(storage)!
      }
    }

    expect(profile.characters.every((character) => character.level === 10 && character.experience === 1000)).toBe(true)
    expect(profile.questProgress.repeatCompletionCounts).toEqual({ volcanic_cave_quest: 50, deep_forest_ruins_quest: 50 })
    expect(profile.gold).toBe(initialGold + 4000 * 100)
    expect(profile.random.shopRevision).toBe(initialRevision + 100)
    expect(profile.pendingReward).toBeNull()
    expect(readProfileV2(storage)).toEqual(profile)
  })
})
