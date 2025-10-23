<template>
  <div class="app">
    <div class="header">
      <h2>Twibbon Editor (Vite + Vue)</h2>
      <div class="controls">
        <!-- Input file tetap ada tapi tersembunyi, terpicu oleh tombol di drop-area -->
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="onFile"
          style="display: none"
        />
        <!-- Tombol "Unduh" lama di header dihapus -->
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

      <!-- Drop Area -->
      <div
        v-if="!imageLoaded"
        :class="['drop-area', { hover: isDragOver }]"
      >
        <div class="drop-area-text">Seret & lepas gambar di sini</div>
        <button class="btn" @click.stop="triggerUpload">Atau klik untuk mengunggah</button>
      </div>

      <!-- Tombol Unduh/Bagikan yang baru (di pojok kanan bawah canvas) -->
      <button
        v-if="imageLoaded"
        class="download-share-btn"
        @click="handleDownloadOrShare"
        :disabled="downloadInProgress"
        :title="downloadCompleted ? 'Bagikan Hasil' : 'Unduh Gambar'"
      >
        <i :class="downloadCompleted ? 'fas fa-share-alt' : 'fas fa-download'"></i>
      </button>
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
    
    // Variabel ini hanya untuk menonaktifkan tombol saat proses unduh/share berjalan
    const downloadInProgress = ref(false); 
    const isInteracting = ref(false);
    const downloadCompleted = ref(false); // TRUE setelah unduhan pertama selesai
    
    // 🌟 PERBAIKAN: Variabel status baru untuk MENGUNCI PERMANEN interaksi geser/zoom.
    const isCanvasLocked = ref(false); 

    // Posisi dan skala
    const offsetX = ref(0);
    const offsetY = ref(0);
    const scale = ref(1);
    const lastX = ref(0);
    const lastY = ref(0);
    const isDragging = ref(false);
    let lastDistance = null;

    // Threshold untuk snapping center (misal 10 pixel)
    const SNAP_THRESHOLD = 10;

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

      let imageRenderX = 0;
      let imageRenderY = 0;
      let imageRenderWidth = 0;
      let imageRenderHeight = 0;

      if (userImage.value) {
        const iw = userImage.value.width;
        const ih = userImage.value.height;
        const baseScale = Math.min(cw / iw, ch / ih);
        const finalScale = baseScale * scale.value;
        const nw = iw * finalScale;
        const nh = ih * finalScale;

        imageRenderWidth = nw;
        imageRenderHeight = nh;
        imageRenderX = cw / 2 - nw / 2 + offsetX.value;
        imageRenderY = ch / 2 - nh / 2 + offsetY.value;

        ctx.value.drawImage(userImage.value, imageRenderX, imageRenderY, nw, nh);
      }
      
      // Menggunakan isCanvasLocked di sini juga untuk menonaktifkan garis bantu
      if (isInteracting.value && imageLoaded.value && !isCanvasLocked.value) {
        let showHorizontalLine = false;
        let showVerticalLine = false;
        // ... (Logika garis snap tetap sama) ...
        const imageCenterX = imageRenderX + imageRenderWidth / 2;
        const imageCenterY = imageRenderY + imageRenderHeight / 2;

        if (Math.abs(imageCenterX - cw / 2) < SNAP_THRESHOLD) {
          showVerticalLine = true;
        }
        if (Math.abs(imageCenterY - ch / 2) < SNAP_THRESHOLD) {
          showHorizontalLine = true;
        }

        ctx.value.strokeStyle = "rgba(255, 255, 255, 0.6)"; // Warna putih
        ctx.value.lineWidth = 1;
        ctx.value.setLineDash([5, 5]);

        if (showHorizontalLine) {
          ctx.value.beginPath();
          ctx.value.moveTo(0, ch / 2);
          ctx.value.lineTo(cw, ch / 2);
          ctx.value.stroke();
        }

        if (showVerticalLine) {
          ctx.value.beginPath();
          ctx.value.moveTo(cw / 2, 0);
          ctx.value.lineTo(cw / 2, ch);
          ctx.value.stroke();
        }

        ctx.value.setLineDash([]);
      }

      if (twibbon.complete) {
        // Opasitas Twibbon sekarang dikontrol oleh isInteracting DAN isCanvasLocked
        ctx.value.globalAlpha = (isInteracting.value && !isCanvasLocked.value) ? 0.5 : 1;
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
          downloadCompleted.value = false; 
          downloadInProgress.value = false; 
          isCanvasLocked.value = false; // Reset lock saat gambar baru diunggah
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
      // Menggunakan isCanvasLocked untuk mencegah upload jika sudah terkunci
      if (!imageLoaded.value && !isCanvasLocked.value) { 
        triggerUpload();
      }
    }

    function onDragOver() {
      if (!imageLoaded.value && !isCanvasLocked.value) {
        isDragOver.value = true;
      }
    }

    function onDragLeave() {
      isDragOver.value = false;
    }

    function onDrop(e) {
      isDragOver.value = false;
      if (!imageLoaded.value && !isCanvasLocked.value && e.dataTransfer.files.length > 0) {
        loadImageFromFile(e.dataTransfer.files[0]);
      }
    }

    function handleDownloadOrShare() {
      if (!imageLoaded.value) return; 

      if (downloadCompleted.value) {
        shareResult();
      } else {
        downloadResult();
      }
    }

    function downloadResult() {
      downloadInProgress.value = true; // Mengaktifkan status loading tombol
      isInteracting.value = false; 
      drawCanvas(); 

      const link = document.createElement("a");
      const hostname = window.location.hostname.replace(/^www\./, "");
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();

      link.download = `${hostname}-${day}-${month}-${year}.png`;
      link.href = canvas.value.toDataURL("image/png");
      link.click();

      setTimeout(() => {
        downloadCompleted.value = true;
        // 🌟 PERBAIKAN: Setelah unduhan selesai, buka kunci tombol
        downloadInProgress.value = false; 
        // 🌟 PERBAIKAN: Set kunci kanvas PERMANEN
        isCanvasLocked.value = true;
        drawCanvas();
      }, 500);
    }

    async function shareResult() {
      if (!imageLoaded.value) return; 

      downloadInProgress.value = true; // Kunci tombol saat berbagi
      isInteracting.value = false;
      drawCanvas();
      
      const dataUrl = canvas.value.toDataURL("image/png");

      if (navigator.share) {
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], 'twibbon-hasil.png', { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
                files: [file],
                title: 'Twibbon Keren!',
                text: 'Lihat twibbon keren yang kubuat!',
             });
          } else {
             const shareData = {
                title: 'Twibbon Keren!',
                text: 'Lihat twibbon keren yang kubuat!',
                url: window.location.href 
             };

             if (navigator.canShare(shareData)) {
                 await navigator.share(shareData);
                 alert('Berbagi file gambar tidak didukung di sini. Tautan telah dibagikan.');
             } else {
                 alert('Fungsi bagikan tidak didukung. Silakan unduh gambar secara manual.');
             }
          }

        } catch (error) {
          if (error.name !== 'AbortError') { 
             console.error('Gagal membagikan:', error);
             alert('Gagal membagikan gambar. Silakan coba lagi atau unduh secara manual.');
          }
        } finally {
          // 🌟 PERBAIKAN: Buka kunci tombol setelah selesai berbagi
          downloadInProgress.value = false; 
          drawCanvas();
        }
      } else {
        alert('Fungsi bagikan tidak didukung di browser ini. Silakan unduh gambar dan bagikan secara manual.');
        downloadInProgress.value = false; 
      }
    }

    // === Gesture dan Zoom ===
    // Semua fungsi gesture sekarang memeriksa isCanvasLocked
    function onPointerDown(e) {
      if (!imageLoaded.value || isCanvasLocked.value) return; // Menggunakan isCanvasLocked

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
      if (!imageLoaded.value || isCanvasLocked.value) return; // Menggunakan isCanvasLocked

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
      if (!imageLoaded.value || isCanvasLocked.value) return; // Menggunakan isCanvasLocked

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
        if (!imageLoaded.value || isCanvasLocked.value) return; // Menggunakan isCanvasLocked
        e.preventDefault();
        isInteracting.value = true;
        drawCanvas();
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
      handleDownloadOrShare,
      canvas,
      imageLoaded,
      fileInput,
      isDragOver,
      onDragOver,
      onDragLeave,
      onDrop,
      downloadInProgress,
      downloadCompleted,
    };
  },
};
</script> 
