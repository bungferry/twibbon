<template>
  <canvas ref="canvas" class="canvas"></canvas>
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
      context.clearRect(0, 0, size, size)

      if (userImage.value) {
        const img = userImage.value
        // hitung rasio supaya gambar fit proporsional
        const scaleRatio = Math.min(size / img.width, size / img.height) * scale.value
        const drawWidth = img.width * scaleRatio
        const drawHeight = img.height * scaleRatio
        const dx = size / 2 - drawWidth / 2 + offset.value.x
        const dy = size / 2 - drawHeight / 2 + offset.value.y
        context.drawImage(img, dx, dy, drawWidth, drawHeight)
      }

      if (twibbonImage.value) {
        context.drawImage(twibbonImage.value, 0, 0, size, size)
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

      // zoom (scroll)
      canvas.value.addEventListener(
        'wheel',
        e => {
          e.preventDefault()
          scale.value += e.deltaY > 0 ? -0.05 : 0.05
          scale.value = Math.max(0.2, Math.min(5, scale.value))
          draw()
        },
        { passive: false }
      )

      // responsive fix
      window.addEventListener('resize', draw)
    })

    expose({ setImage, downloadComposite })
    return { canvas }
  }
}
</script>
