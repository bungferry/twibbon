<template>
  <div class="canvas-container">
    <canvas ref="canvas" class="canvas"></canvas>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  props: ['twibbonUrl'],
  setup(props, { expose }) {
    const canvas = ref(null)
    const ctx = ref(null)
    const userImage = ref(null)
    const twibbonImage = ref(null)
    const scale = ref(1)
    const offset = ref({ x: 0, y: 0 })
    const dragging = ref(false)
    const last = ref({ x: 0, y: 0 })

    function draw() {
      const c = canvas.value
      const context = ctx.value
      if (!context) return

      const size = Math.min(c.clientWidth, c.clientHeight)
      c.width = size
      c.height = size

      context.clearRect(0, 0, c.width, c.height)

      if (userImage.value) {
        const img = userImage.value
        const ratio = Math.min(c.width / img.width, c.height / img.height)
        const drawWidth = img.width * ratio * scale.value
        const drawHeight = img.height * ratio * scale.value
        const dx = c.width / 2 - drawWidth / 2 + offset.value.x
        const dy = c.height / 2 - drawHeight / 2 + offset.value.y
        context.drawImage(img, dx, dy, drawWidth, drawHeight)
      }

      if (twibbonImage.value) {
        context.drawImage(twibbonImage.value, 0, 0, c.width, c.height)
      }
    }

    function setImage(src) {
      const img = new Image()
      img.onload = () => {
        userImage.value = img
        offset.value = { x: 0, y: 0 }
        scale.value = 1
        draw()
      }
      img.src = src
    }

    function downloadComposite() {
      draw()
      const link = document.createElement('a')
      link.download = 'twibbon-result.png'
      link.href = canvas.value.toDataURL('image/png')
      link.click()
    }

    onMounted(() => {
      ctx.value = canvas.value.getContext('2d')

      const twibbon = new Image()
      twibbon.src = props.twibbonUrl
      twibbon.onload = () => {
        twibbonImage.value = twibbon
        draw()
      }

      let startDist = 0

      canvas.value.addEventListener('pointerdown', e => {
        dragging.value = true
        last.value = { x: e.clientX, y: e.clientY }
      })

      window.addEventListener('pointermove', e => {
        if (!dragging.value) return
        offset.value.x += e.clientX - last.value.x
        offset.value.y += e.clientY - last.value.y
        last.value = { x: e.clientX, y: e.clientY }
        draw()
      })

      window.addEventListener('pointerup', () => dragging.value = false)

      canvas.value.addEventListener('wheel', e => {
        e.preventDefault()
        scale.value += e.deltaY > 0 ? -0.05 : 0.05
        if (scale.value < 0.2) scale.value = 0.2
        if (scale.value > 5) scale.value = 5
        draw()
      }, { passive: false })
    })

    expose({ setImage, downloadComposite })
    return { canvas }
  }
}
</script>

<style scoped>
.canvas-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  aspect-ratio: 1 / 1;
  position: relative;
}

.canvas {
  width: 100%;
  height: auto;
  background: #f3f3f3;
  border-radius: 10px;
  display: block;
}
</style>
