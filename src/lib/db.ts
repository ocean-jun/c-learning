/**
 * C-Learning-Lab SQLite 访问层
 *
 * 使用 Node.js 内置的 node:sqlite (DatabaseSync) —— 零原生依赖,
 * 不需要编译 better-sqlite3, 任何 Node 22+ 环境开箱即用。
 *
 * - 数据库文件: database/wengkai.db (不存在则自动创建)
 * - 启动时确保三张表存在 (CREATE TABLE IF NOT EXISTS, 不动已有表结构)
 * - 索引仅在对应列存在时创建(兼容用户提供的不同结构的题库库)
 * - 表结构自适应: 通过 PRAGMA table_info 探测实际列名,
 *   兼容 camelCase / snake_case / 全小写三种命名
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type {
  ChapterStat,
  Problem,
  ProblemStatus,
  ProblemWithStatus,
  RecentPractice,
  Stats,
  Submission,
} from "./types";

const DB_DIR = path.join(process.cwd(), "database");
const DB_PATH = path.join(DB_DIR, "wengkai.db");

type Row = Record<string, unknown>;

let db: DatabaseSync | null = null;
let columnCache = new Map<string, Record<string, string>>();

/**
 * 运行时建表 DDL (与 database/schema.sql 中表定义保持一致)
 * 仅创建缺失的表, 已存在的表(包括用户提供的题库库)完全不受影响
 */
const TABLE_DDL = [
  `CREATE TABLE IF NOT EXISTS problems (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    code          TEXT    NOT NULL UNIQUE,
    title         TEXT    NOT NULL,
    chapter       INTEGER NOT NULL,
    description   TEXT    NOT NULL DEFAULT '',
    input         TEXT    NOT NULL DEFAULT '',
    output        TEXT    NOT NULL DEFAULT '',
    sampleInput   TEXT    NOT NULL DEFAULT '',
    sampleOutput  TEXT    NOT NULL DEFAULT '',
    answer        TEXT    NOT NULL DEFAULT '',
    createdAt     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    problemId   INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    code        TEXT    NOT NULL,
    submitTime  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    status      TEXT    NOT NULL DEFAULT 'saved'
  )`,
  `CREATE TABLE IF NOT EXISTS progress (
    problemId       INTEGER PRIMARY KEY REFERENCES problems(id) ON DELETE CASCADE,
    status          TEXT    NOT NULL DEFAULT 'todo'
                    CHECK (status IN ('todo','doing','done')),
    submitCount     INTEGER NOT NULL DEFAULT 0,
    lastSubmitTime  TEXT
  )`,
];

/** 打开(或创建)数据库, 并确保三张表与索引就绪 */
export function getDb(): DatabaseSync {
  if (!db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    for (const ddl of TABLE_DDL) db.exec(ddl);
    ensureAnswerColumn(db);
    ensureIndexes(db);
    ensureInitialData(db);
  }
  return db;
}

/**
 * 兼容旧库: problems 表缺少 answer(参考答案)列时补齐。
 * 新库在 TABLE_DDL 中已包含该列。
 */
function ensureAnswerColumn(d: DatabaseSync): void {
  try {
    const cols = resolveColumns("problems", ["answer"], d);
    if (!cols.answer) {
      d.exec(`ALTER TABLE problems ADD COLUMN answer TEXT NOT NULL DEFAULT ''`);
      columnCache.clear();
    }
  } catch {
    // 用户提供的题库表可能不允许修改, 忽略
  }
}

/**
 * 首次启动自动导入题库:
 * 当 problems 表为空且存在 database/wengkai-problems.json 时,
 * 自动把 JSON 题库导入数据库(方便 clone 仓库后开箱即用)。
 * 已导入过(表非空)则跳过, 不影响用户自己的题库。
 */
function ensureInitialData(d: DatabaseSync): void {
  try {
    const { c } = d.prepare("SELECT COUNT(*) AS c FROM problems").get() as { c: number };
    if (c > 0) return;
    const jsonPath = path.join(DB_DIR, "wengkai-problems.json");
    if (!fs.existsSync(jsonPath)) return;
    const items = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Record<string, unknown>[];
    if (!Array.isArray(items) || items.length === 0) return;

    const pCol = resolveColumns("problems", [...PROBLEM_LOGICAL, "answer"], d);
    const fields: string[] = [];
    const params: string[] = [];
    const values: Record<string, string | number>[] = [];
    for (const item of items) {
      const row: Record<string, string | number> = {
        code: String(item.code ?? ""),
        title: String(item.title ?? ""),
        chapter: Number(item.chapter ?? 0),
        description: String(item.description ?? ""),
        input: String(item.input ?? ""),
        output: String(item.output ?? ""),
        sampleInput: String(item.sampleInput ?? ""),
        sampleOutput: String(item.sampleOutput ?? ""),
      };
      if (pCol.answer) row.answer = String(item.answer ?? "");
      values.push(row);
    }
    for (const logical of Object.keys(values[0])) {
      const actual = pCol[logical] ?? logical;
      if (fields.includes(actual)) continue;
      fields.push(actual);
      params.push(`@${logical}`);
    }
    const insert = d.prepare(`INSERT INTO problems (${fields.join(", ")}) VALUES (${params.join(", ")})`);
    d.exec("BEGIN");
    try {
      for (const row of values) insert.run(row);
      d.exec("COMMIT");
    } catch (e) {
      d.exec("ROLLBACK");
      throw e;
    }
    console.log(`[db] 已从 wengkai-problems.json 自动导入 ${values.length} 道题`);
  } catch (e) {
    console.warn("[db] 题库自动导入失败:", e);
  }
}

/** 索引仅在对应列存在时创建(适配用户提供的不同结构的题库库) */
function ensureIndexes(d: DatabaseSync): void {
  const pCol = resolveColumns("problems", ["chapter"], d);
  if (pCol.chapter) {
    d.exec(`CREATE INDEX IF NOT EXISTS idx_problems_chapter ON problems(${pCol.chapter})`);
  }
  const sCol = resolveColumns("submissions", ["problemId", "submitTime"], d);
  if (sCol.problemId && sCol.submitTime) {
    d.exec(
      `CREATE INDEX IF NOT EXISTS idx_submissions_problem_time
       ON submissions(${sCol.problemId}, ${sCol.submitTime} DESC)`,
    );
  }
}

/* ---------------------------------------------------------------------------
 * 表结构自适应探测
 * ------------------------------------------------------------------------- */

/** 逻辑字段名 -> 实际列名的候选写法 */
const CANDIDATES: Record<string, string[]> = {
  id: ["id"],
  code: ["code"],
  title: ["title"],
  chapter: ["chapter"],
  description: ["description"],
  input: ["input"],
  output: ["output"],
  sampleInput: ["sampleInput", "sample_input", "sampleinput"],
  sampleOutput: ["sampleOutput", "sample_output", "sampleoutput"],
  answer: ["answer"],
  problemId: ["problemId", "problem_id", "problemid"],
  submitTime: ["submitTime", "submit_time", "submittime"],
  submitCount: ["submitCount", "submit_count", "submitcount"],
  lastSubmitTime: ["lastSubmitTime", "last_submit_time", "lastsubmittime"],
  status: ["status"],
  createdAt: ["createdAt", "created_at", "createdat"],
};

function camelToSnake(name: string): string {
  return name.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}

/** 解析某表的实际列名 -> 逻辑字段映射(带缓存, 缓存键含字段集合, 避免部分字段污染) */
function resolveColumns(
  table: string,
  logical: string[],
  d: DatabaseSync = getDb(),
): Record<string, string> {
  const cacheKey = `${table}\u0000${logical.join(",")}`;
  if (!columnCache.has(cacheKey)) {
    const actual = new Set(
      (d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
        (c) => c.name,
      ),
    );
    const map: Record<string, string> = {};
    for (const name of logical) {
      const candidates = CANDIDATES[name] ?? [name, camelToSnake(name), name.toLowerCase()];
      const found = candidates.find((c) => actual.has(c));
      if (found) map[name] = found;
    }
    columnCache.set(cacheKey, map);
  }
  return columnCache.get(cacheKey)!;
}

/* ---------------------------------------------------------------------------
 * 行数据归一化
 * ------------------------------------------------------------------------- */

function deriveChapter(code: string): number {
  const m = /^(\d+)/.exec(code);
  return m ? Number(m[1]) : 0;
}

/** 把 problems 行(实际列名)归一化为 Problem */
function toProblem(row: Row, pCol: Record<string, string>): Problem {
  const get = (logical: string): unknown => row[pCol[logical] ?? logical];
  return {
    id: Number(get("id") ?? 0),
    code: String(get("code") ?? ""),
    title: String(get("title") ?? ""),
    chapter:
      get("chapter") != null && get("chapter") !== ""
        ? Number(get("chapter"))
        : deriveChapter(String(get("code") ?? "")),
    description: String(get("description") ?? ""),
    input: String(get("input") ?? ""),
    output: String(get("output") ?? ""),
    sampleInput: String(get("sampleInput") ?? ""),
    sampleOutput: String(get("sampleOutput") ?? ""),
  };
}

/** 兼容多种状态写法: done/completed/已完成/2 -> done */
function toStatus(raw: unknown): ProblemStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  if (["done", "completed", "已完成", "2", "finished"].includes(s)) return "done";
  if (["doing", "in_progress", "进行中", "1", "progress"].includes(s)) return "doing";
  return "todo";
}

const PROBLEM_LOGICAL = [
  "id",
  "code",
  "title",
  "chapter",
  "description",
  "input",
  "output",
  "sampleInput",
  "sampleOutput",
];

const PROGRESS_LOGICAL = ["problemId", "status", "submitCount", "lastSubmitTime"];
const SUBMISSION_LOGICAL = ["id", "problemId", "code", "submitTime"];

/* ---------------------------------------------------------------------------
 * 查询: 题库
 * ------------------------------------------------------------------------- */

/** 全部题目 + 学习状态 (按章节、编号排序) */
export function listProblems(): ProblemWithStatus[] {
  const db = getDb();
  const pCol = resolveColumns("problems", PROBLEM_LOGICAL);
  const gCol = resolveColumns("progress", PROGRESS_LOGICAL);

  const orderBy = pCol.chapter
    ? `ORDER BY ${pCol.chapter} ASC, ${pCol.code} ASC`
    : `ORDER BY ${pCol.code} ASC`;
  const problems = db.prepare(`SELECT * FROM problems ${orderBy}`).all() as Row[];

  // 读取进度表, 建立 problemId -> 状态 映射
  const statusByProblem = new Map<
    number,
    { status: ProblemStatus; submitCount: number; lastSubmitTime: string | null }
  >();
  try {
    const gRows = db.prepare(`SELECT * FROM progress`).all() as Row[];
    const gProblemId = gCol.problemId ?? "problemId";
    const gStatus = gCol.status ?? "status";
    const gCount = gCol.submitCount ?? "submitCount";
    const gTime = gCol.lastSubmitTime ?? "lastSubmitTime";
    for (const g of gRows) {
      const pid = Number(g[gProblemId] ?? 0);
      statusByProblem.set(pid, {
        status: toStatus(g[gStatus]),
        submitCount: Number(g[gCount] ?? 0),
        lastSubmitTime: (g[gTime] as string) ?? null,
      });
    }
  } catch {
    // progress 表不可用时视为全部未开始
  }

  return problems.map((row) => {
    const problem = toProblem(row, pCol);
    const st = statusByProblem.get(problem.id);
    return {
      ...problem,
      status: st?.status ?? "todo",
      submitCount: st?.submitCount ?? 0,
      lastSubmitTime: st?.lastSubmitTime ?? null,
    };
  });
}

/** 按 id 查单题 */
export function getProblemById(id: number): ProblemWithStatus | null {
  return listProblems().find((p) => p.id === id) ?? null;
}

/** 按翁恺编号查单题 (如 '02-0') */
export function getProblemByCode(code: string): ProblemWithStatus | null {
  return listProblems().find((p) => p.code.toLowerCase() === code.toLowerCase()) ?? null;
}

/** 获取题目的参考答案代码(answer 列), 没有则为空串 */
export function getProblemAnswer(id: number): string {
  try {
    const pCol = resolveColumns("problems", ["answer"]);
    const row = getDb()
      .prepare(`SELECT ${pCol.answer ?? "answer"} AS answer FROM problems WHERE ${pCol.id ?? "id"} = ?`)
      .get(id) as { answer?: unknown } | undefined;
    return String(row?.answer ?? "");
  } catch {
    return "";
  }
}

/* ---------------------------------------------------------------------------
 * 查询: Dashboard 统计
 * ------------------------------------------------------------------------- */

export function getStats(): Stats {
  const problems = listProblems();
  const total = problems.length;
  const done = problems.filter((p) => p.status === "done").length;
  const doing = problems.filter((p) => p.status === "doing").length;
  const todo = total - done - doing;

  const chapters: ChapterStat[] = [];
  for (const p of problems) {
    const c = chapters.find((c) => c.chapter === p.chapter);
    if (c) {
      c.total += 1;
      if (p.status === "done") c.done += 1;
    } else {
      chapters.push({ chapter: p.chapter, total: 1, done: p.status === "done" ? 1 : 0 });
    }
  }
  chapters.sort((a, b) => a.chapter - b.chapter);

  return {
    total,
    done,
    doing,
    todo,
    completionRate: total > 0 ? Math.round((done / total) * 1000) / 10 : 0,
    recent: getRecentPractice(),
    chapters,
  };
}

/** 最近一次练习 (按提交时间倒序取第一条, 关联题目信息) */
export function getRecentPractice(): RecentPractice | null {
  const db = getDb();
  const sCol = resolveColumns("submissions", SUBMISSION_LOGICAL);
  // 没有 submitTime 列时退化为按 id 倒序
  const orderCol = sCol.submitTime ?? sCol.id ?? "id";
  const timeCol = sCol.submitTime ?? "submitTime";
  const problemIdCol = sCol.problemId ?? "problemId";

  const rows = db
    .prepare(`SELECT * FROM submissions ORDER BY ${orderCol} DESC LIMIT 1`)
    .all() as Row[];
  if (rows.length === 0) return null;

  const row = rows[0];
  const pid = Number(row[problemIdCol] ?? 0);
  const problem = getProblemById(pid);
  return {
    code: problem?.code ?? "",
    title: problem?.title ?? "",
    submitTime: (row[timeCol] as string) ?? null,
  };
}

/* ---------------------------------------------------------------------------
 * 写入: 提交记录与学习进度 (Phase 6)
 * ------------------------------------------------------------------------- */

/**
 * 保存一次代码提交(单事务):
 * 1. submissions 追加一条记录
 * 2. progress 状态置为 doing(已完成的不回退), 提交次数 +1, 最近提交时间更新
 * 返回新提交记录与更新后的题目状态
 */
export function saveSubmission(
  problemId: number,
  code: string,
): { submission: Submission; problem: ProblemWithStatus } {
  const db = getDb();
  const sCol = resolveColumns("submissions", SUBMISSION_LOGICAL);
  const gCol = resolveColumns("progress", PROGRESS_LOGICAL);
  const pidCol = gCol.problemId ?? "problemId";
  const statusCol = gCol.status ?? "status";
  const countCol = gCol.submitCount ?? "submitCount";
  const timeCol = gCol.lastSubmitTime ?? "lastSubmitTime";

  const insertSub = db.prepare(
    `INSERT INTO submissions (${sCol.problemId ?? "problemId"}, ${sCol.code ?? "code"})
     VALUES (?, ?)`,
  );
  const upsertProgress = db.prepare(
    `INSERT INTO progress (${pidCol}, ${statusCol}, ${countCol}, ${timeCol})
     VALUES (@problemId, 'doing', 1, datetime('now','localtime'))
     ON CONFLICT(${pidCol}) DO UPDATE SET
       ${statusCol} = CASE WHEN ${statusCol} = 'done' THEN 'done' ELSE 'doing' END,
       ${countCol} = ${countCol} + 1,
       ${timeCol} = excluded.${timeCol}`,
  );

  // 单事务: 追加提交记录 + 更新进度
  let newId: number = 0;
  db.exec("BEGIN");
  try {
    const info = insertSub.run(problemId, code);
    upsertProgress.run({ problemId });
    newId = Number(info.lastInsertRowid);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  const submission: Submission =
    listSubmissions(problemId).find((s) => s.id === newId) ?? {
      id: newId,
      problemId,
      code,
      submitTime: "",
    };
  const problem = getProblemById(problemId);
  if (!problem) throw new Error(`题目不存在: ${problemId}`);
  return { submission, problem };
}

/** 手动设置题目状态(已完成/进行中), 保留已有提交次数与时间 */
export function setProblemStatus(
  problemId: number,
  status: "todo" | "doing" | "done",
): ProblemWithStatus | null {
  const db = getDb();
  const gCol = resolveColumns("progress", PROGRESS_LOGICAL);
  const pidCol = gCol.problemId ?? "problemId";
  const statusCol = gCol.status ?? "status";
  const countCol = gCol.submitCount ?? "submitCount";
  const timeCol = gCol.lastSubmitTime ?? "lastSubmitTime";

  db.prepare(
    `INSERT INTO progress (${pidCol}, ${statusCol}, ${countCol}, ${timeCol})
     VALUES (@problemId, @status, 0, NULL)
     ON CONFLICT(${pidCol}) DO UPDATE SET ${statusCol} = @status`,
  ).run({ problemId, status });

  return getProblemById(problemId);
}

/** 更新某次提交的判题状态 (accepted/wrong_answer/compile_error/...) */
export function updateSubmissionStatus(submissionId: number, status: string): void {
  const db = getDb();
  const sCol = resolveColumns("submissions", SUBMISSION_LOGICAL);
  db.prepare(`UPDATE submissions SET ${sCol.status ?? "status"} = ? WHERE ${sCol.id ?? "id"} = ?`).run(
    status,
    submissionId,
  );
}

/* ---------------------------------------------------------------------------
 * 查询: 提交记录
 * ------------------------------------------------------------------------- */

/** 某题的全部提交记录, 按时间倒序 */
export function listSubmissions(problemId: number): Submission[] {
  const db = getDb();
  const sCol = resolveColumns("submissions", SUBMISSION_LOGICAL);
  const problemIdCol = sCol.problemId ?? "problemId";
  const timeCol = sCol.submitTime ?? "submitTime";

  const rows = db
    .prepare(
      `SELECT * FROM submissions WHERE ${problemIdCol} = ? ORDER BY ${timeCol} DESC, ${sCol.id ?? "id"} DESC`,
    )
    .all(problemId) as Row[];
  return rows.map((row) => ({
    id: Number(row[sCol.id ?? "id"] ?? 0),
    problemId,
    code: String(row[sCol.code ?? "code"] ?? ""),
    submitTime: String(row[timeCol] ?? ""),
  }));
}
