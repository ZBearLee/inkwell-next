// src/lib/slug.ts
// slug 生成工具
//
// ==================== 为什么需要 slug? ====================
//
// slug 是 URL 的一部分，用于唯一标识一篇文章
//   /posts/hello-world  ← "hello-world" 就是 slug
//
// 为什么不直接用数据库 id?
//   1. id 是 cuid（如 clxxx...），不可读，SEO 不友好
//   2. slug 是人类可读的（如 "nextjs-16-new-features"），SEO 友好
//
// 为什么不用中文 slug?
//   1. 中文 URL 会被浏览器编码成 %E4%B8%AD... 很丑
//   2. 部分搜索引擎/分享平台对中文 URL 支持不好
//   3. 复制粘贴时容易出问题
//
// ==================== slug 生成策略 ====================
//
// 1. 英文标题：直接 slugify（小写 + 空格转连字符 + 去特殊字符）
//    "Hello World!" → "hello-world"
//
// 2. 中文标题：用时间戳生成唯一 slug
//    "你好世界" → "post-1786443536"
//    （不引入 pinyin 库，避免额外依赖；用户可手动修改）
//
// 3. 用户可手动输入 slug（覆盖自动生成）

/**
 * 把任意字符串转成 URL 友好的 slug
 *
 * 规则：
 *   - 转小写
 *   - 空格转连字符
 *   - 去掉非字母数字字符（保留连字符）
 *   - 多个连符合并为一个
 *   - 去掉首尾连字符
 *
 * @example
 * slugify("Hello World!")      → "hello-world"
 * slugify("Next.js 16 Guide")  → "next-js-16-guide"
 * slugify("你好世界")           → ""（纯中文，返回空串）
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // 把非字母数字的连续字符替换为单个连字符（中文/空格/标点都变成 "-"）
    .replace(/[^a-z0-9]+/g, "-")
    // 去掉首尾连字符
    .replace(/^-+|-+$/g, "")
    // 多个连符合并为一个（防御性，上面的正则已经合并了）
    .replace(/-{2,}/g, "-");
}

/**
 * 根据标题生成 slug
 *
 * 策略：
 *   1. 先尝试 slugify 标题（英文标题会成功）
 *   2. 如果结果为空（纯中文/特殊字符），用时间戳生成
 *
 * @example
 * generateSlug("Hello World")           → "hello-world"
 * generateSlug("Next.js 入门指南")       → "nextjs-1786443536"（混合标题取英文部分）
 * generateSlug("你好世界")               → "post-1786443536"
 */
export function generateSlug(title: string): string {
  const slugified = slugify(title);

  if (slugified) {
    return slugified;
  }

  // 纯中文标题：用时间戳生成唯一 slug
  // 用 Date.now() 的后 10 位，足够区分
  const timestamp = Date.now().toString().slice(-10);
  return `post-${timestamp}`;
}

/**
 * 生成唯一 slug（如果已存在，追加数字后缀）
 *
 * 用于：创建文章时确保 slug 不冲突
 *   "hello-world" → 已存在 → "hello-world-2"
 *
 * @param title 标题
 * @param existingSlugs 数据库中已存在的 slug 列表
 */
export function generateUniqueSlug(
  title: string,
  existingSlugs: string[] = [],
): string {
  const baseSlug = generateSlug(title);

  // 如果不存在，直接用
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  // 存在则追加数字：hello-world-2, hello-world-3, ...
  let counter = 2;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }

  return `${baseSlug}-${counter}`;
}
