import Phaser from 'phaser'
import { getDirectionDisplayName } from '../game/displayNames'
import { isWall } from '../game/exploration'
import { getMapDefinition, getNextRequiredEncounter } from '../game/content'
import type { Direction, GameState } from '../game/types'
import type { SceneBridge } from './PhaserGame'
import { MARKER_KEYS, markerAssetReady, queueTerrainAssets, terrainAssetReady, terrainTextureKey } from './assets/terrainAssets'
import {
  CEILING_POLYGON,
  EXPLORATION_DEPTHS,
  EXPLORATION_FRAMES,
  EXPLORATION_VIEWPORT,
  EXPLORATION_VIEWPORT_SIZE,
  FLOOR_POLYGON,
  VIEWPORT_COVERS,
  farEdgeFor,
  wallQuadPoints,
  wallRenderDepthFor,
  type DepthFrame,
} from './explorationGeometry'

const FORWARD: Record<Direction, [number, number]> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }
const RIGHT: Record<Direction, [number, number]> = { north: [1, 0], east: [0, 1], south: [-1, 0], west: [0, -1] }

/** Absolute safety floor for the front-wall cap's size; VANISH_FRAME normally makes this a no-op. */
const MIN_FRONT_WALL_SIZE = 24

/** Alpha of the flat dark fill drawn over VANISH_FRAME when depth 2's passage stays open (no front wall) — hides
 *  the abrupt cutoff where the corridor just isn't rendered any further, reading as unlit distance instead. */
const DEEP_SHADE_ALPHA = 0.72

const MARKER_SCALE_BY_DEPTH = [1, 0.75, 0.55]

/** Progressively dims farther wall segments so the per-depth frames read as one wall receding into the distance instead of separate disconnected patches. */
const WALL_SHADE_BY_DEPTH = [1, 0.8, 0.62]

function shadeColor(hex: number, factor: number): number {
  const r = Math.round(((hex >> 16) & 0xff) * factor)
  const g = Math.round(((hex >> 8) & 0xff) * factor)
  const b = Math.round((hex & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

interface TerrainReadiness {
  floor: boolean
  ceiling: boolean
  wallSide: boolean
  wallFront: boolean
  markerEncounter: boolean
  markerExit: boolean
  markerBoss: boolean
}

export class ExplorationScene extends Phaser.Scene {
  private unsubscribe?: () => void
  private state: GameState
  private mapId!: string
  private backgroundGfx!: Phaser.GameObjects.Graphics
  private world!: Phaser.GameObjects.Graphics
  private location!: Phaser.GameObjects.Text

  private terrainReady: TerrainReadiness = {
    floor: false, ceiling: false, wallSide: false, wallFront: false, markerEncounter: false, markerExit: false, markerBoss: false,
  }
  private floorSprite?: Phaser.GameObjects.TileSprite
  private ceilingSprite?: Phaser.GameObjects.TileSprite
  private leftWallSprites: Phaser.GameObjects.TileSprite[] = []
  private rightWallSprites: Phaser.GameObjects.TileSprite[] = []
  private frontWallSprite?: Phaser.GameObjects.TileSprite
  private encounterMarker?: Phaser.GameObjects.Image
  private exitMarker?: Phaser.GameObjects.Image
  private bossMarker?: Phaser.GameObjects.Image
  private maskShapes: Phaser.GameObjects.Graphics[] = []

  constructor(private readonly bridge: SceneBridge) {
    super('exploration')
    this.state = bridge.store.getState()
  }

  preload() {
    this.mapId = this.state.session?.exploration.mapId ?? 'training_ruins'
    queueTerrainAssets(this, this.mapId)
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[ExplorationScene] terrain asset load failed: ${file.key} (${file.src})`)
    })
  }

  create() {
    this.terrainReady = {
      floor: terrainAssetReady(this, this.mapId, 'floor'),
      ceiling: terrainAssetReady(this, this.mapId, 'ceiling'),
      wallSide: terrainAssetReady(this, this.mapId, 'wallSide'),
      wallFront: terrainAssetReady(this, this.mapId, 'wallFront'),
      markerEncounter: markerAssetReady(this, MARKER_KEYS.encounter),
      markerExit: markerAssetReady(this, MARKER_KEYS.exit),
      markerBoss: markerAssetReady(this, MARKER_KEYS.boss),
    }
    for (const [key, ready] of Object.entries(this.terrainReady)) {
      if (!ready) console.warn(`[ExplorationScene] terrain asset unavailable, using fallback graphics: ${key} (map: ${this.mapId})`)
    }

    this.cameras.main.setBackgroundColor('#0b0b13')
    this.backgroundGfx = this.add.graphics().setDepth(-3)
    this.world = this.add.graphics().setDepth(0)
    this.setupTerrainLayers()
    this.setupViewportBoundary()
    this.location = this.add.text(18, 16, '', { fontFamily: 'monospace', fontSize: '13px', color: '#d9c98c' }).setDepth(EXPLORATION_DEPTHS.ui)
    this.add.text(320, 22, getMapDefinition(this.state.session?.exploration.mapId ?? 'training_ruins').name.toUpperCase(), { fontFamily: 'monospace', fontSize: '14px', color: '#746d89' }).setOrigin(0.5).setDepth(EXPLORATION_DEPTHS.ui)
    this.makeButton(56, 288, '↶', () => this.bridge.store.dispatch({ type: 'TURN_LEFT' }))
    this.makeButton(136, 288, 'BACK', () => this.bridge.store.dispatch({ type: 'MOVE_BACKWARD' }))
    this.makeButton(504, 288, 'FWD', () => this.bridge.store.dispatch({ type: 'MOVE_FORWARD' }))
    this.makeButton(584, 288, '↷', () => this.bridge.store.dispatch({ type: 'TURN_RIGHT' }))
    this.unsubscribe = this.bridge.store.subscribe((envelope) => {
      this.state = envelope.state
      this.drawWorld()
      if (envelope.events.some((event) => event.type === 'TRAP_TRIGGERED')) this.cameras.main.shake(120, 0.008)
      if (envelope.events.some((event) => event.type === 'TRAP_DISCOVERED' || event.type === 'SECRET_ROOM_DISCOVERED')) this.cameras.main.flash(100, 196, 176, 92, false)
    })
    const cleanup = () => {
      this.unsubscribe?.()
      for (const shape of this.maskShapes) shape.destroy()
      this.maskShapes = []
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup)
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup)
    this.drawWorld()
  }

  private setupTerrainLayers() {
    if (this.terrainReady.floor) {
      const floorMaskShape = this.make.graphics(undefined, false)
      floorMaskShape.fillStyle(0xffffff).fillPoints([...FLOOR_POLYGON], true)
      this.maskShapes.push(floorMaskShape)
      this.floorSprite = this.add.tileSprite(0, 172, 640, 94, terrainTextureKey(this.mapId, 'floor')).setOrigin(0, 0).setDepth(-1)
      this.floorSprite.setMask(floorMaskShape.createGeometryMask())
    }
    if (this.terrainReady.ceiling) {
      const ceilingMaskShape = this.make.graphics(undefined, false)
      ceilingMaskShape.fillStyle(0xffffff).fillPoints([...CEILING_POLYGON], true)
      this.maskShapes.push(ceilingMaskShape)
      this.ceilingSprite = this.add.tileSprite(0, 44, 640, 128, terrainTextureKey(this.mapId, 'ceiling')).setOrigin(0, 0).setDepth(-2)
      this.ceilingSprite.setMask(ceilingMaskShape.createGeometryMask())
    }
    if (this.terrainReady.wallSide) {
      const wallSideKey = terrainTextureKey(this.mapId, 'wallSide')
      for (let depth = 0; depth < EXPLORATION_FRAMES.length; depth++) {
        const near = EXPLORATION_FRAMES[depth]
        const far = farEdgeFor(depth)

        const leftSprite = this.add.tileSprite(0, 0, 1, 1, wallSideKey).setOrigin(0, 0).setVisible(false)
        const leftMaskShape = this.make.graphics(undefined, false)
        leftMaskShape.fillStyle(0xffffff).fillPoints(wallQuadPoints(near, far, 'left'), true)
        this.maskShapes.push(leftMaskShape)
        leftSprite.setMask(leftMaskShape.createGeometryMask())
        this.leftWallSprites[depth] = leftSprite

        const rightSprite = this.add.tileSprite(0, 0, 1, 1, wallSideKey).setOrigin(0, 0).setVisible(false)
        const rightMaskShape = this.make.graphics(undefined, false)
        rightMaskShape.fillStyle(0xffffff).fillPoints(wallQuadPoints(near, far, 'right'), true)
        this.maskShapes.push(rightMaskShape)
        rightSprite.setMask(rightMaskShape.createGeometryMask())
        this.rightWallSprites[depth] = rightSprite
      }
    }
    if (this.terrainReady.wallFront) {
      this.frontWallSprite = this.add.tileSprite(0, 0, 1, 1, terrainTextureKey(this.mapId, 'wallFront')).setOrigin(0, 0).setVisible(false)
    }
    if (this.terrainReady.markerEncounter) {
      this.encounterMarker = this.add.image(0, 0, MARKER_KEYS.encounter).setDepth(EXPLORATION_DEPTHS.marker).setVisible(false)
    }
    if (this.terrainReady.markerExit) {
      this.exitMarker = this.add.image(0, 0, MARKER_KEYS.exit).setDepth(EXPLORATION_DEPTHS.marker).setVisible(false)
    }
    if (this.terrainReady.markerBoss) {
      this.bossMarker = this.add.image(0, 0, MARKER_KEYS.boss).setDepth(EXPLORATION_DEPTHS.marker).setVisible(false)
    }
  }

  private setupViewportBoundary() {
    const cover = this.add.graphics().setDepth(EXPLORATION_DEPTHS.viewportCover)
    cover.fillStyle(0x0b0b13, 1)
    for (const rect of VIEWPORT_COVERS) cover.fillRect(rect.x, rect.y, rect.width, rect.height)

    this.add.graphics()
      .setDepth(EXPLORATION_DEPTHS.outerFrame)
      .lineStyle(3, 0x897a58, 1)
      .strokeRect(EXPLORATION_VIEWPORT.left, EXPLORATION_VIEWPORT.top, EXPLORATION_VIEWPORT_SIZE.width, EXPLORATION_VIEWPORT_SIZE.height)
  }

  private makeButton(x: number, y: number, label: string, action: () => void) {
    const button = this.add.rectangle(x, y, 68, 54, 0x242035).setStrokeStyle(2, 0xd4b45d).setInteractive({ useHandCursor: true }).setDepth(EXPLORATION_DEPTHS.ui)
    this.add.text(x, y, label, { fontFamily: 'monospace', fontSize: '16px', color: '#fff2c2' }).setOrigin(0.5).setDepth(EXPLORATION_DEPTHS.ui)
    button.on('pointerdown', action)
  }

  private positionWallSprite(sprite: Phaser.GameObjects.TileSprite, x: number, y: number, width: number, height: number, renderDepth: number, shade: number) {
    sprite.setPosition(x, y)
    sprite.setSize(width, height)
    // Anchor the tile pattern to world space (not each sprite's own local origin) so adjacent depth segments sample
    // a continuous virtual texture instead of each restarting its brick pattern from zero at the segment boundary.
    sprite.setTilePosition(x, y)
    sprite.setTint(shadeColor(0xffffff, shade))
    sprite.setDepth(renderDepth)
    sprite.setVisible(true)
  }

  private updateCellMarker(mapId: string, cx: number, cy: number, frame: DepthFrame, depth: number, completedEncounterIds: string[]) {
    const encounter = getNextRequiredEncounter(mapId, completedEncounterIds)
    if (encounter?.x !== cx || encounter.y !== cy) return
    const scale = MARKER_SCALE_BY_DEPTH[depth]
    const x = (frame.left + frame.right) / 2
    const y = frame.bottom - 18 * scale
    if (encounter.role === 'boss' && this.bossMarker) {
      this.bossMarker.setPosition(x, y).setScale(scale * 1.15).setVisible(true)
      return
    }
    if (this.encounterMarker) {
      const isBoss = encounter.role === 'boss'
      this.encounterMarker.setPosition(x, y).setScale(scale * (isBoss ? 1.25 : 1)).setTint(isBoss ? 0xd9534f : 0xffffff).setVisible(true)
    }
  }

  private drawWorld() {
    const session = this.state.session
    const exploration = session?.exploration
    if (!session || !exploration || !this.world) return
    const [fx, fy] = FORWARD[exploration.direction]
    const [rx, ry] = RIGHT[exploration.direction]
    const map = getMapDefinition(exploration.mapId)
    const bg = this.backgroundGfx.clear()
    bg.fillStyle(0x171321).fillRect(EXPLORATION_VIEWPORT.left, EXPLORATION_VIEWPORT.top, EXPLORATION_VIEWPORT_SIZE.width, EXPLORATION_VIEWPORT_SIZE.height)
    if (!this.terrainReady.floor) bg.fillStyle(0x28213a).fillPoints([...FLOOR_POLYGON], true)
    if (!this.terrainReady.ceiling) bg.fillStyle(0x100f19).fillPoints([...CEILING_POLYGON], true)
    const g = this.world.clear()

    this.encounterMarker?.setVisible(false)
    this.exitMarker?.setVisible(false)
    this.bossMarker?.setVisible(false)
    this.frontWallSprite?.setVisible(false)
    for (let depth = 0; depth < EXPLORATION_FRAMES.length; depth++) {
      this.leftWallSprites[depth]?.setVisible(false)
      this.rightWallSprites[depth]?.setVisible(false)
    }

    for (let depth = 0; depth < EXPLORATION_FRAMES.length; depth++) {
      const cx = exploration.x + fx * depth
      const cy = exploration.y + fy * depth
      const frame = EXPLORATION_FRAMES[depth]
      const shade = WALL_SHADE_BY_DEPTH[depth]
      const leftWall = isWall(exploration.mapId, cx - rx, cy - ry, session.discoveredSecretIds)
      const rightWall = isWall(exploration.mapId, cx + rx, cy + ry, session.discoveredSecretIds)
      const frontWall = isWall(exploration.mapId, cx + fx, cy + fy, session.discoveredSecretIds)
      const far = farEdgeFor(depth)
      const leftWidth = far.left - frame.left
      const rightWidth = frame.right - far.right

      if (depth > 0) g.lineStyle(3, shadeColor(0x897a58, shade), 1).strokeRect(frame.left, frame.top, frame.right - frame.left, frame.bottom - frame.top)

      if (leftWall) {
        const sprite = this.leftWallSprites[depth]
        if (this.terrainReady.wallSide && sprite) {
          this.positionWallSprite(sprite, frame.left, frame.top, leftWidth, frame.bottom - frame.top, wallRenderDepthFor(depth, 'side'), shade)
        } else {
          g.fillStyle(shadeColor(0x312944, shade), 1).fillPoints(wallQuadPoints(frame, far, 'left'), true)
        }
      }
      if (rightWall) {
        const sprite = this.rightWallSprites[depth]
        if (this.terrainReady.wallSide && sprite) {
          this.positionWallSprite(sprite, far.right, frame.top, rightWidth, frame.bottom - frame.top, wallRenderDepthFor(depth, 'side'), shade)
        } else {
          g.fillStyle(shadeColor(0x312944, shade), 1).fillPoints(wallQuadPoints(frame, far, 'right'), true)
        }
      }

      this.updateCellMarker(exploration.mapId, cx, cy, frame, depth, session.completedEncounterIds)
      const markerScale = MARKER_SCALE_BY_DEPTH[depth]
      const markerX = (frame.left + frame.right) / 2
      const markerY = frame.bottom - 14 * markerScale
      const trap = map.traps.find((item) => item.x === cx && item.y === cy)
      if (trap && session.discoveredTrapIds.includes(trap.trapId) && !session.triggeredTrapIds.includes(trap.trapId)) {
        g.fillStyle(0xd4a84f, 0.9).fillCircle(markerX, markerY, Math.max(3, 7 * markerScale))
      }
      const secret = map.secrets.find((item) => item.doorX === cx && item.doorY === cy)
      if (secret && session.discoveredSecretIds.includes(secret.secretId)) {
        g.lineStyle(3, 0x65b7a6, 0.9).strokeRect(frame.left + 8, frame.top + 8, frame.right - frame.left - 16, frame.bottom - frame.top - 16)
      }

      if (frontWall) {
        // The wall directly ahead only occupies the far (blocked) frame's footprint — the same inner edge the side
        // trapezoids taper to — never the full current frame. Filling the whole frame here used to paint over an
        // open side passage (leftWall/rightWall false) whenever the front happened to be blocked at this depth.
        const frontWidth = Math.max(far.right - far.left, MIN_FRONT_WALL_SIZE)
        const frontHeight = Math.max(far.bottom - far.top, MIN_FRONT_WALL_SIZE)
        const frontX = (far.left + far.right) / 2 - frontWidth / 2
        const frontY = (far.top + far.bottom) / 2 - frontHeight / 2
        if (this.terrainReady.wallFront && this.frontWallSprite) {
          this.positionWallSprite(this.frontWallSprite, frontX, frontY, frontWidth, frontHeight, wallRenderDepthFor(depth, 'front'), shade)
        } else {
          g.fillStyle(shadeColor(0x3c324c, shade), 1).fillRect(frontX, frontY, frontWidth, frontHeight)
          g.lineStyle(2, shadeColor(0x665877, shade), 1)
          for (let y = frontY + 22; y < frontY + frontHeight; y += 24) g.lineBetween(frontX, y, frontX + frontWidth, y)
        }
        break
      } else if (depth === EXPLORATION_FRAMES.length - 1) {
        // Last rendered depth, passage still open: nothing further is ever drawn past here, so the side-wall
        // trapezoids would otherwise taper down to bare VANISH_FRAME background — a visible "hole" at the vanish
        // point that reads as distortion rather than depth. A flat dark fill over that same footprint reads as
        // unlit distance instead.
        g.fillStyle(0x000000, DEEP_SHADE_ALPHA).fillRect(far.left, far.top, far.right - far.left, far.bottom - far.top)
      }
    }
    this.location.setText(`위치 ${exploration.x}:${exploration.y}  ${getDirectionDisplayName(exploration.direction)}`)
  }
}
