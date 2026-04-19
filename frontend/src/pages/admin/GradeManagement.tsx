import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronRight, GraduationCap, Plus, RotateCcw } from 'lucide-react'
import { gradesService } from '@/services/grades'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import type { CreateGradeRequest } from '@/types/grade'

export function GradeManagement() {
  const queryClient = useQueryClient()
  const [campusId, setCampusId] = useState(1)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newGrade, setNewGrade] = useState<CreateGradeRequest>({
    campus_id: campusId,
    name: '',
    year_level: 1,
    academic_year: '',
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['grades', campusId],
    queryFn: () => gradesService.listGrades(campusId),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateGradeRequest) => gradesService.createGrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] })
      setShowCreateForm(false)
      setNewGrade({ campus_id: campusId, name: '', year_level: 1, academic_year: '' })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => gradesService.deactivateGrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] })
    },
  })

  const promoteMutation = useMutation({
    mutationFn: (gradeIds: number[]) => gradesService.promoteGrades(gradeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] })
    },
  })

  const graduateMutation = useMutation({
    mutationFn: (gradeIds: number[]) => gradesService.graduateGrades(gradeIds, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] })
    },
  })

  const grades = data?.grades || []
  const activeGrades = grades.filter((g) => g.is_active)
  const inactiveGrades = grades.filter((g) => !g.is_active)

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({ ...newGrade, campus_id: campusId })
  }

  if (isLoading) return <Loading message="加载年级管理..." />

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-950">年级数据加载失败</h2>
        <p className="mt-2 text-sm text-slate-600">无法获取年级列表。</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#eef2ff_100%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Admin</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-slate-900">Grade Management</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">年级管理</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  管理校区下的年级：创建、停用、学年升级和毕业操作。每个校区可有不同的年级体系。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                共 {grades.length} 个年级
              </div>
              <div className="rounded-2xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                {activeGrades.length} 个活跃
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Batch operations */}
      {activeGrades.length > 0 && (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">学年操作</h2>
          <p className="mt-1 text-sm text-slate-500">对当前所有活跃年级执行学年升级或毕业。</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => promoteMutation.mutate(activeGrades.map((g) => g.id))}
              disabled={promoteMutation.isPending}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              全部升级
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm('确认毕业所有活跃年级？此操作将停用这些年级。')) {
                  graduateMutation.mutate(activeGrades.map((g) => g.id))
                }
              }}
              disabled={graduateMutation.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              全部毕业
            </Button>
          </div>
        </section>
      )}

      {/* Create grade form */}
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">创建年级</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? '收起' : <><Plus className="mr-1 h-4 w-4" />新建</>}
          </Button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">年级名称</label>
                <input
                  type="text"
                  value={newGrade.name}
                  onChange={(e) => setNewGrade((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="如：高一、Grade 10"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">年级层级</label>
                <input
                  type="number"
                  value={newGrade.year_level}
                  onChange={(e) => setNewGrade((prev) => ({ ...prev, year_level: Number(e.target.value) }))}
                  min={1}
                  max={12}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">学年</label>
                <input
                  type="text"
                  value={newGrade.academic_year}
                  onChange={(e) => setNewGrade((prev) => ({ ...prev, academic_year: e.target.value }))}
                  placeholder="如：2025-2026"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createMutation.isPending || !newGrade.name || !newGrade.academic_year}
                  className="w-full"
                >
                  {createMutation.isPending ? '创建中...' : '创建年级'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Active grades table */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-950">活跃年级</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">名称</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">层级</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">学年</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">状态</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeGrades.map((grade) => (
                <tr key={grade.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-sm font-semibold text-blue-700">
                        {grade.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-950">{grade.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{grade.year_level}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{grade.academic_year}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">活跃</span>
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`确认停用年级「${grade.name}」？`)) {
                          deactivateMutation.mutate(grade.id)
                        }
                      }}
                      disabled={deactivateMutation.isPending}
                    >
                      停用
                    </Button>
                  </td>
                </tr>
              ))}
              {activeGrades.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                    暂无活跃年级。点击上方「新建」按钮创建第一个年级。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Inactive grades */}
      {inactiveGrades.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-500">已停用年级</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">层级</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">学年</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {inactiveGrades.map((grade) => (
                  <tr key={grade.id} className="transition hover:bg-slate-50 opacity-60">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-500">{grade.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{grade.year_level}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{grade.academic_year}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">已停用</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
