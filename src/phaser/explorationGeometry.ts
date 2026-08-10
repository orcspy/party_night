export interface ScreenPoint {
  x: number
  y: number
}

export interface ScreenRect {
  x: number
  y: number
  width: number
  height: number
}

export interface DepthFrame {
  left: number
  right: number
  top: number
  bottom: number
}

export const LOGICAL_WIDTH = 640
export const LOGICAL_HEIGHT = 360

export const EXPLORATION_FRAMES: readonly DepthFrame[] = [
  { left: 70, right: 570, top: 62, bottom: 258 },
  { left: 166, right: 474, top: 92, bottom: 232 },
  { left: 238, right: 402, top: 120, bottom: 207 },
]

export const VANISH_POINT: ScreenPoint = { x: 320, y: 172 }
export const VANISH_FRAME: DepthFrame = { left: 284, right: 356, top: 148, bottom: 196 }
export const EXPLORATION_VIEWPORT = EXPLORATION_FRAMES[0]

export function farEdgeFor(depth: number): DepthFrame {
  return EXPLORATION_FRAMES[depth + 1] ?? VANISH_FRAME
}

export function wallQuadPoints(near: DepthFrame, far: DepthFrame, side: 'left' | 'right'): ScreenPoint[] {
  return side === 'left'
    ? [
        { x: near.left, y: near.top },
        { x: far.left, y: far.top },
        { x: far.left, y: far.bottom },
        { x: near.left, y: near.bottom },
      ]
    : [
        { x: near.right, y: near.top },
        { x: far.right, y: far.top },
        { x: far.right, y: far.bottom },
        { x: near.right, y: near.bottom },
      ]
}

const [nearFrame, middleFrame, farFrame] = EXPLORATION_FRAMES

export const CEILING_POLYGON: readonly ScreenPoint[] = [
  { x: nearFrame.left, y: nearFrame.top },
  { x: nearFrame.right, y: nearFrame.top },
  { x: middleFrame.right, y: middleFrame.top },
  { x: farFrame.right, y: farFrame.top },
  { x: VANISH_FRAME.right, y: VANISH_FRAME.top },
  { ...VANISH_POINT },
  { x: VANISH_FRAME.left, y: VANISH_FRAME.top },
  { x: farFrame.left, y: farFrame.top },
  { x: middleFrame.left, y: middleFrame.top },
]

export const FLOOR_POLYGON: readonly ScreenPoint[] = [
  { x: nearFrame.left, y: nearFrame.bottom },
  { x: middleFrame.left, y: middleFrame.bottom },
  { x: farFrame.left, y: farFrame.bottom },
  { x: VANISH_FRAME.left, y: VANISH_FRAME.bottom },
  { ...VANISH_POINT },
  { x: VANISH_FRAME.right, y: VANISH_FRAME.bottom },
  { x: farFrame.right, y: farFrame.bottom },
  { x: middleFrame.right, y: middleFrame.bottom },
  { x: nearFrame.right, y: nearFrame.bottom },
]

const viewportWidth = EXPLORATION_VIEWPORT.right - EXPLORATION_VIEWPORT.left
const viewportHeight = EXPLORATION_VIEWPORT.bottom - EXPLORATION_VIEWPORT.top

export const VIEWPORT_COVERS: readonly ScreenRect[] = [
  { x: 0, y: 0, width: LOGICAL_WIDTH, height: EXPLORATION_VIEWPORT.top },
  { x: 0, y: EXPLORATION_VIEWPORT.bottom, width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT - EXPLORATION_VIEWPORT.bottom },
  { x: 0, y: EXPLORATION_VIEWPORT.top, width: EXPLORATION_VIEWPORT.left, height: viewportHeight },
  { x: EXPLORATION_VIEWPORT.right, y: EXPLORATION_VIEWPORT.top, width: LOGICAL_WIDTH - EXPLORATION_VIEWPORT.right, height: viewportHeight },
]

export const EXPLORATION_DEPTHS = {
  viewportCover: 15,
  outerFrame: 16,
  marker: 20,
  ui: 50,
} as const

export function wallRenderDepthFor(depth: number, surface: 'side' | 'front'): number {
  return 2 + depth * 3 + (surface === 'side' ? 1 : 2)
}

export const MAX_WALL_RENDER_DEPTH = wallRenderDepthFor(EXPLORATION_FRAMES.length - 1, 'front')
export const EXPLORATION_VIEWPORT_SIZE = { width: viewportWidth, height: viewportHeight } as const
