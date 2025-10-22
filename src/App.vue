<template>
  <div class="app">
    <div class="header">
      <h2>Twibbon Editor (Vite + Vue)</h2>
      <div class="controls">
        <button class="btn" @click="triggerUpload">Unggah Foto</button>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="onFile"
          style="display: none"
        />
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
import { ref, onMounted } from "vue";

export default {
  setup() {
    const canvas = ref(null);
    const ctx = ref(null);
    const twibbonUrl = "/twibbon.png";
    const imageLoaded = ref(false);
    const userImage = ref(null);
    const twibbon = new Image();
    const fileInput = ref(null);

    // Posisi dan skala
    const offsetX = ref(0);
    const offsetY = ref(0);
    const scale = ref(1);
    const lastX = ref(0);
    const lastY = ref(0);
    const isDragging = ref(false);
    let lastDistance = null;

    function resizeCanvas() {
      const wrap = canvas.value.parentElement;
      const size = Math.min(wrap.clientWidth, window.innerHeight * 0.7);
      canvas.value.width = size;
      canvas.value.height = size;
      drawCanvas();
    }

    function drawCanvas() {
      if (!ctx.value) return;
      const cw = canvas.value.width;
      const ch = canvas.value.height;
      ctx.value.clearRect(0, 0, cw, ch);

      if (userImage.value) {
        const iw = userImage.value.width;
        const ih = userImage.value.height;
        const baseScale = Math.min(cw / iw, ch / ih);
        const finalScale = baseScale * scale.value;
        const nw = iw * finalScale;
        const nh = ih * finalScale;
        const x = cw / 2 - nw / 2 + offsetX.value;
        const y = ch / 2 - nh / 2 + offsetY.value;
        ctx.value.drawImage(userImage.value, x, y, nw, nh);
      } else {
        // === Placeholder teks saat belum ada gambar ===
        ctx.value.fillStyle = "#aaa";
        ctx.value.font = `${Math.floor(cw / 20)}px 'Segoe UI', sans-serif`;
        ctx.value.textAlign = "center";
        ctx.font = '14px sans-serif'
        ctx.value.fillText("Unggah foto untuk mulai membuat twibbon", cw / 2, ch / 2);
      }

      if (twibbon.complete) {
        ctx.value.drawImage(twibbon, 0, 0, cw, ch);
      }
    }

    function onFile(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          userImage.value = img;
          imageLoaded.value = true;
          offsetX.value = 0;
          offsetY.value = 0;
          scale.value = 1;
          drawCanvas();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }

    function triggerUpload() {
      fileInput.value && fileInput.value.click();
    }

    function download() {
      const link = document.createElement("a");
      link.download = "twibbon-result.png";
      link.href = canvas.value.toDataURL("image/png");
      link.click();
    }

    // === Gesture dan Zoom ===
    function onPointerDown(e) {
      if (e.touches && e.touches.length === 2) {
        lastDistance = getDistance(e.touches);
      } else {
        isDragging.value = true;
        lastX.value = e.clientX || e.touches[0].clientX;
        lastY.value = e.clientY || e.touches[0].clientY;
      }
    }

    function onPointerMove(e) {
      if (e.touches && e.touches.length === 2) {
        const newDistance = getDistance(e.touches);
        if (lastDistance) {
          const delta = newDistance / lastDistance;
          scale.value *= delta;
          scale.value = Math.min(Math.max(scale.value, 0.5), 3);
          drawCanvas();
        }
        lastDistance = newDistance;
      } else if (isDragging.value) {
        const x = e.clientX || e.touches[0].clientX;
        const y = e.clientY || e.touches[0].clientY;
        offsetX.value += x - lastX.value;
        offsetY.value += y - lastY.value;
        lastX.value = x;
        lastY.value = y;
        drawCanvas();
      }
    }

    function onPointerUp() {
      isDragging.value = false;
      lastDistance = null;
    }

    function getDistance(touches) {
      const [a, b] = touches;
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    onMounted(() => {
      ctx.value = canvas.value.getContext("2d");
      twibbon.onload = drawCanvas;
      twibbon.src = twibbonUrl;
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      const c = canvas.value;
      c.addEventListener("mousedown", onPointerDown);
      c.addEventListener("mousemove", onPointerMove);
      c.addEventListener("mouseup", onPointerUp);
      c.addEventListener("mouseleave", onPointerUp);
      c.addEventListener("touchstart", onPointerDown);
      c.addEventListener("touchmove", onPointerMove);
      c.addEventListener("touchend", onPointerUp);
      c.addEventListener("wheel", (e) => {
        e.preventDefault();
        scale.value *= e.deltaY < 0 ? 1.1 : 0.9;
        scale.value = Math.min(Math.max(scale.value, 0.5), 3);
        drawCanvas();
      });
    });

    return { onFile, triggerUpload, download, canvas, imageLoaded, fileInput };
  },
};
</script>
