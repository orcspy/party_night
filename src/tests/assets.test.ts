import { describe, expect, it } from 'vitest'
import shieldSpec from '../../assets-source/icons/equipment_shield.asset.json'
import { CLASS_DATA, CUSTOM_SKILL_ALLOWED_CLASSES, EQUIPMENT_DATA, getMapDefinition, ITEM_DATA, SKILLS } from '../game/content'
import { REGISTERED_ENEMY_CONTENT_IDS, enemySpriteKeyFor } from '../phaser/assets/enemyAssets'
import { characterTextureKey } from '../phaser/assets/characterAssets'
import { MARKER_KEYS, REGISTERED_TERRAIN_MAP_IDS, terrainTextureKey } from '../phaser/assets/terrainAssets'
import { CONTENT_ICON_URLS } from '../ui/ContentIcon'
import { CONTENT_ICON_KEYS, getCustomSkillAllowedClassLabel, getEquipmentPresentation, getItemEffectDescription, getItemPresentation, getPositiveEquipmentModifierLabels, getRarityDisplayName, getRewardPresentation, getSkillPresentation, RARITY_CSS_TOKENS } from '../ui/contentPresentation'
import type { EquipmentFamily, PendingRewardEntry, Rarity } from '../game/types'

const TERRAIN_MAP_IDS = ['training_ruins', 'goblin_den', 'ancient_site', 'underground_dungeon', 'old_castle', 'volcanic_cave', 'deep_forest_ruins']
const ENEMY_IDS = ['goblin_scout', 'goblin_guard', 'hobgoblin_boss', 'orc_raider', 'kobold_skirmisher', 'skeleton_soldier', 'zombie', 'imp', 'gnoll_brute', 'ghoul', 'wraith', 'ogre', 'minotaur_boss', 'lich_boss', 'cyclops_boss', 'skeleton_king_boss']
const EXPECTED_ICON_KEYS = ['item_potion', 'equipment_sword', 'equipment_club', 'equipment_dagger', 'equipment_bow', 'equipment_staff', 'equipment_shield', 'equipment_helmet', 'equipment_armor', 'skill_active', 'skill_passive']
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'heroic', 'legendary']
const INLINE_ICONS = import.meta.glob<string>('../assets/icons/*.png', { eager: true, query: '?inline', import: 'default' })
const CHARACTER_ASSETS = import.meta.glob('../assets/characters/*.png')

function decodeDataUrl(url: string): Uint8Array {
  const binary = atob(url.slice(url.indexOf(',') + 1))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
}

describe('v0.2.0 visual asset registries', () => {
  it('registers all seven terrain themes and both approved encounter markers', () => {
    expect([...REGISTERED_TERRAIN_MAP_IDS].sort()).toEqual([...TERRAIN_MAP_IDS].sort())
    expect(MARKER_KEYS).toMatchObject({ encounter: 'marker_encounter', boss: 'marker_boss' })
    expect(terrainTextureKey('ancient_site', 'wallFront')).toBe('terrain_ancient_site_wallFront')
    for (const mapId of ['training_ruins', 'goblin_den', 'ancient_site']) expect(REGISTERED_TERRAIN_MAP_IDS).toContain(getMapDefinition(mapId).mapId)
  })

  it('registers every approved enemy content ID with its approved texture key', () => {
    expect([...REGISTERED_ENEMY_CONTENT_IDS].sort()).toEqual([...ENEMY_IDS].sort())
    for (const enemyId of ENEMY_IDS) expect(enemySpriteKeyFor(enemyId)).toBe(`enemy_${enemyId}`)
    expect(enemySpriteKeyFor('unknown_enemy')).toBeUndefined()
  })
})

describe('content presentation assets', () => {
  it('preserves the approved equipment shield production contract', () => {
    expect(shieldSpec).toMatchObject({
      id: 'equipment_shield',
      kind: 'equipment',
      sourceFamily: 'shield',
      status: 'spec',
      runtimePath: 'src/assets/icons/equipment_shield.png',
      canvas: { width: 24, height: 24, background: 'transparent' },
      safeBounds: { xMin: 4, xMax: 19, yMin: 2, yMax: 21 },
      anchor: { x: 0.5, y: 0.5 },
      symmetryAxisX: 11.5,
      fallbackText: '장',
    })
    expect(Object.keys(shieldSpec.paletteRoles)).toEqual(['outline', 'base', 'shadow', 'highlight', 'trim', 'rivet'])
  })

  it('maps exactly eleven approved keys to 24x24 transparent RGBA PNG files', () => {
    const files = Object.keys(INLINE_ICONS).map((path) => path.slice(path.lastIndexOf('/') + 1)).sort()
    expect([...CONTENT_ICON_KEYS]).toEqual(EXPECTED_ICON_KEYS)
    expect(files).toEqual(EXPECTED_ICON_KEYS.map((key) => `${key}.png`).sort())
    expect(Object.keys(CONTENT_ICON_URLS).sort()).toEqual([...EXPECTED_ICON_KEYS].sort())

    for (const dataUrl of Object.values(INLINE_ICONS)) {
      const png = decodeDataUrl(dataUrl)
      expect(String.fromCharCode(...png.slice(1, 4))).toBe('PNG')
      expect(readUint32(png, 16)).toBe(24)
      expect(readUint32(png, 20)).toBe(24)
      expect(png[25]).toBe(6)
    }
  })

  it('keeps all equipment definitions and family mappings authoritative', () => {
    const familyIcons: Record<EquipmentFamily, string> = {
      dagger: 'equipment_dagger', sword: 'equipment_sword', mace: 'equipment_club', shield: 'equipment_shield', bow: 'equipment_bow',
      staff: 'equipment_staff', rod: 'equipment_staff', head: 'equipment_helmet', body: 'equipment_armor',
    }
    expect(Object.keys(EQUIPMENT_DATA)).toHaveLength(45)
    for (const [equipmentId, definition] of Object.entries(EQUIPMENT_DATA)) {
      const presentation = getEquipmentPresentation(equipmentId)
      expect(presentation).toMatchObject({ label: definition.name, iconKey: familyIcons[definition.family], fallbackText: '장', rarity: definition.rarity })
      expect(presentation.rarityLabel).toBe(getRarityDisplayName(definition.rarity))
    }
    for (const rarity of RARITIES) {
      const definition = EQUIPMENT_DATA[`${rarity}_shield`]
      expect(getEquipmentPresentation(`${rarity}_shield`)).toMatchObject({ label: definition.name, iconKey: 'equipment_shield', fallbackText: '장', rarity })
    }
    expect(getEquipmentPresentation('unknown_equipment')).toMatchObject({ label: '알 수 없는 장비', iconKey: null, fallbackText: '장', rarity: 'neutral', rarityLabel: null })
  })

  it('uses neutral potion and activation presentations without inventing rarity', () => {
    for (const itemId of Object.keys(ITEM_DATA)) {
      expect(getItemPresentation(itemId)).toMatchObject({ label: ITEM_DATA[itemId as keyof typeof ITEM_DATA].name, iconKey: 'item_potion', fallbackText: '아', rarity: 'neutral', rarityLabel: null })
    }
    for (const [skillId, skill] of Object.entries(SKILLS)) {
      expect(getSkillPresentation(skillId)).toMatchObject({ label: skill.name, iconKey: skill.activation === 'active' ? 'skill_active' : 'skill_passive', fallbackText: skill.activation === 'active' ? '액' : '패', rarity: 'neutral', rarityLabel: null })
    }
    expect(getItemPresentation('unknown_item')).toMatchObject({ label: '알 수 없는 아이템', iconKey: null, fallbackText: '아', rarity: 'neutral' })
    expect(getSkillPresentation('unknown_skill')).toMatchObject({ label: '알 수 없는 스킬', iconKey: null, fallbackText: '액', rarity: 'neutral' })
  })

  it('shows custom skill class restrictions without exposing internal IDs', () => {
    const before = JSON.stringify({ classes: CLASS_DATA, allowed: CUSTOM_SKILL_ALLOWED_CLASSES })
    expect(getCustomSkillAllowedClassLabel('first_aid')).toBe('공용')
    expect(getCustomSkillAllowedClassLabel('cutlery_expert')).toBe('전사')
    expect(getCustomSkillAllowedClassLabel('sleep')).toBe('마법사')
    expect(getCustomSkillAllowedClassLabel('unknown_skill')).toBe('장착 직업 정보 없음')
    expect(JSON.stringify({ classes: CLASS_DATA, allowed: CUSTOM_SKILL_ALLOWED_CLASSES })).toBe(before)
  })

  it('formats positive equipment modifiers and item effects for shop presentation', () => {
    const before = JSON.stringify({ equipment: EQUIPMENT_DATA, items: ITEM_DATA })
    expect(getPositiveEquipmentModifierLabels('common_sword')).toEqual(['str + 1'])
    expect(getPositiveEquipmentModifierLabels('uncommon_sword')).toEqual(['str + 2', 'dex + 1'])
    expect(getPositiveEquipmentModifierLabels('unknown_equipment')).toEqual([])
    for (const equipmentId of Object.keys(EQUIPMENT_DATA)) {
      const labels = getPositiveEquipmentModifierLabels(equipmentId)
      expect(labels.length).toBeGreaterThan(0)
      expect(labels.every((label) => !label.endsWith('+ 0') && !label.includes('+ -'))).toBe(true)
    }
    expect(Object.keys(ITEM_DATA).map((itemId) => getItemEffectDescription(itemId))).toEqual([
      '아군 1명 HP 10 회복', '응급 치료 사용 비용', '출혈·신경독·마비·수면·능력 감소 중 하나 제거',
      '적 1명 DEF 무시 피해 10', '현재·인접 칸 함정·비밀문 1회 탐지', '아군 1명 HP 22 회복',
      '3라운드 STR +2', '3라운드 AGI +2', '제거 가능 상태·능력 감소 전부 제거',
    ])
    expect(getItemEffectDescription('unknown_item')).toBe('효과 정보 없음')
    expect(JSON.stringify({ equipment: EQUIPMENT_DATA, items: ITEM_DATA })).toBe(before)
  })

  it('delegates rewards to selectors and does not mutate definitions or inputs', () => {
    const rewards: PendingRewardEntry[] = [
      { rewardId: 'reward-equipment', kind: 'equipment', instance: { equipmentInstanceId: 'equipment-1', equipmentId: 'legendary_shield' } },
      { rewardId: 'reward-item', kind: 'item', itemId: 'minor_healing_potion', quantity: 2 },
      { rewardId: 'reward-skill', kind: 'skill', instance: { skillInstanceId: 'skill-1', skillId: 'seek_trap' } },
    ]
    const before = JSON.stringify({ rewards, equipment: EQUIPMENT_DATA, items: ITEM_DATA, skills: SKILLS })
    expect(getRewardPresentation(rewards[0])).toEqual(getEquipmentPresentation('legendary_shield'))
    expect(getRewardPresentation(rewards[1])).toEqual(getItemPresentation('minor_healing_potion'))
    expect(getRewardPresentation(rewards[2])).toEqual(getSkillPresentation('seek_trap'))
    expect(JSON.stringify({ rewards, equipment: EQUIPMENT_DATA, items: ITEM_DATA, skills: SKILLS })).toBe(before)
  })

  it('defines every rarity display name and CSS token', () => {
    expect(RARITIES.map(getRarityDisplayName)).toEqual(['일반', '고급', '희귀', '영웅', '전설'])
    expect(RARITY_CSS_TOKENS).toEqual({
      common: '--rarity-common', uncommon: '--rarity-uncommon', rare: '--rarity-rare', heroic: '--rarity-heroic', legendary: '--rarity-legendary',
    })
  })

  it('resolves the approved companion race, class, gender, and slot combinations', () => {
    const companions = [
      ['dwarf', 'warrior', 'male', 2, 'party_dwarf_warrior_male_p2'],
      ['human', 'priest', 'female', 3, 'party_human_priest_female_p3'],
      ['elf', 'archer', 'male', 4, 'party_elf_archer_male_p4'],
    ] as const
    for (const [raceId, classId, gender, slot, expectedKey] of companions) {
      expect(CHARACTER_ASSETS[`../assets/characters/${raceId}_${classId}_${gender}_p${slot}.png`]).toBeTypeOf('function')
      expect(characterTextureKey(raceId, classId, gender, slot)).toBe(expectedKey)
    }
  })
})
