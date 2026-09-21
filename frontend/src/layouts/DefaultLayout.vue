<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import WorkspaceContextPanel from '@/components/WorkspaceContextPanel.vue'
import WorkspaceNavIcon from '@/components/WorkspaceNavIcon.vue'

const route = useRoute()
const router = useRouter()
const isLanding = computed(() => route.path === '/')

function startWorkspace(): void {
  void router.push('/job-search/jobs')
}

const workspaceContext = computed(() => ({
  '/job-search/jobs': '岗位',
  '/job-search/resumes': '简历',
  '/job-search/analysis': '分析',
  '/job-search/statuses': '状态',
  '/interviews': '面试',
}[route.path] ?? '求职工作台'))

const contextPanelTitle = computed(() => ({
  '/job-search/jobs': '岗位详情',
  '/job-search/resumes': '简历预览',
  '/job-search/analysis': '分析建议',
  '/job-search/statuses': '求职阶段说明',
  '/interviews': '面试进度',
}[route.path] ?? '上下文'))

const contextPanelCopy = computed(() => ({
  '/job-search/jobs': { title: '选择一个岗位', description: '查看公司、职位、薪资和下一步操作。' },
  '/job-search/resumes': { title: '选择一份简历', description: '查看目标方向、来源文件和更新时间。' },
  '/job-search/analysis': { title: '等待分析结果', description: '选择岗位后查看共性要求和风险提醒。' },
  '/job-search/statuses': { title: '管理求职阶段', description: '状态将用于标记岗位当前进展。' },
  '/interviews': { title: '选择面试项目', description: '查看待复习问题和最近一次复盘。' },
}[route.path] ?? { title: '', description: '' }))
</script>

<template>
  <div class="layout" :class="{ 'layout--workspace': !isLanding }">
    <div v-if="isLanding" class="layout__landing"><HomeView @start="startWorkspace" /></div>

    <section v-else class="layout__workspace layout__workspace--fullscreen" aria-label="求职工作台">
      <aside class="layout__sidebar">
        <div class="layout__sidebar-top">
          <RouterLink to="/" class="layout__brand" aria-label="返回首页">
            <span class="layout__mark" aria-hidden="true"></span>
            <span>求职工作台</span>
          </RouterLink>
          <button class="layout__new-button" type="button">
            <span aria-hidden="true">＋</span><span>新建任务</span><kbd>⌘N</kbd>
          </button>
        </div>

        <div class="layout__nav-group">
          <span class="layout__nav-label">工作台</span>
          <nav class="layout__nav" aria-label="工作台导航">
            <RouterLink to="/job-search/jobs" active-class="is-active" :aria-current="route.path === '/job-search/jobs' ? 'page' : undefined"><WorkspaceNavIcon name="briefcase" /><span>岗位</span></RouterLink>
            <RouterLink to="/job-search/resumes" active-class="is-active" :aria-current="route.path === '/job-search/resumes' ? 'page' : undefined"><WorkspaceNavIcon name="file-text" /><span>简历</span></RouterLink>
            <RouterLink to="/interviews" active-class="is-active" :aria-current="route.path === '/interviews' ? 'page' : undefined"><WorkspaceNavIcon name="message-square" /><span>面试</span></RouterLink>
          </nav>
        </div>

        <div class="layout__nav-group layout__nav-group--secondary">
          <span class="layout__nav-label">分析与管理</span>
          <nav class="layout__nav" aria-label="辅助导航">
            <RouterLink to="/job-search/analysis" active-class="is-active"><WorkspaceNavIcon name="trend" /><span>分析</span></RouterLink>
            <RouterLink to="/job-search/statuses" active-class="is-active"><WorkspaceNavIcon name="kanban" /><span>求职状态</span></RouterLink>
          </nav>
        </div>

        <div class="layout__sidebar-footer"><span class="layout__status-dot" aria-hidden="true"></span><span>工作台已就绪</span></div>
      </aside>

      <div class="layout__main-column">
        <header class="layout__toolbar">
          <div class="layout__toolbar-title"><span class="layout__toolbar-kicker">求职工作台</span><span class="layout__toolbar-separator">/</span><strong>{{ workspaceContext }}</strong></div>
          <div class="layout__toolbar-actions" aria-label="工作区操作"><button type="button" class="layout__icon-button" aria-label="搜索">⌕</button><button type="button" class="layout__icon-button" aria-label="设置">⚙</button></div>
        </header>
        <main class="layout__main" tabindex="-1">
          <div class="layout__main-heading"><div><span class="layout__context-kicker">当前工作区</span><h1 class="layout__context-title">{{ workspaceContext }}</h1></div><span class="layout__context-state"><i aria-hidden="true"></i>已就绪</span></div>
          <RouterView />
        </main>
      </div>

      <aside class="layout__context-column">
        <header class="layout__toolbar layout__toolbar--context"><span class="layout__toolbar-kicker">上下文</span><button type="button" class="layout__icon-button" aria-label="展开右侧面板">↗</button></header>
        <WorkspaceContextPanel :title="contextPanelTitle" :empty="!contextPanelCopy.title"><strong>{{ contextPanelCopy.title }}</strong><p>{{ contextPanelCopy.description }}</p></WorkspaceContextPanel>
      </aside>
    </section>
  </div>
</template>

<style lang="less" scoped>
.layout { min-height: 100%; color: @color-text; background: @color-workspace-canvas;
  &__landing { min-height: 100dvh; }
  &__workspace { display: grid; grid-template-columns: 220px minmax(0, 1fr) 360px; height: 100dvh; overflow: hidden; background: @color-workspace-canvas; }
  &__sidebar, &__main-column, &__context-column { min-width: 0; min-height: 0; }
  &__sidebar { display: flex; flex-direction: column; overflow-y: auto; padding: 16px 12px 12px; border-right: 1px solid @color-border; background: #eef0f2; }
  &__sidebar-top { display: grid; gap: 18px; }
  &__brand { display: inline-flex; align-items: center; gap: 9px; min-height: 32px; padding: 0 6px; color: @color-text; font-weight: 700; &:hover { color: @color-text; } }
  &__mark { width: 27px; height: 27px; border: 1px solid fade(@color-primary, 22%); border-radius: 8px; background: @color-action; }
  &__new-button { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 10px; border: 1px solid fade(@color-primary, 8%); border-radius: 8px; color: @color-text; background: #dfe3e7; font-weight: 650; cursor: pointer; kbd { margin-left: auto; color: @color-text-disabled; font-size: 11px; } &:hover { background: #d6dade; } }
  &__nav-group { margin-top: 22px; } &__nav-group--secondary { margin-top: 28px; }
  &__nav-label { display: block; padding: 0 9px 7px; color: @color-text-disabled; font-size: 11px; letter-spacing: .05em; }
  &__nav { display: grid; gap: 3px; } &__nav a { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 10px; border-left: 2px solid transparent; border-radius: 7px; color: @color-text-secondary; font-size: 13px; &:hover { color: @color-text; background: fade(@color-action, 12%); } &.is-active { border-left-color: @color-action; color: @color-text; background: fade(@color-action, 28%); font-weight: 650; } }
  &__nav-icon { width: 20px; color: currentColor; font-size: 18px; line-height: 1; text-align: center; }
  &__sidebar-footer { display: flex; align-items: center; gap: 7px; margin-top: auto; padding: 18px 8px 4px; color: @color-text-disabled; font-size: 11px; } &__status-dot { width: 7px; height: 7px; border-radius: 50%; background: @color-success; }
  &__main-column, &__context-column { display: flex; flex-direction: column; overflow: hidden; background: @color-workspace-surface; } &__context-column { border-left: 1px solid @color-border; }
  &__toolbar { display: flex; align-items: center; justify-content: space-between; flex: 0 0 52px; min-height: 52px; padding: 0 18px; border-bottom: 1px solid @color-border; background: @color-workspace-surface; } &__toolbar-title { display: flex; align-items: center; gap: 8px; min-width: 0; } &__toolbar-kicker { color: @color-text-secondary; font-size: 12px; } &__toolbar-separator { color: @color-text-disabled; } &__toolbar-title strong { font-size: 13px; } &__toolbar-actions { display: flex; gap: 3px; } &__icon-button { display: inline-grid; width: 30px; height: 30px; place-items: center; border: 0; border-radius: 6px; color: @color-text-secondary; background: transparent; cursor: pointer; &:hover { color: @color-text; background: @color-bg-muted; } }
  &__main { min-height: 0; flex: 1; overflow-y: auto; padding: 24px 28px 48px; &:focus { outline: none; } } &__main-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 22px; } &__context-kicker { display: block; margin-bottom: 4px; color: @color-text-disabled; font-size: 11px; } &__context-title { color: @color-text; font-size: 24px; font-weight: 700; letter-spacing: -.03em; } &__context-state { display: inline-flex; align-items: center; gap: 7px; color: @color-text-secondary; font-size: 12px; } &__context-state i { width: 7px; height: 7px; border-radius: 50%; background: @color-success; }
}
@media (max-width: 1100px) { .layout__workspace { grid-template-columns: 196px minmax(0, 1fr) 300px; } .layout__main { padding-inline: 22px; } }
@media (max-width: 820px) { .layout__workspace { grid-template-columns: 176px minmax(0, 1fr) 272px; } .layout__main { padding-inline: 18px; } }
</style>
