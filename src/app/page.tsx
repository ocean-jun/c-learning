/**
 * C-Learning-Lab 首页 Dashboard
 * 学习进度总览 + 左侧章节导航
 */
import { getStats, listProblems } from "@/lib/db";
import Header from "@/components/Header";
import ChapterNav from "@/components/ChapterNav";

// 数据来自本地 SQLite, 每次请求实时读取(题库/进度会变化)
export const dynamic = "force-dynamic";

export default function Home() {
  const stats = getStats();
  const problems = listProblems();

  return (
    <div className="flex h-screen flex-col">
      <Header current="home" />
      <div className="flex min-h-0 flex-1">
        <ChapterNav chapters={stats.chapters} problems={problems} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-8 py-8">
            <h1 className="mb-1 text-2xl font-semibold">C语言学习进度</h1>
            <p className="mb-6 text-sm text-muted">
              配套翁恺《C语言程序设计》课程 · 数据保存在本机
            </p>

            {/* 统计卡片 */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-[#252526] p-4">
                <p className="text-xs text-muted">总题数</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{stats.total}</p>
              </div>
              <div className="rounded-lg border border-border bg-[#252526] p-4">
                <p className="text-xs text-muted">已完成</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-success">
                  {stats.done}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-[#252526] p-4">
                <p className="text-xs text-muted">完成率</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">
                  {stats.completionRate}%
                </p>
              </div>
            </div>

            {/* 总体进度条 */}
            <div className="mb-6 rounded-lg border border-border bg-[#252526] p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted">总体进度</span>
                <span className="tabular-nums text-muted">
                  {stats.done} / {stats.total}
                  {stats.doing > 0 && ` · 进行中 ${stats.doing}`}
                  {stats.todo > 0 && ` · 未开始 ${stats.todo}`}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{
                    width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* 最近练习 */}
            <div className="mb-6 rounded-lg border border-border bg-[#252526] p-4">
              <h2 className="mb-2 text-sm font-semibold">最近练习</h2>
              {stats.recent ? (
                <a
                  href={`/problems/${problems.find((p) => p.code === stats.recent!.code)?.id ?? ""}`}
                  className="flex items-center justify-between rounded-md bg-[#1a1a1a] px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <span className="font-mono text-sm">
                    <span className="mr-2 text-muted">{stats.recent.code}</span>
                    {stats.recent.title}
                  </span>
                  <span className="text-xs text-muted">{stats.recent.submitTime}</span>
                </a>
              ) : (
                <p className="rounded-md bg-[#1a1a1a] px-4 py-3 text-sm text-muted">
                  还没有练习记录，去左侧选择一道题开始吧
                </p>
              )}
            </div>

            {/* 章节进度列表 */}
            <div className="rounded-lg border border-border bg-[#252526] p-4">
              <h2 className="mb-3 text-sm font-semibold">章节进度</h2>
              <ul className="space-y-3">
                {stats.chapters.map((ch) => {
                  const pct = ch.total > 0 ? Math.round((ch.done / ch.total) * 100) : 0;
                  return (
                    <li key={ch.chapter} className="flex items-center gap-4">
                      <span className="w-14 shrink-0 text-sm">第{ch.chapter}章</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted">
                        {ch.done}/{ch.total}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
