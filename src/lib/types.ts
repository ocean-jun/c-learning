/**
 * C-Learning-Lab 共享类型定义
 */

/** 做题状态: todo=未开始 doing=进行中 done=已完成 */
export type ProblemStatus = "todo" | "doing" | "done";

/** 题目(problems 表) */
export interface Problem {
  id: number;
  /** 翁恺题目编号, 如 '02-0' */
  code: string;
  title: string;
  /** 所属章节 */
  chapter: number;
  description: string;
  input: string;
  output: string;
  sampleInput: string;
  sampleOutput: string;
  /** 特殊判题器名称(答案不唯一的题目, 如 'xor-array'); 为空则按样例精确比对 */
  checker?: string;
}

/** 题目 + 学习状态(列表用) */
export interface ProblemWithStatus extends Problem {
  status: ProblemStatus;
  submitCount: number;
  lastSubmitTime: string | null;
}

/** 提交记录(submissions 表) */
export interface Submission {
  id: number;
  problemId: number;
  code: string;
  submitTime: string;
  /** 判题状态(未判题时为空): accepted / wrong_answer / compile_error / timeout / runtime_error */
  status?: string;
}

/** 判题结果状态 */
export type JudgeStatus =
  | "accepted"
  | "wrong_answer"
  | "compile_error"
  | "timeout"
  | "runtime_error"
  | "no_compiler";

/** 判题结果 */
export interface JudgeResult {
  status: JudgeStatus;
  /** 编译错误信息(compile_error 时) */
  compileError?: string;
  /** 程序实际输出 */
  output?: string;
  /** 期望输出(样例输出) */
  expectedOutput?: string;
  /** 特殊判题说明(如"特殊判题通过: 构造合法") */
  message?: string;
}

/** 自定义输入运行结果(调试用, 不比对) */
export interface RunResult {
  ok: boolean;
  /** 程序 stdout 输出 */
  output?: string;
  /** 编译错误信息 */
  compileError?: string;
  /** 运行错误/超时信息 */
  error?: string;
  timedOut?: boolean;
}

/** 章节统计(章节导航用) */
export interface ChapterStat {
  chapter: number;
  total: number;
  done: number;
}

/** 最近练习(Dashboard 用) */
export interface RecentPractice {
  code: string;
  title: string;
  submitTime: string | null;
}

/** Dashboard 总览统计 */
export interface Stats {
  total: number;
  done: number;
  doing: number;
  todo: number;
  /** 完成率, 0-100 保留 1 位小数 */
  completionRate: number;
  recent: RecentPractice | null;
  chapters: ChapterStat[];
}
