import type Phaser from 'phaser'

import trainingRuinsFloorUrl from '../../assets/terrain/terrain_training_ruins_floor.png'
import trainingRuinsCeilingUrl from '../../assets/terrain/terrain_training_ruins_ceiling.png'
import trainingRuinsWallSideUrl from '../../assets/terrain/terrain_training_ruins_wall_side.png'
import trainingRuinsWallFrontUrl from '../../assets/terrain/terrain_training_ruins_wall_front.png'
import goblinDenFloorUrl from '../../assets/terrain/terrain_goblin_den_floor.png'
import goblinDenCeilingUrl from '../../assets/terrain/terrain_goblin_den_ceiling.png'
import goblinDenWallSideUrl from '../../assets/terrain/terrain_goblin_den_wall_side.png'
import goblinDenWallFrontUrl from '../../assets/terrain/terrain_goblin_den_wall_front.png'
import ancientSiteFloorUrl from '../../assets/terrain/terrain_ancient_site_floor.png'
import ancientSiteCeilingUrl from '../../assets/terrain/terrain_ancient_site_ceiling.png'
import ancientSiteWallSideUrl from '../../assets/terrain/terrain_ancient_site_wall_side.png'
import ancientSiteWallFrontUrl from '../../assets/terrain/terrain_ancient_site_wall_front.png'
import undergroundDungeonFloorUrl from '../../assets/terrain/terrain_underground_dungeon_floor.png'
import undergroundDungeonCeilingUrl from '../../assets/terrain/terrain_underground_dungeon_ceiling.png'
import undergroundDungeonWallSideUrl from '../../assets/terrain/terrain_underground_dungeon_wall_side.png'
import undergroundDungeonWallFrontUrl from '../../assets/terrain/terrain_underground_dungeon_wall_front.png'
import oldCastleFloorUrl from '../../assets/terrain/terrain_old_castle_floor.png'
import oldCastleCeilingUrl from '../../assets/terrain/terrain_old_castle_ceiling.png'
import oldCastleWallSideUrl from '../../assets/terrain/terrain_old_castle_wall_side.png'
import oldCastleWallFrontUrl from '../../assets/terrain/terrain_old_castle_wall_front.png'
import volcanicCaveFloorUrl from '../../assets/terrain/terrain_volcanic_cave_floor.png'
import volcanicCaveCeilingUrl from '../../assets/terrain/terrain_volcanic_cave_ceiling.png'
import volcanicCaveWallSideUrl from '../../assets/terrain/terrain_volcanic_cave_wall_side.png'
import volcanicCaveWallFrontUrl from '../../assets/terrain/terrain_volcanic_cave_wall_front.png'
import deepForestRuinsFloorUrl from '../../assets/terrain/terrain_deep_forest_ruins_floor.png'
import deepForestRuinsCeilingUrl from '../../assets/terrain/terrain_deep_forest_ruins_ceiling.png'
import deepForestRuinsWallSideUrl from '../../assets/terrain/terrain_deep_forest_ruins_wall_side.png'
import deepForestRuinsWallFrontUrl from '../../assets/terrain/terrain_deep_forest_ruins_wall_front.png'
import markerEncounterUrl from '../../assets/terrain/marker_encounter.png'
import markerExitUrl from '../../assets/terrain/marker_exit.png'
import markerBossUrl from '../../assets/terrain/marker_boss.png'

export type TerrainPart = 'floor' | 'ceiling' | 'wallSide' | 'wallFront'

const TERRAIN_SETS: Record<string, Record<TerrainPart, string>> = {
  training_ruins: { floor: trainingRuinsFloorUrl, ceiling: trainingRuinsCeilingUrl, wallSide: trainingRuinsWallSideUrl, wallFront: trainingRuinsWallFrontUrl },
  goblin_den: { floor: goblinDenFloorUrl, ceiling: goblinDenCeilingUrl, wallSide: goblinDenWallSideUrl, wallFront: goblinDenWallFrontUrl },
  ancient_site: { floor: ancientSiteFloorUrl, ceiling: ancientSiteCeilingUrl, wallSide: ancientSiteWallSideUrl, wallFront: ancientSiteWallFrontUrl },
  underground_dungeon: { floor: undergroundDungeonFloorUrl, ceiling: undergroundDungeonCeilingUrl, wallSide: undergroundDungeonWallSideUrl, wallFront: undergroundDungeonWallFrontUrl },
  old_castle: { floor: oldCastleFloorUrl, ceiling: oldCastleCeilingUrl, wallSide: oldCastleWallSideUrl, wallFront: oldCastleWallFrontUrl },
  volcanic_cave: { floor: volcanicCaveFloorUrl, ceiling: volcanicCaveCeilingUrl, wallSide: volcanicCaveWallSideUrl, wallFront: volcanicCaveWallFrontUrl },
  deep_forest_ruins: { floor: deepForestRuinsFloorUrl, ceiling: deepForestRuinsCeilingUrl, wallSide: deepForestRuinsWallSideUrl, wallFront: deepForestRuinsWallFrontUrl },
}

export const REGISTERED_TERRAIN_MAP_IDS = Object.freeze(Object.keys(TERRAIN_SETS))

export function terrainTextureKey(mapId: string, part: TerrainPart): string {
  return `terrain_${mapId}_${part}`
}

export const MARKER_KEYS = { encounter: 'marker_encounter', exit: 'marker_exit', boss: 'marker_boss' } as const
export type MarkerKey = (typeof MARKER_KEYS)[keyof typeof MARKER_KEYS]

const MARKER_MANIFEST: { key: MarkerKey; url: string }[] = [
  { key: MARKER_KEYS.encounter, url: markerEncounterUrl },
  { key: MARKER_KEYS.exit, url: markerExitUrl },
  { key: MARKER_KEYS.boss, url: markerBossUrl },
]

export function queueTerrainAssets(scene: Phaser.Scene, mapId: string) {
  const set = TERRAIN_SETS[mapId]
  if (set) for (const part of Object.keys(set) as TerrainPart[]) {
    const key = terrainTextureKey(mapId, part)
    if (!scene.textures.exists(key)) scene.load.image(key, set[part])
  }
  for (const asset of MARKER_MANIFEST) if (!scene.textures.exists(asset.key)) scene.load.image(asset.key, asset.url)
}

export function terrainAssetReady(scene: Phaser.Scene, mapId: string, part: TerrainPart): boolean {
  return scene.textures.exists(terrainTextureKey(mapId, part))
}

export function markerAssetReady(scene: Phaser.Scene, key: MarkerKey): boolean {
  return scene.textures.exists(key)
}
