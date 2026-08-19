import { NextResponse } from "next/server";
import { getProblemById, setProblemStatus } from "@/lib/db";
import type { ProblemStatus } from "@/lib/types";

const VALID: ProblemStatus[] = ["todo", "doing", "done"];

/** POST /api/problems/[id]/progress — 手动设置做题状态(已完成/进行中) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const problemId = Number(id);
  if (!Number.isInteger(problemId) || problemId <= 0) {
    return NextResponse.json({ error: "无效的题目 id" }, { status: 400 });
  }
  if (!getProblemById(problemId)) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status as ProblemStatus;
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "无效的状态, 可选: todo/doing/done" }, { status: 400 });
  }

  const problem = setProblemStatus(problemId, status);
  return NextResponse.json({ problem });
}
