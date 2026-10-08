import { NextResponse } from "next/server";
import { getProblemById, saveSubmission, setProblemStatus, updateSubmissionStatus } from "@/lib/db";
import { judgeC } from "@/lib/judge";

/**
 * POST /api/problems/[id]/judge — 提交判题
 *
 * 流程: 保存代码(写入提交记录) → 编译运行 → 比对样例输出
 *  - accepted      → 题目状态自动置为「已完成」
 *  - 其他结果       → 保持「进行中」(已完成不回退), 判题状态写入该次提交
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
  const problem = getProblemById(problemId);
  if (!problem) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : null;
  if (code === null || code.trim() === "") {
    return NextResponse.json({ error: "代码不能为空" }, { status: 400 });
  }

  // 1. 保存本次提交
  const { submission, problem: savedProblem } = saveSubmission(problemId, code);

  // 2. 判题
  const result = await judgeC(code, problem.sampleInput, problem.sampleOutput, problem.checker);

  // 3. 记录判题状态到本次提交
  updateSubmissionStatus(submission.id, result.status);

  // 4. 通过则自动标记「已完成」(仅当当前不是已完成时)
  let problemAfter = savedProblem;
  if (result.status === "accepted" && savedProblem.status !== "done") {
    const updated = setProblemStatus(problemId, "done");
    if (updated) problemAfter = updated;
  }

  return NextResponse.json({
    result,
    submission: { ...submission, status: result.status },
    problem: problemAfter,
  });
}
