import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export type LoadProgressCallback = (progress: number) => void

function finalizeScene(root: THREE.Group): THREE.Group {
  root.name = 'ProductModel'
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      if (mesh.geometry) {
        mesh.geometry.computeBoundingSphere()
      }
    }
  })
  return root
}

export class ModelLoader {
  private readonly loader: GLTFLoader
  private readonly dracoLoader: DRACOLoader

  constructor() {
    this.loader = new GLTFLoader()
    this.dracoLoader = new DRACOLoader()
    this.dracoLoader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.7/',
    )
    this.loader.setDRACOLoader(this.dracoLoader)
  }

  /**
   * Load a GLB/glTF model from a relative or absolute URL.
   */
  async load(
    modelPath: string,
    onProgress?: LoadProgressCallback,
  ): Promise<THREE.Group> {
    // Prefer fetch + parse for custom protocols (more reliable than XHR in Electron).
    if (modelPath.startsWith('gatemodel:')) {
      onProgress?.(0.2)
      const response = await fetch(modelPath)
      if (!response.ok) {
        throw new Error(`Failed to fetch model (${response.status}): ${modelPath}`)
      }
      onProgress?.(0.6)
      const buffer = await response.arrayBuffer()
      onProgress?.(0.8)
      return this.loadArrayBuffer(buffer, modelPath, onProgress)
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        modelPath,
        (gltf) => resolve(finalizeScene(gltf.scene)),
        (event) => {
          if (!onProgress || !event.lengthComputable || event.total === 0) {
            return
          }
          onProgress(Math.min(1, event.loaded / event.total))
        },
        (error) => {
          reject(error instanceof Error ? error : new Error(String(error)))
        },
      )
    })
  }

  /** Load GLB/glTF bytes (fallback path). Prefer URL / gatemodel:// in Electron. */
  async loadArrayBuffer(
    data: ArrayBuffer | Uint8Array,
    pathHint = 'model.glb',
    onProgress?: LoadProgressCallback,
  ): Promise<THREE.Group> {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    // Copy into a fresh ArrayBuffer — IPC views can be detached/non-standard.
    const copy = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(copy).set(bytes)

    onProgress?.(0.85)
    return new Promise((resolve, reject) => {
      this.loader.parse(
        copy,
        '',
        (gltf) => {
          onProgress?.(1)
          resolve(finalizeScene(gltf.scene))
        },
        (error) => {
          reject(
            error instanceof Error
              ? error
              : new Error(`Failed to parse model ${pathHint}: ${String(error)}`),
          )
        },
      )
    })
  }

  dispose(): void {
    this.dracoLoader.dispose()
  }
}
