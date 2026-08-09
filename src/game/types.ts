export type Direction = 'north' | 'east' | 'south' | 'west'
export type Screen = 'start' | 'profile_create' | 'hub' | 'exploration' | 'battle' | 'result'
export type Side = 'party' | 'enemy'
export type RaceId = 'human' | 'elf' | 'dwarf' | 'halfling'
export type ClassId = 'warrior' | 'rogue' | 'archer' | 'paladin' | 'priest' | 'mage'
export type Gender = '남성' | '여성'
export type AssetGender = 'male' | 'female'
export type Row = 'front' | 'back'
export type QuestId = 'training_ruins_quest' | 'goblin_den_quest' | 'ancient_site_quest' | 'underground_dungeon_quest' | 'old_castle_quest' | 'volcanic_cave_quest' | 'deep_forest_ruins_quest'
export type RepeatQuestId = 'volcanic_cave_quest' | 'deep_forest_ruins_quest'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'heroic' | 'legendary'
export type EquipmentSlot = 'weapon' | 'offhand' | 'head' | 'body'
export type EquipmentFamily = 'dagger' | 'sword' | 'mace' | 'shield' | 'bow' | 'staff' | 'rod' | 'head' | 'body'
export type ItemId = 'minor_healing_potion' | 'bandage' | 'remedy' | 'fire_bomb' | 'survey_chalk' | 'greater_healing_potion' | 'might_tonic' | 'haste_tonic' | 'panacea'

export interface MainCharacterConfig {
  name: string
  raceId: RaceId
  classId: ClassId
  gender: Gender
}

export interface Stats {
  maxHp: number
  currentHp: number
  atk: number
  def: number
  agi: number
}

export interface BaseAttributes {
  str: number
  dex: number
  int: number
  con: number
  agi: number
  luck: number
}

export interface AttributeModifiers {
  str: number
  dex: number
  int: number
  con: number
  agi: number
  luck: number
}

export interface AttributeGrowth {
  str: number
  dex: number
  int: number
  con: number
  agi: number
  luck: number
}

export interface EquipmentInstance {
  equipmentInstanceId: string
  equipmentId: string
}

export interface ItemStack {
  stackId: string
  itemId: string
  quantity: number
}

export interface SkillInstance {
  skillInstanceId: string
  skillId: string
}

export interface CharacterEquipment {
  weapon: EquipmentInstance | null
  offhand: EquipmentInstance | null
  head: EquipmentInstance | null
  body: EquipmentInstance | null
}

export interface PersistentCharacter {
  characterId: string
  name: string
  raceId: RaceId
  classId: ClassId
  gender: Gender
  row: Row
  level: number
  experience: number
  growth: AttributeGrowth
  equipment: CharacterEquipment
  inventorySlots: ItemStack[]
  customSkillSlots: [SkillInstance | null, SkillInstance | null, SkillInstance | null]
}

export interface SharedStorage {
  capacity: 100
  equipmentInstances: EquipmentInstance[]
  itemStacks: ItemStack[]
  skillInstances: SkillInstance[]
}

export interface QuestProgress {
  unlockedQuestIds: QuestId[]
  completedQuestIds: QuestId[]
  repeatCompletionCounts: Record<RepeatQuestId, number>
}

export interface ShopState {
  unlockedRarities: Rarity[]
  skillOfferIds: string[]
}

export interface ProfileRandomState {
  rootSeed: number
  nextExpeditionSequence: number
  nextInstanceSequence: number
  shopRevision: number
}

export interface ProfileV2 {
  profileId: string
  createdAt: number
  gold: number
  characters: [PersistentCharacter, PersistentCharacter, PersistentCharacter, PersistentCharacter]
  storage: SharedStorage
  questProgress: QuestProgress
  shop: ShopState
  random: ProfileRandomState
  pendingReward: PendingRewardClaim | null
}

export type AttackBasis = 'str' | 'dex' | 'int' | 'max_str_int'

export interface ClassDerivation {
  attackBasis: AttackBasis
  attackModifier: number
  defenseModifier: number
}

export interface DerivedCombatStats {
  maxHp: number
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
  /** Character identity used for sprite selection. Party stats are derived from raceId during Actor creation. */
  raceId?: RaceId
  /** Display-only metadata for party sprite selection. */
  gender?: AssetGender
  row?: Row
  attributes?: BaseAttributes
  isBoss?: boolean
  isUndead?: boolean
  weaponFamily?: EquipmentFamily
  skillIds: string[]
}

export interface Skill {
  id: string
  name: string
  diceCount: number
  fixedModifier: number
  rerolls: number
  activation: 'active' | 'passive'
  targetMode: 'single_enemy' | 'all_enemies' | 'single_ally' | 'self'
  resolution: 'damage' | 'heal' | 'taunt' | 'buff' | 'status' | 'passive_seek_trap' | 'passive_protection' | 'passive_resource'
  useLimit: { type: 'cooldown'; rounds: number } | { type: 'once_per_battle' } | { type: 'unlimited' }
}

export interface CharacterSettlementResult {
  characterId: string
  previousLevel: number
  level: number
  previousExperience: number
  experience: number
  growthApplied: AttributeGrowth
  unlockedClassSkillIds: string[]
  unlockedCustomSlotIndices: number[]
}

export interface QuestSettlementSummary {
  questId: QuestId
  goldGranted: number
  experiencePerCharacter: number
  characterResults: CharacterSettlementResult[]
  unlockedQuestIds: QuestId[]
  unlockedRarities: Rarity[]
}

export type PendingRewardEntry =
  | { rewardId: string; kind: 'equipment'; instance: EquipmentInstance }
  | { rewardId: string; kind: 'skill'; instance: SkillInstance }
  | { rewardId: string; kind: 'item'; itemId: string; quantity: number }

export interface RewardSelection {
  rewardId: string
  quantity: number
}

export interface PendingRewardClaim {
  claimId: string
  questId: QuestId
  summary: QuestSettlementSummary
  rewards: PendingRewardEntry[]
  selections: RewardSelection[]
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
  cooldownsByActor: Record<string, Record<string, number>>
  tauntsByEnemy: Record<string, { sourceActorId: string; remainingAttacks: number }>
  stunnedActionsByActor: Record<string, number>
  itemBuffsByActor: Record<string, { might?: { remainingRounds: number }; haste?: { remainingRounds: number } }>
  removableStatusesByActor?: Record<string, ('bleed' | 'neurotoxin' | 'paralysis' | 'sleep' | 'attribute_decrease')[]>
  bleedStacksByActor?: Record<string, number>
  paralyzedActionsByActor?: Record<string, number>
  sleepingByActor?: Record<string, boolean>
  exposedByActor?: Record<string, { bonusDamage: number; sourceActorId: string; sourceActionsRemaining: number; appliedRound: number }>
  neurotoxinsByActor?: Record<string, { originalAgi: number }>
  refreshTurnOrderAtRoundEnd?: boolean
  attributeChangesByActor?: Record<string, { effectId: string; delta: number; remainingActions: number; keys?: (keyof BaseAttributes)[]; phase?: 'increase' | 'decrease' }>
  sacredRageByActor?: Record<string, { remainingActions: number }>
  resourcesByActor?: Record<string, { holyPower: number; mana: number }>
  outcome: 'won' | 'lost' | null
}

export interface ExplorationState {
  mapId: string
  x: number
  y: number
  direction: Direction
  questStatus: 'active' | 'completed'
}

export type PhysicalReward = EquipmentInstance | ItemStack | SkillInstance

export interface ExpeditionSession {
  expeditionId: string
  questId: QuestId
  seed: number
  rngState: number
  party: Actor[]
  exploration: ExplorationState
  combat: CombatState | null
  completedEncounterIds: string[]
  discoveredSecretIds: string[]
  discoveredTrapIds: string[]
  triggeredTrapIds: string[]
  claimedSecretRewardIds: string[]
  pendingLoot: PendingRewardEntry[]
  logs: string[]
}

export interface GameResult {
  outcome: 'victory' | 'defeat'
  gold: number
  experience: number
  settlement?: QuestSettlementSummary
  rewardEntries?: PendingRewardEntry[]
}

export interface GameState {
  screen: Screen
  profile: ProfileV2 | null
  session: ExpeditionSession | null
  result: GameResult | null
  pendingQuestEntry?: QuestId | null
}

export type GameCommand =
  | { type: 'OPEN_PROFILE_CREATE' }
  | { type: 'CREATE_PROFILE'; mainCharacterConfig: MainCharacterConfig; profileId: string; createdAt: number; rootSeed: number }
  | { type: 'LOAD_PROFILE' }
  | { type: 'REQUEST_QUEST_ENTRY'; questId: QuestId }
  | { type: 'CONTINUE_QUEST_ENTRY'; questId: QuestId }
  | { type: 'RETURN_TO_STORAGE' }
  | { type: 'EQUIP_ITEM'; characterId: string; equipmentInstanceId: string }
  | { type: 'UNEQUIP_ITEM'; characterId: string; slot: EquipmentSlot; equipmentInstanceId: string }
  | { type: 'MOVE_ITEM_TO_CHARACTER'; characterId: string; stackId: string; quantity: number }
  | { type: 'RETURN_ITEM_TO_STORAGE'; characterId: string; stackId: string; quantity: number }
  | { type: 'BUY_EQUIPMENT'; equipmentId: string }
  | { type: 'BUY_ITEM'; itemId: string; quantity: number }
  | { type: 'SELL_EQUIPMENT'; equipmentInstanceId: string }
  | { type: 'SELL_ITEM'; stackId: string; quantity: number }
  | { type: 'EQUIP_CUSTOM_SKILL'; characterId: string; skillInstanceId: string; slotIndex: number }
  | { type: 'UNEQUIP_CUSTOM_SKILL'; characterId: string; skillInstanceId: string; slotIndex: number }
  | { type: 'BUY_SKILL'; skillId: string }
  | { type: 'SELL_SKILL'; skillInstanceId: string }
  | { type: 'SET_REWARD_SELECTION'; selections: RewardSelection[] }
  | { type: 'CONFIRM_REWARD_SELECTION'; confirmDiscardUnselected: true }
  | { type: 'TURN_LEFT' }
  | { type: 'TURN_RIGHT' }
  | { type: 'MOVE_FORWARD' }
  | { type: 'MOVE_BACKWARD' }
  | { type: 'SELECT_SKILL'; skillId: string }
  | { type: 'CANCEL_SKILL_SELECTION' }
  | { type: 'SELECT_TARGET'; targetId: string }
  | { type: 'REROLL_DIE'; dieIndex: number }
  | { type: 'SKIP_REROLL' }
  | { type: 'USE_ITEM'; characterId: string; stackId: string; targetId?: string }
  | { type: 'RETURN_TO_HUB' }
  | { type: 'RESET_PROFILE' }

export type GameEventType =
  | 'SCREEN_CHANGED' | 'SESSION_STARTED' | 'PARTY_MOVED' | 'PARTY_TURNED'
  | 'MOVE_BLOCKED' | 'ENCOUNTER_STARTED' | 'TURN_STARTED' | 'DICE_ROLLED'
  | 'DIE_REROLLED' | 'DAMAGE_APPLIED' | 'ACTOR_DEFEATED' | 'ROUND_STARTED'
  | 'BATTLE_WON' | 'BATTLE_LOST' | 'QUEST_COMPLETED' | 'REWARD_GRANTED'
  | 'HEAL_APPLIED' | 'GROWTH_APPLIED' | 'UNLOCK_GRANTED' | 'REWARD_SELECTION_CHANGED'
  | 'STORAGE_CHANGED' | 'EQUIPMENT_CHANGED' | 'SHOP_TRANSACTION' | 'COMMAND_REJECTED'
  | 'ROLL_RESOLVED' | 'STATUS_APPLIED' | 'TAUNT_TARGET_RESOLVED'
  | 'COOLDOWN_STARTED' | 'COOLDOWN_TICKED' | 'SKILL_SELECTION_CANCELLED'
  | 'TRAP_DISCOVERED' | 'SECRET_ROOM_DISCOVERED' | 'TRAP_TRIGGERED'
  | 'ITEM_USED' | 'TURN_SKIPPED' | 'BUFF_APPLIED' | 'BUFF_EXPIRED'
  | 'STATUS_REMOVED'
  | 'QUEST_ENTRY_WARNING'

export interface GameEvent {
  type: GameEventType
  message: string
  actorId?: string
  targetId?: string
  enemyId?: string
  sourceActorId?: string
  skillId?: string
  originalDice?: number[]
  finalDice?: number[]
  fixedModifier?: number
  rollTotal?: number
  resultKind?: 'damage' | 'heal'
  resultValue?: number
  redirected?: boolean
  remainingCooldown?: number
  placementId?: string
  damage?: number
  itemId?: ItemId
}
