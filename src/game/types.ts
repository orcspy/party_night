export type Direction = 'north' | 'east' | 'south' | 'west'
export type Screen = 'start' | 'setup' | 'exploration' | 'battle' | 'result'
export type Side = 'party' | 'enemy'
export type RaceId = 'human' | 'elf' | 'dwarf' | 'halfling'
export type ClassId = 'warrior' | 'rogue' | 'archer' | 'paladin' | 'priest' | 'mage'

export interface MainCharacterConfig {
  name: string
  raceId: RaceId
  classId: ClassId
  gender: string
}

export interface Profile {
  mainCharacterConfig: MainCharacterConfig
  totalGold: number
  totalExperience: number
}

export interface Stats {
  maxHp: number
  currentHp: number
  atk: number
  def: number
  agi: number
}

export interface Actor extends Stats {
  id: string
  contentId: string
  name: string
  side: Side
  classId?: ClassId
  row?: 'front' | 'back'
  skillIds: string[]
}

export interface Skill {
  id: string
  name: string
  diceCount: number
  fixedModifier: number
  oncePerBattle: boolean
  rerolls: number
}

export interface DieResult {
  value: number
  rerolled: boolean
}

export interface PendingRoll {
  actorId: string
  targetId: string
  skillId: string
  dice: DieResult[]
  originalDice: number[]
  fixedModifier: number
  rerollsRemaining: number
}

export type CombatPhase = 'awaiting_action' | 'awaiting_target' | 'awaiting_reroll' | 'resolving' | 'ended'

export interface CombatState {
  battleId: string
  round: number
  phase: CombatPhase
  participants: Actor[]
  turnOrder: string[]
  turnIndex: number
  selectedSkillId: string | null
  pendingRoll: PendingRoll | null
  usedSkillIdsByActor: Record<string, string[]>
  outcome: 'won' | 'lost' | null
}

export interface ExplorationState {
  mapId: string
  x: number
  y: number
  direction: Direction
  triggeredEncounterIds: string[]
  questStatus: 'active' | 'completed'
}

export interface SessionState {
  seed: number
  rngState: number
  party: Actor[]
  exploration: ExplorationState
  combat: CombatState | null
  logs: string[]
}

export interface GameResult {
  outcome: 'victory' | 'defeat'
  gold: number
  experience: number
}

export interface GameState {
  screen: Screen
  profile: Profile
  hasSave: boolean
  session: SessionState | null
  result: GameResult | null
}

export type GameCommand =
  | { type: 'OPEN_SETUP' }
  | { type: 'LOAD_PROFILE' }
  | { type: 'START_QUEST'; mainCharacterConfig: MainCharacterConfig; seed?: number }
  | { type: 'TURN_LEFT' }
  | { type: 'TURN_RIGHT' }
  | { type: 'MOVE_FORWARD' }
  | { type: 'MOVE_BACKWARD' }
  | { type: 'SELECT_SKILL'; skillId: string }
  | { type: 'SELECT_TARGET'; targetId: string }
  | { type: 'REROLL_DIE'; dieIndex: number }
  | { type: 'SKIP_REROLL' }
  | { type: 'RETURN_TO_SETUP' }
  | { type: 'RESET_PROFILE' }

export type GameEventType =
  | 'SCREEN_CHANGED' | 'SESSION_STARTED' | 'PARTY_MOVED' | 'PARTY_TURNED'
  | 'MOVE_BLOCKED' | 'ENCOUNTER_STARTED' | 'TURN_STARTED' | 'DICE_ROLLED'
  | 'DIE_REROLLED' | 'DAMAGE_APPLIED' | 'ACTOR_DEFEATED' | 'ROUND_STARTED'
  | 'BATTLE_WON' | 'BATTLE_LOST' | 'QUEST_COMPLETED' | 'REWARD_GRANTED'
  | 'COMMAND_REJECTED'

export interface GameEvent {
  type: GameEventType
  message: string
}
