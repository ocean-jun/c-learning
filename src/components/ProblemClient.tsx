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
  /** 最近一次保存的代码(重新打开题目时恢复编辑器内容) */
  lastCode?: string;
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
  lastCode,
}: Props) {
  const [problems, setProblems] = useState(initialProblems);
  const [problem, setProblem] = useState(initialProblem);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [judging, setJudging] = useState(false);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  /** 左侧题目栏展开状态 */
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      {/* 左栏: 题目列表(宽度 240px ↔ 0 平滑过渡) */}
      <div
        className={`relative h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarOpen ? "w-60" : "w-0"
        }`}
      >
        <div className="h-full w-60">
          <ProblemList
            problems={problems}
            currentId={problem.id}
            onCollapse={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* 折叠后: 左侧浮动展开按钮 */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          title="展开题目列表"
          aria-label="展开题目列表"
          className="animate-fade-in absolute left-1.5 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-[#2d2d30] p-2 text-muted shadow-lg shadow-black/40 hover:text-foreground hover:shadow-black/60"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 4 L11 8 L7 12" />
            <path d="M3 4 L7 8 L3 12" />
          </svg>
        </button>
      )}

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
        <CodeEditor
          problem={problem}
          initialCode={lastCode}
          onSave={handleSave}
          onJudge={handleJudge}
          judging={judging}
        />
        <JudgeResultPanel result={judgeResult} judging={judging} />
      </div>
      <SubmissionList submissions={submissions} />
    </div>
  );
}
