import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', '..', 'src', 'assets', 'terrain')
mkdirSync(outDir, { recursive: true })

function mulberry32(seed) {
  let t = seed >>> 0
  return function () {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), t | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
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

function shade(r, g, b, delta) {
  return [
    Math.min(255, Math.max(0, r + delta)),
    Math.min(255, Math.max(0, g + delta)),
    Math.min(255, Math.max(0, b + delta)),
  ]
}

/**
 * Seamless flagstone/brick style tile. rowOffset > 0 gives a running-bond brick look; 0 gives a plain grid (flagstone).
 * bevel > 0 lightens each block's interior top/left edge and darkens its bottom/right edge (single top-left light source),
 * so blocks read as raised 3D volumes instead of a flat color grid — this is what makes walls look load-bearing/solid.
 */
function makeMasonryTile(size, blockW, blockH, mortarPx, rowOffset, baseHex, mortarHex, noiseHexes, noiseChance, seed, bevel = 0) {
  const rand = mulberry32(seed)
  const buf = Buffer.alloc(size * size * 4)
  const [baseR, baseG, baseB] = hexToRgb(baseHex)
  const [mortR, mortG, mortB] = hexToRgb(mortarHex)
  const interiorW = blockW - mortarPx
  const interiorH = blockH - mortarPx
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / blockH)
    const offset = (row % 2) * rowOffset
    const localY = y % blockH
    for (let x = 0; x < size; x++) {
      const localX = (x + offset) % blockW
      const isMortar = localX < mortarPx || localY < mortarPx
      let r, g, b
      if (isMortar) {
        r = mortR; g = mortG; b = mortB
      } else {
        r = baseR; g = baseG; b = baseB
        if (rand() < noiseChance) {
          const pick = noiseHexes[Math.floor(rand() * noiseHexes.length)]
          ;[r, g, b] = hexToRgb(pick)
        }
        if (bevel > 0) {
          const ix = localX - mortarPx
          const iy = localY - mortarPx
          const nearBottomRight = ix === interiorW - 1 || iy === interiorH - 1
          const nearTopLeft = ix === 0 || iy === 0
          if (nearBottomRight) [r, g, b] = shade(r, g, b, -bevel)
          else if (nearTopLeft) [r, g, b] = shade(r, g, b, bevel)
        }
      }
      setPixel(buf, size, x, y, r, g, b, 255)
    }
  }
  return buf
}

function makeDiamondMarker(size, ringHex, coreHex) {
  const buf = Buffer.alloc(size * size * 4)
  const [ringR, ringG, ringB] = hexToRgb(ringHex)
  const [coreR, coreG, coreB] = hexToRgb(coreHex)
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const outer = size * 0.42
  const ringInner = size * 0.3
  const core = size * 0.12
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.abs(x - cx) + Math.abs(y - cy)
      if (d <= core) setPixel(buf, size, x, y, coreR, coreG, coreB, 255)
      else if (d <= outer && d >= ringInner) setPixel(buf, size, x, y, ringR, ringG, ringB, 255)
      else setPixel(buf, size, x, y, 0, 0, 0, 0)
    }
  }
  return buf
}

function makeExitArrowMarker(size, hex) {
  const buf = Buffer.alloc(size * size * 4)
  const [r, g, b] = hexToRgb(hex)
  const cx = (size - 1) / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - cx)
      let on = false
      if (y >= size * 0.12 && y < size * 0.55) {
        const headHalfWidth = ((y - size * 0.12) / (size * 0.55 - size * 0.12)) * (size * 0.42)
        on = dx <= headHalfWidth
      } else if (y >= size * 0.5 && y < size * 0.88) {
        on = dx <= size * 0.13
      }
      if (on) setPixel(buf, size, x, y, r, g, b, 255)
      else setPixel(buf, size, x, y, 0, 0, 0, 0)
    }
  }
  return buf
}

/** Octagon ("stop sign") silhouette — deliberately distinct from the diamond (marker_encounter) and arrow
 *  (marker_exit) shapes so a boss encounter reads as a different KIND of marker, not just a different color
 *  (AGENTS.md 8항: "boss·상태·상호작용 여부를 색상만으로 구분하지 않음"). */
function makeBossMarker(size, ringHex, coreHex) {
  const buf = Buffer.alloc(size * size * 4)
  const [ringR, ringG, ringB] = hexToRgb(ringHex)
  const [coreR, coreG, coreB] = hexToRgb(coreHex)
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const outerR = size * 0.42
  const innerR = size * 0.28
  const inOctagon = (dx, dy, rad) => Math.abs(dx) <= rad && Math.abs(dy) <= rad && Math.abs(dx) + Math.abs(dy) <= rad * 1.5
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      if (!inOctagon(dx, dy, outerR)) { setPixel(buf, size, x, y, 0, 0, 0, 0); continue }
      if (inOctagon(dx, dy, innerR)) setPixel(buf, size, x, y, coreR, coreG, coreB, 255)
      else setPixel(buf, size, x, y, ringR, ringG, ringB, 255)
    }
  }
  return buf
}

const TILE_SIZE = 32
const MARKER_SIZE = 24

const tiles = [
  // terrain_training_ruins: unchanged palette/params from the original "dungeon_*" draft, only the file name
  // changed to the terrain_<mapId>_<part> convention so ExplorationScene can pick a texture set per map.
  {
    file: 'terrain_training_ruins_floor.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#28213a', '#1c1728', ['#332b47', '#2c2440'], 0.08, 1001, 10),
  },
  {
    file: 'terrain_training_ruins_ceiling.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#100f19', '#0a0912', ['#171526', '#0d0c15'], 0.05, 1002, 0),
  },
  {
    file: 'terrain_training_ruins_wall_side.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#312944', '#1c1729', ['#3a3150', '#2c253d'], 0.14, 1003, 24),
  },
  {
    file: 'terrain_training_ruins_wall_front.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#3c324c', '#665877', ['#453a58', '#372e44'], 0.14, 1004, 18),
  },
  // terrain_goblin_den: warm earthen/brown palette (raw_data_table.md 22.11 fallback tint "갈색") — same masonry
  // technique so it stays visually consistent with training_ruins, differentiated purely by theme color.
  {
    file: 'terrain_goblin_den_floor.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#3a2f1e', '#241c11', ['#443724', '#332a19'], 0.08, 2001, 10),
  },
  {
    file: 'terrain_goblin_den_ceiling.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#1c150d', '#120d08', ['#241c11', '#150f09'], 0.05, 2002, 0),
  },
  {
    file: 'terrain_goblin_den_wall_side.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#5a3f22', '#2e2011', ['#644827', '#4c331c'], 0.14, 2003, 24),
  },
  {
    file: 'terrain_goblin_den_wall_front.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#6b4c2a', '#8a6a3d', ['#75542e', '#5c4020'], 0.14, 2004, 18),
  },
  // The following 5 sets are for terrain not yet wired into any Scene — raw_data_table.md 22.11 lists their
  // map/quest as designed but src/game/content.ts has no MapDefinition for them yet (AGENTS.md 11항 2단계:
  // "해당 game content가 아직 미구현이면 에셋과 registry까지만 준비한다"). Palette follows each row's
  // "fallback tint" hint; same masonry technique as the two wired terrains for visual consistency.
  {
    // terrain_ancient_site: 회갈색 (grayish brown)
    file: 'terrain_ancient_site_floor.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#3a3428', '#241f18', ['#443d2e', '#332e22'], 0.08, 3001, 10),
  },
  {
    file: 'terrain_ancient_site_ceiling.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#1e1b15', '#120f0c', ['#241f18', '#15120e'], 0.05, 3002, 0),
  },
  {
    file: 'terrain_ancient_site_wall_side.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#5c5240', '#302a20', ['#645a46', '#4c4434'], 0.14, 3003, 24),
  },
  {
    file: 'terrain_ancient_site_wall_front.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#6b6048', '#8a7d5c', ['#756a50', '#5c5340'], 0.14, 3004, 18),
  },
  {
    // terrain_underground_dungeon: 청회색 (blue-grey)
    file: 'terrain_underground_dungeon_floor.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#26303a', '#181f26', ['#2c3844', '#212a33'], 0.08, 4001, 10),
  },
  {
    file: 'terrain_underground_dungeon_ceiling.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#141a20', '#0c1114', ['#181f26', '#0e1418'], 0.05, 4002, 0),
  },
  {
    file: 'terrain_underground_dungeon_wall_side.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#3a4a5c', '#1e2732', ['#425468', '#324150'], 0.14, 4003, 24),
  },
  {
    file: 'terrain_underground_dungeon_wall_front.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#455a6e', '#6a8296', ['#4e6579', '#3c4e5e'], 0.14, 4004, 18),
  },
  {
    // terrain_old_castle: 암자색 (dark violet)
    file: 'terrain_old_castle_floor.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#2e1f38', '#1c1322', ['#362543', '#291b32'], 0.08, 5001, 10),
  },
  {
    file: 'terrain_old_castle_ceiling.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#170f1c', '#0e0912', ['#1c1322', '#100b15'], 0.05, 5002, 0),
  },
  {
    file: 'terrain_old_castle_wall_side.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#4a2f5c', '#271a30', ['#54366a', '#3f2a4d'], 0.14, 5003, 24),
  },
  {
    file: 'terrain_old_castle_wall_front.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#5c3a6e', '#7a5490', ['#66427a', '#4e3260'], 0.14, 5004, 18),
  },
  {
    // terrain_volcanic_cave: 적갈색 (reddish brown)
    file: 'terrain_volcanic_cave_floor.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#3a1f18', '#24120d', ['#44251c', '#331c15'], 0.08, 6001, 10),
  },
  {
    file: 'terrain_volcanic_cave_ceiling.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#1c0f0b', '#120907', ['#24120d', '#150b08'], 0.05, 6002, 0),
  },
  {
    file: 'terrain_volcanic_cave_wall_side.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#5c2e1f', '#301810', ['#663420', '#4c2818'], 0.14, 6003, 24),
  },
  {
    file: 'terrain_volcanic_cave_wall_front.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#6e3824', '#8a5030', ['#78402a', '#5e321f'], 0.14, 6004, 18),
  },
  {
    // terrain_deep_forest_ruins: 녹회색 (green-grey)
    file: 'terrain_deep_forest_ruins_floor.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#26301f', '#181f13', ['#2c3824', '#212a19'], 0.08, 7001, 10),
  },
  {
    file: 'terrain_deep_forest_ruins_ceiling.png',
    data: makeMasonryTile(TILE_SIZE, 16, 16, 2, 0, '#141a10', '#0c110a', ['#181f13', '#0e140c'], 0.05, 7002, 0),
  },
  {
    file: 'terrain_deep_forest_ruins_wall_side.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#3a4a30', '#1e2718', ['#42543a', '#32412a'], 0.14, 7003, 24),
  },
  {
    file: 'terrain_deep_forest_ruins_wall_front.png',
    data: makeMasonryTile(TILE_SIZE, 16, 8, 3, 8, '#455a38', '#6a8258', ['#4e6541', '#3c4e32'], 0.14, 7004, 18),
  },
]

const markers = [
  { file: 'marker_encounter.png', data: makeDiamondMarker(MARKER_SIZE, '#d4b45d', '#fff2c2') },
  { file: 'marker_exit.png', data: makeExitArrowMarker(MARKER_SIZE, '#7fd8c0') },
  { file: 'marker_boss.png', data: makeBossMarker(MARKER_SIZE, '#8a2c2c', '#e85a4a') },
]

for (const t of tiles) {
  writeFileSync(join(outDir, t.file), encodePNG(TILE_SIZE, TILE_SIZE, t.data))
  console.log(`wrote ${t.file} (${TILE_SIZE}x${TILE_SIZE})`)
}
for (const m of markers) {
  writeFileSync(join(outDir, m.file), encodePNG(MARKER_SIZE, MARKER_SIZE, m.data))
  console.log(`wrote ${m.file} (${MARKER_SIZE}x${MARKER_SIZE})`)
}
