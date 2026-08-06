import Phaser from 'phaser'
import { isWall } from '../game/exploration'
import type { Direction, GameState } from '../game/types'
import type { SceneBridge } from './PhaserGame'

const FORWARD: Record<Direction, [number, number]> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }
const RIGHT: Record<Direction, [number, number]> = { north: [1, 0], east: [0, 1], south: [-1, 0], west: [0, -1] }

export class ExplorationScene extends Phaser.Scene {
  private unsubscribe?: () => void
  private state: GameState
  private world!: Phaser.GameObjects.Graphics
  private location!: Phaser.GameObjects.Text

  constructor(private readonly bridge: SceneBridge) {
    super('exploration')
    this.state = bridge.store.getState()
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0b13')
    this.world = this.add.graphics()
    this.location = this.add.text(18, 16, '', { fontFamily: 'monospace', fontSize: '13px', color: '#d9c98c' })
    this.add.text(320, 22, 'TRAINING RUINS', { fontFamily: 'monospace', fontSize: '14px', color: '#746d89' }).setOrigin(0.5)
    this.makeButton(56, 288, '↶', () => this.bridge.store.dispatch({ type: 'TURN_LEFT' }))
    this.makeButton(136, 288, 'BACK', () => this.bridge.store.dispatch({ type: 'MOVE_BACKWARD' }))
    this.makeButton(504, 288, 'FWD', () => this.bridge.store.dispatch({ type: 'MOVE_FORWARD' }))
    this.makeButton(584, 288, '↷', () => this.bridge.store.dispatch({ type: 'TURN_RIGHT' }))
    this.unsubscribe = this.bridge.store.subscribe((state) => { this.state = state; this.drawWorld() })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.())
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unsubscribe?.())
    this.drawWorld()
  }

  private makeButton(x: number, y: number, label: string, action: () => void) {
    const button = this.add.rectangle(x, y, 68, 54, 0x242035).setStrokeStyle(2, 0xd4b45d).setInteractive({ useHandCursor: true })
    this.add.text(x, y, label, { fontFamily: 'monospace', fontSize: '16px', color: '#fff2c2' }).setOrigin(0.5)
    button.on('pointerdown', action)
  }

  private drawWorld() {
    const exploration = this.state.session?.exploration
    if (!exploration || !this.world) return
    const [fx, fy] = FORWARD[exploration.direction]
    const [rx, ry] = RIGHT[exploration.direction]
    const g = this.world.clear()
    g.fillStyle(0x171321).fillRect(0, 44, 640, 222)
    g.fillStyle(0x28213a).fillTriangle(0, 266, 640, 266, 320, 172)
    g.fillStyle(0x100f19).fillTriangle(0, 44, 640, 44, 320, 172)
    const frames = [
      { left: 70, right: 570, top: 62, bottom: 258 },
      { left: 166, right: 474, top: 92, bottom: 232 },
      { left: 238, right: 402, top: 120, bottom: 207 },
    ]
    for (let depth = 0; depth < 3; depth++) {
      const cx = exploration.x + fx * depth
      const cy = exploration.y + fy * depth
      const frame = frames[depth]
      const leftWall = isWall(cx - rx, cy - ry)
      const rightWall = isWall(cx + rx, cy + ry)
      const frontWall = isWall(cx + fx, cy + fy)
      g.lineStyle(3, 0x897a58, 1).strokeRect(frame.left, frame.top, frame.right - frame.left, frame.bottom - frame.top)
      if (leftWall) g.fillStyle(0x312944, 1).fillRect(frame.left, frame.top, depth === 0 ? 96 : 72, frame.bottom - frame.top)
      if (rightWall) g.fillStyle(0x312944, 1).fillRect(frame.right - (depth === 0 ? 96 : 72), frame.top, depth === 0 ? 96 : 72, frame.bottom - frame.top)
      if (frontWall) {
        g.fillStyle(0x3c324c, 1).fillRect(frame.left, frame.top, frame.right - frame.left, frame.bottom - frame.top)
        g.lineStyle(2, 0x665877, 1)
        for (let y = frame.top + 22; y < frame.bottom; y += 24) g.lineBetween(frame.left, y, frame.right, y)
        break
      }
    }
    this.location.setText(`POS ${exploration.x}:${exploration.y}  ${exploration.direction.toUpperCase()}`)
  }
}
