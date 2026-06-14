import { ChevronRight } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/tabs'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isAdmin } from '@/shared/types/auth'
import { ProblemImportTab } from '@/features/admin/components/batch-ops/ProblemImportTab'
import { ProblemExportTab } from '@/features/admin/components/batch-ops/ProblemExportTab'
import { UserImportTab } from '@/features/admin/components/batch-ops/UserImportTab'
import { UserExportTab } from '@/features/admin/components/batch-ops/UserExportTab'

export function BatchOperations() {
  const { user } = useAuth()
  const showUserTabs = user?.role ? isAdmin(user.role) : false

  return (
    <div className="space-y-6 p-5">
      {/* Page title section */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-foreground">批量操作</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">批量操作</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          批量导入导出题目和用户。上传文件后先预览再确认提交。
        </p>
      </div>

      <Tabs defaultValue="problem-import">
        <TabsList>
          <TabsTrigger value="problem-import">Problem Import</TabsTrigger>
          <TabsTrigger value="problem-export">Problem Export</TabsTrigger>
          {showUserTabs && <TabsTrigger value="user-import">User Import</TabsTrigger>}
          {showUserTabs && <TabsTrigger value="user-export">User Export</TabsTrigger>}
        </TabsList>

        <TabsContent value="problem-import">
          <ProblemImportTab />
        </TabsContent>

        <TabsContent value="problem-export">
          <ProblemExportTab />
        </TabsContent>

        {showUserTabs && (
          <TabsContent value="user-import">
            <UserImportTab />
          </TabsContent>
        )}

        {showUserTabs && (
          <TabsContent value="user-export">
            <UserExportTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default BatchOperations
