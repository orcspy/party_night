import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', '..', 'src', 'assets', 'characters')
mkdirSync(outDir, { recursive: true })

// ---- PNG encoder (same approach as assets-source/terrain, assets-source/enemies; self-contained, no new deps) ----

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

// ---- shape primitives (same technique as assets-source/enemies/generate_goblin_sprites.mjs) ----

function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx
  const dy = (y - cy) / ry
  return dx * dx + dy * dy <= 1
}

function inRing(x, y, cx, cy, rx, ry, innerRx, innerRy) {
  return inEllipse(x, y, cx, cy, rx, ry) && !inEllipse(x, y, cx, cy, innerRx, innerRy)
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
const FACE = '#231a12'
const BOOT = '#1c1712'

// Sample at the pixel center so edge tests are consistent regardless of fill direction.
function sampleTest(test, x, y) {
  return test(x + 0.5, y + 0.5)
}

// ---- race / class / gender / player-slot data tables (asset-authoring only; not game balance data) ----

const RACE_IDS = ['human', 'elf', 'dwarf', 'halfling']
const CLASS_IDS = ['warrior', 'rogue', 'archer', 'paladin', 'priest', 'mage']
const GENDERS = ['male', 'female', 'neutral']
const SLOTS = [1, 2, 3, 4]

const RACE_TRAITS = {
  human: { skin: '#d9a66c', hair: '#4a3626', bodyPreset: 'standard', ears: 'round', beard: false, bareFeet: false },
  elf: { skin: '#e8d2ae', hair: '#c9b26a', bodyPreset: 'standard', ears: 'pointed', beard: false, bareFeet: false },
  dwarf: { skin: '#c98a5e', hair: '#6b3a24', bodyPreset: 'short', ears: 'round', beard: true, bareFeet: false },
  halfling: { skin: '#e3b98c', hair: '#5b4028', bodyPreset: 'short', ears: 'round', beard: false, bareFeet: true },
}

const CLASS_TRAITS = {
  warrior: { primary: '#5b5f66', secondary: '#3b2a1a', weaponWood: '#6b4a2a', weaponMetal: '#c7cdd2', sleeve: 'class_trim', weapon: 'sword_shield' },
  rogue: { primary: '#3a3a42', secondary: '#23232a', weaponWood: '#4a3626', weaponMetal: '#b9c0c6', sleeve: 'skin', weapon: 'daggers', headwear: 'hood' },
  archer: { primary: '#4f6b3a', secondary: '#5c4128', weaponWood: '#6b4a2a', weaponMetal: '#c7cdd2', sleeve: 'skin', weapon: 'bow' },
  paladin: { primary: '#cfc9a8', secondary: '#b98b3d', weaponWood: '#b98b3d', weaponMetal: '#e8e2c8', sleeve: 'class_trim', weapon: 'sword_shield' },
  priest: { primary: '#dce4ea', secondary: '#5d7a99', weaponWood: '#e8dfc8', weaponMetal: '#e8c34a', sleeve: 'class_main', weapon: 'staff_holy' },
  mage: { primary: '#4b3d6b', secondary: '#2e2645', weaponWood: '#4a3626', weaponMetal: '#7fd8c0', sleeve: 'class_main', weapon: 'staff_orb', headwear: 'hat' },
}

/** 1P-4P party-slot accent color (cape) — the only role recolored per slot; disambiguates party members whose
 *  race+class+gender combo collides (e.g. main character also picks 'warrior'). Class/race colors stay fixed. */
const SLOT_PALETTE = { 1: '#3d6485', 2: '#a2453f', 3: '#4f8f5b', 4: '#c9a23d' }

function bodyGeometry(preset) {
  if (preset === 'standard') {
    return {
      head: { cx: 16, cy: 9, rx: 6, ry: 5.5 },
      torso: { x0: 10, y0: 15, x1: 22, y1: 28 },
      belt: { x0: 10, y0: 24, x1: 22, y1: 26 },
      armL: { x0: 6, y0: 16, x1: 10, y1: 27 },
      armR: { x0: 22, y0: 16, x1: 26, y1: 27 },
      legL: { x0: 12, y0: 28, x1: 15, y1: 37 },
      legR: { x0: 17, y0: 28, x1: 20, y1: 37 },
      footL: { x0: 11, y0: 37, x1: 16, y1: 39 },
      footR: { x0: 16, y0: 37, x1: 21, y1: 39 },
    }
  }
  // 'short': dwarf/halfling. Head/torso shift down and enlarge; legs stay anchored to the same y=37..39 foot
  // line as 'standard' so every race stands on the same ground line regardless of height.
  return {
    head: { cx: 16, cy: 12, rx: 6.5, ry: 6 },
    torso: { x0: 9, y0: 18, x1: 23, y1: 29 },
    belt: { x0: 9, y0: 25, x1: 23, y1: 27 },
    armL: { x0: 5, y0: 19, x1: 9, y1: 28 },
    armR: { x0: 23, y0: 19, x1: 27, y1: 28 },
    legL: { x0: 12, y0: 29, x1: 15, y1: 37 },
    legR: { x0: 17, y0: 29, x1: 20, y1: 37 },
    footL: { x0: 11, y0: 37, x1: 16, y1: 39 },
    footR: { x0: 16, y0: 37, x1: 21, y1: 39 },
  }
}

/**
 * A single sharp triangle is only ~1px wide along most of its length, so the outline-erosion pass (which darkens
 * any silhouette pixel touching background) consumes nearly the whole shape and leaves almost no skin-colored
 * interior — the ear reads as a bare 1px dark line that disappears against a dark dungeon background. A 4-point
 * "leaf" quad (two triangles sharing a diagonal) keeps real width along the ear's length so there is always an
 * interior band that renders in skin color, with only its true outer edge outlined.
 */
function earShapes(head) {
  const { cx, cy, rx, ry } = head
  const quad = (sign) => {
    const a = { x: cx + sign * rx * 0.95, y: cy - ry * 0.5 }
    const b = { x: cx + sign * rx * 2.0, y: cy - ry * 1.0 }
    const c = { x: cx + sign * rx * 1.6, y: cy - ry * 0.1 }
    const d = { x: cx + sign * rx * 0.85, y: cy + ry * 0.5 }
    return (x, y) => inTriangle(x, y, a.x, a.y, b.x, b.y, c.x, c.y) || inTriangle(x, y, a.x, a.y, c.x, c.y, d.x, d.y)
  }
  return [quad(-1), quad(1)]
}

function hairTest(head, gender) {
  const { cx, cy, rx, ry } = head
  const topBand = (x, y) => inEllipse(x, y, cx, cy, rx, ry) && y < cy - ry * 0.3
  // sideLocks starts below the ear line (cy + ry*0.35) rather than at the temple, so long hair frames the head
  // beside/below the ear instead of painting over — and hiding — a pointed elf ear drawn earlier in the part list.
  const sideLocks = (downY) => (x, y) =>
    inRect(x, y, cx - rx - 1, cy + ry * 0.35, cx - rx + 2, downY) || inRect(x, y, cx + rx - 2, cy + ry * 0.35, cx + rx + 1, downY)
  if (gender === 'female') { const locks = sideLocks(cy + ry * 3.6); return (x, y) => topBand(x, y) || locks(x, y) }
  if (gender === 'neutral') { const locks = sideLocks(cy + ry * 1.4); return (x, y) => topBand(x, y) || locks(x, y) }
  return topBand
}

function buildWeaponParts(weaponType, geo) {
  const h = geo.head
  const aR = geo.armR
  const aL = geo.armL
  const t = geo.torso
  if (weaponType === 'sword_shield') {
    return [
      { role: 'weapon_metal', test: (x, y) => inRect(x, y, aR.x1 - 1, h.cy - 3, aR.x1 + 1, aR.y1 + 3) },
      { role: 'weapon_wood', test: (x, y) => inRect(x, y, aR.x1 - 2, aR.y1 + 2, aR.x1 + 2, aR.y1 + 5) },
      { role: 'class_trim', test: (x, y) => inEllipse(x, y, aL.x0 - 2, (aL.y0 + aL.y1) / 2, 3, 6) },
    ]
  }
  if (weaponType === 'daggers') {
    return [
      { role: 'weapon_metal', test: (x, y) => inRect(x, y, aR.x0, aR.y0 - 3, aR.x1, aR.y0 + 3) },
      { role: 'weapon_metal', test: (x, y) => inRect(x, y, aL.x0, aL.y0 - 3, aL.x1, aL.y0 + 3) },
    ]
  }
  if (weaponType === 'bow') {
    const cx = aR.x1 + 2
    const cy = (h.cy + t.y1) / 2
    const rx = 2.2
    const ry = (t.y1 - h.cy) / 2 + 4
    return [{ role: 'weapon_wood', test: (x, y) => inRing(x, y, cx, cy, rx, ry, rx - 1.1, ry - 1.1) && x >= cx - 0.5 }]
  }
  // staff_holy / staff_orb
  const rodX = aR.x1
  const rodTop = h.cy - h.ry - 6
  const rodBottom = t.y1 + 8
  const parts = [{ role: 'weapon_wood', test: (x, y) => inRect(x, y, rodX - 1, rodTop, rodX + 1, rodBottom) }]
  if (weaponType === 'staff_holy') {
    parts.push({ role: 'weapon_metal', test: (x, y) => inRect(x, y, rodX - 3, rodTop - 2, rodX + 3, rodTop + 1) })
    parts.push({ role: 'weapon_metal', test: (x, y) => inRect(x, y, rodX - 1, rodTop - 4, rodX + 1, rodTop + 3) })
  } else {
    parts.push({ role: 'weapon_metal', test: (x, y) => inEllipse(x, y, rodX, rodTop - 1, 2.5, 2.5) })
  }
  return parts
}

function buildParts(raceId, classId, gender) {
  const race = RACE_TRAITS[raceId]
  const cls = CLASS_TRAITS[classId]
  const geo = bodyGeometry(race.bodyPreset)
  const parts = []

  parts.push({ role: 'skin', test: (x, y) => inEllipse(x, y, geo.head.cx, geo.head.cy, geo.head.rx, geo.head.ry) })
  if (race.ears === 'pointed') {
    const [earL, earR] = earShapes(geo.head)
    parts.push({ role: 'skin', test: earL })
    parts.push({ role: 'skin', test: earR })
  }

  parts.push({ role: 'class_main', test: (x, y) => inRect(x, y, geo.torso.x0, geo.torso.y0, geo.torso.x1, geo.torso.y1) })
  parts.push({ role: 'class_trim', test: (x, y) => inRect(x, y, geo.belt.x0, geo.belt.y0, geo.belt.x1, geo.belt.y1) })

  parts.push({ role: cls.sleeve, test: (x, y) => inRect(x, y, geo.armL.x0, geo.armL.y0, geo.armL.x1, geo.armL.y1) })
  parts.push({ role: cls.sleeve, test: (x, y) => inRect(x, y, geo.armR.x0, geo.armR.y0, geo.armR.x1, geo.armR.y1) })

  // team_accent (player-slot color): a bold diagonal sash across the chest+arms, drawn ON TOP of torso/sleeves
  // so it is always fully visible (the earlier "cape peeking out from behind" design left only a 2px sliver on
  // each side, which was too small to read as a distinct color at a glance).
  {
    const left = geo.armL.x0
    const right = geo.armR.x1
    const top = geo.head.cy + geo.head.ry
    const bottom = geo.torso.y1
    const inSashRegion = (x, y) =>
      inRect(x, y, geo.torso.x0, geo.torso.y0, geo.torso.x1, geo.torso.y1) ||
      inRect(x, y, geo.armL.x0, geo.armL.y0, geo.armL.x1, geo.armL.y1) ||
      inRect(x, y, geo.armR.x0, geo.armR.y0, geo.armR.x1, geo.armR.y1)
    const band = (x, y) => Math.abs((x - left) / (right - left) - (y - top) / (bottom - top)) < 0.2
    parts.push({ role: 'team_accent', test: (x, y) => inSashRegion(x, y) && band(x, y) })
  }

  parts.push({ role: 'class_trim', test: (x, y) => inRect(x, y, geo.legL.x0, geo.legL.y0, geo.legL.x1, geo.legL.y1) })
  parts.push({ role: 'class_trim', test: (x, y) => inRect(x, y, geo.legR.x0, geo.legR.y0, geo.legR.x1, geo.legR.y1) })

  const feetRole = race.bareFeet ? 'skin' : 'boot'
  parts.push({ role: feetRole, test: (x, y) => inRect(x, y, geo.footL.x0, geo.footL.y0, geo.footL.x1, geo.footL.y1) })
  parts.push({ role: feetRole, test: (x, y) => inRect(x, y, geo.footR.x0, geo.footR.y0, geo.footR.x1, geo.footR.y1) })

  if (race.beard && gender === 'male') {
    const { cx, cy, rx, ry } = geo.head
    parts.push({ role: 'hair', test: (x, y) => inRect(x, y, cx - rx * 0.7, cy + ry * 0.6, cx + rx * 0.7, cy + ry * 1.3) })
  }

  parts.push({ role: 'hair', test: hairTest(geo.head, gender) })

  if (cls.headwear === 'hood') {
    const { cx, cy, rx, ry } = geo.head
    parts.push({ role: 'class_main', test: (x, y) => inRect(x, y, cx - rx - 1, cy - ry - 1, cx + rx + 1, cy - ry * 0.1) })
  }
  if (cls.headwear === 'hat') {
    const { cx, cy, rx, ry } = geo.head
    parts.push({ role: 'class_main', test: (x, y) => inTriangle(x, y, cx - rx - 1, cy - ry + 1, cx + rx + 1, cy - ry + 1, cx, cy - ry - 5) })
  }

  parts.push(...buildWeaponParts(cls.weapon, geo))

  return { parts, geo }
}

function faceDetailParts(head) {
  const { cx, cy, rx, ry } = head
  return [
    { test: (x, y) => inRect(x, y, cx - rx * 0.5, cy - ry * 0.2, cx - rx * 0.15, cy + ry * 0.2) },
    { test: (x, y) => inRect(x, y, cx + rx * 0.15, cy - ry * 0.2, cx + rx * 0.5, cy + ry * 0.2) },
    { test: (x, y) => inRect(x, y, cx - rx * 0.35, cy + ry * 0.5, cx + rx * 0.35, cy + ry * 0.7) },
  ]
}

function resolveColor(role, race, cls, slotColor) {
  switch (role) {
    case 'skin': return race.skin
    case 'hair': return race.hair
    case 'class_main': return cls.primary
    case 'class_trim': return cls.secondary
    case 'weapon_wood': return cls.weaponWood
    case 'weapon_metal': return cls.weaponMetal
    case 'boot': return BOOT
    case 'team_accent': return slotColor
    default: return OUTLINE
  }
}

function renderCharacter(raceId, classId, gender, slot) {
  const race = RACE_TRAITS[raceId]
  const cls = CLASS_TRAITS[classId]
  const slotColor = SLOT_PALETTE[slot]
  const { parts, geo } = buildParts(raceId, classId, gender)
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
      let role = null
      for (const part of parts) if (sampleTest(part.test, x, y)) role = part.role
      const [r, g, b] = hexToRgb(resolveColor(role, race, cls, slotColor))
      setPixel(buf, W, x, y, r, g, b, 255)
    }
  }

  const [fr, fg, fb] = hexToRgb(FACE)
  for (const detail of faceDetailParts(geo.head)) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (sampleTest(detail.test, x, y)) setPixel(buf, W, x, y, fr, fg, fb, 255)
      }
    }
  }

  return buf
}

let count = 0
for (const raceId of RACE_IDS) {
  for (const classId of CLASS_IDS) {
    for (const gender of GENDERS) {
      for (const slot of SLOTS) {
        const data = renderCharacter(raceId, classId, gender, slot)
        const file = `${raceId}_${classId}_${gender}_p${slot}.png`
        writeFileSync(join(outDir, file), encodePNG(W, H, data))
        count++
      }
    }
  }
}
console.log(`wrote ${count} character sprites (${W}x${H}) to ${outDir}`)
