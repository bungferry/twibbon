<template>
  <div class='app'>
    <div class='header'>
      <h2>Twibbon Editor (Vite + Vue)</h2>
      <div class='controls'>
        <label class='btn' for='file'>Unggah Foto</label>
        <input id='file' class='input-file' type='file' accept='image/*' @change='onFile' />
        <button class='btn' @click='download' :disabled='!imageLoaded'>Unduh</button>
      </div>
    </div>

    <div class='canvas-wrap'>
      <canvas ref='canvas' class='canvas'></canvas>
    </div>

    <div class='toolbar'>
      <small class='info'>Seret untuk memindahkan. Cubit dua jari untuk memperbesar. Scroll untuk zoom (desktop).</small>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  setup() {
    const canvas = ref(null)
    const ctx = ref(null)
    const userImage = ref(null)
    const twibbonImage = ref(null)
    const scale = ref(1)
    const offset = ref({ x: 0, y: 0 })
    const dragging = ref(false)
    const last = ref({ x: 0, y: 0 })
    const imageLoaded = ref(false)
    const twibbonUrl = '/twibbon.png'

    // ---- fungsi utama ----
    function draw() {
      const c = canvas.value
      if (!c || !ctx.value) return
      const context = ctx.value

      const size = Math.min(c.clientWidth, c.clientHeight)
      c.width = size
      c.height = size
      context.clearRect(0, 0, size, size)

      // gambar user proporsional (fit tengah)
      if (userImage.value) {
        const img = userImage.value
        const ratio = Math.min(size / img.width, size / img.height) * scale.value
        const drawW = img.width * ratio
        const drawH = img.height * ratio
        const dx = size / 2 - drawW / 2 + offset.value.x
        const dy = size / 2 - drawH / 2 + offset.value.y
        context.drawImage(img, dx, dy, drawW, drawH)
      }

      // gambar twibbon overlay
      if (twibbonImage.value) {
        context.drawImage(twibbonImage.value, 0, 0, size, size)
      }
    }

    function onFile(e) {
      const f = e.target.files && e.target.files[0]
      if (!f) return
      const reader = new FileReader()
      reader.onload = ev => {
        const img = new Image()
        img.onload = () => {
          userImage.value = img
          offset.value = { x: 0, y: 0 }
          scale.value = 1
          imageLoaded.value = true
          draw()
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(f)
    }

    function download() {
      draw()
      const link = document.createElement('a')
      link.download = 'twibbon-result.png'
      link.href = canvas.value.toDataURL('image/png')
      link.click()
    }

    // ---- event ----
    onMounted(() => {
      ctx.value = canvas.value.getContext('2d')

      const twibbon = new Image()
      twibbon.src = twibbonUrl
      twibbon.onload = () => {
        twibbonImage.value = twibbon
        draw()
      }

      // drag
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
      window.addEventListener('pointerup', () => (dragging.value = false))

      // zoom
      canvas.value.addEventListener(
        'wheel',
        e => {
          e.preventDefault()
          scale.value += e.deltaY > 0 ? -0.05 : 0.05
          scale.value = Math.max(0.3, Math.min(5, scale.value))
          draw()
        },
        { passive: false }
      )

      // resize
      window.addEventListener('resize', draw)
    })

    return { onFile, download, imageLoaded, canvas }
  }
}
</script>
