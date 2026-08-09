type MeshLike = {
  name?: string
  color?: number[]
  attributes: {
    position: { array: ArrayLike<number> }
    normal?: { array: ArrayLike<number> }
  }
  index: { array: ArrayLike<number> }
}

function align4(n: number): number {
  return (n + 3) & ~3
}

function sanitizeName(rawName: string | undefined, index: number): string {
  const name = (rawName ?? '').toString().trim()
  if (!name) {
    return `Part_${String(index).padStart(3, '0')}`
  }
  const code = name.match(/[A-Z]\d{3}(?:-\d{2})+(?:-\d{2})*/i)
  if (code) {
    return code[0]
  }
  const ascii = name
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (ascii.length >= 2) {
    return ascii.slice(0, 64)
  }
  return `Part_${String(index).padStart(3, '0')}`
}

function needsUint32(vertexCount: number, indices: ArrayLike<number>): boolean {
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

/** Build a binary GLB buffer from occt-import-js mesh JSON. */
export function writeGlbFromMeshes(meshes: MeshLike[]): Buffer {
  const json: Record<string, unknown> = {
    asset: { version: '2.0', generator: 'GateDigitalTwin-runtime-stp' },
    scene: 0,
    scenes: [{ name: 'Scene', nodes: [] as number[] }],
    nodes: [] as unknown[],
    meshes: [] as unknown[],
    materials: [] as unknown[],
    accessors: [] as unknown[],
    bufferViews: [] as unknown[],
    buffers: [{ byteLength: 0 }],
  }

  const scenes = json.scenes as Array<{ nodes: number[] }>
  const nodes = json.nodes as unknown[]
  const meshDefs = json.meshes as unknown[]
  const materials = json.materials as unknown[]
  const accessors = json.accessors as unknown[]
  const bufferViews = json.bufferViews as unknown[]
  const buffers = json.buffers as Array<{ byteLength: number }>

  const binChunks: Buffer[] = []
  let binOffset = 0
  const usedNames = new Map<string, number>()

  meshes.forEach((mesh, meshIndex) => {
    let meshName = sanitizeName(mesh.name, meshIndex)
    const count = usedNames.get(meshName) ?? 0
    usedNames.set(meshName, count + 1)
    if (count > 0) {
      meshName = `${meshName}_${count + 1}`
    }

    const positions = Float32Array.from(mesh.attributes.position.array)
    const hasNormals = Boolean(mesh.attributes.normal?.array)
    const normals = hasNormals
      ? Float32Array.from(mesh.attributes.normal!.array)
      : null
    const indicesSrc = mesh.index.array
    const useUint32 = needsUint32(positions.length / 3, indicesSrc)
    const indices = useUint32
      ? Uint32Array.from(indicesSrc)
      : Uint16Array.from(indicesSrc)

    const posBytes = Buffer.from(positions.buffer)
    const idxBytes = Buffer.from(indices.buffer)
    const normBytes = normals ? Buffer.from(normals.buffer) : null

    const pushView = (bytes: Buffer, target: number) => {
      const pad = align4(bytes.length) - bytes.length
      const offset = binOffset
      binChunks.push(bytes, Buffer.alloc(pad))
      binOffset += bytes.length + pad
      bufferViews.push({
        buffer: 0,
        byteOffset: offset,
        byteLength: bytes.length,
        target,
      })
      return bufferViews.length - 1
    }

    const posView = pushView(posBytes, 34962)
    const normView = normals ? pushView(normBytes!, 34962) : -1
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

    const posAccessor = accessors.length
    accessors.push({
      bufferView: posView,
      componentType: 5126,
      count: positions.length / 3,
      type: 'VEC3',
      min,
      max,
    })

    let normAccessor = -1
    if (normals) {
      normAccessor = accessors.length
      accessors.push({
        bufferView: normView,
        componentType: 5126,
        count: normals.length / 3,
        type: 'VEC3',
      })
    }

    const idxAccessor = accessors.length
    accessors.push({
      bufferView: idxView,
      componentType: useUint32 ? 5125 : 5123,
      count: indices.length,
      type: 'SCALAR',
    })

    const color = mesh.color ?? [0.72, 0.76, 0.8]
    materials.push({
      name: `${meshName}Material`,
      pbrMetallicRoughness: {
        baseColorFactor: [color[0], color[1], color[2], 1],
        metallicFactor: 0.25,
        roughnessFactor: 0.55,
      },
    })

    const attributes: Record<string, number> = { POSITION: posAccessor }
    if (normAccessor >= 0) {
      attributes.NORMAL = normAccessor
    }

    meshDefs.push({
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

    nodes.push({ name: meshName, mesh: meshIndex })
    scenes[0].nodes.push(meshIndex)
  })

  buffers[0].byteLength = binOffset
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
