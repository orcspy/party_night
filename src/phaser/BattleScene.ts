import Phaser from 'phaser'
import type { GameEvent, GameState } from '../game/types'
import type { SceneBridge } from './PhaserGame'

export class BattleScene extends Phaser.Scene {
  private unsubscribe?: () => void
  private state: GameState
  private layer!: Phaser.GameObjects.Container

  constructor(private readonly bridge: SceneBridge) {
    super('battle')
    this.state = bridge.store.getState()
  }

  create() {
    this.cameras.main.setBackgroundColor('#15101d')
    this.add.rectangle(320, 250, 640, 220, 0x21192a)
    this.add.rectangle(320, 110, 640, 4, 0x8f713d)
    this.add.text(320, 24, 'ENCOUNTER // GOBLIN PATROL', { fontFamily: 'monospace', fontSize: '15px', color: '#d7b860' }).setOrigin(0.5)
    this.layer = this.add.container(0, 0)
    this.unsubscribe = this.bridge.store.subscribe((state, events) => { this.state = state; this.renderActors(); this.animateEvents(events) })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.())
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unsubscribe?.())
    this.renderActors()
  }

  private renderActors() {
    const combat = this.state.session?.combat
    if (!combat || !this.layer) return
    this.layer.removeAll(true)
    const party = combat.participants.filter((actor) => actor.side === 'party')
    const enemies = combat.participants.filter((actor) => actor.side === 'enemy')
    party.forEach((actor, index) => this.actorCard(actor.name, actor.currentHp, actor.maxHp, 72 + index * 102, 255, 0x3d6485, actor.currentHp <= 0))
    enemies.forEach((actor, index) => this.actorCard(actor.name, actor.currentHp, actor.maxHp, 440 + index * 130, 160 + index * 42, 0x7b3f46, actor.currentHp <= 0))
    const pending = combat.pendingRoll
    if (pending) pending.dice.forEach((die, index) => {
      const box = this.add.rectangle(270 + index * 54, 178, 42, 42, die.rerolled ? 0xd49a49 : 0xe7dcc0).setStrokeStyle(3, 0x17111d)
      const text = this.add.text(box.x, box.y, String(die.value), { fontFamily: 'monospace', fontSize: '23px', color: '#17111d' }).setOrigin(0.5)
      this.layer.add([box, text])
    })
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
  }
}
