import { NextResponse } from "next/server";
import { getProblemById, listSubmissions, saveSubmission } from "@/lib/db";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** GET /api/problems/[id]/submissions — 某题提交记录(时间倒序) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const problemId = parseId(id);
  if (problemId === null) {
    return NextResponse.json({ error: "无效的题目 id" }, { status: 400 });
  }
  return NextResponse.json({ submissions: listSubmissions(problemId) });
}

/** POST /api/problems/[id]/submissions — 保存代码(写 submissions + 更新 progress) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const problemId = parseId(id);
  if (problemId === null) {
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

  const { submission, problem } = saveSubmission(problemId, code);
  return NextResponse.json({ submission, problem }, { status: 201 });
}
