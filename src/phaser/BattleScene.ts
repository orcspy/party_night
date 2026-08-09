import Phaser from 'phaser'
import type { GameEvent, GameState } from '../game/types'
import type { SceneBridge } from './PhaserGame'
import { queueEnemyAssets, enemySpriteKeyFor, enemyAssetReady } from './assets/enemyAssets'
import { queueCharacterAsset, characterTextureKey, characterAssetReady } from './assets/characterAssets'

export class BattleScene extends Phaser.Scene {
  private unsubscribe?: () => void
  private state: GameState
  private layer!: Phaser.GameObjects.Container
  private diceOverlay!: Phaser.GameObjects.Container
  private rollQueue: GameEvent[] = []
  private rollTimer?: Phaser.Time.TimerEvent
  private showingRoll = false
  private loggedFallbackContentIds = new Set<string>()
  private loggedPartyFallbackIds = new Set<string>()
  private requestedPartyCombos = new Set<string>()
  private destroyed = false

  constructor(private readonly bridge: SceneBridge) {
    super('battle')
    this.state = bridge.store.getState()
  }

  preload() {
    queueEnemyAssets(this)
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[BattleScene] enemy asset load failed: ${file.key} (${file.src})`)
    })
  }

  create() {
    this.cameras.main.setBackgroundColor('#15101d')
    this.add.rectangle(320, 250, 640, 220, 0x21192a)
    this.add.rectangle(320, 110, 640, 4, 0x8f713d)
    const enemies = this.state.session?.combat?.participants.filter((actor) => actor.side === 'enemy') ?? []
    this.add.text(320, 24, `조우 // ${enemies.map((actor) => actor.name).join(' · ') || '전투'}`, { fontFamily: 'monospace', fontSize: '15px', color: '#d7b860' }).setOrigin(0.5)
    this.layer = this.add.container(0, 0)
    this.diceOverlay = this.add.container(0, 0).setDepth(100)
    this.unsubscribe = this.bridge.store.subscribe((state, events) => { this.state = state; this.renderActors(); this.animateEvents(events) })
    const cleanup = () => { this.unsubscribe?.(); this.rollTimer?.remove(false); this.rollQueue = []; this.destroyed = true }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup)
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup)
    this.renderActors()
    void this.loadPartyCharacterAssets()
  }

  /** Party sprites (src/assets/characters/) are loaded lazily and only for the combos this specific battle's
   *  party actually needs (at most 4), not the full 288-file matrix — see characterAssets.ts. Runs once; the
   *  fallback rectangle renders immediately and is swapped for the sprite once its texture finishes loading. */
  private async loadPartyCharacterAssets() {
    const combat = this.state.session?.combat
    if (!combat) return
    const party = combat.participants.filter((actor) => actor.side === 'party')
    let queuedAny = false
    for (let index = 0; index < party.length; index++) {
      const actor = party[index]
      if (!actor.raceId || !actor.classId || !actor.gender) continue
      const slot = index + 1
      const combo = `${actor.raceId}_${actor.classId}_${actor.gender}_p${slot}`
      if (this.requestedPartyCombos.has(combo)) continue
      this.requestedPartyCombos.add(combo)
      const result = await queueCharacterAsset(this, actor.raceId, actor.classId, actor.gender, slot)
      if (this.destroyed) return
      if (result === 'queued') queuedAny = true
      if (result === 'missing') console.warn(`[BattleScene] party sprite unavailable, using fallback geometry: ${combo}`)
    }
    if (!queuedAny) return
    this.load.once(Phaser.Loader.Events.COMPLETE, () => { if (!this.destroyed) this.renderActors() })
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[BattleScene] party asset load failed: ${file.key} (${file.src})`)
    })
    this.load.start()
  }

  private renderActors() {
    const combat = this.state.session?.combat
    if (!combat || !this.layer) return
    this.layer.removeAll(true)
    const party = combat.participants.filter((actor) => actor.side === 'party')
    const enemies = combat.participants.filter((actor) => actor.side === 'enemy')
    party.forEach((actor, index) => {
      const x = 72 + index * 102
      const y = 255
      const down = actor.currentHp <= 0
      const slot = index + 1
      if (actor.raceId && actor.classId && actor.gender && characterAssetReady(this, actor.raceId, actor.classId, actor.gender, slot)) {
        const key = characterTextureKey(actor.raceId, actor.classId, actor.gender, slot)
        this.partySpriteCard(key, actor.name, actor.currentHp, actor.maxHp, x, y, down)
      } else {
        if (!this.loggedPartyFallbackIds.has(actor.id)) {
          this.loggedPartyFallbackIds.add(actor.id)
          console.warn(`[BattleScene] party sprite unavailable, using fallback geometry: ${actor.id}`)
        }
        this.actorCard(actor.name, actor.currentHp, actor.maxHp, x, y, 0x3d6485, down)
      }
    })
    enemies.forEach((actor, index) => {
      const spacing = enemies.length >= 3 ? 105 : 130
      const x = 520 + (index - (enemies.length - 1) / 2) * spacing
      const y = 160 + index * 32
      const down = actor.currentHp <= 0
      const textureKey = enemySpriteKeyFor(actor.contentId)
      if (textureKey && enemyAssetReady(this, textureKey)) {
        this.enemySpriteCard(textureKey, actor.name, actor.currentHp, actor.maxHp, x, y, down)
      } else {
        if (!this.loggedFallbackContentIds.has(actor.contentId)) {
          this.loggedFallbackContentIds.add(actor.contentId)
          console.warn(`[BattleScene] enemy sprite unavailable, using fallback geometry: ${actor.contentId}`)
        }
        this.actorCard(actor.name, actor.currentHp, actor.maxHp, x, y, actor.contentId.includes('boss') || actor.contentId === 'ogre' ? 0x9b3343 : actor.contentId === 'orc_raider' ? 0x6f7140 : 0x7b3f46, down)
      }
    })
  }

  /** Draft party sprite (32x40 source, race/class/gender/slot baked into textureKey). Same bottom-anchor/label/
   *  health-bar layout as enemySpriteCard/actorCard so swapping between them never shifts the row. */
  private partySpriteCard(textureKey: string, name: string, hp: number, maxHp: number, x: number, y: number, down: boolean) {
    const sprite = this.add.image(x, y + 40, textureKey).setOrigin(0.5, 1).setScale(2)
    sprite.setTint(down ? 0x29252e : 0xffffff)
    const label = this.add.text(x, y + 49, name, { fontFamily: 'sans-serif', fontSize: '11px', color: '#f4ead2' }).setOrigin(0.5)
    const health = this.add.rectangle(x - 35 + 70 * (hp / maxHp) / 2, y + 65, 70 * (hp / maxHp), 5, hp / maxHp < 0.3 ? 0xc64c4c : 0x65a66f).setOrigin(0.5)
    this.layer.add([sprite, label, health])
  }

  /** Draft goblin sprite (32x40 source, drawn at integer 2x scale per AGENTS.md 7). Bottom-anchored at the same
   *  y+40 line actorCard's rectangle body uses, so label/health-bar layout below stays identical either path. */
  private enemySpriteCard(textureKey: string, name: string, hp: number, maxHp: number, x: number, y: number, down: boolean) {
    const sprite = this.add.image(x, y + 40, textureKey).setOrigin(0.5, 1).setScale(2)
    sprite.setTint(down ? 0x29252e : 0xffffff)
    const label = this.add.text(x, y + 49, name, { fontFamily: 'sans-serif', fontSize: '11px', color: '#f4ead2' }).setOrigin(0.5)
    const health = this.add.rectangle(x - 35 + 70 * (hp / maxHp) / 2, y + 65, 70 * (hp / maxHp), 5, hp / maxHp < 0.3 ? 0xc64c4c : 0x65a66f).setOrigin(0.5)
    this.layer.add([sprite, label, health])
  }

  private actorCard(name: string, hp: number, maxHp: number, x: number, y: number, color: number, down: boolean) {
    // TODO(MVP): Replace geometric actors with final pixel sprites.
    const body = this.add.rectangle(x, y, 70, 80, down ? 0x29252e : color).setStrokeStyle(2, 0xd2bf91)
    const head = this.add.rectangle(x, y - 50, 42, 34, down ? 0x29252e : color).setStrokeStyle(2, 0xd2bf91)
    const label = this.add.text(x, y + 49, name, { fontFamily: 'sans-serif', fontSize: '11px', color: '#f4ead2' }).setOrigin(0.5)
    const health = this.add.rectangle(x - 35 + 70 * (hp / maxHp) / 2, y + 65, 70 * (hp / maxHp), 5, hp / maxHp < 0.3 ? 0xc64c4c : 0x65a66f).setOrigin(0.5)
    this.layer.add([body, head, label, health])
  }

  private animateEvents(events: GameEvent[]) {
    if (events.some((event) => event.type === 'DAMAGE_APPLIED')) this.cameras.main.shake(90, 0.005)
    if (events.some((event) => event.type === 'DICE_ROLLED')) this.cameras.main.flash(80, 218, 184, 96, false)
    if (events.some((event) => event.type === 'STATUS_APPLIED')) this.cameras.main.flash(100, 214, 175, 61, false)
    this.rollQueue.push(...events.filter((event) => event.type === 'ROLL_RESOLVED' && event.finalDice))
    this.showNextRoll()
  }

  private showNextRoll() {
    if (this.showingRoll || this.destroyed || !this.diceOverlay) return
    const event = this.rollQueue.shift()
    if (!event?.finalDice) return
    this.showingRoll = true
    this.diceOverlay.removeAll(true)
    const width = Math.max(180, event.finalDice.length * 54 + 46)
    const background = this.add.rectangle(320, 178, width, 78, 0x17111d, 0.92).setStrokeStyle(2, 0xd7b860)
    const startX = 320 - ((event.finalDice.length - 1) * 54) / 2
    const dice = event.finalDice.flatMap((value, index) => {
      const box = this.add.rectangle(startX + index * 54, 166, 42, 42, 0xe7dcc0).setStrokeStyle(3, 0x17111d)
      const text = this.add.text(box.x, box.y, String(value), { fontFamily: 'monospace', fontSize: '23px', color: '#17111d' }).setOrigin(0.5)
      return [box, text]
    })
    const total = this.add.text(320, 205, `합계 ${event.rollTotal ?? 0}`, { fontFamily: 'monospace', fontSize: '11px', color: '#d7b860' }).setOrigin(0.5)
    this.diceOverlay.add([background, ...dice, total])
    this.rollTimer = this.time.delayedCall(1000, () => {
      this.diceOverlay.removeAll(true)
      this.showingRoll = false
      this.showNextRoll()
    })
  }
}
