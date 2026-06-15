import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { classesService } from '@/features/classes/services/classes'

function getMutationErrorMessage(error: unknown) {
  if (!error) return null
  if (error instanceof Error && error.message) return error.message
  return '请求失败，请检查账号权限、班级归属或学生用户名后重试。'
}

interface StudentManagementPanelProps {
  classId: number
  className: string
  enrollmentCode: string
}

export function StudentManagementPanel({ classId, className, enrollmentCode }: StudentManagementPanelProps) {
  const queryClient = useQueryClient()
  const [studentUsername, setStudentUsername] = useState('')
  const [studentImport, setStudentImport] = useState('')

  const { data: students = [], error: studentsError } = useQuery({
    queryKey: ['classStudents', classId],
    queryFn: () => classesService.getClassStudents(classId),
  })

  const addStudentMutation = useMutation({
    mutationFn: () => classesService.addStudent(classId, studentUsername.trim()),
    onSuccess: () => {
      setStudentUsername('')
      queryClient.invalidateQueries({ queryKey: ['classStudents', classId] })
    },
  })

  const importStudentsMutation = useMutation({
    mutationFn: () => classesService.batchImportStudents(classId, studentImport),
    onSuccess: () => {
      setStudentImport('')
      queryClient.invalidateQueries({ queryKey: ['classStudents', classId] })
    },
  })

  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-6 shadow-whisper">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">班级成员管理</h2>
      <p className="mt-1 text-xs text-tertiary">当前班级：{className}</p>
      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs font-semibold text-foreground">邀请码</div>
          <div className="mt-2 rounded-md bg-muted/50 px-4 py-3 font-mono text-sm text-foreground">
            {enrollmentCode || '--'}
          </div>
          <p className="mt-2 text-xs text-tertiary">学生可使用邀请码加入该班级。</p>
        </div>

        {students.length > 0 && (
          <div className="rounded-lg border border-border p-4">
            <div className="text-xs font-semibold text-foreground mb-2">已加入学生 ({students.length})</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {students.map((s: { id: string | number; username: string }) => (
                <div key={s.id} className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm bg-muted/30">
                  <span className="font-mono">{s.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {studentsError && <p className="text-xs text-destructive">学生列表加载失败</p>}

        <div>
          <input
            value={studentUsername}
            onChange={(e) => setStudentUsername(e.target.value)}
            placeholder="学生用户名 / 12位ID / 邮箱"
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:shadow-focus transition-shadow"
          />
          <button
            type="button"
            onClick={() => addStudentMutation.mutate()}
            disabled={!studentUsername.trim() || addStudentMutation.isPending}
            className="mt-3 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-whisper transition-button-press button-press disabled:opacity-50"
          >
            添加学生
          </button>
          {addStudentMutation.isError && (
            <p className="mt-2 text-xs text-destructive">{getMutationErrorMessage(addStudentMutation.error)}</p>
          )}
        </div>

        <div>
          <textarea
            value={studentImport}
            onChange={(e) => setStudentImport(e.target.value)}
            placeholder="批量导入用户名，每行一个"
            className="min-h-[120px] w-full rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:shadow-focus transition-shadow"
          />
          <button
            type="button"
            onClick={() => importStudentsMutation.mutate()}
            disabled={!studentImport.trim() || importStudentsMutation.isPending}
            className="mt-3 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-whisper transition-button-press button-press disabled:opacity-50"
          >
            批量导入学生
          </button>
          {importStudentsMutation.isError && (
            <p className="mt-2 text-xs text-destructive">{getMutationErrorMessage(importStudentsMutation.error)}</p>
          )}
        </div>
      </div>
    </div>
  )
}
