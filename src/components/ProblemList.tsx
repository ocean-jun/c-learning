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
}

/** 题目页左栏: 按章节分组的题目列表 */
export default function ProblemList({ problems, currentId }: Props) {
  const groups = new Map<number, ProblemWithStatus[]>();
  for (const p of problems) {
    if (!groups.has(p.chapter)) groups.set(p.chapter, []);
    groups.get(p.chapter)!.push(p);
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-[#252526]">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">题目列表</h2>
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
                      className={`flex items-center gap-2 px-4 py-1.5 text-sm transition-colors ${
                        active
                          ? "bg-accent/20 text-white"
                          : "text-foreground/80 hover:bg-white/5"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[p.status]}`} />
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
