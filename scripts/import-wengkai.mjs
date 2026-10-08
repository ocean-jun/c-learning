/**
 * C-Learning-Lab 翁恺题集导入脚本
 *
 * 读取 database/wengkai-problems.json (由 scripts/parse-wengkai-html.mjs 生成),
 * 以 UPSERT 方式写入 database/wengkai.db 的 problems 表:
 *   - 新题 (code 不存在) -> 插入
 *   - 已有题 (code 已存在, 如 seed 示例题) -> 仅更新题目字段
 *   - 绝不删除/清空任何数据, 不影响 submissions / progress 表及其外键
 *
 * 用法: node scripts/import-wengkai.mjs
 * 注: 使用 Node 内置 node:sqlite, 无需任何原生依赖
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbPath = path.join(root, "database", "wengkai.db");
const jsonPath = path.join(root, "database", "wengkai-problems.json");
const schemaPath = path.join(root, "database", "schema.sql");

if (!fs.existsSync(jsonPath)) {
  console.error(`[import] 找不到题库 JSON: ${jsonPath}\n先运行: node scripts/parse-wengkai-html.mjs`);
  process.exit(1);
}

const problems = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (!Array.isArray(problems) || problems.length === 0) {
  console.error("[import] 题库 JSON 为空");
  process.exit(1);
}

// 建库(若不存在) + 确保表结构
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");
if (fs.existsSync(schemaPath)) db.exec(fs.readFileSync(schemaPath, "utf8"));

// 兼容旧库: 补充 answer / checker 列(新库已在 schema.sql 中)
try {
  const cols = db.prepare("PRAGMA table_info(problems)").all().map((c) => c.name);
  if (!cols.includes("answer")) {
    db.exec("ALTER TABLE problems ADD COLUMN answer TEXT NOT NULL DEFAULT ''");
  }
  if (!cols.includes("checker")) {
    db.exec("ALTER TABLE problems ADD COLUMN checker TEXT NOT NULL DEFAULT ''");
  }
} catch {
  /* 忽略 */
}

const before = db.prepare("SELECT COUNT(*) AS c FROM problems").get().c;

const upsert = db.prepare(`
  INSERT INTO problems (code, title, chapter, description, input, output, sampleInput, sampleOutput, answer, checker)
  VALUES (@code, @title, @chapter, @description, @input, @output, @sampleInput, @sampleOutput, @answer, @checker)
  ON CONFLICT(code) DO UPDATE SET
    title        = excluded.title,
    chapter      = excluded.chapter,
    description  = excluded.description,
    input        = excluded.input,
    output       = excluded.output,
    sampleInput  = excluded.sampleInput,
    sampleOutput = excluded.sampleOutput,
    answer       = excluded.answer,
    checker      = excluded.checker
`);
const rows = problems.map((it) => ({
  code: String(it.code ?? ""),
  title: String(it.title ?? ""),
  chapter: Number(it.chapter ?? 0),
  description: String(it.description ?? ""),
  input: String(it.input ?? ""),
  output: String(it.output ?? ""),
  sampleInput: String(it.sampleInput ?? ""),
  sampleOutput: String(it.sampleOutput ?? ""),
  answer: String(it.answer ?? ""),
  checker: String(it.checker ?? ""),
}));

db.exec("BEGIN");
try {
  for (const it of rows) upsert.run(it);
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}

const after = db.prepare("SELECT COUNT(*) AS c FROM problems").get().c;
const subCount = db.prepare("SELECT COUNT(*) AS c FROM submissions").get().c;
const progCount = db.prepare("SELECT COUNT(*) AS c FROM progress").get().c;

console.log(`[import] problems: ${before} -> ${after} 题 (本次写入 ${problems.length} 题)`);
console.log(`[import] submissions: ${subCount} 条 (未改动) | progress: ${progCount} 条 (未改动)`);
console.log(`[import] 完成 -> ${dbPath}`);
db.close();
