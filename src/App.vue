<template>
  <div class="app">
    <div class="header">
      <h2>Twibbon Editor (Vite + Vue)</h2>
      <div class="controls">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="onFile"
          style="display: none"
        />
        <button class="btn" @click="download" :disabled="!imageLoaded || downloadInProgress">Unduh</button>
      </div>
    </div>

    <div
      class="canvas-wrap"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
      @click="triggerUploadIfNoImage"
    >
      <canvas ref="canvas" class="canvas"></canvas>

      <div
        v-if="!imageLoaded"
        :class="['drop-area', { hover: isDragOver }]"
      >
        <div class="drop-area-text">Seret & lepas gambar di sini</div>
        <button class="btn" @click.stop="triggerUpload">Atau klik untuk mengunggah</button>
      </div>
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
    const isDragOver = ref(false);
    const downloadInProgress = ref(false);
    const isInteracting = ref(false);

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
      }

      // <--- Logika baru: Gambar garis titik pusat jika sedang berinteraksi
      if (isInteracting.value && imageLoaded.value && !downloadInProgress.value) {
        ctx.value.strokeStyle = "rgba(0, 0, 0, 0.4)"; // Warna garis
        ctx.value.lineWidth = 1;
        ctx.value.setLineDash([5, 5]); // Garis putus-putus

        // Garis Horizontal
        ctx.value.beginPath();
        ctx.value.moveTo(0, ch / 2);
        ctx.value.lineTo(cw, ch / 2);
        ctx.value.stroke();

        // Garis Vertikal
        ctx.value.beginPath();
        ctx.value.moveTo(cw / 2, 0);
        ctx.value.lineTo(cw / 2, ch);
        ctx.value.stroke();

        ctx.value.setLineDash([]); // Kembalikan ke garis solid
      }

      if (twibbon.complete) {
        ctx.value.globalAlpha = isInteracting.value ? 0.5 : 1;
        ctx.value.drawImage(twibbon, 0, 0, cw, ch);
        ctx.value.globalAlpha = 1;
      }
    }

    function loadImageFromFile(file) {
      if (!file || !file.type.startsWith("image/")) return;

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

    function onFile(e) {
      const file = e.target.files && e.target.files[0];
      loadImageFromFile(file);
    }

    function triggerUpload() {
      fileInput.value && fileInput.value.click();
    }

    function triggerUploadIfNoImage() {
      if (!imageLoaded.value && !downloadInProgress.value) {
        triggerUpload();
      }
    }

    function onDragOver() {
      if (!imageLoaded.value && !downloadInProgress.value) {
        isDragOver.value = true;
      }
    }

    function onDragLeave() {
      isDragOver.value = false;
    }

    function onDrop(e) {
      isDragOver.value = false;
      if (!imageLoaded.value && !downloadInProgress.value && e.dataTransfer.files.length > 0) {
        loadImageFromFile(e.dataTransfer.files[0]);
      }
    }

    function download() {
      if (!imageLoaded.value || downloadInProgress.value) return;

      downloadInProgress.value = true;

      const link = document.createElement("a");
      const hostname = window.location.hostname.replace(/^www\./, "");
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();

      link.download = `${hostname}-${day}-${month}-${year}.png`;
      link.href = canvas.value.toDataURL("image/png");
      link.click();
    }

    // === Gesture dan Zoom ===
    function onPointerDown(e) {
      if (!imageLoaded.value || downloadInProgress.value) return;

      isInteracting.value = true;
      if (e.touches && e.touches.length === 2) {
        lastDistance = getDistance(e.touches);
      } else {
        isDragging.value = true;
        lastX.value = e.clientX || e.touches[0].clientX;
        lastY.value = e.clientY || e.touches[0].clientY;
      }
      drawCanvas();
    }

    function onPointerMove(e) {
      if (!imageLoaded.value || downloadInProgress.value) return;

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
      if (!imageLoaded.value || downloadInProgress.value) return;

      isDragging.value = false;
      lastDistance = null;
      isInteracting.value = false;
      drawCanvas();
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
        if (!imageLoaded.value || downloadInProgress.value) return;
        e.preventDefault();
        isInteracting.value = true;
        drawCanvas(); // Panggil segera untuk tampilkan garis & transparan twibbon
        scale.value *= e.deltaY < 0 ? 1.1 : 0.9;
        scale.value = Math.min(Math.max(scale.value, 0.5), 3);
        drawCanvas();
        clearTimeout(c.wheelTimeout);
        c.wheelTimeout = setTimeout(() => {
          isInteracting.value = false;
          drawCanvas();
        }, 150);
      });
    });

    return {
      onFile,
      triggerUpload,
      triggerUploadIfNoImage,
      download,
      canvas,
      imageLoaded,
      fileInput,
      isDragOver,
      onDragOver,
      onDragLeave,
      onDrop,
      downloadInProgress,
    };
  },
};
</script>
