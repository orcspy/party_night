import { CUSTOM_SKILL_ALLOWED_CLASSES, EQUIPMENT_DATA, getFinalAttributes, type CustomSkillId } from './content'
import type { EquipmentInstance, EquipmentSlot, ItemId, ItemStack, PersistentCharacter, ProfileV2 } from './types'

export type RuleResult<T> = { ok: true; value: T } | { ok: false; error: string }

export function usedStorageSlots(profile: ProfileV2): number {
  return profile.storage.equipmentInstances.length + profile.storage.itemStacks.length + profile.storage.skillInstances.length
}

export function getInventoryCapacity(character: PersistentCharacter): number {
  return 10 + Math.min(3, Math.floor(getFinalAttributes(character).str / 5))
}

function allOwnedIds(profile: ProfileV2): Set<string> {
  const ids = new Set<string>()
  for (const character of profile.characters) {
    for (const instance of Object.values(character.equipment)) if (instance) ids.add(instance.equipmentInstanceId)
    for (const stack of character.inventorySlots) ids.add(stack.stackId)
    for (const instance of character.customSkillSlots) if (instance) ids.add(instance.skillInstanceId)
  }
  for (const instance of profile.storage.equipmentInstances) ids.add(instance.equipmentInstanceId)
  for (const stack of profile.storage.itemStacks) ids.add(stack.stackId)
  for (const instance of profile.storage.skillInstances) ids.add(instance.skillInstanceId)
  return ids
}

export function allocateUniqueId(profile: ProfileV2, prefix: 'equipment' | 'item_stack' | 'skill'): { profile: ProfileV2; id: string } {
  const owned = allOwnedIds(profile)
  let sequence = profile.random.nextInstanceSequence
  let id = `${prefix}_${sequence}`
  while (owned.has(id)) {
    sequence += 1
    id = `${prefix}_${sequence}`
  }
  return { profile: { ...profile, random: { ...profile.random, nextInstanceSequence: sequence + 1 } }, id }
}

function mergeQuantity(profile: ProfileV2, target: ItemStack[], itemId: ItemId, quantity: number, reusableId?: string): { profile: ProfileV2; stacks: ItemStack[] } {
  let candidate = profile
  let remaining = quantity
  const stacks = target.map((stack) => ({ ...stack }))
  for (let index = 0; index < stacks.length && remaining > 0; index++) {
    const stack = stacks[index]
    if (stack.itemId !== itemId || stack.quantity >= 10) continue
    const added = Math.min(10 - stack.quantity, remaining)
    stacks[index] = { ...stack, quantity: stack.quantity + added }
    remaining -= added
  }
  let canReuse = Boolean(reusableId)
  while (remaining > 0) {
    const chunk = Math.min(10, remaining)
    let stackId: string
    if (canReuse && reusableId) {
      stackId = reusableId
      canReuse = false
    } else {
      const allocated = allocateUniqueId(candidate, 'item_stack')
      candidate = allocated.profile
      stackId = allocated.id
    }
    stacks.push({ stackId, itemId, quantity: chunk })
    remaining -= chunk
  }
  return { profile: candidate, stacks }
}

function replaceCharacter(profile: ProfileV2, character: PersistentCharacter): ProfileV2 {
  return {
    ...profile,
    characters: profile.characters.map((item) => item.characterId === character.characterId ? character : item) as ProfileV2['characters'],
  }
}

function validQuantity(quantity: number, maximum: number): boolean {
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= maximum
}

export function moveItemToCharacter(profile: ProfileV2, characterId: string, stackId: string, quantity: number): RuleResult<ProfileV2> {
  const source = profile.storage.itemStacks.find((stack) => stack.stackId === stackId)
  const character = profile.characters.find((item) => item.characterId === characterId)
  if (!source || !character || !validQuantity(quantity, source.quantity)) return { ok: false, error: '이동할 아이템과 수량을 확인해야 한다.' }

  const sourceRemainder = source.quantity - quantity
  let candidate: ProfileV2 = {
    ...profile,
    storage: {
      ...profile.storage,
      itemStacks: sourceRemainder > 0
        ? profile.storage.itemStacks.map((stack) => stack.stackId === stackId ? { ...stack, quantity: sourceRemainder } : stack)
        : profile.storage.itemStacks.filter((stack) => stack.stackId !== stackId),
    },
  }
  const merged = mergeQuantity(candidate, character.inventorySlots, source.itemId as ItemId, quantity, sourceRemainder === 0 ? source.stackId : undefined)
  candidate = merged.profile
  const updated = { ...character, inventorySlots: merged.stacks }
  if (updated.inventorySlots.length > getInventoryCapacity(updated)) return { ok: false, error: '개인 인벤토리 용량이 부족하다.' }
  return { ok: true, value: replaceCharacter(candidate, updated) }
}

export function returnItemToStorage(profile: ProfileV2, characterId: string, stackId: string, quantity: number): RuleResult<ProfileV2> {
  const character = profile.characters.find((item) => item.characterId === characterId)
  const source = character?.inventorySlots.find((stack) => stack.stackId === stackId)
  if (!character || !source || !validQuantity(quantity, source.quantity)) return { ok: false, error: '반환할 아이템과 수량을 확인해야 한다.' }

  const sourceRemainder = source.quantity - quantity
  const updatedCharacter = {
    ...character,
    inventorySlots: sourceRemainder > 0
      ? character.inventorySlots.map((stack) => stack.stackId === stackId ? { ...stack, quantity: sourceRemainder } : stack)
      : character.inventorySlots.filter((stack) => stack.stackId !== stackId),
  }
  let candidate = replaceCharacter(profile, updatedCharacter)
  const merged = mergeQuantity(candidate, candidate.storage.itemStacks, source.itemId as ItemId, quantity, sourceRemainder === 0 ? source.stackId : undefined)
  candidate = { ...merged.profile, storage: { ...merged.profile.storage, itemStacks: merged.stacks } }
  if (usedStorageSlots(candidate) > candidate.storage.capacity) return { ok: false, error: '공용 창고 용량이 부족하다.' }
  return { ok: true, value: candidate }
}

export function consumeCharacterItem(profile: ProfileV2, characterId: string, stackId: string, expectedItemId: ItemId): RuleResult<ProfileV2> {
  const character = profile.characters.find((item) => item.characterId === characterId)
  const stack = character?.inventorySlots.find((item) => item.stackId === stackId)
  if (!character || !stack || stack.itemId !== expectedItemId || stack.quantity < 1) return { ok: false, error: '사용할 아이템을 찾을 수 없다.' }
  const inventorySlots = stack.quantity === 1
    ? character.inventorySlots.filter((item) => item.stackId !== stackId)
    : character.inventorySlots.map((item) => item.stackId === stackId ? { ...item, quantity: item.quantity - 1 } : item)
  return { ok: true, value: replaceCharacter(profile, { ...character, inventorySlots }) }
}

export function equipEquipment(profile: ProfileV2, characterId: string, equipmentInstanceId: string): RuleResult<ProfileV2> {
  const instance = profile.storage.equipmentInstances.find((item) => item.equipmentInstanceId === equipmentInstanceId)
  const character = profile.characters.find((item) => item.characterId === characterId)
  const definition = instance ? EQUIPMENT_DATA[instance.equipmentId] : undefined
  if (!instance || !character || !definition) return { ok: false, error: '장착할 장비를 찾을 수 없다.' }
  if (!definition.allowedClasses.includes(character.classId)) return { ok: false, error: '해당 직업이 장착할 수 없는 장비다.' }
  if (definition.slot === 'offhand') {
    const weapon = character.equipment.weapon
    if (weapon && EQUIPMENT_DATA[weapon.equipmentId]?.twoHanded) return { ok: false, error: '양손 무기와 보조 장비를 함께 장착할 수 없다.' }
  }

  const returned: EquipmentInstance[] = []
  const equipment = { ...character.equipment }
  const current = equipment[definition.slot]
  if (current) returned.push(current)
  equipment[definition.slot] = instance
  if (definition.slot === 'weapon' && definition.twoHanded && equipment.offhand) {
    returned.push(equipment.offhand)
    equipment.offhand = null
  }
  let candidate: ProfileV2 = {
    ...profile,
    storage: {
      ...profile.storage,
      equipmentInstances: [...profile.storage.equipmentInstances.filter((item) => item.equipmentInstanceId !== equipmentInstanceId), ...returned],
    },
  }
  const updated = { ...character, equipment }
  if (updated.inventorySlots.length > getInventoryCapacity(updated)) return { ok: false, error: '장비 변경 후 개인 인벤토리 용량이 부족하다.' }
  candidate = replaceCharacter(candidate, updated)
  if (usedStorageSlots(candidate) > candidate.storage.capacity) return { ok: false, error: '교체 장비를 보관할 창고 공간이 부족하다.' }
  return { ok: true, value: candidate }
}

export function unequipEquipment(profile: ProfileV2, characterId: string, slot: EquipmentSlot, equipmentInstanceId: string): RuleResult<ProfileV2> {
  const character = profile.characters.find((item) => item.characterId === characterId)
  const instance = character?.equipment[slot]
  if (!character || !instance || instance.equipmentInstanceId !== equipmentInstanceId) return { ok: false, error: '해제할 장비를 찾을 수 없다.' }
  const updated = { ...character, equipment: { ...character.equipment, [slot]: null } }
  if (updated.inventorySlots.length > getInventoryCapacity(updated)) return { ok: false, error: '장비 해제 후 개인 인벤토리 용량이 부족하다.' }
  const candidate = replaceCharacter({
    ...profile,
    storage: { ...profile.storage, equipmentInstances: [...profile.storage.equipmentInstances, instance] },
  }, updated)
  if (usedStorageSlots(candidate) > candidate.storage.capacity) return { ok: false, error: '공용 창고 용량이 부족하다.' }
  return { ok: true, value: candidate }
}

export function addEquipmentToStorage(profile: ProfileV2, equipmentId: string): RuleResult<ProfileV2> {
  if (!EQUIPMENT_DATA[equipmentId]) return { ok: false, error: '판매하지 않는 장비다.' }
  const allocated = allocateUniqueId(profile, 'equipment')
  const candidate: ProfileV2 = {
    ...allocated.profile,
    storage: {
      ...allocated.profile.storage,
      equipmentInstances: [...allocated.profile.storage.equipmentInstances, { equipmentInstanceId: allocated.id, equipmentId }],
    },
  }
  return usedStorageSlots(candidate) <= candidate.storage.capacity ? { ok: true, value: candidate } : { ok: false, error: '공용 창고 용량이 부족하다.' }
}

export function addItemQuantityToStorage(profile: ProfileV2, itemId: ItemId, quantity: number): RuleResult<ProfileV2> {
  if (!validQuantity(quantity, 1000)) return { ok: false, error: '구매 수량을 확인해야 한다.' }
  const merged = mergeQuantity(profile, profile.storage.itemStacks, itemId, quantity)
  const candidate = { ...merged.profile, storage: { ...merged.profile.storage, itemStacks: merged.stacks } }
  return usedStorageSlots(candidate) <= candidate.storage.capacity ? { ok: true, value: candidate } : { ok: false, error: '공용 창고 용량이 부족하다.' }
}

export function equipCustomSkill(profile: ProfileV2, characterId: string, skillInstanceId: string, slotIndex: number): RuleResult<ProfileV2> {
  const character = profile.characters.find((item) => item.characterId === characterId)
  const instance = profile.storage.skillInstances.find((item) => item.skillInstanceId === skillInstanceId)
  if (!character || !instance || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return { ok: false, error: '장착할 스킬과 슬롯을 확인해야 한다.' }
  if (character.level < [3, 7, 10][slotIndex]) return { ok: false, error: '아직 잠긴 커스텀 슬롯이다.' }
  if (character.customSkillSlots[slotIndex]) return { ok: false, error: '이미 사용 중인 커스텀 슬롯이다.' }
  const allowed = CUSTOM_SKILL_ALLOWED_CLASSES[instance.skillId as CustomSkillId]
  if (!allowed?.includes(character.classId)) return { ok: false, error: '해당 직업이 장착할 수 없는 스킬이다.' }
  if (character.customSkillSlots.some((item) => item?.skillId === instance.skillId)) return { ok: false, error: '같은 스킬을 중복 장착할 수 없다.' }
  const slots = [...character.customSkillSlots] as PersistentCharacter['customSkillSlots']
  slots[slotIndex] = instance
  const updated = { ...character, customSkillSlots: slots }
  return {
    ok: true,
    value: replaceCharacter({ ...profile, storage: { ...profile.storage, skillInstances: profile.storage.skillInstances.filter((item) => item.skillInstanceId !== skillInstanceId) } }, updated),
  }
}

export function unequipCustomSkill(profile: ProfileV2, characterId: string, skillInstanceId: string, slotIndex: number): RuleResult<ProfileV2> {
  const character = profile.characters.find((item) => item.characterId === characterId)
  const instance = character?.customSkillSlots[slotIndex]
  if (!character || !instance || instance.skillInstanceId !== skillInstanceId) return { ok: false, error: '해제할 스킬을 찾을 수 없다.' }
  if (usedStorageSlots(profile) >= profile.storage.capacity) return { ok: false, error: '공용 창고 용량이 부족하다.' }
  const slots = [...character.customSkillSlots] as PersistentCharacter['customSkillSlots']
  slots[slotIndex] = null
  return {
    ok: true,
    value: replaceCharacter({ ...profile, storage: { ...profile.storage, skillInstances: [...profile.storage.skillInstances, instance] } }, { ...character, customSkillSlots: slots }),
  }
}
