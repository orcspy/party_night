import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SIZE = 24
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'assets', 'icons')
mkdirSync(outDir, { recursive: true })

const COLORS = {
  outline: '#17131f', metal: '#a8adb7', metalDark: '#626976', metalLight: '#d9dde5',
  gold: '#c0a26c', goldDark: '#8f7444', wood: '#795431', woodLight: '#a87942',
  red: '#b84d5b', redLight: '#ef7880', blue: '#548cc5', blueLight: '#8fc7e8',
  violet: '#8b63c7', violetLight: '#cf9df0', leather: '#81513d', leatherLight: '#b77955',
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const value of buffer) c = CRC_TABLE[(c ^ value) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

function encodePng(rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(SIZE, 0)
  header.writeUInt32BE(SIZE, 4)
  header[8] = 8
  header[9] = 6
  const stride = SIZE * 4
  const raw = Buffer.alloc((stride + 1) * SIZE)
  for (let y = 0; y < SIZE; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function rgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function canvas() {
  return Buffer.alloc(SIZE * SIZE * 4)
}

function pixel(buffer, x, y, color) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
  const offset = (y * SIZE + x) * 4
  const [r, g, b] = rgb(color)
  buffer[offset] = r
  buffer[offset + 1] = g
  buffer[offset + 2] = b
  buffer[offset + 3] = 255
}

function rect(buffer, x, y, width, height, color) {
  for (let py = y; py < y + height; py++) for (let px = x; px < x + width; px++) pixel(buffer, px, py, color)
}

function rows(buffer, definitions, color) {
  for (const [y, xMin, xMax] of definitions) for (let x = xMin; x <= xMax; x++) pixel(buffer, x, y, color)
}

function line(buffer, x0, y0, x1, y1, color, width = 1) {
  const dx = Math.abs(x1 - x0)
  const sx = x0 < x1 ? 1 : -1
  const dy = -Math.abs(y1 - y0)
  const sy = y0 < y1 ? 1 : -1
  let error = dx + dy
  while (true) {
    rect(buffer, x0 - Math.floor((width - 1) / 2), y0 - Math.floor((width - 1) / 2), width, width, color)
    if (x0 === x1 && y0 === y1) break
    const doubled = 2 * error
    if (doubled >= dy) { error += dy; x0 += sx }
    if (doubled <= dx) { error += dx; y0 += sy }
  }
}

function potion() {
  const b = canvas()
  rows(b, [[3,10,13],[4,9,14],[5,10,13],[6,10,13],[7,8,15],[8,7,16],[9,6,17],[10,5,18],[11,5,18],[12,4,19],[13,4,19],[14,4,19],[15,4,19],[16,5,18],[17,5,18],[18,6,17],[19,7,16],[20,9,14]], COLORS.outline)
  rect(b, 10, 4, 4, 3, COLORS.goldDark)
  rows(b, [[8,9,14],[9,8,15],[10,7,16],[11,6,17]], COLORS.metalLight)
  rows(b, [[12,5,18],[13,5,18],[14,5,18],[15,5,18],[16,6,17],[17,6,17],[18,7,16],[19,9,14]], COLORS.red)
  rows(b, [[12,6,11],[13,6,10],[14,6,9]], COLORS.redLight)
  return b
}

function sword() {
  const b = canvas()
  line(b, 6, 18, 18, 6, COLORS.outline, 5)
  line(b, 7, 17, 18, 6, COLORS.metalDark, 3)
  line(b, 8, 16, 18, 6, COLORS.metalLight)
  line(b, 5, 14, 10, 19, COLORS.goldDark, 2)
  line(b, 4, 20, 8, 16, COLORS.wood, 3)
  pixel(b, 3, 21, COLORS.gold)
  return b
}

function club() {
  const b = canvas()
  line(b, 6, 19, 16, 6, COLORS.outline, 6)
  line(b, 7, 18, 16, 6, COLORS.wood, 4)
  line(b, 8, 17, 16, 6, COLORS.woodLight, 2)
  rect(b, 13, 3, 5, 3, COLORS.outline)
  rect(b, 15, 5, 4, 3, COLORS.outline)
  pixel(b, 14, 5, COLORS.goldDark)
  pixel(b, 17, 7, COLORS.goldDark)
  return b
}

function dagger() {
  const b = canvas()
  rows(b, [[3,16,16],[4,14,17],[5,13,17],[6,12,16],[7,11,15],[8,10,14],[9,9,13],[10,8,12],[11,7,11],[12,7,10],[13,6,9]], COLORS.outline)
  rows(b, [[5,15,16],[6,13,15],[7,12,14],[8,11,13],[9,10,12],[10,9,11],[11,8,10],[12,8,9]], COLORS.metalLight)
  line(b, 5, 13, 10, 18, COLORS.goldDark, 2)
  line(b, 5, 19, 8, 16, COLORS.wood, 3)
  rect(b, 3, 20, 3, 2, COLORS.outline)
  return b
}

function bow() {
  const b = canvas()
  line(b, 7, 3, 4, 8, COLORS.outline, 3)
  line(b, 4, 8, 4, 15, COLORS.outline, 3)
  line(b, 4, 15, 7, 20, COLORS.outline, 3)
  line(b, 8, 3, 18, 12, COLORS.metalDark)
  line(b, 18, 12, 8, 20, COLORS.metalDark)
  line(b, 8, 4, 18, 12, COLORS.metalLight)
  line(b, 18, 12, 8, 19, COLORS.metalLight)
  rect(b, 3, 10, 4, 4, COLORS.woodLight)
  return b
}

function staff() {
  const b = canvas()
  line(b, 7, 21, 15, 6, COLORS.outline, 4)
  line(b, 8, 20, 15, 7, COLORS.wood, 2)
  rows(b, [[2,13,17],[3,11,19],[4,10,20],[5,10,20],[6,11,19],[7,13,17]], COLORS.outline)
  rows(b, [[3,14,17],[4,12,18],[5,12,18],[6,14,17]], COLORS.violet)
  rect(b, 13, 3, 3, 2, COLORS.violetLight)
  return b
}

function shield() {
  const b = canvas()
  rows(b, [[2,7,16],[3,5,18],[4,4,19],[5,4,19],[6,4,19],[7,4,19],[8,4,19],[9,4,19],[10,4,19],[11,4,19],[12,4,19],[13,5,18],[14,5,18],[15,6,17],[16,6,17],[17,7,16],[18,8,15],[19,9,14],[20,10,13],[21,11,12]], COLORS.outline)
  rows(b, [[3,7,16],[4,5,18],[5,5,18],[6,5,18],[7,5,18],[8,5,18],[9,5,18],[10,5,18],[11,5,18],[12,6,17],[13,6,17],[14,7,16],[15,7,16],[16,8,15],[17,9,14],[18,10,13],[19,11,12]], COLORS.goldDark)
  rows(b, [[5,7,16],[6,6,17],[7,6,17],[8,6,17],[9,6,17],[10,6,17],[11,6,17],[12,7,16],[13,7,16],[14,8,15],[15,8,15],[16,9,14],[17,10,13],[18,11,12]], COLORS.metal)
  rows(b, [[5,7,11],[6,7,11],[7,7,10],[8,7,9],[9,7,8]], COLORS.metalLight)
  rows(b, [[10,15,17],[11,14,17],[12,14,16],[13,13,16],[14,13,15],[15,12,15],[16,12,14],[17,12,13]], COLORS.metalDark)
  rect(b, 10, 10, 4, 4, COLORS.outline)
  rect(b, 11, 11, 2, 2, COLORS.gold)
  return b
}

function helmet() {
  const b = canvas()
  rows(b, [[3,9,14],[4,7,16],[5,6,17],[6,5,18],[7,4,19],[8,4,19],[9,4,19],[10,4,19],[11,4,19],[12,4,19],[13,4,19],[14,5,18],[15,5,18],[16,5,9],[16,14,18],[17,5,9],[17,14,18],[18,5,8],[18,15,18],[19,5,8],[19,15,18]], COLORS.outline)
  rows(b, [[5,9,14],[6,7,16],[7,6,17],[8,6,17],[9,6,17],[10,6,17],[11,6,17]], COLORS.metal)
  rows(b, [[5,9,11],[6,7,10],[7,6,9],[8,6,8]], COLORS.metalLight)
  rect(b, 6, 12, 12, 3, COLORS.metalDark)
  rect(b, 7, 13, 4, 2, COLORS.outline)
  rect(b, 13, 13, 4, 2, COLORS.outline)
  rect(b, 11, 14, 2, 6, COLORS.goldDark)
  return b
}

function armor() {
  const b = canvas()
  rows(b, [[3,7,10],[3,13,16],[4,5,18],[5,4,19],[6,3,20],[7,3,20],[8,4,19],[9,5,18],[10,5,18],[11,5,18],[12,5,18],[13,5,18],[14,5,18],[15,5,18],[16,5,18],[17,5,18],[18,6,17],[19,6,17],[20,7,16]], COLORS.outline)
  rows(b, [[5,6,17],[6,5,18],[7,5,18],[8,6,17],[9,7,16],[10,7,16],[11,7,16],[12,7,16],[13,7,16],[14,7,16],[15,7,16],[16,7,16],[17,7,16],[18,8,15],[19,8,15]], COLORS.metal)
  rows(b, [[5,6,10],[6,6,10],[7,6,9],[8,7,9],[9,8,10],[10,8,10]], COLORS.metalLight)
  rows(b, [[13,14,16],[14,13,16],[15,13,16],[16,12,16],[17,12,16],[18,12,15],[19,12,15]], COLORS.metalDark)
  line(b, 11, 7, 11, 18, COLORS.goldDark, 2)
  return b
}

function activeSkill() {
  const b = canvas()
  const rays = [[12,2,12,6],[12,17,12,21],[2,12,6,12],[17,12,21,12],[4,4,7,7],[17,17,20,20],[20,4,17,7],[7,17,4,20]]
  for (const ray of rays) line(b, ...ray, COLORS.gold)
  rows(b, [[7,10,13],[8,8,15],[9,7,16],[10,6,17],[11,6,17],[12,6,17],[13,6,17],[14,7,16],[15,8,15],[16,10,13]], COLORS.outline)
  rows(b, [[8,11,13],[9,9,14],[10,8,15],[11,8,15],[12,8,15],[13,8,15],[14,9,14],[15,11,13]], COLORS.red)
  rect(b, 10, 10, 4, 4, COLORS.redLight)
  return b
}

function passiveSkill() {
  const b = canvas()
  const aura = [[9,2],[10,2],[11,2],[12,2],[13,2],[14,2],[6,3],[7,3],[16,3],[17,3],[4,5],[5,5],[18,5],[19,5],[3,7],[20,7],[2,10],[21,10],[2,13],[21,13],[3,16],[20,16],[4,18],[5,18],[18,18],[19,18],[7,20],[16,20],[9,21],[10,21],[11,21],[12,21],[13,21],[14,21]]
  for (const [x, y] of aura) pixel(b, x, y, COLORS.violetLight)
  rows(b, [[6,9,14],[7,7,16],[8,7,16],[9,7,16],[10,7,16],[11,7,16],[12,7,16],[13,8,15],[14,8,15],[15,9,14],[16,10,13],[17,11,12]], COLORS.outline)
  rows(b, [[7,9,14],[8,8,15],[9,8,15],[10,8,15],[11,8,15],[12,8,15],[13,9,14],[14,9,14],[15,10,13],[16,11,12]], COLORS.violet)
  rows(b, [[8,9,11],[9,9,10],[10,9,10]], COLORS.violetLight)
  return b
}

const icons = {
  item_potion: potion,
  equipment_sword: sword,
  equipment_club: club,
  equipment_dagger: dagger,
  equipment_bow: bow,
  equipment_staff: staff,
  equipment_shield: shield,
  equipment_helmet: helmet,
  equipment_armor: armor,
  skill_active: activeSkill,
  skill_passive: passiveSkill,
}

for (const [name, draw] of Object.entries(icons)) writeFileSync(join(outDir, `${name}.png`), encodePng(draw()))
console.log(`Generated ${Object.keys(icons).length} content icons in ${outDir}`)
