# AI 能力认证

根据 `docs/superpowers/specs/2026-07-29-ai-capability-assessment-design.md` 实现的 AI 能力测评 Web 原型。

## 运行

```bash
npm install
npm run dev
```

打开终端输出的本地地址：

- `/`：能力塔首页和示例员工入口
- `/admin`：管理员工作台
- 员工链接由管理员在“人员名单”中导入后生成，格式为 `/assessment/<token>`

## 已实现

- 20 道工作情景题、8 级逐级门槛、四维能力分布、置信度和高等级复核提示
- 员工端欢迎页、逐题答题、自动保存、一次提交、个人结果和行动任务
- 管理员端批次、人员名单 CSV 导入、专属链接、概览、结果筛选、题库规则和 CSV 导出
- 代表性演示数据会在首次打开时自动创建

## 当前原型边界

数据保存在当前浏览器的 `localStorage` 中，未接入真实数据库、企业登录或后端 API。清理浏览器站点数据会清除演示批次和答卷；投入生产前需要把 `src/domain/store.ts` 替换为服务端持久化，并增加企业身份认证和权限控制。

## 验证

```bash
npm run test:run
npm run build
```
