/**
 * Generates a lightweight industrial-style placeholder gate.glb
 * with named meshes for component picking demos.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '..', 'public', 'models', 'gate.glb')

function createBoxGeometry(sx, sy, sz) {
  const hx = sx / 2
  const hy = sy / 2
  const hz = sz / 2

  // 24 unique vertices (4 per face) for flat normals
  const positions = new Float32Array([
    // +Z
    -hx, -hy, hz, hx, -hy, hz, hx, hy, hz, -hx, hy, hz,
    // -Z
    hx, -hy, -hz, -hx, -hy, -hz, -hx, hy, -hz, hx, hy, -hz,
    // +X
    hx, -hy, hz, hx, -hy, -hz, hx, hy, -hz, hx, hy, hz,
    // -X
    -hx, -hy, -hz, -hx, -hy, hz, -hx, hy, hz, -hx, hy, -hz,
    // +Y
    -hx, hy, hz, hx, hy, hz, hx, hy, -hz, -hx, hy, -hz,
    // -Y
    -hx, -hy, -hz, hx, -hy, -hz, hx, -hy, hz, -hx, -hy, hz,
  ])

  const normals = new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
  ])

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18,
    16, 18, 19, 20, 21, 22, 20, 22, 23,
  ])

  return { positions, normals, indices }
}

function align4(n) {
  return (n + 3) & ~3
}

function writeGLB(parts) {
  const json = {
    asset: { version: '2.0', generator: 'GateDigitalTwin-placeholder' },
    scene: 0,
    scenes: [{ name: 'Scene', nodes: parts.map((_, i) => i) }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
  }

  const binChunks = []
  let binOffset = 0

  parts.forEach((part, index) => {
    const { positions, normals, indices } = createBoxGeometry(part.sx, part.sy, part.sz)

    const posBytes = Buffer.from(positions.buffer)
    const normBytes = Buffer.from(normals.buffer)
    const idxBytes = Buffer.from(indices.buffer)

    const posPad = align4(posBytes.length) - posBytes.length
    const normPad = align4(normBytes.length) - normBytes.length
    const idxPad = align4(idxBytes.length) - idxBytes.length

    const posView = binOffset
    binChunks.push(posBytes, Buffer.alloc(posPad))
    binOffset += posBytes.length + posPad

    const normView = binOffset
    binChunks.push(normBytes, Buffer.alloc(normPad))
    binOffset += normBytes.length + normPad

    const idxView = binOffset
    binChunks.push(idxBytes, Buffer.alloc(idxPad))
    binOffset += idxBytes.length + idxPad

    const baseAccessor = json.accessors.length
    json.bufferViews.push(
      { buffer: 0, byteOffset: posView, byteLength: posBytes.length, target: 34962 },
      { buffer: 0, byteOffset: normView, byteLength: normBytes.length, target: 34962 },
      { buffer: 0, byteOffset: idxView, byteLength: idxBytes.length, target: 34963 },
    )

    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < positions.length; i += 3) {
      min[0] = Math.min(min[0], positions[i])
      min[1] = Math.min(min[1], positions[i + 1])
      min[2] = Math.min(min[2], positions[i + 2])
      max[0] = Math.max(max[0], positions[i])
      max[1] = Math.max(max[1], positions[i + 1])
      max[2] = Math.max(max[2], positions[i + 2])
    }

    json.accessors.push(
      {
        bufferView: baseAccessor,
        componentType: 5126,
        count: positions.length / 3,
        type: 'VEC3',
        max,
        min,
      },
      {
        bufferView: baseAccessor + 1,
        componentType: 5126,
        count: normals.length / 3,
        type: 'VEC3',
      },
      {
        bufferView: baseAccessor + 2,
        componentType: 5123,
        count: indices.length,
        type: 'SCALAR',
      },
    )

    json.materials.push({
      name: `${part.name}Material`,
      pbrMetallicRoughness: {
        baseColorFactor: part.color,
        metallicFactor: 0.35,
        roughnessFactor: 0.45,
      },
    })

    json.meshes.push({
      name: part.name,
      primitives: [
        {
          attributes: {
            POSITION: baseAccessor,
            NORMAL: baseAccessor + 1,
          },
          indices: baseAccessor + 2,
          material: index,
          mode: 4,
        },
      ],
    })

    json.nodes.push({
      name: part.name,
      mesh: index,
      translation: part.translation,
    })
  })

  json.buffers[0].byteLength = binOffset
  const binBuffer = Buffer.concat(binChunks)

  let jsonText = JSON.stringify(json)
  const jsonPad = align4(jsonText.length) - jsonText.length
  jsonText += ' '.repeat(jsonPad)
  const jsonBuffer = Buffer.from(jsonText, 'utf8')

  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0) // glTF
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)

  const jsonChunkHeader = Buffer.alloc(8)
  jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0)
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4) // JSON

  const binChunkHeader = Buffer.alloc(8)
  binChunkHeader.writeUInt32LE(binBuffer.length, 0)
  binChunkHeader.writeUInt32LE(0x004e4942, 4) // BIN

  return Buffer.concat([header, jsonChunkHeader, jsonBuffer, binChunkHeader, binBuffer])
}

// Layout keeps named parts visually exposed so raycasting can pick each component.
const parts = [
  {
    name: 'Cover',
    sx: 1.8,
    sy: 0.12,
    sz: 0.9,
    translation: [0, 0.06, 0],
    color: [0.22, 0.28, 0.34, 1],
  },
  {
    name: 'Motor',
    sx: 0.5,
    sy: 0.4,
    sz: 0.5,
    translation: [-0.45, 0.35, 0],
    color: [0.75, 0.55, 0.18, 1],
  },
  {
    name: 'Gearbox',
    sx: 0.55,
    sy: 0.42,
    sz: 0.42,
    translation: [0.25, 0.33, 0],
    color: [0.45, 0.5, 0.55, 1],
  },
  {
    name: 'ControlBoard',
    sx: 0.4,
    sy: 0.28,
    sz: 0.08,
    translation: [0.55, 0.7, 0.25],
    color: [0.15, 0.45, 0.28, 1],
  },
  {
    name: 'Sensor',
    sx: 0.14,
    sy: 0.14,
    sz: 0.2,
    translation: [-0.75, 0.55, 0.28],
    color: [0.7, 0.2, 0.2, 1],
  },
]

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, writeGLB(parts))
console.log(`Wrote placeholder model: ${outPath}`)
