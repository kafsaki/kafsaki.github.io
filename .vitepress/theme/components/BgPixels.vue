<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { initBackground } from "../bg/engine";

const canvasRef = ref(null);
let cleanup = () => {};

onMounted(() => {
  cleanup = initBackground(canvasRef.value);
});
onBeforeUnmount(() => cleanup());
</script>

<template>
  <div id="bg-stage" aria-hidden="true">
    <canvas id="bg-pixels" ref="canvasRef"></canvas>
  </div>
</template>
