<template>
    <div class="app">
        <div class="header">
            <h3>Buat Twibbon Keren!</h3>
            
            <div class="controls">
                <input ref="fileInput" type="file" accept="image/*" @change="onFile" style="display: none" />
                
                <div class="support-count-header">
                    <i class="fas fa-user-friends"></i> 
                    
                    <span v-if="isLoading">Memuat...</span>
                    <span v-else class="count-number">
                        {{ supportCount.toLocaleString('id-ID') }} Dukungan
                    </span>
                </div>
                
                <button @click="incrementManualSupport" class="btn btn-dev">
                    <i class="fas fa-arrow-up"></i> +1
                </button>
            </div>
        </div>
        
        <div 
            class="canvas-wrap" 
            @drop.prevent="onDrop" 
            @dragover.prevent="onDragOver" 
            @dragleave.prevent="onDragLeave"
            @click="triggerUploadIfNoImage"
        >
            <canvas ref="canvas"></canvas>
            
            <div 
                v-if="!imageLoaded && !isCanvasLocked"
                :class="['drop-area', { hover: isDragOver }]"
                @click.stop="triggerUpload"
            >
                <i class="fas fa-image fa-2x"></i>
                <div class="drop-area-text">Seret & Lepas Gambar di Sini, atau Klik</div>
                <button class="btn">Pilih Gambar</button>
            </div>

            <button
                v-if="imageLoaded"
                @click.stop="handleDownloadOrShare"
                :disabled="downloadInProgress"
                class="download-share-btn"
            >
                <i v-if="downloadInProgress" class="fas fa-spinner fa-spin"></i>
                <i v-else-if="downloadCompleted" class="fas fa-share-alt"></i>
                <i v-else class="fas fa-download"></i>
            </button>
        </div>

        <div class="toolbar">
            <button 
                @click="triggerUpload" 
                :disabled="isCanvasLocked"
                class="btn"
            >
                <i class="fas fa-upload"></i> Ganti Gambar
            </button>
            <small>Atur gambar dengan seret, cubit/scroll, atau putar.</small>
        </div>
    </div>
</template>

<script>
    import {
        ref,
        onMounted
    } from "vue";
    
    // Sesuaikan path ke koneksi Supabase Anda
    import { supabase } from './lib/supabaseClient'; 

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
            const downloadCompleted = ref(false);
            const isCanvasLocked = ref(false);
            const isLoading = ref(true); 

            // Posisi dan skala
            const offsetX = ref(0);
            const offsetY = ref(0);
            const scale = ref(1);
            const lastX = ref(0);
            const lastY = ref(0);
            const isDragging = ref(false);
            let lastDistance = null;

            const SNAP_THRESHOLD = 10;
            
            // Variabel Supabase
            const TWIBBON_METRIC_ID = 1; 
            const supportCount = ref(0); 
            
            // ------------------------------------
            // FUNGSI SUPABASE
            // ------------------------------------

            async function fetchSupportCount() {
              try {
                const { data, error } = await supabase
                  .from('metrics')
                  .select('count_total')
                  .eq('id', TWIBBON_METRIC_ID)
                  .single(); 

                if (error) {
                  console.error("Gagal mengambil total dukungan:", error.message);
                  if (error.code === 'PGRST116') {
                     supportCount.value = 0;
                  }
                  return;
                }
                
                supportCount.value = data.count_total;

              } catch (e) {
                console.error("Kesalahan koneksi saat mengambil hitungan:", e);
              } finally {
                isLoading.value = false;
              }
            }

            async function trackSupport() {
              try {
                // Tambahkan lokal dulu untuk pengalaman instan (agar tidak stuck)
                supportCount.value += 1; 

                const { error } = await supabase.rpc('increment_twibbon_count', { 
                  twibbon_id: TWIBBON_METRIC_ID
                });
                
                if (error) {
                  console.error("Gagal melacak dukungan di server:", error.message);
                } else {
                  console.log("RPC ke server berhasil (Menunggu sinkronisasi Real-time).");
                }
              } catch (e) {
                console.error("Kesalahan koneksi Supabase:", e);
              }
            }
            
            // 🌟 FUNGSI BARU UNTUK TOMBOL MANUAL
            function incrementManualSupport() {
                trackSupport();
                console.log("Manual support added!");
            }


            // ------------------------------------
            // FUNGSI REAL-TIME LISTENER
            // ------------------------------------
            function subscribeToSupportChanges() {
              supabase.removeChannel('twibbon-support-channel');

              const supportChannel = supabase
                .channel('twibbon-support-channel')
                .on(
                  'postgres_changes',
                  { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'metrics', 
                    filter: `id=eq.${TWIBBON_METRIC_ID}`
                  },
                  (payload) => {
                    if (payload.new && payload.new.count_total !== undefined) {
                      // Ambil nilai terkini dari server untuk sinkronisasi global
                      supportCount.value = payload.new.count_total; 
                    }
                  }
                )
                .subscribe((status) => {
                  if (status === 'SUBSCRIBED') {
                    console.log('Real-time Supabase terhubung.');
                  } else if (status === 'CHANNEL_ERROR') {
                    console.error('Kesalahan koneksi Real-time.');
                  }
                });
            }


            // ------------------------------------
            // FUNGSI UTAMA TWIBBON & CANVAS
            // ------------------------------------

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

                if (isInteracting.value && imageLoaded.value && !isCanvasLocked.value) {
                    let showHorizontalLine = false;
                    let showVerticalLine = false;
                    const imageCenterX = imageRenderX + imageRenderWidth / 2;
                    const imageCenterY = imageRenderY + imageRenderHeight / 2;

                    if (Math.abs(imageCenterX - cw / 2) < SNAP_THRESHOLD) {
                        showVerticalLine = true;
                    }
                    if (Math.abs(imageCenterY - ch / 2) < SNAP_THRESHOLD) {
                        showHorizontalLine = true;
                    }

                    ctx.value.strokeStyle = "rgba(255, 255, 255, 0.6)";
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
                        isCanvasLocked.value = false; 
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
                downloadInProgress.value = true;
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
                
                trackSupport(); 

                setTimeout(() => {
                    downloadCompleted.value = true;
                    downloadInProgress.value = false;
                    isCanvasLocked.value = true;
                    drawCanvas();
                }, 500);
            }

            async function shareResult() {
                if (!imageLoaded.value) return;

                downloadInProgress.value = true;
                isInteracting.value = false;
                drawCanvas();

                const dataUrl = canvas.value.toDataURL("image/png");

                if (navigator.share) {
                    try {
                        const response = await fetch(dataUrl);
                        const blob = await response.blob();
                        const file = new File([blob], 'twibbon-hasil.png', {
                            type: 'image/png'
                        });

                        if (navigator.canShare && navigator.canShare({
                                files: [file]
                            })) {
                            await navigator.share({
                                files: [file],
                                title: 'Twibbon Keren!',
                                text: 'Lihat twibbon keren yang kubuat!',
                            });
                            trackSupport(); 
                        } else {
                            const shareData = {
                                title: 'Twibbon Keren!',
                                text: 'Lihat twibbon keren yang kubuat!',
                                url: window.location.href
                            };

                            if (navigator.canShare(shareData)) {
                                await navigator.share(shareData);
                                alert('Berbagi file gambar tidak didukung di sini. Tautan telah dibagikan.');
                                trackSupport(); 
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
                        downloadInProgress.value = false;
                        drawCanvas();
                    }
                } else {
                    alert('Fungsi bagikan tidak didukung di browser ini. Silakan unduh gambar dan bagikan secara manual.');
                    downloadInProgress.value = false;
                }
            }

            // ------------------------------------
            // FUNGSI GESTURE DAN ZOOM
            // ------------------------------------

            function onPointerDown(e) {
                if (!imageLoaded.value || isCanvasLocked.value) return; 

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
                if (!imageLoaded.value || isCanvasLocked.value) return; 

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
                if (!imageLoaded.value || isCanvasLocked.value) return; 

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

            // ------------------------------------
            // HOOK ONMOUNTED
            // ------------------------------------

            onMounted(() => {
                fetchSupportCount(); 
                subscribeToSupportChanges(); 

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
                    if (!imageLoaded.value || isCanvasLocked.value) return; 
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
                // Data Supabase
                supportCount,
                isLoading, 
                // 🌟 FUNGSI BARU UNTUK TOMBOL
                incrementManualSupport, 
            };
        },
    };
</script>

<style>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css');

* {
    box-sizing: border-box
}

html,
body,
#app {
    background: #f0f0f2;
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial
}

.app {
    background: #fdfdff;
    width: 600px;
    margin: 5em auto;
    padding: 2em
}

.header {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between
}

.controls {
    display: flex;
    gap: 8px;
    align-items: center
}

.canvas-wrap {
    width: 100%;
    aspect-ratio: 1/1;
    background: #f3f4f6;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative
}

.canvas-wrap canvas {
    touch-action: none
}

.btn {
    padding: 8px 12px;
    border-radius: 8px;
    border: none;
    background: #111;
    color: #fff;
    cursor: pointer
}

.input-file {
    display: none
}

.toolbar {
    display: flex;
    gap: 8px;
    margin-top: 12px
}

small {
    color: #666
}

@media (max-width: 700px) {
    .app {
        margin: 0 auto;
        width: auto;
    }
}

.drop-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed #ccc;
    border-radius: 10px;
    background-color: rgba(255, 255, 255, 0.8);
    color: #888;
    font-size: 1.2em;
    z-index: 10;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
}

.drop-area.hover {
    border-color: #111;
    color: #111;
    background-color: rgba(255, 255, 255, 0.95);
}

.drop-area.hidden {
    display: none;
}

.drop-area .btn {
    margin-top: 15px;
}

.drop-area-text {
    margin-bottom: 10px;
}

.download-share-btn {
    position: absolute;
    bottom: 15px;
    right: 15px;
    z-index: 20;
    background: none;
    border: none;
    border-radius: 0;
    width: auto;
    height: auto;
    box-shadow: none;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1.8em;
    padding: 5px;
    transition: color 0.3s ease, transform 0.2s ease;
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
}

.download-share-btn:hover:not(:disabled) {
    background: none;
    transform: scale(1.1);
    box-shadow: none;
}

.download-share-btn:active:not(:disabled) {
    transform: scale(1.0);
    box-shadow: none;
}

.download-share-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

/* --- CSS TOTAL DUKUNGAN --- */
.support-count-header {
    font-size: 1.05em;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0; 
    background-color: transparent; 
}

.support-count-header i {
    color: #007bff;
}

.support-count-header .count-number {
    font-weight: 700;
    color: #111;
}

/* --- 🌟 CSS TOMBOL DEV BARU 🌟 --- */
.btn-dev {
    background-color: #f0ad4e !important;
    color: #fff !important;
    padding: 5px 8px !important; 
    font-size: 0.9em !important;
    line-height: 1;
}
</style>
