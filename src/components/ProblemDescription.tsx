import type { ProblemWithStatus } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface Props {
  problem: ProblemWithStatus;
  /** 头部操作区(如"标记已完成"按钮) */
  actions?: React.ReactNode;
}

/** 题目描述区 */
export default function ProblemDescription({ problem, actions }: Props) {
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
    </div>
  );
}
