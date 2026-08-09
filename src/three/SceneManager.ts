import * as THREE from 'three'
import { CameraController } from './CameraController'
import { ModelLoader } from './ModelLoader'
import { ObjectSelector, type SelectionCallback } from './ObjectSelector'

export type ProgressCallback = (progress: number) => void

const TARGET_MODEL_SIZE = 2.4

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.geometry?.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of materials) {
        mat?.dispose()
      }
    }
  })
}

/**
 * CAD exports are often in millimeters and Z-up.
 * Normalize into a stable Y-up viewing scale so fog/grid/camera work.
 */
function normalizeModel(root: THREE.Object3D): void {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  if (box.isEmpty()) {
    return
  }

  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  // If model looks Z-up (taller in Z than Y), tilt into Three.js Y-up.
  if (size.z > size.y * 1.2 && size.z > size.x * 0.6) {
    root.rotation.x = -Math.PI / 2
    root.updateMatrixWorld(true)
    box.setFromObject(root)
    box.getSize(size)
    box.getCenter(center)
  }

  const scale = TARGET_MODEL_SIZE / Math.max(size.x, size.y, size.z, 1e-6)
  root.scale.multiplyScalar(scale)
  root.position.x = -center.x * scale
  root.position.y = -center.y * scale
  root.position.z = -center.z * scale
  root.updateMatrixWorld(true)

  // Sit model on the ground plane (y = 0).
  const grounded = new THREE.Box3().setFromObject(root)
  if (!grounded.isEmpty()) {
    root.position.y -= grounded.min.y
    root.updateMatrixWorld(true)
  }
}

export class SceneManager {
  private readonly container: HTMLElement
  private readonly scene: THREE.Scene
  private readonly renderer: THREE.WebGLRenderer
  private readonly cameraController: CameraController
  private readonly modelLoader: ModelLoader
  private readonly objectSelector: ObjectSelector
  private readonly clock = new THREE.Clock()
  /** Pivot used for user/model spin so normalized mesh transform stays intact. */
  private modelPivot: THREE.Group | null = null
  private modelRoot: THREE.Group | null = null
  private modelSpinRadPerSec = 0
  private animationId = 0
  private readonly resizeObserver: ResizeObserver

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x121820)
    // Fog disabled by default — CAD-scale cameras used to sit beyond far fog and
    // paint the entire viewport the background color (looks like "no render").
    this.scene.fog = null

    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 5000)
    this.cameraController = new CameraController(camera, container)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(width, height)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.style.outline = 'none'

    this.setupLights()
    this.setupHelpers()

    this.modelLoader = new ModelLoader()
    this.objectSelector = new ObjectSelector(camera, this.renderer.domElement)

    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(container)

    this.animate()
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xb8c4d4, 0.7)
    this.scene.add(ambient)

    const key = new THREE.DirectionalLight(0xffffff, 1.25)
    key.position.set(5, 8, 4)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 40
    key.shadow.camera.left = -8
    key.shadow.camera.right = 8
    key.shadow.camera.top = 8
    key.shadow.camera.bottom = -8
    this.scene.add(key)

    const fill = new THREE.DirectionalLight(0x8aa4c0, 0.55)
    fill.position.set(-4, 3, -2)
    this.scene.add(fill)

    const hemi = new THREE.HemisphereLight(0xdde7f5, 0x1a222c, 0.35)
    this.scene.add(hemi)
  }

  private setupHelpers(): void {
    const grid = new THREE.GridHelper(20, 40, 0x3a4656, 0x243040)
    grid.position.y = 0
    this.scene.add(grid)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({
        color: 0x1a222c,
        metalness: 0.1,
        roughness: 0.9,
      }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.001
    ground.receiveShadow = true
    this.scene.add(ground)
  }

  private handleResize(): void {
    const width = Math.max(this.container.clientWidth, 1)
    const height = Math.max(this.container.clientHeight, 1)
    this.cameraController.camera.aspect = width / height
    this.cameraController.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(width, height, false)
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)
    const delta = this.clock.getDelta()
    if (this.modelPivot && this.modelSpinRadPerSec !== 0) {
      this.modelPivot.rotation.y += this.modelSpinRadPerSec * delta
    }
    this.cameraController.update()
    this.renderer.render(this.scene, this.cameraController.camera)
  }

  setSelectionCallback(callback: SelectionCallback | null): void {
    this.objectSelector.setSelectionCallback(callback)
  }

  private mountModel(root: THREE.Group): void {
    normalizeModel(root)
    const pivot = new THREE.Group()
    pivot.name = 'ModelPivot'
    pivot.add(root)
    this.modelRoot = root
    this.modelPivot = pivot
    this.modelSpinRadPerSec = 0
    this.scene.add(pivot)
    this.objectSelector.setRoot(pivot)
    this.cameraController.fitToObject(pivot)
    void window.gateApi?.log(
      `Scene mount OK: meshes presented, camera near=${this.cameraController.camera.near.toFixed(3)} far=${this.cameraController.camera.far.toFixed(1)}`,
    )
  }

  async loadModel(modelPath: string, onProgress?: ProgressCallback): Promise<void> {
    this.clearModel()
    const root = await this.modelLoader.load(modelPath, onProgress)
    this.mountModel(root)
  }

  async loadModelData(
    data: ArrayBuffer | Uint8Array,
    pathHint = 'model.glb',
    onProgress?: ProgressCallback,
  ): Promise<void> {
    this.clearModel()
    const root = await this.modelLoader.loadArrayBuffer(data, pathHint, onProgress)
    this.mountModel(root)
  }

  clearModel(): void {
    this.modelSpinRadPerSec = 0
    if (!this.modelPivot && !this.modelRoot) {
      return
    }
    this.objectSelector.setRoot(null)
    if (this.modelPivot) {
      this.scene.remove(this.modelPivot)
      disposeObject(this.modelPivot)
    } else if (this.modelRoot) {
      this.scene.remove(this.modelRoot)
      disposeObject(this.modelRoot)
    }
    this.modelPivot = null
    this.modelRoot = null
  }

  resetView(): void {
    if (this.modelPivot) {
      this.cameraController.fitToObject(this.modelPivot)
    } else {
      this.cameraController.resetView()
    }
  }

  fitModel(): void {
    if (this.modelPivot) {
      this.cameraController.fitToObject(this.modelPivot)
    }
  }

  /** Step-rotate the model around vertical axis (degrees, positive = left/CCW). */
  rotateModelY(degrees: number): void {
    if (!this.modelPivot) {
      return
    }
    this.modelPivot.rotation.y += THREE.MathUtils.degToRad(degrees)
  }

  /** Step-rotate the model around horizontal axis (degrees, positive = tip down). */
  rotateModelX(degrees: number): void {
    if (!this.modelPivot) {
      return
    }
    this.modelPivot.rotation.x += THREE.MathUtils.degToRad(degrees)
  }

  resetModelRotation(): void {
    if (!this.modelPivot) {
      return
    }
    this.modelPivot.rotation.set(0, 0, 0)
    this.modelPivot.position.set(0, 0, 0)
  }

  /** Move model vertically in world units (positive = up). */
  moveModelY(delta: number): void {
    if (!this.modelPivot) {
      return
    }
    this.modelPivot.position.y += delta
  }

  /** Lift/drop so the model bottom sits on the ground plane (y = 0). */
  placeModelOnGround(): void {
    if (!this.modelPivot) {
      return
    }
    this.modelPivot.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(this.modelPivot)
    if (box.isEmpty()) {
      return
    }
    this.modelPivot.position.y -= box.min.y
  }

  /** Continuous model spin (rad/s). Replaces camera-orbit auto-rotate for clearer UX. */
  setModelSpin(enabled: boolean, speedRadPerSec = 0.7): void {
    this.modelSpinRadPerSec = enabled ? speedRadPerSec : 0
    // Ensure camera auto-rotate stays off so only the model turns.
    this.cameraController.setAutoRotate(false)
  }

  isModelSpinning(): boolean {
    return this.modelSpinRadPerSec !== 0
  }

  setAutoRotate(enabled: boolean): void {
    this.setModelSpin(enabled)
  }

  isAutoRotate(): boolean {
    return this.isModelSpinning()
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId)
    this.resizeObserver.disconnect()
    this.clearModel()
    this.objectSelector.dispose()
    this.cameraController.dispose()
    this.modelLoader.dispose()
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
