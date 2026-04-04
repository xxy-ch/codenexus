interface StatusBadgeProps {
  status: string
}

const statusMap: Record<string, { label: string; className: string }> = {
  accepted: { label: 'Accepted', className: 'badge-accepted' },
  wrong_answer: { label: 'Wrong Answer', className: 'badge-wrong' },
  time_limit_exceeded: { label: 'TLE', className: 'badge-wrong' },
  memory_limit_exceeded: { label: 'MLE', className: 'badge-wrong' },
  runtime_error: { label: 'RTE', className: 'badge-wrong' },
  compilation_error: { label: 'CE', className: 'badge-compilation' },
  pending: { label: 'Pending', className: 'badge-pending' },
  running: { label: 'Running', className: 'badge-pending' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] || { label: status, className: 'badge-pending' }
  return (
    <span className={`${config.className} inline-block`}>
      {config.label}
    </span>
  )
}
