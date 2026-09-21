<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    empty?: boolean
  }>(),
  {
    title: '上下文',
    subtitle: '',
    empty: true,
  },
)
</script>

<template>
  <aside class="context-panel" aria-label="上下文面板">
    <header class="context-panel__header">
      <div>
        <span class="context-panel__kicker">CONTEXT</span>
        <h2>{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <span class="context-panel__dot" aria-hidden="true"></span>
    </header>

    <div v-if="empty" class="context-panel__empty">
      <strong>选择一项内容</strong>
      <p>这里会显示详细信息和快捷操作</p>
    </div>
    <div v-else class="context-panel__body">
      <slot />
    </div>

    <footer v-if="$slots.primary || $slots.secondary" class="context-panel__actions">
      <slot name="primary" />
      <slot name="secondary" />
    </footer>
  </aside>
</template>

<style lang="less" scoped>
.context-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: @color-workspace-surface;
}

.context-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: @space-md;
  padding: 18px;
  border-bottom: 1px solid @color-border;

  h2 {
    margin-top: @space-xs;
    color: @color-action-text;
    font-size: @font-size-lg;
    font-weight: 650;
  }

  p {
    margin-top: @space-xs;
    color: @color-text-secondary;
    font-size: @font-size-sm;
  }
}

.context-panel__kicker {
  color: @color-text-disabled;
  font-size: 10px;
  letter-spacing: 0.12em;
}

.context-panel__dot {
  width: 8px;
  height: 8px;
  margin-top: 4px;
  border-radius: 50%;
  background: @color-action;
}

.context-panel__empty {
  display: flex;
  flex: 1;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: @space-sm;
  padding: 24px 18px;
  text-align: center;

  strong {
    color: @color-action-text;
    font-size: @font-size-lg;
  }

  p {
    color: @color-text-secondary;
    font-size: @font-size-sm;
  }
}

.context-panel__body {
  flex: 1;
  padding: 18px;
}

.context-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: @space-sm;
  padding: @space-lg;
  border-top: 1px solid @color-border;
}
</style>
