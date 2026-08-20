import type { Submission } from "@/lib/types";

interface Props {
  submissions: Submission[];
}

const STATUS_VIEW: Record<string, { label: string; cls: string }> = {
  accepted: { label: "通过", cls: "text-success" },
  wrong_answer: { label: "答案错误", cls: "text-danger" },
  compile_error: { label: "编译错误", cls: "text-warning" },
  timeout: { label: "超时", cls: "text-warning" },
  runtime_error: { label: "运行错误", cls: "text-warning" },
};

/** 题目页右栏: 提交记录 */
export default function SubmissionList({ submissions }: Props) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-l border-border bg-[#252526]">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">提交记录</h2>
        <p className="mt-0.5 text-xs text-muted">共 {submissions.length} 次</p>
      </div>
      {submissions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-xs text-muted">
          <span className="text-2xl">📝</span>
          <p>暂无提交记录</p>
          <p>保存代码或提交判题后，记录会显示在这里</p>
        </div>
      ) : (
        <ul className="flex-1 py-1">
          {submissions.map((s, i) => {
            const view = s.status ? STATUS_VIEW[s.status] : null;
            return (
              <li
                key={s.id}
                className="animate-item-in border-b border-border/50 px-4 py-2.5 last:border-b-0"
                style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">第 {submissions.length - i} 次提交</span>
                  <span className="font-mono text-muted">{s.submitTime}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {view ? (
                    <span className={`text-xs font-medium ${view.cls}`}>
                      {view.label}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">已保存（未判题）</span>
                  )}
                </div>
                <pre className="mt-1.5 max-h-24 overflow-hidden rounded bg-[#1a1a1a] p-2 font-mono text-[11px] leading-4 text-foreground/70">
                  {s.code}
                </pre>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
