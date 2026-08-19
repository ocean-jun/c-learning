/**
 * Monaco Editor 本地化配置
 *
 * - 使用 npm 安装的 monaco-editor (打包进应用, 离线可用, 不走 CDN)
 * - 仅注册 editorWorkerService worker (C 语言不需要语言 worker)
 *   在 Turbopack 下通过 new Worker(new URL(...)) 打包 worker 文件
 */
import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";

// 让 @monaco-editor/react 使用本地打包的 monaco 实例
loader.config({ monaco });

// Monaco 需要 Worker 环境; 只用到编辑器基础服务, 统一走 editor.worker
// (worker 入口为本地相对路径, 由 Turbopack 打包为独立 chunk, 离线可用)
globalThis.MonacoEnvironment = {
  getWorker(_workerId: string, _label: string) {
    return new Worker(new URL("./monaco/editor.worker.mjs", import.meta.url), {
      type: "module",
    });
  },
};
