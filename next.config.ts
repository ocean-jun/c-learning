import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // web-tree-sitter 的 Emscripten 代码包含 Node 环境分支,
      // 在浏览器打包时把 Node 内置模块映射为空实现
      fs: "./src/lib/empty-module.ts",
      "fs/promises": "./src/lib/empty-module.ts",
      module: "./src/lib/empty-module.ts",
    },
  },
};

export default nextConfig;
