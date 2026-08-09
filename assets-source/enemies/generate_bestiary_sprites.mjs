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

// ---- shape primitives (same technique as generate_goblin_sprites.mjs / generate_hobgoblin_boss_sprite.mjs) ----

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

const OUTLINE = '#14100d'

function sampleTest(test, x, y) {
  return test(x + 0.5, y + 0.5)
}

// ---- 3-tier body skeletons (일반/미드보스/보스). 일반 and 보스 reuse the exact coordinates already validated in
// generate_goblin_sprites.mjs (32x40) and generate_hobgoblin_boss_sprite.mjs (40x48); 미드보스 is a new
// in-between size (36x44) built with the same proportions. Feet always end at the canvas bottom - 2px so every
// tier stands on the same relative ground line regardless of height (same principle as the party character
// generator's body presets). ----

const TIERS = {
  small: {
    W: 32, H: 40,
    geo: {
      head: { cx: 16, cy: 9, rx: 6, ry: 5.5 },
      torso: { x0: 10, y0: 15, x1: 22, y1: 28 },
      belt: { x0: 10, y0: 24, x1: 22, y1: 26 },
      armL: { x0: 6, y0: 16, x1: 10, y1: 27 },
      armR: { x0: 22, y0: 16, x1: 26, y1: 27 },
      legL: { x0: 12, y0: 28, x1: 15, y1: 37 },
      legR: { x0: 17, y0: 28, x1: 20, y1: 37 },
      footL: { x0: 11, y0: 37, x1: 16, y1: 39 },
      footR: { x0: 16, y0: 37, x1: 21, y1: 39 },
    },
  },
  medium: {
    W: 36, H: 44,
    geo: {
      head: { cx: 18, cy: 10, rx: 6.75, ry: 6.2 },
      torso: { x0: 11, y0: 17, x1: 25, y1: 32 },
      belt: { x0: 11, y0: 26, x1: 25, y1: 28.5 },
      armL: { x0: 6.5, y0: 18, x1: 11, y1: 31 },
      armR: { x0: 25, y0: 18, x1: 29.5, y1: 31 },
      legL: { x0: 13.5, y0: 32, x1: 17, y1: 41 },
      legR: { x0: 19, y0: 32, x1: 22.5, y1: 41 },
      footL: { x0: 12.5, y0: 41, x1: 18, y1: 43.5 },
      footR: { x0: 18, y0: 41, x1: 23.5, y1: 43.5 },
    },
  },
  large: {
    W: 40, H: 48,
    geo: {
      head: { cx: 20, cy: 11, rx: 7.5, ry: 7 },
      torso: { x0: 13, y0: 19, x1: 27, y1: 36 },
      belt: { x0: 13, y0: 30, x1: 27, y1: 33 },
      armL: { x0: 7, y0: 20, x1: 13, y1: 34 },
      armR: { x0: 27, y0: 20, x1: 33, y1: 34 },
      legL: { x0: 15, y0: 36, x1: 19, y1: 46 },
      legR: { x0: 21, y0: 36, x1: 25, y1: 46 },
      footL: { x0: 14, y0: 46, x1: 20, y1: 48 },
      footR: { x0: 20, y0: 46, x1: 26, y1: 48 },
    },
  },
}

// ---- reusable feature shapes (all take head/geo and return a hit-test function) ----

/** 4-point "leaf" quad (two triangles sharing a diagonal) — keeps real width so pointed ears render with skin
 *  color instead of being eaten by the outline-erosion pass (see goblin/character ear fix history). */
function earQuad(head, sign) {
  const { cx, cy, rx, ry } = head
  const a = { x: cx + sign * rx * 0.95, y: cy - ry * 0.5 }
  const b = { x: cx + sign * rx * 2.0, y: cy - ry * 1.0 }
  const c = { x: cx + sign * rx * 1.6, y: cy - ry * 0.1 }
  const d = { x: cx + sign * rx * 0.85, y: cy + ry * 0.5 }
  return (x, y) => inTriangle(x, y, a.x, a.y, b.x, b.y, c.x, c.y) || inTriangle(x, y, a.x, a.y, c.x, c.y, d.x, d.y)
}

function tusksShape(head) {
  const { cx, cy, rx, ry } = head
  return (x, y) =>
    inTriangle(x, y, cx - rx * 0.32, cy + ry * 0.55, cx - rx * 0.1, cy + ry * 0.55, cx - rx * 0.22, cy + ry * 0.9) ||
    inTriangle(x, y, cx + rx * 0.1, cy + ry * 0.55, cx + rx * 0.32, cy + ry * 0.55, cx + rx * 0.22, cy + ry * 0.9)
}

/**
 * A shape that tapers all the way to a point is almost entirely eaten by the outline-erosion pass (same failure
 * mode fixed for ears/elf ears earlier) — the closer to the tip, the thinner the cross-section, until it's <1px
 * wide and reads as pure outline with no fill color. A trapezoid (wide base, still-non-zero-width tip, angled
 * outward by `curveOut`) keeps a real cross-section along its *entire* length, not just near the base, unlike a
 * base-to-point triangle/quad.
 */
function hornsShape(head, curved) {
  const { cx, cy, rx, ry } = head
  const top = cy - ry
  const mk = (sign, spread, curveOut, length, halfBase, halfTip) => {
    const bx = cx + sign * rx * spread
    const a = { x: bx - halfBase, y: top + 1.5 }
    const b = { x: bx + halfBase, y: top + 1.5 }
    const tipX = bx + sign * curveOut
    const c = { x: tipX + halfTip, y: top - length }
    const d = { x: tipX - halfTip, y: top - length }
    return (x, y) => inTriangle(x, y, a.x, a.y, b.x, b.y, c.x, c.y) || inTriangle(x, y, a.x, a.y, c.x, c.y, d.x, d.y)
  }
  if (!curved) {
    const l = mk(-1, 0.5, 1.2, 4.5, 1.8, 0.9)
    const r = mk(1, 0.5, 1.2, 4.5, 1.8, 0.9)
    return (x, y) => l(x, y) || r(x, y)
  }
  const l = mk(-1, 0.7, 2.5, 7, 2.4, 1.1)
  const r = mk(1, 0.7, 2.5, 7, 2.4, 1.1)
  return (x, y) => l(x, y) || r(x, y)
}

function wingsShape(geo) {
  const { armL, armR, head } = geo
  const topY = head.cy
  return (x, y) =>
    inTriangle(x, y, armL.x0, topY, armL.x0 - 6, topY + 2, armL.x0, armL.y0 + 4) ||
    inTriangle(x, y, armR.x1, topY, armR.x1 + 6, topY + 2, armR.x1, armR.y0 + 4)
}

function crownSpikesShape(head) {
  const { cx, cy, rx, ry } = head
  const top = cy - ry
  const spikes = [-0.5, 0, 0.5].map((o) => {
    const sx = cx + rx * o
    return (x, y) => inTriangle(x, y, sx - 2.2, top + 1, sx + 2.2, top + 1, sx, top - 6)
  })
  return (x, y) => spikes.some((t) => t(x, y))
}

/** Sized wider/taller than the arm span + leg bottom on purpose — a cape sized only to the torso gets fully
 *  hidden behind wider arms (lesson from the party character sprite cape bug). */
function capeWideShape(geo) {
  const { armL, armR, head, legL } = geo
  return (x, y) => inRect(x, y, armL.x0 - 4, head.cy + head.ry, armR.x1 + 4, legL.y1 + 3)
}

// ---- reusable body + weapon builders ----

function bodyParts(geo, opts) {
  const { head, torso, belt, armL, armR, legL, legR, footL, footR } = geo
  const parts = [{ color: opts.skinColor, test: (x, y) => inEllipse(x, y, head.cx, head.cy, head.rx, head.ry) }]
  if (opts.earStyle === 'pointed') {
    parts.push({ color: opts.skinColor, test: earQuad(head, -1) })
    parts.push({ color: opts.skinColor, test: earQuad(head, 1) })
  }
  parts.push({ color: opts.armorMain, test: (x, y) => inRect(x, y, torso.x0, torso.y0, torso.x1, torso.y1) })
  parts.push({ color: opts.armorTrim, test: (x, y) => inRect(x, y, belt.x0, belt.y0, belt.x1, belt.y1) })
  const sleeveColor = opts.sleeveRole === 'armorTrim' ? opts.armorTrim : opts.skinColor
  parts.push({ color: sleeveColor, test: (x, y) => inRect(x, y, armL.x0, armL.y0, armL.x1, armL.y1) })
  parts.push({ color: sleeveColor, test: (x, y) => inRect(x, y, armR.x0, armR.y0, armR.x1, armR.y1) })
  parts.push({ color: opts.armorTrim, test: (x, y) => inRect(x, y, legL.x0, legL.y0, legL.x1, legL.y1) })
  parts.push({ color: opts.armorTrim, test: (x, y) => inRect(x, y, legR.x0, legR.y0, legR.x1, legR.y1) })
  const footColor = opts.bareFeet ? opts.skinColor : opts.bootColor
  parts.push({ color: footColor, test: (x, y) => inRect(x, y, footL.x0, footL.y0, footL.x1, footL.y1) })
  parts.push({ color: footColor, test: (x, y) => inRect(x, y, footR.x0, footR.y0, footR.x1, footR.y1) })
  return parts
}

function faceParts(head, eyeColor, opts = {}) {
  const { cx, cy, rx, ry } = head
  if (opts.singleEye) {
    return [
      { color: eyeColor, test: (x, y) => inEllipse(x, y, cx, cy - ry * 0.05, rx * 0.32, ry * 0.32) },
      // Pupil, drawn on top of the iris (same overlay pass, later entries win) — a flat iris circle alone read
      // as a blank disc rather than an eye (사용자 요청: 눈동자 표현 추가).
      { color: opts.pupilColor || '#1c0d0a', test: (x, y) => inEllipse(x, y, cx, cy - ry * 0.05, rx * 0.13, ry * 0.13) },
    ]
  }
  const parts = [
    { color: eyeColor, test: (x, y) => inRect(x, y, cx - rx * 0.5, cy - ry * 0.2, cx - rx * 0.15, cy + ry * 0.2) },
    { color: eyeColor, test: (x, y) => inRect(x, y, cx + rx * 0.15, cy - ry * 0.2, cx + rx * 0.5, cy + ry * 0.2) },
  ]
  if (!opts.noMouth) parts.push({ color: opts.mouthColor || '#1c130a', test: (x, y) => inRect(x, y, cx - rx * 0.35, cy + ry * 0.5, cx + rx * 0.35, cy + ry * 0.65) })
  return parts
}

function swordShieldParts(geo, wood, metal, shield) {
  const { head: h, armR: aR, armL: aL } = geo
  return [
    { color: metal, test: (x, y) => inRect(x, y, aR.x1 - 1, h.cy - 3, aR.x1 + 1, aR.y1 + 3) },
    { color: wood, test: (x, y) => inRect(x, y, aR.x1 - 2, aR.y1 + 2, aR.x1 + 2, aR.y1 + 5) },
    { color: shield, test: (x, y) => inEllipse(x, y, aL.x0 - 2, (aL.y0 + aL.y1) / 2, 3, 6) },
  ]
}

function daggerPairParts(geo, metal) {
  const { armL: aL, armR: aR } = geo
  return [
    { color: metal, test: (x, y) => inRect(x, y, aR.x0, aR.y0 - 3, aR.x1, aR.y0 + 3) },
    { color: metal, test: (x, y) => inRect(x, y, aL.x0, aL.y0 - 3, aL.x1, aL.y0 + 3) },
  ]
}

function axeParts(geo, wood, metal, double) {
  const { armR: aR, head: h } = geo
  const haftTop = h.cy - 4
  const haftBottom = aR.y1 + 4
  const bladeY = haftTop + 3
  const parts = [{ color: wood, test: (x, y) => inRect(x, y, aR.x1 - 1, haftTop, aR.x1 + 1, haftBottom) }]
  parts.push({ color: metal, test: (x, y) => inTriangle(x, y, aR.x1 + 1, bladeY - 4, aR.x1 + 1, bladeY + 4, aR.x1 + 7, bladeY) })
  if (double) parts.push({ color: metal, test: (x, y) => inTriangle(x, y, aR.x1 - 1, bladeY - 4, aR.x1 - 1, bladeY + 4, aR.x1 - 7, bladeY) })
  return parts
}

function clubParts(geo, wood, metal, spiky, opts = {}) {
  const { armR: aR, head: h } = geo
  const haftHalf = opts.haftHalf || 1
  const headRadius = opts.headRadius || 4
  const haft = (x, y) => inRect(x, y, aR.x1 - haftHalf, h.cy - 8, aR.x1 + haftHalf, aR.y1 + 4)
  const headCx = aR.x1
  const headCy = h.cy - 8
  const core = (x, y) => inEllipse(x, y, headCx, headCy, headRadius, headRadius)
  const parts = [{ color: wood, test: haft }]
  if (!spiky) { parts.push({ color: metal, test: core }); return parts }
  const s = headRadius / 4
  const spikeUp = (x, y) => inTriangle(x, y, headCx - 1.6 * s, headCy - 3 * s, headCx + 1.6 * s, headCy - 3 * s, headCx, headCy - 8 * s)
  const spikeDown = (x, y) => inTriangle(x, y, headCx - 1.6 * s, headCy + 3 * s, headCx + 1.6 * s, headCy + 3 * s, headCx, headCy + 8 * s)
  const spikeLeft = (x, y) => inTriangle(x, y, headCx - 3 * s, headCy - 1.6 * s, headCx - 3 * s, headCy + 1.6 * s, headCx - 8 * s, headCy)
  const spikeRight = (x, y) => inTriangle(x, y, headCx + 3 * s, headCy - 1.6 * s, headCx + 3 * s, headCy + 1.6 * s, headCx + 8 * s, headCy)
  parts.push({ color: metal, test: (x, y) => core(x, y) || spikeUp(x, y) || spikeDown(x, y) || spikeLeft(x, y) || spikeRight(x, y) })
  return parts
}

/** Blocky rectangular hammer head (vs. club's round knob / axe's triangular blade) — a distinct third weapon
 *  silhouette for minotaur_boss (사용자 요청: 큰 워해머). */
function warhammerParts(geo, wood, metal) {
  const { armR: aR, head: h } = geo
  const haftTop = h.cy - 6
  const haftBottom = aR.y1 + 6
  const haft = (x, y) => inRect(x, y, aR.x1 - 1, haftTop, aR.x1 + 1, haftBottom)
  const headCy = haftTop
  const head1 = (x, y) => inRect(x, y, aR.x1 - 5, headCy - 4, aR.x1 + 5, headCy + 4)
  return [
    { color: wood, test: haft },
    { color: metal, test: head1 },
  ]
}

function staffOrbParts(geo, wood, orb) {
  const { armR: aR, head: h, torso: t } = geo
  // +1 (not -6): on the large tier, head.cy-head.ry is already close to y=0, so extending the rod 6px further up
  // pushed the orb's whole footprint above the canvas top (invisible). Keeping the rod short and just above the
  // head keeps the orb on-canvas across all tiers.
  const rodTop = h.cy - h.ry + 1
  const rodBottom = t.y1 + 8
  return [
    { color: wood, test: (x, y) => inRect(x, y, aR.x1 - 1, rodTop, aR.x1 + 1, rodBottom) },
    { color: orb, test: (x, y) => inEllipse(x, y, aR.x1, rodTop - 1, 2.5, 2.5) },
  ]
}

// ---- creature definitions. enemy_id matches raw_data_table.md 22.9; tier follows the role column there
// (일반=small, midboss=medium, boss/boss+midboss dual=large) so difficulty reads via silhouette size, not
// just color (AGENTS.md 8항). ----

const CREATURES = [
  {
    id: 'orc_raider', tier: 'small',
    build: (geo) => [
      ...bodyParts(geo, { skinColor: '#6b7a3a', earStyle: 'none', armorMain: '#4a3826', armorTrim: '#2c2015', sleeveRole: 'skin', bootColor: '#1c1712', bareFeet: false }),
      { color: '#6b7a3a', test: tusksShape(geo.head) },
      ...axeParts(geo, '#5c4128', '#b9c0c6', false),
    ],
    face: (head) => faceParts(head, '#d4a83a'),
  },
  {
    id: 'kobold_skirmisher', tier: 'small',
    build: (geo) => [
      ...bodyParts(geo, { skinColor: '#8a5a3a', earStyle: 'pointed', armorMain: '#5c4128', armorTrim: '#3b2a1a', sleeveRole: 'skin', bootColor: '#1c1712', bareFeet: false }),
      ...daggerPairParts(geo, '#c7cdd2'),
    ],
    face: (head) => faceParts(head, '#c9d84a'),
  },
  {
    id: 'skeleton_soldier', tier: 'small',
    build: (geo) => [
      ...bodyParts(geo, { skinColor: '#d8cfc0', earStyle: 'none', armorMain: '#5c5040', armorTrim: '#3a3226', sleeveRole: 'skin', bootColor: '#3a3226', bareFeet: false }),
      ...swordShieldParts(geo, '#4a3626', '#9aa0a8', '#5c5040'),
    ],
    face: (head) => faceParts(head, '#0a0805', { mouthColor: '#0a0805' }),
  },
  {
    id: 'zombie', tier: 'small',
    build: (geo) => bodyParts(geo, { skinColor: '#5a6b4a', earStyle: 'none', armorMain: '#3a4a2e', armorTrim: '#232e1c', sleeveRole: 'skin', bootColor: '#1c2016', bareFeet: false }),
    face: (head) => faceParts(head, '#8a9478', { mouthColor: '#1c130a' }),
  },
  {
    id: 'imp', tier: 'small',
    build: (geo) => [
      ...bodyParts(geo, { skinColor: '#8a2f2f', earStyle: 'none', armorMain: '#241414', armorTrim: '#180d0d', sleeveRole: 'skin', bootColor: '#180d0d', bareFeet: false }),
      { color: '#8a2f2f', test: hornsShape(geo.head, false) },
      { color: '#5c1f1f', test: wingsShape(geo) },
      { color: '#b9c0c6', test: (x, y) => inRect(x, y, geo.armR.x0, geo.armR.y0 - 3, geo.armR.x1, geo.armR.y0 + 3) },
    ],
    face: (head) => faceParts(head, '#e8c34a'),
  },
  {
    id: 'gnoll_brute', tier: 'medium',
    build: (geo) => [
      ...bodyParts(geo, { skinColor: '#8a6b45', earStyle: 'pointed', armorMain: '#4a3826', armorTrim: '#2c2015', sleeveRole: 'skin', bootColor: '#1c1712', bareFeet: false }),
      ...clubParts(geo, '#3a2a1a', '#9aa0a8', false),
    ],
    face: (head) => faceParts(head, '#d4a83a'),
  },
  {
    id: 'ghoul', tier: 'medium',
    build: (geo) => bodyParts(geo, { skinColor: '#5a6355', earStyle: 'none', armorMain: '#2e2620', armorTrim: '#1c1712', sleeveRole: 'skin', bootColor: '#1c1712', bareFeet: true }),
    face: (head) => faceParts(head, '#c9d8a0', { noMouth: true }),
  },
  {
    id: 'wraith', tier: 'medium',
    build: (geo) => {
      const hood = '#1c1620'
      const robe = '#2a2035'
      const trim = '#3a2d4a'
      const { head, torso, belt, armL, armR, legL, legR } = geo
      return [
        { color: hood, test: (x, y) => inEllipse(x, y, head.cx, head.cy, head.rx, head.ry) },
        { color: robe, test: (x, y) => inRect(x, y, torso.x0, torso.y0, torso.x1, torso.y1) },
        { color: trim, test: (x, y) => inRect(x, y, belt.x0, belt.y0, belt.x1, belt.y1) },
        { color: robe, test: (x, y) => inRect(x, y, armL.x0, armL.y0, armL.x1, armL.y1) },
        { color: robe, test: (x, y) => inRect(x, y, armR.x0, armR.y0, armR.x1, armR.y1) },
        { color: robe, test: (x, y) => inRect(x, y, legL.x0, legL.y0, legL.x1, legL.y1) },
        { color: robe, test: (x, y) => inRect(x, y, legR.x0, legR.y0, legR.x1, legR.y1) },
      ]
    },
    face: (head) => faceParts(head, '#8ecfd8', { noMouth: true }),
  },
  {
    id: 'ogre', tier: 'large',
    build: (geo) => [
      ...bodyParts(geo, { skinColor: '#8a7a5a', earStyle: 'none', armorMain: '#4a3826', armorTrim: '#2c2015', sleeveRole: 'skin', bootColor: '#1c1712', bareFeet: true }),
      { color: '#8a7a5a', test: tusksShape(geo.head) },
      ...clubParts(geo, '#3a2a1a', '#9aa0a8', false),
    ],
    face: (head) => faceParts(head, '#4a3a2a'),
  },
  {
    id: 'minotaur_boss', tier: 'large',
    build: (geo) => [
      ...bodyParts(geo, { skinColor: '#5c4530', earStyle: 'none', armorMain: '#3a2a1a', armorTrim: '#241a10', sleeveRole: 'skin', bootColor: '#1c1712', bareFeet: true }),
      // 붉은 뿔(사용자 요청) — was bone-white, now a deep red distinct from the eye's brighter red.
      { color: '#a5302a', test: hornsShape(geo.head, true) },
      ...warhammerParts(geo, '#3a2a1a', '#9aa0a8'),
    ],
    face: (head) => faceParts(head, '#c94a3a'),
  },
  {
    id: 'lich_boss', tier: 'large',
    build: (geo) => {
      const { head } = geo
      return [
        ...bodyParts(geo, { skinColor: '#d8cfc0', earStyle: 'none', armorMain: '#3a2050', armorTrim: '#241238', sleeveRole: 'skin', bootColor: '#241238', bareFeet: false }),
        { color: '#3a2050', test: (x, y) => inTriangle(x, y, head.cx - head.rx - 1, head.cy - head.ry + 1, head.cx + head.rx + 1, head.cy - head.ry + 1, head.cx, head.cy - head.ry - 5) },
        // Teal orb (was light purple, which blended into the purple robe) for a staff top that stays visible
        // against the robe — same "arcane" accent color used for the mage class in the party character sprites.
        ...staffOrbParts(geo, '#2a1c38', '#7fd8c0'),
      ]
    },
    face: (head) => faceParts(head, '#b06fd8', { noMouth: true }),
  },
  {
    id: 'cyclops_boss', tier: 'large',
    build: (geo) => [
      ...bodyParts(geo, { skinColor: '#7a6a52', earStyle: 'none', armorMain: '#4a3a28', armorTrim: '#2c2015', sleeveRole: 'skin', bootColor: '#1c1712', bareFeet: true }),
      // 큰 몽둥이(사용자 요청) — bigger head radius + thicker haft than the other club-wielders.
      ...clubParts(geo, '#3a2a1a', '#8a8f96', false, { headRadius: 6, haftHalf: 1.5 }),
    ],
    face: (head) => faceParts(head, '#c94a3a', { singleEye: true, pupilColor: '#1c0d0a' }),
  },
  {
    id: 'skeleton_king_boss', tier: 'large',
    build: (geo) => [
      { color: '#2a2a5a', test: capeWideShape(geo) },
      ...bodyParts(geo, { skinColor: '#d8cfc0', earStyle: 'none', armorMain: '#6b5c3a', armorTrim: '#3a3226', sleeveRole: 'skin', bootColor: '#3a3226', bareFeet: false }),
      { color: '#c9a83d', test: crownSpikesShape(geo.head) },
      // 무기를 금색으로(사용자 요청) — blade was silver (#b9c0c6), now gold to match the crown/shield.
      ...swordShieldParts(geo, '#3a2a1a', '#e8c34a', '#c9a83d'),
    ],
    face: (head) => faceParts(head, '#c94a3a', { mouthColor: '#0a0805' }),
  },
]

function renderCreature(tier, build, face) {
  const { W, H, geo } = TIERS[tier]
  const parts = build(geo)
  const buf = Buffer.alloc(W * H * 4)
  const [outR, outG, outB] = hexToRgb(OUTLINE)
  const silhouette = (x, y) => parts.some((p) => sampleTest(p.test, x, y))

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!silhouette(x, y)) continue
      const isBoundary =
        x === 0 || y === 0 || x === W - 1 || y === H - 1 ||
        !silhouette(x - 1, y) || !silhouette(x + 1, y) || !silhouette(x, y - 1) || !silhouette(x, y + 1)
      if (isBoundary) { setPixel(buf, W, x, y, outR, outG, outB, 255); continue }
      let color = OUTLINE
      for (const part of parts) if (sampleTest(part.test, x, y)) color = part.color
      const [r, g, b] = hexToRgb(color)
      setPixel(buf, W, x, y, r, g, b, 255)
    }
  }

  for (const detail of face(geo.head)) {
    const [r, g, b] = hexToRgb(detail.color)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (sampleTest(detail.test, x, y)) setPixel(buf, W, x, y, r, g, b, 255)
      }
    }
  }

  return { W, H, data: buf }
}

for (const creature of CREATURES) {
  const { W, H, data } = renderCreature(creature.tier, creature.build, creature.face)
  const file = `${creature.id}.png`
  writeFileSync(join(outDir, file), encodePNG(W, H, data))
  console.log(`wrote ${file} (${W}x${H}, tier=${creature.tier})`)
}
