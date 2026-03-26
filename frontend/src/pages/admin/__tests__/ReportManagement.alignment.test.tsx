import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReportManagement } from '../ReportManagement'

describe('ReportManagement alignment', () => {
  it('shows an honest unsupported state instead of calling missing backend routes', () => {
    render(<ReportManagement />)

    expect(screen.getByRole('heading', { name: '举报管理' })).toBeInTheDocument()
    expect(screen.getByText('当前版本未接通通用举报工作流')).toBeInTheDocument()
    expect(screen.getByText('平台已接入抄袭检测与审计记录')).toBeInTheDocument()
  })
})
