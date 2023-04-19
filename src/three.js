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

    const light = new THREE.AmbientLight(0xffffff, 0.25)
    this.scene.add(light)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 10, 10)
    this.scene.add(directionalLight)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    // set quality
    this.renderer.setSize(SIZE.width, SIZE.height)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setClearColor(0x000000, 0)

    this.renderer.setAnimationLoop(this.animation.bind(this))
    document.getElementById('threejs-wrapper').innerHTML = ''
    document.getElementById('threejs-wrapper').appendChild(this.renderer.domElement)
    this.renderer.render(this.scene, this.camera)

    this.faceBoxes = []

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 0, 0)

    this.importGLTFModelWithRigging('../Oldman 2/Oldman.glb')
    this.defaultHeadRotation = { x: 0, y: 0, z: 0 }

    this.clock = new THREE.Clock()
  }

  animation(time) {
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

        console.log('model :', this.model)

        this.saveDefaultRotation()
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        // position the camera
        this.camera.position.z = 2
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
        this.camera.position.z = 2
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
      const box = face.box
      let x = box.xMin + (box.xMax - box.xMin) / 2
      let y = box.yMin + (box.yMax - box.yMin) / 2
      this.model.position.set(-(x / SIZE.width) * 16 +8, -(y / SIZE.height) * 12 +4, -10)

      let scale = 2 + ((box.xMax - box.xMin) + (box.yMax - box.yMin)) / 35
      let scaler = 1
      this.model.scale.set(scale * scaler, scale * scaler, scale * scaler)

      console.log(scale)
      // Head orientation
      const orientation = this.computeFaceOrientation(face)
      const head = this.model.getObjectByName('cabeza')
      head.rotation.x = this.defaultHeadRotation.x + orientation.x*1.25
      head.rotation.y = this.defaultHeadRotation.y + orientation.y*1.25
      head.rotation.z = this.defaultHeadRotation.z + orientation.z

      // jaw WIP
      const jaw = this.model.getObjectByName('mandibula')
      jaw.rotation.x = this.defaultJawRotation.x + (face.keypoints[13].y - face.keypoints[14].y) / 100

      // left eyebrow
      const leftEyebrow = this.model.getObjectByName('ceja_izq')
      leftEyebrow.rotation.z =
        this.defaultLeftEyebrowRotation.z + 10 * (0.16 + (face.keypoints[107].y - face.keypoints[245].y) / box.height)

      // right eyebrow
      const rightEyebrow = this.model.getObjectByName('ceja_der')
      rightEyebrow.rotation.z =
        this.defaultRightEyebrowRotation.z - 10 * (0.16 + (face.keypoints[336].y - face.keypoints[465].y) / box.height)

      // left eye lid
      const leftEyeLid = this.model.getObjectByName('parpado_up_izq')
      leftEyeLid.rotation.x = Math.min(
        this.defaultLeftEyeLidRotation.x,
        this.defaultLeftEyeLidRotation.x - 50 * (0.05 + 3*(face.keypoints[386].y - face.keypoints[374].y) / box.height)
      )
      leftEyeLid.rotation.x = Math.max(
        this.defaultLeftEyeLidRotation.x - 1.1,
        leftEyeLid.rotation.x
      )

      // right eye lid
      const rightEyeLid = this.model.getObjectByName('parpado_up_der')
      rightEyeLid.rotation.x = Math.min(
        this.defaultRightEyeLidRotation.x,
        this.defaultRightEyeLidRotation.x - 50 * (0.05 + 3*(face.keypoints[159].y - face.keypoints[145].y) / box.height)
      )
      rightEyeLid.rotation.x = Math.max(
        this.defaultRightEyeLidRotation.x - 1.1,
        rightEyeLid.rotation.x
      )
    }
  }

  /**
   * Compute the orientation of the face and return x, y and z rotation.
   */
  computeFaceOrientation(face) {
    let leftKeyPoint = face.keypoints[187]
    let rightKeyPoint = face.keypoints[411]
    let topKeyPoint = face.keypoints[197]
    let bottomKeyPoint = face.keypoints[164]

    return {
      x: -(topKeyPoint.z - bottomKeyPoint.z) / 100,
      y: -(leftKeyPoint.z - rightKeyPoint.z) / 250,
      z: -(topKeyPoint.x - bottomKeyPoint.x) / 100,
    }
  }

  saveDefaultRotation() {
    // Head
    const head = this.model.getObjectByName('cabeza')
    this.defaultHeadRotation = {
      x: head.rotation.x,
      y: head.rotation.y,
      z: head.rotation.z,
    }
    const jaw = this.model.getObjectByName('mandibula')
    this.defaultJawRotation = {
      x: jaw.rotation.x,
      y: jaw.rotation.y,
      z: jaw.rotation.z,
    }
    const leftEyebrow = this.model.getObjectByName('ceja_izq')
    this.defaultLeftEyebrowRotation = {
      x: leftEyebrow.rotation.x,
      y: leftEyebrow.rotation.y,
      z: leftEyebrow.rotation.z,
    }
    const rightEyebrow = this.model.getObjectByName('ceja_der')
    this.defaultRightEyebrowRotation = {
      x: rightEyebrow.rotation.x,
      y: rightEyebrow.rotation.y,
      z: rightEyebrow.rotation.z,
    }
    const leftEyeLid = this.model.getObjectByName('parpado_up_izq')
    this.defaultLeftEyeLidRotation = {
      x: leftEyeLid.rotation.x,
      y: leftEyeLid.rotation.y,
      z: leftEyeLid.rotation.z,
    }
    const rightEyeLid = this.model.getObjectByName('parpado_up_der')
    this.defaultRightEyeLidRotation = {
      x: rightEyeLid.rotation.x,
      y: rightEyeLid.rotation.y,
      z: rightEyeLid.rotation.z,
    }
  }
}
