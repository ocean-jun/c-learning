"use client";

import { useState } from "react";
import type { RunResult } from "@/lib/types";

interface Props {
  /** 样例输入(预填) */
  sampleInput: string;
  /** 是否正在运行 */
  running: boolean;
  /** 执行运行 */
  onRun: (input: string) => Promise<RunResult | null>;
  /** 关闭面板 */
  onClose: () => void;
}

/**
 * 自定义输入运行面板
 * 输入测试数据 → 编译运行 → 查看输出(不比对、不写提交记录)
 */
export default function RunPanel({ sampleInput, running, onRun, onClose }: Props) {
  const [input, setInput] = useState(sampleInput);
  const [result, setResult] = useState<RunResult | null>(null);
  const [ran, setRan] = useState(false);

  const handleRun = async () => {
    setRan(false);
    const r = await onRun(input);
    setResult(r);
    setRan(true);
  };

  return (
    <div className="animate-item-in shrink-0 border-t border-border bg-[#252526] px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted">▶ 自定义输入运行（调试）</p>
        <button
          onClick={onClose}
          className="rounded px-1.5 text-xs text-muted hover:bg-white/10 hover:text-foreground"
          aria-label="关闭运行面板"
        >
          ✕
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* 输入 */}
        <div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="输入测试数据，例如：3 2"
            className="h-24 w-full resize-y rounded-md border border-border bg-[#1a1a1a] p-2.5 font-mono text-xs leading-5 text-foreground outline-none placeholder:text-zinc-600 focus:border-accent"
          />
          <button
            onClick={handleRun}
            disabled={running}
            className="mt-2 rounded border border-accent px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "运行中…" : "▶ 运行"}
          </button>
        </div>

        {/* 输出 */}
        <div>
          {!ran && !running ? (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted">
              点击「运行」后显示输出
            </div>
          ) : result ? (
            result.ok ? (
              <pre className="h-24 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-[#1a1a1a] p-2.5 font-mono text-xs leading-5">
                {result.output || "(无输出)"}
              </pre>
            ) : result.compileError ? (
              <pre className="h-24 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-[#1a1a1a] p-2.5 font-mono text-xs leading-5 text-danger">
                {result.compileError}
              </pre>
            ) : result.timedOut ? (
              <div className="flex h-24 items-center justify-center rounded-md border border-border bg-[#1a1a1a] text-xs text-warning">
                ⏱ 运行超时（可能死循环）
              </div>
            ) : (
              <pre className="h-24 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-[#1a1a1a] p-2.5 font-mono text-xs leading-5 text-danger">
                {result.error}
              </pre>
            )
          ) : (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted">
              正在编译运行…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
