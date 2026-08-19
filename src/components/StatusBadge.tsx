import type { ProblemStatus } from "@/lib/types";

const STYLES: Record<ProblemStatus, string> = {
  todo: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
  doing: "border-yellow-800 bg-yellow-900/40 text-yellow-400",
  done: "border-green-800 bg-green-900/40 text-green-400",
};

const LABELS: Record<ProblemStatus, string> = {
  todo: "未开始",
  doing: "进行中",
  done: "已完成",
};

/** 做题状态徽章 */
export default function StatusBadge({ status }: { status: ProblemStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}
