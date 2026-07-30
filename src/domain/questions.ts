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

const makeOptions = (questionId: string, labels: [string, string, string, string]) =>
  labels.map((label, score) => ({ id: `${questionId}-option-${score}`, label, score: score as 0 | 1 | 2 | 3 }));

const createQuestion = (
  id: string,
  level: number,
  dimension: AbilityDimension,
  category: string,
  prompt: string,
  options: [string, string, string, string],
): AssessmentQuestion => ({ id, level, dimension, category, prompt, options: makeOptions(id, options) });

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
  createQuestion("q1", 1, "office", "任务启动", "你要用 AI 起草一封会议通知，手上只有时间和主题。你会先怎么做？", ["直接让 AI 写一版，再自己从头修改。", "只补一句语气要求，然后查看初稿。", "补充对象和交付形式，再让 AI 起草。", "说明对象、目标、事实边界，并给一个合格样例。"]),
  createQuestion("q2", 1, "office", "上下文表达", "你让 AI 改写通知，希望同事看完就知道该做什么。你会提供哪些信息？", ["只粘贴现有原文，不说明读者、目的和限制。", "粘贴原文，再补一句希望使用的语气。", "粘贴原文，说明读者和希望对方采取的行动。", "说清读者、目标、事实边界，再附一个样例。"]),
  createQuestion("q3", 2, "office", "材料处理", "你拿到一份会议记录，要整理成行动清单。下面哪种做法最稳妥？", ["自己逐条抄写内容，不使用 AI 帮忙。", "让 AI 先总结，再凭阅读感觉修改。", "删去不该输入的信息，再让 AI 按事项整理。", "确认材料可用，按固定字段生成并回看原文依据。"]),
  createQuestion("q4", 2, "office", "事实核验", "AI 草稿里有日期、金额和引用。你提交前会做到哪一步？", ["文字通顺就直接交给下一位同事处理。", "只检查明显错字，不回看原始材料。", "回查会影响结论的关键日期和金额。", "逐项对照来源，无法确认的内容单独标出。"]),
  createQuestion("q5", 2, "office", "迭代修正", "AI 写出的内容不符合公司格式，你会怎样让下一版更接近要求？", ["关掉 AI，改回人工完成并自行校对内容。", "换一种说法重新提问，不说明具体问题。", "指出不合格之处，并补充格式和语气要求。", "给出合格样例和检查清单，再比较两版差异。"]),
  createQuestion("q6", 3, "scenario", "场景识别", "团队每周整理客户反馈很耗时，你会怎样开始尝试 AI？", ["让 AI 自动写好回复并直接发给客户。", "挑一批反馈让 AI 自由总结，再看看是否有用。", "先让 AI 分类汇总，再由业务人员检查。", "先定分类规则、风险边界和指标，再用样本试点。"]),
  createQuestion("q7", 3, "scenario", "价值判断", "你要判断一个 AI 做法是否值得继续，最应该先看什么？", ["工具是否热门，别的团队是否也在使用。", "生成内容看起来是否丰富，表达是否漂亮。", "使用者是否觉得节省时间，愿不愿意继续用。", "对比原有基线，再看效率、质量和风险。"]),
  createQuestion("q8", 3, "scenario", "人机边界", "AI 帮你写对外承诺，发送前应如何安排人工确认？", ["生成后直接发送，减少等待和来回沟通。", "找当时有空的同事快速看一眼就发送。", "固定一位业务负责人，在发送前确认内容。", "提前规定审批责任、禁用信息和异常升级条件。"]),
  createQuestion("q9", 4, "workflow", "流程拆解", "资料初审已经验证 AI 能帮忙，你下一步会怎样让同事也能复用？", ["保留个人聊天记录，下次再找相似内容。", "把好用的提示词发到团队群里参考。", "记下主要步骤和输入要求，自己下次照做。", "固定输入、处理、验收、责任人和异常分支。"]),
  createQuestion("q10", 4, "workflow", "稳定复用", "同事照着你的 AI 方法操作，却得到不同结果。你会优先补什么？", ["再口头演示一遍，让同事照着重做并说出差异。", "发一张成功结果截图，让大家自行对照。", "共享提示词、输入样例和关键操作步骤。", "补齐输入标准、验收样例、版本号和责任人。"]),
  createQuestion("q11", 4, "workflow", "异常处理", "AI 流程遇到少量复杂案例时不稳定，你会怎样处理？", ["继续照旧执行，出现错误后再单独修补问题。", "先全部停用，等工具升级后再重新尝试。", "提醒使用者自己判断哪些情况比较复杂。", "设定转人工条件，并把失败案例加入复查清单。"]),
  createQuestion("q12", 5, "workflow", "知识连接", "团队想从制度文件中快速得到可信答复，你会怎样搭建入口？", ["让每个人在通用 AI 里自行搜索和提问。", "把当前文件复制进对话，回答完就结束。", "整理允许使用的文件，做一个统一查询入口。", "按权限和版本管理资料，回答附来源并支持纠错。"]),
  createQuestion("q13", 5, "workflow", "权限治理", "接入企业资料前，你会重点确认哪些内容？", ["先接入使用，遇到问题后再补充规则，再由同事复核。", "先确认工具功能是否满足需求，再看使用范围。", "确认账号权限，并检查资料是否包含敏感信息。", "确认授权范围、角色、更新人、保留期和退出方案。"]),
  createQuestion("q14", 5, "workflow", "协作闭环", "AI 生成的任务摘要要进入协作系统，你会怎样落地？", ["人工复制到群里，让成员自己认领任务。", "所有生成内容自动推送，不再设置人工确认。", "按固定模板同步摘要，再由负责人确认。", "按字段和权限写入，并保留来源和修改记录。"]),
  createQuestion("q15", 6, "innovation", "应用交付", "多人反复生成同类项目材料，你会把 AI 做到哪一步？", ["收集每个人的需求，再由自己代为提问和整理。", "共享一段提示词，让大家自行复制使用。", "提供输入表单和说明，再集中生成材料。", "交付带约束、模板、校验和失败提示的小应用。"]),
  createQuestion("q16", 6, "innovation", "产品迭代", "AI 小应用偶尔出错，你会根据什么安排下一次迭代？", ["把问题归因于操作不熟，暂时不调整应用。", "先改善界面，让用户更愿意继续尝试。", "收集几条失败反馈，再修改提示词内容。", "按角色和失败类型建样本，回归验证规则与体验。"]),
  createQuestion("q17", 7, "innovation", "业务重构", "部门想缩短需求到交付的时间，你会怎样启动 AI 改造？", ["先给全员开通工具，让大家自由探索方法。", "设置使用次数目标，推动团队形成习惯。", "选一个最耗时的环节，先做效率对比试验。", "重画端到端流程，明确分工、边界和业务基线。"]),
  createQuestion("q18", 7, "innovation", "成效运营", "一个 AI 流程试点结束后，你凭什么决定是否扩大？", ["负责人认可结果，就直接进入推广阶段。", "只比较试点前后的内容产出数量变化。", "汇总参与者满意度和节省时间的反馈。", "一起比较采用率、周期、质量、成本和风险事件。"]),
  createQuestion("q19", 8, "innovation", "标准沉淀", "多个团队已经有有效 AI 做法，你会优先沉淀什么？", ["让各团队继续按自己的方式保存经验材料，并自行更新。", "组织一次分享会，记录大家认为好的做法。", "建立能搜索的案例和模板目录供团队查找。", "建立资产标准、负责人、反馈机制和版本淘汰规则。"]),
  createQuestion("q20", 8, "innovation", "生态建设", "回看一次跨部门推广，你认为怎样才算形成组织能力？", ["依靠少数专家持续帮助各部门解决具体问题，并逐项跟进。", "统一采购工具，同时提供基础账号和培训支持。", "定期培训和分享案例，鼓励部门之间互相复用。", "把平台、治理、课程、案例和成效指标连成长期机制。"])
];

const questionHeaderPattern = /^##\s+([A-Za-z0-9_-]+)\s*\|\s*L([1-8])\s*\|\s*(office|scenario|workflow|innovation)\s*\|\s*(.+)$/;
const optionPattern = /^-\s+\[([0-3])]\s+(.+)$/;

export function serializeQuestionMarkdown(items: AssessmentQuestion[]): string {
  const blocks = items.map((question) => [
    `## ${question.id} | L${question.level} | ${question.dimension} | ${question.category}`,
    `> ${question.prompt}`,
    ...[...question.options]
      .sort((left, right) => left.score - right.score)
      .map((option) => `- [${option.score}] ${option.label}`)
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
  return parsed;
}

export function getGrade(level: number): Grade {
  return grades.find((grade) => grade.level === level) ?? grades[0];
}

export function getDimensionLabel(dimension: AbilityDimension): string {
  return dimensionLabels[dimension];
}
