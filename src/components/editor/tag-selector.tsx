"use client";

// src/components/editor/tag-selector.tsx
// 标签选择器（输入框 + 下拉建议 + 已选胶囊）
//
// ==================== 为什么替换原来的按钮切换? ====================
//
// 原方案：把所有标签渲染为按钮，点击切换
//   → 标签少时 OK，标签多时（50+）页面很乱
//   → 找标签要肉眼扫描，体验差
//
// 新方案：输入框 + 下拉建议
//   → 输入关键词快速过滤
//   → 已选标签显示为胶囊（清晰可见）
//   → 下拉只显示匹配的，干净
//
// ==================== 为什么纯客户端过滤? ====================
//
// 标签通常几十个，全量从服务端传到客户端无压力
// 过滤在客户端做，零延迟，不需要新增 API Route
//
// ==================== 交互流程 ====================
//
// 1. 用户输入文字 → 实时过滤匹配的标签（排除已选的）
// 2. 点击下拉项 → 添加到已选 → 清空输入框 → 下拉保持打开
// 3. 点击已选胶囊的 × → 移除
// 4. 最多 5 个标签（满了禁用输入框）
// 5. 点击外部 → 关闭下拉

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";

interface TagOption {
  id: string;
  name: string;
  slug: string;
}

interface TagSelectorProps {
  tags: TagOption[];
  selectedTags: string[];
  onChange: (ids: string[]) => void;
  maxTags?: number;
}

export function TagSelector({
  tags,
  selectedTags,
  onChange,
  maxTags = 5,
}: TagSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ==================== 点击外部关闭下拉 ====================
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ==================== 过滤建议列表 ====================
  // 1. 排除已选的标签
  // 2. 按输入文字过滤（name 包含输入，不区分大小写）
  // 3. 最多显示 10 条建议
  const filteredSuggestions = tags
    .filter((tag) => !selectedTags.includes(tag.id))
    .filter((tag) =>
      inputValue
        ? tag.name.toLowerCase().includes(inputValue.toLowerCase())
        : true,
    )
    .slice(0, 10);

  const isMaxReached = selectedTags.length >= maxTags;

  // ==================== 添加标签 ====================
  const addTag = (tagId: string) => {
    if (selectedTags.length >= maxTags) return;
    onChange([...selectedTags, tagId]);
    setInputValue(""); // 清空输入框，方便继续选下一个
    inputRef.current?.focus(); // 保持焦点，继续输入
  };

  // ==================== 移除标签 ====================
  const removeTag = (tagId: string) => {
    onChange(selectedTags.filter((id) => id !== tagId));
    inputRef.current?.focus();
  };

  // ==================== 键盘交互 ====================
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace 在输入框为空时，删除最后一个已选标签
    if (e.key === "Backspace" && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
    // Enter 选择第一个建议
    if (e.key === "Enter" && filteredSuggestions.length > 0) {
      e.preventDefault();
      addTag(filteredSuggestions[0].id);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* ==================== 输入区域 ==================== */}
      <div
        className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
        onClick={() => !isMaxReached && inputRef.current?.focus()}
      >
        {/* 已选标签胶囊 */}
        {selectedTags.map((tagId) => {
          const tag = tags.find((t) => t.id === tagId);
          if (!tag) return null;
          return (
            <span
              key={tagId}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              {tag.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tagId);
                }}
                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}

        {/* 输入框 */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          disabled={isMaxReached}
          placeholder={
            isMaxReached
              ? `最多 ${maxTags} 个标签`
              : selectedTags.length === 0
                ? "输入标签名称搜索..."
                : "继续添加..."
          }
          className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
        />

        {/* 下拉箭头 */}
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
      </div>

      {/* ==================== 下拉建议 ==================== */}
      {showSuggestions && !isMaxReached && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {/* 有匹配结果 */}
          {filteredSuggestions.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto py-1">
              {filteredSuggestions.map((tag) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    onClick={() => addTag(tag.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <span>{tag.name}</span>
                    <code className="text-xs text-zinc-400">{tag.slug}</code>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            // 无匹配结果
            <div className="px-3 py-4 text-center text-xs text-zinc-400">
              {inputValue
                ? `没有找到包含"${inputValue}"的标签`
                : "暂无可用标签"}
            </div>
          )}
        </div>
      )}

      {/* ==================== 计数提示 ==================== */}
      <p className="mt-1 text-xs text-zinc-400">
        {selectedTags.length}/{maxTags} 个标签
      </p>
    </div>
  );
}
