/**
 * 解析 CSDN 存档的「中国大学MOOC-翁恺-C语言程序设计习题集-解答汇总」HTML，
 * 提取全部题目并输出为 C-Learning-Lab problems 表所需的 JSON。
 *
 * 用法: node scripts/parse-wengkai-html.mjs <html路径> [输出json路径]
 * 默认输出: database/wengkai-problems.json
 */
import fs from "node:fs";
import path from "node:path";

const htmlPath = process.argv[2] ?? path.join(process.cwd(), "..", "中国大学MOOC-翁恺-C语言程序设计习题集-解答汇总_翁恺c语言课后题-CSDN博客.html");
const outPath = process.argv[3] ?? path.join(process.cwd(), "database", "wengkai-problems.json");

if (!fs.existsSync(htmlPath)) {
  console.error(`[parse] 找不到 HTML 文件: ${htmlPath}`);
  process.exit(1);
}

// ---------- 实体解码 ----------
const ENT = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'", nbsp: " ", copy: "©", hellip: "…", times: "×", mdash: "—", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", middot: "·", divide: "÷" };
function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}

// ---------- HTML -> 文本（保留 pre 内换行） ----------
function preAwareToText(html) {
  const pres = [];
  let out = html.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (m, inner) => {
    const id = pres.length;
    let t = inner.replace(/<br\s*\/?>/gi, "\n"); // <br> -> 换行
    t = t.replace(/<\/(div|li|ol|p|tr|table|pre)>/gi, "\n"); // 闭合块级 -> 换行
    t = t.replace(/<(li|tr)\b[^>]*>/gi, "\n"); // 行级开标签 -> 换行 (CSDN hljs-ln 代码行)
    t = t.replace(/<sup>([^<]*)<\/sup>/gi, "^$1"); // 上标 -> ^ (如 10^100)
    t = t.replace(/<[^>]+>/g, "");
    pres.push(decodeEntities(t).trim());
    return `\u0000PRE${id}\u0000`;
  });
  out = out.replace(/<(br|p|div|h[1-6]|li|tr|table|section|article|blockquote)\b[^>]*>/gi, "\n");
  out = out.replace(/<\/(p|div|h[1-6]|li|tr|table|section|article|pre|blockquote)>/gi, "\n");
  out = out.replace(/<sup>([^<]*)<\/sup>/gi, "^$1"); // 上标 -> ^
  out = out.replace(/<[^>]+>/g, "");
  out = decodeEntities(out);
  out = out.replace(/\u0000PRE(\d+)\u0000/g, (m, id) => `\n${pres[+id]}\n`);
  return out;
}

// ---------- 文本清理 ----------
function cleanText(raw) {
  if (!raw) return "";
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t\u3000]+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

function stripMetaAndAds(text) {
  // PTA 元数据标签行, 其后紧跟的值行一并删除(如 "时间限制\n400 ms"), 允许中间空行
  const META = /^(时间限制|内存限制|代码长度限制|判题程序|作者)$/;
  let prevWasMeta = false;
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false; // 空行: 不重置元数据状态
      if (META.test(l)) {
        prevWasMeta = true;
        return false;
      }
      if (prevWasMeta) {
        prevWasMeta = false; // 元数据值行(如 "400 ms")
        return false;
      }
      if (l.includes("运行项目并下载源码") && l.length < 40) return false; // CSDN 广告按钮(短行)
      if (/^(运行|cpp|Cpp|CPP)$/.test(l)) return false; // 运行按钮残渣
      return true;
    })
    .join("\n");
}

// ---------- 主流程 ----------
const html = fs.readFileSync(htmlPath, "utf8");

// 定位所有 <a name="tN"></a> 锚点
const anchorRe = /<a name="t(\d+)"><\/a>/g;
const anchors = [];
let m;
while ((m = anchorRe.exec(html))) anchors.push({ n: +m[1], idx: m.index });
anchors.sort((a, b) => a.idx - b.idx);

// 题目锚点: t1..tN（t0 是文章目录标题, 最后一个是版权声明, 均跳过）
const problemAnchors = anchors.filter((a) => a.n >= 1 && a.n < anchors.length);
console.log(`[parse] 锚点数: ${anchors.length}, 题目锚点: ${problemAnchors.length}`);

const problems = [];

for (let i = 0; i < problemAnchors.length; i++) {
  const a = problemAnchors[i];
  const segStart = a.idx;
  const segEnd = i + 1 < problemAnchors.length ? problemAnchors[i + 1].idx : html.length;
  const segHtml = html.slice(segStart, segEnd);

  // --- 标题 (h2 开标签在锚点之前, 从锚点向后找 </h2> 截止) ---
  const h2End = segHtml.indexOf("</h2>");
  if (h2End < 0) {
    console.warn(`[parse] t${a.n}: 无 h2 标题, 跳过`);
    continue;
  }
  const titleRaw = segHtml.slice(0, h2End + 5).replace(/<[^>]+>/g, "").replace(/\s+/g, ""); // 去所有空白(中文标题无空格)
  const tm = titleRaw.match(/^(\d{2}-\d)\.(.+?)\((\d+)\)$/);
  if (!tm) {
    console.warn(`[parse] t${a.n}: 标题格式无法解析: "${titleRaw}", 跳过`);
    continue;
  }
  const code = tm[1];
  const title = tm[2];
  const score = Number(tm[3]);
  const chapter = Number(code.split("-")[0]);

  // --- 正文文本 ---
  let text = preAwareToText(segHtml);
  text = stripMetaAndAds(text);

  // --- 按标记切分 (支持 输入样例/输出样例 带序号变体, 如 输入样例1：) ---
  const RE_IN_FMT = /输入格式\s*：/g;
  const RE_OUT_FMT = /输出格式\s*：/g;
  const RE_IN_SAMPLE = /输入样例\s*\d*\s*：/g;
  const RE_OUT_SAMPLE = /输出样例\s*\d*\s*：/g;

  const iInFmt = text.search(RE_IN_FMT);
  const iOutFmt = iInFmt >= 0 ? text.search(RE_OUT_FMT) : -1;

  let description = "";
  let input = "";
  let output = "";
  let sampleInput = "";
  let sampleOutput = "";
  let answer = "";

  const descEnd = iInFmt >= 0 ? iInFmt : text.length;
  description = cleanText(text.slice(0, descEnd));
  // 剔除描述开头的标题行 "XX-X. 标题(分数)" (标题可能跨行, 如 06-0 混合\n类\n型)
  description = description.replace(/^\d{2}-\d\.\s*[\s\S]*?\(\d+\)\s*\n?/, "").trim();

  if (iInFmt >= 0 && iOutFmt > iInFmt) {
    input = cleanText(text.slice(iInFmt + text.match(RE_IN_FMT)[0].length, iOutFmt));
  }
  if (iOutFmt >= 0) {
    const firstInSmp = text.search(RE_IN_SAMPLE);
    const outEnd = firstInSmp > iOutFmt ? firstInSmp : text.length;
    output = cleanText(text.slice(iOutFmt + text.match(RE_OUT_FMT)[0].length, outEnd));
  }

  // 多组样例配对: 每个 输入样例N： 到其后最近的 输出样例M：; 输出样例N： 到其后最近的 输入样例M：/代码起点
  const inPoses = [...text.matchAll(RE_IN_SAMPLE)].map((m) => ({ idx: m.index, len: m[0].length }));
  const outPoses = [...text.matchAll(RE_OUT_SAMPLE)].map((m) => ({ idx: m.index, len: m[0].length }));
  const codeStart = text.search(/^\s*#\s*include\b/m); // 兼容 "#include" / "# include"

  if (inPoses.length && outPoses.length) {
    const inParts = [];
    const outParts = [];
    for (const inPos of inPoses) {
      const nextOut = outPoses.find((o) => o.idx > inPos.idx);
      if (nextOut) inParts.push(text.slice(inPos.idx + inPos.len, nextOut.idx));
    }
    for (const outPos of outPoses) {
      const nextIn = inPoses.find((i) => i.idx > outPos.idx);
      const endIdx = nextIn ? nextIn.idx : codeStart > outPos.idx ? codeStart : text.length;
      outParts.push(text.slice(outPos.idx + outPos.len, endIdx));
    }
    sampleInput = cleanText(inParts.join("\n"));
    sampleOutput = cleanText(outParts.join("\n"));
  }

  // 参考代码: 从 #include 到题段末尾 (去广告行)
  if (codeStart >= 0) {
    answer = cleanText(text.slice(codeStart));
  }

  problems.push({ code, title, chapter, score, description, input, output, sampleInput, sampleOutput, answer });
}

// ---------- 输出 ----------
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(problems, null, 2), "utf8");

let ok = 0, missing = [];
for (const p of problems) {
  const lacks = ["description", "input", "output", "sampleInput", "sampleOutput", "answer"].filter((f) => !p[f]);
  if (lacks.length === 0) ok++;
  else missing.push(`${p.code} 缺: ${lacks.join(",")}`);
}
console.log(`[parse] 共提取 ${problems.length} 题, 字段完整 ${ok} 题`);
for (const l of missing) console.log(`  - ${l}`);
console.log(`[parse] 输出 -> ${outPath}`);
