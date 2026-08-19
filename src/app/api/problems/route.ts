import { NextResponse } from "next/server";
import { listProblems } from "@/lib/db";

/** GET /api/problems — 全部题目(含学习状态), 按章节、编号排序 */
export async function GET() {
  return NextResponse.json({ problems: listProblems() });
}
