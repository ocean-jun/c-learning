/**
 * C 语言判题引擎 (服务端 Node 运行时)
 *
 * 流程: 写临时源码文件 → 编译 → 用样例输入运行(超时保护) → 规范化比对输出
 * 编译器: 优先项目内置 TCC(tools/tcc, 无需安装), 其次系统 gcc
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { JudgeResult, RunResult } from "./types";

const execFileAsync = promisify(execFile);

/** 运行超时(毫秒) */
const RUN_TIMEOUT_MS = 3000;
/** 输出捕获上限 */
const MAX_OUTPUT_BYTES = 64 * 1024;
/** 编译超时(毫秒) */
const COMPILE_TIMEOUT_MS = 15000;

/** 查找可用编译器: 内置 TCC 优先, 其次系统 gcc */
function findCompiler(): string {
  const tccCandidates = [
    path.join(process.cwd(), "tools", "tcc", "tcc", "tcc.exe"),
    path.join(process.cwd(), "tools", "tcc", "tcc.exe"),
  ];
  for (const p of tccCandidates) {
    if (fs.existsSync(p)) return p;
  }
  return "gcc"; // 系统 gcc (通过 PATH 解析; 不可用时编译阶段报错)
}

async function compile(
  compiler: string,
  srcPath: string,
  exePath: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync(compiler, [srcPath, "-o", exePath], {
      timeout: COMPILE_TIMEOUT_MS,
      windowsHide: true,
    });
    return { ok: true };
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    return {
      ok: false,
      error: (e.stderr || e.stdout || e.message || "编译失败").slice(0, 8000),
    };
  }
}

function run(exePath: string, input: string): Promise<{ ok: boolean; output?: string; timedOut?: boolean; error?: string }> {
  return new Promise((resolve) => {
    const child = execFile(
      exePath,
      [],
      {
        timeout: RUN_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        if (err) {
          const timedOut = (err as { killed?: boolean }).killed === true;
          resolve({
            ok: false,
            timedOut,
            error: (stderr || err.message || "运行失败").slice(0, 4000),
          });
          return;
        }
        resolve({ ok: true, output: stdout });
      },
    );
    // 喂入样例输入
    child.stdin?.end(input ?? "");
  });
}

/** 输出规范化: CRLF→LF, 去每行行尾空白, 去末尾空行 */
function normalize(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");
}

/**
 * 编译并运行代码(自定义输入), 不比对输出
 * 编译并运行代码(自定义输入), 不比对输出
 * 供「运行」调试功能使用, 判题(judgeC)复用此流程
 */
export async function compileAndRun(code: string, input: string): Promise<RunResult> {
  const compiler = findCompiler();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clab-run-"));
  try {
    const srcPath = path.join(dir, "main.c");
    const exePath = path.join(dir, "main.exe");
    fs.writeFileSync(srcPath, code, "utf8");

    // 1. 编译
    const c = await compile(compiler, srcPath, exePath);
    if (!c.ok) {
      return { ok: false, compileError: c.error };
    }

    // 2. 运行(喂入自定义输入)
    const r = await run(exePath, input ?? "");
    if (!r.ok) {
      return { ok: false, error: r.error, timedOut: r.timedOut };
    }
    return { ok: true, output: r.output };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * 判题入口: 编译并运行代码, 用样例输入验证输出
 */
export async function judgeC(
  code: string,
  sampleInput: string,
  sampleOutput: string,
): Promise<JudgeResult> {
  const r = await compileAndRun(code, sampleInput);
  if (!r.ok) {
    if (r.compileError) return { status: "compile_error", compileError: r.compileError };
    if (r.timedOut) return { status: "timeout" };
    return { status: "runtime_error", output: r.error };
  }

  // 比对
  const actual = normalize(r.output ?? "");
  const expected = normalize(sampleOutput ?? "");
  return {
    status: actual === expected ? "accepted" : "wrong_answer",
    output: r.output,
    expectedOutput: sampleOutput,
  };
}
