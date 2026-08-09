import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', '..', 'src', 'assets', 'enemies')
mkdirSync(outDir, { recursive: true })

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

const W = 32
const H = 40
const OUTLINE = '#14100d'
const SKIN = '#5a8a3c'
const EYE = '#e8c34a'
const MOUTH = '#231a12'

// Sample at the pixel center so edge tests (ellipse/triangle) are consistent regardless of fill direction.
function sampleTest(test, x, y) {
  return test(x + 0.5, y + 0.5)
}

/**
 * A "part" is a hit-test plus a fill color. Parts are layered in array order (later parts painted over earlier
 * ones where they overlap), and their union forms the sprite silhouette used for the 1px outline pass below.
 */
function buildParts(variant) {
  const isGuard = variant === 'guard'
  const tunic = isGuard ? '#4d5258' : '#7a5c3a'
  const belt = isGuard ? '#2c2f33' : '#3b2a1a'
  const pants = isGuard ? '#26282b' : '#332a1c'
  const boot = isGuard ? '#141517' : '#1c1712'
  const wood = isGuard ? '#5c4128' : '#6b4a2a'
  const metal = isGuard ? '#b9c0c6' : '#c7cdd2'

  const parts = [
    { test: (x, y) => inEllipse(x, y, 16, 9, 6, 5.5), color: SKIN },
    // Ears as a single thin triangle used to be almost entirely eaten by the outline-erosion pass below (any
    // silhouette pixel touching background gets outlined), leaving no skin-colored interior — the ear read as a
    // bare 1px dark line that disappears against a dark dungeon background. A 4-point "leaf" quad (two triangles
    // sharing a diagonal, same technique as src/assets/characters/ earShapes()) keeps real width so the ear
    // interior renders in skin color, with only its true outer edge outlined.
    { test: (x, y) => inTriangle(x, y, 10.3, 6.25, 4, 3.5, 6.4, 8.45) || inTriangle(x, y, 10.3, 6.25, 6.4, 8.45, 10.9, 11.75), color: SKIN },
    { test: (x, y) => inTriangle(x, y, 21.7, 6.25, 28, 3.5, 25.6, 8.45) || inTriangle(x, y, 21.7, 6.25, 25.6, 8.45, 21.1, 11.75), color: SKIN },
    { test: (x, y) => inRect(x, y, 10, 15, 22, 28), color: tunic },
    { test: (x, y) => inRect(x, y, 10, 24, 22, 26), color: belt },
  ]

  if (isGuard) {
    parts.push({ test: (x, y) => inEllipse(x, y, 6, 21, 4.3, 6.8), color: '#8a8f96' })
    parts.push({ test: (x, y) => inEllipse(x, y, 6, 21, 3.3, 5.8), color: '#43474d' })
  } else {
    parts.push({ test: (x, y) => inRect(x, y, 6, 16, 10, 27), color: SKIN })
  }
  parts.push({ test: (x, y) => inRect(x, y, 22, 16, 26, 27), color: SKIN })

  parts.push({ test: (x, y) => inRect(x, y, 12, 28, 15, 37), color: pants })
  parts.push({ test: (x, y) => inRect(x, y, 17, 28, 20, 37), color: pants })
  parts.push({ test: (x, y) => inRect(x, y, 11, 37, 16, 39), color: boot })
  parts.push({ test: (x, y) => inRect(x, y, 16, 37, 21, 39), color: boot })

  if (isGuard) {
    parts.push({ test: (x, y) => inRect(x, y, 25, 2, 27, 30), color: wood })
    parts.push({ test: (x, y) => inTriangle(x, y, 23, 4, 29, 4, 26, 0), color: metal })
    parts.push({ test: (x, y) => inRect(x, y, 24, 29, 28, 31), color: metal })
  } else {
    parts.push({ test: (x, y) => inRect(x, y, 24, 19, 28, 22), color: wood })
    parts.push({ test: (x, y) => inRect(x, y, 25, 10, 27, 20), color: metal })
  }

  return parts
}

const FACE_DETAILS = [
  { test: (x, y) => inRect(x, y, 13, 8, 15, 10), color: EYE },
  { test: (x, y) => inRect(x, y, 18, 8, 20, 10), color: EYE },
  { test: (x, y) => inRect(x, y, 14, 12, 18, 13), color: MOUTH },
]

function makeGoblinSprite(variant) {
  const buf = Buffer.alloc(W * H * 4)
  const parts = buildParts(variant)
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
      let color = null
      for (const part of parts) if (sampleTest(part.test, x, y)) color = part.color
      const [r, g, b] = hexToRgb(color)
      setPixel(buf, W, x, y, r, g, b, 255)
    }
  }

  for (const detail of FACE_DETAILS) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!sampleTest(detail.test, x, y)) continue
        const [r, g, b] = hexToRgb(detail.color)
        setPixel(buf, W, x, y, r, g, b, 255)
      }
    }
  }

  return buf
}

const sprites = [
  { file: 'goblin_scout.png', data: makeGoblinSprite('scout') },
  { file: 'goblin_guard.png', data: makeGoblinSprite('guard') },
]

for (const s of sprites) {
  writeFileSync(join(outDir, s.file), encodePNG(W, H, s.data))
  console.log(`wrote ${s.file} (${W}x${H})`)
}
