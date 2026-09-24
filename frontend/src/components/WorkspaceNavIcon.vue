<script setup lang="ts">
type IconName = 'briefcase' | 'file-text' | 'trend' | 'kanban' | 'message-square'
defineProps<{ name: IconName }>()
</script>

<template>
  <svg class="workspace-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'briefcase'"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></template>
    <template v-else-if="name === 'file-text'"><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></template>
    <template v-else-if="name === 'trend'"><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-6M17 7h2v2"/></template>
    <template v-else-if="name === 'kanban'"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16M6 8h1M12 8h1M18 8h1M6 12h1M12 12h1"/></template>
    <template v-else><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 13h5"/></template>
  </svg>
</template>

<style scoped>
.workspace-nav-icon { width: 20px; height: 20px; flex: 0 0 20px; }
</style>
