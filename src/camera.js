import { VIDEO_SIZE } from './params'
import { drawResults, isMobile } from './util'

export class Camera {
  constructor() {
    this.video = document.getElementById('video')
    this.canvas = document.getElementById('output')
    this.canvas2 = document.getElementById('output2')
    this.ctx = this.canvas.getContext('2d')
    this.ctx2 = this.canvas2.getContext('2d')
  }

  /**
   * Initiate a Camera instance and wait for the camera stream to be ready.
   * @param cameraParam From app `STATE.camera`.
   */
  static async setupCamera(cameraParam) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser API navigator.mediaDevices.getUserMedia not available')
    }

    const { targetFPS, sizeOption } = cameraParam
    const $size = VIDEO_SIZE[sizeOption]
    const videoConfig = {
      audio: false,
      video: {
        facingMode: 'user',
      },
    }

    const stream = await navigator.mediaDevices.getUserMedia(videoConfig)

    const camera = new Camera()
    camera.video.srcObject = stream

    await new Promise((resolve) => {
      camera.video.onloadedmetadata = () => {
        resolve(video)
      }
    })

    camera.video.play()

    const videoWidth = '640' || camera.video.videoWidth
    const videoHeight = '480' || camera.video.videoHeight
    // Must set below two lines, otherwise video element doesn't show.
    camera.video.width = videoWidth
    camera.video.height = videoHeight

    camera.canvas.width = videoWidth
    camera.canvas.height = videoHeight
    const canvasContainer = document.querySelector('.canvas-wrapper')
    canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`

    // Because the image from camera is mirrored, need to flip horizontally.
    const scale = Math.max(640 / camera.video.videoWidth, 480 / camera.video.videoHeight)
    const translateX = ((camera.video.videoWidth * 640 / camera.video.videoWidth) + (camera.video.videoWidth * 480 / camera.video.videoHeight)) / 2
    const translateY = 0

    camera.ctx.translate(translateX, translateY)
    camera.ctx.scale(-scale, scale)

    camera.ctx2.translate(translateX, translateY)
    camera.ctx2.scale(-scale, scale)

    return camera
  }

  drawCtx() {
    this.ctx.drawImage(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight)
    this.ctx2.drawImage(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight)
  }

  drawResults(faces, triangulateMesh, boundingBox) {
    drawResults(this.ctx, faces, triangulateMesh, boundingBox)
  }
}
