# database/

本项目的数据目录，存放本地 SQLite 数据库文件。

## 文件说明

| 文件 | 说明 |
|---|---|
| `wengkai.db` | **主数据库**（由你提供或首次运行自动创建）。包含三张表：`problems`（题目）、`submissions`（提交记录）、`progress`（学习进度） |
| `schema.sql` | 建表脚本。仅用于创建缺失的表，**不会改动已存在的表结构** |

## 使用说明

1. 将你的题库文件放到本目录并命名为 `wengkai.db`
2. 应用首次启动时会自动：
   - 若 `wengkai.db` 不存在 → 创建空库并按 `schema.sql` 建表
   - 若已有表 → 保持不动，只补齐缺失的表（`submissions` / `progress`）
   - 自动探测表结构（兼容 `camelCase` / `snake_case` 字段命名）
3. 读取层对字段名做自适应映射，即使字段顺序或命名略有不同也能正常读取

> 注意：`wengkai.db` 包含个人刷题进度，已在 `.gitignore` 中排除，不会提交到版本库。
