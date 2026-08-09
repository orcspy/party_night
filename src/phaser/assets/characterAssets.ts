import type Phaser from 'phaser'
import type { AssetGender, ClassId, RaceId } from '../../game/types'

/**
 * Lazy (non-eager) glob: only resolves import() promises for the specific (race,class,gender,slot) combos a
 * battle actually needs (at most 4 per party). With 288 total sprites, an eager import would pull every combo's
 * base64 payload into the JS bundle unconditionally, so Scene loading resolves only the combinations it uses.
 */
const CHARACTER_MODULES = import.meta.glob<{ default: string }>('../../assets/characters/*.png')

function modulePath(raceId: RaceId, classId: ClassId, gender: AssetGender, slot: number) {
  return `../../assets/characters/${raceId}_${classId}_${gender}_p${slot}.png`
}

export function characterTextureKey(raceId: RaceId, classId: ClassId, gender: AssetGender, slot: number) {
  return `party_${raceId}_${classId}_${gender}_p${slot}`
}

/** Resolves and queues one combo's texture on the scene's loader (does not call scene.load.start(); the caller
 *  batches that). 'ready' = already loaded, nothing to do. 'queued' = added to the loader, caller must start()
 *  it. 'missing' = no sprite exists for this combo yet — caller should fall back. */
export async function queueCharacterAsset(scene: Phaser.Scene, raceId: RaceId, classId: ClassId, gender: AssetGender, slot: number): Promise<'ready' | 'queued' | 'missing'> {
  const key = characterTextureKey(raceId, classId, gender, slot)
  if (scene.textures.exists(key)) return 'ready'
  const loader = CHARACTER_MODULES[modulePath(raceId, classId, gender, slot)]
  if (!loader) return 'missing'
  const mod = await loader()
  if (scene.textures.exists(key)) return 'ready'
  scene.load.image(key, mod.default)
  return 'queued'
}

export function characterAssetReady(scene: Phaser.Scene, raceId: RaceId, classId: ClassId, gender: AssetGender, slot: number) {
  return scene.textures.exists(characterTextureKey(raceId, classId, gender, slot))
}
