import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, GraduationCap, Plus, RotateCcw } from 'lucide-react'
import { gradesService } from '@/features/classes/services/grades'
import { Button } from '@/shared/components/Button'
import { TableSkeleton } from '@/shared/components/TableSkeleton'
import { InlineError } from '@/shared/components/InlineError'
import type { CreateGradeRequest } from '@/features/ranking/types/grade'

export function GradeManagement() {
  const queryClient = useQueryClient()
  const campusId = 1
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

  if (isLoading) return <TableSkeleton rows={6} columns={5} />

  if (error) {
    return <InlineError title="年级管理加载失败" onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">年级管理</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">年级管理</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              管理校区下的年级：创建、停用、学年升级和毕业操作。每个校区可有不同的年级体系。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground">
              共 {grades.length} 个年级
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-lime-500/10 px-4 py-2 text-sm font-semibold text-lime-400">
              <span className="h-2 w-2 rounded-full bg-lime-400" />
              {activeGrades.length} 个活跃
            </div>
          </div>
        </div>
      </div>

      {/* Batch operations */}
      {activeGrades.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">学年操作</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">对当前所有活跃年级执行学年升级或毕业。</p>
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
        </div>
      )}

      {/* Create grade form */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">创建年级</h2>
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
                <label className="mb-2 block text-[13px] font-medium text-muted-foreground">年级名称</label>
                <input
                  type="text"
                  value={newGrade.name}
                  onChange={(e) => setNewGrade((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="如：高一、Grade 10"
                  required
                  className="w-full rounded-lg border border-border/40 bg-transparent px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-medium text-muted-foreground">年级层级</label>
                <input
                  type="number"
                  value={newGrade.year_level}
                  onChange={(e) => setNewGrade((prev) => ({ ...prev, year_level: Number(e.target.value) }))}
                  min={1}
                  max={12}
                  required
                  className="w-full rounded-lg border border-border/40 bg-transparent px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-medium text-muted-foreground">学年</label>
                <input
                  type="text"
                  value={newGrade.academic_year}
                  onChange={(e) => setNewGrade((prev) => ({ ...prev, academic_year: e.target.value }))}
                  placeholder="如：2025-2026"
                  required
                  className="w-full rounded-lg border border-border/40 bg-transparent px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  variant="default"
                  disabled={createMutation.isPending || !newGrade.name || !newGrade.academic_year}
                  className="w-full"
                >
                  {createMutation.isPending ? '创建中...' : '创建年级'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Active grades table */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm">
        <div className="border-b border-border/40 px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">活跃年级</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/40">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">名称</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">层级</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">学年</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">状态</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-transparent">
              {activeGrades.map((grade) => (
                <tr key={grade.id} className="transition hover:bg-muted/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-[13px] font-semibold text-primary">
                        {grade.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-foreground">{grade.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{grade.year_level}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{grade.academic_year}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-500/15 px-3 py-1 text-[13px] font-medium text-lime-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                      活跃
                    </span>
                  </td>
                  <td className="px-5 py-4">
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
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    暂无活跃年级。点击上方「新建」按钮创建第一个年级。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inactive grades */}
      {inactiveGrades.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm">
          <div className="border-b border-border/40 px-5 py-4">
            <h2 className="text-sm font-semibold text-muted-foreground">已停用年级</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/40">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">名称</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">层级</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">学年</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-transparent">
                {inactiveGrades.map((grade) => (
                  <tr key={grade.id} className="transition hover:bg-muted/50 opacity-60">
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-muted-foreground">{grade.name}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{grade.year_level}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{grade.academic_year}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium text-muted-foreground">已停用</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
