import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React 19 新规则:禁止在 useEffect 里同步调 setState
    // 这些 effect 模式(自动生成 slug、搜索建议)在现有代码中常见且能正常工作
    // 降级为 warning,保留提醒但不阻塞 CI
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma 生成的文件,不参与 ESLint 检查
    "src/generated/**",
  ]),
]);

export default eslintConfig;
