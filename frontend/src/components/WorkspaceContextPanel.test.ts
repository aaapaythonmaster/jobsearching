import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkspaceContextPanel from './WorkspaceContextPanel.vue'

describe('WorkspaceContextPanel', () => {
  it('shows the shared empty state and named action slots', () => {
    const wrapper = mount(WorkspaceContextPanel, {
      props: { title: '岗位详情', empty: true },
      slots: {
        primary: '<button>查看岗位</button>',
        secondary: '<button>关闭</button>',
      },
    })
    expect(wrapper.get('[aria-label="上下文面板"]').text()).toContain('岗位详情')
    expect(wrapper.text()).toContain('选择一项内容')
    expect(wrapper.text()).toContain('这里会显示详细信息和快捷操作')
    expect(wrapper.text()).toContain('查看岗位')
    expect(wrapper.text()).toContain('关闭')
  })
})
