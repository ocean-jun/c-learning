/**
 * 题目页: LeetCode + VS Code 风格三栏布局
 * 左: 题目列表 | 中: 题目描述 + 代码编辑器 | 右: 提交记录
 * 数据由服务端读取, 交互由 ProblemClient 负责(保存/标记状态)
 */
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { getProblemById, listProblems, listSubmissions } from "@/lib/db";
import Header from "@/components/Header";
import ProblemClient from "@/components/ProblemClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProblemPage({ params }: Props) {
  const { id } = await params;
  const problemId = Number(id);
  const problem = Number.isInteger(problemId) ? getProblemById(problemId) : null;
  if (!problem) notFound();

  const problems = listProblems();
  const submissions = listSubmissions(problem.id);
  // 最近一次保存/判题的代码, 用于重新打开题目时恢复编辑器内容
  const lastCode = submissions[0]?.code ?? undefined;

  return (
    <div className="flex h-screen animate-page-in flex-col">
      <Header current="problem" />
      {/* 前进(从列表进入题目)从右侧滑入, 后退(返回首页)从左侧滑入 */}
      <ViewTransition
        enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "slide-up" }}
        exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
        default="none"
      >
        <ProblemClient
          problems={problems}
          problem={problem}
          submissions={submissions}
          lastCode={lastCode}
        />
      </ViewTransition>
    </div>
  );
}
