import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VIDEO_SIZE, STATE } from './params'

const SIZE = VIDEO_SIZE[STATE.camera.sizeOption]

export class Three {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000000)
    this.camera.position.z = 1

    this.scene = new THREE.Scene()

    this.geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
    this.material = new THREE.MeshPhysicalMaterial({ color: 0x44aa88 })

    this.cube = new THREE.Mesh(this.geometry, this.material)
    this.scene.add(this.cube)

    const light = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(light)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    this.scene.add(directionalLight)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setAnimationLoop(this.animation.bind(this))
    document.getElementById('threejs-wrapper').innerHTML = ''
    document.getElementById('threejs-wrapper').appendChild(this.renderer.domElement)
    this.renderer.render(this.scene, this.camera)

    this.faceBoxes = []

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 0, 0)

    this.importGLTFModelWithRigging('../zophrac')
    this.defaultHeadRotation = { x: 0, y: 0, z: 0 }
  }

  animation(time) {
    this.cube.rotation.x = time / 2000
    this.cube.rotation.y = time / 1000

    this.controls.update()

    this.renderer.render(this.scene, this.camera)
  }

  /**
   * Import a glTF Separate (.glTF + .bin + textures) from Blender (add the textures to the model) and return the model.
   */
  importGLTFModelWithRigging(folderPath) {
    const loader = new GLTFLoader()
    loader.load(
      `${folderPath}/scene.gltf`,
      (gltf) => {
        this.scene.add(gltf.scene)
        this.model = gltf.scene

        this.saveDefaultRotation()
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
      },
      (error) => {
        console.log('An error happened', error)
      }
    )
  }

  /**
   * Draw the a path in the Three JS canvas.
   * @param points A list of points to draw.
   */
  drawFaceBoxes(faces) {
    // Remove previous face box
    this.faceBoxes.forEach((line) => this.scene.remove(line))

    faces.forEach((face) => {
      const keypoints = face.keypoints.map((keypoint) => [keypoint.x, keypoint.y])

      const box = face.box
      box.xMin = box.xMin / SIZE.width - 0.5
      box.xMax = box.xMax / SIZE.width - 0.5
      box.yMin = -box.yMin / SIZE.height + 0.5
      box.yMax = -box.yMax / SIZE.height + 0.5
      let points = [
        [box.xMin, box.yMin],
        [box.xMax, box.yMin],
        [box.xMax, box.yMax],
        [box.xMin, box.yMax],
      ]

      points = points.map((point) => new THREE.Vector3(point[0], point[1], 0))

      // First 3 edges
      let material = new THREE.LineBasicMaterial({ color: 0x0000ff })
      let geometry = new THREE.BufferGeometry().setFromPoints(points)
      let line = new THREE.Line(geometry, material)
      this.scene.add(line)
      this.faceBoxes.push(line)

      // Last edge
      material = new THREE.LineBasicMaterial({ color: 0x0000ff })
      geometry = new THREE.BufferGeometry().setFromPoints([points[0], points[points.length - 1]])
      line = new THREE.Line(geometry, material)
      this.scene.add(line)
      this.faceBoxes.push(line)
    })
  }

  animateModel(face) {
    if (this.model) {
      const keypoints = face.keypoints.map((keypoint) => [keypoint.x, keypoint.y])

      // Head orientation
      const orientation = this.computeFaceOrientation(face)
      const head = this.model.getObjectByName('Head_02')
      console.log(head)
      head.rotation.x = this.defaultHeadRotation.x + orientation.x
      head.rotation.y = this.defaultHeadRotation.y + orientation.y
      head.rotation.z = this.defaultHeadRotation.z + orientation.z
    }
  }

  /**
   * Compute the orientation of the face and return x, y and z rotation.
   */
  computeFaceOrientation(face) {
    let leftKeyPoint = face.keypoints[234]
    let rightKeyPoint = face.keypoints[454]
    let topKeyPoint = face.keypoints[10]
    let bottomKeyPoint = face.keypoints[152]

    return {
      x: (leftKeyPoint.z - rightKeyPoint.z) / 250,
      y: (topKeyPoint.z - bottomKeyPoint.z) / 250,
      z: (topKeyPoint.x - bottomKeyPoint.x) / 250,
    }
  }

  saveDefaultRotation() {
    // Head
    const head = this.model.getObjectByName('Head_02')
    this.defaultHeadRotation = {
      x: head.rotation.x,
      y: head.rotation.y,
      z: head.rotation.z,
    }
  }
}
