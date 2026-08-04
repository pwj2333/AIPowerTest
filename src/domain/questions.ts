import type { AbilityDimension, AssessmentQuestion, Grade } from "./types";
import { questionSeeds } from "./questionBankData";

const dimensionLabels: Record<AbilityDimension, string> = {
  office: "AI 交互与办公",
  scenario: "场景与价值判断",
  workflow: "流程与工具连接",
  innovation: "应用与组织创新"
};

export const grades: Grade[] = [
  {
    level: 0,
    code: "L0",
    name: "待入门",
    capability: "正在建立 AI 基础：先理解工具边界，再完成一个可核验的日常任务。",
    color: "#7c8998",
    tasks: ["选择一个非敏感的日常任务，写清目标和输出要求。", "对照原始材料检查一次 AI 输出中的事实。", "记录一个适合使用 AI 和一个不适合使用 AI 的场景。"]
  },
  {
    level: 1,
    code: "L1",
    name: "青铜级",
    capability: "会问 AI：能用对话工具完成清晰的基础任务。",
    color: "#ad6c2d",
    tasks: ["用“目标-背景-要求-输出格式”重写一个实际提示词。", "比较两次提问的输出，记录哪一项要求让结果变好。", "为一项日常任务建立可复用的提问模板。"]
  },
  {
    level: 2,
    code: "L2",
    name: "白银级",
    capability: "会用 AI 办公：能把材料转化为可靠的办公交付物。",
    color: "#738496",
    tasks: ["用一份非敏感材料生成会议纪要或通知。", "逐项核验输出中的事实、数据和日期。", "把有效的提示词保存为下次可复用的模板。"]
  },
  {
    level: 3,
    code: "L3",
    name: "黄金级",
    capability: "会找 AI 场景：能把合适的任务交给 AI 并定义验收。",
    color: "#b98120",
    tasks: ["选一个高频任务，写清输入、输出和验收标准。", "列出该场景的风险与必须人工审核的节点。", "用一周时间记录该场景节省的时间或提升的质量。"]
  },
  {
    level: 4,
    code: "L4",
    name: "铂金级",
    capability: "会训练 AI 流程：能把一次性实践沉淀为可复用工作流。",
    color: "#6d8292",
    tasks: ["把已验证的场景拆成可复用步骤和责任人。", "为流程补上异常分支和人工检查点。", "找一位同事按流程复做并收集改进意见。"]
  },
  {
    level: 5,
    code: "L5",
    name: "钻石级",
    capability: "会连接 AI 工具：能让知识、文件和协作工具形成闭环。",
    color: "#2376bb",
    tasks: ["选择一组已授权的非敏感资料建立知识检索入口。", "明确资料更新人、访问范围和失效处理方式。", "将输出接入一次团队协作或交付流程。"]
  },
  {
    level: 6,
    code: "L6",
    name: "星耀级",
    capability: "会搭建 AI 应用：能用低代码或可视化方式交付小应用。",
    color: "#4d55aa",
    tasks: ["为一个明确角色搭建可访问的 AI 小应用原型。", "用真实但非敏感的样例完成边界与错误测试。", "收集三位使用者反馈后完成一次迭代。"]
  },
  {
    level: 7,
    code: "L7",
    name: "王者级",
    capability: "会重构业务流程：能用 AI 改变团队的工作方式。",
    color: "#a92a25",
    tasks: ["为一个团队流程设定 AI 改造试点范围。", "记录采用率、周期、质量或成本中的至少两项指标。", "将试点结论转化为可扩展的流程改造建议。"]
  },
  {
    level: 8,
    code: "L8",
    name: "荣耀王者级",
    capability: "会建设 AI 生态：能沉淀标准、案例与可复制的组织能力。",
    color: "#9b6415",
    tasks: ["沉淀一份可推广的标准、案例或课程。", "建立复用反馈机制，持续更新已有资产。", "选择一个组织单元复制实践并复盘成效。"]
  }
];

type Score = 0 | 1 | 2 | 3;
const optionTextLength = (text: string) => Array.from(text).length;
const prohibitedOptionText = /直接|不管|随便|完全不用|不用确认|无需核对|凭感觉|就行|就好|再说|吧[，。！？]?$/;

const detailVariants = [
  ["后", "留痕", "并留痕", "过程留痕", "并全程留痕", "保留处理记录", "并保留处理记录", "同时保留处理记录"],
  ["中", "说明", "并说明", "补充说明", "并补充说明", "说明本次理由", "并说明本次理由", "同时说明本次理由"],
  ["前", "核对", "并核对", "过程核对", "并完成核对", "核对关键信息", "并核对关键信息", "同时核对关键信息"],
  ["后", "复查", "并复查", "过程复查", "并完成复查", "复查关键结果", "并复查关键结果", "同时复查关键结果"],
] as const;

function addDetail(label: string, count: number, seed: number): string {
  if (count <= 0) return label;
  let remaining = count;
  let detail = "";
  while (remaining > 0) {
    const chunkLength = Math.min(8, remaining);
    detail += detailVariants[(seed + remaining) % detailVariants.length][chunkLength - 1];
    remaining -= chunkLength;
  }
  if (Array.from(detail).length !== count) throw new Error("题库长度修饰语配置错误");
  return `${label}${detail}`;
}

function balanceOptionLabels(labels: readonly [string, string, string, string], questionIndex: number): [string, string, string, string] {
  const lengths = labels.map(optionTextLength);
  const longestScore = questionIndex % 4;
  const shortestScore = (questionIndex + 1) % 4;
  const middleScores = [0, 1, 2, 3].filter((score) => score !== longestScore && score !== shortestScore);
  const shortestLength = lengths[shortestScore];
  const middleTarget = Math.max(shortestLength + 2, lengths[middleScores[0]], lengths[middleScores[1]]);
  const longestTarget = Math.max(shortestLength + 4, middleTarget + 1, lengths[longestScore]);
  if (longestTarget - shortestLength > 8 || longestTarget > 30 || shortestLength < 12) {
    throw new Error(`题目 ${questionIndex + 1} 的答案长度无法自然平衡`);
  }
  const targets = [shortestLength, middleTarget, middleTarget, longestTarget];
  targets[shortestScore] = shortestLength;
  targets[middleScores[0]] = middleTarget;
  targets[middleScores[1]] = middleTarget;
  targets[longestScore] = longestTarget;
  return labels.map((label, score) => addDetail(label, targets[score] - lengths[score], questionIndex + score)) as [string, string, string, string];
}

export function getOptionLengthSpread(question: AssessmentQuestion): number {
  const lengths = question.options.map((option) => optionTextLength(option.label));
  return Math.max(...lengths) - Math.min(...lengths);
}

export const questions: AssessmentQuestion[] = questionSeeds.map((seed, index) => {
  const [level, dimension, category, prompt, labels] = seed;
  const id = `q${String(index + 1).padStart(3, "0")}`;
  const options = balanceOptionLabels(labels, index).map((label, score) => ({ id: `${id}-option-${score}`, label, score: score as Score }));
  return { id, level, dimension, category, prompt, options };
});

const questionHeaderPattern = /^##\s+([A-Za-z0-9_-]+)\s*\|\s*L([1-8])\s*\|\s*(office|scenario|workflow|innovation)\s*\|\s*(.+)$/;
const optionPattern = /^-\s+\[([0-3])]\s+(.+)$/;

export function serializeQuestionMarkdown(items: AssessmentQuestion[]): string {
  const blocks = items.map((question) => [
    `## ${question.id} | L${question.level} | ${question.dimension} | ${question.category}`,
    `> ${question.prompt}`,
    ...question.options.map((option) => `- [${option.score}] ${option.label}`)
  ].join("\n"));
  return ["# AI 能力测评题库", "", ...blocks].join("\n\n");
}

export const defaultQuestionMarkdown = serializeQuestionMarkdown(questions);

export function parseQuestionMarkdown(markdown: string): AssessmentQuestion[] {
  if (markdown.length > 1_000_000) throw new Error("题库文件不能超过 1 MB。");
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  const starts = lines.flatMap((line, index) => line.startsWith("## ") ? [index] : []);
  if (starts.length !== 100) throw new Error("题库必须包含 100 道题。");

  const parsed: AssessmentQuestion[] = starts.map((start, questionIndex) => {
    const header = lines[start].match(questionHeaderPattern);
    if (!header) throw new Error(`第 ${start + 1} 行题目标题格式错误。`);
    const [, id, levelText, dimensionText, categoryText] = header;
    const end = starts[questionIndex + 1] ?? lines.length;
    const body = lines.slice(start + 1, end).filter((line) => line.trim());
    const prompts = body.filter((line) => line.startsWith("> "));
    if (prompts.length !== 1 || !prompts[0].slice(2).trim()) throw new Error(`${id} 必须有且只有一行以“> ”开头的题干。`);

    const optionLines = body.filter((line) => line.startsWith("- "));
    const options = optionLines.map((line) => {
      const match = line.match(optionPattern);
      if (!match) throw new Error(`${id} 的选项必须使用“- [0] 选项内容”格式。`);
      const score = Number(match[1]) as 0 | 1 | 2 | 3;
      return { id: `${id}-option-${score}`, score, label: match[2].trim() };
    });
    if (options.length !== 4 || new Set(options.map((option) => option.score)).size !== 4) throw new Error(`${id} 必须各有一个 0、1、2、3 分选项。`);
    const lengths = options.map((option) => optionTextLength(option.label));
    if (lengths.some((length) => length < 12 || length > 30)) throw new Error(`${id} 的答案必须为 12–30 个字符。`);
    if (options.some((option) => prohibitedOptionText.test(option.label))) throw new Error(`${id} 的答案包含容易提示分值的表达。`);
    if (new Set(options.map((option) => option.label)).size !== 4) throw new Error(`${id} 的四个答案不能重复。`);
    if (lengths.filter((length) => length === Math.max(...lengths)).length !== 1 || lengths.filter((length) => length === Math.min(...lengths)).length !== 1) {
      throw new Error(`${id} 必须各有一个最长和最短答案。`);
    }
    const spread = Math.max(...lengths) - Math.min(...lengths);
    if (spread < 2 || spread > 8) throw new Error(`${id} 的最长与最短答案必须相差 2–8 个字符。`);

    return {
      id,
      level: Number(levelText),
      dimension: dimensionText as AbilityDimension,
      category: categoryText.trim(),
      prompt: prompts[0].slice(2).trim(),
      options
    };
  });

  if (new Set(parsed.map((question) => question.id)).size !== parsed.length) throw new Error("题目 ID 不能重复。");
  if (new Set(parsed.map((question) => question.prompt)).size !== parsed.length) throw new Error("题干不能重复。");
  const allOptionLabels = parsed.flatMap((question) => question.options.map((option) => option.label));
  if (new Set(allOptionLabels).size !== allOptionLabels.length) throw new Error("不同题目的答案内容不能重复。");
  const expectedLevelCounts = [13, 13, 13, 13, 12, 12, 12, 12];
  if (expectedLevelCounts.some((count, index) => parsed.filter((question) => question.level === index + 1).length !== count)) {
    throw new Error("题库等级配额必须为 L1–L4 各 13 题、L5–L8 各 12 题。");
  }
  const dimensions = new Set(parsed.map((question) => question.dimension));
  if ((["office", "scenario", "workflow", "innovation"] as AbilityDimension[]).some((dimension) => !dimensions.has(dimension))) throw new Error("题库必须覆盖四个能力维度。");
  const roles = Object.fromEntries([0, 1, 2, 3].map((score) => [score, { longest: 0, shortest: 0, middle: 0 }])) as Record<Score, Record<"longest" | "shortest" | "middle", number>>;
  parsed.forEach((question) => {
    const lengths = question.options.map((option) => optionTextLength(option.label));
    const longest = Math.max(...lengths);
    const shortest = Math.min(...lengths);
    question.options.forEach((option, index) => {
      const role = lengths[index] === longest ? "longest" : lengths[index] === shortest ? "shortest" : "middle";
      roles[option.score][role] += 1;
    });
  });
  if ([0, 1, 2, 3].some((score) => roles[score as Score].longest !== 25 || roles[score as Score].shortest !== 25 || roles[score as Score].middle !== 50)) {
    throw new Error("每个分值必须恰好出现 25 次最长、25 次最短和 50 次中间答案。");
  }
  return parsed;
}

export function getGrade(level: number): Grade {
  return grades.find((grade) => grade.level === level) ?? grades[0];
}

export function getDimensionLabel(dimension: AbilityDimension): string {
  return dimensionLabels[dimension];
}
