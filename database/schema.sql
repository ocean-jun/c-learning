-- ============================================================================
-- C-Learning-Lab 数据库结构设计 (Phase 1)
-- 数据库文件: database/wengkai.db
--
-- 设计原则:
--   1. 三张表: problems(题目) / submissions(提交记录) / progress(学习进度)
--   2. 字段命名与需求文档保持一致(camelCase)
--   3. 所有 DDL 均使用 IF NOT EXISTS: 用户稍后提供的 wengkai.db
--      若已包含同名表, 本脚本不会改动其结构
--
-- 说明: 本文件是设计文档与建表参考;
--       应用运行时初始化逻辑在 src/lib/db.ts (TABLE_DDL + 索引列探测),
--       两者表定义保持一致。
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. problems 题目表
--    对应 UI: 题库列表 / 题目页 / 章节导航
--    翁恺题目编号保持原编号, 如 '02-0' '02-1' '03-0'
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS problems (
  id            INTEGER PRIMARY KEY AUTOINCREMENT, -- 内部自增主键
  code          TEXT    NOT NULL UNIQUE,           -- 翁恺题目编号, 如 '02-0'
  title         TEXT    NOT NULL,                  -- 题目名称, 如 '整数四则运算'
  chapter       INTEGER NOT NULL,                  -- 所属章节(由编号前缀解析), 如 2
  description   TEXT    NOT NULL DEFAULT '',       -- 题目描述
  input         TEXT    NOT NULL DEFAULT '',       -- 输入格式说明
  output        TEXT    NOT NULL DEFAULT '',       -- 输出格式说明
  sampleInput   TEXT    NOT NULL DEFAULT '',       -- 样例输入
  sampleOutput  TEXT    NOT NULL DEFAULT '',       -- 样例输出
  createdAt     TEXT    NOT NULL DEFAULT (datetime('now','localtime')) -- 入库时间
);

-- 章节导航按 chapter 分组统计, 建立索引
CREATE INDEX IF NOT EXISTS idx_problems_chapter ON problems(chapter);

-- ----------------------------------------------------------------------------
-- 2. submissions 提交记录表
--    用户每次"保存代码"追加一条记录, 完整保留做题历史
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  problemId   INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  code        TEXT    NOT NULL,                    -- 用户保存的完整 C 代码
  submitTime  TEXT    NOT NULL DEFAULT (datetime('now','localtime')), -- 提交时间(本地时间)
  status      TEXT    NOT NULL DEFAULT 'saved'     -- 预留字段: 第一阶段恒为 'saved',
                                                   -- 未来判题可扩展为 accepted / wrong
);

-- 题目页按时间倒序列出提交记录
CREATE INDEX IF NOT EXISTS idx_submissions_problem_time
  ON submissions(problemId, submitTime DESC);

-- ----------------------------------------------------------------------------
-- 3. progress 学习进度表
--    与 problems 一对一, 记录每题当前状态
--    status 枚举: todo=未开始  doing=进行中  done=已完成
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS progress (
  problemId       INTEGER PRIMARY KEY REFERENCES problems(id) ON DELETE CASCADE,
  status          TEXT    NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('todo','doing','done')),
  submitCount     INTEGER NOT NULL DEFAULT 0,      -- 累计提交次数
  lastSubmitTime  TEXT                             -- 最近一次提交时间
);

-- ============================================================================
-- 附: 常用查询示例 (Phase 3/4 会封装为 API)
--
-- 1) Dashboard 总览
--    SELECT COUNT(*) FROM problems;                              -- 总题数
--    SELECT COUNT(*) FROM progress WHERE status='done';          -- 已完成
--    最近练习: 按 submissions.submitTime 倒序 JOIN problems 取第一条
--
-- 2) 章节导航统计
--    SELECT p.chapter,
--           COUNT(*) AS total,
--           SUM(CASE WHEN g.status='done' THEN 1 ELSE 0 END) AS doneCount
--    FROM problems p LEFT JOIN progress g ON g.problemId = p.id
--    GROUP BY p.chapter ORDER BY p.chapter;
--
-- 3) 保存代码时的事务(Phase 6 实现)
--    BEGIN;
--    INSERT INTO submissions(problemId, code) VALUES (?, ?);
--    INSERT INTO progress(problemId, status, submitCount, lastSubmitTime)
--    VALUES (?, 'doing', 1, datetime('now','localtime'))
--    ON CONFLICT(problemId) DO UPDATE SET
--      status = CASE WHEN progress.status='done' THEN 'done' ELSE 'doing' END,
--      submitCount = progress.submitCount + 1,
--      lastSubmitTime = excluded.lastSubmitTime;
--    COMMIT;
-- ============================================================================
