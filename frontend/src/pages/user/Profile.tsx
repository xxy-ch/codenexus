import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

const MOCK_USER = {
  id: 'user1',
  username: 'algorithm_master',
  email: 'user@example.com',
  real_name: '张三',
  bio: '热爱算法，专注于动态规划和图论研究',
  avatar_url: '',
  organization: 'MIT',
  location: '北京',
  website: 'https://github.com/algorithm_master',
  github_username: 'algorithm_master',
  created_at: '2023-01-01T00:00:00Z',
  stats: {
    problems_solved: 156,
    submissions_count: 892,
    contests_participated: 12,
    contests_won: 3,
    rating: 2145,
    ranking: 89,
    streak_days: 45,
  },
  achievements: [
    { id: '1', name: '算法大师', icon: 'military_tech', description: '解决100+题目', unlocked_at: '2024-01-01T00:00:00Z' },
    { id: '2', name: '竞赛冠军', icon: 'emoji_events', description: '获得3次竞赛冠军', unlocked_at: '2024-01-15T00:00:00Z' },
    { id: '3', name: '连续学习', icon: 'local_fire_department', description: '连续学习30天', unlocked_at: '2024-01-20T00:00:00Z' },
  ],
  recent_activity: [
    { type: 'submission', message: '解决了 "Two Sum"', time: '2小时前' },
    { type: 'contest', message: '参加了 "周赛 #42"，获得第5名', time: '1天前' },
    { type: 'blog', message: '发布了博客 "动态规划入门指南"', time: '3天前' },
    { type: 'comment', message: '评论了讨论区 "如何优化贪心算法"', time: '5天前' },
  ],
}

export function Profile() {
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    real_name: MOCK_USER.real_name,
    bio: MOCK_USER.bio,
    organization: MOCK_USER.organization,
    location: MOCK_USER.location,
    website: MOCK_USER.website,
    github_username: MOCK_USER.github_username,
  })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', currentUser?.id],
    queryFn: () => Promise.resolve(MOCK_USER),
    enabled: !!currentUser?.id,
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsEditing(false)
    },
  })

  if (isLoading) return <Loading message="加载中..." />

  if (!profile) return <div className="text-center py-12">用户不存在</div>

  const getActivityIcon = (type: string) => {
    const icons = {
      submission: 'check_circle',
      contest: 'emoji_events',
      blog: 'article',
      comment: 'chat_bubble',
    }
    return icons[type as keyof typeof icons] || 'activity'
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20">
          <div className="h-full w-full flex items-center justify-center">
            <span className="material-symbols-outlined text-8xl text-primary/20">code</span>
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start -mt-16">
            {/* Avatar */}
            <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-white text-5xl font-bold border-4 border-white dark:border-slate-900 shadow-lg">
              {profile.username.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-1">{profile.username}</h1>
                  {profile.real_name && (
                    <p className="text-lg text-slate-600 dark:text-slate-400">{profile.real_name}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                    {profile.organization && (
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">school</span>
                        {profile.organization}
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">location_on</span>
                        {profile.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg">calendar_today</span>
                      {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>

                {currentUser?.id === profile.id && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <span className="material-symbols-outlined mr-2">{isEditing ? 'close' : 'edit'}</span>
                    {isEditing ? '取消编辑' : '编辑资料'}
                  </Button>
                )}
              </div>

              {profile.bio && (
                <p className="mt-4 text-slate-700 dark:text-slate-300">{profile.bio}</p>
              )}

              {/* Social Links */}
              <div className="flex items-center gap-4 mt-4">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-lg">language</span>
                    个人网站
                  </a>
                )}
                {profile.github_username && (
                  <a
                    href={`https://github.com/${profile.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-lg">code</span>
                    GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
          <h2 className="text-xl font-bold mb-4">编辑个人资料</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">真实姓名</label>
              <input
                type="text"
                value={editForm.real_name}
                onChange={(e) => setEditForm({ ...editForm, real_name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">个人简介</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">组织/学校</label>
                <input
                  type="text"
                  value={editForm.organization}
                  onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">所在地</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">个人网站</label>
                <input
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">GitHub 用户名</label>
                <input
                  type="text"
                  value={editForm.github_username}
                  onChange={(e) => setEditForm({ ...editForm, github_username: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => updateProfileMutation.mutate(editForm)}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? '保存中...' : '保存更改'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 text-center">
          <div className="text-3xl font-bold text-primary mb-1">{profile.stats.problems_solved}</div>
          <div className="text-sm text-slate-600">已解决题目</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 text-center">
          <div className="text-3xl font-bold text-green-500 mb-1">{profile.stats.submissions_count}</div>
          <div className="text-sm text-slate-600">提交次数</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 text-center">
          <div className="text-3xl font-bold text-purple-500 mb-1">{profile.stats.rating}</div>
          <div className="text-sm text-slate-600">评分</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 text-center">
          <div className="text-3xl font-bold text-orange-500 mb-1">{profile.stats.streak_days}</div>
          <div className="text-sm text-slate-600">连续学习天数</div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
        <h2 className="text-xl font-bold mb-4">成就</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profile.achievements.map((achievement) => (
            <div key={achievement.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <span className="material-symbols-outlined text-4xl text-yellow-500">{achievement.icon}</span>
              <div>
                <h3 className="font-semibold">{achievement.name}</h3>
                <p className="text-sm text-slate-600">{achievement.description}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(achievement.unlocked_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
        <h2 className="text-xl font-bold mb-4">最近活动</h2>
        <div className="space-y-4">
          {profile.recent_activity.map((activity, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="material-symbols-outlined text-2xl text-primary">{getActivityIcon(activity.type)}</span>
              <div className="flex-1">
                <p className="text-sm">{activity.message}</p>
                <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
