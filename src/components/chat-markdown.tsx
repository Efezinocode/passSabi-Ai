import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/**
 * Models emit LaTeX in several delimiter styles. remark-math only understands
 * $...$ and $$...$$, so normalise the others before parsing.
 */
function normaliseMath(input: string): string {
  return input
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, body) => `\n\n$$${body}$$\n\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, body) => `$${body}$`);
}

export const ChatMarkdown = memo(function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="chat-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          h1: (props) => <h3 className="mt-4 mb-2 text-base font-bold first:mt-0" {...props} />,
          h2: (props) => <h4 className="mt-4 mb-2 text-base font-bold first:mt-0" {...props} />,
          h3: (props) => <h5 className="mt-3 mb-1.5 text-sm font-bold first:mt-0" {...props} />,
          h4: (props) => <h6 className="mt-3 mb-1.5 text-sm font-bold first:mt-0" {...props} />,
          p: (props) => <p className="mb-2 last:mb-0" {...props} />,
          strong: (props) => <strong className="font-semibold" {...props} />,
          ul: (props) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props} />,
          ol: (props) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props} />,
          li: (props) => <li className="leading-relaxed" {...props} />,
          hr: () => <hr className="my-3 border-border" />,
          blockquote: (props) => (
            <blockquote className="my-2 border-l-2 border-border pl-3 italic" {...props} />
          ),
          a: (props) => (
            <a className="underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <code className="block whitespace-pre-wrap font-mono text-xs" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre
              className="mb-2 overflow-x-auto rounded-xl bg-muted/70 p-3 last:mb-0"
              {...props}
            />
          ),
          table: (props) => (
            <div className="mb-2 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse text-xs" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="border border-border px-2 py-1 text-left font-semibold" {...props} />
          ),
          td: (props) => <td className="border border-border px-2 py-1" {...props} />,
        }}
      >
        {normaliseMath(content)}
      </ReactMarkdown>
    </div>
  );
});
