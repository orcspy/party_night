import { describe, expect, it } from 'vitest'
import { getMapDefinition } from '../game/content'
import { REGISTERED_ENEMY_CONTENT_IDS, enemySpriteKeyFor } from '../phaser/assets/enemyAssets'
import { MARKER_KEYS, REGISTERED_TERRAIN_MAP_IDS, terrainTextureKey } from '../phaser/assets/terrainAssets'

const TERRAIN_MAP_IDS = ['training_ruins', 'goblin_den', 'ancient_site', 'underground_dungeon', 'old_castle', 'volcanic_cave', 'deep_forest_ruins']
const ENEMY_IDS = ['goblin_scout', 'goblin_guard', 'hobgoblin_boss', 'orc_raider', 'kobold_skirmisher', 'skeleton_soldier', 'zombie', 'imp', 'gnoll_brute', 'ghoul', 'wraith', 'ogre', 'minotaur_boss', 'lich_boss', 'cyclops_boss', 'skeleton_king_boss']

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
