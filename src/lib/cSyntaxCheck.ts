/**
 * C 语言实时语法检查 (tree-sitter WASM, 纯前端离线)
 *
 * - 使用 web-tree-sitter + tree-sitter-c 解析代码
 * - 遍历语法树收集 ERROR / MISSING 节点, 生成 Monaco marker 数据
 * - 解析器不可用时静默降级(返回空数组), 不打扰编辑
 */
import Parser from "web-tree-sitter";

export interface SyntaxIssue {
  /** 0-based 行 */
  row: number;
  /** 0-based 列 */
  col: number;
  endRow: number;
  endCol: number;
  message: string;
}

let parserPromise: Promise<Parser> | null = null;

function getParser(): Promise<Parser> {
  if (!parserPromise) {
    parserPromise = (async () => {
      await Parser.init({
        locateFile: () => "/wasm/web-tree-sitter.wasm",
      });
      const wasm = await fetch("/wasm/tree-sitter-c.wasm").then((r) => r.arrayBuffer());
      const parser = new Parser();
      parser.setLanguage(await Parser.Language.load(new Uint8Array(wasm)));
      return parser;
    })();
  }
  return parserPromise;
}

/** MISSING 节点 type -> 用户可读的提示 */
const MISSING_MESSAGE: Record<string, string> = {
  ";": "缺少分号 ';'",
  ")": "缺少右括号 ')'",
  "}": "缺少右花括号 '}'",
  "]": "缺少右方括号 ']'",
  "(": "缺少左括号 '('",
  "{": "缺少左花括号 '{'",
};

/**
 * 检查 C 代码语法, 返回问题列表
 * @param code 待检查的 C 源码
 */
export async function checkSyntax(code: string): Promise<SyntaxIssue[]> {
  const trimmed = code.trim();
  if (!trimmed) return [];
  try {
    const parser = await getParser();
    const tree = parser.parse(code);
    const issues: SyntaxIssue[] = [];

    // 1. 收集所有 ERROR / MISSING 节点
    const walk = (node: Parser.SyntaxNode) => {
      if (node.isError || node.isMissing) {
        const text = node.text.trim();
        const message = node.isMissing
          ? (MISSING_MESSAGE[node.type] ?? `此处缺少 ${node.type}`)
          : text.length > 24
            ? `语法错误: ${text.slice(0, 24)}…`
            : `语法错误: ${text || node.type}`;
        issues.push({
          row: node.startPosition.row,
          col: node.startPosition.column,
          endRow: node.endPosition.row,
          endCol: node.endPosition.column,
          message,
        });
      }
      // children 包含匿名节点, MISSING/部分 ERROR 是匿名的
      for (const child of node.children) walk(child);
    };
    walk(tree.rootNode);

    // 2. 去重: 移除被其他错误节点完全包含的重复报告
    //    (ERROR 父节点与子节点可能报告同一处问题)
    issues.sort((a, b) => a.row - b.row || a.col - b.col);
    const deduped: SyntaxIssue[] = [];
    for (const issue of issues) {
      const covered = deduped.some(
        (d) =>
          d.row === issue.row && d.col === issue.col && d.endRow === issue.endRow && d.endCol === issue.endCol,
      );
      if (!covered) deduped.push(issue);
    }
    // 最多报告 50 处, 避免极端情况刷屏
    return deduped.slice(0, 50);
  } catch {
    return [];
  }
}
