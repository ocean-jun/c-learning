import { NextResponse } from "next/server";
import { getStats } from "@/lib/db";

/** GET /api/stats — Dashboard 总览统计(总题数/已完成/完成率/章节统计/最近练习) */
export async function GET() {
  return NextResponse.json({ stats: getStats() });
}
