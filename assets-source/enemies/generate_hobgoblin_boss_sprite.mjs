import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', '..', 'src', 'assets', 'enemies')
mkdirSync(outDir, { recursive: true })

// ---- PNG encoder (same approach as the other assets-source scripts; self-contained, no new deps) ----

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8
  ihdrData[9] = 6
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0
  const ihdr = chunk('IHDR', ihdrData)

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = chunk('IDAT', deflateSync(raw, { level: 9 }))
  const iend = chunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, ihdr, idat, iend])
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function setPixel(buf, width, x, y, r, g, b, a) {
  const i = (y * width + x) * 4
  buf[i] = r
  buf[i + 1] = g
  buf[i + 2] = b
  buf[i + 3] = a
}

// ---- shape primitives (same technique as generate_goblin_sprites.mjs) ----

function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx
  const dy = (y - cy) / ry
  return dx * dx + dy * dy <= 1
}

function inRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x < x1 && y >= y0 && y < y1
}

function triSign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by)
}

function inTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = triSign(px, py, x1, y1, x2, y2)
  const d2 = triSign(px, py, x2, y2, x3, y3)
  const d3 = triSign(px, py, x3, y3, x1, y1)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

// 40x48 — 25% larger than the regular goblin_scout/goblin_guard canvas (32x40) in both dimensions, so the boss
// reads as bigger at the same 2x display scale (AGENTS.md 4.2: boss must differ in silhouette/size/gear/form,
// not just a tint on the same small body).
const W = 40
const H = 48
const OUTLINE = '#14100d'

function sampleTest(test, x, y) {
  return test(x + 0.5, y + 0.5)
}

const head = { cx: 20, cy: 11, rx: 7.5, ry: 7 }
const torso = { x0: 13, y0: 19, x1: 27, y1: 36 }
const belt = { x0: 13, y0: 30, x1: 27, y1: 33 }
const armL = { x0: 7, y0: 20, x1: 13, y1: 34 }
const armR = { x0: 27, y0: 20, x1: 33, y1: 34 }
const legL = { x0: 15, y0: 36, x1: 19, y1: 46 }
const legR = { x0: 21, y0: 36, x1: 25, y1: 46 }
const footL = { x0: 14, y0: 46, x1: 20, y1: 48 }
const footR = { x0: 20, y0: 46, x1: 26, y1: 48 }

const SKIN = '#4a6b2e'
const ARMOR_MAIN = '#43474d'
const ARMOR_TRIM = '#2c2f33'
const CAPE = '#5a1f1f'
const PAULDRON = '#8a8f96'
const CROWN = '#8a6a2a'
const WEAPON_WOOD = '#3a2a1a'
const WEAPON_METAL = '#9aa0a8'
const BOOT = '#1c1712'
const EYE = '#c94a3a'
const TUSK = '#e8dfc8'
const MOUTH = '#1c130a'

function earTriangles() {
  const { cx, cy, rx, ry } = head
  const earL = (x, y) => inTriangle(x, y, cx - rx * 0.95, cy - ry * 0.5, cx - rx * 2.0, cy - ry * 1.0, cx - rx * 1.6, cy - ry * 0.1) || inTriangle(x, y, cx - rx * 0.95, cy - ry * 0.5, cx - rx * 1.6, cy - ry * 0.1, cx - rx * 0.85, cy + ry * 0.5)
  const earR = (x, y) => inTriangle(x, y, cx + rx * 0.95, cy - ry * 0.5, cx + rx * 2.0, cy - ry * 1.0, cx + rx * 1.6, cy - ry * 0.1) || inTriangle(x, y, cx + rx * 0.95, cy - ry * 0.5, cx + rx * 1.6, cy - ry * 0.1, cx + rx * 0.85, cy + ry * 0.5)
  return [earL, earR]
}

function crownSpikes() {
  const { cx, cy, rx, ry } = head
  const top = cy - ry
  const spikes = [-0.5, 0, 0.5].map((offset) => {
    const sx = cx + rx * offset
    return (x, y) => inTriangle(x, y, sx - 2.2, top + 1, sx + 2.2, top + 1, sx, top - 6)
  })
  return (x, y) => spikes.some((test) => test(x, y))
}

function weaponParts() {
  // Two-handed sword on the weapon-hand (right) side: long tapered blade + crossguard + hilt. Replaces the
  // earlier spiked mace (sized down to a barely-legible blob at this scale, and the roster now has several
  // club-wielders) so hobgoblin_boss reads as a distinct "blade" silhouette (사용자 요청: 무기는 칼로 표현).
  const bladeTop = head.cy - 12
  const bladeBottom = armR.y1 + 2
  const blade = (x, y) => inRect(x, y, armR.x1 - 1, bladeTop, armR.x1 + 1, bladeBottom)
  const tip = (x, y) => inTriangle(x, y, armR.x1 - 1, bladeTop - 3, armR.x1 + 1, bladeTop - 3, armR.x1, bladeTop - 6)
  const guard = (x, y) => inRect(x, y, armR.x1 - 3, bladeBottom - 1, armR.x1 + 3, bladeBottom + 1)
  const hilt = (x, y) => inRect(x, y, armR.x1 - 1, bladeBottom + 1, armR.x1 + 1, bladeBottom + 5)
  return [
    { role: 'metal', test: (x, y) => blade(x, y) || tip(x, y) || guard(x, y) },
    { role: 'wood', test: hilt },
  ]
}

function buildParts() {
  const [earL, earR] = earTriangles()
  const parts = [
    // Cape drawn first (behind the body) and sized wider/taller than the whole silhouette so a visible border
    // shows on both sides and below the hem — a cape sized only to the torso previously got fully hidden behind
    // wider arms (see character sprite catalog notes on the same bug).
    { color: CAPE, test: (x, y) => inRect(x, y, armL.x0 - 4, head.cy + head.ry, armR.x1 + 4, legL.y1 + 3) },

    { color: SKIN, test: (x, y) => inEllipse(x, y, head.cx, head.cy, head.rx, head.ry) },
    { color: SKIN, test: earL },
    { color: SKIN, test: earR },
    { color: CROWN, test: crownSpikes() },

    { color: ARMOR_MAIN, test: (x, y) => inRect(x, y, torso.x0, torso.y0, torso.x1, torso.y1) },
    { color: ARMOR_TRIM, test: (x, y) => inRect(x, y, belt.x0, belt.y0, belt.x1, belt.y1) },

    { color: SKIN, test: (x, y) => inRect(x, y, armL.x0, armL.y0, armL.x1, armL.y1) },
    { color: SKIN, test: (x, y) => inRect(x, y, armR.x0, armR.y0, armR.x1, armR.y1) },
    // Spiked pauldrons on both shoulders, drawn after the bare arms so they sit on top like shoulder armor.
    { color: PAULDRON, test: (x, y) => inTriangle(x, y, armL.x0 - 1, armL.y0 + 2, armL.x1 + 2, armL.y0 - 3, armL.x1 + 2, armL.y0 + 6) },
    { color: PAULDRON, test: (x, y) => inTriangle(x, y, armR.x1 + 1, armR.y0 + 2, armR.x0 - 2, armR.y0 - 3, armR.x0 - 2, armR.y0 + 6) },

    { color: ARMOR_TRIM, test: (x, y) => inRect(x, y, legL.x0, legL.y0, legL.x1, legL.y1) },
    { color: ARMOR_TRIM, test: (x, y) => inRect(x, y, legR.x0, legR.y0, legR.x1, legR.y1) },
    { color: BOOT, test: (x, y) => inRect(x, y, footL.x0, footL.y0, footL.x1, footL.y1) },
    { color: BOOT, test: (x, y) => inRect(x, y, footR.x0, footR.y0, footR.x1, footR.y1) },
  ]
  for (const part of weaponParts()) parts.push({ color: part.role === 'wood' ? WEAPON_WOOD : WEAPON_METAL, test: part.test })
  return parts
}

function faceDetailParts() {
  const { cx, cy, rx, ry } = head
  return [
    { color: EYE, test: (x, y) => inRect(x, y, cx - rx * 0.55, cy - ry * 0.15, cx - rx * 0.18, cy + ry * 0.2) },
    { color: EYE, test: (x, y) => inRect(x, y, cx + rx * 0.18, cy - ry * 0.15, cx + rx * 0.55, cy + ry * 0.2) },
    { color: MOUTH, test: (x, y) => inRect(x, y, cx - rx * 0.4, cy + ry * 0.45, cx + rx * 0.4, cy + ry * 0.65) },
    { color: TUSK, test: (x, y) => inTriangle(x, y, cx - rx * 0.32, cy + ry * 0.55, cx - rx * 0.1, cy + ry * 0.55, cx - rx * 0.22, cy + ry * 0.85) },
    { color: TUSK, test: (x, y) => inTriangle(x, y, cx + rx * 0.1, cy + ry * 0.55, cx + rx * 0.32, cy + ry * 0.55, cx + rx * 0.22, cy + ry * 0.85) },
  ]
}

function renderBoss() {
  const parts = buildParts()
  const buf = Buffer.alloc(W * H * 4)
  const [outR, outG, outB] = hexToRgb(OUTLINE)
  const silhouette = (x, y) => parts.some((p) => sampleTest(p.test, x, y))

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!silhouette(x, y)) continue
      const isBoundary =
        x === 0 || y === 0 || x === W - 1 || y === H - 1 ||
        !silhouette(x - 1, y) || !silhouette(x + 1, y) || !silhouette(x, y - 1) || !silhouette(x, y + 1)
      if (isBoundary) {
        setPixel(buf, W, x, y, outR, outG, outB, 255)
        continue
      }
      let color = OUTLINE
      for (const part of parts) if (sampleTest(part.test, x, y)) color = part.color
      const [r, g, b] = hexToRgb(color)
      setPixel(buf, W, x, y, r, g, b, 255)
    }
  }

  for (const detail of faceDetailParts()) {
    const [r, g, b] = hexToRgb(detail.color)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (sampleTest(detail.test, x, y)) setPixel(buf, W, x, y, r, g, b, 255)
      }
    }
  }

  return buf
}

const data = renderBoss()
writeFileSync(join(outDir, 'hobgoblin_boss.png'), encodePNG(W, H, data))
console.log(`wrote hobgoblin_boss.png (${W}x${H})`)
