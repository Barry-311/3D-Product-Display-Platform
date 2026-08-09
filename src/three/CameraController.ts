import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class CameraController {
  readonly camera: THREE.PerspectiveCamera
  readonly controls: OrbitControls
  private readonly defaultPosition = new THREE.Vector3(2.8, 2.2, 3.6)
  private readonly defaultTarget = new THREE.Vector3(0, 0.6, 0)

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.controls = new OrbitControls(camera, domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.screenSpacePanning = true
    this.controls.minDistance = 0.2
    this.controls.maxDistance = 5000
    this.controls.maxPolarAngle = Math.PI * 0.495
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    }
    this.resetView()
  }

  update(): void {
    this.controls.update()
  }

  resetView(): void {
    this.camera.position.copy(this.defaultPosition)
    this.controls.target.copy(this.defaultTarget)
    this.camera.near = 0.05
    this.camera.far = 200
    this.camera.updateProjectionMatrix()
    this.controls.minDistance = 0.2
    this.controls.maxDistance = 5000
    this.controls.update()
  }

  setAutoRotate(enabled: boolean): void {
    this.controls.autoRotate = enabled
    this.controls.autoRotateSpeed = 1.2
  }

  isAutoRotate(): boolean {
    return this.controls.autoRotate
  }

  fitToObject(object: THREE.Object3D, offset = 1.45): void {
    const box = new THREE.Box3().setFromObject(object)
    if (box.isEmpty()) {
      this.resetView()
      return
    }

    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 0.001)
    const fov = THREE.MathUtils.degToRad(this.camera.fov)
    let distance = (maxDim / (2 * Math.tan(fov / 2))) * offset
    distance = Math.max(distance, 0.5)

    const direction = new THREE.Vector3(1, 0.75, 1).normalize()

    this.controls.target.copy(center)
    this.camera.position.copy(center).addScaledVector(direction, distance)
    this.camera.near = Math.max(distance / 100, 0.01)
    this.camera.far = Math.max(distance * 100, 200)
    this.controls.minDistance = Math.max(maxDim * 0.05, 0.1)
    this.controls.maxDistance = Math.max(distance * 20, maxDim * 20, 50)
    this.camera.updateProjectionMatrix()
    this.controls.update()
  }

  dispose(): void {
    this.controls.dispose()
  }
}
