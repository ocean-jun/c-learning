import { NextResponse } from "next/server";
import { getProblemById } from "@/lib/db";
import { compileAndRun } from "@/lib/judge";

/**
 * POST /api/problems/[id]/run — 自定义输入运行(调试用, 不比对输出、不写提交记录)
 * body: { code: string, input: string }
 */
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
  const code = typeof body?.code === "string" ? body.code : null;
  if (code === null || code.trim() === "") {
    return NextResponse.json({ error: "代码不能为空" }, { status: 400 });
  }
  const input = typeof body?.input === "string" ? body.input : "";

  const result = await compileAndRun(code, input);
  return NextResponse.json({ result });
}
