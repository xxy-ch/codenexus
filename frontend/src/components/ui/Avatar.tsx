interface AvatarProps {
  name?: string
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Avatar({ name, src, alt = '', size = 'md' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
  }

  const fallbackText = alt || name || '?'

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'avatar'}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    )
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-primary-container flex items-center justify-center text-white font-semibold`}>
      {fallbackText.charAt(0).toUpperCase()}
    </div>
  )
}
