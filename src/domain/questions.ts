import type { AbilityDimension, AssessmentQuestion, Grade } from "./types";

const dimensionLabels: Record<AbilityDimension, string> = {
  office: "AI 交互与办公",
  scenario: "场景与价值判断",
  workflow: "流程与工具连接",
  innovation: "应用与组织创新"
};

export const grades: Grade[] = [
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
type ScoreOrder = readonly [Score, Score, Score, Score];
export const ANSWER_LENGTH = 18;

const optionScoreOrders: Record<string, ScoreOrder> = {
  q1: [2, 0, 3, 1],
  q2: [1, 3, 0, 2],
  q3: [3, 1, 2, 0],
  q4: [0, 2, 3, 1],
  q5: [2, 0, 3, 1],
  q6: [1, 3, 2, 0],
  q7: [0, 2, 3, 1],
  q8: [3, 1, 0, 2],
  q9: [2, 3, 0, 1],
  q10: [1, 0, 3, 2],
  q11: [3, 0, 2, 1],
  q12: [0, 3, 1, 2],
  q13: [2, 1, 3, 0],
  q14: [1, 2, 3, 0],
  q15: [3, 0, 2, 1],
  q16: [2, 1, 3, 0],
  q17: [0, 3, 2, 1],
  q18: [1, 0, 3, 2],
  q19: [2, 3, 1, 0],
  q20: [3, 1, 0, 2]
};

const makeOptions = (questionId: string, labels: [string, string, string, string]) => {
  const options = labels.map((label, score) => ({ id: `${questionId}-option-${score}`, label, score: score as Score }));
  return optionScoreOrders[questionId].map((score) => options[score]);
};

const createQuestion = (
  id: string,
  level: number,
  dimension: AbilityDimension,
  category: string,
  prompt: string,
  options: [string, string, string, string],
): AssessmentQuestion => {
  if (options.some((label) => Array.from(label).length !== ANSWER_LENGTH)) {
    throw new Error(`${id} 的答案必须统一为 ${ANSWER_LENGTH} 个字符。`);
  }
  return { id, level, dimension, category, prompt, options: makeOptions(id, options) };
};

const optionTextLength = (text: string) => Array.from(text).length;

export function getOptionLengthSpread(question: AssessmentQuestion): number {
  const lengths = question.options.map((option) => optionTextLength(option.label));
  return Math.max(...lengths) - Math.min(...lengths);
}

export function hasOptionLengthHint(question: AssessmentQuestion): boolean {
  const lengths = [...question.options]
    .sort((left, right) => left.score - right.score)
    .map((option) => optionTextLength(option.label));
  const ascending = lengths.every((length, index) => index === 0 || length >= lengths[index - 1]);
  const descending = lengths.every((length, index) => index === 0 || length <= lengths[index - 1]);
  return getOptionLengthSpread(question) > 8 || (new Set(lengths).size > 1 && (ascending || descending));
}

export const questions: AssessmentQuestion[] = [
  createQuestion("q1", 1, "office", "任务启动", "你要写会议通知，只有时间和主题，第一步做什么？", ["直接让人工智能写完通知再自己修改就好", "只补一句语气要求让人工智能再写一版吧", "补充对象格式和语气让人工智能重写一版", "说明对象目标要求给样例并核对通知结果"]),
  createQuestion("q2", 1, "office", "上下文表达", "你要改通知，让同事看完就知道该做什么，先给什么？", ["直接让人工智能改完通知再自己发布就行", "只说语气正式让人工智能重写通知内容吧", "说明读者目的行动让人工智能改写通知吧", "说清读者目标限制给样例并核对行动结果"]),
  createQuestion("q3", 2, "office", "材料处理", "你要把会议记录整理成行动清单，怎样做更稳妥？", ["自己抄写会议记录完全不用人工智能帮忙", "让人工智能先总结再凭感觉修改清单内容", "删掉敏感信息再让人工智能整理事项清单", "确认材料可用按字段生成并核对来源内容"]),
  createQuestion("q4", 2, "office", "事实核验", "人工智能写了日期金额和引用，提交前你会怎么核对？", ["看着通顺就把通知交给同事发布即可完成", "只查明显错字不回看原始材料是否正确吧", "回查影响结论的关键日期金额和引用内容", "逐项对照来源把无法确认内容标出再说明"]),
  createQuestion("q5", 2, "office", "迭代修正", "人工智能写的内容不符合公司格式，你怎样让它重写？", ["关掉人工智能改回人工完成并校对内容吧", "换种说法重问却不说明具体格式问题所在", "指出不合格之处补充格式语气要求再写吧", "给合格样例和检查清单比较两版差异即可"]),
  createQuestion("q6", 3, "scenario", "场景识别", "团队每周整理客户反馈很慢，你会怎样开始用人工智能？", ["让人工智能自动回复客户并直接发送出去", "挑一批反馈让人工智能自由总结看看再说", "先让人工智能分类汇总再由业务检查一遍", "先定规则边界指标再用样本验证实际效果"]),
  createQuestion("q7", 3, "scenario", "价值判断", "你要判断一个人工智能做法值不值得继续，先看什么？", ["只看工具是否热门不看实际工作效果即可", "只看内容是否漂亮不看员工实际使用效果", "问使用者是否省时愿意继续使用这个方法", "对比原有做法再看效率质量和风险变化吧"]),
  createQuestion("q8", 3, "scenario", "人机边界", "人工智能写了对外承诺，发送前谁来确认、确认什么？", ["生成后直接发送省掉人工确认时间就好了", "找有空同事快速看一眼确认后再发送即可", "固定业务负责人发送前确认内容是否合规", "提前规定审批责任禁用信息和升级条件吧"]),
  createQuestion("q9", 4, "workflow", "流程拆解", "你试过人工智能整理资料有效，怎样让同事也照着做？", ["只留自己的聊天记录下次再找相似任务吧", "把好用的提问发到群里让大家参考一下吧", "记下主要步骤和输入内容自己照着做即可", "写清输入步骤检查方法和出错处理办法吧"]),
  createQuestion("q10", 4, "workflow", "稳定复用", "同事照着你的方法做却结果不同，你先补什么？", ["再口头演示让同事照着做并复述步骤即可", "发一张成功结果让大家自己对照学习即可", "分享提问内容输入样例和关键步骤给大家", "补齐输入要求检查方法更新时间和负责人"]),
  createQuestion("q11", 4, "workflow", "异常处理", "人工智能遇到少数复杂情况不稳定，你怎样处理？", ["继续照旧执行出错后再单独修补问题即可", "先全部停用等工具升级后再重新尝试即可", "提醒使用者自己判断复杂情况再处理即可", "规定何时转人工并把失败案例列入清单中"]),
  createQuestion("q12", 5, "workflow", "知识连接", "团队想从制度文件快速找到可信答案，你怎样准备？", ["让每个人在通用人工智能里自行搜索即可", "把当前文件复制进对话回答完就结束即可", "整理能用的文件做一个统一查询页面即可", "按查看人和更新时间管理资料并标明来源"]),
  createQuestion("q13", 5, "workflow", "权限治理", "把公司资料交给人工智能前，你必须先确认什么？", ["先让大家使用遇到问题再补充规则即可吧", "确认工具功能满足需求再看使用范围即可", "确认权限并检查资料是否包含敏感信息吧", "确认谁能看谁能改谁来更新以及何时删除"]),
  createQuestion("q14", 5, "workflow", "协作闭环", "人工智能写的任务摘要要发到协作群，怎样做？", ["人工复制到群里让成员自己认领任务即可", "所有生成内容自动推送不设人工确认即可", "按固定格式发摘要再由负责人确认后发出", "按栏目和权限写入保留来源和修改记录吧"]),
  createQuestion("q15", 6, "innovation", "应用交付", "大家反复做同类项目材料，你会把人工智能做到哪一步？", ["收集每个人需求再由自己代为提问整理吧", "共享一段提问让大家复制使用即可完成吧", "提供填写表格说明再集中生成材料交付吧", "交付带固定格式检查和出错提示的小应用"]),
  createQuestion("q16", 6, "innovation", "产品迭代", "人工智能小应用偶尔出错，你根据什么安排下一步？", ["把问题归因操作不熟暂时不调整应用即可", "先改善界面让用户更愿意继续尝试再说吧", "收集失败反馈再修改提问内容并重试几次", "按不同岗位和错误类型收集例子测试效果"]),
  createQuestion("q17", 7, "innovation", "业务重构", "部门想缩短需求到交付时间，你准备先改哪里？", ["先给全员开通工具让大家自由探索方法吧", "要求大家每天使用工具慢慢形成习惯即可", "选最耗时环节先做效率对比试验看看结果", "把工作从头到尾画清楚再定分工和目标吧"]),
  createQuestion("q18", 7, "innovation", "成效运营", "人工智能试用一段时间后，你凭什么决定扩大使用？", ["负责人认可结果就直接进入推广阶段即可", "只比较试用前后内容产出数量变化就行了", "汇总参与者满意度和节省时间反馈再判断", "比较使用人数时间质量成本和风险后决定"]),
  createQuestion("q19", 8, "innovation", "标准沉淀", "多个团队都有好做法，你会先整理什么给大家用？", ["各团队继续按自己的方式保存经验材料吧", "组织分享会记录大家认可的做法供参考吧", "建立能搜索的案例和模板目录供大家查找", "写清做法负责人更新时间和停用条件即可"]),
  createQuestion("q20", 8, "innovation", "生态建设", "跨部门推广后，怎样让更多人长期照着做好？", ["依靠少数专家持续帮助各部门解决问题吧", "统一采购工具同时提供账号培训支持即可", "定期培训分享案例让部门互相学习即可吧", "把工具规则课程案例和结果长期维护即可"])
];

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
  if (starts.length < 8 || starts.length > 60) throw new Error("题库必须包含 8–60 道题，并覆盖 L1–L8。");

  const parsed = starts.map((start, questionIndex) => {
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
    if (options.some((option) => optionTextLength(option.label) !== ANSWER_LENGTH)) throw new Error(`${id} 的答案必须统一为 ${ANSWER_LENGTH} 个字符。`);
    const visibleScoreOrder = options.map((option) => option.score).join("");
    if (visibleScoreOrder === "0123" || visibleScoreOrder === "3210") throw new Error(`${id} 的分值顺序过于明显，请打乱四个选项的位置。`);
    if (options.at(-1)?.score === 3) throw new Error(`${id} 的最高分选项不能放在最后。`);

    const parsedQuestion = {
      id,
      level: Number(levelText),
      dimension: dimensionText as AbilityDimension,
      category: categoryText.trim(),
      prompt: prompts[0].slice(2).trim(),
      options
    };
    if (hasOptionLengthHint(parsedQuestion)) throw new Error(`${id} 的选项长度差异明显，请调整文字后再保存，避免用字数猜答案。`);
    return parsedQuestion;
  });

  if (new Set(parsed.map((question) => question.id)).size !== parsed.length) throw new Error("题目 ID 不能重复。");
  const levels = new Set(parsed.map((question) => question.level));
  if (Array.from({ length: 8 }, (_, index) => index + 1).some((level) => !levels.has(level))) throw new Error("题库必须覆盖 L1–L8 每个等级。");
  const dimensions = new Set(parsed.map((question) => question.dimension));
  if ((["office", "scenario", "workflow", "innovation"] as AbilityDimension[]).some((dimension) => !dimensions.has(dimension))) throw new Error("题库必须覆盖四个能力维度。");
  const scoreOrders = new Set(parsed.map((question) => question.options.map((option) => option.score).join("")));
  if (scoreOrders.size < Math.min(4, parsed.length)) throw new Error("题库的分值位置过于固定，请至少使用四种不同排列。");
  return parsed;
}

export function getGrade(level: number): Grade {
  return grades.find((grade) => grade.level === level) ?? grades[0];
}

export function getDimensionLabel(dimension: AbilityDimension): string {
  return dimensionLabels[dimension];
}
