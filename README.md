# C-Learning-Lab

配套翁恺《C语言程序设计》课程的个人本地刷题系统。

- **技术栈**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Monaco Editor
- **本地数据**: SQLite（`database/wengkai.db`），所有数据保存在本机，无需任何云端服务
- **界面风格**: LeetCode + VS Code（深色主题）

## 快速开始

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器 -> http://localhost:3000
```

## 题库数据

将你的题库文件放入 `database/wengkai.db`（表结构见 `database/schema.sql`，读取层会自动兼容 camelCase / snake_case 字段命名，缺失的表自动补齐）。

没有题库文件时应用也能启动（自动创建空库）。开发调试可使用示例种子数据：

```bash
node scripts/seed.mjs   # 仅当 problems 表为空时写入 8 道示例题
```

## 目录结构

```
├── database/          # SQLite 数据库 + schema.sql（设计文档）
├── docs/              # 数据库设计文档
├── scripts/           # 种子数据等工具脚本
└── src/
    ├── app/
    │   ├── api/       # API 路由（problems / stats）
    │   └── page.tsx   # 首页（Dashboard）
    ├── components/    # UI 组件
    └── lib/           # SQLite 访问层（db.ts）+ 类型定义
```

## API

| 路由 | 说明 |
|---|---|
| `GET /api/problems` | 全部题目（含学习状态），按章节、编号排序 |
| `GET /api/problems/[id]` | 单题详情（含样例输入输出） |
| `GET /api/stats` | Dashboard 统计（总题数 / 完成率 / 章节统计 / 最近练习） |
| `POST /api/problems/[id]/submissions` | 保存代码（写入提交记录 + 更新进度） |
| `GET /api/problems/[id]/submissions` | 某题提交记录（时间倒序） |
| `POST /api/problems/[id]/progress` | 手动设置做题状态 |
| `POST /api/problems/[id]/judge` | **提交判题**：编译运行 + 样例比对 |

## 开发进度

- [x] Phase 1 数据库结构设计
- [x] Phase 2 Next.js 项目结构
- [x] Phase 3 题库读取（SQLite 访问层 + API）
- [x] Phase 4 题目展示页面（三栏布局）
- [x] Phase 5 Monaco Editor（C 语言高亮 / 行号 / 自动缩进 / 深色主题）
- [x] Phase 6 刷题记录（保存代码 + 进度 + 提交记录）
- [x] 代码审查：实时语法检查（tree-sitter 红线标记）
- [x] 完整判题：编译 + 样例比对（内置 TCC，无需安装编译器）

## 功能一览

- **Dashboard**：总题数 / 已完成 / 完成率 / 最近练习 / 章节进度
- **题目页**（LeetCode + VS Code 风格三栏布局）：
  - 左：按章节分组的题目列表（状态圆点）
  - 中：题目描述（输入/输出格式、样例）+ Monaco 编辑器
  - 右：提交记录（时间 + 代码 + 判题状态，每次保存追加一条）
- **实时语法检查**：输入时自动解析 C 代码，语法错误以红色波浪线标注，工具栏显示问题数量
- **提交判题**：一键编译运行你的代码、用题目样例输入测试并比对输出：
  - ✓ 通过（accepted）→ 自动标记「已完成」
  - ✗ 答案错误 → 展示「你的输出 vs 期望输出」
  - 编译错误 / 运行超时 / 运行错误 → 展示详细原因
  - 判题使用内置 TCC 编译器（`tools/tcc`，无需安装 gcc）；检测到系统 gcc 时优先使用
- **做题状态**：未开始 → 保存/判题自动「进行中」→ 通过判题或手动「已完成」（已完成不因再次保存回退）
- **本地存储**：全部数据在 `database/wengkai.db`（题目 / 提交记录 / 进度），完全离线可用
