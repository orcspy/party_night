import { createEnemies, createParty } from '../game/content'
import { rerollDie, selectSkill, selectTarget, skipReroll, startCombat, type CombatUpdate } from '../game/combat'
import { createExploration, move, turn } from '../game/exploration'
import { normalizeSeed } from '../game/rng'
import type { GameCommand, GameEvent, GameState, MainCharacterConfig, Profile, SessionState } from '../game/types'

const SAVE_KEY = 'party_night_mvp_save_v1'
const DEFAULT_CONFIG: MainCharacterConfig = { name: '', raceId: 'human', classId: 'warrior', gender: '남성' }

interface SavedProfile extends Profile { version: 1 }
type Listener = (state: GameState, events: GameEvent[]) => void

function validConfig(value: unknown): value is MainCharacterConfig {
  if (!value || typeof value !== 'object') return false
  const config = value as Partial<MainCharacterConfig>
  return typeof config.name === 'string' && config.name.trim().length >= 1 && config.name.trim().length <= 12
    && ['human', 'elf', 'dwarf', 'halfling'].includes(config.raceId ?? '')
    && ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage'].includes(config.classId ?? '')
    && typeof config.gender === 'string' && config.gender.length > 0
}

function readSave(): SavedProfile | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return null
    const save = raw as Partial<SavedProfile>
    if (save.version !== 1 || !validConfig(save.mainCharacterConfig)
      || typeof save.totalGold !== 'number' || !Number.isFinite(save.totalGold)
      || typeof save.totalExperience !== 'number' || !Number.isFinite(save.totalExperience)) return null
    return save as SavedProfile
  } catch {
    return null
  }
}

function persist(profile: Profile): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, ...profile }))
  } catch {
    // Storage can be unavailable in privacy mode; play remains available in memory.
  }
}

function clearSave(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // Keep the in-memory reset even when browser storage is unavailable.
  }
}

function appendEvents(session: SessionState, events: GameEvent[]): SessionState {
  if (events.length === 0) return session
  return { ...session, logs: [...session.logs, ...events.map((event) => event.message)].slice(-200) }
}

function reject(state: GameState, message: string): { state: GameState; events: GameEvent[] } {
  const event: GameEvent = { type: 'COMMAND_REJECTED', message }
  return { state: state.session ? { ...state, session: appendEvents(state.session, [event]) } : state, events: [event] }
}

function applyCombatUpdate(state: GameState, update: CombatUpdate): { state: GameState; events: GameEvent[] } {
  if (!state.session) return reject(state, '진행 중인 세션이 없다.')
  let session: SessionState = appendEvents({ ...state.session, rngState: update.rngState, combat: update.combat }, update.events)
  if (update.combat.outcome === 'won') {
    const partyHp = new Map(update.combat.participants.filter((actor) => actor.side === 'party').map((actor) => [actor.id, actor.currentHp]))
    session = {
      ...session,
      party: session.party.map((actor) => ({ ...actor, currentHp: partyHp.get(actor.id) ?? actor.currentHp })),
      exploration: { ...session.exploration, triggeredEncounterIds: [...session.exploration.triggeredEncounterIds, update.combat.battleId] },
      combat: null,
    }
    return { state: { ...state, screen: 'exploration', session }, events: [...update.events, { type: 'SCREEN_CHANGED', message: '탐사로 돌아왔다.' }] }
  }
  if (update.combat.outcome === 'lost') {
    const partyHp = new Map(update.combat.participants.filter((actor) => actor.side === 'party').map((actor) => [actor.id, actor.currentHp]))
    session = { ...session, party: session.party.map((actor) => ({ ...actor, currentHp: partyHp.get(actor.id) ?? actor.currentHp })) }
    return { state: { ...state, screen: 'result', session, result: { outcome: 'defeat', gold: 0, experience: 0 } }, events: [...update.events, { type: 'SCREEN_CHANGED', message: '원정이 끝났다.' }] }
  }
  return { state: { ...state, session }, events: update.events }
}

function reduce(state: GameState, command: GameCommand): { state: GameState; events: GameEvent[]; save?: boolean; clear?: boolean } {
  if (command.type === 'OPEN_SETUP' || command.type === 'LOAD_PROFILE') return { state: { ...state, screen: 'setup', result: null }, events: [{ type: 'SCREEN_CHANGED', message: '파티 준비를 시작한다.' }] }
  if (command.type === 'RESET_PROFILE') {
    return { state: { screen: 'start', profile: { mainCharacterConfig: DEFAULT_CONFIG, totalGold: 0, totalExperience: 0 }, hasSave: false, session: null, result: null }, events: [{ type: 'SCREEN_CHANGED', message: '저장 데이터를 초기화했다.' }], clear: true }
  }
  if (command.type === 'START_QUEST') {
    if (!validConfig(command.mainCharacterConfig)) return reject(state, '이름과 캐릭터 설정을 확인해야 한다.')
    const config = { ...command.mainCharacterConfig, name: command.mainCharacterConfig.name.trim() }
    const seed = normalizeSeed(command.seed ?? Date.now())
    const session: SessionState = { seed, rngState: seed, party: createParty(config), exploration: createExploration(), combat: null, logs: ['훈련 폐허에 입장했다.'] }
    return { state: { ...state, screen: 'exploration', profile: { ...state.profile, mainCharacterConfig: config }, hasSave: true, session, result: null }, events: [{ type: 'SESSION_STARTED', message: '퀘스트를 시작했다.' }], save: true }
  }
  if (command.type === 'RETURN_TO_SETUP') {
    if (state.screen !== 'result') return reject(state, '결과 화면에서만 복귀할 수 있다.')
    return { state: { ...state, screen: 'setup', session: null, result: null }, events: [{ type: 'SCREEN_CHANGED', message: '준비 화면으로 돌아왔다.' }], save: true }
  }
  if (!state.session) return reject(state, '진행 중인 세션이 없다.')

  if (command.type === 'TURN_LEFT' || command.type === 'TURN_RIGHT') {
    if (state.screen !== 'exploration') return reject(state, '탐사 중에만 회전할 수 있다.')
    const exploration = turn(state.session.exploration, command.type === 'TURN_LEFT' ? -1 : 1)
    const event: GameEvent = { type: 'PARTY_TURNED', message: `${exploration.direction} 방향으로 회전했다.` }
    return { state: { ...state, session: appendEvents({ ...state.session, exploration }, [event]) }, events: [event] }
  }
  if (command.type === 'MOVE_FORWARD' || command.type === 'MOVE_BACKWARD') {
    if (state.screen !== 'exploration') return reject(state, '탐사 중에만 이동할 수 있다.')
    const moved = move(state.session.exploration, command.type === 'MOVE_BACKWARD')
    const event: GameEvent = moved.blocked
      ? { type: 'MOVE_BLOCKED', message: '벽에 막혔다.' }
      : { type: 'PARTY_MOVED', message: `(${moved.state.x}, ${moved.state.y})로 이동했다.` }
    let session = appendEvents({ ...state.session, exploration: moved.state }, [event])
    if (moved.encounterStarted) {
      const battle = startCombat(session.party, createEnemies(), session.rngState)
      session = appendEvents({ ...session, combat: battle.combat, rngState: battle.rngState }, battle.events)
      return { state: { ...state, screen: 'battle', session }, events: [event, ...battle.events] }
    }
    if (moved.questCompleted) {
      const rewardEvents: GameEvent[] = [
        { type: 'QUEST_COMPLETED', message: '훈련 폐허 탐사를 완료했다.' },
        { type: 'REWARD_GRANTED', message: '골드 100, 경험치 50을 획득했다.' },
      ]
      const profile = { ...state.profile, totalGold: state.profile.totalGold + 100, totalExperience: state.profile.totalExperience + 50 }
      session = appendEvents(session, rewardEvents)
      return { state: { ...state, screen: 'result', profile, session, result: { outcome: 'victory', gold: 100, experience: 50 } }, events: [event, ...rewardEvents], save: true }
    }
    return { state: { ...state, session }, events: [event] }
  }

  if (state.screen !== 'battle' || !state.session.combat) return reject(state, '전투 중에만 사용할 수 있는 명령이다.')
  const combat = state.session.combat
  if (command.type === 'SELECT_SKILL') return applyCombatUpdate(state, selectSkill(combat, command.skillId, state.session.rngState))
  if (command.type === 'SELECT_TARGET') return applyCombatUpdate(state, selectTarget(combat, command.targetId, state.session.rngState))
  if (command.type === 'REROLL_DIE') return applyCombatUpdate(state, rerollDie(combat, command.dieIndex, state.session.rngState))
  if (command.type === 'SKIP_REROLL') return applyCombatUpdate(state, skipReroll(combat, state.session.rngState))
  return reject(state, '처리할 수 없는 명령이다.')
}

export interface GameStore {
  getState: () => GameState
  dispatch: (command: GameCommand) => void
  subscribe: (listener: Listener) => () => void
}

export function createGameStore(initialState?: GameState): GameStore {
  const saved = initialState ? null : readSave()
  let state: GameState = initialState ?? {
    screen: 'start',
    profile: saved ? { mainCharacterConfig: saved.mainCharacterConfig, totalGold: saved.totalGold, totalExperience: saved.totalExperience } : { mainCharacterConfig: DEFAULT_CONFIG, totalGold: 0, totalExperience: 0 },
    hasSave: Boolean(saved), session: null, result: null,
  }
  const listeners = new Set<Listener>()
  return {
    getState: () => state,
    dispatch: (command) => {
      const result = reduce(state, command)
      state = result.state
      if (result.clear) clearSave()
      if (result.save) persist(state.profile)
      listeners.forEach((listener) => listener(state, result.events))
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const gameStore = createGameStore()
