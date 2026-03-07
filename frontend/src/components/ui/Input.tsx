import { TextField } from '@mui/material'
import type { TextFieldProps } from '@mui/material/TextField'
import { cn } from '@/lib/utils'

interface InputProps extends Omit<TextFieldProps, 'className'> {
  className?: string
  error?: string
  fullWidth?: boolean
}

export function Input({ className, error, fullWidth = true, ...props }: InputProps) {
  return (
    <div className={cn(!fullWidth && 'w-fit', className)}>
      <TextField
        className="w-full"
        variant="outlined"
        size="small"
        error={!!error}
        helperText={error}
        {...props}
      />
    </div>
  )
}
