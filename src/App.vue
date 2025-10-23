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
    
    // UBAH: downloadInProgress akan di-reset setelah unduhan selesai.
    const downloadInProgress = ref(false); 
    const isInteracting = ref(false);
    const downloadCompleted = ref(false); // Ini akan jadi TRUE setelah unduhan pertama selesai

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

    // Tambahkan parameter untuk mengontrol mode tampilan (interaksi vs final)
    function drawCanvas(isFinal = false) { 
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
      
      // LOGIKA GARIS SNAP: Hanya tampilkan jika sedang berinteraksi DAN BUKAN mode final
      if (!isFinal && isInteracting.value && imageLoaded.value) {
        let showHorizontalLine = false;
        let showVerticalLine = false;

        const imageCenterX = imageRenderX + imageRenderWidth / 2;
        const imageCenterY = imageRenderY + imageRenderHeight / 2;

        // ... (Logika garis snap tetap sama) ...
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
        // LOGIKA OPASITAS TWIBBON: Opasitas hanya aktif jika sedang berinteraksi DAN BUKAN mode final
        ctx.value.globalAlpha = (!isFinal && isInteracting.value) ? 0.5 : 1; 
        ctx.value.drawImage(twibbon, 0, 0, cw, ch);
        ctx.value.globalAlpha = 1;
      }
    }

    function resizeCanvas() {
      const wrap = canvas.value.parentElement;
      const size = Math.min(wrap.clientWidth, window.innerHeight * 0.7);
      canvas.value.width = size;
      canvas.value.height = size;
      drawCanvas();
    }
    
    // ... (Fungsi loadImageFromFile, onFile, triggerUpload, triggerUploadIfNoImage, onDragOver, onDragLeave, onDrop tetap sama) ...
    // Pastikan `downloadCompleted.value = false;` dan `downloadInProgress.value = false;` ada di `loadImageFromFile` saat gambar baru diunggah. (Sudah ada, bagus!)
    
    function handleDownloadOrShare() {
      if (!imageLoaded.value || downloadInProgress.value) return; // Tambahkan pengamanan untuk mencegah klik ganda

      if (downloadCompleted.value) {
        shareResult();
      } else {
        downloadResult();
      }
    }

    function downloadResult() {
      downloadInProgress.value = true; 
      isInteracting.value = false; 
      
      // GAMBAR KANVAS DALAM MODE FINAL SEBELUM MENGAMBIL DATAURL
      drawCanvas(true); 

      const link = document.createElement("a");
      const hostname = window.location.hostname.replace(/^www\./, "");
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();

      link.download = `${hostname}-${day}-${month}-${year}.png`;
      link.href = canvas.value.toDataURL("image/png");
      link.click();
      
      // RESET: downloadInProgress kembali false setelah operasi selesai
      setTimeout(() => {
        downloadCompleted.value = true;
        downloadInProgress.value = false; // INI PERBAIKAN PENTING!
        drawCanvas(); // Gambar ulang dalam mode interaktif (jika perlu)
      }, 500); // Beri sedikit waktu untuk proses pengunduhan.
    }

    async function shareResult() {
      if (!imageLoaded.value) return;

      downloadInProgress.value = true; // Set TRUE saat mencoba berbagi
      isInteracting.value = false; 
      
      // GAMBAR KANVAS DALAM MODE FINAL SEBELUM MENGAMBIL DATAURL
      drawCanvas(true); 
      
      const dataUrl = canvas.value.toDataURL("image/png");

      if (navigator.share && navigator.canShare) { // Periksa navigator.share
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], 'twibbon-hasil.png', { type: 'image/png' });
          
          if (navigator.canShare({ files: [file] })) { // Periksa canShare dengan file
             await navigator.share({
                files: [file],
                title: 'Twibbon Keren!',
                text: 'Lihat twibbon keren yang kubuat!',
             });
             console.log('Konten berhasil dibagikan');
          } else if (navigator.canShare({ title: 'Twibbon Keren!', text: 'Lihat twibbon keren yang kubuat!', url: window.location.href })) {
             // Fallback jika tidak bisa share file, coba share teks/URL
             await navigator.share({
                title: 'Twibbon Keren!',
                text: 'Lihat twibbon keren yang kubuat! (Silakan unduh gambar dan bagikan secara manual): ' + window.location.href,
             });
             alert('Browser Anda tidak mendukung berbagi file gambar, tetapi tautan telah dibagikan.');

          } else {
             alert('Fungsi bagikan tidak didukung dengan file di browser ini. Silakan unduh gambar dan bagikan secara manual.');
          }

        } catch (error) {
          if (error.name !== 'AbortError') { // AbortError biasanya terjadi jika pengguna membatalkan
             console.error('Gagal membagikan:', error);
             alert('Gagal membagikan gambar. Silakan coba lagi atau unduh secara manual.');
          }
        }
      } else {
        alert('Fungsi bagikan tidak didukung di browser ini. Silakan unduh gambar dan bagikan secara manual.');
      }
      
      // Reset status setelah operasi berbagi selesai
      downloadInProgress.value = false;
      drawCanvas(); // Gambar ulang untuk mode interaksi
    }
    
    // ... (Fungsi Gesture dan Zoom onPointerDown, onPointerMove, onPointerUp, getDistance tetap sama, tapi sekarang mereka di-unblock karena downloadInProgress di-reset) ...

    function onPointerDown(e) {
      // Perbaikan: Hapus pengecekan `|| downloadInProgress.value` dari interaksi pointer, 
      // karena kita sudah mengontrol ini di `handleDownloadOrShare` dan statusnya di-reset.
      if (!imageLoaded.value) return; 
      
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
      if (!imageLoaded.value) return; // Hapus pengecekan downloadInProgress di sini juga
      // ... (sisa fungsi tetap sama) ...
      // ...
    }

    function onPointerUp() {
      if (!imageLoaded.value) return; // Hapus pengecekan downloadInProgress di sini juga
      // ... (sisa fungsi tetap sama) ...
      // ...
    }
    
    // ... (Sisa onMounted tetap sama) ...
    // Di onMounted, hapus pengecekan `|| downloadInProgress.value` dari listener `wheel`
    
    // Ubah di bagian onMounted untuk listener wheel:
    /*
    c.addEventListener("wheel", (e) => {
        if (!imageLoaded.value) return; // Hapus `|| downloadInProgress.value`
        e.preventDefault();
        // ... (sisa logika wheel) ...
    });
    */

    return {
      // ... (return statement tetap sama) ...
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
