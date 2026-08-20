import Link from "next/link";
import type { ChapterStat, ProblemWithStatus } from "@/lib/types";

interface Props {
  chapters: ChapterStat[];
  /** 用于计算每章第一题跳转链接 */
  problems: ProblemWithStatus[];
}

/** 左侧章节导航 (Dashboard) */
export default function ChapterNav({ chapters, problems }: Props) {
  return (
    <nav className="flex h-full w-60 flex-col overflow-y-auto border-r border-border bg-[#252526]">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">翁恺C语言课程</h2>
        <p className="mt-0.5 text-xs text-muted">共 {problems.length} 题</p>
      </div>
      <ul className="flex-1 py-2">
        {chapters.map((ch) => {
          const first = problems.find((p) => p.chapter === ch.chapter);
          const progress = ch.total > 0 ? Math.round((ch.done / ch.total) * 100) : 0;
          const item = (
            <div className="flex w-full flex-col gap-1.5 px-4 py-2.5 transition-colors hover:bg-white/5">
              <div className="flex items-center justify-between">
                <span className="text-sm">第{ch.chapter}章</span>
                <span className="text-xs tabular-nums text-muted">
                  {ch.done}/{ch.total}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
          return (
            <li key={ch.chapter}>
              {first ? (
                <Link
                  href={`/problems/${first.id}`}
                  // 从章节进入题目 = 前进导航
                  transitionTypes={["nav-forward"]}
                  className="block"
                >
                  {item}
                </Link>
              ) : (
                item
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
