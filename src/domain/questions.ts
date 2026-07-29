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

export const questions: AssessmentQuestion[] = [
  createQuestion("q1", 1, "office", "任务启动", "回想最近一次需要快速起草工作文案，你实际怎样开始？", ["没有使用 AI，直接沿用旧材料或从头写。", "向常用 AI 输入一句任务要求，再边看边补充。", "先写清受众和交付物，再让 AI 生成一版。", "先确定验收样例、事实边界和输出格式，再提交任务。"]),
  createQuestion("q2", 1, "office", "上下文表达", "最近一次让 AI 改写通知时，你给出的信息最接近哪一项？", ["只有原文，没有补充要求。", "原文加一句语气或风格要求。", "原文、接收对象和希望对方采取的行动。", "原文、对象、行动目标、不可改事实和合格样例。"]),
  createQuestion("q3", 2, "office", "材料处理", "拿到会议整理稿并需要形成行动清单时，你最近一次怎么做？", ["自己从材料里逐条摘录，没有使用 AI。", "让 AI 直接总结，再按阅读感觉修改。", "先去除不应输入的信息，再让 AI 按事项和负责人整理。", "确认材料授权后按固定字段生成，并逐项回查原文证据。"]),
  createQuestion("q4", 2, "office", "事实核验", "AI 草稿里包含日期、数字和引用时，你通常完成到哪一步？", ["内容通顺就直接进入下一环节。", "检查明显错误，但不回看原始材料。", "回查会影响结论的关键数字和日期。", "按来源逐项核验事实并标记无法确认的内容。"]),
  createQuestion("q5", 2, "office", "迭代修正", "第一版输出不符合单位格式，你最近一次采取了什么动作？", ["改回人工完成，没有继续使用 AI。", "换一种相近说法重新提问。", "指出不符合之处并补充格式要求。", "提供合格样例和验收清单，比较迭代前后的偏差。"]),
  createQuestion("q6", 3, "scenario", "场景识别", "团队每周手工整理客户反馈，你会从哪一步开始试用 AI？", ["直接用 AI 自动生成并发送客户回复。", "挑一批反馈让 AI 自由总结，看看效果。", "先让 AI 分类汇总，由业务人员复核后使用。", "先定义分类规则、风险边界和指标，再用代表性样本试点。"]),
  createQuestion("q7", 3, "scenario", "价值判断", "上次判断一个 AI 场景是否值得继续时，你主要依据什么？", ["工具热度和其他团队是否在使用。", "生成结果看起来是否足够丰富。", "使用者是否感觉更省时间。", "基线数据、任务频率、质量变化、风险和投入成本。"]),
  createQuestion("q8", 3, "scenario", "人机边界", "涉及对外承诺的内容由 AI 辅助时，你的实际流程最接近哪项？", ["由 AI 生成后自动发送，以减少等待。", "生成后由当时有空的同事快速看一眼。", "固定一名业务人员在发送前确认内容。", "预先定义审批责任、禁用信息和异常升级条件。"]),
  createQuestion("q9", 4, "workflow", "流程拆解", "资料初审已经验证可由 AI 辅助，你接下来通常怎样沉淀？", ["保留个人聊天记录，下次再找相似对话。", "把有效提示词发到团队群供大家参考。", "记录主要步骤和输入要求，供自己重复使用。", "固化输入、处理、验收、责任人与异常分支。"]),
  createQuestion("q10", 4, "workflow", "稳定复用", "同事按你的 AI 方法操作却得到不同结果，你会补上什么？", ["再口头演示一次，让同事照着操作。", "发送成功结果的截图作为参考。", "共享提示词、输入样例和操作步骤。", "补齐输入标准、验收样例、版本记录和责任人。"]),
  createQuestion("q11", 4, "workflow", "异常处理", "AI 流程遇到少量复杂案例时表现不稳定，你最近会怎么处理？", ["仍按原流程执行，个别错误之后再修。", "先整体停用，等工具升级后再尝试。", "提醒使用者自行判断哪些案例较复杂。", "定义触发条件转人工，并把失败样例纳入回归检查。"]),
  createQuestion("q12", 5, "workflow", "知识连接", "团队需要从制度文件中快速获得可信答复，你会搭到哪一步？", ["让成员各自在通用 AI 中搜索和提问。", "把当前文件复制进对话，回答完即结束。", "整理允许使用的文件，形成统一查询入口。", "建立带权限和版本的知识入口，回答附来源并可反馈纠错。"]),
  createQuestion("q13", 5, "workflow", "权限治理", "接入企业资料前，你实际确认过哪些事项？", ["先接入使用，出现问题时再补规则。", "主要确认工具功能是否满足需求。", "确认账号权限和资料是否含敏感信息。", "确认授权范围、访问角色、更新人、保留期和退出方案。"]),
  createQuestion("q14", 5, "workflow", "协作闭环", "AI 生成的任务摘要需要进入协作系统，你会如何落地？", ["人工复制到群里，由成员自行认领。", "把所有生成内容自动推送到协作系统。", "按固定模板同步摘要，再由负责人确认。", "按字段和权限写入，保留来源、审核状态和修改记录。"]),
  createQuestion("q15", 6, "innovation", "应用交付", "多人需要反复生成同类项目材料时，你最近做到哪一步？", ["收集每个人的需求后，由自己代为提问。", "共享一段较完整的提示词让大家复制。", "提供输入表单和填写说明，再集中生成。", "交付带输入约束、模板、校验和失败提示的可访问应用。"]),
  createQuestion("q16", 6, "innovation", "产品迭代", "AI 小应用出现偶发错误，你依据什么安排下一次迭代？", ["把问题归因于使用者操作，暂不调整。", "优先改善界面，让使用者更愿意尝试。", "收集几条失败反馈后修改提示词。", "按角色和失败类型建样本集，回归验证数据、规则与体验。"]),
  createQuestion("q17", 7, "innovation", "业务重构", "部门希望缩短需求到交付周期，你实际会怎样启动 AI 改造？", ["先给全员开通工具，让各岗位自行探索。", "设置使用次数目标，推动大家形成习惯。", "选择耗时最长的一个环节进行效率试验。", "重画端到端流程，设定人机分工、风险边界和业务基线。"]),
  createQuestion("q18", 7, "innovation", "成效运营", "一个 AI 流程试点结束后，你用什么证据决定是否扩大？", ["负责人认可试点结果就进入推广。", "比较试点前后的内容产出数量。", "汇总参与者的满意度和节时反馈。", "同时比较采用率、周期、质量、成本与风险事件。"]),
  createQuestion("q19", 8, "innovation", "标准沉淀", "多个团队已有有效 AI 实践，你会优先沉淀什么？", ["让各团队继续按自己的方式保存经验。", "组织一次分享会，记录优秀做法。", "建立可检索的案例和模板目录。", "建立资产标准、负责人、复用反馈和版本淘汰机制。"]),
  createQuestion("q20", 8, "innovation", "生态建设", "回看最近一次跨部门推广，你的组织机制做到哪一层？", ["依靠少数专家持续解决各部门问题。", "统一采购工具并提供基础账号支持。", "定期培训和交流案例，鼓励部门复用。", "联动平台、治理、课程、案例和成效指标持续运营。"])
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
