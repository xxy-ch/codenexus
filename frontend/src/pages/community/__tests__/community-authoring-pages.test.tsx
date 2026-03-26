import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateArticle } from '@/pages/community/CreateArticle'
import { EditArticle } from '@/pages/community/EditArticle'
import { CreateDiscussion } from '@/pages/community/CreateDiscussion'
import { DirectMessages } from '@/pages/community/DirectMessages'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    navigate: vi.fn(),
    createArticle: vi.fn(),
    getArticle: vi.fn(),
    updateArticle: vi.fn(),
    createDiscussion: vi.fn(),
    getConversations: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      username: 'author',
    },
  }),
}))

vi.mock('@/services/communityApi', () => ({
  blogApi: {
    createArticle: mocks.createArticle,
    getArticle: mocks.getArticle,
    updateArticle: mocks.updateArticle,
  },
  discussionsApi: {
    createDiscussion: mocks.createDiscussion,
  },
}))

vi.mock('@/services/messages', () => ({
  messagesService: {
    getConversations: mocks.getConversations,
    getMessages: mocks.getMessages,
    sendMessage: mocks.sendMessage,
  },
}))

vi.mock('@/components/editor/EditorWithPreview', () => ({
  EditorWithPreview: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }) => (
    <textarea
      aria-label="Content editor"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))

function renderWithProviders(ui: React.ReactNode, initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('community authoring pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the article draft workspace and preserves create payloads', async () => {
    mocks.createArticle.mockResolvedValue({ slug: 'flat-redesign' })

    renderWithProviders(<CreateArticle />)

    expect(screen.getByRole('heading', { name: '撰写文章' })).toBeInTheDocument()
    expect(screen.getByText('编辑工作台')).toBeInTheDocument()
    expect(screen.getByText('发布信息')).toBeInTheDocument()
    expect(screen.getByText('写作提示')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('文章标题'), { target: { value: 'Flat Redesign' } })
    fireEvent.change(screen.getByLabelText('分类'), { target: { value: 'Editorial' } })
    fireEvent.change(screen.getByLabelText('添加标签'), { target: { value: 'ui' } })
    fireEvent.click(screen.getByRole('button', { name: '添加标签' }))
    fireEvent.change(
      screen.getByPlaceholderText('用 Markdown 写正文，首段尽量先把结论说清楚。'),
      { target: { value: 'Updated body' } },
    )
    fireEvent.click(screen.getByRole('button', { name: '发布文章' }))

    await waitFor(() => {
      expect(mocks.createArticle).toHaveBeenCalledWith({
        title: 'Flat Redesign',
        content: 'Updated body',
        tags: ['ui'],
        category: 'Editorial',
        is_published: true,
      })
      expect(mocks.navigate).toHaveBeenCalledWith('/blog/flat-redesign')
    })
  })

  it('renders the revise article workspace and preserves update payloads', async () => {
    mocks.getArticle.mockResolvedValue({
      article: {
        title: 'Old Title',
        content: 'Old body',
        tags: ['legacy'],
        category: 'Tutorial',
        is_published: true,
      },
      author: {
        id: 'user-1',
        username: 'author',
      },
    })
    mocks.updateArticle.mockResolvedValue({ slug: 'new-title' })

    renderWithProviders(
      <Routes>
        <Route path="/blog/:slug/edit" element={<EditArticle />} />
      </Routes>,
      ['/blog/old-title/edit'],
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: '编辑文章' })).toBeInTheDocument())
    expect(screen.getByText('编辑工作台')).toBeInTheDocument()
    expect(screen.getByText('发布信息')).toBeInTheDocument()
    expect(screen.getByText('修改说明')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('文章标题'), { target: { value: 'New Title' } })
    fireEvent.change(
      screen.getByPlaceholderText('用 Markdown 继续修改正文。'),
      { target: { value: 'New body' } },
    )
    fireEvent.click(screen.getByRole('button', { name: '保存文章' }))

    await waitFor(() => {
      expect(mocks.updateArticle).toHaveBeenCalledWith('old-title', {
        title: 'New Title',
        content: 'New body',
        tags: ['legacy'],
        category: 'Tutorial',
        is_published: false,
      })
      expect(mocks.navigate).toHaveBeenCalledWith('/blog/new-title')
    })
  })

  it('renders the new discussion workspace and preserves create semantics', async () => {
    mocks.createDiscussion.mockResolvedValue({ id: 7 })

    renderWithProviders(
      <Routes>
        <Route path="/problems/:problemId/discussions/new" element={<CreateDiscussion />} />
      </Routes>,
      ['/problems/12/discussions/new'],
    )

    expect(screen.getByRole('heading', { name: '发起讨论' })).toBeInTheDocument()
    expect(screen.getByText('讨论工作台')).toBeInTheDocument()
    expect(screen.getByText('标签面板')).toBeInTheDocument()
    expect(screen.getByText('提问提示')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('讨论标题'), { target: { value: 'Need help' } })
    fireEvent.change(screen.getByLabelText('添加标签'), { target: { value: 'dp' } })
    fireEvent.click(screen.getByRole('button', { name: '添加标签' }))
    fireEvent.change(
      screen.getByPlaceholderText('说明背景、你已经尝试过的思路，以及具体卡住的点。'),
      { target: { value: 'My attempt fails.' } },
    )
    fireEvent.click(screen.getByRole('button', { name: '发布讨论' }))

    await waitFor(() => {
      expect(mocks.createDiscussion).toHaveBeenCalledWith({
        title: 'Need help',
        content: 'My attempt fails.',
        problem_id: 12,
        tags: ['dp'],
      })
      expect(mocks.navigate).toHaveBeenCalledWith('/discussions/7')
    })
  })

  it('renders the direct messages workspace and keeps send semantics', async () => {
    mocks.getConversations.mockResolvedValue([
      {
        id: 'c1',
        peer_user_id: 'u2',
        peer_username: 'alice',
        last_message: 'hello',
        last_message_at: '2026-03-19T00:00:00Z',
        unread_count: 2,
      },
    ])
    mocks.getMessages.mockResolvedValue([
      {
        id: 'm1',
        conversation_id: 'c1',
        sender_id: 'u2',
        sender_username: 'alice',
        content: 'hello',
        created_at: '2026-03-19T00:00:00Z',
      },
    ])
    mocks.sendMessage.mockResolvedValue({
      id: 'm2',
      conversation_id: 'c1',
      sender_id: 'user-1',
      sender_username: 'you',
      content: 'ping',
      created_at: '2026-03-19T00:05:00Z',
    })

    renderWithProviders(<DirectMessages />)

    expect(await screen.findByRole('heading', { name: '私信中心' })).toBeInTheDocument()
    expect(screen.getByText('会话侧栏')).toBeInTheDocument()
    expect(screen.getByText('消息工作区')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: 'alice' }))
    fireEvent.change(screen.getByPlaceholderText('输入消息'), { target: { value: 'ping' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))

    await waitFor(() => {
      expect(mocks.getMessages).toHaveBeenCalledWith('c1')
      expect(mocks.sendMessage).toHaveBeenCalledWith('c1', 'ping')
    })
  })
})
