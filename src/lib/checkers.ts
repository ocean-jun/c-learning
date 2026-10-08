/**
 * 特殊判题器
 *
 * 用于"答案不唯一"的构造题/多解题: 不比对样例输出, 而是校验输出的正确性。
 * 题目通过 problems.checker 字段指定使用的判题器名称。
 */

export interface CheckOutcome {
  ok: boolean;
  message?: string;
}

/** 分派特殊判题器; 未注册的名称返回 null(调用方退回精确比对) */
export function runSpecialCheck(
  name: string,
  input: string,
  output: string,
  expected: string,
): CheckOutcome | null {
  void expected;
  switch (name) {
    case "xor-array":
      return checkXorArray(input, output);
    case "multiset-kth":
      return checkMultisetKth(input, output);
    default:
      return null;
  }
}

function tokenize(s: string): string[] {
  const t = s.trim();
  return t.length === 0 ? [] : t.split(/\s+/);
}

/**
 * N - XOR Array
 * 校验: 每组输出 n 个 1..1e9 的整数, 恰有一个子区间异或为 0, 且该区间为 [l, r]。
 */
function checkXorArray(input: string, output: string): CheckOutcome {
  const inTok = tokenize(input);
  const outTok = tokenize(output);
  let p = 0;
  let o = 0;
  const t = Number(inTok[p++]);
  if (!Number.isFinite(t) || t <= 0) return { ok: false, message: "输入解析失败" };

  for (let tc = 0; tc < t; tc++) {
    const n = Number(inTok[p++]);
    const l = Number(inTok[p++]);
    const r = Number(inTok[p++]);
    if (o + n > outTok.length) {
      return { ok: false, message: `第 ${tc + 1} 组输出个数不足(需要 ${n} 个)` };
    }
    const a: number[] = [];
    for (let i = 0; i < n; i++) {
      const raw = outTok[o++];
      const v = Number(raw);
      if (!Number.isInteger(v) || v < 1 || v > 1e9) {
        return { ok: false, message: `第 ${tc + 1} 组第 ${i + 1} 个元素 ${raw} 不在 1..1e9 内` };
      }
      a.push(v);
    }

    /* 前缀异或, 统计异或为 0 的子区间个数 */
    const pref = new Array<number>(n + 1).fill(0);
    for (let i = 1; i <= n; i++) pref[i] = (pref[i - 1] ^ a[i - 1]) >>> 0;
    const seen = new Map<number, number>();
    let zeroCnt = 0;
    for (let i = 0; i <= n; i++) {
      const c = seen.get(pref[i]) ?? 0;
      zeroCnt += c;
      seen.set(pref[i], c + 1);
    }

    if (pref[r] !== pref[l - 1]) {
      return { ok: false, message: `第 ${tc + 1} 组: 区间 [${l},${r}] 的异或不为 0` };
    }
    if (zeroCnt !== 1) {
      return {
        ok: false,
        message: `第 ${tc + 1} 组: 存在 ${zeroCnt} 个异或为 0 的子区间, 应恰好 1 个(即 [${l},${r}])`,
      };
    }
  }
  if (o !== outTok.length) return { ok: false, message: "输出内容多于题目要求" };
  return { ok: true, message: "特殊判题通过: 构造合法(仅目标区间异或为 0)" };
}

/**
 * M - 多重集第 k 小
 * 校验: 按输入模拟插入/删除, 输出的数须属于最终多重集(空集时须输出 0)。
 */
function checkMultisetKth(input: string, output: string): CheckOutcome {
  const inTok = tokenize(input);
  const outTok = tokenize(output);
  let p = 0;
  const n = Number(inTok[p++]);
  const q = Number(inTok[p++]);
  if (!Number.isFinite(n) || !Number.isFinite(q)) return { ok: false, message: "输入解析失败" };

  const counts = new Map<number, number>();
  const add = (v: number) => counts.set(v, (counts.get(v) ?? 0) + 1);
  for (let i = 0; i < n; i++) add(Number(inTok[p++]));
  let total = n;

  for (let i = 0; i < q; i++) {
    const k = Number(inTok[p++]);
    if (k > 0) {
      add(k);
      total++;
    } else {
      const values = [...counts.keys()].sort((x, y) => x - y);
      let need = -k;
      for (const v of values) {
        const c = counts.get(v)!;
        if (need <= c) {
          if (c === 1) counts.delete(v);
          else counts.set(v, c - 1);
          break;
        }
        need -= c;
      }
      total--;
    }
  }

  if (outTok.length === 0) return { ok: false, message: "没有输出" };
  const ans = Number(outTok[0]);
  if (total === 0) {
    return ans === 0
      ? { ok: true, message: "特殊判题通过: 多重集为空, 输出 0" }
      : { ok: false, message: `多重集为空时应输出 0, 实际输出 ${outTok[0]}` };
  }
  if (counts.has(ans)) {
    return { ok: true, message: `特殊判题通过: ${ans} 属于最终多重集` };
  }
  return { ok: false, message: `${outTok[0]} 不属于最终多重集` };
}
