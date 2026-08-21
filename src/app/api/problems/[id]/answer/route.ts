import { NextResponse } from "next/server";
import { getProblemAnswer, getProblemById } from "@/lib/db";

/** GET /api/problems/[id]/answer — 参考答案代码 */
export async function GET(
  _request: Request,
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

  const answer = getProblemAnswer(problemId);
  return NextResponse.json({ answer });
}
