import type { JudgeResult } from "@/lib/types";

interface Props {
  result: JudgeResult | null;
  judging: boolean;
}

const STATUS_VIEW: Record<
  string,
  { label: string; cls: string }
> = {
  accepted: { label: "✓ 通过", cls: "text-success" },
  wrong_answer: { label: "✗ 答案错误", cls: "text-danger" },
  compile_error: { label: "编译错误", cls: "text-warning" },
  timeout: { label: "运行超时（可能死循环）", cls: "text-warning" },
  runtime_error: { label: "运行错误", cls: "text-warning" },
  no_compiler: { label: "未找到编译器", cls: "text-muted" },
};

/** 判题结果面板(编辑器下方) */
export default function JudgeResultPanel({ result, judging }: Props) {
  if (judging) {
    return (
      <div className="shrink-0 border-t border-border bg-[#252526] px-4 py-3">
        <p className="text-xs text-muted">⏳ 正在判题：编译并运行你的代码…</p>
      </div>
    );
  }
  if (!result) return null;

  const view = STATUS_VIEW[result.status] ?? { label: result.status, cls: "text-muted" };

  return (
    <div className="animate-item-in shrink-0 border-t border-border bg-[#252526] px-4 py-3">
      <p className={`mb-2 text-sm font-semibold ${view.cls}`}>{view.label}</p>

      {result.message && (
        <p className="mb-2 text-xs text-muted">{result.message}</p>
      )}

      {result.status === "compile_error" && result.compileError && (
        <pre className="max-h-40 overflow-auto rounded-md border border-border bg-[#1a1a1a] p-3 font-mono text-xs leading-5 text-danger">
          {result.compileError}
        </pre>
      )}

      {(result.status === "wrong_answer" || result.status === "accepted") && (
        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <p className="mb-1 text-muted">你的输出</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-[#1a1a1a] p-3 font-mono leading-5">
              {result.output || "(无输出)"}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-muted">期望输出</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-[#1a1a1a] p-3 font-mono leading-5">
              {result.expectedOutput || "(无)"}
            </pre>
          </div>
        </div>
      )}

      {result.status === "runtime_error" && result.output && (
        <pre className="max-h-40 overflow-auto rounded-md border border-border bg-[#1a1a1a] p-3 font-mono text-xs leading-5 text-danger">
          {result.output}
        </pre>
      )}

      {result.status === "no_compiler" && (
        <p className="text-xs text-muted">
          未检测到 C 编译器（需要 tools/tcc 目录或系统 gcc）。
        </p>
      )}
    </div>
  );
}
