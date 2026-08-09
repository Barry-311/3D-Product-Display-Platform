import * as THREE from 'three'

export type SelectionCallback = (objectName: string | null, mesh: THREE.Mesh | null) => void

type HighlightState = {
  mesh: THREE.Mesh
  emissive: THREE.Color
  emissiveIntensity: number
}

export class ObjectSelector {
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly camera: THREE.Camera
  private readonly domElement: HTMLElement
  private root: THREE.Object3D | null = null
  private highlighted: HighlightState | null = null
  private onSelect: SelectionCallback | null = null
  private readonly boundPointerDown: (event: PointerEvent) => void
  private readonly boundPointerUp: (event: PointerEvent) => void
  private pointerDownPos: { x: number; y: number } | null = null

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement
    this.boundPointerDown = this.handlePointerDown.bind(this)
    this.boundPointerUp = this.handlePointerUp.bind(this)
    this.domElement.addEventListener('pointerdown', this.boundPointerDown)
    this.domElement.addEventListener('pointerup', this.boundPointerUp)
  }

  setRoot(root: THREE.Object3D | null): void {
    this.clearHighlight()
    this.root = root
  }

  setSelectionCallback(callback: SelectionCallback | null): void {
    this.onSelect = callback
  }

  private handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !this.root) {
      return
    }
    this.pointerDownPos = { x: event.clientX, y: event.clientY }
  }

  private handlePointerUp(event: PointerEvent): void {
    if (event.button !== 0 || !this.root || !this.pointerDownPos) {
      this.pointerDownPos = null
      return
    }

    const dx = event.clientX - this.pointerDownPos.x
    const dy = event.clientY - this.pointerDownPos.y
    this.pointerDownPos = null
    // Ignore drags so OrbitControls rotate/pan does not change selection.
    if (dx * dx + dy * dy > 16) {
      return
    }

    const rect = this.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObject(this.root, true)
    const hit = hits.find((h) => (h.object as THREE.Mesh).isMesh)

    if (!hit) {
      this.clearHighlight()
      this.onSelect?.(null, null)
      return
    }

    const mesh = hit.object as THREE.Mesh
    this.highlight(mesh)
    const objectName = this.resolveObjectName(mesh)
    this.onSelect?.(objectName, mesh)
  }

  private resolveObjectName(mesh: THREE.Mesh): string {
    let current: THREE.Object3D | null = mesh
    while (current) {
      if (current.name && current.name !== 'ProductModel' && !current.name.startsWith('Scene')) {
        return current.name
      }
      current = current.parent
    }
    return mesh.name || 'Unknown'
  }

  private highlight(mesh: THREE.Mesh): void {
    this.clearHighlight()
    const material = mesh.material
    if (!material || Array.isArray(material)) {
      this.highlighted = { mesh, emissive: new THREE.Color(), emissiveIntensity: 0 }
      return
    }

    const mat = material as THREE.MeshStandardMaterial
    if (!('emissive' in mat)) {
      this.highlighted = { mesh, emissive: new THREE.Color(), emissiveIntensity: 0 }
      return
    }

    this.highlighted = {
      mesh,
      emissive: mat.emissive.clone(),
      emissiveIntensity: mat.emissiveIntensity ?? 1,
    }
    mat.emissive.setHex(0x3d8bfd)
    mat.emissiveIntensity = 0.55
  }

  clearHighlight(): void {
    if (!this.highlighted) {
      return
    }
    const { mesh, emissive, emissiveIntensity } = this.highlighted
    const material = mesh.material
    if (material && !Array.isArray(material) && 'emissive' in material) {
      const mat = material as THREE.MeshStandardMaterial
      mat.emissive.copy(emissive)
      mat.emissiveIntensity = emissiveIntensity
    }
    this.highlighted = null
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.boundPointerDown)
    this.domElement.removeEventListener('pointerup', this.boundPointerUp)
    this.clearHighlight()
    this.root = null
    this.onSelect = null
  }
}
