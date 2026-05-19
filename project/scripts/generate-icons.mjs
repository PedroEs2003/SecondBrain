/**
 * generate-icons.mjs
 * Generates pwa-192x192.png and pwa-512x512.png with zero external dependencies.
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dir, '..', 'public')

// ── CRC32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[i] = c
}
function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const b of buf) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ b) & 0xFF]
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// ── PNG encoder ───────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function encodePNG(rgba, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // None filter
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

// ── SDF helpers ───────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const lerp  = (a, b, t) => a + (b - a) * clamp(t, 0, 1)

function sdfCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r
}
function sdfSegment(px, py, ax, ay, bx, by, hw) {
  const dx = bx - ax, dy = by - ay
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) - hw
}

// ── Icon rasterizer ───────────────────────────────────────────────────────────
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4)
  const sc = size / 512

  // Node centers (512-space)
  const n1x = 256 * sc, n1y = 165 * sc
  const n2x = 152 * sc, n2y = 345 * sc
  const n3x = 360 * sc, n3y = 345 * sc
  const nR  =  46 * sc   // node radius
  const lW  =   9 * sc   // line half-width

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5

      // Background: #0f1318
      let r = 15, g = 19, b = 24

      // Lines (65% opacity blue)
      const dLine = Math.min(
        sdfSegment(px, py, n1x, n1y, n2x, n2y, lW),
        sdfSegment(px, py, n1x, n1y, n3x, n3y, lW),
        sdfSegment(px, py, n2x, n2y, n3x, n3y, lW)
      )
      if (dLine < 1) {
        const a = clamp(1 - dLine, 0, 1) * 0.65
        r = Math.round(lerp(r, 10, a))
        g = Math.round(lerp(g, 132, a))
        b = Math.round(lerp(b, 255, a))
      }

      // Nodes — gradient #4DA3FF (top) → #0A84FF (bottom)
      const c1 = sdfCircle(px, py, n1x, n1y, nR)
      const c2 = sdfCircle(px, py, n2x, n2y, nR)
      const c3 = sdfCircle(px, py, n3x, n3y, nR)
      const dNode = Math.min(c1, c2, c3)

      if (dNode < 1) {
        const a = clamp(1 - dNode, 0, 1)
        const t = py / size
        const nr = Math.round(lerp(77, 10, t))
        const ng = Math.round(lerp(163, 132, t))
        r = Math.round(lerp(r, nr, a))
        g = Math.round(lerp(g, ng, a))
        b = Math.round(lerp(b, 255, a))

        // Soft inner highlight
        const whichCenter = c1 <= c2 && c1 <= c3 ? [n1x, n1y]
          : c2 <= c3 ? [n2x, n2y] : [n3x, n3y]
        const hd = Math.hypot(px - whichCenter[0], py - (whichCenter[1] - nR * 0.35))
        const hR = nR * 0.55
        if (hd < hR) {
          const ha = (1 - hd / hR) * 0.22
          r = Math.round(lerp(r, 220, ha))
          g = Math.round(lerp(g, 230, ha))
          b = Math.round(lerp(b, 255, ha))
        }
      }

      const i = (y * size + x) * 4
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255
    }
  }
  return buf
}

// ── Generate files ────────────────────────────────────────────────────────────
mkdirSync(publicDir, { recursive: true })

const sizes = [192, 512]
for (const sz of sizes) {
  const file = join(publicDir, `pwa-${sz}x${sz}.png`)
  writeFileSync(file, encodePNG(drawIcon(sz), sz))
  console.log(`Generated ${sz}x${sz} → ${file}`)
}
console.log('Done.')
