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
        Seret untuk memindahkan. Cubit dua jari untuk memperbesar. Scroll untuk zoom (desktop).
      </small>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  setup() {
    const canvas = ref(null)
    const ctx = ref(null)
    const imageLoaded = ref(false)
    const twibbonUrl = '/twibbon.png'
    const twibbonImg = new Image()
    twibbonImg.src = twibbonUrl
    const userImg = ref(null)

    let pos = { x: 0, y: 0 }
    let scale = 1
    let dragging = false
    let last = { x: 0, y: 0, dist: 0 }

    onMounted(() => {
      const c = canvas.value
      ctx.value = c.getContext('2d')
      resizeCanvas()
      drawPlaceholder()

      window.addEventListener('resize', resizeCanvas)
      c.addEventListener('mousedown', startDrag)
      c.addEventListener('mousemove', onDrag)
      c.addEventListener('mouseup', endDrag)
      c.addEventListener('wheel', onWheel)
      c.addEventListener('touchstart', onTouchStart)
      c.addEventListener('touchmove', onTouchMove)
      c.addEventListener('touchend', endDrag)
    })

    function resizeCanvas() {
      const c = canvas.value
      c.width = c.clientWidth
      c.height = c.clientHeight
      draw()
    }

    function drawPlaceholder() {
      const c = ctx.value
      const { width, height } = canvas.value
      c.fillStyle = '#222'
      c.fillRect(0, 0, width, height)
      c.fillStyle = '#888'
      c.textAlign = 'center'
      c.font = '14px sans-serif'
      c.fillText('Unggah foto untuk mulai', width / 2, height / 2)
    }

    function draw() {
      const c = ctx.value
      const { width, height } = canvas.value
      c.clearRect(0, 0, width, height)

      if (userImg.value) {
        const iw = userImg.value.width * scale
        const ih = userImg.value.height * scale
        const x = width / 2 - iw / 2 + pos.x
        const y = height / 2 - ih / 2 + pos.y
        c.drawImage(userImg.value, x, y, iw, ih)
      } else {
        drawPlaceholder()
      }

      if (twibbonImg.complete) {
        c.drawImage(twibbonImg, 0, 0, width, height)
      } else {
        twibbonImg.onload = () => draw()
      }
    }

    function onFile(e) {
      const f = e.target.files && e.target.files[0]
      if (!f) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => {
          userImg.value = img
          imageLoaded.value = true
          pos = { x: 0, y: 0 }
          scale = 1
          draw()
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(f)
    }

    function startDrag(e) {
      dragging = true
      last.x = e.clientX
      last.y = e.clientY
    }

    function onDrag(e) {
      if (!dragging || !userImg.value) return
      pos.x += e.clientX - last.x
      pos.y += e.clientY - last.y
      last.x = e.clientX
      last.y = e.clientY
      draw()
    }

    function endDrag() {
      dragging = false
    }

    function onWheel(e) {
      if (!userImg.value) return
      const delta = e.deltaY < 0 ? 1.1 : 0.9
      scale *= delta
      draw()
    }

    function getDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function onTouchStart(e) {
      if (e.touches.length === 1) {
        dragging = true
        last.x = e.touches[0].clientX
        last.y = e.touches[0].clientY
      } else if (e.touches.length === 2) {
        last.dist = getDist(e.touches)
      }
    }

    function onTouchMove(e) {
      e.preventDefault()
      if (!userImg.value) return
      if (e.touches.length === 1 && dragging) {
        pos.x += e.touches[0].clientX - last.x
        pos.y += e.touches[0].clientY - last.y
        last.x = e.touches[0].clientX
        last.y = e.touches[0].clientY
        draw()
      } else if (e.touches.length === 2) {
        const newDist = getDist(e.touches)
        const delta = newDist / last.dist
        scale *= delta
        last.dist = newDist
        draw()
      }
    }

    function download() {
      const link = document.createElement('a')
      link.download = 'twibbon-result.png'
      link.href = canvas.value.toDataURL('image/png')
      link.click()
    }

    return { onFile, download, imageLoaded, canvas }
  }
}
</script>
