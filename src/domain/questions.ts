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
    tasks: ["选择一个非敏感的日常任务，写清使用目标、输入材料、输出格式和完成标准。", "对照原始材料逐项检查一次 AI 输出中的事实、数字和日期，并把修改内容记录下来。", "记录一个适合使用 AI 和一个暂不适合使用 AI 的场景，同时写明判断理由和需要承担的风险。"]
  },
  {
    level: 1,
    code: "L1",
    name: "青铜级",
    capability: "会问 AI：能用对话工具完成清晰的基础任务。",
    color: "#ad6c2d",
    tasks: ["用“目标、背景、要求、输出格式”重写一个实际提示词，并保存一版可以再次使用的模板。", "比较两次提问的输出，记录是哪一项背景、限制或示例让结果更准确、更符合工作需要。", "为一项日常任务建立可复用的提问模板，补充输入示例、检查清单和发现问题后的修改步骤。"]
  },
  {
    level: 2,
    code: "L2",
    name: "白银级",
    capability: "会用 AI 办公：能把材料转化为可靠的办公交付物。",
    color: "#738496",
    tasks: ["用一份非敏感材料生成会议纪要或通知，并明确参会人、行动事项、负责人和截止时间。", "逐项核验输出中的事实、数据和日期，标记无法从原始材料确认的内容后再提交给同事。", "把有效的提示词保存为下次可复用的模板，注明适用场景、输入要求和需要人工确认的字段。"]
  },
  {
    level: 3,
    code: "L3",
    name: "黄金级",
    capability: "会找 AI 场景：能把合适的任务交给 AI 并定义验收。",
    color: "#b98120",
    tasks: ["选一个高频任务，写清输入、输出、责任人和验收标准，并用一份真实但非敏感的样例验证可行性。", "列出该场景中的隐私、事实和业务风险，明确哪些节点必须由负责人人工审核后才能交付。", "用一周时间记录该场景节省的时间、返工次数或质量变化，最后形成一页复盘结论供团队讨论。"]
  },
  {
    level: 4,
    code: "L4",
    name: "铂金级",
    capability: "会训练 AI 流程：能把一次性实践沉淀为可复用工作流。",
    color: "#6d8292",
    tasks: ["把已验证的场景拆成可复用步骤、输入输出和责任人，整理成同事能够照着执行的流程说明。", "为流程补上常见异常分支、人工检查点、升级条件和失败后的处理方式，避免结果出错后无人负责。", "找一位同事按流程完整复做一次，收集操作时间、疑问和改进意见，再更新流程文档的版本记录。"]
  },
  {
    level: 5,
    code: "L5",
    name: "钻石级",
    capability: "会连接 AI 工具：能让知识、文件和协作工具形成闭环。",
    color: "#2376bb",
    tasks: ["选择一组已授权的非敏感资料建立知识检索入口，统一命名、分类和来源，并用典型问题检查能否找到正确内容。", "明确资料更新人、访问范围、版本标记和失效处理方式，定期清理过期文件并保留变更记录。", "将检索输出接入一次团队协作或交付流程，规定引用来源、人工确认和异常反馈的具体责任人。"]
  },
  {
    level: 6,
    code: "L6",
    name: "星耀级",
    capability: "会搭建 AI 应用：能用低代码或可视化方式交付小应用。",
    color: "#4d55aa",
    tasks: ["为一个明确角色搭建可访问的 AI 小应用原型，写清用户、使用场景、输入字段、输出结果和权限边界。", "用真实但非敏感的样例完成正常、缺失、冲突和越权等错误测试，记录每个问题的复现条件和处理结果。", "收集三位使用者对准确性、效率和易用性的反馈，按优先级完成一次迭代并保留测试前后的对比记录。"]
  },
  {
    level: 7,
    code: "L7",
    name: "王者级",
    capability: "会重构业务流程：能用 AI 改变团队的工作方式。",
    color: "#a92a25",
    tasks: ["为一个团队流程设定 AI 改造试点范围，明确试点对象、原有做法、负责人、时间窗口和不纳入试点的边界。", "记录采用率、处理周期、交付质量、返工次数或成本中的至少两项指标，并在试点前后使用一致口径对比。", "将试点结论转化为可扩展的流程改造建议，写明投入、风险、推广条件和下一阶段需要验证的假设。"]
  },
  {
    level: 8,
    code: "L8",
    name: "荣耀王者级",
    capability: "会建设 AI 生态：能沉淀标准、案例与可复制的组织能力。",
    color: "#9b6415",
    tasks: ["沉淀一份可推广的标准、案例或课程，补充适用对象、操作步骤、示例材料、验收方式和常见问题说明。", "建立复用反馈机制，指定维护人和更新时间，持续收集使用数据、失败案例与改进建议并发布版本变更。", "选择一个组织单元复制实践，提前约定采用率、效率和质量指标，完成周期性复盘后决定继续推广或调整方案。"]
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
