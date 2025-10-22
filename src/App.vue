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
    const twibbonUrl = '/twibbon.png'
    const imageLoaded = ref(false)
    const userImage = ref(null)
    const twibbon = new Image()

    // Atur ukuran canvas agar selalu 1:1 dan responsif
    function resizeCanvas() {
      const wrap = canvas.value.parentElement
      const size = Math.min(wrap.clientWidth, window.innerHeight * 0.7)
      canvas.value.width = size
      canvas.value.height = size
      drawCanvas()
    }

    // Gambar ulang semua elemen ke canvas
    function drawCanvas() {
      if (!ctx.value) return
      ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)

      // Gambar foto user (proporsional, tidak crop)
      if (userImage.value) {
        const cw = canvas.value.width
        const ch = canvas.value.height
        const iw = userImage.value.width
        const ih = userImage.value.height

        const scale = Math.min(cw / iw, ch / ih)
        const nw = iw * scale
        const nh = ih * scale
        const x = (cw - nw) / 2
        const y = (ch - nh) / 2

        ctx.value.drawImage(userImage.value, x, y, nw, nh)
      }

      // Gambar twibbon di atasnya
      if (twibbon.complete) {
        ctx.value.drawImage(twibbon, 0, 0, canvas.value.width, canvas.value.height)
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

    onMounted(() => {
      ctx.value = canvas.value.getContext('2d')
      twibbon.onload = drawCanvas
      twibbon.src = twibbonUrl
      resizeCanvas()
      window.addEventListener('resize', resizeCanvas)
    })

    return { onFile, download, canvas, imageLoaded }
  }
}
</script>
