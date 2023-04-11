import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VIDEO_SIZE, STATE } from './params'
import { copyModel } from '@tensorflow/tfjs-core/dist/io/model_management'

const SIZE = VIDEO_SIZE[STATE.camera.sizeOption]

export class Three {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(75, SIZE.width / SIZE.height, 0.1, 1000)
    this.camera.position.z = 1

    this.scene = new THREE.Scene()

    this.geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
    this.material = new THREE.MeshPhysicalMaterial({ color: 0x44aa88 })

    this.cube = new THREE.Mesh(this.geometry, this.material)
    this.scene.add(this.cube)

    const light = new THREE.AmbientLight(0xffffff, .25)
    this.scene.add(light)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 10, 10)
    this.scene.add(directionalLight)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    // set quality
    this.renderer.setSize(SIZE.width, SIZE.height)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.renderer.setAnimationLoop(this.animation.bind(this))
    document.getElementById('threejs-wrapper').innerHTML = ''
    document.getElementById('threejs-wrapper').appendChild(this.renderer.domElement)
    this.renderer.render(this.scene, this.camera)

    this.faceBoxes = []

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 0, 0)

    this.importGLTFModelWithRigging('../Oldman/Oldman.gltf')
    this.defaultHeadRotation = { x: 0, y: 0, z: 0 }

    this.clock = new THREE.Clock()
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
  importGLTFModelWithRigging(path) {
    const loader = new GLTFLoader()
    loader.load(
      path,
      (gltf) => {
        this.scene.add(gltf.scene)
        this.model = gltf.scene
        console.log(this.model)

        this.saveDefaultRotation()
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        // position the camera
        this.camera.position.z = 2 /* j'ai changé ça */
      },
      (error) => {
        console.log('An error happened', error)
      }
    )
  }

  importFBXModel(path) {
    const loader = new FBXLoader()
    loader.load(
      path,
      (fbx) => {
        this.scene.add(fbx)
        this.model = fbx
        console.log(this.model)
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        // position the camera
        this.camera.position.z = 2 /* j'ai changé ça */
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
      const head = this.model.getObjectByName('head')
      head.rotation.x = this.defaultHeadRotation.x + orientation.x
      head.rotation.y = this.defaultHeadRotation.y + orientation.y
      head.rotation.z = this.defaultHeadRotation.z + orientation.z

      // jaw
      const jaw = this.model.getObjectByName('jaw')
      jaw.position.y = (face.keypoints[13].y - face.keypoints[14].y) / 300
      jaw.position.x = (face.keypoints[13].x - face.keypoints[14].x) / 75
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
      x: (topKeyPoint.z - bottomKeyPoint.z) / 250,
      y: (leftKeyPoint.z - rightKeyPoint.z) / 250,
      z: - (topKeyPoint.x - bottomKeyPoint.x) / 250,
    }
  }

  saveDefaultRotation() {
    // Head
    const head = this.model.getObjectByName('head')
    this.defaultHeadRotation = {
      x: head.rotation.x,
      y: head.rotation.y,
      z: head.rotation.z,
    }
    /* const lipDown = this.model.getObjectByName('Lip_Down')
    this.defaultLipDownPosition = {
      x: lipDown.position.x,
      y: lipDown.position.y,
      z: lipDown.position.z,
    } */
  }
}
