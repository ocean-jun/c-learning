import { useState } from "react";
import type { ProblemWithStatus } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface Props {
  problem: ProblemWithStatus;
  /** 头部操作区(如"标记已完成"按钮) */
  actions?: React.ReactNode;
  /** 参考答案代码(非空时展示答案区块) */
  answer?: string | null;
  /** 是否正在加载答案 */
  answerLoading?: boolean;
}

/** 题目描述区 */
export default function ProblemDescription({
  problem,
  actions,
  answer,
  answerLoading,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">
          <span className="mr-2 font-mono text-base text-muted">{problem.code}</span>
          {problem.title}
        </h1>
        <StatusBadge status={problem.status} />
        <span className="text-xs text-muted">
          提交 {problem.submitCount} 次
          {problem.lastSubmitTime && ` · 最近 ${problem.lastSubmitTime}`}
        </span>
        {actions}
      </div>

      {problem.description && (
        <section className="mb-5">
          <h2 className="mb-1.5 text-sm font-semibold text-accent">题目描述</h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {problem.description}
          </p>
        </section>
      )}

      {problem.input && (
        <section className="mb-5">
          <h2 className="mb-1.5 text-sm font-semibold text-accent">输入格式</h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {problem.input}
          </p>
        </section>
      )}

      {problem.output && (
        <section className="mb-5">
          <h2 className="mb-1.5 text-sm font-semibold text-accent">输出格式</h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {problem.output}
          </p>
        </section>
      )}

      {(problem.sampleInput || problem.sampleOutput) && (
        <section className="mb-2 grid max-w-2xl gap-4 sm:grid-cols-2">
          {problem.sampleInput && (
            <div>
              <h2 className="mb-1.5 text-sm font-semibold text-accent">样例输入</h2>
              <pre className="overflow-x-auto rounded-md border border-border bg-[#1a1a1a] p-3 font-mono text-xs leading-5">
                {problem.sampleInput}
              </pre>
            </div>
          )}
          {problem.sampleOutput && (
            <div>
              <h2 className="mb-1.5 text-sm font-semibold text-accent">样例输出</h2>
              <pre className="overflow-x-auto rounded-md border border-border bg-[#1a1a1a] p-3 font-mono text-xs leading-5">
                {problem.sampleOutput}
              </pre>
            </div>
          )}
        </section>
      )}

      {/* 参考答案 */}
      {answer !== undefined && answer !== null && (
        <section className="animate-item-in mt-5 max-w-2xl">
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-warning">参考答案</h2>
            {answer && (
              <button
                onClick={handleCopy}
                className="rounded border border-border px-2 py-0.5 text-xs text-muted hover:bg-white/5 hover:text-foreground"
              >
                {copied ? "已复制 ✓" : "复制"}
              </button>
            )}
          </div>
          {answerLoading ? (
            <div className="rounded-md border border-border bg-[#1a1a1a] p-3 text-xs text-muted">
              加载中…
            </div>
          ) : answer ? (
            <pre className="overflow-x-auto rounded-md border border-border bg-[#1a1a1a] p-3 font-mono text-xs leading-5">
              {answer}
            </pre>
          ) : (
            <div className="rounded-md border border-border bg-[#1a1a1a] p-3 text-xs text-muted">
              本题暂无参考答案
            </div>
          )}
        </section>
      )}
    </div>
  );
}
