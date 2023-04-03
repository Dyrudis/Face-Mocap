import * as THREE from 'three'
import { STATE } from './params'

const SIZE = {
  width: STATE.camera.sizeOption.split('X')[0].trim(),
  height: STATE.camera.sizeOption.split('X')[1].trim(),
}

export class Three {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10)
    this.camera.position.z = 1

    this.scene = new THREE.Scene()

    this.geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
    this.material = new THREE.MeshNormalMaterial()

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.scene.add(this.mesh)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setAnimationLoop(this.animation.bind(this))
    document.getElementById('threejs-wrapper').innerHTML = ''
    document.getElementById('threejs-wrapper').appendChild(this.renderer.domElement)
    this.renderer.render(this.scene, this.camera)

    this.faceBox = []
  }

  animation(time) {
    this.mesh.rotation.x = time / 2000
    this.mesh.rotation.y = time / 1000

    this.renderer.render(this.scene, this.camera)
  }

  /**
   * Draw the keypoints in 3D.
   * @param faces A list of faces to render.
   */
  drawResults(faces) {
    faces.forEach((face) => {
      const keypoints = face.keypoints.map((keypoint) => [keypoint.x, keypoint.y])

      const box = face.box
      box.xMin = box.xMin / SIZE.width - 0.5
      box.xMax = box.xMax / SIZE.width - 0.5
      box.yMin = - box.yMin / SIZE.height + 0.5
      box.yMax = - box.yMax / SIZE.height + 0.5
      this.drawFaceBox([
        [box.xMin, box.yMin],
        [box.xMax, box.yMin],
        [box.xMax, box.yMax],
        [box.xMin, box.yMax],
      ])
    })
  }

  /**
   * Draw the a path in the Three JS canvas.
   * @param points A list of points to draw.
   */
  drawFaceBox(points) {
    // Remove previous face box
    this.faceBox.forEach((line) => this.scene.remove(line))

    points = points.map((point) => new THREE.Vector3(point[0], point[1], 0))

    // First 3 edges
    let material = new THREE.LineBasicMaterial({ color: 0x0000ff })
    let geometry = new THREE.BufferGeometry().setFromPoints(points)
    let line = new THREE.Line(geometry, material)
    this.scene.add(line)
    this.faceBox.push(line)

    // Last edge
    material = new THREE.LineBasicMaterial({ color: 0x0000ff })
    geometry = new THREE.BufferGeometry().setFromPoints([points[0], points[points.length - 1]])
    line = new THREE.Line(geometry, material)
    this.scene.add(line)
    this.faceBox.push(line)
  }
}
