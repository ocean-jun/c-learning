import Link from "next/link";
import type { ProblemWithStatus } from "@/lib/types";

const DOT: Record<ProblemWithStatus["status"], string> = {
  todo: "bg-zinc-600",
  doing: "bg-yellow-500",
  done: "bg-green-500",
};

interface Props {
  problems: ProblemWithStatus[];
  currentId: number;
  /** 折叠左栏(收起按钮) */
  onCollapse?: () => void;
}

/** 题目页左栏: 按章节分组的题目列表 */
export default function ProblemList({ problems, currentId, onCollapse }: Props) {
  const groups = new Map<number, ProblemWithStatus[]>();
  for (const p of problems) {
    if (!groups.has(p.chapter)) groups.set(p.chapter, []);
    groups.get(p.chapter)!.push(p);
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-[#252526]">
      <div className="flex items-center justify-between border-b border-border py-2 pl-4 pr-2">
        <h2 className="text-sm font-semibold">题目列表</h2>
        {onCollapse && (
          <button
            onClick={onCollapse}
            title="收起题目列表"
            aria-label="收起题目列表"
            className="rounded p-1 text-muted hover:bg-white/10 hover:text-foreground"
          >
            {/* 双左箭头 */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 4 L5 8 L9 12" />
              <path d="M13 4 L9 8 L13 12" />
            </svg>
          </button>
        )}
      </div>
      {[...groups.entries()].map(([chapter, list]) => {
        const done = list.filter((p) => p.status === "done").length;
        return (
          <div key={chapter} className="py-1">
            <div className="sticky top-0 flex items-center justify-between bg-[#252526] px-4 py-1.5 text-xs text-muted">
              <span>第{chapter}章</span>
              <span className="tabular-nums">
                {done}/{list.length}
              </span>
            </div>
            <ul>
              {list.map((p) => {
                const active = p.id === currentId;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/problems/${p.id}`}
                      // 从列表进入题目 = 前进导航, 触发向右滑动过渡
                      transitionTypes={["nav-forward"]}
                      className={`flex items-center gap-2 px-4 py-1.5 text-sm ${
                        active
                          ? "bg-accent/20 text-white"
                          : "text-foreground/80 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300 ${DOT[p.status]}`}
                      />
                      <span className="shrink-0 font-mono text-xs text-muted">{p.code}</span>
                      <span className="truncate">{p.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </aside>
  );
}
