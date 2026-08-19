"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { JudgeResult, ProblemWithStatus, Submission } from "@/lib/types";
import ProblemList from "./ProblemList";
import ProblemDescription from "./ProblemDescription";
import SubmissionList from "./SubmissionList";
import JudgeResultPanel from "./JudgeResultPanel";

// Monaco 依赖浏览器 API(window), 只能在客户端加载, SSR 时渲染占位
const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 shrink-0 flex-col border-t border-border">
      <div className="flex items-center justify-between border-b border-border bg-[#252526] px-4 py-1.5">
        <span className="font-mono text-xs text-muted">main.c</span>
        <span className="rounded bg-accent px-3 py-1 text-xs font-medium text-white">
          保存代码
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center bg-[#1e1e1e] text-sm text-muted">
        正在加载编辑器…
      </div>
    </div>
  ),
});

interface Props {
  problems: ProblemWithStatus[];
  problem: ProblemWithStatus;
  submissions: Submission[];
}

/**
 * 题目页交互工作区(客户端)
 * - 保存代码: POST submissions, 本地即时更新提交记录与题目状态
 * - 提交判题: POST judge, 编译运行比对, 展示结果面板
 * - 标记完成: POST progress, 更新状态徽章
 */
export default function ProblemClient({
  problems: initialProblems,
  problem: initialProblem,
  submissions: initialSubmissions,
}: Props) {
  const [problems, setProblems] = useState(initialProblems);
  const [problem, setProblem] = useState(initialProblem);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [judging, setJudging] = useState(false);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);

  /** 保存代码: 返回是否成功, 供编辑器显示提示 */
  const handleSave = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/problems/${problem.id}/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setSubmissions((s) => [data.submission, ...s]);
        setProblem(data.problem);
        setProblems((ps) => ps.map((p) => (p.id === data.problem.id ? data.problem : p)));
        return true;
      } catch {
        return false;
      }
    },
    [problem.id],
  );

  /** 提交判题: 保存代码 + 编译运行比对, 返回是否成功 */
  const handleJudge = useCallback(
    async (code: string): Promise<boolean> => {
      setJudging(true);
      try {
        const res = await fetch(`/api/problems/${problem.id}/judge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setJudgeResult(data.result);
        setSubmissions((s) => [data.submission, ...s]);
        setProblem(data.problem);
        setProblems((ps) => ps.map((p) => (p.id === data.problem.id ? data.problem : p)));
        return true;
      } catch {
        return false;
      } finally {
        setJudging(false);
      }
    },
    [problem.id],
  );

  /** 切换 已完成 <-> 进行中 */
  const handleToggleDone = useCallback(async () => {
    const next: "done" | "doing" = problem.status === "done" ? "doing" : "done";
    try {
      const res = await fetch(`/api/problems/${problem.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setProblem(data.problem);
      setProblems((ps) => ps.map((p) => (p.id === data.problem.id ? data.problem : p)));
    } catch {
      // 静默失败, 下次操作重试
    }
  }, [problem]);

  return (
    <div className="flex min-h-0 flex-1">
      <ProblemList problems={problems} currentId={problem.id} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProblemDescription
          problem={problem}
          actions={
            <button
              onClick={handleToggleDone}
              className={`rounded border px-3 py-1 text-xs font-medium transition-colors ${
                problem.status === "done"
                  ? "border-yellow-800 text-yellow-400 hover:bg-yellow-900/30"
                  : "border-green-800 text-green-400 hover:bg-green-900/30"
              }`}
            >
              {problem.status === "done" ? "标记为进行中" : "标记已完成"}
            </button>
          }
        />
        <CodeEditor problem={problem} onSave={handleSave} onJudge={handleJudge} judging={judging} />
        <JudgeResultPanel result={judgeResult} judging={judging} />
      </div>
      <SubmissionList submissions={submissions} />
    </div>
  );
}
