import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classesService } from "@/services/classes";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { InlineError } from "@/components/ui/InlineError";
import { ClassCognitionPanel } from "@/components/analysis/ClassCognitionPanel";

export function ClassManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newSemester, setNewSemester] = useState("");
  const [studentUsername, setStudentUsername] = useState("");
  const [studentImport, setStudentImport] = useState("");
  const [assignmentProblemId, setAssignmentProblemId] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentPoints, setAssignmentPoints] = useState("100");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    number | null
  >(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const limit = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["classes", page],
    queryFn: () => classesService.getClasses(page, limit),
  });

  const classes = data?.classes || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filteredClasses = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return classes;
    return classes.filter((item) =>
      [
        item.name,
        item.semester || "",
        item.enrollment_code || "",
        String(item.id),
      ].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [classes, search]);

  useEffect(() => {
    if (filteredClasses.length === 0) {
      setSelectedClassId(null);
      return;
    }

    const nextSelectedClass =
      filteredClasses.find((item) => item.id === selectedClassId) ??
      filteredClasses[0];
    if (nextSelectedClass && nextSelectedClass.id !== selectedClassId) {
      setSelectedClassId(nextSelectedClass.id);
    }
  }, [filteredClasses, selectedClassId]);

  const highlightedClass =
    filteredClasses.find((item) => item.id === selectedClassId) ?? null;

  const { data: students = [] } = useQuery({
    queryKey: ["classStudents", highlightedClass?.id],
    queryFn: () => classesService.getClassStudents(highlightedClass!.id),
    enabled: !!highlightedClass?.id,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["classAssignments", highlightedClass?.id],
    queryFn: () => classesService.listAssignments(highlightedClass!.id),
    enabled: !!highlightedClass?.id,
  });

  const activeAssignmentId = selectedAssignmentId ?? assignments[0]?.id ?? null;

  const { data: assignmentSubmissions = [] } = useQuery({
    queryKey: ["assignmentSubmissions", activeAssignmentId],
    queryFn: () => classesService.getAssignmentSubmissions(activeAssignmentId!),
    enabled: !!activeAssignmentId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["classes"] });
    if (highlightedClass?.id) {
      queryClient.invalidateQueries({
        queryKey: ["classStudents", highlightedClass.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["classAssignments", highlightedClass.id],
      });
    }
    if (activeAssignmentId) {
      queryClient.invalidateQueries({
        queryKey: ["assignmentSubmissions", activeAssignmentId],
      });
    }
  };

  const createClassMutation = useMutation({
    mutationFn: () =>
      classesService.createClass({
        organization_id: 1,
        campus_id: 1,
        name: newClassName,
        semester: newSemester || undefined,
      }),
    onSuccess: () => {
      setNewClassName("");
      setNewSemester("");
      setSelectedClassId(null);
      invalidate();
    },
  });

  const addStudentMutation = useMutation({
    mutationFn: () =>
      classesService.addStudent(highlightedClass!.id, studentUsername),
    onSuccess: () => {
      setStudentUsername("");
      invalidate();
    },
  });

  const importStudentsMutation = useMutation({
    mutationFn: () =>
      classesService.batchImportStudents(
        highlightedClass!.id,
        studentImport
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    onSuccess: () => {
      setStudentImport("");
      invalidate();
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: () =>
      classesService.createAssignment(highlightedClass!.id, {
        problem_id: Number(assignmentProblemId),
        deadline: assignmentDeadline,
        points: Number(assignmentPoints),
      }),
    onSuccess: (created) => {
      setAssignmentProblemId("");
      setAssignmentDeadline("");
      setAssignmentPoints("100");
      setSelectedAssignmentId(created.id);
      invalidate();
    },
  });

  const publishAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) =>
      classesService.publishAssignment(assignmentId),
    onSuccess: (_, assignmentId) => {
      setSelectedAssignmentId(assignmentId);
      invalidate();
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) =>
      classesService.deleteAssignment(assignmentId),
    onSuccess: () => {
      setSelectedAssignmentId(null);
      invalidate();
    },
  });

  if (isLoading) {
    return <TableSkeleton rows={6} columns={5} />;
  }

  if (error) {
    return <InlineError title="班级加载失败" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-2 text-sm text-tertiary">
          <span>教师工作台</span>
          <span>/</span>
          <span className="font-medium text-foreground">班级管理</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              班级管理
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">
              建班、邀请码入班、按用户名加人、批量导入、创建作业、发布作业，以及按作业查看提交记录。
            </p>
          </div>
          <div className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-whisper transition-button-press button-press">
            写操作已接通
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-card-hover hover-lift">
          <div className="text-xs font-semibold uppercase tracking-widest text-secondary">
            班级数
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">
            {total}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-card-hover hover-lift">
          <div className="text-xs font-semibold uppercase tracking-widest text-secondary">
            当前选中
          </div>
          <div className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {highlightedClass?.name || "未选择"}
          </div>
          <div className="mt-1 text-xs text-tertiary">
            {highlightedClass?.semester || "未设置学期"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-card-hover hover-lift">
          <div className="text-xs font-semibold uppercase tracking-widest text-secondary">
            邀请码
          </div>
          <div className="mt-3 font-mono text-2xl font-bold tracking-tight text-primary">
            {highlightedClass?.enrollment_code || "--"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-card-hover hover-lift">
          <div className="text-xs font-semibold uppercase tracking-widest text-secondary">
            作业 / 学生
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">
            {assignments.length}
          </div>
          <div className="mt-1 text-xs text-tertiary">
            {students.length} 名学生
          </div>
        </div>
      </div>

      {highlightedClass && (
        <ClassCognitionPanel classId={highlightedClass.id} />
      )}

      {/* Main Content */}
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          {/* Create class */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-whisper">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              创建班级
            </h2>
            <div className="mt-4 space-y-3">
              <input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="班级名称"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:shadow-focus transition-shadow"
              />
              <input
                value={newSemester}
                onChange={(e) => setNewSemester(e.target.value)}
                placeholder="学期，例如 2026 春"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:shadow-focus transition-shadow"
              />
              <button
                type="button"
                onClick={() => createClassMutation.mutate()}
                disabled={!newClassName || createClassMutation.isPending}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-whisper transition-button-press button-press disabled:opacity-50"
              >
                创建班级
              </button>
            </div>
          </div>

          {/* Student management */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-whisper">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              班级成员管理
            </h2>
            <p className="mt-1 text-xs text-tertiary">
              当前班级：{highlightedClass?.name || "先选择班级"}
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs font-semibold text-foreground">
                  邀请码
                </div>
                <div className="mt-2 rounded-md bg-muted/50 px-4 py-3 font-mono text-sm text-foreground">
                  {highlightedClass?.enrollment_code || "--"}
                </div>
                <p className="mt-2 text-xs text-tertiary">
                  学生可通过真实邀请码入班接口加入该班级。
                </p>
              </div>
              <div>
                <input
                  value={studentUsername}
                  onChange={(e) => setStudentUsername(e.target.value)}
                  placeholder="学生用户名（12位ID）"
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:shadow-focus transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => addStudentMutation.mutate()}
                  disabled={
                    !highlightedClass ||
                    !studentUsername ||
                    addStudentMutation.isPending
                  }
                  className="mt-3 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-whisper transition-button-press button-press disabled:opacity-50"
                >
                  按用户名添加学生
                </button>
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
                  disabled={
                    !highlightedClass ||
                    !studentImport.trim() ||
                    importStudentsMutation.isPending
                  }
                  className="mt-3 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-whisper transition-button-press button-press disabled:opacity-50"
                >
                  批量导入学生
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {/* Class list */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <div className="border-b border-border-subtle px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-foreground">
                    班级列表
                  </h2>
                  <p className="mt-1 text-xs text-tertiary">
                    显式选择班级后，成员与作业写操作都会绑定到该班级。
                  </p>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索班级 / 学期 / 邀请码"
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:shadow-focus transition-shadow lg:max-w-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-whisper">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left">班级</th>
                    <th className="px-6 py-3 text-left">学期</th>
                    <th className="px-6 py-3 text-left">邀请码</th>
                    <th className="px-6 py-3 text-right">学生数</th>
                    <th className="px-6 py-3 text-right">选择</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map((item) => (
                    <tr
                      key={item.id}
                      className={
                        highlightedClass?.id === item.id
                          ? "bg-primary/5"
                          : "cursor-pointer"
                      }
                      onClick={() => {
                        setSelectedClassId(item.id);
                        setSelectedAssignmentId(null);
                      }}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary">
                        {item.semester || "未设置"}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-primary">
                        {item.enrollment_code}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-secondary">
                        {item.student_count ?? 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedClassId(item.id);
                            setSelectedAssignmentId(null);
                          }}
                          className={
                            highlightedClass?.id === item.id
                              ? "rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                              : "rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                          }
                        >
                          {highlightedClass?.id === item.id
                            ? `已选中 ${item.name}`
                            : `选择 ${item.name}`}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assignments & Students */}
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-xl border border-border bg-card p-6 shadow-whisper">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                创建作业
              </h2>
              <div className="mt-4 space-y-3">
                <input
                  value={assignmentProblemId}
                  onChange={(e) => setAssignmentProblemId(e.target.value)}
                  placeholder="题目 ID"
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:shadow-focus transition-shadow"
                />
                <label className="block text-sm text-secondary">
                  <span className="sr-only">作业截止时间</span>
                  <input
                    aria-label="作业截止时间"
                    type="datetime-local"
                    value={assignmentDeadline}
                    onChange={(e) => setAssignmentDeadline(e.target.value)}
                    onInput={(e) =>
                      setAssignmentDeadline(
                        (e.currentTarget as HTMLInputElement).value,
                      )
                    }
                    className="mt-1 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:shadow-focus transition-shadow"
                  />
                </label>
                <input
                  value={assignmentPoints}
                  onChange={(e) => setAssignmentPoints(e.target.value)}
                  placeholder="分值"
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:shadow-focus transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => createAssignmentMutation.mutate()}
                  disabled={
                    !highlightedClass ||
                    !assignmentProblemId ||
                    !assignmentDeadline ||
                    createAssignmentMutation.isPending
                  }
                  className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-whisper transition-button-press button-press disabled:opacity-50"
                >
                  创建作业
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <div className="border-b border-border-subtle px-6 py-5">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  班级学生
                </h2>
                <p className="mt-1 text-xs text-tertiary">
                  当前选中班级的真实学生清单与完成情况。
                </p>
              </div>
              <div className="overflow-x-auto border-b border-border-subtle">
                <table className="w-full table-whisper">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left">学生</th>
                      <th className="px-6 py-3 text-left">邮箱</th>
                      <th className="px-6 py-3 text-right">进度</th>
                      <th className="px-6 py-3 text-right">平均分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.student_id}>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {student.username}
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-secondary">
                          {student.completed_assignments}/
                          {student.total_assignments}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-secondary">
                          {student.average_score}
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-sm text-tertiary"
                        >
                          当前班级暂无学生记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-b border-border-subtle px-6 py-5">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  作业与提交记录
                </h2>
                <p className="mt-1 text-xs text-tertiary">
                  发布作业后可直接查看当前班级该题目的真实提交记录。
                </p>
              </div>
              <div className="overflow-x-auto border-b border-border-subtle">
                <table className="w-full table-whisper">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left">作业</th>
                      <th className="px-6 py-3 text-left">截止时间</th>
                      <th className="px-6 py-3 text-center">已发布</th>
                      <th className="px-6 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr
                        key={assignment.id}
                        className={
                          activeAssignmentId === assignment.id
                            ? "bg-primary/5"
                            : ""
                        }
                      >
                        <td className="px-6 py-4 text-sm text-foreground">
                          题目 #{assignment.problem_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary">
                          {new Date(assignment.deadline).toLocaleString(
                            "zh-CN",
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {assignment.published_at ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-500/15 px-2 py-0.5 text-xs text-lime-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                              是
                            </span>
                          ) : (
                            <span className="text-tertiary">否</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAssignmentId(assignment.id)
                              }
                              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground shadow-whisper transition-button-press button-press"
                            >
                              查看提交
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                publishAssignmentMutation.mutate(assignment.id)
                              }
                              disabled={publishAssignmentMutation.isPending}
                              className="rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
                            >
                              发布
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                deleteAssignmentMutation.mutate(assignment.id)
                              }
                              disabled={deleteAssignmentMutation.isPending}
                              className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-xs font-medium text-rose-400 disabled:opacity-50"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {assignments.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-sm text-tertiary"
                        >
                          当前班级暂无作业
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-5">
                <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-secondary">
                  作业提交记录
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full table-whisper">
                    <thead>
                      <tr>
                        <th className="px-2 py-3 text-left">提交</th>
                        <th className="px-2 py-3 text-left">用户</th>
                        <th className="px-2 py-3 text-left">得分</th>
                        <th className="px-2 py-3 text-left">迟交</th>
                        <th className="px-2 py-3 text-left">提交时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignmentSubmissions.map((submission) => (
                        <tr
                          key={submission.id}
                          className="text-sm text-secondary"
                        >
                          <td className="px-2 py-3">
                            #{submission.submission_id}
                          </td>
                          <td className="px-2 py-3 font-mono text-xs">
                            {submission.user_id}
                          </td>
                          <td className="px-2 py-3">{submission.score}</td>
                          <td className="px-2 py-3">
                            {submission.is_late
                              ? `是 (${submission.late_days}天)`
                              : "否"}
                          </td>
                          <td className="px-2 py-3">
                            {new Date(submission.submitted_at).toLocaleString(
                              "zh-CN",
                            )}
                          </td>
                        </tr>
                      ))}
                      {assignmentSubmissions.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-2 py-10 text-center text-sm text-tertiary"
                          >
                            当前作业暂无提交记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground shadow-whisper transition-button-press button-press disabled:opacity-50"
        >
          上一页
        </button>
        <span className="text-xs text-tertiary">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-whisper transition-button-press button-press disabled:opacity-50"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
