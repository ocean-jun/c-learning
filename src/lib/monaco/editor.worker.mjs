// Monaco 编辑器 worker 入口
// 通过相对路径转存, 使 Turbopack 能将 monaco-editor 的 worker 及其依赖
// 打包为独立的 worker chunk (bare specifier 在 new URL 中无法解析)
// 注意: monaco-editor 的 exports 映射为 "./*" -> "./esm/vs/*.js",
//       因此子路径写法是 "monaco-editor/editor/editor.worker.js"
export * from "monaco-editor/editor/editor.worker.js";
