import { CLASS_DATA, deriveCombatStats, ITEM_DATA, SKILLS } from './content'
import { randomIndex, rollDie } from './rng'
import type { Actor, CombatState, GameEvent, ItemId, PendingRoll } from './types'

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

function statusList(combat: CombatState, actorId: string, status: 'bleed' | 'neurotoxin' | 'paralysis' | 'sleep' | 'attribute_decrease', add: boolean) {
  const current = combat.removableStatusesByActor?.[actorId] ?? []
  const statuses = add ? (current.includes(status) ? current : [...current, status]) : current.filter((item) => item !== status)
  return { ...(combat.removableStatusesByActor ?? {}), [actorId]: statuses }
}

function stableOrderByCurrentAgi(combat: CombatState, actorIds: string[]): string[] {
  const actors = new Map(combat.participants.map((actor) => [actor.id, actor]))
  const previousIndex = new Map(actorIds.map((actorId, index) => [actorId, index]))
  return [...actorIds].sort((leftId, rightId) => {
    const left = actors.get(leftId)
    const right = actors.get(rightId)
    return (right?.agi ?? 0) - (left?.agi ?? 0) || previousIndex.get(leftId)! - previousIndex.get(rightId)!
  })
}

function reorderAfterNeurotoxinChange(combat: CombatState): CombatState {
  const prefix = combat.turnOrder.slice(0, combat.turnIndex + 1)
  const suffix = stableOrderByCurrentAgi(combat, combat.turnOrder.slice(combat.turnIndex + 1))
  return { ...combat, turnOrder: [...prefix, ...suffix], refreshTurnOrderAtRoundEnd: true }
}

function applyStatus(combat: CombatState, target: Actor, status: 'stun' | 'bleed' | 'paralysis' | 'neurotoxin' | 'sleep', source: Actor, skillId: string, events: GameEvent[]): CombatState {
  events.push({ type: 'STATUS_APPLIED', message: `${target.name}에게 ${status === 'stun' ? '기절' : status === 'bleed' ? '출혈' : status === 'paralysis' ? '마비' : status === 'neurotoxin' ? '신경독' : '수면'}을(를) 적용했다.`, actorId: source.id, targetId: target.id, skillId })
  if (status === 'stun') return { ...combat, stunnedActionsByActor: { ...combat.stunnedActionsByActor, [target.id]: (combat.stunnedActionsByActor[target.id] ?? 0) + 1 } }
  if (status === 'bleed') return { ...combat, bleedStacksByActor: { ...(combat.bleedStacksByActor ?? {}), [target.id]: Math.min(5, (combat.bleedStacksByActor?.[target.id] ?? 0) + 1) }, removableStatusesByActor: statusList(combat, target.id, 'bleed', true) }
  if (status === 'paralysis') return { ...combat, paralyzedActionsByActor: { ...(combat.paralyzedActionsByActor ?? {}), [target.id]: (combat.paralyzedActionsByActor?.[target.id] ?? 0) + 1 }, removableStatusesByActor: statusList(combat, target.id, 'paralysis', true) }
  if (status === 'sleep') return { ...combat, sleepingByActor: { ...(combat.sleepingByActor ?? {}), [target.id]: true }, removableStatusesByActor: statusList(combat, target.id, 'sleep', true) }
  const existing = combat.neurotoxinsByActor?.[target.id]
  const changed = existing ? target : { ...target, agi: Math.max(1, Math.floor(target.agi * 0.5)) }
  const poisoned = applyStatus({ ...combat, participants: combat.participants.map((item) => item.id === target.id ? changed : item) }, changed, 'bleed', source, skillId, events)
  const applied = { ...poisoned, neurotoxinsByActor: { ...(combat.neurotoxinsByActor ?? {}), [target.id]: existing ?? { originalAgi: target.agi } }, removableStatusesByActor: statusList(poisoned, target.id, 'neurotoxin', true) }
  return existing ? applied : reorderAfterNeurotoxinChange(applied)
}

function removeStatus(combat: CombatState, actorId: string, status: 'bleed' | 'neurotoxin' | 'paralysis' | 'sleep' | 'attribute_decrease', events: GameEvent[]): CombatState {
  const actor = combat.participants.find((item) => item.id === actorId)
  if (status === 'bleed') {
    const bleedStacksByActor = { ...(combat.bleedStacksByActor ?? {}) }; delete bleedStacksByActor[actorId]
    return { ...combat, bleedStacksByActor, removableStatusesByActor: statusList(combat, actorId, status, false) }
  }
  if (status === 'neurotoxin') {
    const original = combat.neurotoxinsByActor?.[actorId]?.originalAgi
    const neurotoxinsByActor = { ...(combat.neurotoxinsByActor ?? {}) }; delete neurotoxinsByActor[actorId]
    const restored = { ...combat, participants: original && actor ? combat.participants.map((item) => item.id === actorId ? { ...item, agi: original } : item) : combat.participants, neurotoxinsByActor, removableStatusesByActor: statusList(combat, actorId, status, false) }
    return original && actor ? reorderAfterNeurotoxinChange(restored) : restored
  }
  if (status === 'paralysis') {
    const paralyzedActionsByActor = { ...(combat.paralyzedActionsByActor ?? {}) }; delete paralyzedActionsByActor[actorId]
    return { ...combat, paralyzedActionsByActor, removableStatusesByActor: statusList(combat, actorId, status, false) }
  }
  if (status === 'sleep') {
    const sleepingByActor = { ...(combat.sleepingByActor ?? {}) }; delete sleepingByActor[actorId]
    return { ...combat, sleepingByActor, removableStatusesByActor: statusList(combat, actorId, status, false) }
  }
  const change = combat.attributeChangesByActor?.[actorId]
  const attributeChangesByActor = { ...(combat.attributeChangesByActor ?? {}) }; delete attributeChangesByActor[actorId]
  const restored = actor && change ? applyAttributeKeys(actor, change.keys ?? ['str', 'dex', 'int', 'con', 'agi', 'luck'], -change.delta) : actor
  if (restored) events.push({ type: 'BUFF_EXPIRED', message: `${restored.name}의 능력 변화가 제거됐다.`, actorId })
  return { ...combat, participants: restored ? combat.participants.map((item) => item.id === actorId ? restored : item) : combat.participants, attributeChangesByActor, removableStatusesByActor: statusList(combat, actorId, status, false) }
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

export function startCombat(party: Actor[], enemies: Actor[], rngState: number, battleId = 'ruins_goblins'): CombatUpdate {
  const participants = [...party, ...enemies].map((actor) => ({ ...actor, skillIds: [...actor.skillIds] }))
  const turn = determineTurnOrder(participants, rngState)
  const combat: CombatState = {
    battleId, round: 1, phase: 'awaiting_action', participants,
    turnOrder: turn.order, turnIndex: 0, selectedSkillId: null, pendingRoll: null,
    usedSkillIdsByActor: {}, cooldownsByActor: {}, tauntsByEnemy: {}, stunnedActionsByActor: {}, itemBuffsByActor: {}, removableStatusesByActor: {},
    bleedStacksByActor: {}, paralyzedActionsByActor: {}, sleepingByActor: {}, exposedByActor: {}, neurotoxinsByActor: {}, attributeChangesByActor: {}, sacredRageByActor: {}, resourcesByActor: {}, outcome: null,
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
  if (!skill || skill.activation !== 'active') return rejected(combat, rngState, '전투 명령으로 사용할 수 없는 스킬이다.')
  const availability = getSkillAvailability(combat, actor.id, skillId)
  if (!availability.available) return rejected(combat, rngState, availability.reason)
  if (skill.resolution === 'taunt') return resolveTaunt(combat, actor, skillId, rngState)
  if (skill.targetMode === 'all_enemies') {
    const target = combat.participants.find((item) => item.side === 'enemy' && item.currentHp > 0)
    return target ? beginRoll(combat, actor, target, skillId, rngState) : rejected(combat, rngState, '유효한 대상이 없다.')
  }
  return { combat: { ...combat, phase: 'awaiting_target', selectedSkillId: skillId }, rngState, events: [] }
}

export function cancelSkillSelection(combat: CombatState, rngState: number): CombatUpdate {
  const actor = currentActor(combat)
  if (combat.phase !== 'awaiting_target' || !actor || actor.side !== 'party') return rejected(combat, rngState, '취소할 대상 선택이 없다.')
  return {
    combat: { ...combat, phase: 'awaiting_action', selectedSkillId: null },
    rngState,
    events: [{ type: 'SKILL_SELECTION_CANCELLED', message: '스킬 선택으로 돌아갔다.', actorId: actor.id }],
  }
}

export function getSkillAvailability(combat: CombatState, actorId: string, skillId: string): { available: boolean; reason: string; remainingCooldown: number } {
  const skill = SKILLS[skillId]
  if (!skill || skill.activation !== 'active') return { available: false, reason: '전투 명령으로 사용할 수 없는 스킬이다.', remainingCooldown: 0 }
  const remainingCooldown = combat.cooldownsByActor[actorId]?.[skillId] ?? 0
  if (remainingCooldown > 0) return { available: false, reason: `쿨다운이 ${remainingCooldown}라운드 남았다.`, remainingCooldown }
  if (skill.useLimit.type === 'once_per_battle' && (combat.usedSkillIdsByActor[actorId] ?? []).includes(skillId)) {
    return { available: false, reason: '이미 사용한 스킬이다.', remainingCooldown: 0 }
  }
  return { available: true, reason: '', remainingCooldown: 0 }
}

export function selectTarget(combat: CombatState, targetId: string, rngState: number): CombatUpdate {
  const actor = currentActor(combat)
  const target = combat.participants.find((item) => item.id === targetId)
  const skillId = combat.selectedSkillId
  const skill = skillId ? SKILLS[skillId] : undefined
  const validSide = skill?.targetMode === 'single_ally' ? target?.side === 'party' : skill?.targetMode === 'self' ? target?.id === actor?.id : skill?.targetMode === 'single_enemy' && target?.side === 'enemy'
  if (combat.phase !== 'awaiting_target' || !actor || actor.side !== 'party' || !target || !validSide || target.currentHp <= 0 || !skillId || (skillId === 'first_aid' && target.id !== actor.id)) return rejected(combat, rngState, '유효한 대상을 선택해야 한다.')
  if (skillId === 'wound_break' && (combat.bleedStacksByActor?.[target.id] ?? 0) <= 0) return rejected(combat, rngState, '출혈 중인 대상에게만 사용할 수 있다.')
  if (skillId === 'head_shot' && !combat.exposedByActor?.[target.id]) return rejected(combat, rngState, '약점이 노출된 대상에게만 사용할 수 있다.')
  if (skillId === 'bless' && combat.attributeChangesByActor?.[target.id]?.effectId === 'bless') return rejected(combat, rngState, '같은 능력 변화가 이미 적용 중이다.')
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
  const skill = SKILLS[pending.skillId]
  const resources = combat.resourcesByActor?.[actor.id] ?? { holyPower: 0, mana: 0 }
  const holyBonus = actor.skillIds.includes('celestial_shroud') ? resources.holyPower * 2 : 0
  let participants = combat.participants
  let nextRngState = rngState
  let damage = 0
  let healing = skill.resolution === 'heal' ? Math.max(1, rollTotal + (pending.skillId === 'heal' ? holyBonus : 0)) : 0
  let hp = target.currentHp
  const directDamageFor = (victim: Actor) => {
    let value = calculateDamage(rollTotal + (pending.skillId === 'fire_ball' ? resources.mana * 5 : 0), actor.atk, victim.def)
    const magical = ['holy_strike', 'smite', 'arcane_bolt', 'lightning_bolt', 'fire_ball'].includes(pending.skillId)
    if (actor.skillIds.includes(magical ? 'spell_boost' : 'str_reinforcement')) value += 1
    if (actor.skillIds.includes('goblin_killer') && (victim.contentId.startsWith('goblin_') || victim.contentId === 'hobgoblin_boss')) value += 3
    if (actor.skillIds.includes('kobold_killer') && victim.contentId === 'kobold_skirmisher') value += 3
    if (actor.skillIds.includes('bone_crusher') && victim.contentId.startsWith('skeleton_')) value += victim.isBoss ? 1 : 3
    if (actor.skillIds.includes('cutlery_expert') && actor.weaponFamily && ['dagger', 'sword'].includes(actor.weaponFamily)) value += 1
    if (actor.skillIds.includes('club_expert') && actor.weaponFamily && ['mace', 'staff', 'rod'].includes(actor.weaponFamily)) value += 1
    if (actor.skillIds.includes('breathing_control') && ['aimed_shot', 'head_shot'].includes(pending.skillId)) value += 2
    value += combat.exposedByActor?.[victim.id]?.bonusDamage ?? 0
    if (pending.skillId === 'wound_break') value = Math.floor(value * (1 + 0.5 * (combat.bleedStacksByActor?.[victim.id] ?? 0)))
    if (['holy_strike', 'smite'].includes(pending.skillId) && victim.isUndead) value *= 2
    if (pending.skillId === 'smite') value += holyBonus
    if (combat.sacredRageByActor?.[actor.id]) value *= victim.isUndead ? 3 : 2
    const protectedParty = victim.side === 'party' && combat.participants.some((item) => item.side === 'party' && item.currentHp > 0 && item.skillIds.includes('protection_pledge'))
    return protectedParty ? Math.max(1, value - 1) : value
  }
  if (skill.resolution === 'damage' && skill.targetMode === 'all_enemies') {
    const victimSide = actor.side === 'party' ? 'enemy' : 'party'
    for (const victim of participants.filter((item) => item.side === victimSide && item.currentHp > 0)) {
      const value = directDamageFor(victim)
      const victimHp = Math.max(0, victim.currentHp - value)
      participants = participants.map((item) => item.id === victim.id ? { ...item, currentHp: victimHp } : item)
      events.push({ type: 'DAMAGE_APPLIED', message: `${actor.name}의 ${skill.name}: ${victim.name}에게 ${value} 피해`, actorId: actor.id, targetId: victim.id, skillId: skill.id, damage: value })
      if (victimHp === 0) events.push({ type: 'ACTOR_DEFEATED', message: `${victim.name}이(가) 쓰러졌다.`, actorId: actor.id, targetId: victim.id, skillId: skill.id })
    }
    damage = directDamageFor(target)
    hp = participants.find((item) => item.id === target.id)!.currentHp
  } else if (skill.resolution === 'damage') {
    damage = directDamageFor(target)
    hp = Math.max(0, target.currentHp - damage)
    participants = participants.map((item) => item.id === target.id ? { ...item, currentHp: hp } : item)
  } else if (skill.resolution === 'heal') {
    hp = Math.min(target.maxHp, target.currentHp + healing)
    healing = hp - target.currentHp
    participants = participants.map((item) => item.id === target.id ? { ...item, currentHp: hp } : item)
    if (pending.skillId === 'sacrifice') {
      const sacrificeCost = Math.floor(healing / 2)
      participants = participants.map((item) => item.id === actor.id ? { ...item, currentHp: Math.max(0, item.currentHp - sacrificeCost) } : item)
    }
  } else if (pending.skillId === 'ability_reinforcement') {
    const changed = applyAttributeKeys(actor, ['str', 'dex', 'int', 'con', 'agi', 'luck'], 5)
    participants = participants.map((item) => item.id === actor.id ? changed : item)
  } else if (pending.skillId === 'bless') {
    const changed = applyAttributeKeys(target, ['str', 'dex', 'int'], 2)
    participants = participants.map((item) => item.id === target.id ? changed : item)
  }
  if (pending.skillId === 'drain_touch') {
    const actualDamage = target.currentHp - hp
    const healingAmount = Math.floor(actualDamage / 2)
    const currentActor = participants.find((item) => item.id === actor.id) ?? actor
    const healedHp = Math.min(currentActor.maxHp, currentActor.currentHp + healingAmount)
    const actualHealing = healedHp - currentActor.currentHp
    participants = participants.map((item) => item.id === actor.id ? { ...item, currentHp: healedHp } : item)
    events.push({ type: 'HEAL_APPLIED', message: `${actor.name}이(가) HP ${actualHealing} 회복`, actorId: actor.id, targetId: actor.id, skillId: pending.skillId, resultValue: actualHealing })
  }
  const diceText = pending.originalDice.join(', ')
  const finalText = pending.dice.map((die) => die.value).join(', ')
  const resultValue = skill.resolution === 'heal' ? healing : damage
  events.push({
    type: 'ROLL_RESOLVED', message: `${skill.name} 판정 ${rollTotal}`,
    actorId: actor.id, targetId: target.id, skillId: skill.id,
    originalDice: [...pending.originalDice], finalDice: pending.dice.map((die) => die.value),
    fixedModifier: pending.fixedModifier, rollTotal,
    resultKind: skill.resolution === 'heal' ? 'heal' : skill.resolution === 'damage' ? 'damage' : undefined,
    resultValue: skill.resolution === 'heal' || skill.resolution === 'damage' ? resultValue : undefined,
  })
  if (skill.resolution === 'heal') {
    events.push({ type: 'HEAL_APPLIED', message: `${actor.name}의 ${skill.name}: ${target.name} HP ${healing} 회복` })
  } else if (skill.resolution === 'damage' && skill.targetMode !== 'all_enemies') {
    events.push({ type: 'DAMAGE_APPLIED', message: `${actor.name}의 ${skill.name} [${diceText}]${diceText !== finalText ? ` → [${finalText}]` : ''} +${pending.fixedModifier} / ATK ${actor.atk} - DEF ${target.def}: ${damage} 피해` })
    if (hp === 0) events.push({ type: 'ACTOR_DEFEATED', message: `${target.name}이(가) 쓰러졌다.` })
  }
  if (pending.skillId === 'arcane_bolt') {
    const overkill = Math.max(0, damage - target.currentHp)
    const candidates = participants.filter((item) => item.side === 'enemy' && item.id !== target.id && item.currentHp > 0)
    if (overkill > 0 && candidates.length > 0) {
      const selected = randomIndex(nextRngState, candidates.length)
      nextRngState = selected.state
      const transferredTarget = candidates[selected.value]
      const transferredHp = Math.max(0, transferredTarget.currentHp - overkill)
      participants = participants.map((item) => item.id === transferredTarget.id ? { ...item, currentHp: transferredHp } : item)
      events.push({ type: 'DAMAGE_APPLIED', message: `${actor.name}의 비전 화살 초과 피해: ${transferredTarget.name}에게 ${overkill} 피해`, actorId: actor.id, targetId: transferredTarget.id, skillId: pending.skillId, damage: overkill })
      if (transferredHp === 0) events.push({ type: 'ACTOR_DEFEATED', message: `${transferredTarget.name}이(가) 초과 피해로 쓰러졌다.`, targetId: transferredTarget.id, actorId: actor.id, skillId: pending.skillId })
    }
  }
  let next: CombatState = { ...combat, participants, pendingRoll: null, selectedSkillId: null }
  if (skill.resolution === 'damage') {
    const damagedTargets = skill.targetMode === 'all_enemies' ? next.participants.filter((item) => item.side !== actor.side) : [next.participants.find((item) => item.id === target.id) ?? target]
    for (const damagedTarget of damagedTargets) if (next.sleepingByActor?.[damagedTarget.id] && damagedTarget.currentHp < (combat.participants.find((item) => item.id === damagedTarget.id)?.currentHp ?? damagedTarget.currentHp)) next = removeStatus(next, damagedTarget.id, 'sleep', events)
  }
  if (pending.skillId === 'wound_break') next = removeStatus(next, target.id, 'bleed', events)
  if (pending.skillId === 'find_leak') next = { ...next, exposedByActor: { ...(next.exposedByActor ?? {}), [target.id]: { bonusDamage: Math.max(1, rollTotal), sourceActorId: actor.id, sourceActionsRemaining: 2, appliedRound: combat.round } } }
  if (pending.skillId === 'ability_reinforcement') next = { ...next, attributeChangesByActor: { ...(next.attributeChangesByActor ?? {}), [actor.id]: { effectId: pending.skillId, delta: 5, remainingActions: 4, phase: 'increase' } } }
  if (pending.skillId === 'bless') next = { ...next, attributeChangesByActor: { ...(next.attributeChangesByActor ?? {}), [target.id]: { effectId: pending.skillId, delta: 2, remainingActions: target.id === actor.id ? 4 : 3, keys: ['str', 'dex', 'int'] } } }
  if (pending.skillId === 'sacred_rage') next = { ...next, sacredRageByActor: { ...(next.sacredRageByActor ?? {}), [actor.id]: { remainingActions: 4 } } }
  const chanceBySkill: Record<string, { percent: number; status: 'stun' | 'bleed' | 'paralysis' | 'neurotoxin' | 'sleep' }> = {
    power_strike: { percent: 50, status: 'stun' }, quick_stab: { percent: 100, status: 'bleed' }, ogre_smash: { percent: 25, status: 'stun' },
    rending_bite: { percent: 50, status: 'bleed' }, minotaur_gore: { percent: 40, status: 'stun' }, lightning_bolt: { percent: 100, status: 'paralysis' },
    paralyzing_claw: { percent: 50, status: 'paralysis' }, neurotoxin: { percent: 100, status: 'neurotoxin' }, sleep: { percent: 50, status: 'sleep' },
    crushing_blow: { percent: 40, status: 'stun' },
  }
  const chance = chanceBySkill[pending.skillId]
  if (chance && hp > 0) {
    const roll = randomIndex(nextRngState, 100); nextRngState = roll.state
    const bossAdjusted = target.isBoss ? Math.floor(chance.percent / 2) : chance.percent
    const currentTarget = next.participants.find((item) => item.id === target.id) ?? target
    if (roll.value < bossAdjusted) next = applyStatus(next, currentTarget, chance.status, actor, pending.skillId, events)
  }
  if (['heal', 'smite', 'arcane_bolt', 'lightning_bolt', 'sleep', 'bless'].includes(pending.skillId)) {
    const gainsHoly = ['heal', 'smite', 'bless'].includes(pending.skillId)
    const current = next.resourcesByActor?.[actor.id] ?? { holyPower: 0, mana: 0 }
    next = { ...next, resourcesByActor: { ...(next.resourcesByActor ?? {}), [actor.id]: { holyPower: gainsHoly ? Math.min(5, current.holyPower + 1) : current.holyPower, mana: gainsHoly ? current.mana : Math.min(5, current.mana + 1) } } }
  }
  next = applyUseLimit(next, actor.id, pending.skillId, events)
  const outcome = evaluateOutcome(participants)
  if (outcome === 'won') return { combat: { ...next, phase: 'ended', outcome }, rngState: nextRngState, events: [...events, { type: 'BATTLE_WON', message: '전투에서 승리했다.' }] }
  if (outcome === 'lost') return { combat: { ...next, phase: 'ended', outcome }, rngState: nextRngState, events: [...events, { type: 'BATTLE_LOST', message: '파티가 전멸했다.' }] }
  next = stepTurn(next, events)
  return advanceToPlayer(next, nextRngState, events)
}

function stepTurn(combat: CombatState, events: GameEvent[]): CombatState {
  combat = finishActionStatuses(combat, combat.turnOrder[combat.turnIndex], events)
  let index = combat.turnIndex + 1
  let round = combat.round
  if (index >= combat.turnOrder.length) {
    index = 0
    round += 1
    const cooldownsByActor: CombatState['cooldownsByActor'] = {}
    for (const [actorId, cooldowns] of Object.entries(combat.cooldownsByActor)) {
      const remaining: Record<string, number> = {}
      for (const [skillId, value] of Object.entries(cooldowns)) {
        const nextValue = Math.max(0, value - 1)
        events.push({ type: 'COOLDOWN_TICKED', message: `${SKILLS[skillId]?.name ?? '스킬'} 쿨다운 ${nextValue}`, actorId, skillId, remainingCooldown: nextValue })
        if (nextValue > 0) remaining[skillId] = nextValue
      }
      if (Object.keys(remaining).length > 0) cooldownsByActor[actorId] = remaining
    }
    let participants = combat.participants
    const itemBuffsByActor: CombatState['itemBuffsByActor'] = {}
    for (const [actorId, buffs] of Object.entries(combat.itemBuffsByActor)) {
      const remaining: NonNullable<CombatState['itemBuffsByActor'][string]> = {}
      let actor = participants.find((item) => item.id === actorId)
      if (buffs.might) {
        const value = buffs.might.remainingRounds - 1
        if (value > 0) remaining.might = { remainingRounds: value }
        else if (actor) { actor = applyAttributeDelta(actor, 'str', -2); events.push({ type: 'BUFF_EXPIRED', message: `${actor.name}의 근력 강장제 효과가 끝났다.`, actorId, itemId: 'might_tonic' }) }
      }
      if (buffs.haste) {
        const value = buffs.haste.remainingRounds - 1
        if (value > 0) remaining.haste = { remainingRounds: value }
        else if (actor) { actor = applyAttributeDelta(actor, 'agi', -2); events.push({ type: 'BUFF_EXPIRED', message: `${actor.name}의 민첩 강장제 효과가 끝났다.`, actorId, itemId: 'haste_tonic' }) }
      }
      if (actor) participants = participants.map((item) => item.id === actorId ? actor! : item)
      if (remaining.might || remaining.haste) itemBuffsByActor[actorId] = remaining
    }
    let exposedByActor = combat.exposedByActor
    for (const [targetId, exposed] of Object.entries(combat.exposedByActor ?? {})) {
      const source = participants.find((actor) => actor.id === exposed.sourceActorId)
      if (source && source.currentHp <= 0) {
        exposedByActor = { ...(exposedByActor ?? {}) }
        delete exposedByActor[targetId]
        events.push({ type: 'STATUS_REMOVED', message: `${source.name}이(가) 쓰러져 약점 노출이 사라졌다.`, actorId: source.id, targetId })
      }
    }
    const turnOrder = combat.refreshTurnOrderAtRoundEnd ? stableOrderByCurrentAgi({ ...combat, participants }, combat.turnOrder) : combat.turnOrder
    combat = { ...combat, cooldownsByActor, itemBuffsByActor, participants, exposedByActor, turnOrder, refreshTurnOrderAtRoundEnd: false }
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
    const bleed = next.bleedStacksByActor?.[actor.id] ?? 0
    if (bleed > 0) {
      const currentHp = Math.max(0, actor.currentHp - bleed)
      next = { ...next, participants: next.participants.map((item) => item.id === actor.id ? { ...item, currentHp } : item) }
      events.push({ type: 'DAMAGE_APPLIED', message: `${actor.name}이(가) 출혈 ${bleed} 피해를 받았다.`, targetId: actor.id, damage: bleed })
      if (currentHp === 0) events.push({ type: 'ACTOR_DEFEATED', message: `${actor.name}이(가) 출혈로 쓰러졌다.`, targetId: actor.id })
      const outcome = evaluateOutcome(next.participants)
      if (outcome) return { combat: { ...next, phase: 'ended', outcome }, rngState: state, events: [...events, { type: outcome === 'won' ? 'BATTLE_WON' : 'BATTLE_LOST', message: outcome === 'won' ? '전투에서 승리했다.' : '파티가 전멸했다.' }] }
      if (currentHp === 0) { next = stepTurn(next, events); continue }
    }
    const stunned = next.stunnedActionsByActor[actor.id] ?? 0
    if (stunned > 0) {
      const stunnedActionsByActor = { ...next.stunnedActionsByActor }
      if (stunned === 1) delete stunnedActionsByActor[actor.id]; else stunnedActionsByActor[actor.id] = stunned - 1
      events.push({ type: 'TURN_SKIPPED', message: `${actor.name}은(는) 기절해 행동하지 못했다.`, actorId: actor.id })
      next = stepTurn({ ...next, stunnedActionsByActor }, events)
      continue
    }
    const paralyzed = next.paralyzedActionsByActor?.[actor.id] ?? 0
    if (paralyzed > 0) {
      const paralyzedActionsByActor = { ...(next.paralyzedActionsByActor ?? {}) }
      if (paralyzed === 1) delete paralyzedActionsByActor[actor.id]; else paralyzedActionsByActor[actor.id] = paralyzed - 1
      next = { ...next, paralyzedActionsByActor, removableStatusesByActor: paralyzed === 1 ? statusList(next, actor.id, 'paralysis', false) : next.removableStatusesByActor }
      events.push({ type: 'TURN_SKIPPED', message: `${actor.name}은(는) 마비되어 행동하지 못했다.`, actorId: actor.id })
      next = stepTurn(next, events)
      continue
    }
    if (next.sleepingByActor?.[actor.id]) {
      events.push({ type: 'TURN_SKIPPED', message: `${actor.name}은(는) 잠들어 행동하지 못했다.`, actorId: actor.id })
      next = stepTurn(next, events)
      continue
    }
    if (actor.side === 'party') {
      events.push({ type: 'TURN_STARTED', message: `${actor.name}의 차례` })
      return { combat: next, rngState: state, events }
    }
    const targets = next.participants.filter((item) => item.side === 'party' && item.currentHp > 0)
    let target: Actor
    const taunt = next.tauntsByEnemy[actor.id]
    const source = taunt ? targets.find((item) => item.id === taunt.sourceActorId) : undefined
    if (taunt && source) {
      const redirect = randomIndex(state, 2)
      state = redirect.state
      const redirected = redirect.value === 0
      if (redirected) target = source
      else {
        const chosen = randomIndex(state, targets.length)
        state = chosen.state
        target = targets[chosen.value]
      }
      events.push({ type: 'TAUNT_TARGET_RESOLVED', message: redirected ? `${actor.name}이(가) 도발한 전사를 노린다.` : `${actor.name}이(가) 도발을 뿌리쳤다.`, enemyId: actor.id, sourceActorId: source.id, redirected })
      const { [actor.id]: _consumed, ...tauntsByEnemy } = next.tauntsByEnemy
      next = { ...next, tauntsByEnemy }
    } else {
      if (taunt) {
        const { [actor.id]: _expired, ...tauntsByEnemy } = next.tauntsByEnemy
        next = { ...next, tauntsByEnemy }
      }
      const chosen = randomIndex(state, targets.length)
      state = chosen.state
      target = targets[chosen.value]
    }
    const skillId = actor.skillIds.find((id) => SKILLS[id]) ?? 'basic_attack'
    const update = beginRoll({ ...next, selectedSkillId: skillId, phase: 'awaiting_target' }, actor, target, skillId, state)
    next = update.combat
    state = update.rngState
    events.push(...update.events)
    if (next.phase === 'ended') return { combat: next, rngState: state, events }
    // beginRoll resolves enemy attacks and recursively advances; return its final player turn.
    return { combat: next, rngState: state, events }
  }
  return { combat: next, rngState: state, events }
}

function applyAttributeKeys(actor: Actor, keys: (keyof NonNullable<Actor['attributes']>)[], delta: number): Actor {
  if (!actor.attributes || !actor.classId) return keys.includes('agi') ? { ...actor, agi: Math.max(1, actor.agi + delta) } : { ...actor, atk: Math.max(1, actor.atk + Math.sign(delta)) }
  const attributes = { ...actor.attributes }
  for (const key of keys) attributes[key] = Math.max(1, attributes[key] + delta)
  const stats = deriveCombatStats(attributes, CLASS_DATA[actor.classId].derivation)
  const hpDelta = stats.maxHp - actor.maxHp
  return { ...actor, attributes, maxHp: stats.maxHp, currentHp: Math.min(stats.maxHp, Math.max(0, actor.currentHp + hpDelta)), atk: stats.atk, def: stats.def, agi: stats.agi }
}

function applyAttributeDelta(actor: Actor, key: 'str' | 'agi', delta: number): Actor {
  return applyAttributeKeys(actor, [key], delta)
}

function finishActionStatuses(combat: CombatState, actorId: string | undefined, events: GameEvent[]): CombatState {
  if (!actorId) return combat
  let next = combat
  const actorAtActionEnd = next.participants.find((item) => item.id === actorId)
  if (actorAtActionEnd?.currentHp && actorAtActionEnd.currentHp > 0) {
    let exposedByActor = next.exposedByActor
    for (const [targetId, exposed] of Object.entries(next.exposedByActor ?? {})) {
      if (exposed.sourceActorId !== actorId) continue
      exposedByActor = { ...(exposedByActor ?? {}) }
      if (exposed.sourceActionsRemaining <= 1) {
        delete exposedByActor[targetId]
        events.push({ type: 'STATUS_REMOVED', message: `${actorAtActionEnd.name}의 약점 노출이 끝났다.`, actorId, targetId })
      } else exposedByActor[targetId] = { ...exposed, sourceActionsRemaining: exposed.sourceActionsRemaining - 1 }
    }
    next = { ...next, exposedByActor }
  }
  const rage = next.sacredRageByActor?.[actorId]
  if (rage) {
    const sacredRageByActor = { ...(next.sacredRageByActor ?? {}) }
    if (rage.remainingActions <= 1) delete sacredRageByActor[actorId]; else sacredRageByActor[actorId] = { remainingActions: rage.remainingActions - 1 }
    next = { ...next, sacredRageByActor }
  }
  const change = next.attributeChangesByActor?.[actorId]
  const actor = next.participants.find((item) => item.id === actorId)
  if (change && actor) {
    if (change.remainingActions > 1) next = { ...next, attributeChangesByActor: { ...(next.attributeChangesByActor ?? {}), [actorId]: { ...change, remainingActions: change.remainingActions - 1 } } }
    else if (change.effectId === 'ability_reinforcement' && change.phase === 'increase') {
      const decreased = applyAttributeKeys(actor, ['str', 'dex', 'int', 'con', 'agi', 'luck'], -7)
      next = { ...next, participants: next.participants.map((item) => item.id === actorId ? decreased : item), attributeChangesByActor: { ...(next.attributeChangesByActor ?? {}), [actorId]: { effectId: change.effectId, delta: -2, remainingActions: 1, phase: 'decrease' } }, removableStatusesByActor: statusList(next, actorId, 'attribute_decrease', true) }
      events.push({ type: 'BUFF_APPLIED', message: `${actor.name}의 능력 강화 반동이 시작됐다.`, actorId })
    } else next = removeStatus(next, actorId, change.delta < 0 ? 'attribute_decrease' : 'attribute_decrease', events)
  }
  return next
}

export function useCombatItem(combat: CombatState, actorId: string, itemId: ItemId, targetId: string | undefined, rngState: number): CombatUpdate {
  const actor = currentActor(combat)
  const definition = ITEM_DATA[itemId]
  if (combat.phase !== 'awaiting_action' || !actor || actor.side !== 'party' || actor.id !== actorId || !definition.usableIn.includes('battle')) return rejected(combat, rngState, '지금 사용할 수 없는 아이템이다.')
  if (definition.effect === 'skill_cost' || definition.effect === 'survey') return rejected(combat, rngState, '전투에서 직접 사용할 수 없는 아이템이다.')
  const target = definition.targetMode === 'self' ? actor : combat.participants.find((item) => item.id === targetId)
  const validTarget = definition.targetMode === 'single_enemy' ? target?.side === 'enemy' : target?.side === 'party'
  if (!target || !validTarget || target.currentHp <= 0) return rejected(combat, rngState, '아이템 대상을 확인해야 한다.')
  const events: GameEvent[] = [{ type: 'ITEM_USED', message: `${actor.name}이(가) ${definition.name}을(를) 사용했다.`, actorId, targetId: target.id, itemId }]
  let next = combat
  if (definition.effect === 'heal_10' || definition.effect === 'heal_22') {
    if (target.currentHp >= target.maxHp) return rejected(combat, rngState, '대상의 HP가 이미 가득 찼다.')
    const amount = definition.effect === 'heal_10' ? 10 : 22
    const hp = Math.min(target.maxHp, target.currentHp + amount)
    next = { ...combat, participants: combat.participants.map((item) => item.id === target.id ? { ...item, currentHp: hp } : item) }
    events.push({ type: 'HEAL_APPLIED', message: `${target.name} HP ${hp - target.currentHp} 회복`, actorId, targetId: target.id, itemId, resultValue: hp - target.currentHp })
  } else if (definition.effect === 'damage_10') {
    const hp = Math.max(0, target.currentHp - 10)
    next = { ...combat, participants: combat.participants.map((item) => item.id === target.id ? { ...item, currentHp: hp } : item) }
    events.push({ type: 'DAMAGE_APPLIED', message: `${target.name}에게 방어 무시 10 피해`, actorId, targetId: target.id, itemId, damage: 10 })
    if (hp === 0) events.push({ type: 'ACTOR_DEFEATED', message: `${target.name}이(가) 쓰러졌다.`, targetId: target.id })
  } else if (definition.effect === 'buff_str' || definition.effect === 'buff_agi') {
    const buffKey = definition.effect === 'buff_str' ? 'might' : 'haste'
    if (combat.itemBuffsByActor[actor.id]?.[buffKey]) return rejected(combat, rngState, '같은 강장제 효과가 이미 적용 중이다.')
    const changed = applyAttributeDelta(actor, definition.effect === 'buff_str' ? 'str' : 'agi', 2)
    next = {
      ...combat,
      participants: combat.participants.map((item) => item.id === actor.id ? changed : item),
      itemBuffsByActor: { ...combat.itemBuffsByActor, [actor.id]: { ...(combat.itemBuffsByActor[actor.id] ?? {}), [buffKey]: { remainingRounds: 3 } } },
    }
    events.push({ type: 'BUFF_APPLIED', message: `${actor.name}의 ${definition.effect === 'buff_str' ? 'STR' : 'AGI'}가 3라운드 동안 2 증가했다.`, actorId, itemId })
    return { combat: next, rngState, events }
  } else if (definition.effect === 'remove_one') {
    const priority = ['bleed', 'neurotoxin', 'paralysis', 'sleep', 'attribute_decrease'] as const
    const statuses = combat.removableStatusesByActor?.[target.id] ?? []
    const removed = priority.find((status) => statuses.includes(status))
    if (!removed) return rejected(combat, rngState, '제거할 상태가 없다.')
    next = removeStatus(combat, target.id, removed, events)
    events.push({ type: 'STATUS_REMOVED', message: `${target.name}의 상태 이상을 치료했다.`, actorId, targetId: target.id, itemId })
  } else if (definition.effect === 'remove_all') {
    const statuses = combat.removableStatusesByActor?.[target.id] ?? []
    if (!(combat.stunnedActionsByActor[target.id] > 0) && statuses.length === 0) return rejected(combat, rngState, '제거할 상태가 없다.')
    const stunnedActionsByActor = { ...combat.stunnedActionsByActor }; delete stunnedActionsByActor[target.id]
    next = { ...combat, stunnedActionsByActor }
    for (const status of [...statuses]) next = removeStatus(next, target.id, status, events)
  } else {
    return rejected(combat, rngState, '제거할 상태가 없다.')
  }
  const outcome = evaluateOutcome(next.participants)
  if (outcome) return { combat: { ...next, phase: 'ended', outcome }, rngState, events: [...events, { type: outcome === 'won' ? 'BATTLE_WON' : 'BATTLE_LOST', message: outcome === 'won' ? '전투에서 승리했다.' : '파티가 전멸했다.' }] }
  next = stepTurn(next, events)
  return advanceToPlayer(next, rngState, events)
}

function applyUseLimit(combat: CombatState, actorId: string, skillId: string, events: GameEvent[]): CombatState {
  const skill = SKILLS[skillId]
  if (skill.useLimit.type === 'cooldown') {
    events.push({ type: 'COOLDOWN_STARTED', message: `${skill.name} 쿨다운 ${skill.useLimit.rounds}`, actorId, skillId, remainingCooldown: skill.useLimit.rounds })
    return {
      ...combat,
      cooldownsByActor: {
        ...combat.cooldownsByActor,
        [actorId]: { ...(combat.cooldownsByActor[actorId] ?? {}), [skillId]: skill.useLimit.rounds },
      },
    }
  }
  if (skill.useLimit.type === 'once_per_battle') {
    return { ...combat, usedSkillIdsByActor: { ...combat.usedSkillIdsByActor, [actorId]: [...(combat.usedSkillIdsByActor[actorId] ?? []), skillId] } }
  }
  return combat
}

function resolveTaunt(combat: CombatState, actor: Actor, skillId: string, rngState: number): CombatUpdate {
  const enemies = combat.participants.filter((item) => item.side === 'enemy' && item.currentHp > 0)
  const events: GameEvent[] = enemies.map((enemy) => ({
    type: 'STATUS_APPLIED', message: `${enemy.name}에게 도발을 적용했다.`,
    actorId: actor.id, targetId: enemy.id, skillId,
  }))
  let next: CombatState = {
    ...combat,
    phase: 'awaiting_action', selectedSkillId: null,
    tauntsByEnemy: Object.fromEntries([
      ...Object.entries(combat.tauntsByEnemy),
      ...enemies.map((enemy) => [enemy.id, { sourceActorId: actor.id, remainingAttacks: 1 }] as const),
    ]),
  }
  next = applyUseLimit(next, actor.id, skillId, events)
  next = stepTurn(next, events)
  return advanceToPlayer(next, rngState, events)
}

function rejected(combat: CombatState, rngState: number, message: string): CombatUpdate {
  return { combat, rngState, events: [{ type: 'COMMAND_REJECTED', message }] }
}
