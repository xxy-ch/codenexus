import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { memo } from 'react'

interface MarkdownPreviewProps {
  content: string
  darkMode?: boolean
}

export const MarkdownPreview = memo(({ content, darkMode = false }: MarkdownPreviewProps) => {
  return (
    <div className="markdown-preview prose prose-lg dark:prose-invert max-w-none p-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const inline = (props as any).inline
            return !inline && match ? (
              <div className="my-2 overflow-x-auto rounded-lg border border-gray-200 bg-slate-950/95 dark:border-slate-700 dark:bg-slate-950">
                <div className="border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {match[1]}
                </div>
                <pre className="overflow-x-auto px-4 py-4 text-sm text-slate-100">
                  <code className={className} {...props}>
                    {String(children).replace(/\n$/, '')}
                  </code>
                </pre>
              </div>
            ) : (
              <code
                className={`${className} px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono`}
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
                className="border-l-4 border-primary pl-4 italic my-4 text-gray-600 dark:text-gray-400"
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
                  className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-300 dark:border-gray-600"
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
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-left font-semibold"
                {...props}
              >
                {children}
              </th>
            )
          },
          td({ node, children, ...props }) {
            return (
              <td
                className="px-4 py-2 border-t border-gray-200 dark:border-gray-700"
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
