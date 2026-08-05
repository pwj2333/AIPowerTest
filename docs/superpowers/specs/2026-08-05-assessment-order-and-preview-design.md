# Assessment Order and Admin Preview Design

## Goal

让员工答题时继续使用自适应抽题和防猜测排序，同时让管理员在“题目预览”中看到题库源文件的真实内容和顺序。

## Confirmed Behavior

- 员工答题页按能力等级自适应抽取题目；同一等级内的题目顺序按受测者和题库版本稳定乱序。
- 员工答题页的四个选项按受测者和题目稳定乱序；选项 ID 和分值不变，返回、刷新和提交不会改变答案含义。
- 管理员预览按 Markdown 题库源文件的题目顺序展示。
- 管理员预览按题库真实的 `0 分`、`1 分`、`2 分`、`3 分`顺序展示选项，并显示对应分值。
- 管理员预览不复用员工答题端的随机化函数。

## Architecture

`src/pages/AssessmentPage.tsx` 和 `src/domain/scoring.ts` 保持现有自适应题目排序；`src/components/QuestionCard.tsx` 保持员工端选项乱序。

`src/pages/QuestionBankPage.tsx` 改为直接使用 `parsed.questions` 的源顺序，并对每道题的选项按 `score` 升序展示。管理员预览只反映当前 Markdown 编辑内容，未保存的编辑也应即时显示；解析失败时仍显示格式错误，不展示不完整预览。

## Testing

- 组件测试继续验证员工端：同一 seed 顺序稳定、不同 seed 顺序变化、最高分选项不在最后。
- 管理员页面测试验证预览显示 `[0, 1, 2, 3]`，并验证首个预览选项文字与题库源内容一致。
- 运行完整前端/服务端测试与生产构建。

## Out of Scope

- 不改变自适应抽题、等级判定、选项 ID、历史答卷或题库评分规则。
- 不在预览中隐藏分值；管理员需要看到真实分值用于核对题库。
