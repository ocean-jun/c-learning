import { NextResponse } from "next/server";
import { getProblemById } from "@/lib/db";

/** GET /api/problems/[id] — 单题详情 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const problemId = Number(id);
  if (!Number.isInteger(problemId) || problemId <= 0) {
    return NextResponse.json({ error: "无效的题目 id" }, { status: 400 });
  }
  const problem = getProblemById(problemId);
  if (!problem) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }
  return NextResponse.json({ problem });
}
