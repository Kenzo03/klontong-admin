<script setup lang="ts">
// The brief's "image fallback": no image, or a file that fails to load, shows a neutral tile, never a broken icon.
const props = withDefaults(defineProps<{ src: string | null; size?: number; alt?: string }>(), { size: 40, alt: '' })
const failed = ref(false)
watch(() => props.src, () => (failed.value = false)) // a new upload gets a fresh chance to load
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="alt"
    :width="size"
    :height="size"
    loading="lazy"
    class="rounded flex-shrink-0"
    style="object-fit: cover"
    @error="failed = true"
  >
  <div
    v-else
    class="d-flex align-center justify-center rounded flex-shrink-0 bg-grey-lighten-4 text-medium-emphasis"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :title="src ? 'Gambar tidak dapat dimuat' : 'Belum ada gambar'"
  >
    <v-icon icon="mdi-image-off-outline" :size="Math.max(20, size / 3)" />
  </div>
</template>