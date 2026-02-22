import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
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
              <SyntaxHighlighter
                style={darkMode ? vscDarkPlus : vs}
                language={match[1]}
                PreTag="div"
                className="rounded-lg text-sm"
                customStyle={{
                  background: darkMode ? '#1a1a1a' : '#f6f8fa',
                  padding: '16px',
                  margin: '8px 0',
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
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
