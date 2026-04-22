import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { memo } from 'react'

interface MarkdownPreviewProps {
  content: string
  darkMode?: boolean
}

export const MarkdownPreview = memo(({ content, darkMode: _darkMode = false }: MarkdownPreviewProps) => {
  return (
    <div className="markdown-preview prose prose-lg dark:prose-invert max-w-none p-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const inline = (props as any).inline
            return !inline && match ? (
              <div className="my-2 overflow-x-auto rounded-lg border border-border bg-slate-950/95">
                <div className="border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {match[1]}
                </div>
                <pre className="overflow-x-auto px-4 py-4 text-sm text-foreground">
                  <code className={className} {...props}>
                    {String(children).replace(/\n$/, '')}
                  </code>
                </pre>
              </div>
            ) : (
              <code
                className={`${className} px-1.5 py-0.5 rounded bg-secondary text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            )
          },
          a({ node, children, href, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                {...props}
              >
                {children}
              </a>
            )
          },
          img({ node, src, alt, ...props }) {
            return (
              <img
                src={src}
                alt={alt}
                className="rounded-lg shadow-md my-4 max-w-full"
                loading="lazy"
                {...props}
              />
            )
          },
          blockquote({ node, children, ...props }) {
            return (
              <blockquote
                className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground"
                {...props}
              >
                {children}
              </blockquote>
            )
          },
          table({ node, children, ...props }) {
            return (
              <div className="overflow-x-auto my-4">
                <table
                  className="min-w-full divide-y divide-border border border-border"
                  {...props}
                >
                  {children}
                </table>
              </div>
            )
          },
          th({ node, children, ...props }) {
            return (
              <th
                className="px-4 py-2 bg-secondary text-left font-semibold"
                {...props}
              >
                {children}
              </th>
            )
          },
          td({ node, children, ...props }) {
            return (
              <td
                className="px-4 py-2 border-t border-border"
                {...props}
              >
                {children}
              </td>
            )
          },
        }}
      >
        {content || '*No content yet. Start typing to see the preview...*'}
      </ReactMarkdown>
    </div>
  )
})
