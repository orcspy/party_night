import { describe, expect, it } from 'vitest'
import {
  CEILING_POLYGON,
  EXPLORATION_DEPTHS,
  EXPLORATION_FRAMES,
  EXPLORATION_VIEWPORT,
  EXPLORATION_VIEWPORT_SIZE,
  FLOOR_POLYGON,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MAX_WALL_RENDER_DEPTH,
  VANISH_FRAME,
  VANISH_POINT,
  VIEWPORT_COVERS,
  farEdgeFor,
  wallQuadPoints,
  wallRenderDepthFor,
  type ScreenPoint,
} from '../phaser/explorationGeometry'

function hasSegment(points: readonly ScreenPoint[], first: ScreenPoint, second: ScreenPoint): boolean {
  return points.some((point, index) => {
    const next = points[(index + 1) % points.length]
    return (point.x === first.x && point.y === first.y && next.x === second.x && next.y === second.y)
      || (point.x === second.x && point.y === second.y && next.x === first.x && next.y === first.y)
  })
}

describe('exploration perspective geometry', () => {
  it('keeps the approved frames, virtual frame, and far-edge chain', () => {
    expect({ width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT }).toEqual({ width: 640, height: 360 })
    expect(EXPLORATION_FRAMES).toEqual([
      { left: 70, right: 570, top: 62, bottom: 258 },
      { left: 166, right: 474, top: 92, bottom: 232 },
      { left: 238, right: 402, top: 120, bottom: 207 },
    ])
    expect(VANISH_FRAME).toEqual({ left: 284, right: 356, top: 148, bottom: 196 })
    expect(VANISH_POINT).toEqual({ x: 320, y: 172 })
    expect(farEdgeFor(0)).toBe(EXPLORATION_FRAMES[1])
    expect(farEdgeFor(1)).toBe(EXPLORATION_FRAMES[2])
    expect(farEdgeFor(2)).toBe(VANISH_FRAME)
  })

  it('uses matching side-wall and floor-ceiling corner segments without mutating frames', () => {
    const near = { ...EXPLORATION_FRAMES[1] }
    const far = { ...EXPLORATION_FRAMES[2] }
    const before = JSON.stringify({ near, far })
    expect(wallQuadPoints(near, far, 'left')).toEqual([
      { x: 166, y: 92 }, { x: 238, y: 120 }, { x: 238, y: 207 }, { x: 166, y: 232 },
    ])
    expect(wallQuadPoints(near, far, 'right')).toEqual([
      { x: 474, y: 92 }, { x: 402, y: 120 }, { x: 402, y: 207 }, { x: 474, y: 232 },
    ])
    expect(JSON.stringify({ near, far })).toBe(before)

    expect(CEILING_POLYGON).toEqual([
      { x: 70, y: 62 }, { x: 570, y: 62 }, { x: 474, y: 92 }, { x: 402, y: 120 }, { x: 356, y: 148 },
      { x: 320, y: 172 }, { x: 284, y: 148 }, { x: 238, y: 120 }, { x: 166, y: 92 },
    ])
    expect(FLOOR_POLYGON).toEqual([
      { x: 70, y: 258 }, { x: 166, y: 232 }, { x: 238, y: 207 }, { x: 284, y: 196 }, { x: 320, y: 172 },
      { x: 356, y: 196 }, { x: 402, y: 207 }, { x: 474, y: 232 }, { x: 570, y: 258 },
    ])

    expect(hasSegment(CEILING_POLYGON, { x: 166, y: 92 }, { x: 238, y: 120 })).toBe(true)
    expect(hasSegment(CEILING_POLYGON, { x: 474, y: 92 }, { x: 402, y: 120 })).toBe(true)
    expect(hasSegment(FLOOR_POLYGON, { x: 166, y: 232 }, { x: 238, y: 207 })).toBe(true)
    expect(hasSegment(FLOOR_POLYGON, { x: 474, y: 232 }, { x: 402, y: 207 })).toBe(true)
    for (const corner of [{ x: 238, y: 120 }, { x: 402, y: 120 }]) expect(CEILING_POLYGON).toContainEqual(corner)
    for (const corner of [{ x: 238, y: 207 }, { x: 402, y: 207 }]) expect(FLOOR_POLYGON).toContainEqual(corner)
    for (const point of [...CEILING_POLYGON, ...FLOOR_POLYGON]) {
      expect(point.x).toBeGreaterThanOrEqual(EXPLORATION_VIEWPORT.left)
      expect(point.x).toBeLessThanOrEqual(EXPLORATION_VIEWPORT.right)
      expect(point.y).toBeGreaterThanOrEqual(EXPLORATION_VIEWPORT.top)
      expect(point.y).toBeLessThanOrEqual(EXPLORATION_VIEWPORT.bottom)
    }
  })

  it('covers only the viewport exterior between walls, markers, and UI depths', () => {
    expect(EXPLORATION_VIEWPORT_SIZE).toEqual({ width: 500, height: 196 })
    expect(VIEWPORT_COVERS).toEqual([
      { x: 0, y: 0, width: 640, height: 62 },
      { x: 0, y: 258, width: 640, height: 102 },
      { x: 0, y: 62, width: 70, height: 196 },
      { x: 570, y: 62, width: 70, height: 196 },
    ])
    for (const cover of VIEWPORT_COVERS) {
      expect(cover.x).toBeGreaterThanOrEqual(0)
      expect(cover.y).toBeGreaterThanOrEqual(0)
      expect(cover.x + cover.width).toBeLessThanOrEqual(LOGICAL_WIDTH)
      expect(cover.y + cover.height).toBeLessThanOrEqual(LOGICAL_HEIGHT)
      const overlapWidth = Math.max(0, Math.min(cover.x + cover.width, EXPLORATION_VIEWPORT.right) - Math.max(cover.x, EXPLORATION_VIEWPORT.left))
      const overlapHeight = Math.max(0, Math.min(cover.y + cover.height, EXPLORATION_VIEWPORT.bottom) - Math.max(cover.y, EXPLORATION_VIEWPORT.top))
      expect(overlapWidth * overlapHeight).toBe(0)
    }
    expect(wallRenderDepthFor(0, 'side')).toBe(3)
    expect(wallRenderDepthFor(1, 'front')).toBe(7)
    expect(wallRenderDepthFor(2, 'front')).toBe(10)
    expect(MAX_WALL_RENDER_DEPTH).toBe(10)
    expect(MAX_WALL_RENDER_DEPTH).toBeLessThan(EXPLORATION_DEPTHS.viewportCover)
    expect(EXPLORATION_DEPTHS.viewportCover).toBeLessThan(EXPLORATION_DEPTHS.outerFrame)
    expect(EXPLORATION_DEPTHS.outerFrame).toBeLessThan(EXPLORATION_DEPTHS.marker)
    expect(EXPLORATION_DEPTHS.marker).toBeLessThan(EXPLORATION_DEPTHS.ui)
  })
})
