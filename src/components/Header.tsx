import Link from "next/link";

/** 全局顶栏 */
export default function Header({ current }: { current: "home" | "problem" }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-[#252526] px-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-accent font-mono text-xs font-bold text-white">
          C
        </span>
        <span className="text-sm font-semibold tracking-tight">C-Learning-Lab</span>
        <span className="text-xs text-muted">翁恺C语言刷题系统</span>
      </Link>
      {current === "problem" && (
        <Link
          href="/"
          className="rounded border border-border px-3 py-1 text-xs text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        >
          ← 返回首页
        </Link>
      )}
    </header>
  );
}
