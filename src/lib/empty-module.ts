/**
 * 空模块: 用于把 web-tree-sitter 内部引用的 Node 内置模块
 * (fs / fs/promises / module) 在浏览器打包时映射为空实现。
 * web-tree-sitter 仅在 Node 环境下才会真正调用这些模块。
 */
export {};
