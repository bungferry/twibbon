<template>
  <div class="app">
    <div class="header">
      <h2>Twibbon Editor (Vite + Vue)</h2>
      <div class="controls">
        <label class="btn" for="file">Unggah Foto</label>
        <input id="file" class="input-file" type="file" accept="image/*" @change="onFile" />
        <button class="btn" @click="download" :disabled="!imageLoaded">Unduh</button>
      </div>
    </div>

    <div class="canvas-wrap">
      <canvas ref="canvas" class="canvas"></canvas>
    </div>

    <div class="toolbar">
      <small class="info">
        Seret 1 jari untuk memindahkan, cubit 2 jari untuk memperbesar, scroll untuk zoom (desktop)
      </small>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  setup() {
    const canvas = ref(null)
    const ctx = ref(null)
    const imageLoaded = ref(false)
    const userImage = ref(null)
    const twibbon = new Image()
    const twibbonUrl = '/twibbon.png'

    // transformasi posisi dan skala
    const offsetX = ref(0)
    const offsetY = ref(0)
    const scale = ref(1)
    let isDragging = false
    let lastX = 0
    let lastY = 0
    let lastDistance = 0

    function resizeCanvas() {
      const wrap = canvas.value.parentElement
      const size = Math.min(wrap.clientWidth, window.innerHeight * 0.7)
      canvas.value.width = size
      canvas.value.height = size
      drawCanvas()
    }

    function drawCanvas() {
      if (!ctx.value) return
      const cw = canvas.value.width
      const ch = canvas.value.height
      ctx.value.clearRect(0, 0, cw, ch)

      if (userImage.value) {
        const iw = userImage.value.width
        const ih = userImage.value.height
        const baseScale = Math.min(cw / iw, ch / ih)
        const newW = iw * baseScale * scale.value
        const newH = ih * baseScale * scale.value
        const x = (cw - newW) / 2 + offsetX.value
        const y = (ch - newH) / 2 + offsetY.value
        ctx.value.drawImage(userImage.value, x, y, newW, newH)
      }

      if (twibbon.complete) {
        ctx.value.drawImage(twibbon, 0, 0, cw, ch)
      }
    }

    function onFile(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        const img = new Image()
        img.onload = () => {
          userImage.value = img
          imageLoaded.value = true
          offsetX.value = 0
          offsetY.value = 0
          scale.value = 1
          drawCanvas()
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(file)
    }

    function download() {
      const link = document.createElement('a')
      link.download = 'twibbon-result.png'
      link.href = canvas.value.toDataURL('image/png')
      link.click()
    }

    function handleDown(e) {
      isDragging = true
      const touch = e.touches ? e.touches[0] : e
      lastX = touch.clientX
      lastY = touch.clientY
    }

    function handleMove(e) {
      if (!userImage.value) return
      if (e.touches && e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        if (lastDistance) {
          const delta = dist - lastDistance
          scale.value = Math.max(0.5, Math.min(5, scale.value + delta / 200))
          drawCanvas()
        }
        lastDistance = dist
        return
      }

      if (!isDragging || (e.touches && e.touches.length > 1)) return
      const touch = e.touches ? e.touches[0] : e
      const dx = touch.clientX - lastX
      const dy = touch.clientY - lastY
      lastX = touch.clientX
      lastY = touch.clientY
      offsetX.value += dx
      offsetY.value += dy
      drawCanvas()
    }

    function handleUp() {
      isDragging = false
      lastDistance = 0
    }

    function handleWheel(e) {
      if (!userImage.value) return
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      scale.value = Math.max(0.5, Math.min(5, scale.value + delta))
      drawCanvas()
    }

    onMounted(() => {
      ctx.value = canvas.value.getContext('2d')
      twibbon.onload = drawCanvas
      twibbon.src = twibbonUrl
      resizeCanvas()

      window.addEventListener('resize', resizeCanvas)
      canvas.value.addEventListener('mousedown', handleDown)
      canvas.value.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)

      canvas.value.addEventListener('touchstart', handleDown)
      canvas.value.addEventListener('touchmove', handleMove)
      canvas.value.addEventListener('touchend', handleUp)
      canvas.value.addEventListener('wheel', handleWheel)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mouseup', handleUp)
    })

    return { canvas, onFile, download, imageLoaded }
  }
}
</script>
