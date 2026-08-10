import { createEncounterEnemies, createInitialCharacters, createPartyFromCharacters, getMapDefinition, getQuestDefinition, ITEM_DATA } from './content'
import { cancelSkillSelection, rerollDie, selectSkill, selectTarget, skipReroll, startCombat, useCombatItem, type CombatUpdate } from './combat'
import { getDirectionDisplayName, getQuestDisplayName, getRewardDisplayName } from './displayNames'
import { createExploration, discoverNearbyPlacements, move, turn } from './exploration'
import { consumeCharacterItem, equipCustomSkill, equipEquipment, moveItemToCharacter, returnItemToStorage, unequipCustomSkill, unequipEquipment, usedStorageSlots, type RuleResult } from './inventory'
import { normalizeSeed } from './rng'
import { confirmRewardSelection, createSecretRoomReward, setRewardSelection, settleAncientSite, settleDeepForestRuins, settleGoblinDen, settleOldCastle, settleTrainingRuins, settleUndergroundDungeon, settleVolcanicCave } from './rewards'
import { buyEquipment, buyItem, buySkill, sellEquipment, sellItem, sellSkill } from './shop'
import type { ExpeditionSession, GameCommand, GameEvent, GameLogKind, GameState, ItemId, MainCharacterConfig, ProfileV2, QuestId } from './types'

export type PersistenceRequest = 'none' | 'save_profile' | 'clear_profile'

export interface BattlePresentationFrame {
  session: ExpeditionSession
}

export interface EngineResult {
  state: GameState
  events: GameEvent[]
  persistence: PersistenceRequest
  battlePresentation?: BattlePresentationFrame
}

export function createInitialGameState(profile: ProfileV2 | null = null): GameState {
  return { screen: 'start', profile, session: null, result: null, pendingQuestEntry: null }
}

function validConfig(value: unknown): value is MainCharacterConfig {
  if (!value || typeof value !== 'object') return false
  const config = value as Record<string, unknown>
  return typeof config.name === 'string' && config.name.trim().length >= 1 && config.name.trim().length <= 12
    && ['human', 'elf', 'dwarf', 'halfling'].includes(String(config.raceId))
    && ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'].includes(String(config.classId))
    && (config.gender === '남성' || config.gender === '여성')
}

export function createProfile(command: Extract<GameCommand, { type: 'CREATE_PROFILE' }>): ProfileV2 | null {
  if (!validConfig(command.mainCharacterConfig) || !command.profileId.trim() || !Number.isSafeInteger(command.createdAt) || command.createdAt < 0 || !Number.isInteger(command.rootSeed)) return null
  const characters = createInitialCharacters({ ...command.mainCharacterConfig, name: command.mainCharacterConfig.name.trim() })
  return {
    profileId: command.profileId,
    createdAt: command.createdAt,
    gold: 300,
    characters,
    storage: { capacity: 100, equipmentInstances: [], itemStacks: [], skillInstances: [] },
    questProgress: {
      unlockedQuestIds: ['training_ruins_quest'],
      completedQuestIds: [],
      repeatCompletionCounts: { volcanic_cave_quest: 0, deep_forest_ruins_quest: 0 },
    },
    shop: { unlockedRarities: ['common'], skillOfferIds: [] },
    random: { rootSeed: normalizeSeed(command.rootSeed), nextExpeditionSequence: 1, nextInstanceSequence: 5, shopRevision: 0 },
    pendingReward: null,
  }
}

function appendEvents(session: ExpeditionSession, events: GameEvent[]): ExpeditionSession {
  if (events.length === 0) return session
  const kindFor = (event: GameEvent): GameLogKind => {
    if (event.type === 'DAMAGE_APPLIED' || event.type === 'TRAP_TRIGGERED') return 'damage'
    if (event.type === 'HEAL_APPLIED') return 'heal'
    return 'default'
  }
  return {
    ...session,
    logs: [...session.logs, ...events.map((event) => ({ eventType: event.type, kind: kindFor(event), message: event.message }))].slice(-200),
  }
}

function reject(state: GameState, command: GameCommand, message: string): EngineResult {
  return { state, events: [{ type: 'COMMAND_REJECTED', message }], persistence: 'none' }
}

function applyProfileRule(state: GameState, command: GameCommand, result: RuleResult<ProfileV2>, eventType: 'STORAGE_CHANGED' | 'EQUIPMENT_CHANGED' | 'SHOP_TRANSACTION', message: string): EngineResult {
  if (!result.ok) return reject(state, command, result.error)
  return { state: { ...state, profile: result.value }, events: [{ type: eventType, message }], persistence: 'save_profile' }
}

function hubReady(state: GameState): state is GameState & { profile: ProfileV2 } {
  return state.screen === 'hub' && Boolean(state.profile) && state.session === null && state.profile?.pendingReward === null
}

function hashQuestId(questId: QuestId): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < questId.length; index++) hash = Math.imul(hash ^ questId.charCodeAt(index), 0x01000193)
  return hash >>> 0
}

function expeditionSeed(rootSeed: number, questId: QuestId, sequence: number): number {
  return normalizeSeed(rootSeed ^ hashQuestId(questId) ^ Math.imul(sequence, 0x9e3779b1))
}

function beginExpedition(profile: ProfileV2, questId: QuestId): { profile: ProfileV2; session: ExpeditionSession; events: GameEvent[] } {
  const sequence = profile.random.nextExpeditionSequence
  const seed = expeditionSeed(profile.random.rootSeed, questId, sequence)
  const party = createPartyFromCharacters(profile.characters)
  const map = getMapDefinition(getQuestDefinition(questId)!.mapId)
  const seekTrapActor = party.find((actor) => actor.currentHp > 0 && actor.skillIds.includes('seek_trap'))
  const events: GameEvent[] = [{ type: 'SESSION_STARTED', message: `${getQuestDisplayName(questId)} 원정을 시작했다.` }]
  if (seekTrapActor) {
    events.push(...map.traps.map((trap): GameEvent => ({
      type: 'TRAP_DISCOVERED', message: `${seekTrapActor.name}의 함정간파: 함정을 발견했다.`,
      sourceActorId: seekTrapActor.id, skillId: 'seek_trap', placementId: trap.trapId,
    })))
    events.push(...map.secrets.map((secret): GameEvent => ({
      type: 'SECRET_ROOM_DISCOVERED', message: `${seekTrapActor.name}의 함정간파: 비밀방을 발견했다.`,
      sourceActorId: seekTrapActor.id, skillId: 'seek_trap', placementId: secret.secretId,
    })))
  }
  const session: ExpeditionSession = {
    expeditionId: `expedition_${sequence}`,
    questId,
    seed,
    rngState: seed,
    party,
    exploration: createExploration(questId),
    combat: null,
    completedEncounterIds: [],
    discoveredSecretIds: seekTrapActor ? map.secrets.map((item) => item.secretId) : [],
    discoveredTrapIds: seekTrapActor ? map.traps.map((item) => item.trapId) : [],
    triggeredTrapIds: [],
    claimedSecretRewardIds: [],
    pendingLoot: [],
    logs: [],
  }
  return {
    profile: { ...profile, random: { ...profile.random, nextExpeditionSequence: sequence + 1 } },
    session: appendEvents(session, events),
    events,
  }
}

function questEntryError(state: GameState, questId: QuestId): string | null {
  if (state.screen !== 'hub' || !state.profile || state.session || state.profile.pendingReward) return '현재 퀘스트에 입장할 수 없다.'
  if (!getQuestDefinition(questId) || !state.profile.questProgress.unlockedQuestIds.includes(questId)) return '현재 플레이할 수 없는 퀘스트다.'
  const repeatQuest = questId === 'volcanic_cave_quest' || questId === 'deep_forest_ruins_quest'
  if (!repeatQuest && state.profile.questProgress.completedQuestIds.includes(questId)) return '이미 완료한 퀘스트다.'
  return null
}

function startQuestEntry(state: GameState & { profile: ProfileV2 }, questId: QuestId): EngineResult {
  const started = beginExpedition(state.profile, questId)
  return {
    state: { ...state, screen: 'exploration', profile: started.profile, session: started.session, result: null, pendingQuestEntry: null },
    events: started.events,
    persistence: 'save_profile',
  }
}

function applyCombatUpdate(state: GameState, command: GameCommand, update: CombatUpdate): EngineResult {
  if (!state.session) return reject(state, command, '진행 중인 원정이 없다.')
  if (update.events.length === 1 && update.events[0].type === 'COMMAND_REJECTED') {
    return { state, events: update.events, persistence: 'none' }
  }
  let session = appendEvents({ ...state.session, rngState: update.rngState, combat: update.combat }, update.events)
  const battlePresentation = update.combat.outcome ? { session } : undefined
  if (update.combat.outcome === 'won') {
    const partyHp = new Map(update.combat.participants.filter((actor) => actor.side === 'party').map((actor) => [actor.id, actor.currentHp]))
    const completedEncounterIds = session.completedEncounterIds.includes(update.combat.battleId)
      ? session.completedEncounterIds
      : [...session.completedEncounterIds, update.combat.battleId]
    session = {
      ...session,
      party: session.party.map((actor) => ({ ...actor, currentHp: Math.min(actor.maxHp, partyHp.get(actor.id) ?? actor.currentHp) })),
      completedEncounterIds,
      combat: null,
    }
    const quest = getQuestDefinition(session.questId)
    if (quest && update.combat.battleId === quest.completionEncounterId && state.profile) {
      const settled = session.questId === 'training_ruins_quest'
        ? settleTrainingRuins(state.profile, session.seed, session.expeditionId)
        : session.questId === 'goblin_den_quest'
          ? settleGoblinDen(state.profile, session.seed, session.expeditionId, session.pendingLoot)
          : session.questId === 'ancient_site_quest'
            ? settleAncientSite(state.profile, session.seed, session.expeditionId, session.pendingLoot)
            : session.questId === 'underground_dungeon_quest'
              ? settleUndergroundDungeon(state.profile, session.seed, session.expeditionId, session.pendingLoot)
              : session.questId === 'old_castle_quest'
                ? settleOldCastle(state.profile, session.seed, session.expeditionId, session.pendingLoot)
                : session.questId === 'volcanic_cave_quest'
                  ? settleVolcanicCave(state.profile, session.seed, session.expeditionId, session.pendingLoot)
                  : settleDeepForestRuins(state.profile, session.seed, session.expeditionId, session.pendingLoot)
      if (!settled.ok) return reject(state, command, settled.error)
      const { goldGranted, experiencePerCharacter } = settled.value.summary
      const settlementEvents: GameEvent[] = [
        ...update.events,
        { type: 'QUEST_COMPLETED', message: `${quest.name}을 완료했다.` },
        { type: 'GROWTH_APPLIED', message: `파티 전원이 Lv${settled.value.profile.characters[0].level}로 성장했다.` },
        ...(settled.value.summary.unlockedQuestIds.length > 0 ? [{ type: 'UNLOCK_GRANTED' as const, message: `${settled.value.summary.unlockedQuestIds.map(getQuestDisplayName).join(', ')} 해금` }] : []),
        { type: 'REWARD_GRANTED', message: `골드 ${goldGranted}, 캐릭터당 EXP ${experiencePerCharacter}, 원정 보상을 획득했다.` },
      ]
      return {
        state: { ...state, screen: 'result', profile: settled.value.profile, session: null, result: { outcome: 'victory', gold: goldGranted, experience: experiencePerCharacter, settlement: settled.value.summary, rewardEntries: settled.value.rewards } },
        events: settlementEvents,
        persistence: 'save_profile',
        battlePresentation,
      }
    }
    const events = [...update.events, { type: 'SCREEN_CHANGED' as const, message: '탐사로 돌아왔다.' }]
    return { state: { ...state, screen: 'exploration', session }, events, persistence: 'none', battlePresentation }
  }
  if (update.combat.outcome === 'lost') {
    const partyHp = new Map(update.combat.participants.filter((actor) => actor.side === 'party').map((actor) => [actor.id, actor.currentHp]))
    session = { ...session, party: session.party.map((actor) => ({ ...actor, currentHp: Math.min(actor.maxHp, partyHp.get(actor.id) ?? actor.currentHp) })) }
    const events = [...update.events, { type: 'SCREEN_CHANGED' as const, message: '원정이 끝났다.' }]
    return { state: { ...state, screen: 'result', session, result: { outcome: 'defeat', gold: 0, experience: 0 } }, events, persistence: 'none', battlePresentation }
  }
  return { state: { ...state, session }, events: update.events, persistence: 'none' }
}

export function reduceGame(state: GameState, command: GameCommand): EngineResult {
  if (command.type === 'OPEN_PROFILE_CREATE') {
    if (state.screen !== 'start' || state.profile) return reject(state, command, '새 프로필을 만들 수 없는 상태다.')
    return { state: { ...state, screen: 'profile_create', result: null }, events: [{ type: 'SCREEN_CHANGED', message: '프로필 생성을 시작한다.' }], persistence: 'none' }
  }
  if (command.type === 'CREATE_PROFILE') {
    if (state.screen !== 'profile_create' || state.profile) return reject(state, command, '프로필을 생성할 수 없는 상태다.')
    const profile = createProfile(command)
    if (!profile) return reject(state, command, '이름과 캐릭터 설정을 확인해야 한다.')
    return { state: { screen: 'hub', profile, session: null, result: null, pendingQuestEntry: null }, events: [{ type: 'SCREEN_CHANGED', message: '거점에 도착했다.' }], persistence: 'save_profile' }
  }
  if (command.type === 'LOAD_PROFILE') {
    if (state.screen !== 'start' || !state.profile) return reject(state, command, '불러올 프로필이 없다.')
    if (state.profile.pendingReward) {
      const summary = state.profile.pendingReward.summary
      return { state: { ...state, screen: 'result', result: { outcome: 'victory', gold: summary.goldGranted, experience: summary.experiencePerCharacter, settlement: summary, rewardEntries: state.profile.pendingReward.rewards } }, events: [{ type: 'SCREEN_CHANGED', message: '미완료 보상 정산을 복구했다.' }], persistence: 'none' }
    }
    return { state: { ...state, screen: 'hub', result: null }, events: [{ type: 'SCREEN_CHANGED', message: '거점으로 이동했다.' }], persistence: 'none' }
  }
  if (command.type === 'RESET_PROFILE') {
    return { state: createInitialGameState(), events: [{ type: 'SCREEN_CHANGED', message: '프로필을 초기화했다.' }], persistence: 'clear_profile' }
  }
  if (command.type === 'REQUEST_QUEST_ENTRY') {
    const error = questEntryError(state, command.questId)
    if (error || !state.profile) return reject(state, command, error ?? '현재 퀘스트에 입장할 수 없다.')
    const freeSlots = state.profile.storage.capacity - usedStorageSlots(state.profile)
    if (freeSlots <= 2) {
      return {
        state: { ...state, pendingQuestEntry: command.questId },
        events: [{ type: 'QUEST_ENTRY_WARNING', message: `창고 빈칸이 ${freeSlots}칸이다. 보상 일부를 포기할 수 있다.` }],
        persistence: 'none',
      }
    }
    return startQuestEntry(state as GameState & { profile: ProfileV2 }, command.questId)
  }
  if (command.type === 'CONTINUE_QUEST_ENTRY') {
    if (state.pendingQuestEntry !== command.questId) return reject(state, command, '확인 중인 퀘스트와 일치하지 않는다.')
    const error = questEntryError(state, command.questId)
    if (error || !state.profile) return reject(state, command, error ?? '현재 퀘스트에 입장할 수 없다.')
    return startQuestEntry(state as GameState & { profile: ProfileV2 }, command.questId)
  }
  if (command.type === 'RETURN_TO_STORAGE') {
    if (state.screen !== 'hub' || !state.pendingQuestEntry) return reject(state, command, '창고로 돌아갈 퀘스트 확인이 없다.')
    return {
      state: { ...state, pendingQuestEntry: null },
      events: [{ type: 'SCREEN_CHANGED', message: '퀘스트 진입을 취소하고 창고로 돌아갔다.' }],
      persistence: 'none',
    }
  }
  if (command.type === 'RETURN_TO_HUB') {
    if (state.screen !== 'result' || !state.profile) return reject(state, command, '결과 화면에서만 거점으로 복귀할 수 있다.')
    if (state.profile.pendingReward) return reject(state, command, '보상 선택을 먼저 확정해야 한다.')
    return { state: { ...state, screen: 'hub', session: null, result: null }, events: [{ type: 'SCREEN_CHANGED', message: '거점으로 돌아왔다.' }], persistence: 'save_profile' }
  }
  if (command.type === 'SET_REWARD_SELECTION') {
    if (state.screen !== 'result' || !state.profile?.pendingReward) return reject(state, command, '선택할 보상이 없다.')
    return applyProfileRule(state, command, setRewardSelection(state.profile, command.selections), 'STORAGE_CHANGED', '보관할 보상을 선택했다.')
  }
  if (command.type === 'CONFIRM_REWARD_SELECTION') {
    if (state.screen !== 'result' || !state.profile?.pendingReward || command.confirmDiscardUnselected !== true) return reject(state, command, '보상 포기 확인이 필요하다.')
    return applyProfileRule(state, command, confirmRewardSelection(state.profile), 'STORAGE_CHANGED', '선택한 보상을 보관하고 나머지를 포기했다.')
  }
  if (command.type === 'EQUIP_ITEM' || command.type === 'UNEQUIP_ITEM' || command.type === 'MOVE_ITEM_TO_CHARACTER' || command.type === 'RETURN_ITEM_TO_STORAGE'
    || command.type === 'BUY_EQUIPMENT' || command.type === 'BUY_ITEM' || command.type === 'SELL_EQUIPMENT' || command.type === 'SELL_ITEM'
    || command.type === 'EQUIP_CUSTOM_SKILL' || command.type === 'UNEQUIP_CUSTOM_SKILL' || command.type === 'BUY_SKILL' || command.type === 'SELL_SKILL') {
    if (!hubReady(state)) return reject(state, command, '거점에서만 수행할 수 있다.')
    if (command.type === 'EQUIP_ITEM') return applyProfileRule(state, command, equipEquipment(state.profile, command.characterId, command.equipmentInstanceId), 'EQUIPMENT_CHANGED', '장비를 장착했다.')
    if (command.type === 'UNEQUIP_ITEM') return applyProfileRule(state, command, unequipEquipment(state.profile, command.characterId, command.slot, command.equipmentInstanceId), 'EQUIPMENT_CHANGED', '장비를 창고로 반환했다.')
    if (command.type === 'MOVE_ITEM_TO_CHARACTER') return applyProfileRule(state, command, moveItemToCharacter(state.profile, command.characterId, command.stackId, command.quantity), 'STORAGE_CHANGED', '아이템을 캐릭터에게 분배했다.')
    if (command.type === 'RETURN_ITEM_TO_STORAGE') return applyProfileRule(state, command, returnItemToStorage(state.profile, command.characterId, command.stackId, command.quantity), 'STORAGE_CHANGED', '아이템을 창고로 반환했다.')
    if (command.type === 'BUY_EQUIPMENT') return applyProfileRule(state, command, buyEquipment(state.profile, command.equipmentId), 'SHOP_TRANSACTION', '장비를 구매해 창고에 보관했다.')
    if (command.type === 'BUY_ITEM') return applyProfileRule(state, command, buyItem(state.profile, command.itemId, command.quantity), 'SHOP_TRANSACTION', '아이템을 구매해 창고에 보관했다.')
    if (command.type === 'SELL_EQUIPMENT') return applyProfileRule(state, command, sellEquipment(state.profile, command.equipmentInstanceId), 'SHOP_TRANSACTION', '창고 장비를 판매했다.')
    if (command.type === 'SELL_ITEM') return applyProfileRule(state, command, sellItem(state.profile, command.stackId, command.quantity), 'SHOP_TRANSACTION', '창고 아이템을 판매했다.')
    if (command.type === 'EQUIP_CUSTOM_SKILL') return applyProfileRule(state, command, equipCustomSkill(state.profile, command.characterId, command.skillInstanceId, command.slotIndex), 'EQUIPMENT_CHANGED', '커스텀 스킬을 장착했다.')
    if (command.type === 'UNEQUIP_CUSTOM_SKILL') return applyProfileRule(state, command, unequipCustomSkill(state.profile, command.characterId, command.skillInstanceId, command.slotIndex), 'EQUIPMENT_CHANGED', '커스텀 스킬을 창고로 반환했다.')
    if (command.type === 'BUY_SKILL') return applyProfileRule(state, command, buySkill(state.profile, command.skillId), 'SHOP_TRANSACTION', '스킬을 구매해 창고에 보관했다.')
    return applyProfileRule(state, command, sellSkill(state.profile, command.skillInstanceId), 'SHOP_TRANSACTION', '창고 스킬을 판매했다.')
  }
  if (!state.session) return reject(state, command, '진행 중인 원정이 없다.')

  if (command.type === 'USE_ITEM') {
    if (!state.profile) return reject(state, command, '프로필을 찾을 수 없다.')
    const owner = state.profile.characters.find((character) => character.characterId === command.characterId)
    const stack = owner?.inventorySlots.find((item) => item.stackId === command.stackId)
    const itemId = stack?.itemId as ItemId | undefined
    const definition = itemId ? ITEM_DATA[itemId] : undefined
    if (!owner || !stack || !itemId || !definition) return reject(state, command, '사용할 아이템을 찾을 수 없다.')
    if (state.screen === 'battle' && state.session.combat) {
      const update = useCombatItem(state.session.combat, command.characterId, itemId, command.targetId, state.session.rngState)
      if (update.events.length === 1 && update.events[0].type === 'COMMAND_REJECTED') return { state, events: update.events, persistence: 'none' }
      const consumed = consumeCharacterItem(state.profile, command.characterId, command.stackId, itemId)
      if (!consumed.ok) return reject(state, command, consumed.error)
      const applied = applyCombatUpdate({ ...state, profile: consumed.value }, command, update)
      return { ...applied, persistence: 'save_profile' }
    }
    if (state.screen !== 'exploration' || !definition.usableIn.includes('exploration')) return reject(state, command, '탐사 중 사용할 수 없는 아이템이다.')
    const events: GameEvent[] = []
    let session = state.session
    if (definition.effect === 'survey') {
      const found = discoverNearbyPlacements(session.exploration.mapId, session.exploration.x, session.exploration.y, session.discoveredTrapIds, session.discoveredSecretIds)
      if (found.trapIds.length === 0 && found.secretIds.length === 0) return reject(state, command, '주변에서 발견할 것이 없다.')
      events.push({ type: 'ITEM_USED', message: `${owner.name}이(가) 탐색용 분필을 사용했다.`, actorId: owner.characterId, itemId })
      events.push(...found.trapIds.map((placementId): GameEvent => ({ type: 'TRAP_DISCOVERED', message: '탐색용 분필로 함정을 발견했다.', sourceActorId: owner.characterId, itemId, placementId })))
      events.push(...found.secretIds.map((placementId): GameEvent => ({ type: 'SECRET_ROOM_DISCOVERED', message: '탐색용 분필로 비밀방을 발견했다.', sourceActorId: owner.characterId, itemId, placementId })))
      session = { ...session, discoveredTrapIds: [...session.discoveredTrapIds, ...found.trapIds], discoveredSecretIds: [...session.discoveredSecretIds, ...found.secretIds] }
    } else if (definition.effect === 'heal_10' || definition.effect === 'heal_22') {
      const target = session.party.find((actor) => actor.id === command.targetId)
      if (!target || target.currentHp <= 0 || target.currentHp >= target.maxHp) return reject(state, command, '회복 대상을 확인해야 한다.')
      const amount = definition.effect === 'heal_10' ? 10 : 22
      const hp = Math.min(target.maxHp, target.currentHp + amount)
      events.push({ type: 'ITEM_USED', message: `${owner.name}이(가) ${definition.name}을(를) 사용했다.`, actorId: owner.characterId, targetId: target.id, itemId })
      events.push({ type: 'HEAL_APPLIED', message: `${target.name} HP ${hp - target.currentHp} 회복`, actorId: owner.characterId, targetId: target.id, itemId, resultValue: hp - target.currentHp })
      session = { ...session, party: session.party.map((actor) => actor.id === target.id ? { ...actor, currentHp: hp } : actor) }
    } else return reject(state, command, '현재 제거할 상태가 없다.')
    const consumed = consumeCharacterItem(state.profile, command.characterId, command.stackId, itemId)
    if (!consumed.ok) return reject(state, command, consumed.error)
    session = appendEvents(session, events)
    return { state: { ...state, profile: consumed.value, session }, events, persistence: 'save_profile' }
  }

  if (command.type === 'TURN_LEFT' || command.type === 'TURN_RIGHT') {
    if (state.screen !== 'exploration') return reject(state, command, '탐사 중에만 회전할 수 있다.')
    const exploration = turn(state.session.exploration, command.type === 'TURN_LEFT' ? -1 : 1)
    const event: GameEvent = { type: 'PARTY_TURNED', message: `${getDirectionDisplayName(exploration.direction)}으로 회전했다.` }
    return { state: { ...state, session: appendEvents({ ...state.session, exploration }, [event]) }, events: [event], persistence: 'none' }
  }
  if (command.type === 'MOVE_FORWARD' || command.type === 'MOVE_BACKWARD') {
    if (state.screen !== 'exploration') return reject(state, command, '탐사 중에만 이동할 수 있다.')
    const moved = move(state.session.exploration, state.session.completedEncounterIds, state.session.discoveredSecretIds, command.type === 'MOVE_BACKWARD')
    const event: GameEvent = moved.blocked
      ? { type: 'MOVE_BLOCKED', message: '벽에 막혔다.' }
      : { type: 'PARTY_MOVED', message: `(${moved.state.x}, ${moved.state.y})로 이동했다.` }
    let session = appendEvents({ ...state.session, exploration: moved.state }, [event])
    let persistence: PersistenceRequest = 'none'
    const emittedEvents: GameEvent[] = [event]
    if (!moved.blocked) {
      const map = getMapDefinition(session.exploration.mapId)
      const trap = map.traps.find((item) => item.x === moved.state.x && item.y === moved.state.y)
      if (trap && !session.discoveredTrapIds.includes(trap.trapId) && !session.triggeredTrapIds.includes(trap.trapId)) {
        const trapEvents: GameEvent[] = [{ type: 'TRAP_TRIGGERED', message: `함정 발동: 파티 전원 ${trap.damage} 피해`, placementId: trap.trapId, damage: trap.damage }]
        const party = session.party.map((actor) => {
          const currentHp = Math.max(0, actor.currentHp - trap.damage)
          if (currentHp === 0 && actor.currentHp > 0) trapEvents.push({ type: 'ACTOR_DEFEATED', message: `${actor.name}이(가) 함정에 쓰러졌다.` })
          return { ...actor, currentHp }
        })
        session = appendEvents({ ...session, party, triggeredTrapIds: [...session.triggeredTrapIds, trap.trapId] }, trapEvents)
        emittedEvents.push(...trapEvents)
        if (party.every((actor) => actor.currentHp <= 0)) return { state: { ...state, screen: 'result', session: null, result: { outcome: 'defeat', gold: 0, experience: 0 } }, events: emittedEvents, persistence: 'none' }
      }
      const secret = map.secrets.find((item) => item.rewardX === moved.state.x && item.rewardY === moved.state.y)
      if (secret && session.discoveredSecretIds.includes(secret.secretId) && !session.claimedSecretRewardIds.includes(secret.secretId) && state.profile) {
        const generated = createSecretRoomReward(state.profile, session.seed, session.questId, secret.secretId)
        const reward = generated.reward
        const rewardEvent: GameEvent = { type: 'REWARD_GRANTED', message: `비밀방에서 ${getRewardDisplayName(reward)}을(를) 발견했다.` }
        session = appendEvents({ ...session, pendingLoot: [...session.pendingLoot, reward], claimedSecretRewardIds: [...session.claimedSecretRewardIds, secret.secretId] }, [rewardEvent])
        emittedEvents.push(rewardEvent)
        state = { ...state, profile: generated.profile }
        persistence = 'save_profile'
      }
    }
    if (moved.encounterStarted && moved.encounterId) {
      const battle = startCombat(session.party, createEncounterEnemies(moved.encounterId), session.rngState, moved.encounterId)
      const applied = applyCombatUpdate({ ...state, screen: 'battle', session }, command, battle)
      return {
        ...applied,
        events: [...emittedEvents, ...applied.events],
        persistence: applied.persistence === 'none' ? persistence : applied.persistence,
      }
    }
    return { state: { ...state, session }, events: emittedEvents, persistence }
  }

  if (state.screen !== 'battle' || !state.session.combat) return reject(state, command, '전투 중에만 사용할 수 있는 명령이다.')
  const combat = state.session.combat
  if (command.type === 'SELECT_SKILL') return applyCombatUpdate(state, command, selectSkill(combat, command.skillId, state.session.rngState))
  if (command.type === 'CANCEL_SKILL_SELECTION') return applyCombatUpdate(state, command, cancelSkillSelection(combat, state.session.rngState))
  if (command.type === 'SELECT_TARGET') {
    if (combat.selectedSkillId === 'first_aid') {
      if (!state.profile) return reject(state, command, '프로필을 찾을 수 없다.')
      const actorId = combat.turnOrder[combat.turnIndex]
      const character = state.profile.characters.find((item) => item.characterId === actorId)
      const bandage = character?.inventorySlots.find((item) => item.itemId === 'bandage')
      if (!character || !bandage) return reject(state, command, '응급 치료에 필요한 붕대가 없다.')
      const actor = combat.participants.find((item) => item.id === actorId)
      if (!actor || command.targetId !== actorId || actor.currentHp >= actor.maxHp) return reject(state, command, '응급 치료 대상을 확인해야 한다.')
      const update = selectTarget(combat, command.targetId, state.session.rngState)
      if (update.events.length === 1 && update.events[0].type === 'COMMAND_REJECTED') return applyCombatUpdate(state, command, update)
      const consumed = consumeCharacterItem(state.profile, actorId, bandage.stackId, 'bandage')
      if (!consumed.ok) return reject(state, command, consumed.error)
      const applied = applyCombatUpdate({ ...state, profile: consumed.value }, command, update)
      return { ...applied, persistence: 'save_profile' }
    }
    return applyCombatUpdate(state, command, selectTarget(combat, command.targetId, state.session.rngState))
  }
  if (command.type === 'REROLL_DIE') return applyCombatUpdate(state, command, rerollDie(combat, command.dieIndex, state.session.rngState))
  if (command.type === 'SKIP_REROLL') return applyCombatUpdate(state, command, skipReroll(combat, state.session.rngState))
  return reject(state, command, '처리할 수 없는 명령이다.')
}
