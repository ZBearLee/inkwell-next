"use client";

// src/components/editor/markdown-editor.tsx
// Markdown 编辑器（输入 + 实时预览双栏）
//
// ==================== 为什么是 Client Component? ====================
//
// 1. textarea 输入需要 onChange 事件
// 2. 实时预览需要 debounce 后调用 Server Action
// 3. 工具栏按钮插入 Markdown 语法
//
// ==================== 实时预览实现 ====================
//
// 方案对比：
//   A. 客户端渲染（react-markdown）→ bundle 大，代码高亮不一致
//   B. Server Action 渲染 → 复用 renderMarkdown，bundle 小，但有网络延迟
//
// 选 B：debounce 500ms 调用 renderPreviewAction
//   - 用户停止输入 500ms 后触发预览更新
//   - 避免每次按键都发请求
//   - 网络延迟在可接受范围（本地 ~50ms）
//
// ==================== 受控 vs 非受控 ====================
//
// content 由父组件 PostEditor 管理（useState），通过 value/onChange 传入
// 这里是受控模式，因为：
//   1. 父组件需要读 content 做自动保存
//   2. 父组件需要读 content 做表单提交
//   3. 实时预览也需要 content

import { useState, useEffect, useCallback, useRef } from "react";
import { renderPreviewAction } from "@/actions/post";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// 工具栏按钮配置
const toolbarButtons = [
  { label: "H2", prefix: "## ", placeholder: "标题", title: "二级标题" },
  { label: "H3", prefix: "### ", placeholder: "标题", title: "三级标题" },
  { label: "B", prefix: "**", suffix: "**", placeholder: "粗体", title: "粗体" },
  { label: "I", prefix: "*", suffix: "*", placeholder: "斜体", title: "斜体" },
  { label: "链接", prefix: "[", suffix: "](url)", placeholder: "链接文字", title: "插入链接" },
  { label: "代码", prefix: "`", suffix: "`", placeholder: "code", title: "行内代码" },
  { label: "代码块", prefix: "\n```ts\n", suffix: "\n```\n", placeholder: "code", title: "代码块" },
  { label: "引用", prefix: "> ", placeholder: "引用内容", title: "引用" },
  { label: "列表", prefix: "- ", placeholder: "列表项", title: "无序列表" },
];

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ==================== 实时预览（debounce 500ms）====================
  const updatePreview = useCallback(async (markdown: string) => {
    if (!markdown.trim()) {
      setPreviewHtml('<p class="text-zinc-400">预览区域为空</p>');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const result = await renderPreviewAction(markdown);
      setPreviewHtml(result.html);
    } catch {
      setPreviewHtml("<p>预览加载失败</p>");
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);

  // debounce：value 变化后 500ms 才触发预览更新
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreview(value);
    }, 500);
    return () => clearTimeout(timer);
  }, [value, updatePreview]);

  // 首次加载时立即渲染预览（不等 debounce）
  useEffect(() => {
    if (value && !previewHtml) {
      updatePreview(value);
    }
  }, [value, previewHtml, updatePreview]);

  // ==================== 工具栏插入 ====================
  const insertMarkdown = (button: typeof toolbarButtons[0]) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const insertText = `${button.prefix}${selectedText || button.placeholder}${button.suffix || ""}`;

    // 替换选中文本，光标移到插入内容后
    const newValue = value.substring(0, start) + insertText + value.substring(end);
    onChange(newValue);

    // 恢复光标位置（React 更新后）
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + insertText.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  // ==================== Tab 键缩进 ====================
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      });
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      {/* ==================== 工具栏 ==================== */}
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
        {toolbarButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={() => insertMarkdown(btn)}
            title={btn.title}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* ==================== 编辑 + 预览双栏 ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* 编辑区 */}
        <div className="border-b border-zinc-200 dark:border-zinc-700 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between bg-zinc-50 px-3 py-1.5 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500">Markdown</span>
            <span className="text-xs text-zinc-400">{value.length} 字符</span>
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在这里输入 Markdown 内容..."
            className="h-[500px] w-full resize-none bg-white p-4 font-mono text-sm leading-relaxed text-zinc-900 focus:outline-none dark:bg-zinc-950 dark:text-zinc-100"
            spellCheck={false}
          />
        </div>

        {/* 预览区 */}
        <div>
          <div className="flex items-center justify-between bg-zinc-50 px-3 py-1.5 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500">预览</span>
            {isPreviewLoading && (
              <span className="text-xs text-blue-500">渲染中...</span>
            )}
          </div>
          <div
            className="prose prose-sm dark:prose-invert h-[500px] max-w-none overflow-y-auto p-4"
            dangerouslySetInnerHTML={{
              __html:
                previewHtml ||
                '<p class="text-zinc-400">输入内容后此处显示预览</p>',
            }}
          />
        </div>
      </div>
    </div>
  );
}
