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
      <TwibbonCanvas ref='canvasRef' :twibbon-url='twibbonUrl' />
    </div>

    <div class='toolbar'>
      <small class='info'>Seret untuk memindahkan. Cubit dua jari untuk memperbesar. Scroll untuk zoom (desktop).</small>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import TwibbonCanvas from './components/TwibbonCanvas.vue'

export default {
  components: { TwibbonCanvas },
  setup(){
    const canvasRef = ref(null)
    const twibbonUrl = '/twibbon.png'
    const imageLoaded = ref(false)

    function onFile(e){
      const f = e.target.files && e.target.files[0]
      if(!f) return
      const reader = new FileReader()
      reader.onload = (ev)=>{
        canvasRef.value && canvasRef.value.setImage(ev.target.result)
        imageLoaded.value = true
      }
      reader.readAsDataURL(f)
    }

    function download(){
      canvasRef.value && canvasRef.value.downloadComposite()
    }

    return { onFile, canvasRef, twibbonUrl, download, imageLoaded }
  }
}
</script>