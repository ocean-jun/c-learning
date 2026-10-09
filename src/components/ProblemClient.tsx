"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { JudgeResult, ProblemWithStatus, RunResult, Submission } from "@/lib/types";
import ProblemList from "./ProblemList";
import ProblemDescription from "./ProblemDescription";
import SubmissionList from "./SubmissionList";
import JudgeResultPanel from "./JudgeResultPanel";
import RunPanel from "./RunPanel";
import Splitter from "./Splitter";

/** 布局偏好本地存储 key */
const LAYOUT_KEY = "clab.layout.v1";
const DEFAULT_EDITOR_HEIGHT = 320;
const DEFAULT_SIDE_WIDTH = 256;
const MIN_EDITOR_HEIGHT = 160;
/** 题目描述区至少保留的高度(px) */
const MIN_DESC_HEIGHT = 140;
const MIN_SIDE_WIDTH = 180;
const MAX_SIDE_WIDTH = 560;

/** 读取本地保存的布局偏好 */
function readLayout(): { editorHeight: number; sideWidth: number } {
  const fallback = { editorHeight: DEFAULT_EDITOR_HEIGHT, sideWidth: DEFAULT_SIDE_WIDTH };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return fallback;
    const v = JSON.parse(raw) as { editorHeight?: unknown; sideWidth?: unknown };
    return {
      editorHeight: typeof v.editorHeight === "number" ? v.editorHeight : fallback.editorHeight,
      sideWidth: typeof v.sideWidth === "number" ? v.sideWidth : fallback.sideWidth,
    };
  } catch {
    return fallback;
  }
}

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
  /** 自定义输入运行面板 */
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [running, setRunning] = useState(false);
  /** 运行面板使用的当前编辑器代码 */
  const runCodeRef = useRef("");
  /** 参考答案 */
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);

  /* ---- 可调节布局: 代码区高度 / 右栏宽度 ---- */
  const [editorHeight, setEditorHeight] = useState(DEFAULT_EDITOR_HEIGHT);
  const [sideWidth, setSideWidth] = useState(DEFAULT_SIDE_WIDTH);
  const [colHeight, setColHeight] = useState(0);
  const [bottomHeight, setBottomHeight] = useState(0);
  const colRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /** 代码区允许的最大高度: 中间栏高度 - 描述区最小高度 - 下方面板高度 */
  const maxEditorHeight = Math.max(
    MIN_EDITOR_HEIGHT,
    (colHeight || 620) - MIN_DESC_HEIGHT - bottomHeight,
  );
  const clampEditorHeight = useCallback(
    (h: number) => Math.min(Math.max(Math.round(h), MIN_EDITOR_HEIGHT), maxEditorHeight),
    [maxEditorHeight],
  );
  const clampSideWidth = useCallback(
    (w: number) => Math.min(Math.max(Math.round(w), MIN_SIDE_WIDTH), MAX_SIDE_WIDTH),
    [],
  );

  /** 展开前的代码区高度, 用于「还原」 */
  const prevEditorHeightRef = useRef(DEFAULT_EDITOR_HEIGHT);
  const maximized = editorHeight >= maxEditorHeight - 4;
  const handleToggleMaximize = useCallback(() => {
    if (editorHeight >= maxEditorHeight - 4) {
      setEditorHeight(clampEditorHeight(prevEditorHeightRef.current));
    } else {
      prevEditorHeightRef.current = editorHeight;
      setEditorHeight(maxEditorHeight);
    }
  }, [clampEditorHeight, editorHeight, maxEditorHeight]);

  /* 首次挂载: 恢复上次的布局 */
  useEffect(() => {
    const saved = readLayout();
    setEditorHeight((h) => (saved.editorHeight === DEFAULT_EDITOR_HEIGHT ? h : saved.editorHeight));
    setSideWidth(saved.sideWidth);
  }, []);

  /* 布局变化后持久化(节流, 避免拖动时频繁写入) */
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(LAYOUT_KEY, JSON.stringify({ editorHeight, sideWidth }));
      } catch {
        /* 隐私模式等场景忽略 */
      }
    }, 200);
    return () => window.clearTimeout(id);
  }, [editorHeight, sideWidth]);

  /* 测量中间栏与下方面板的真实高度, 用于钳制 */
  useEffect(() => {
    const col = colRef.current;
    if (!col) return;
    const bottom = bottomRef.current;
    const measure = () => {
      setColHeight(col.clientHeight);
      setBottomHeight(bottom ? bottom.clientHeight : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(col);
    if (bottom) ro.observe(bottom);
    return () => ro.disconnect();
  }, [runPanelOpen, judgeResult]);

  /* 窗口/面板尺寸变化时, 自动把代码区高度收回可用范围 */
  useEffect(() => {
    setEditorHeight((h) => clampEditorHeight(h));
  }, [clampEditorHeight]);

  /* 快捷键: Ctrl/Cmd + Shift + ↑/↓ 快速伸缩代码区 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const dir = e.key === "ArrowUp" ? 1 : -1;
      setEditorHeight((h) => clampEditorHeight(h + dir * 80));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clampEditorHeight]);

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

  /** 自定义输入运行: 编译运行但不比对、不写记录 */
  const handleRun = useCallback(
    async (input: string) => {
      setRunning(true);
      try {
        const res = await fetch(`/api/problems/${problem.id}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: runCodeRef.current, input }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.result as RunResult | null;
      } catch {
        return null;
      } finally {
        setRunning(false);
      }
    },
    [problem.id],
  );

  /** 切换参考答案显示(首次展开时加载) */
  const handleToggleAnswer = useCallback(async () => {
    if (answerOpen) {
      setAnswerOpen(false);
      return;
    }
    setAnswerOpen(true);
    if (answer === null) {
      setAnswerLoading(true);
      try {
        const res = await fetch(`/api/problems/${problem.id}/answer`);
        if (res.ok) {
          const data = await res.json();
          setAnswer(data.answer || "");
        } else {
          setAnswer("");
        }
      } catch {
        setAnswer("");
      } finally {
        setAnswerLoading(false);
      }
    }
  }, [answerOpen, answer, problem.id]);

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

      <div className="flex min-w-0 flex-1 flex-col" ref={colRef}>
        <ProblemDescription
          problem={problem}
          answer={answerOpen ? answer : undefined}
          answerLoading={answerLoading}
          actions={
            <>
              <button
                onClick={handleToggleAnswer}
                className="rounded border border-warning/50 px-3 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/10"
              >
                {answerOpen ? "收起答案" : "查看答案"}
              </button>
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
            </>
          }
        />

        {/* 分割条: 上下拖动调整代码区高度(描述区同步变化) */}
        <Splitter
          orientation="horizontal"
          label="拖动调整代码区高度"
          onDrag={(delta) => setEditorHeight((h) => clampEditorHeight(h - delta))}
          onReset={() => setEditorHeight(DEFAULT_EDITOR_HEIGHT)}
        />

        <CodeEditor
          problem={problem}
          initialCode={lastCode}
          height={editorHeight}
          onToggleMaximize={handleToggleMaximize}
          maximized={maximized}
          onSave={handleSave}
          onJudge={handleJudge}
          judging={judging}
          onOpenRun={(code) => {
            runCodeRef.current = code;
            setRunPanelOpen(true);
          }}
        />

        <div ref={bottomRef} className="shrink-0">
          {runPanelOpen && (
            <RunPanel
              sampleInput={problem.sampleInput}
              running={running}
              onRun={handleRun}
              onClose={() => setRunPanelOpen(false)}
            />
          )}
          <JudgeResultPanel result={judgeResult} judging={judging} />
        </div>
      </div>

      {/* 分割条: 左右拖动调整提交记录栏宽度 */}
      <Splitter
        orientation="vertical"
        label="拖动调整提交记录栏宽度"
        onDrag={(delta) => setSideWidth((w) => clampSideWidth(w - delta))}
        onReset={() => setSideWidth(DEFAULT_SIDE_WIDTH)}
      />
      <SubmissionList submissions={submissions} width={sideWidth} />
    </div>
  );
}
