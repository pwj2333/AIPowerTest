import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { selectStageQuestions } from "../domain/scoring";
import { assessmentRepository } from "../domain/store";

describe("administrator workspace", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    assessmentRepository.reset();
  });

  it("shows campaign diagnostics and supports roster import", async () => {
    assessmentRepository.createCampaign({ name: "正式测评" });
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("参与率")).toBeInTheDocument();
    expect(screen.getByText("部门等级概览")).toBeInTheDocument();
    expect(screen.getByText("优先补强能力")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "人员名单" }));
    expect(screen.getByRole("heading", { name: "人员名单" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("CSV 人员数据"), { target: { value: "姓名,部门,岗位\n测试员工,运营部,专员" } });
    fireEvent.click(screen.getByRole("button", { name: "导入全局花名册" }));
    expect(await screen.findByText("成功导入 1 人")).toBeInTheDocument();
  });

  it("uploads one global roster and manages membership for a campaign", async () => {
    const firstRender = render(
      <MemoryRouter initialEntries={["/admin/people"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("CSV 人员数据"), { target: { value: "姓名,部门,岗位\nAlice,Sales,Lead" } });
    fireEvent.click(screen.getByRole("button", { name: "导入全局花名册" }));
    expect(await screen.findByRole("status")).toHaveTextContent("成功导入 1 人");
    expect(assessmentRepository.listRoster().map((person) => person.name)).toEqual(["Alice"]);

    assessmentRepository.createCampaign({ name: "First" });
    firstRender.unmount();
    render(
      <MemoryRouter initialEntries={["/admin/people"]}>
        <App />
      </MemoryRouter>,
    );

    const member = screen.getByRole("checkbox", { name: "Alice 参加 First" });
    expect(member).toBeChecked();
    fireEvent.click(member);
    expect(assessmentRepository.listParticipants(assessmentRepository.listCampaigns()[0].id)).toHaveLength(0);
  });

  it("syncs a reusable roster into a campaign created before the roster", async () => {
    const campaign = assessmentRepository.createCampaign({ name: "First" });
    assessmentRepository.importRoster([{ name: "Alice", department: "Sales", position: "Lead" }]);
    render(
      <MemoryRouter initialEntries={["/admin/people"]}>
        <App />
      </MemoryRouter>,
    );

    const member = screen.getByRole("checkbox", { name: "Alice 参加 First" });
    expect(member).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "同步全部花名册" }));

    await waitFor(() => expect(member).toBeChecked());
    expect(assessmentRepository.listParticipants(campaign.id)).toHaveLength(1);
  });

  it("does not rank unchallenged dimensions as priority gaps", () => {
    assessmentRepository.createCampaign({ name: "No results" });
    const { container } = render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll(".priority-item")).toHaveLength(0);
  });

  it("validates and saves Markdown question edits", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/question-bank"]}>
        <App />
      </MemoryRouter>,
    );

    const editor = screen.getByLabelText("Markdown 题库内容");
    const firstPrompt = assessmentRepository.getQuestionBank().questions[0].prompt;
    fireEvent.change(editor, { target: { value: (editor as HTMLTextAreaElement).value.replace(firstPrompt, `${firstPrompt}（正式场景）`) } });
    fireEvent.click(screen.getByRole("button", { name: "保存新版本" }));
    expect(await screen.findByRole("status")).toHaveTextContent("已保存 v4.1");
    expect(assessmentRepository.getQuestionBank().questions[0].prompt).toContain("正式场景");
  });

  it("shows preview options in source order with their real scores", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/admin/question-bank"]}>
        <App />
      </MemoryRouter>,
    );

    const bank = assessmentRepository.getQuestionBank();
    const firstQuestion = bank.questions[0];
    const preview = container.querySelector(".question-bank-detail");
    const scores = Array.from(preview?.querySelectorAll("ol li b") ?? [])
      .map((node) => Number(node.textContent?.match(/\d+/)?.[0]));
    const labels = Array.from(preview?.querySelectorAll("ol li span") ?? [])
      .map((node) => node.textContent);

    expect(scores).toHaveLength(4);
    expect(scores).toEqual([0, 1, 2, 3]);
    expect(labels).toEqual(firstQuestion.options
      .slice()
      .sort((left, right) => left.score - right.score)
      .map((option) => option.label));
  });

  it("exports a reusable global roster without requiring a campaign", () => {
    assessmentRepository.importRoster([{ name: "Alice", department: "Sales", position: "Lead" }]);
    render(
      <MemoryRouter initialEntries={["/admin/people"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "导出全局花名册 CSV" })).toBeEnabled();
    expect(screen.getByText("尚未创建测评批次")).toBeInTheDocument();
  });

  it("archives, recovers, and permanently deletes campaigns with confirmation", async () => {
    const campaign = assessmentRepository.createCampaign({ name: "Lifecycle" });
    render(
      <MemoryRouter initialEntries={["/admin/campaigns"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTitle("归档批次"));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Lifecycle" })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "显示已归档" }));
    expect(screen.getByRole("heading", { name: "Lifecycle" })).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("恢复批次"));
    await waitFor(() => expect(screen.getByText("进行中")).toBeInTheDocument());

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByTitle("永久删除批次"));
    expect(await screen.findByText("还没有测评批次")).toBeInTheDocument();
    expect(assessmentRepository.getCampaign(campaign.id)).toBeUndefined();
  });

  it("selects a campaign and exports filtered results", () => {
    const first = assessmentRepository.createCampaign({ name: "First" });
    const second = assessmentRepository.createCampaign({ name: "Second" });
    const [person] = assessmentRepository.importParticipants(second.id, [{ name: "Alice", department: "Sales", position: "Lead" }]).imported;
    const bank = assessmentRepository.getQuestionBank();
    const stage = selectStageQuestions(bank.questions, 1, `${person.id}:${bank.version}`);
    const answers = Object.fromEntries(stage.map((question) => [question.id, `${question.id}-option-0`]));
    assessmentRepository.submitAssessment(person.id, answers, 60);

    render(
      <MemoryRouter initialEntries={["/admin/results"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("结果测评批次")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("结果测评批次"), { target: { value: first.id } });
    expect(screen.getByRole("button", { name: "导出筛选结果 CSV" })).toBeInTheDocument();
  });

  it("offers roster, personal result, and department summary exports", () => {
    const campaign = assessmentRepository.createCampaign({ name: "Export" });
    assessmentRepository.importParticipants(campaign.id, [{ name: "Alice", department: "Sales", position: "Lead" }]);
    render(
      <MemoryRouter initialEntries={["/admin/exports"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("导出测评批次")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出人员 CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出个人结果 CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出部门汇总 CSV" })).toBeInTheDocument();
  });
});
