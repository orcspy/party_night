import { SKILLS } from './content'
import { randomIndex, rollDie } from './rng'
import type { Actor, CombatState, GameEvent, PendingRoll } from './types'

export interface CombatUpdate {
  combat: CombatState
  rngState: number
  events: GameEvent[]
}

export function calculateDamage(rollTotal: number, attack: number, defense: number): number {
  return Math.max(1, rollTotal + attack - defense)
}

export function evaluateOutcome(participants: Actor[]): 'won' | 'lost' | null {
  if (!participants.some((item) => item.side === 'enemy' && item.currentHp > 0)) return 'won'
  if (!participants.some((item) => item.side === 'party' && item.currentHp > 0)) return 'lost'
  return null
}

export function determineTurnOrder(participants: Actor[], rngState: number): { order: string[]; rngState: number } {
  let state = rngState
  const ties = new Map<string, number>()
  for (const actor of participants) {
    const next = rollDie(state, 0x100000)
    state = next.state
    ties.set(actor.id, next.value)
  }
  const order = sortTurnOrder(participants, ties)
  return { order, rngState: state }
}

export function sortTurnOrder(participants: Actor[], ties: ReadonlyMap<string, number>): string[] {
  return [...participants].sort((a, b) => b.agi - a.agi || (ties.get(b.id) ?? 0) - (ties.get(a.id) ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((actor) => actor.id)
}

export function startCombat(party: Actor[], enemies: Actor[], rngState: number): CombatUpdate {
  const participants = [...party, ...enemies].map((actor) => ({ ...actor, skillIds: [...actor.skillIds] }))
  const turn = determineTurnOrder(participants, rngState)
  const combat: CombatState = {
    battleId: 'ruins_goblins', round: 1, phase: 'awaiting_action', participants,
    turnOrder: turn.order, turnIndex: 0, selectedSkillId: null, pendingRoll: null,
    usedSkillIdsByActor: {}, outcome: null,
  }
  return advanceToPlayer(combat, turn.rngState, [{ type: 'ENCOUNTER_STARTED', message: '고블린 무리와 조우했다.' }])
}

export function currentActor(combat: CombatState): Actor | undefined {
  const id = combat.turnOrder[combat.turnIndex]
  return combat.participants.find((actor) => actor.id === id)
}

export function selectSkill(combat: CombatState, skillId: string, rngState: number): CombatUpdate {
  const actor = currentActor(combat)
  if (combat.phase !== 'awaiting_action' || !actor || actor.side !== 'party' || !actor.skillIds.includes(skillId)) return rejected(combat, rngState, '지금 사용할 수 없는 스킬이다.')
  const skill = SKILLS[skillId]
  if (!skill || (skill.oncePerBattle && (combat.usedSkillIdsByActor[actor.id] ?? []).includes(skillId))) return rejected(combat, rngState, '이미 사용한 스킬이다.')
  return { combat: { ...combat, phase: 'awaiting_target', selectedSkillId: skillId }, rngState, events: [] }
}

export function selectTarget(combat: CombatState, targetId: string, rngState: number): CombatUpdate {
  const actor = currentActor(combat)
  const target = combat.participants.find((item) => item.id === targetId)
  const skillId = combat.selectedSkillId
  if (combat.phase !== 'awaiting_target' || !actor || actor.side !== 'party' || !target || target.side !== 'enemy' || target.currentHp <= 0 || !skillId) return rejected(combat, rngState, '유효한 대상을 선택해야 한다.')
  return beginRoll(combat, actor, target, skillId, rngState)
}

function beginRoll(combat: CombatState, actor: Actor, target: Actor, skillId: string, rngState: number): CombatUpdate {
  const skill = SKILLS[skillId]
  let state = rngState
  const dice = Array.from({ length: skill.diceCount }, () => {
    const result = rollDie(state)
    state = result.state
    return { value: result.value, rerolled: false }
  })
  const pendingRoll: PendingRoll = { actorId: actor.id, targetId: target.id, skillId, dice, originalDice: dice.map((die) => die.value), fixedModifier: skill.fixedModifier, rerollsRemaining: skill.rerolls }
  const event: GameEvent = { type: 'DICE_ROLLED', message: `${actor.name}의 ${skill.name}: [${dice.map((die) => die.value).join(', ')}]${skill.fixedModifier ? ` +${skill.fixedModifier}` : ''}` }
  const rolled = { ...combat, phase: skill.rerolls ? 'awaiting_reroll' as const : 'resolving' as const, pendingRoll }
  return skill.rerolls ? { combat: rolled, rngState: state, events: [event] } : resolvePending(rolled, state, [event])
}

export function rerollDie(combat: CombatState, dieIndex: number, rngState: number): CombatUpdate {
  const pending = combat.pendingRoll
  if (combat.phase !== 'awaiting_reroll' || !pending || pending.rerollsRemaining <= 0 || !pending.dice[dieIndex] || pending.dice[dieIndex].rerolled) return rejected(combat, rngState, '이 다이스는 리롤할 수 없다.')
  const next = rollDie(rngState)
  const oldValue = pending.dice[dieIndex].value
  const dice = pending.dice.map((die, index) => index === dieIndex ? { value: next.value, rerolled: true } : die)
  const updated = { ...combat, phase: 'resolving' as const, pendingRoll: { ...pending, dice, rerollsRemaining: pending.rerollsRemaining - 1 } }
  return resolvePending(updated, next.state, [{ type: 'DIE_REROLLED', message: `다이스 ${dieIndex + 1}: ${oldValue} → ${next.value}` }])
}

export function skipReroll(combat: CombatState, rngState: number): CombatUpdate {
  if (combat.phase !== 'awaiting_reroll' || !combat.pendingRoll) return rejected(combat, rngState, '건너뛸 리롤이 없다.')
  return resolvePending({ ...combat, phase: 'resolving' }, rngState, [])
}

function resolvePending(combat: CombatState, rngState: number, events: GameEvent[]): CombatUpdate {
  const pending = combat.pendingRoll
  if (!pending) return rejected(combat, rngState, '확정할 굴림이 없다.')
  const actor = combat.participants.find((item) => item.id === pending.actorId)
  const target = combat.participants.find((item) => item.id === pending.targetId)
  if (!actor || !target || target.currentHp <= 0) return rejected(combat, rngState, '공격 대상이 유효하지 않다.')
  const rollTotal = pending.dice.reduce((sum, die) => sum + die.value, 0) + pending.fixedModifier
  const damage = calculateDamage(rollTotal, actor.atk, target.def)
  const hp = Math.max(0, target.currentHp - damage)
  const participants = combat.participants.map((item) => item.id === target.id ? { ...item, currentHp: hp } : item)
  const used = SKILLS[pending.skillId].oncePerBattle
    ? { ...combat.usedSkillIdsByActor, [actor.id]: [...(combat.usedSkillIdsByActor[actor.id] ?? []), pending.skillId] }
    : combat.usedSkillIdsByActor
  const skill = SKILLS[pending.skillId]
  const diceText = pending.originalDice.join(', ')
  const finalText = pending.dice.map((die) => die.value).join(', ')
  events.push({ type: 'DAMAGE_APPLIED', message: `${actor.name}의 ${skill.name} [${diceText}]${diceText !== finalText ? ` → [${finalText}]` : ''} +${pending.fixedModifier} / ATK ${actor.atk} - DEF ${target.def}: ${damage} 피해` })
  if (hp === 0) events.push({ type: 'ACTOR_DEFEATED', message: `${target.name}이(가) 쓰러졌다.` })
  let next: CombatState = { ...combat, participants, usedSkillIdsByActor: used, pendingRoll: null, selectedSkillId: null }
  const outcome = evaluateOutcome(participants)
  if (outcome === 'won') return { combat: { ...next, phase: 'ended', outcome }, rngState, events: [...events, { type: 'BATTLE_WON', message: '전투에서 승리했다.' }] }
  if (outcome === 'lost') return { combat: { ...next, phase: 'ended', outcome }, rngState, events: [...events, { type: 'BATTLE_LOST', message: '파티가 전멸했다.' }] }
  next = stepTurn(next, events)
  return advanceToPlayer(next, rngState, events)
}

function stepTurn(combat: CombatState, events: GameEvent[]): CombatState {
  let index = combat.turnIndex + 1
  let round = combat.round
  if (index >= combat.turnOrder.length) {
    index = 0
    round += 1
    events.push({ type: 'ROUND_STARTED', message: `라운드 ${round}` })
  }
  return { ...combat, turnIndex: index, round, phase: 'awaiting_action' }
}

export function advanceToPlayer(combat: CombatState, rngState: number, events: GameEvent[] = []): CombatUpdate {
  let next = combat
  let state = rngState
  while (next.phase !== 'ended') {
    const actor = currentActor(next)
    if (!actor || actor.currentHp <= 0) {
      next = stepTurn(next, events)
      continue
    }
    if (actor.side === 'party') {
      events.push({ type: 'TURN_STARTED', message: `${actor.name}의 차례` })
      return { combat: next, rngState: state, events }
    }
    const targets = next.participants.filter((item) => item.side === 'party' && item.currentHp > 0)
    const chosen = randomIndex(state, targets.length)
    state = chosen.state
    const update = beginRoll({ ...next, selectedSkillId: 'basic_attack', phase: 'awaiting_target' }, actor, targets[chosen.value], 'basic_attack', state)
    next = update.combat
    state = update.rngState
    events.push(...update.events)
    if (next.phase === 'ended') return { combat: next, rngState: state, events }
    // beginRoll resolves enemy attacks and recursively advances; return its final player turn.
    return { combat: next, rngState: state, events }
  }
  return { combat: next, rngState: state, events }
}

function rejected(combat: CombatState, rngState: number, message: string): CombatUpdate {
  return { combat, rngState, events: [{ type: 'COMMAND_REJECTED', message }] }
}
