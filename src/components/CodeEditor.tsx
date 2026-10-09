"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { ProblemWithStatus } from "@/lib/types";
import { checkSyntax, type SyntaxIssue } from "@/lib/cSyntaxCheck";
import "@/lib/monaco"; // 本地 monaco + worker 配置(离线可用)

/** 默认代码模板 */
export const DEFAULT_CODE = `#include <stdio.h>

int main()
{
    return 0;
}
`;

interface Props {
  problem: ProblemWithStatus;
  /** 初始代码(可传入最近一次保存的代码) */
  initialCode?: string;
  /** 保存回调; 返回 true 表示保存成功 */
  onSave?: (code: string) => Promise<boolean> | boolean | void;
  /** 提交判题回调; 返回 true 表示判题请求已发出 */
  onJudge?: (code: string) => Promise<boolean> | boolean | void;
  /** 是否正在判题(用于按钮禁用态) */
  judging?: boolean;
  /** 打开自定义输入运行面板(携带当前编辑器代码) */
  onOpenRun?: (code: string) => void;
  /** 编辑器区域高度(px), 由外部拖拽调节 */
  height?: number;
  /** 一键展开/还原代码区(可选) */
  onToggleMaximize?: () => void;
  /** 当前是否处于展开(最大化)状态 */
  maximized?: boolean;
}

type Tip = { kind: "ok" | "err" | "info"; text: string } | null;

const TIP_STYLE: Record<NonNullable<Tip>["kind"], string> = {
  ok: "text-success",
  err: "text-danger",
  info: "text-warning",
};

/**
 * 代码编辑器 (Monaco Editor)
 * - C 语言语法高亮 / 行号 / 自动缩进 / vs-dark 深色主题
 * - 实时语法检查: tree-sitter 解析, 错误以红线 marker 标注
 * - 本地打包, 完全离线可用
 */
export default function CodeEditor({
  problem,
  initialCode = DEFAULT_CODE,
  onSave,
  onJudge,
  judging = false,
  onOpenRun,
  height = 320,
  onToggleMaximize,
  maximized = false,
}: Props) {
  const [code, setCode] = useState(initialCode);
  const [tip, setTip] = useState<Tip>(null);
  const [issueCount, setIssueCount] = useState(0);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const issueCountRef = useRef(0);

  const flashTip = useCallback((t: Tip) => {
    setTip(t);
    window.setTimeout(() => setTip(null), 2500);
  }, []);

  /** 语法检查: debounce 后解析并写入 Monaco markers */
  const runSyntaxCheck = useCallback(async (source: string) => {
    const issues = await checkSyntax(source);
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    if (model.getValue() !== source) return; // 检查期间代码又变了, 丢弃过期结果
    issueCountRef.current = issues.length;
    setIssueCount(issues.length);
    monaco.editor.setModelMarkers(model, "c-syntax", issues.map(toMarker(monaco)));
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      const v = value ?? "";
      setCode(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSyntaxCheck(v), 400);
    },
    [runSyntaxCheck],
  );

  // 卸载时清理 debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // @monaco-editor/react 创建编辑器时容器仍为 display:none,
    // Monaco 会测量到 0x0 并钳位为 5x5, ResizeObserver 自愈不可靠,
    // 挂载后分多次显式触发 layout
    const layout = () => editor.layout();
    requestAnimationFrame(layout);
    requestAnimationFrame(() => requestAnimationFrame(layout));
    window.setTimeout(layout, 300);
    // 初始代码也做一次语法检查
    runSyntaxCheck(editor.getValue());
  }, [runSyntaxCheck]);

  const handleSave = async () => {
    if (!onSave) {
      flashTip({ kind: "info", text: "保存功能未接入" });
      return;
    }
    const ok = await onSave(code);
    if (ok) {
      const t = new Date().toLocaleTimeString("zh-CN", { hour12: false });
      flashTip({ kind: "ok", text: `已保存 ${t}` });
    } else {
      flashTip({ kind: "err", text: "保存失败" });
    }
  };

  const handleJudge = async () => {
    if (!onJudge || judging) return;
    flashTip({ kind: "info", text: "正在判题…" });
    const ok = await onJudge(code);
    if (!ok) flashTip({ kind: "err", text: "判题失败" });
  };

  return (
    <div className="flex shrink-0 flex-col border-t border-border" style={{ height }}>
      {/* 工具栏 */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-[#252526] px-4 py-1.5">
        <span className="font-mono text-xs text-muted">{problem.code} · main.c</span>
        <div className="flex items-center gap-3">
          {/* 语法检查状态 */}
          <span
            className={`text-xs ${issueCount > 0 ? "text-danger" : "text-success"}`}
            title={issueCount > 0 ? "存在语法问题" : "语法检查通过"}
          >
            {issueCount > 0 ? `⚠ ${issueCount} 个语法问题` : "✓ 语法检查通过"}
          </span>
          {tip && <span className={`text-xs ${TIP_STYLE[tip.kind]}`}>{tip.text}</span>}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              title={maximized ? "还原代码区高度" : "展开代码区(占满可用高度)"}
              className="rounded border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              {maximized ? "⤡ 还原" : "⤢ 全屏代码"}
            </button>
          )}
          <button
            onClick={handleSave}
            className="rounded bg-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#0e8ae0]"
          >
            保存代码
          </button>
          {onOpenRun && (
            <button
              onClick={() => onOpenRun(code)}
              className="rounded border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              ▶ 运行
            </button>
          )}
          {onJudge && (
            <button
              onClick={handleJudge}
              disabled={judging}
              className="rounded border border-accent px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {judging ? "判题中…" : "提交判题"}
            </button>
          )}
        </div>
      </div>
      {/* 编辑器 */}
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="c"
          theme="vs-dark"
          value={code}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            fontSize: 14,
            fontFamily: "'Cascadia Code', Consolas, 'Courier New', monospace",
            minimap: { enabled: false },
            lineNumbers: "on",
            tabSize: 4,
            insertSpaces: true,
            autoIndent: "full",
            wordWrap: "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderLineHighlight: "all",
            bracketPairColorization: { enabled: true },
            padding: { top: 12 },
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          }}
        />
      </div>
    </div>
  );
}

/** SyntaxIssue -> Monaco marker */
function toMarker(monaco: Parameters<OnMount>[1]) {
  return (issue: SyntaxIssue) => ({
    severity: monaco.MarkerSeverity.Error,
    message: issue.message,
    startLineNumber: issue.row + 1,
    startColumn: issue.col + 1,
    endLineNumber: issue.endRow + 1,
    endColumn: Math.max(issue.endCol + 1, issue.col + 2),
  });
}
