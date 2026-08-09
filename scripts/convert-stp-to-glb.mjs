/**
 * Convert STEP/STP CAD files to GLB for Three.js viewing.
 * Usage: node scripts/convert-stp-to-glb.mjs [input.stp] [output.glb]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const inputPath = path.resolve(
  process.argv[2] ?? path.join(root, 'public/models/BC411.stp'),
)
const outputPath = path.resolve(
  process.argv[3] ??
    path.join(path.dirname(inputPath), `${path.basename(inputPath, path.extname(inputPath))}.glb`),
)

function align4(n) {
  return (n + 3) & ~3
}

function sanitizeName(rawName, index) {
  const name = (rawName ?? '').toString().trim()
  if (!name) {
    return `Part_${String(index).padStart(3, '0')}`
  }
  const code = name.match(/[A-Z]\d{3}(?:-\d{2})+(?:-\d{2})*/i)
  if (code) {
    return code[0]
  }
  const ascii = name.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, '_').replace(/^_+|_+$/g, '')
  if (ascii.length >= 2) {
    return ascii.slice(0, 64)
  }
  return `Part_${String(index).padStart(3, '0')}`
}

function needsUint32(vertexCount, indices) {
  if (vertexCount > 65535) {
    return true
  }
  for (let i = 0; i < indices.length; i += 1) {
    if (indices[i] > 65535) {
      return true
    }
  }
  return false
}

function writeGLB(meshes) {
  const json = {
    asset: { version: '2.0', generator: 'GateDigitalTwin-stp-converter' },
    scene: 0,
    scenes: [{ name: 'Scene', nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
  }

  const binChunks = []
  let binOffset = 0

  const usedNames = new Map()
  meshes.forEach((mesh, meshIndex) => {
    let meshName = sanitizeName(mesh.name, meshIndex)
    const count = usedNames.get(meshName) ?? 0
    usedNames.set(meshName, count + 1)
    if (count > 0) {
      meshName = `${meshName}_${count + 1}`
    }
    mesh.name = meshName
    const positions = Float32Array.from(mesh.attributes.position.array)
    const hasNormals = Boolean(mesh.attributes.normal?.array)
    const normals = hasNormals ? Float32Array.from(mesh.attributes.normal.array) : null
    const indicesSrc = mesh.index.array
    const useUint32 = needsUint32(positions.length / 3, indicesSrc)
    const indices = useUint32 ? Uint32Array.from(indicesSrc) : Uint16Array.from(indicesSrc)

    const posBytes = Buffer.from(positions.buffer)
    const idxBytes = Buffer.from(indices.buffer)
    const normBytes = normals ? Buffer.from(normals.buffer) : null

    const pushView = (bytes, target) => {
      const pad = align4(bytes.length) - bytes.length
      const offset = binOffset
      binChunks.push(bytes, Buffer.alloc(pad))
      binOffset += bytes.length + pad
      json.bufferViews.push({
        buffer: 0,
        byteOffset: offset,
        byteLength: bytes.length,
        target,
      })
      return json.bufferViews.length - 1
    }

    const posView = pushView(posBytes, 34962)
    const normView = normals ? pushView(normBytes, 34962) : -1
    const idxView = pushView(idxBytes, 34963)

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

    const posAccessor = json.accessors.length
    json.accessors.push({
      bufferView: posView,
      componentType: 5126,
      count: positions.length / 3,
      type: 'VEC3',
      min,
      max,
    })

    let normAccessor = -1
    if (normals) {
      normAccessor = json.accessors.length
      json.accessors.push({
        bufferView: normView,
        componentType: 5126,
        count: normals.length / 3,
        type: 'VEC3',
      })
    }

    const idxAccessor = json.accessors.length
    json.accessors.push({
      bufferView: idxView,
      componentType: useUint32 ? 5125 : 5123,
      count: indices.length,
      type: 'SCALAR',
    })

    const color = mesh.color ?? [0.72, 0.76, 0.8]
    json.materials.push({
      name: `${meshName}Material`,
      pbrMetallicRoughness: {
        baseColorFactor: [color[0], color[1], color[2], 1],
        metallicFactor: 0.25,
        roughnessFactor: 0.55,
      },
    })

    const attributes = { POSITION: posAccessor }
    if (normAccessor >= 0) {
      attributes.NORMAL = normAccessor
    }

    json.meshes.push({
      name: meshName,
      primitives: [
        {
          attributes,
          indices: idxAccessor,
          material: meshIndex,
          mode: 4,
        },
      ],
    })

    json.nodes.push({
      name: meshName,
      mesh: meshIndex,
    })
    json.scenes[0].nodes.push(meshIndex)
  })

  json.buffers[0].byteLength = binOffset
  const binBuffer = Buffer.concat(binChunks)

  let jsonText = JSON.stringify(json)
  jsonText += ' '.repeat(align4(jsonText.length) - jsonText.length)
  const jsonBuffer = Buffer.from(jsonText, 'utf8')

  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)

  const jsonChunkHeader = Buffer.alloc(8)
  jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0)
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4)

  const binChunkHeader = Buffer.alloc(8)
  binChunkHeader.writeUInt32LE(binBuffer.length, 0)
  binChunkHeader.writeUInt32LE(0x004e4942, 4)

  return Buffer.concat([header, jsonChunkHeader, jsonBuffer, binChunkHeader, binBuffer])
}

const occtFactory = require(path.join(root, 'node_modules/occt-import-js/dist/occt-import-js.js'))
const occt = await occtFactory()

console.log(`Reading STEP: ${inputPath}`)
const fileContent = fs.readFileSync(inputPath)
const result = occt.ReadStepFile(new Uint8Array(fileContent), {
  linearUnit: 'millimeter',
  linearDeflectionType: 'bounding_box_ratio',
  linearDeflection: 0.001,
  angularDeflection: 0.5,
})

if (!result?.success || !Array.isArray(result.meshes) || result.meshes.length === 0) {
  console.error('STEP import failed or produced no meshes.')
  process.exit(1)
}

const meshes = result.meshes.filter(
  (m) => m?.attributes?.position?.array?.length && m?.index?.array?.length,
)

let triCount = 0
for (const m of meshes) {
  triCount += m.index.array.length / 3
}

console.log(`Meshes: ${meshes.length}, triangles≈${Math.round(triCount)}`)
const glb = writeGLB(meshes)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, glb)
console.log(`Wrote GLB: ${outputPath} (${glb.length} bytes)`)

// Print unique names for knowledge mapping
const names = [...new Set(meshes.map((m) => m.name).filter(Boolean))]
console.log('Mesh names (first 40):')
console.log(names.slice(0, 40).join('\n'))
