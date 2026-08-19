/**
 * 题库导入脚本: 把 database/wengkai-problems.json 导入 SQLite
 *
 * 用法:
 *   node scripts/import-json.mjs          # problems 表为空时导入(幂等)
 *   node scripts/import-json.mjs --force  # 清空现有题目后重新导入
 *                                         # (注意: 会级联删除该题库的提交记录与进度)
 *
 * 提示: 应用首次启动时也会在题库为空且 JSON 存在的情况下自动导入,
 *       本脚本用于手动触发或强制重建。
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbPath = path.join(root, "database", "wengkai.db");
const jsonPath = path.join(root, "database", "wengkai-problems.json");
const force = process.argv.includes("--force");

if (!fs.existsSync(jsonPath)) {
  console.error(`[import] 未找到题库文件: ${jsonPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// 确保表结构存在(复用 schema.sql)
const schemaPath = path.join(root, "database", "schema.sql");
if (fs.existsSync(schemaPath)) {
  db.exec(fs.readFileSync(schemaPath, "utf8"));
}
// 兼容旧库: 补充 answer 列
try {
  const cols = db.prepare("PRAGMA table_info(problems)").all().map((c) => c.name);
  if (!cols.includes("answer")) {
    db.exec("ALTER TABLE problems ADD COLUMN answer TEXT NOT NULL DEFAULT ''");
  }
} catch {
  /* 忽略 */
}

const { count } = db.prepare("SELECT COUNT(*) AS count FROM problems").get();
if (count > 0 && !force) {
  console.log(`[import] problems 表已有 ${count} 道题, 跳过(如需重建请加 --force)`);
  db.close();
  process.exit(0);
}
if (force && count > 0) {
  console.log(`[import] --force: 清空现有 ${count} 道题(提交记录与进度将一并删除)…`);
  db.prepare("DELETE FROM problems").run();
}

const items = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (!Array.isArray(items) || items.length === 0) {
  console.error("[import] 题库 JSON 格式不正确或为空");
  process.exit(1);
}

const insert = db.prepare(
  `INSERT INTO problems (code, title, chapter, description, input, output, sampleInput, sampleOutput, answer)
   VALUES (@code, @title, @chapter, @description, @input, @output, @sampleInput, @sampleOutput, @answer)`,
);
const tx = db.transaction((list) => {
  for (const item of list) {
    insert.run({
      code: item.code,
      title: item.title,
      chapter: item.chapter,
      description: item.description ?? "",
      input: item.input ?? "",
      output: item.output ?? "",
      sampleInput: item.sampleInput ?? "",
      sampleOutput: item.sampleOutput ?? "",
      answer: item.answer ?? "",
    });
  }
});
tx(items);

const chapters = db
  .prepare("SELECT chapter, COUNT(*) c FROM problems GROUP BY chapter ORDER BY chapter")
  .all();
console.log(`[import] ✅ 已导入 ${items.length} 道题 -> ${dbPath}`);
console.log("[import] 章节分布: " + chapters.map((c) => `第${c.chapter}章 ${c.c}题`).join(" | "));
db.close();
