import type Phaser from 'phaser'

import goblinScoutUrl from '../../assets/enemies/goblin_scout.png'
import goblinGuardUrl from '../../assets/enemies/goblin_guard.png'
import hobgoblinBossUrl from '../../assets/enemies/hobgoblin_boss.png'
import orcRaiderUrl from '../../assets/enemies/orc_raider.png'
import koboldSkirmisherUrl from '../../assets/enemies/kobold_skirmisher.png'
import skeletonSoldierUrl from '../../assets/enemies/skeleton_soldier.png'
import zombieUrl from '../../assets/enemies/zombie.png'
import impUrl from '../../assets/enemies/imp.png'
import gnollBruteUrl from '../../assets/enemies/gnoll_brute.png'
import ghoulUrl from '../../assets/enemies/ghoul.png'
import wraithUrl from '../../assets/enemies/wraith.png'
import ogreUrl from '../../assets/enemies/ogre.png'
import minotaurBossUrl from '../../assets/enemies/minotaur_boss.png'
import lichBossUrl from '../../assets/enemies/lich_boss.png'
import cyclopsBossUrl from '../../assets/enemies/cyclops_boss.png'
import skeletonKingBossUrl from '../../assets/enemies/skeleton_king_boss.png'

const ENEMY_MANIFEST = [
  { contentId: 'goblin_scout', key: 'enemy_goblin_scout', url: goblinScoutUrl },
  { contentId: 'goblin_guard', key: 'enemy_goblin_guard', url: goblinGuardUrl },
  { contentId: 'hobgoblin_boss', key: 'enemy_hobgoblin_boss', url: hobgoblinBossUrl },
  { contentId: 'orc_raider', key: 'enemy_orc_raider', url: orcRaiderUrl },
  { contentId: 'kobold_skirmisher', key: 'enemy_kobold_skirmisher', url: koboldSkirmisherUrl },
  { contentId: 'skeleton_soldier', key: 'enemy_skeleton_soldier', url: skeletonSoldierUrl },
  { contentId: 'zombie', key: 'enemy_zombie', url: zombieUrl },
  { contentId: 'imp', key: 'enemy_imp', url: impUrl },
  { contentId: 'gnoll_brute', key: 'enemy_gnoll_brute', url: gnollBruteUrl },
  { contentId: 'ghoul', key: 'enemy_ghoul', url: ghoulUrl },
  { contentId: 'wraith', key: 'enemy_wraith', url: wraithUrl },
  { contentId: 'ogre', key: 'enemy_ogre', url: ogreUrl },
  { contentId: 'minotaur_boss', key: 'enemy_minotaur_boss', url: minotaurBossUrl },
  { contentId: 'lich_boss', key: 'enemy_lich_boss', url: lichBossUrl },
  { contentId: 'cyclops_boss', key: 'enemy_cyclops_boss', url: cyclopsBossUrl },
  { contentId: 'skeleton_king_boss', key: 'enemy_skeleton_king_boss', url: skeletonKingBossUrl },
] as const

export const REGISTERED_ENEMY_CONTENT_IDS = Object.freeze(ENEMY_MANIFEST.map((asset) => asset.contentId))
const KEY_BY_CONTENT_ID = new Map<string, string>(ENEMY_MANIFEST.map((asset) => [asset.contentId, asset.key]))

export function queueEnemyAssets(scene: Phaser.Scene) {
  for (const asset of ENEMY_MANIFEST) if (!scene.textures.exists(asset.key)) scene.load.image(asset.key, asset.url)
}

export function enemySpriteKeyFor(contentId: string): string | undefined {
  return KEY_BY_CONTENT_ID.get(contentId)
}

export function enemyAssetReady(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key)
}
