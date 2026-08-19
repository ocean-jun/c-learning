# C-Learning-Lab 数据库设计文档（Phase 1）

> 配套翁恺《C语言程序设计》的个人刷题系统 —— 本地数据库设计

## 1. 总览

| 表 | 用途 | 对应 UI |
|---|---|---|
| `problems` | 题目数据（题库） | 章节导航、题目列表、题目页 |
| `submissions` | 每次保存的代码（历史记录） | 题目页右侧「提交记录」 |
| `progress` | 每题学习状态（进度） | Dashboard、章节导航的完成数 |

数据库文件：`database/wengkai.db`（SQLite，单文件，全部数据在本机）。

## 2. problems 题目表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | 内部主键 |
| `code` | TEXT | NOT NULL, UNIQUE | 翁恺题目编号，**保持原编号**，如 `02-0`、`02-1`、`03-0` |
| `title` | TEXT | NOT NULL | 题目名称，如「整数四则运算」 |
| `chapter` | INTEGER | NOT NULL | 所属章节，由编号前缀解析（`02-0` → 2），建索引 |
| `description` | TEXT | NOT NULL, DEFAULT '' | 题目描述 |
| `input` | TEXT | NOT NULL, DEFAULT '' | 输入格式说明 |
| `output` | TEXT | NOT NULL, DEFAULT '' | 输出格式说明 |
| `sampleInput` | TEXT | NOT NULL, DEFAULT '' | 样例输入 |
| `sampleOutput` | TEXT | NOT NULL, DEFAULT '' | 样例输出 |
| `createdAt` | TEXT | DEFAULT 本地时间 | 入库时间 |

设计要点：
- **`code` 唯一**：翁恺编号是题目的稳定标识，`02-0` 这种原编号直接展示给用户，不做任何改写。
- **`chapter` 冗余存储**：虽然可以从 `code` 前缀解析，但显式存储让章节导航的 `GROUP BY` 统计更简单可靠；若导入的库没有该字段，由导入脚本从 `code` 解析补全。
- **文本字段均允许为空串**：有些题目可能没有输入/输出说明，避免导入失败。

## 3. submissions 提交记录表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | 主键 |
| `problemId` | INTEGER | NOT NULL, FK → problems.id, ON DELETE CASCADE | 所属题目 |
| `code` | TEXT | NOT NULL | 用户保存的完整 C 代码 |
| `submitTime` | TEXT | DEFAULT 本地时间 | 提交时间 |
| `status` | TEXT | DEFAULT 'saved' | **预留字段**：第一阶段恒为 `saved`；未来接入判题可扩展 `accepted` / `wrong` |

设计要点：
- **只增不改**：每次保存都追加一条，完整保留做题历史（用户可回看任意一次提交的代码）。
- **索引** `(problemId, submitTime DESC)`：题目页右侧提交记录按时间倒序查询。
- 第一阶段不判题，「保存即提交」，因此没有判题结果字段；`status` 预留但不参与逻辑。

## 4. progress 学习进度表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `problemId` | INTEGER | PK, FK → problems.id, ON DELETE CASCADE | 与题目一对一 |
| `status` | TEXT | CHECK IN ('todo','doing','done') | 未开始 / 进行中 / 已完成 |
| `submitCount` | INTEGER | NOT NULL, DEFAULT 0 | 累计提交次数 |
| `lastSubmitTime` | TEXT | NULL 允许 | 最近一次提交时间 |

设计要点：
- **状态枚举**：`todo`（未开始）→ `doing`（进行中）→ `done`（已完成）。保存代码时自动置为 `doing`；`done` 由用户在界面上手动标记（第一阶段无判题，无法自动判断"完成"）。已完成题目再次保存代码时**保持 `done` 不回退**（见 schema.sql 中的 UPSERT 示例）。
- **提交次数冗余存储**：`submitCount` 也可以从 `submissions` 用 `COUNT(*)` 推出，但需求明确要求进度表保存「提交次数 / 最近提交」，因此冗余存储，并在保存代码的**同一个事务**里与 `submissions` 一起更新，保证一致。
- **无记录即未开始**：`todo` 状态不强制要求有行，统计时用 `LEFT JOIN` 视缺失行为 `todo`。

## 5. 与用户提供题库的兼容策略

用户稍后提供现成的 `wengkai.db`，导入与初始化遵循以下原则：

1. **绝不破坏现有数据**：初始化脚本只执行 `CREATE TABLE IF NOT EXISTS`——表已存在则完全不动。
2. **字段名自适应**：读取层通过 `PRAGMA table_info(表名)` 探测实际列名，兼容 `camelCase` 与 `snake_case` 两种命名（如 `sampleInput` / `sample_input` / `sampleinput`）。
3. **章节自动推导**：若导入的 `problems` 表没有 `chapter` 字段，读取层从 `code` 的前缀数字实时推导，不要求用户改库。
4. **缺失表自动补齐**：若用户的库只有 `problems`，启动时自动创建 `submissions` / `progress`。
5. **可选种子数据**：仅当 `problems` 表为空且显式执行种子脚本时，才写入少量示例题用于界面开发调试；正常启动不做任何写入。

## 6. 关键查询预览（Phase 3/4 封装为 API）

| 场景 | 查询思路 |
|---|---|
| Dashboard 总题数 / 已完成 / 完成率 | `COUNT(problems)` + `COUNT(progress WHERE status='done')` |
| Dashboard 最近练习 | `submissions` 按 `submitTime` 倒序 JOIN `problems` 取第一条 |
| 章节导航「第N章 15/20」 | `GROUP BY problems.chapter` + `SUM(status='done')`，LEFT JOIN progress |
| 题目列表（左栏） | 按 `chapter`、`code` 排序全量返回 |
| 提交记录（右栏） | `WHERE problemId = ? ORDER BY submitTime DESC` |
| 保存代码 | 单事务：INSERT submission + UPSERT progress（见 schema.sql 附录） |
