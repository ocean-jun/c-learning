/**
 * C-Learning-Lab 示例种子数据脚本
 *
 * ⚠️ 仅用于开发调试: 当 database/wengkai.db 的 problems 表为空时,
 *    写入少量翁恺课程经典题目, 方便在拿到真实题库前开发/演示界面。
 *    真实题库请以你提供的 wengkai.db 为准, 本脚本不会覆盖已有数据。
 *
 * 用法: node scripts/seed.mjs
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbPath = path.join(root, "database", "wengkai.db");
const schemaPath = path.join(root, "database", "schema.sql");

const SAMPLE_PROBLEMS = [
  {
    code: "02-0",
    title: "整数四则运算",
    chapter: 2,
    description:
      "本题要求编写程序，计算2个正整数的和、差、积、商并输出。题目保证输入和输出全部在整型范围内。",
    input: "输入在一行中给出2个正整数A和B。",
    output: "在4行中按照格式“A + B = 和”、“A - B = 差”、“A * B = 积”、“A / B = 商”顺序输出，其中商取整数部分。",
    sampleInput: "3 2",
    sampleOutput: "3 + 2 = 5\n3 - 2 = 1\n3 * 2 = 6\n3 / 2 = 1",
  },
  {
    code: "02-1",
    title: "厘米换算英尺英寸",
    chapter: 2,
    description:
      "如果已知英制长度的英尺foot和英寸inch的值，那么对应的米是(foot+inch/12)×0.3048。现在，如果用户输入的是厘米数，那么对应英制长度的英尺和英寸是多少呢？别忘了1英尺等于12英寸。",
    input: "输入在一行中给出1个正整数，单位是厘米。",
    output: "在一行中输出这个厘米数对应英制长度的英尺和英寸的整数值，中间用空格分开。",
    sampleInput: "170",
    sampleOutput: "5 6",
  },
  {
    code: "02-3",
    title: "逆序的三位数",
    chapter: 2,
    description:
      "程序每次读入一个正3位数，然后输出按位逆序的数字。注意：当输入的数字含有结尾的0时，输出不应带有前导的0。比如输入700，输出应该是7。",
    input: "每个测试是一个3位的正整数。",
    output: "输出按位逆序的数。",
    sampleInput: "123",
    sampleOutput: "321",
  },
  {
    code: "03-2",
    title: "用天平找小球",
    chapter: 3,
    description:
      "三个球A、B、C，大小形状相同，其中有一个球与其他球重量不同。要求找出这个不一样的球。",
    input: "输入在一行中给出3个正整数，顺序对应球A、B、C的重量。",
    output: "在一行中输出唯一的那个不一样的球。",
    sampleInput: "1 2 3",
    sampleOutput: "C",
  },
  {
    code: "04-1",
    title: "水仙花数",
    chapter: 4,
    description:
      "水仙花数是指一个N位正整数（N≥3），它的每个位上的数字的N次幂之和等于它本身。例如：153=1^3+5^3+3^3。本题要求编写程序，计算所有N位水仙花数。",
    input: "输入在一行中给出一个正整数N（3≤N≤7）。",
    output: "按递增顺序输出所有N位水仙花数，每个数字占一行。",
    sampleInput: "3",
    sampleOutput: "153\n370\n371\n407",
  },
  {
    code: "04-2",
    title: "打印九九口诀表",
    chapter: 4,
    description:
      "下面是一个完整的下三角九九口诀表：本题要求对任意给定的1位正整数N，输出从1×1到N×N的部分口诀表。",
    input: "输入在一行中给出一个正整数N（1≤N≤9）。",
    output:
      "输出下三角N×N部分口诀表，其中等号右边占4位、左对齐，等号左右各空一格。",
    sampleInput: "4",
    sampleOutput: "1*1=1   \n1*2=2   2*2=4   \n1*3=3   2*3=6   3*3=9   \n1*4=4   2*4=8   3*4=12  4*4=16  ",
  },
  {
    code: "05-2",
    title: "念数字",
    chapter: 5,
    description:
      "输入一个整数，输出每个数字对应的拼音。当整数为负数时，先输出fu字。十个数字对应的拼音如下：0: ling 1: yi 2: er 3: san 4: si 5: wu 6: liu 7: qi 8: ba 9: jiu",
    input: "输入在一行中给出一个整数，如：1234。提示：整数包括负数、零和正数。",
    output: "在一行中输出这个整数对应的拼音，每个数字的拼音之间用空格分开，行末没有最后的空格。",
    sampleInput: "-600",
    sampleOutput: "fu liu ling ling",
  },
  {
    code: "06-3",
    title: "单词长度",
    chapter: 6,
    description:
      "你的程序要读入一行文本，其中以空格分隔为若干个单词，以.结束。你要输出每个单词的长度。这里的单词与语言无关，可以包括各种符号，比如it's算一个单词，长度为4。注意，行中可能出现连续的空格；最后的.不计算在内。",
    input: "输入在一行中给出一行文本，以.结束。提示：用scanf(\"%c\",...)来读入一个字符，直到读到.为止。",
    output: "在一行中输出这行文本对应的每个单词的长度，每个长度之间以空格隔开，行末没有最后的空格。",
    sampleInput: "It's great to see you here.",
    sampleOutput: "3 5 2 3 3 4",
  },
];

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
if (fs.existsSync(schemaPath)) {
  db.exec(fs.readFileSync(schemaPath, "utf8"));
}

const { count } = db.prepare("SELECT COUNT(*) AS count FROM problems").get();
if (count > 0) {
  console.log(`[seed] problems 表已有 ${count} 道题, 跳过种子数据(不覆盖已有题库)`);
  db.close();
  process.exit(0);
}

const insert = db.prepare(
  `INSERT INTO problems (code, title, chapter, description, input, output, sampleInput, sampleOutput)
   VALUES (@code, @title, @chapter, @description, @input, @output, @sampleInput, @sampleOutput)`,
);
const tx = db.transaction((items) => {
  for (const item of items) insert.run(item);
});
tx(SAMPLE_PROBLEMS);

console.log(`[seed] 已写入 ${SAMPLE_PROBLEMS.length} 道示例题 -> ${dbPath}`);
console.log(`[seed] 提示: 这些是开发调试用示例数据, 正式题库请替换为你的 wengkai.db`);
db.close();
